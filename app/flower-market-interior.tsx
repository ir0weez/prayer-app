// Flower Market interior: stalls of fresh blooms, the city's corner of color.
// Villagers browse the stalls with armfuls of flowers, pass under hanging
// baskets, and wheel the flower cart between the rows. The pawn gathers a
// bouquet alongside them.
// "Gather a Bouquet" grants coins + XP on a 1-hour cooldown.
// L1: two stalls with striped awnings and buckets of colorful flowers.
// L2: more stalls, hanging baskets, and a flower cart.
// L3: festival market — bunting overhead, a fountain planter centerpiece,
// and a flower arch at the gate.
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

const BG = "#FDF6EC";
const WOOD = "#8A5A2B";
const WOOD_DARK = "#5E3D22";
const TEXT_DIM = "#B08D9A";
const ACCENT = "#C2437A";
const LEAF = "#3E8E41";
const GOLD = "#C9963C";

const BOUQUET_COINS: Record<number, number> = { 1: 70, 2: 140, 3: 260 };
const BOUQUET_XP: Record<number, number> = { 1: 5, 2: 10, 3: 20 };
const COOLDOWN_MS = 60 * 60 * 1000;
const BOUQUET_KEY = "prayercircle.interior.flower-market.bouquet.v1";

export default function FlowerMarketInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastBouquet, setLastBouquet] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(BOUQUET_KEY).catch(() => null);
      setLastBouquet(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastBouquet + COOLDOWN_MS - Date.now());
  const browsers = pickPeople(people, `flowermarket|${building?.id ?? "flower-market"}|browse`, 4);
  const florist = pickPeople(people, `flowermarket|${building?.id ?? "flower-market"}|florist`, 1)[0];

  const cast: PaperCastEntry[] = [
    ...browsers.map((person) => ({ person, pose: "stand" as const })),
    ...(florist ? [{ person: florist, pose: "work" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "A festival market — lanterns overhead and blooms on every table."
      : level >= 2
        ? "A bustling market — more plant tables and lantern light overhead."
        : "A small market — two striped stalls and buckets of the day's freshest blooms.";

  const handleBouquet = async () => {
    if (remaining > 0) {
      Alert.alert("The stalls are picked over", `The growers are cutting the next harvest.\n\nGather a bouquet again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(BOUQUET_COINS[level] ?? 7);
    const xp = scaledXP(BOUQUET_XP[level] ?? 5);
    const t = Date.now();
    setLastBouquet(t);
    await AsyncStorage.setItem(BOUQUET_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `flowermarket-bouquet-${t}`).catch(() => undefined);
    Alert.alert("Bouquet Gathered", `Armful of color, wrapped in paper — someone in town is about to smile.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="local-florist" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="storefront"
          iconColor={ACCENT}
          title="Flower Market"
          blurb={`Stalls of fresh blooms — the city's corner of color. ${levelBlurb}`}
          accent="#F6D3E0"
        />

        {/* flower-market scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["flower-market"]} level={level} cast={cast} pawn={pawn} pawnPose="stand" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Gather a Bouquet"}
          onPrimary={handleBouquet}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A festival market — bunting, a fountain planter, and a flower arch." : "More stalls, hanging baskets, and a flower cart."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Gather a bouquet once an hour. Fresh flowers, honestly priced.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the stalls…</Text>}
      </ScrollView>
    </View>
  );
}
