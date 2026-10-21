// Coffee Roastery interior: copper, burlap, and the smell of fresh roast.
// Villagers sip at the tasting counter while the roaster turns, bean sacks
// lean by the wall, and the day's roast goes up on the chalkboard. The pawn
// tastes the roast alongside them.
// "Taste the Roast" grants coins + XP on a 1-hour cooldown.
// L1: a roaster machine with a chimney, bean sacks, a small tasting counter.
// L2: a bigger roaster, shelves of bean bags, a chalkboard menu.
// L3: grand roastery — a copper roaster centerpiece, a long communal table,
// string lights, and a pastries case.
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

const BG = "#F6F0E8";
const WOOD = "#8A5A2B";
const WOOD_DARK = "#5E3D22";
const TEXT_DIM = "#A08B78";
const ACCENT = "#6F4E37";
const COPPER = "#B87333";
const COPPER_DARK = "#8A5225";
const BURLAP = "#C8A876";

const TASTING_COINS: Record<number, number> = { 1: 70, 2: 140, 3: 260 };
const TASTING_XP: Record<number, number> = { 1: 5, 2: 10, 3: 20 };
const COOLDOWN_MS = 60 * 60 * 1000;
const TASTING_KEY = "prayercircle.interior.coffee-roastery.tasting.v1";

export default function CoffeeRoasteryInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastTasting, setLastTasting] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(TASTING_KEY).catch(() => null);
      setLastTasting(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastTasting + COOLDOWN_MS - Date.now());
  const sippers = pickPeople(people, `coffeeroastery|${building?.id ?? "coffee-roastery"}|sip`, 4);
  const roasterHand = pickPeople(people, `coffeeroastery|${building?.id ?? "coffee-roastery"}|roast`, 1)[0];

  const cast: PaperCastEntry[] = [
    ...sippers.map((person) => ({ person, pose: "stand" as const })),
    ...(roasterHand ? [{ person: roasterHand, pose: "work" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "A grand roastery — the copper roaster at its heart, warm pendant light, and pastries in the case."
      : level >= 2
        ? "A growing roastery — a bigger roaster and a full tasting case."
        : "A humble roastery — one roaster and a small tasting case.";

  const handleTasting = async () => {
    if (remaining > 0) {
      Alert.alert("The next batch is roasting", `First crack takes a little while.\n\nTaste the roast again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(TASTING_COINS[level] ?? 7);
    const xp = scaledXP(TASTING_XP[level] ?? 5);
    const t = Date.now();
    setLastTasting(t);
    await AsyncStorage.setItem(TASTING_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `coffeeroastery-tasting-${t}`).catch(() => undefined);
    Alert.alert("Roast Tasted", `Dark, warm, a little sweet at the finish — the roaster nods, pleased.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="coffee" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="local-cafe"
          iconColor={ACCENT}
          title="Coffee Roastery"
          blurb={`The roaster hums and the tasting counter is warm. ${levelBlurb}`}
          accent="#E7D8C8"
        />

        {/* coffee-roastery scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["coffee-roastery"]} level={level} cast={cast} pawn={pawn} pawnPose="stand" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Taste the Roast"}
          onPrimary={handleTasting}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand roastery — copper roaster, long communal table, and string lights." : "A bigger roaster, shelves of bean bags, and a chalkboard menu."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Taste the roast once an hour. Good coffee takes its time.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Firing up the roaster…</Text>}
      </ScrollView>
    </View>
  );
}
