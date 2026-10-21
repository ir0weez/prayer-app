// Clock Tower interior: gears and pendulums, the city's heartbeat.
// Villagers oil the great gears, the pendulum swings below, and the
// winding crank waits for a strong arm. The pawn winds the clock.
// "Wind the Clock" grants coins + XP on a 1-hour cooldown.
// L1: gear room, one pendulum. L2: bigger gears, winding crank, oil cans.
// L3: the grand works — great wheel, twin pendulums, brass everywhere.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { pickPeople } from "@/components/activity-figures";
import { PaperRoomScene, type PaperCastEntry } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP,
  formatCoins,
} from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";

const BG = "#ECE7DB";
const BRASS = "#C9963C";
const BRASS_DARK = "#8A6D1C";
const STEEL = "#8A7F6A";
const TEXT_DIM = "#A0977F";
const ACCENT = "#8A6D1C";

const WIND_COINS: Record<number, number> = { 1: 60, 2: 120, 3: 240 };
const WIND_XP: Record<number, number> = { 1: 5, 2: 10, 3: 18 };
const COOLDOWN_MS = 60 * 60 * 1000;
const WIND_KEY = "prayercircle.interior.clocktower.wind.v1";

export default function ClockTowerInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastWind, setLastWind] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(WIND_KEY).catch(() => null);
      setLastWind(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastWind + COOLDOWN_MS - Date.now());
  const oiling = pickPeople(people, `clocktower|${building?.id ?? "clocktower"}|oil`, 3);
  const watching = pickPeople(people, `clocktower|${building?.id ?? "clocktower"}|watch`, 1)[0];

  const cast: PaperCastEntry[] = [
    ...oiling.map((person) => ({ person, pose: "work" as const })),
    ...(watching ? [{ person: watching, pose: "stand" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "The grand works — the great clock, turning gears, and brass everywhere."
      : level >= 2
        ? "A fine works — bigger gears turning under the beams."
        : "A humble gear room — turning gears beneath the great clock face.";

  const handleWind = async () => {
    if (remaining > 0) {
      Alert.alert("The clock is wound", `The gears turn true and steady.\n\nWind it again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(WIND_COINS[level] ?? 6);
    const xp = scaledXP(WIND_XP[level] ?? 5);
    const t = Date.now();
    setLastWind(t);
    await AsyncStorage.setItem(WIND_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `clocktower-wind-${t}`).catch(() => undefined);
    Alert.alert("Clock Wound", `You turn the great crank — the tower's heartbeat steadies over downtown.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="schedule" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="access-time"
          iconColor={ACCENT}
          title="Clock Tower"
          blurb={`Gears and pendulums — the city's heartbeat. ${levelBlurb}`}
          accent="#DED2B4"
        />

        {/* clock-tower scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["clock-tower"]} level={level} cast={cast} pawn={pawn} pawnPose="work" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Wind the Clock"}
          onPrimary={handleWind}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "The grand works — the great wheel, twin pendulums, brass everywhere." : "Bigger gears, the winding crank, and oil at hand."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Wind the clock once an hour. Time, like grace, keeps moving.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Oiling the gears…</Text>}
      </ScrollView>
    </View>
  );
}
