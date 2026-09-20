import "@/lib/test-crash-reporter";
import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PEOPLE_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import {
  CrashScreen,
  TestCrashBoundary,
  getEarlyCrash,
  isTestVariant,
  subscribeCrash,
  type CrashInfo,
} from "@/lib/test-crash-reporter";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayoutContent() {
  const { colorScheme } = useThemeContext();
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

  // Clear all scheduled notifications on app startup to prevent ghost notifications
  useEffect(() => {
    if (Platform.OS === "web") return;
    Notifications.getAllScheduledNotificationsAsync()
      .then((notifications) => {
        Promise.all(
          notifications.map((notification) =>
            Notifications.cancelScheduledNotificationAsync(notification.identifier),
          ),
        ).catch(() => undefined);
      })
      .catch(() => undefined);
  }, []);

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {/* Default to hiding native headers so raw route segments don't appear (e.g. "(tabs)", "products/[id]"). */}
          {/* If a screen needs the native header, explicitly enable it and set a human title via Stack.Screen options. */}
          {/* in order for ios apps tab switching to work properly, use presentation: "fullScreenModal" for login page, whenever you decide to use presentation: "modal*/}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="oauth/callback" />
          </Stack>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
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
  // TEMPORARY diagnostic: test builds show startup crashes on screen instead
  // of silently closing (see lib/test-crash-reporter.tsx). Production is
  // untouched.
  if (isTestVariant) {
    return <TestCrashRoot />;
  }
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}

// TEMPORARY diagnostic root for test builds only.
function TestCrashRoot() {
  const [crash, setCrash] = useState<CrashInfo | null>(() => getEarlyCrash());

  useEffect(() => {
    // installTestCrashHandler() already ran at import time; subscribing here
    // picks up anything reported before React mounted.
    return subscribeCrash(setCrash);
  }, []);

  if (crash) {
    return <CrashScreen info={crash} />;
  }

  return (
    <TestCrashBoundary>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </TestCrashBoundary>
  );
}
