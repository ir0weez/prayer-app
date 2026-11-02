/**
 * v410 — the fast's Day Page (Journal/Fast Rework, Part 1).
 *
 * The full page that replaces the FastDaySheet at every entry
 * point (Jonathan, Nov 1: "I hate these little pop-up cards" —
 * approved drawing: journal-whole-rework-v13.html, Frame 2). The
 * Record's day circles and today's ring route here; no bottom-
 * sheet day editor remains.
 *
 * The page is a plain mount — no sheet, no animated window. Its
 * status segmented control writes the EXISTING dayStatuses through
 * the same engine the tracker page runs (XP award/revoke, the
 * Hometown coin, heart lose/restore — lib/xp-engine, keyed exactly
 * as the tracker keys them), the verse card is the standing
 * encouragement source fitted to the day's state, and the day
 * itself is a timeline of journal entries: the moments logged here
 * are the same records the Journal holds (lib/fast-day-entries).
 * Dress derives from the Settings seed × appearance through the
 * tracker family, never pinned; the state colors (kept green,
 * struggle amber, fell red) are meaning colors and never follow
 * the seed.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { derivePeopleFrontDoor } from "@/lib/people-material";
import {
  FAST_KEPT_DEEP,
  FAST_KEPT_WASH,
  FAST_MISSED_DEEP,
  FAST_MISSED_WASH,
  FAST_SKIPPED_DEEP,
  FAST_SKIPPED_WASH,
  getFastEncouragement,
  weekdayLong,
} from "@/lib/fast-tracker";
import {
  FAST_DAY_ENTRY_KIND_LABELS,
  appendFastDayEntry,
  getFastDayEntries,
  migrateFastDayEntriesInStorage,
  resolveFastDayNotes,
  type FastDayEntryKind,
} from "@/lib/fast-day-entries";
import { applyCoinsDelta } from "@/lib/hometown";
import type { PrayerJournalEntry } from "@/lib/prayer-journal";
import { getTodayISOString } from "@/lib/prayercircle-data";
import {
  generateFastSummary,
  getFastCalendarDays,
  removeFastDayStatus,
  upsertFastDayStatus,
  type FastDayStatus,
  type PersonalFast,
} from "@/lib/prayercircle-fasting";
import { FASTS_STORAGE_KEY, JOURNAL_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { awardXP, loseHeart, restoreHeart, revokeXP } from "@/lib/xp-engine";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_SEGMENTS: { value: FastDayStatus; label: string }[] = [
  { value: "completed", label: "On track" },
  { value: "skipped", label: "Struggled" },
  { value: "missed", label: "Broke" },
];

const KIND_ICONS: Record<FastDayEntryKind, string> = {
  held: "shield",
  "close-call": "warning",
  fell: "close",
  note: "edit",
};

function monthDayLabel(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  if (!month || !day) return date;
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

function timeLabel(createdAt: string): string {
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function FastDayPage() {
  const router = useRouter();
  const colors = useColors();
  const scheme = useColorScheme();
  const family = useMemo(
    () => derivePeopleFrontDoor(colors.primary, scheme === "dark" ? "dark" : "light"),
    [colors.primary, scheme],
  );
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const params = useLocalSearchParams<{ fastId?: string; date?: string }>();
  const fastId = typeof params.fastId === "string" ? params.fastId : "";
  const date = typeof params.date === "string" ? params.date : getTodayISOString();
  const today = getTodayISOString();

  const [fasts, setFasts] = useState<PersonalFast[]>([]);
  const [entries, setEntries] = useState<PrayerJournalEntry[]>([]);
  const [kind, setKind] = useState<FastDayEntryKind>("held");
  const [draft, setDraft] = useState("");

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      // The load runs the v410 migration (dailyNotes → journal
      // entries) — idempotent, persisted once, so the page always
      // reads the one record.
      migrateFastDayEntriesInStorage()
        .then((result) => {
          if (!isActive) return;
          setFasts(result.fasts);
          setEntries(result.entries);
        })
        .catch(() => undefined);
      return () => {
        isActive = false;
      };
    }, []),
  );

  const fast = useMemo(
    () =>
      fasts.find((candidate) => candidate.id === fastId) ??
      fasts.find((candidate) => getFastCalendarDays(candidate).includes(date)) ??
      null,
    [fasts, fastId, date],
  );
  const days = useMemo(() => (fast ? getFastCalendarDays(fast) : []), [fast]);
  const dayNumber = fast ? days.indexOf(date) + 1 : 0;
  const status: FastDayStatus | null = fast ? fast.dayStatuses[date] ?? null : null;
  const encouragement = getFastEncouragement(status ?? undefined);
  const dayEntries = useMemo(
    () => (fast ? getFastDayEntries(entries, fast.id, date) : []),
    [entries, fast, date],
  );

  const persistFasts = (nextFasts: PersonalFast[]) => {
    setFasts(nextFasts);
    AsyncStorage.setItem(FASTS_STORAGE_KEY, JSON.stringify(nextFasts)).catch(() => undefined);
  };

  const maybeGenerateFastSummary = (updatedFasts: PersonalFast[]) => {
    if (!fast) return;
    const updatedFast = updatedFasts.find((candidate) => candidate.id === fast.id);
    if (!updatedFast || updatedFast.summary) return;
    const allDays = getFastCalendarDays(updatedFast);
    const allMarked = allDays.every((day) => updatedFast.dayStatuses[day]);
    if (allMarked && allDays.length > 0) {
      const withSummary = {
        ...updatedFast,
        summary: generateFastSummary(updatedFast, resolveFastDayNotes(updatedFast, entries)),
      };
      persistFasts(updatedFasts.map((candidate) => (candidate.id === updatedFast.id ? withSummary : candidate)));
    }
  };

  // The day-status engine — the tracker page's own semantics
  // (applyFastStatusEffects in app/fasting-tracker.tsx), run from
  // this page: same XP keys, same heart key, same coin.
  const applyStatus = (next: FastDayStatus | null) => {
    if (!fast) return;
    const previousStatus = fast.dayStatuses[date];
    if (next === previousStatus) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const heartKey = `fasting-day-missed:${fast.id}:${date}`;
    if (next === "completed" && previousStatus !== "completed") {
      void awardXP("fasting-day", `${fast.id}:${date}`).catch(() => undefined);
      void applyCoinsDelta(1, "none");
      void restoreHeart(heartKey, today).catch(() => undefined);
    }
    if (next !== "completed" && previousStatus === "completed") {
      void revokeXP("fasting-day", `${fast.id}:${date}`).catch(() => undefined);
    }
    if (next === "missed" && previousStatus !== "missed") {
      void loseHeart(heartKey, today).catch(() => undefined);
    }
    if (next === null && previousStatus === "missed") {
      void restoreHeart(heartKey, today).catch(() => undefined);
    }
    const nextFasts = next
      ? upsertFastDayStatus(fasts, fast.id, date, next)
      : removeFastDayStatus(fasts, fast.id, date);
    persistFasts(nextFasts);
    maybeGenerateFastSummary(nextFasts);
  };

  const logEntry = () => {
    if (!fast || !draft.trim()) return;
    const next = appendFastDayEntry(entries, { fastId: fast.id, date, kind, text: draft }, new Date());
    setEntries(next);
    AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
    setDraft("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const kindPaint = (entryKind: FastDayEntryKind): { wash: string; deep: string } => {
    if (entryKind === "held") return { wash: FAST_KEPT_WASH, deep: FAST_KEPT_DEEP };
    if (entryKind === "close-call") return { wash: FAST_SKIPPED_WASH, deep: FAST_SKIPPED_DEEP };
    if (entryKind === "fell") return { wash: FAST_MISSED_WASH, deep: FAST_MISSED_DEEP };
    return { wash: family.wash, deep: family.deep };
  };
  const kindFill = (entryKind: FastDayEntryKind): string => {
    if (entryKind === "held") return FAST_KEPT_DEEP;
    if (entryKind === "close-call") return FAST_SKIPPED_DEEP;
    if (entryKind === "fell") return FAST_MISSED_DEEP;
    return family.seed;
  };

  return (
    <View style={{ flex: 1, backgroundColor: family.ground }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}
          accessibilityRole="button"
          accessibilityLabel="Back to Fasting"
        >
          <MaterialIcons name="arrow-back" size={17} color={family.deep} />
          <Text style={{ fontSize: 13, fontWeight: "800", color: family.deep }}>Fasting</Text>
        </Pressable>

        {fast && dayNumber > 0 ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 12, gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 27, lineHeight: 32, fontWeight: "800", color: family.ink }}>
                  Day {dayNumber}
                </Text>
                <Text style={{ fontSize: 12.5, fontWeight: "600", color: family.inkSoft, marginTop: 2 }}>
                  {weekdayLong(date)}, {monthDayLabel(date)} · {fast.name}
                </Text>
              </View>
              <View style={{ backgroundColor: family.wash, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 }}>
                <Text style={{ fontSize: 10.5, fontWeight: "800", color: family.deep }}>In the Journal too</Text>
              </View>
            </View>

            {/* The day's state — re-tapping the standing segment
                unmarks the day, the standing rule since v280. */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: family.wash,
                borderRadius: 999,
                padding: 4,
                gap: 4,
                marginTop: 16,
              }}
            >
              {STATUS_SEGMENTS.map((segment) => {
                const selected = status === segment.value;
                return (
                  <Pressable
                    key={segment.value}
                    onPress={() => applyStatus(selected ? null : segment.value)}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      paddingVertical: 9,
                      borderRadius: 999,
                      backgroundColor: selected ? family.card : "transparent",
                      ...(selected
                        ? { shadowColor: family.shadow, shadowOpacity: 1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }
                        : {}),
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={segment.label}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: "800", color: selected ? family.deep : family.inkSoft }}>
                      {segment.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ backgroundColor: family.container, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, marginTop: 12 }}>
              <Text style={{ fontSize: 9.5, fontWeight: "800", letterSpacing: 1.7, color: family.deep }}>
                {encouragement.kicker.toUpperCase()}
              </Text>
              <Text style={{ fontSize: 13.5, lineHeight: 19.5, fontWeight: "600", color: family.ink, marginTop: 4 }}>
                &ldquo;{encouragement.text}&rdquo;
              </Text>
              <Text style={{ fontSize: 11, fontWeight: "800", color: family.deep, marginTop: 5 }}>
                {encouragement.ref}
              </Text>
            </View>

            <Text style={{ fontSize: 10, fontWeight: "800", letterSpacing: 1.7, color: family.inkSoft, marginTop: 18, marginBottom: 9 }}>
              {date === today ? "THE DAY SO FAR" : "THE DAY"}
            </Text>

            {dayEntries.length > 0 ? (
              <View style={{ position: "relative" }}>
                <View
                  style={{
                    position: "absolute",
                    left: 8,
                    top: 14,
                    bottom: 14,
                    width: 2,
                    borderRadius: 2,
                    backgroundColor: family.line,
                  }}
                />
                {dayEntries.map((entry) => {
                  const entryKind = entry.fastDay?.kind ?? "note";
                  const paint = kindPaint(entryKind);
                  return (
                    <View key={entry.id} style={{ flexDirection: "row", marginBottom: 10 }}>
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          backgroundColor: paint.deep,
                          alignItems: "center",
                          justifyContent: "center",
                          marginTop: 13,
                          marginRight: 10,
                          borderWidth: 2,
                          borderColor: family.ground,
                          zIndex: 1,
                        }}
                      >
                        <MaterialIcons name={KIND_ICONS[entryKind] as keyof typeof MaterialIcons.glyphMap} size={9} color="#FFFFFF" />
                      </View>
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: family.card,
                          borderWidth: 1,
                          borderColor: family.line,
                          borderRadius: 18,
                          paddingHorizontal: 13,
                          paddingVertical: 11,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
                          {entry.fastDay?.migrated ? null : (
                            <Text style={{ fontSize: 10.5, fontWeight: "800", letterSpacing: 0.6, color: family.inkSoft }}>
                              {timeLabel(entry.createdAt).toUpperCase()}
                            </Text>
                          )}
                          <View
                            style={{
                              marginLeft: "auto",
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              backgroundColor: paint.wash,
                              borderRadius: 999,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                            }}
                          >
                            <MaterialIcons name={KIND_ICONS[entryKind] as keyof typeof MaterialIcons.glyphMap} size={10} color={paint.deep} />
                            <Text style={{ fontSize: 9.5, fontWeight: "800", letterSpacing: 0.4, color: paint.deep }}>
                              {FAST_DAY_ENTRY_KIND_LABELS[entryKind].toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 13.5, lineHeight: 19.5, color: family.ink }}>{entry.body}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={{ fontSize: 13.5, fontWeight: "600", color: family.inkSoft }}>
                Nothing logged for this day yet.
              </Text>
            )}
          </>
        ) : (
          <Text style={{ fontSize: 14, fontWeight: "600", color: family.inkSoft, marginTop: 24 }}>
            That day isn&rsquo;t in this fast.
          </Text>
        )}
      </ScrollView>

      {fast && dayNumber > 0 ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: family.line,
            backgroundColor: family.card,
            paddingHorizontal: 16,
            paddingTop: 11,
            paddingBottom: Math.max(keyboardHeight, insets.bottom) + (keyboardHeight > 0 ? 8 : 6),
          }}
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {(Object.keys(FAST_DAY_ENTRY_KIND_LABELS) as FastDayEntryKind[]).map((entryKind) => {
              const selected = kind === entryKind;
              return (
                <Pressable
                  key={entryKind}
                  onPress={() => setKind(entryKind)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    borderRadius: 999,
                    paddingHorizontal: 11,
                    paddingVertical: 7,
                    borderWidth: 1.5,
                    borderColor: selected ? kindFill(entryKind) : family.line,
                    backgroundColor: selected ? kindFill(entryKind) : "transparent",
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={FAST_DAY_ENTRY_KIND_LABELS[entryKind]}
                >
                  <MaterialIcons
                    name={KIND_ICONS[entryKind] as keyof typeof MaterialIcons.glyphMap}
                    size={11}
                    color={selected ? "#FFFFFF" : family.inkSoft}
                  />
                  <Text style={{ fontSize: 11.5, fontWeight: "800", color: selected ? "#FFFFFF" : family.inkSoft }}>
                    {FAST_DAY_ENTRY_KIND_LABELS[entryKind]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginTop: 10 }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={`Add to Day ${dayNumber}…`}
              placeholderTextColor={family.inkSoft}
              style={{
                flex: 1,
                backgroundColor: family.wash,
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 11,
                fontSize: 13,
                fontWeight: "600",
                color: family.ink,
              }}
              returnKeyType="done"
              onSubmitEditing={logEntry}
            />
            <Pressable
              onPress={logEntry}
              disabled={!draft.trim()}
              style={{
                backgroundColor: family.seed,
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 11,
                opacity: draft.trim() ? 1 : 0.45,
              }}
              accessibilityRole="button"
              accessibilityLabel="Log entry"
            >
              <Text style={{ fontSize: 12.5, fontWeight: "800", color: "#FFFFFF" }}>Log</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
