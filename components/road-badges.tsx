// The Road — the era badges in Collections (v331).
//
// Twelve cut-paper medallions, one per era, in ERA_DEFS order. Earned
// seats stand in full era paper with their glyph; unearned seats are
// the same medallion as a quiet outline, still naming the era ahead.
// Re-walks of an era gild its medallion: up to three small gold stars
// along the bottom arc, and a "Walked ×N" line beneath. The earning
// itself lives in lib/hometown-road (derivation + reconcile); this
// file only draws it and settles it when the book opens.

import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { ERA_DEFS, type EraDef } from "@/lib/hometown-eras";
import {
  ERA_BADGE_ART,
  emptyRoadState,
  gildMarksFor,
  roadEarnedCount,
  roadSeats,
  settleRoadBadges,
  type RoadEraRecord,
  type RoadState,
} from "@/lib/hometown-road";
import { FASTS_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { getActiveFast, parseStoredFasts } from "@/lib/prayercircle-fasting";

/** The era glyph, drawn in a 48x48 box centered on the medallion —
 *  simple geometric paper cuts, no borrowed icon font. */
function RoadGlyph({ era, disc, faded }: { era: EraDef; disc: string; faded: boolean }) {
  const art = ERA_BADGE_ART[era.id];
  const s = art.ink;
  const a = art.accent;
  const inner = (() => {
    switch (art.glyph) {
      case "house":
        return <Path d="M24 7 L41 21 H37 V39 H28 V30 H20 V39 H11 V21 H7 Z" fill={s} />;
      case "ark":
        return (
          <>
            <Path d="M15.5 20 L24 12.5 L32.5 20 Z" fill={s} />
            <Path d="M18 20 H30 V29 H18 Z" fill={s} />
            <Path d="M7 29 L11.5 37.5 H36.5 L41 29 Z" fill={s} />
            <Path d="M9 43 Q14 40 19 43 Q24 46 29 43 Q34 40 39 43" stroke={a} strokeWidth={3} fill="none" strokeLinecap="round" />
          </>
        );
      case "tower":
        return (
          <>
            <Path d="M19 40 V27 H29 V40 Z" fill={s} />
            <Path d="M21 27 V17 H27 V27 Z" fill={s} />
            <Path d="M22.5 17 V9 H25.5 V17 Z" fill={s} />
          </>
        );
      case "star":
        return (
          <>
            <Path d="M24 11 L39 35 H9 Z" fill="none" stroke={s} strokeWidth={3.4} strokeLinejoin="round" />
            <Path d="M24 37 L9 13 H39 Z" fill="none" stroke={s} strokeWidth={3.4} strokeLinejoin="round" />
          </>
        );
      case "crown":
        return (
          <>
            <Path d="M9 34 L8 17 L17 24.5 L24 13 L31 24.5 L40 17 L39 34 Z" fill={s} />
            <Path d="M9 37.5 H39 V40.5 H9 Z" fill={s} opacity={0.55} />
          </>
        );
      case "crown-gem":
        return (
          <>
            <Path d="M9 34 L8 17 L17 24.5 L24 13 L31 24.5 L40 17 L39 34 Z" fill={s} />
            <Circle cx={24} cy={28.5} r={3.4} fill={a} />
            <Path d="M9 37.5 H39 V40.5 H9 Z" fill={s} opacity={0.55} />
          </>
        );
      case "fish":
        return (
          <>
            <Path
              d="M5 24 C12.5 14.5 23 10.5 31.5 14.5 C36 16.7 39.5 20 43 24 C39.5 28 36 31.3 31.5 33.5 C23 37.5 12.5 33.5 5 24 Z"
              fill={s}
            />
            <Circle cx={14.5} cy={21.5} r={2.1} fill={disc} />
          </>
        );
      case "lamp":
        return (
          <>
            <Path
              d="M24 5 C26.5 11.5 33 15.5 33 25.5 A9 9 0 1 1 15 25.5 C15 17.5 20.5 14 22 8.5 C23.2 11 23.6 12.6 24 14.2 C25 9.8 24 7 24 5 Z"
              fill={s}
            />
            <Path d="M24 36 V42" stroke={s} strokeWidth={3.4} strokeLinecap="round" />
            <Path d="M14 43.5 H34" stroke={s} strokeWidth={3.4} strokeLinecap="round" />
          </>
        );
      case "scroll":
        return (
          <>
            <Path d="M15 13 H33 V35 H15 Z" fill={a} />
            <Path d="M19.5 20.5 H28.5 M19.5 27.5 H28.5" stroke={s} strokeWidth={2.6} strokeLinecap="round" />
            <Path d="M9 8 h6 v32 h-6 Z" fill={s} />
            <Path d="M33 8 h6 v32 h-6 Z" fill={s} />
          </>
        );
      case "torn-flame":
        return (
          <>
            <Path
              d="M24 4 C27 12 36 17 36 29 A12 12 0 1 1 12 29 C12 20 18 16 20 10 C22 13 23 15 24 17 C25 12 24 8 24 4 Z"
              fill={s}
            />
            <Path
              d="M13 27 L20 22.5 L24.5 29 L29.5 22 L36 26.5"
              stroke={disc}
              strokeWidth={3.6}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        );
      case "sun":
        return (
          <>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <Path key={deg} d="M24 3 L26.2 9.5 L21.8 9.5 Z" fill={s} transform={`rotate(${deg} 24 24)`} />
            ))}
            <Circle cx={24} cy={24} r={9.5} fill={s} />
            <Circle cx={24} cy={24} r={3.2} fill={disc} opacity={0.65} />
          </>
        );
      case "river-gem":
        return (
          <>
            <Path d="M24 6 L35 14.5 L24 26 L13 14.5 Z" fill={s} />
            <Path
              d="M13 14.5 H35 M24 6 L19.5 14.5 L24 26 M24 6 L28.5 14.5 L24 26"
              stroke={disc}
              strokeWidth={1.8}
              fill="none"
            />
            <Path d="M9 34.5 Q14.5 31.5 20 34.5 Q25.5 37.5 31 34.5 Q36.5 31.5 42 34.5" stroke={a} strokeWidth={3} fill="none" strokeLinecap="round" />
            <Path d="M14 42 Q18.5 39.5 23 42 Q27.5 44.5 32 42" stroke={a} strokeWidth={3} fill="none" strokeLinecap="round" />
          </>
        );
    }
  })();
  return (
    <Svg width={30} height={30} viewBox="0 0 48 48">
      <G opacity={faded ? 0.3 : 1}>{inner}</G>
    </Svg>
  );
}

/** Bottom-arc positions (degrees, y-down) for 1–3 gild stars. */
const GILD_ANGLES: Record<number, number[]> = {
  1: [90],
  2: [68, 112],
  3: [52, 90, 128],
};

function gildStarPath(cx: number, cy: number): string {
  return `M ${cx} ${cy - 4.4} L ${cx + 1.4} ${cy - 1.4} L ${cx + 4.4} ${cy} L ${cx + 1.4} ${cy + 1.4} L ${cx} ${cy + 4.4} L ${cx - 1.4} ${cy + 1.4} L ${cx - 4.4} ${cy} L ${cx - 1.4} ${cy - 1.4} Z`;
}

/** One era's medallion: full paper when earned, a quiet outline of
 *  the same medallion when it still lies ahead. */
export function RoadMedallion({
  era,
  record,
  size = 64,
}: {
  era: EraDef;
  record?: RoadEraRecord;
  size?: number;
}) {
  const art = ERA_BADGE_ART[era.id];
  const earned = !!record;
  const marks = earned ? gildMarksFor(record.completions) : 0;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        {earned ? (
          <>
            <Circle cx={32} cy={32} r={30} fill={art.ring} />
            <Circle cx={32} cy={32} r={24.5} fill={art.disc} />
            <Circle cx={32} cy={32} r={24.5} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.6} />
          </>
        ) : (
          <>
            <Circle cx={32} cy={32} r={28.6} fill={art.disc} fillOpacity={0.22} />
            <Circle cx={32} cy={32} r={28.6} fill="none" stroke={art.ring} strokeWidth={2.6} strokeOpacity={0.55} />
            <Circle cx={32} cy={32} r={23.4} fill="none" stroke={art.ring} strokeWidth={1.2} strokeOpacity={0.3} />
          </>
        )}
        {marks > 0 &&
          (GILD_ANGLES[marks] ?? []).map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const cx = 32 + 27 * Math.cos(rad);
            const cy = 32 + 27 * Math.sin(rad);
            return (
              <Path
                key={deg}
                d={gildStarPath(cx, cy)}
                fill="#E9C766"
                stroke="rgba(90,64,10,0.55)"
                strokeWidth={0.7}
              />
            );
          })}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.glyphWrap]}>
        <RoadGlyph era={era} disc={art.disc} faded={!earned} />
      </View>
    </View>
  );
}

/** The twelve seats, in era order — the pure drawing of a Road state. */
export function RoadSeatGrid({ state, pt }: { state: RoadState; pt: { text: string; subtext: string } }) {
  return (
    <View style={styles.grid}>
      {roadSeats(state).map(({ era, record, earned }) => {
        return (
          <View key={era.id} style={styles.slot}>
            <RoadMedallion era={era} record={record ?? undefined} />
            <Text style={[styles.name, { color: earned ? pt.text : pt.subtext }]}>{era.name}</Text>
            {earned && record && record.completions > 1 && (
              <Text style={[styles.sub, { color: pt.subtext }]}>Walked ×{record.completions}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

/** The Road section of the Collections book: settles the badges
 *  against the standing fast on open, then draws the twelve seats. */
export function RoadBadgesSection({ pt }: { pt: { card: string; text: string; subtext: string } }) {
  const [road, setRoad] = useState<RoadState | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
        const raw = await AsyncStorage.getItem(FASTS_STORAGE_KEY);
        const fast = getActiveFast(parseStoredFasts(raw).fasts);
        const { state } = await settleRoadBadges(fast);
        if (live) setRoad(state);
      } catch {
        if (live) setRoad(emptyRoadState());
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const state = road ?? emptyRoadState();
  const earned = roadEarnedCount(state);
  return (
    <View>
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: pt.text }}>{earned}/12 eras walked</Text>
        <View
          style={{
            height: 8,
            borderRadius: 4,
            backgroundColor: "rgba(0,0,0,0.08)",
            overflow: "hidden",
            marginTop: 6,
          }}
        >
          <View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: "#C9963C",
              width: `${Math.min(100, Math.max(0, (earned / ERA_DEFS.length) * 100))}%`,
            }}
          />
        </View>
        <Text style={{ fontSize: 12, color: pt.subtext, marginTop: 6 }}>
          A badge is earned as each era is lived through — and kept through Begin Again.
        </Text>
      </View>
      <ScrollView style={{ maxHeight: 360 }}>
        <RoadSeatGrid state={state} pt={pt} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  glyphWrap: { alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 },
  slot: { width: "31%", alignItems: "center" },
  name: { marginTop: 6, fontSize: 11.5, fontWeight: "800", textAlign: "center" },
  sub: { marginTop: 1, fontSize: 10, lineHeight: 13, textAlign: "center" },
});
