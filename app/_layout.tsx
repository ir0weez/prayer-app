import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import {
  consumePendingPrayerEndRequest,
  stopPrayerTimerNotification,
} from "@/modules/expo-prayer-timer/src/index";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider, useThemeContext } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { refreshGearBoostCache } from "@/lib/gear";
import { refreshStatBoostCache } from "@/lib/character-stats";
import {
  completeScheduledNotificationItem,
  configureLocalNotifications,
  NOTIFICATION_ACTIONS,
  snoozeScheduleNotification,
} from "@/lib/notification-scheduler";
import { XpGainIndicator } from "@/components/xp-gain-indicator";
import { DevotionalPill } from "@/components/devotional-pill";
import { SetCompleteAnnouncer } from "@/components/set-complete-announcer";
import { SplashOverlay } from "@/components/splash-overlay";
import { SPLASH_MAX_DISPLAY_MS } from "@/lib/splash";

// Hold the native splash until the root layout has actually laid out,
// then hand off to the animated in-app splash (SplashOverlay), which is
// a pixel-matched twin of the native one (v166). The fallback timer in
// RootLayoutContent guarantees the native splash is released even if
// the first layout is somehow delayed, so it can never trap the user.
if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}
const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayoutContent() {
  const { colorScheme } = useThemeContext();
  const router = useRouter();
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Splash handoff (v166): the app is "ready" once the root view has
  // laid out its first frame. Release the native splash then — the
  // animated SplashOverlay (rendered below, visually identical to the
  // native splash) covers the seam and fades on its own schedule.
  const [appReady, setAppReady] = useState(false);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const fallback = setTimeout(() => setAppReady(true), SPLASH_MAX_DISPLAY_MS);
    return () => clearTimeout(fallback);
  }, []);
  useEffect(() => {
    if (!appReady || Platform.OS === "web") return;
    SplashScreen.hideAsync().catch(() => {});
  }, [appReady]);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
    configureLocalNotifications();
    // Warm the gear boost cache so XP/coin boosts apply everywhere.
    refreshGearBoostCache().catch(() => {});
    // Warm the character stat boost cache too.
    refreshStatBoostCache().catch(() => {});
    // If the prayer timer's End button relaunched the app while JS was dead,
    // clear the orphaned notification now.
    try {
      if (Platform.OS === "android" && consumePendingPrayerEndRequest()) {
        stopPrayerTimerNotification();
      }
    } catch {
      // Best-effort
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const handledResponseIds = new Set<string>();
    const handleResponse = async (response: Notifications.NotificationResponse) => {
      const responseId = response.notification.request.identifier;
      if (handledResponseIds.has(responseId)) return;
      handledResponseIds.add(responseId);
      const data = response.notification.request.content.data as { personId?: unknown; kind?: unknown; eventId?: unknown; todoId?: unknown; ministryId?: unknown };
      const action = response.actionIdentifier;
      if (data.kind === "prayer-tray" && typeof data.personId === "string") {
        router.replace({ pathname: "/(tabs)", params: { notificationPersonId: data.personId } });
        return;
      }
      if (data.kind === "prayer-session" && action === NOTIFICATION_ACTIONS.endPrayerSession) {
        router.replace({ pathname: "/(tabs)", params: { notificationAction: NOTIFICATION_ACTIONS.endPrayerSession } });
        return;
      }
      if (data.kind === "prayer-session" && action === NOTIFICATION_ACTIONS.prayNextPrayerPerson) {
        // Expo-fallback notification "Pray" button: advance the open session.
        // The native Android path delivers this via the module event instead.
        const { requestPrayerSessionPrayNext } = await import("@/components/prayer-session");
        requestPrayerSessionPrayNext();
        return;
      }
      if (data.kind === "prayer-reminder" && typeof data.personId === "string") {
        if (action !== NOTIFICATION_ACTIONS.prayed && action !== NOTIFICATION_ACTIONS.praise && action !== NOTIFICATION_ACTIONS.emergency) return;
        router.replace({ pathname: "/(tabs)", params: { notificationPersonId: data.personId, notificationAction: action } });
        return;
      }
      if ((data.kind === "scheduled-event" && typeof data.eventId === "string") || (data.kind === "scheduled-todo" && typeof data.todoId === "string") || (data.kind === "scheduled-ministry" && typeof data.ministryId === "string")) {
        const itemId = data.kind === "scheduled-event" ? data.eventId : data.kind === "scheduled-todo" ? data.todoId : data.ministryId;
        if (action === NOTIFICATION_ACTIONS.snooze) {
          await snoozeScheduleNotification(response);
        } else if (action === NOTIFICATION_ACTIONS.complete) {
          await completeScheduledNotificationItem(String(data.kind), String(itemId));
          try {
            await Notifications.dismissNotificationAsync(response.notification.request.identifier);
          } catch {
            // Some Android versions already remove an action notification automatically.
          }
        }
        else return;
        router.replace({ pathname: "/(tabs)", params: { notificationScheduleAction: action, notificationScheduleKind: String(data.kind), notificationScheduleId: String(itemId) } });
      }
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) return handleResponse(response);
    }).catch(() => undefined);
    return () => subscription.remove();
  }, [router]);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={() => setAppReady(true)}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {/* Default to hiding native headers so raw route segments don't appear (e.g. "(tabs)", "products/[id]"). */}
          {/* If a screen needs the native header, explicitly enable it and set a human title via Stack.Screen options. */}
          {/* in order for ios apps tab switching to work properly, use presentation: "fullScreenModal" for login page, whenever you decide to use presentation: "modal*/}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="oauth/callback" />
            {/* v265: no Bible-section Stack.Screens — Study is a
                pane inside the (tabs) shell now, not a set of
                root-stack routes the tab launches. The old route
                files remain only as deep-link landing shells that
                redirect into the shell; they take the default
                options like every other undeclared route. */}
          </Stack>
          <XpGainIndicator />
          <SetCompleteAnnouncer />
          {/* v293: the minimized devotional player — renders only
              while a devotional session is live (see
              components/devotional-pill.tsx). */}
          <DevotionalPill />
          {Platform.OS !== "web" && <SplashOverlay ready={appReady} />}
          <StatusBar hidden={false} />
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </>
    );
  }

  return (
    <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
  );
}

export default function RootLayout() {
  // 8-bit skin (v184): bundle Press Start 2P (SIL OFL 1.1, see
  // assets/fonts/PressStart2P-OFL.txt) for the skin's display type.
  // Loaded fire-and-forget — it is only referenced while the 8-bit
  // skin is active, and font loading must never gate the splash
  // handoff above, so the result is deliberately unused here.
  useFonts({
    PressStart2P: require("@/assets/fonts/PressStart2P-Regular.ttf"),
    // Terminal skin (v186): VT323 (SIL OFL 1.1, see
    // assets/fonts/VT323-OFL.txt) for the terminal's display type.
    VT323: require("@/assets/fonts/VT323-Regular.ttf"),
    // v308: the TV shows' title-lettering lookalikes (Google Fonts,
    // subsetted; each show's font + license is recorded in
    // lib/show-fonts.ts). Fire-and-forget like the skin fonts above —
    // a show name falls back to the app font until its face lands.
    ShowAnton: require("@/assets/fonts/show-anton.ttf"),
    ShowCinzel: require("@/assets/fonts/show-cinzel.ttf"),
    ShowCinzelDecorative: require("@/assets/fonts/show-cinzel-decorative.ttf"),
    ShowOswaldMedium: require("@/assets/fonts/show-oswald-medium.ttf"),
    ShowOswaldLight: require("@/assets/fonts/show-oswald-light.ttf"),
    ShowArchivo: require("@/assets/fonts/show-archivo.ttf"),
    ShowArchivoItalic: require("@/assets/fonts/show-archivo-italic.ttf"),
    ShowArchivoBlack: require("@/assets/fonts/show-archivo-black.ttf"),
    ShowArchivoNarrow: require("@/assets/fonts/show-archivo-narrow.ttf"),
    ShowNunito: require("@/assets/fonts/show-nunito.ttf"),
    ShowPassionOne: require("@/assets/fonts/show-passion-one.ttf"),
    ShowZillaSlab: require("@/assets/fonts/show-zilla-slab.ttf"),
    ShowBarlowCondensed: require("@/assets/fonts/show-barlow-condensed.ttf"),
    ShowMarcellus: require("@/assets/fonts/show-marcellus.ttf"),
    ShowBebasNeue: require("@/assets/fonts/show-bebas-neue.ttf"),
    ShowPoppins: require("@/assets/fonts/show-poppins.ttf"),
    ShowYellowtail: require("@/assets/fonts/show-yellowtail.ttf"),
    ShowGraduate: require("@/assets/fonts/show-graduate.ttf"),
    ShowPirataOne: require("@/assets/fonts/show-pirata-one.ttf"),
    ShowPlayfair: require("@/assets/fonts/show-playfair.ttf"),
    ShowPlayfairBlack: require("@/assets/fonts/show-playfair-black.ttf"),
    ShowBaloo2: require("@/assets/fonts/show-baloo2.ttf"),
    ShowFredoka: require("@/assets/fonts/show-fredoka.ttf"),
    ShowAlfaSlab: require("@/assets/fonts/show-alfa-slab.ttf"),
    ShowCormorant: require("@/assets/fonts/show-cormorant.ttf"),
    ShowGochiHand: require("@/assets/fonts/show-gochi-hand.ttf"),
    ShowBlackOps: require("@/assets/fonts/show-black-ops.ttf"),
    ShowImFell: require("@/assets/fonts/show-im-fell.ttf"),
    ShowGrenzeGotisch: require("@/assets/fonts/show-grenze-gotisch.ttf"),
  });
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}
