import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { WAVE_DOORS, type WaveDoorId } from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import type { SessionEarnings } from "@/lib/kmo-progression";

/**
 * v395 The Way Back Down — the wave check (the screen Jonathan
 * screenshotted from concept v1 and kept through v3): one honest
 * question, the session's one line ("You played Echo Lights for
 * 11 minutes"), and three Material doors. Everything about the
 * WAVE shown here is shown ONCE, to him, and forgotten: ratings
 * and minutes are never persisted (the v397 law keeps them
 * ledger-free).
 *
 * v397: the card also carries the session's earnings line — the
 * score the game just converted into his coin purse and XP track.
 * The earnings were real the moment they were credited; this line
 * is just their receipt, and it is not stored either.
 *
 * v401: the entry rating is gone (his screenshot feedback — the
 * 1–10 line stood on the dealt screen AND here). This card now
 * asks the one question once: the rating chips, the session
 * line, the earnings line. There is no "before" to read back,
 * so no before→now scale is drawn — nothing is invented.
 */
export function WaveCheck({
  m,
  sessionLineText,
  earnings,
  onDoor,
}: {
  m: KeepMeOccupiedMaterialFamily;
  sessionLineText: string;
  earnings?: SessionEarnings | null;
  onDoor: (door: WaveDoorId) => void;
}) {
  const [nowRating, setNowRating] = useState<number | null>(null);

  return (
    <View>
      <View style={[styles.card, { backgroundColor: m.card, borderColor: m.line, shadowColor: m.shadow }]}>
        <Text style={[styles.title, { color: m.ink }]}>How strong is it now?</Text>
        <Text style={[styles.sub, { color: m.inkSoft }]}>{sessionLineText}</Text>
        {earnings && (earnings.coins > 0 || earnings.xp > 0) ? (
          <Text style={[styles.earnings, { color: m.deep }]}>
            +{earnings.coins} coins · +{earnings.xp} XP
          </Text>
        ) : null}

        <View style={styles.chips}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
            const selected = nowRating === n;
            return (
              <Pressable
                key={n}
                onPress={() => setNowRating(n)}
                accessibilityRole="button"
                accessibilityLabel={`Rate ${n} out of 10`}
                style={[
                  styles.chip,
                  { backgroundColor: m.tonal, borderColor: m.line },
                  selected && { backgroundColor: m.seed, borderColor: m.seed },
                ]}
              >
                <Text style={[styles.chipText, { color: selected ? "#FFFFFF" : m.tonalInk }]}>{n}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.doors}>
        {WAVE_DOORS.map((door) => {
          const paint =
            door.id === "another"
              ? { backgroundColor: m.redFill, color: m.redFillInk, subColor: m.redFillInk }
              : door.id === "pray"
                ? { backgroundColor: m.seed, color: "#FFFFFF", subColor: "#FFFFFF" }
                : { backgroundColor: m.tonal, color: m.tonalInk, subColor: m.tonalInk };
          return (
            <Pressable
              key={door.id}
              onPress={() => onDoor(door.id)}
              accessibilityRole="button"
              accessibilityLabel={door.label}
              style={({ pressed }) => [styles.door, { backgroundColor: paint.backgroundColor }, pressed && { opacity: 0.85 }]}
            >
              <Text style={[styles.doorLabel, { color: paint.color }]}>
                {door.id === "another" ? "⤨ " : door.id === "pray" ? "🙏 " : "☀️ "}
                {door.label}
              </Text>
              <Text style={[styles.doorSub, { color: paint.subColor }]}>{door.sub}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 13,
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  title: { fontSize: 18.5, fontWeight: "900" },
  sub: { fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  earnings: { fontSize: 14, fontWeight: "900", marginTop: 9 },
  chips: { flexDirection: "row", gap: 5, marginTop: 16, flexWrap: "wrap" },
  chip: { width: 30, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 13.5, fontWeight: "800" },
  doors: { marginTop: 13, gap: 9 },
  door: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 18, flexDirection: "row", alignItems: "center" },
  doorLabel: { fontSize: 14.5, fontWeight: "800" },
  doorSub: { marginLeft: "auto", fontSize: 11.5, fontWeight: "700", opacity: 0.8 },
});
