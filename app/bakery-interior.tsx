// Bakery interior: brick ovens with glowing fire, bread racks, and a wooden
// counter. L1: one oven and a plain counter. L2: two ovens, bread racks, and
// hanging lamps. L3: three ovens, a pastry case, chandelier, and tiled floor.
// A baker villager works the ovens while shoppers browse; "Help Bake" grants
// coins + XP on a 1-hour cooldown. No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { awardCustomXP } from "@/lib/xp-engine";
import { scaledCoins, scaledXP,
  formatCoins,
} from "@/lib/hometown";
import { formatCooldown } from "@/lib/gathering-places";
import { pickPeople } from "@/components/activity-figures";
import { PaperRoomScene, type PaperCastEntry } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";

const BG = "#F7F1E8";
const CARD_BG = "#FFFDF9";
const WALL = "#F3E4D3";
const BRICK = "#A84E32";
const BRICK_DARK = "#7C3A24";
const WOOD = "#8B5E34";
const WOOD_DARK = "#5E3D22";
const GOLD = "#D97706";
const TEXT_DIM = "#8A7360";
const BAKE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const BAKE_KEY = "prayercircle.interior.bakery.bake.v1";
const BAKE_COINS: Record<number, number> = { 1: 40, 2: 80, 3: 140 };
const BAKE_XP: Record<number, number> = { 1: 3, 2: 6, 3: 10 };

export default function BakeryInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastBake, setLastBake] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(BAKE_KEY)
      .then((raw) => setLastBake(raw ? parseInt(raw, 10) || 0 : 0))
      .catch(() => undefined);
  }, []);

  const remaining = Math.max(0, lastBake + BAKE_COOLDOWN_MS - Date.now());
  const baker = pickPeople(people, `bakery-baker|${building?.id ?? "bakery"}`, 1)[0];
  const shoppers = pickPeople(people, `bakery-shoppers|${building?.id ?? "bakery"}`, 3);

  const cast: PaperCastEntry[] = [
    ...(baker ? [{ person: baker, pose: "work" as const }] : []),
    ...shoppers.map((person) => ({ person, pose: "stand" as const })),
  ];

  const levelBlurb =
    level >= 3
      ? "A grand artisan patisserie — three brass-trimmed ovens, golden sconces, and lamplight over the counter."
      : level >= 2
        ? "A cozy bakery — two brick ovens and hanging lamps."
        : "A humble bakery — one brick oven and the smell of fresh bread.";

  const handleBake = async () => {
    if (remaining > 0) {
      Alert.alert("Ovens are resting", `The next batch will be ready in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastBake(t);
    await AsyncStorage.setItem(BAKE_KEY, String(t)).catch(() => undefined);
    const c = scaledCoins(BAKE_COINS[level] ?? 4);
    const xp = scaledXP(BAKE_XP[level] ?? 3);
    addCoins(c);
    awardCustomXP(xp, `bakery-bake-${t}`).catch(() => undefined);
    Alert.alert("Fresh from the oven", `You help shape the loaves and pull them golden from the oven.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="bakery" />
      <InteriorHeader icon="bakery-dining" iconColor={GOLD} title={buildingName} coins={coins} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner icon="cake" iconColor={GOLD} title={buildingName} blurb={levelBlurb} accent="#D9C4A5" />

        {/* bakery scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["bakery"]} level={level} cast={cast} pawn={pawn} pawnPose="seated" width={sceneWidth} />
        </View>
        {!baker && !pawn && (
          <Text style={{ color: TEXT_DIM, fontSize: 12, fontStyle: "italic", textAlign: "center", marginTop: 8, paddingHorizontal: 16 }}>
            The bakery is quiet today.
          </Text>
        )}

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Help Bake"}
          onPrimary={handleBake}
          primaryColor={GOLD}
          level={level}
          onUpgrade={() =>
            handleUpgrade(level >= 2 ? "Celebration cakes, a chalkboard menu, golden sconces, and a crystal chandelier." : "A second oven, bread racks, and hanging lamps.")
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Help with the baking once an hour for fresh coins and XP.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Warming up the ovens…</Text>}
      </ScrollView>
    </View>
  );
}
