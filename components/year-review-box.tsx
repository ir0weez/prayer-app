/**
 * v414 — the Year in Review box on the Fast page (Jonathan, Nov 2:
 * it appears under Recaps, as its own filled box, and only from
 * December 31 — before that it does not exist in the tree at all:
 * no teaser, no locked slot). The gate and the year it names live
 * in lib/year-review.ts; the counts row derives from the stores at
 * render time (the fast's calendar days, the study track's written
 * books under the v324 union rule, the people list), loaded lazily
 * and only once the gate has passed.
 */
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { FastTrackerFamily } from "@/components/fast-tracker";
import { isYearReviewVisible, yearReviewYear } from "@/lib/year-review";
import { getFastCalendarDays, type PersonalFast } from "@/lib/prayercircle-fasting";
import { PEOPLE_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { BIBLE_BOOKS } from "@/lib/bible-books";
import { loadStudyState } from "@/lib/bible-v205/study";
import { loadStudioImports } from "@/lib/bible-v205/studio-import";
import { studyProgressTotals } from "@/lib/bible-v205/rewards";

export function FastYearReviewBox({
  family,
  fast,
  today,
  onPress,
}: {
  family: FastTrackerFamily;
  fast: PersonalFast;
  today: string;
  onPress: () => void;
}) {
  const visible = isYearReviewVisible(fast, today);
  const [counts, setCounts] = useState<{ written: number; people: number } | null>(null);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    (async () => {
      try {
        const [rawPeople, studyState, imports] = await Promise.all([
          AsyncStorage.getItem(PEOPLE_STORAGE_KEY),
          loadStudyState(),
          loadStudioImports(),
        ]);
        const parsed: unknown = rawPeople ? JSON.parse(rawPeople) : [];
        const written = studyProgressTotals(studyState, BIBLE_BOOKS, imports).writtenBooks;
        if (live) {
          setCounts({ written, people: Array.isArray(parsed) ? parsed.length : 0 });
        }
      } catch {
        if (live) setCounts({ written: 0, people: 0 });
      }
    })();
    return () => {
      live = false;
    };
  }, [visible, fast.id]);

  // The hard gate: before Dec 31 of the fast's year, nothing.
  if (!visible) return null;

  const year = yearReviewYear(fast);
  const days = getFastCalendarDays(fast).length;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Year in Review, ${year}`}
      style={({ pressed }) => [
        styles.box,
        { backgroundColor: family.seed, shadowColor: family.shadow },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.kickerRow}>
        <Text style={styles.kicker}>Year in Review</Text>
        <View style={styles.chevronDisc}>
          <MaterialIcons name="chevron-right" size={16} color="#FFFFFF" />
        </View>
      </View>
      <Text style={styles.year}>{year}</Text>
      <Text style={styles.line}>Your whole year — the highs, the lows, and everything in-between.</Text>
      {counts ? (
        <Text style={styles.counts}>
          {days} days · {counts.written} books written · {counts.people} people prayed for
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  pressed: { opacity: 0.92 },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kicker: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  chevronDisc: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  year: { color: "#FFFFFF", fontSize: 30, fontWeight: "800", marginTop: 2 },
  line: { color: "#FFFFFF", fontSize: 13, fontWeight: "600", marginTop: 2 },
  counts: { color: "rgba(255,255,255,0.85)", fontSize: 11.5, fontWeight: "700", marginTop: 8 },
});
