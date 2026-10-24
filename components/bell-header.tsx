/**
 * v226 — "Faces by the Bell": the persistent prayer-and-day header.
 *
 * Mounted in the (tabs) layout, so it rides the main tab screens. It
 * shows: the due-faces strip (everyone to pray for today who hasn't
 * been — emergency ringed red, praise ringed gold), a Now/Next line
 * from today's schedule, and a bell whose badge counts everything
 * asking for attention. Tapping the bell opens a plain-lines panel;
 * tapping a face (in the strip or the panel) goes to that person,
 * whose existing pray flow settles the face away.
 *
 * State settles from storage on mount, on focus, on route change,
 * and when the app returns to the foreground — no background timers.
 * When nothing is due and nothing is on, the header renders nothing.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarImage } from "@/components/avatar-system";
import { useColors } from "@/hooks/use-colors";
import {
  EMERGENCY_RING_COLOR,
  PRAISE_RING_COLOR,
  getBellSummary,
  type BellSummary,
} from "@/lib/bell-header";
import { PEOPLE_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { SCHEDULE_EVENTS_KEY, SCHEDULE_TODOS_KEY } from "@/lib/schedule-data";

function parseArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function BellHeader() {
  const colors = useColors();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<BellSummary | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const lastSignature = useRef<string>("");

  const load = useCallback(async () => {
    try {
      const [peopleRaw, eventsRaw, todosRaw] = await Promise.all([
        AsyncStorage.getItem(PEOPLE_STORAGE_KEY),
        AsyncStorage.getItem(SCHEDULE_EVENTS_KEY),
        AsyncStorage.getItem(SCHEDULE_TODOS_KEY),
      ]);
      const next = getBellSummary(
        parseArray(peopleRaw),
        parseArray(eventsRaw),
        parseArray(todosRaw),
        new Date(),
      );
      const signature = [
        next.faces.map((f) => `${f.person.id}:${f.ring}`).join(","),
        next.badgeCount,
        next.nowLine ? `${next.nowLine.mode}:${next.nowLine.title}` : "",
      ].join("|");
      if (signature !== lastSignature.current) {
        lastSignature.current = signature;
        // Gentle settle when the strip's population changes — no bounce.
        fade.setValue(0.35);
        Animated.timing(fade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      }
      setSummary(next);
    } catch {
      // A storage hiccup leaves the header hidden rather than broken.
    }
  }, [fade]);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
    });
    return () => sub.remove();
  }, [load]);

  const reachEntries = summary?.reachEntries ?? [];

  // Nothing due, nothing on, nothing calling: no bar at all.
  if (
    !summary ||
    (summary.faces.length === 0 && summary.badgeCount === 0 && !summary.nowLine)
  ) {
    return null;
  }

  const openPerson = (personId: string) => {
    setPanelOpen(false);
    router.push({ pathname: "/person", params: { personId } });
  };

  const nowText = summary.nowLine
    ? summary.nowLine.mode === "now"
      ? `Now · ${summary.nowLine.title}${summary.nowLine.untilLabel ? ` — until ${summary.nowLine.untilLabel}` : ""}`
      : `Next · ${summary.nowLine.title}${summary.nowLine.timeLabel ? ` · ${summary.nowLine.timeLabel}` : ""}`
    : null;

  return (
    <>
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            paddingTop: insets.top + 6,
            opacity: fade,
          },
        ]}
      >
        {summary.faces.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.facesScroll}
            contentContainerStyle={styles.facesContent}
          >
            {summary.faces.map((face) => (
              <Pressable
                key={face.person.id}
                onPress={() => openPerson(face.person.id)}
                accessibilityRole="button"
                accessibilityLabel={`${face.person.name} — prayer due today`}
                style={({ pressed }) => [styles.faceButton, pressed && styles.pressed]}
              >
                <View
                  style={[
                    styles.ring,
                    {
                      borderColor:
                        face.ring === "emergency"
                          ? EMERGENCY_RING_COLOR
                          : face.ring === "praise"
                            ? PRAISE_RING_COLOR
                            : face.person.accentColor,
                      borderWidth: face.ring === "none" ? 1.5 : 2.5,
                    },
                  ]}
                >
                  <AvatarImage
                    id={face.person.id}
                    name={face.person.name}
                    gender={face.person.gender}
                    avatarAsset={face.person.avatarAsset}
                    photoUri={face.person.photoUri}
                    size={36}
                    thumbnail
                    fallbackColor={face.person.accentColor}
                  />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {nowText ? (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.nowText,
              { color: colors.foreground },
              summary.faces.length > 0 ? styles.nowTextBounded : styles.nowTextFlex,
            ]}
          >
            {nowText}
          </Text>
        ) : null}

        <Pressable
          onPress={() => setPanelOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={
            summary.badgeCount > 0
              ? `Notifications — ${summary.badgeCount} things need attention`
              : "Notifications"
          }
          style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}
        >
          <MaterialIcons name="notifications" size={24} color={colors.foreground} />
          {summary.badgeCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: EMERGENCY_RING_COLOR }]}>
              <Text style={styles.badgeText}>
                {summary.badgeCount > 99 ? "99+" : summary.badgeCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </Animated.View>

      <Modal
        visible={panelOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPanelOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPanelOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                Today needs attention
              </Text>
              <Pressable
                onPress={() => setPanelOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close notifications"
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent}>
              {nowText ? (
                <View style={styles.group}>
                  <Text style={[styles.groupTitle, { color: colors.muted }]}>RIGHT NOW</Text>
                  <Text style={[styles.line, { color: colors.foreground }]}>{nowText}</Text>
                </View>
              ) : null}

              {summary.prayerLines.length > 0 ? (
                <View style={styles.group}>
                  <Text style={[styles.groupTitle, { color: colors.muted }]}>PRAYER</Text>
                  {summary.faces.map((face, i) => (
                    <Pressable
                      key={face.person.id}
                      onPress={() => openPerson(face.person.id)}
                      style={({ pressed }) => [pressed && styles.pressed]}
                    >
                      <Text style={[styles.line, { color: colors.foreground }]}>
                        {summary.prayerLines[i]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {summary.scheduleLines.length > 0 ? (
                <View style={styles.group}>
                  <Text style={[styles.groupTitle, { color: colors.muted }]}>SCHEDULE</Text>
                  {summary.scheduleLines.map((line) => (
                    <Text key={line} style={[styles.line, { color: colors.foreground }]}>
                      {line}
                    </Text>
                  ))}
                </View>
              ) : null}

              {reachEntries.length > 0 ? (
                <View style={styles.group}>
                  <Text style={[styles.groupTitle, { color: colors.muted }]}>REACHING OUT</Text>
                  {reachEntries.map((entry) => (
                    <Pressable
                      key={entry.person.id}
                      onPress={() => openPerson(entry.person.id)}
                      style={({ pressed }) => [pressed && styles.pressed]}
                    >
                      <Text style={[styles.line, { color: colors.foreground }]}>
                        {entry.line}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  facesScroll: { flexGrow: 0, flexShrink: 1 },
  facesContent: { alignItems: "center", paddingRight: 4 },
  faceButton: { marginRight: 8 },
  ring: {
    borderRadius: 999,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  nowText: { fontSize: 12.5, fontWeight: "600" },
  nowTextFlex: { flex: 1 },
  nowTextBounded: { flexShrink: 1, marginLeft: 4, maxWidth: "38%" },
  bellButton: { marginLeft: "auto", padding: 6 },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  pressed: { opacity: 0.6 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "72%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 26,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800" },
  closeButton: { padding: 4 },
  sheetScroll: { flexShrink: 1 },
  sheetContent: { paddingBottom: 8 },
  group: { marginTop: 12 },
  groupTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, marginBottom: 4 },
  line: { fontSize: 14.5, lineHeight: 21, paddingVertical: 3 },
});
