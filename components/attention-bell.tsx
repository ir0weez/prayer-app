import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, AppState, Easing, Modal, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { AvatarImage } from "@/components/avatar-system";
import { usePeopleMaterial } from "@/hooks/use-people-material";
import type { PeopleMaterialFamily } from "@/lib/people-material";
import {
  getBellSummary,
  EMERGENCY_RING_COLOR,
  PRAISE_RING_COLOR,
  type BellSummary,
  type DueFace,
} from "@/lib/bell-header";
import type { Person } from "@/lib/prayercircle-data";
import { SCHEDULE_EVENTS_KEY, SCHEDULE_TODOS_KEY, type ScheduleEvent, type ScheduleTodo } from "@/lib/schedule-data";

// ─── v254 "People, First" — the Bell, designed ──────────────────────────────
// The attention bell returns (his Oct 25 ruling: "Keep it — design it
// properly this time"), built to bell-material-concept-v1. The v226
// faces-strip header stays removed — this is a bell + a bottom-sheet
// panel only, riding the app bar of the main tab screens.
//
// Every count comes from lib/bell-header.ts's getBellSummary — the
// badge is faces + scheduleLines + reachEntries, red only while an
// emergency is live, seed-deep otherwise, hidden at zero, capped at
// 99+. The panel shows exactly the rows the badge counted, grouped
// EMERGENCY / PRAISE / PRAYER DUE TODAY / SCHEDULE / REACHING OUT.
//
// Settling: people arrive live from the host screen's state; schedule
// events/todos settle from storage on mount, on app foreground, and
// whenever the panel opens. No background timers.

function parseArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** "≈9h left" — the panel chip's compact form of the lib's hours-left. */
function compactHoursLeft(expiresAtIso: string | undefined, now: Date): string | null {
  if (!expiresAtIso) return null;
  const ms = new Date(expiresAtIso).getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "ending now";
  const hours = Math.round(ms / 3600000);
  if (hours < 1) return "under 1h left";
  return `≈${hours}h left`;
}

function emergencyTitle(person: Person, now: Date): string {
  const item = person.prayerItems.find((candidate) => {
    if (!candidate.isEmergency || !candidate.emergencyExpiresAt) return false;
    const ms = new Date(candidate.emergencyExpiresAt).getTime();
    return Number.isFinite(ms) && ms > now.getTime();
  });
  return item?.title?.trim() || "Emergency prayer";
}

function praiseTitle(person: Person): string {
  if (person.praiseNote?.trim()) return person.praiseNote.trim();
  const praised = person.prayerItems.find((item) => item.isPraised);
  return praised?.title?.trim() || "Praise";
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function AttentionBell({
  people,
  onOpenPerson,
  onPrayToday,
  family,
}: {
  people: Person[];
  onOpenPerson: (personId: string) => void;
  onPrayToday: () => void;
  /**
   * v255: an optional token family override. The People front door
   * passes its own light family (the mockup's language) so the bell
   * and its sheet sit on that page in the page's dress; every other
   * host keeps the palette family from the hook.
   */
  family?: PeopleMaterialFamily;
}) {
  const hookFamily = usePeopleMaterial();
  const pm = family ?? hookFamily;
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [todos, setTodos] = useState<ScheduleTodo[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [panelOpen, setPanelOpen] = useState(false);
  // v254 motion: the sheet glides up while the scrim fades (Material
  // standard easing, native driver, no spring), and the badge does
  // ONE calm scale-settle when its count changes. Reduced motion
  // lands everything static and instant.
  const [reducedMotion, setReducedMotion] = useState(false);
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(480)).current;
  const badgeScale = useRef(new Animated.Value(1)).current;
  const prevBadgeCount = useRef<number | null>(null);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => { if (live) setReducedMotion(reduced); })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => { live = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    Animated.parallel([
      Animated.timing(scrimOpacity, { toValue: 1, duration: reducedMotion ? 0 : 240, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }),
      Animated.timing(sheetY, { toValue: 0, duration: reducedMotion ? 0 : 320, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }),
    ]).start();
  }, [panelOpen, reducedMotion, scrimOpacity, sheetY]);

  const closePanel = useCallback(() => {
    Animated.parallel([
      Animated.timing(scrimOpacity, { toValue: 0, duration: reducedMotion ? 0 : 200, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }),
      Animated.timing(sheetY, { toValue: 480, duration: reducedMotion ? 0 : 240, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setPanelOpen(false); });
  }, [reducedMotion, scrimOpacity, sheetY]);

  const settle = useCallback(async () => {
    setNow(new Date());
    try {
      const [eventsRaw, todosRaw] = await Promise.all([
        AsyncStorage.getItem(SCHEDULE_EVENTS_KEY),
        AsyncStorage.getItem(SCHEDULE_TODOS_KEY),
      ]);
      setEvents(parseArray<ScheduleEvent>(eventsRaw));
      setTodos(parseArray<ScheduleTodo>(todosRaw));
    } catch {
      // Best-effort: the bell still counts faces and reach-outs.
    }
  }, []);

  useEffect(() => {
    void settle();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void settle();
    });
    return () => subscription.remove();
  }, [settle]);

  // People changing (someone prayed, an emergency posted) re-settles
  // the clock too — the count he sees is the count the panel holds.
  useEffect(() => {
    setNow(new Date());
  }, [people]);

  const summary: BellSummary = useMemo(
    () => getBellSummary(people, events, todos, now),
    [people, events, todos, now],
  );

  const hasEmergency = summary.faces.some((face) => face.ring === "emergency");
  const badgeCount = summary.badgeCount;
  const badgeLabel = badgeCount > 99 ? "99+" : String(badgeCount);

  // One calm scale-settle when the count changes (never on mount,
  // never under reduced motion, never a loop).
  useEffect(() => {
    if (prevBadgeCount.current === null) {
      prevBadgeCount.current = badgeCount;
      return;
    }
    if (prevBadgeCount.current === badgeCount) return;
    prevBadgeCount.current = badgeCount;
    if (reducedMotion) return;
    Animated.sequence([
      Animated.timing(badgeScale, { toValue: 1.22, duration: 150, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }),
      Animated.timing(badgeScale, { toValue: 1, duration: 200, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }),
    ]).start();
  }, [badgeCount, reducedMotion, badgeScale]);
  const dateLine = `${WEEKDAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;

  const openPanel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void settle();
    setPanelOpen(true);
  };

  const openPerson = (personId: string) => {
    closePanel();
    onOpenPerson(personId);
  };

  const emergencyFaces = summary.faces.filter((face) => face.ring === "emergency");
  const praiseFaces = summary.faces.filter((face) => face.ring === "praise");
  const dueFaces = summary.faces.filter((face) => face.ring === "none");

  const groupHeader = (label: string, count: number, color: string) => (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginHorizontal: 2, marginBottom: 3 }}>
      <Text style={{ fontSize: 10.5, fontWeight: "800", letterSpacing: 1.4, color }}>{label}</Text>
      <Text style={{ fontSize: 10.5, fontWeight: "700", color: pm.inkSoft }}>{count}</Text>
    </View>
  );

  const faceRow = (face: DueFace, sub: string, chip: { text: string; bg: string; ink: string } | null) => {
    const ringColor = face.ring === "emergency" ? EMERGENCY_RING_COLOR : face.ring === "praise" ? PRAISE_RING_COLOR : pm.line;
    return (
      <Pressable
        key={face.person.id}
        onPress={() => openPerson(face.person.id)}
        style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 9, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: pm.wash }, pressed && { opacity: 0.7 }]}
      >
        <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: face.ring === "none" ? 1.5 : 2.5, borderColor: ringColor, alignItems: "center", justifyContent: "center" }}>
          <AvatarImage id={face.person.id} name={face.person.name} gender={face.person.gender} avatarAsset={face.person.avatarAsset} photoUri={face.person.photoUri} size={face.ring === "none" ? 41 : 39} thumbnail fallbackColor={face.person.accentColor} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: "800", color: pm.ink }}>{face.person.name}</Text>
          <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "600", color: pm.inkSoft, marginTop: 1 }}>{sub}</Text>
        </View>
        {chip ? (
          <View style={{ backgroundColor: chip.bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: chip.ink }}>{chip.text}</Text>
          </View>
        ) : null}
        <MaterialIcons name="chevron-right" size={18} color={pm.wash2} />
      </Pressable>
    );
  };

  return (
    <>
      <Pressable
        onPress={openPanel}
        accessibilityLabel="Today needs attention"
        style={({ pressed }) => [{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: pm.card,
          alignItems: "center", justifyContent: "center",
          shadowColor: pm.shadow, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
        }, pressed && { opacity: 0.75 }]}
      >
        <MaterialIcons name="notifications-none" size={21} color={badgeCount > 0 ? pm.deep : pm.inkSoft} />
        {badgeCount > 0 ? (
          <Animated.View style={{
            position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9,
            backgroundColor: hasEmergency ? EMERGENCY_RING_COLOR : pm.deep,
            borderWidth: 2, borderColor: pm.ground,
            alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
            transform: [{ scale: badgeScale }],
          }}>
            <Text style={{ color: "#FFFFFF", fontSize: 10.5, fontWeight: "800" }}>{badgeLabel}</Text>
          </Animated.View>
        ) : null}
      </Pressable>

      <Modal transparent visible={panelOpen} animationType="none" onRequestClose={closePanel}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(38,22,74,0.50)", opacity: scrimOpacity }}>
            <Pressable style={{ flex: 1 }} onPress={closePanel} />
          </Animated.View>
          <Animated.View style={{ backgroundColor: pm.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 9, paddingBottom: 16, maxHeight: "86%", transform: [{ translateY: sheetY }] }}>
            <View style={{ width: 38, height: 4.5, borderRadius: 3, backgroundColor: pm.wash2, alignSelf: "center", marginBottom: 10 }} />
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontSize: 19, fontWeight: "800", color: pm.ink }}>Today needs attention</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: pm.inkSoft, marginTop: 1 }}>{dateLine} · {badgeCount} {badgeCount === 1 ? "thing" : "things"}</Text>
              </View>
              <Pressable onPress={closePanel} style={({ pressed }) => [{ width: 32, height: 32, borderRadius: 16, backgroundColor: pm.wash, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.7 }]}>
                <MaterialIcons name="close" size={16} color={pm.deep} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
              {summary.nowLine ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: pm.wash, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9, marginTop: 12 }}>
                  <MaterialIcons name="schedule" size={16} color={pm.deep} />
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, fontWeight: "700", color: pm.washInk }}>
                    {summary.nowLine.mode === "now" ? "Now" : "Next"} · {summary.nowLine.title}
                  </Text>
                  {summary.nowLine.untilLabel || summary.nowLine.timeLabel ? (
                    <Text style={{ fontSize: 13, fontWeight: "800", color: pm.deep }}>{summary.nowLine.untilLabel ?? summary.nowLine.timeLabel}</Text>
                  ) : null}
                </View>
              ) : null}

              {emergencyFaces.length > 0 ? (
                <View style={{ marginTop: 15 }}>
                  {groupHeader("EMERGENCY", emergencyFaces.length, "#991B1B")}
                  {emergencyFaces.map((face) => faceRow(face, emergencyTitle(face.person, now), { text: compactHoursLeft(face.emergencyExpiresAt, now) ?? "", bg: pm.redWash, ink: "#991B1B" }))}
                </View>
              ) : null}

              {praiseFaces.length > 0 ? (
                <View style={{ marginTop: 15 }}>
                  {groupHeader("PRAISE", praiseFaces.length, pm.goldDeep)}
                  {praiseFaces.map((face) => faceRow(face, praiseTitle(face.person), { text: compactHoursLeft(face.praiseExpiresAt, now) ?? "", bg: pm.goldWash, ink: pm.goldDeep }))}
                </View>
              ) : null}

              {dueFaces.length > 0 ? (
                <View style={{ marginTop: 15 }}>
                  {groupHeader("PRAYER DUE TODAY", dueFaces.length, pm.deep)}
                  {dueFaces.map((face) => faceRow(face, "Prayer due today", null))}
                </View>
              ) : null}

              {summary.scheduleLines.length > 0 ? (
                <View style={{ marginTop: 15 }}>
                  {groupHeader("SCHEDULE", summary.scheduleLines.length, pm.inkSoft)}
                  {summary.scheduleLines.map((line) => {
                    const splitAt = line.indexOf(" — ");
                    const time = splitAt > 0 ? line.slice(0, splitAt) : "All day";
                    const title = splitAt > 0 ? line.slice(splitAt + 3) : line;
                    return (
                      <View key={line} style={{ flexDirection: "row", alignItems: "baseline", gap: 11, paddingVertical: 8, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: pm.wash }}>
                        <Text style={{ width: 46, fontSize: 13, fontWeight: "800", color: pm.deep }}>{time}</Text>
                        <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: "700", color: pm.ink }}>{title}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {summary.reachEntries.length > 0 ? (
                <View style={{ marginTop: 15 }}>
                  {groupHeader("REACHING OUT", summary.reachEntries.length, pm.amberDeep)}
                  {summary.reachEntries.map((entry) => faceRow(
                    { person: entry.person, ring: "none" },
                    `Hasn't been reached in ${entry.days} days`,
                    null,
                  ))}
                </View>
              ) : null}

              {badgeCount === 0 && !summary.nowLine ? (
                <Text style={{ fontSize: 13.5, fontWeight: "600", color: pm.inkSoft, marginTop: 16 }}>Nothing needs attention right now.</Text>
              ) : null}
            </ScrollView>

            <Pressable
              onPress={() => { closePanel(); onPrayToday(); }}
              style={({ pressed }) => [{ marginTop: 17, backgroundColor: pm.inkSeed, borderRadius: 999, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, shadowColor: pm.inkSeed, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 }, pressed && { opacity: 0.85 }]}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14.5, fontWeight: "800" }}>Pray Today</Text>
              <View style={{ backgroundColor: "#FFC53D", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2.5 }}>
                <Text style={{ color: "#4A2F00", fontSize: 11.5, fontWeight: "900" }}>{summary.faces.length} waiting</Text>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}
