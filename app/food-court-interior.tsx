// Food court interior: food stalls with different cuisines and shared
// tables. Villagers line up at the stalls and sit down to eat together;
// the pawn shares a meal at a table. "Share a Meal" costs 3 coins, grants
// 12 XP, on a 1-hour cooldown.
// L1: 2 stalls, few tables. L2: 3 stalls, more tables, plants.
// L3: a gourmet food hall — six cuisines with a kitchen crew, a glass dessert
// case, a grand centerpiece planter, glowing pendant lights, string lights,
// a fountain drink station, and warm checker floors with gold trim.
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
import { scaledXP,
  formatCoins,
} from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";

const BG = "#FBF6EC";
const TEXT = "#3A2E1E";
const TEXT_DIM = "#96805F";
const ACCENT = "#D35400";
const ACCENT_DARK = "#A04000";
const TEAL = "#0E7C86";

const MEAL_COST = 3;
const MEAL_XP = 12;
const COOLDOWN_MS = 60 * 60 * 1000;
const MEAL_KEY = "prayercircle.interior.foodcourt.meal.v1";

export default function FoodCourtInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastMeal, setLastMeal] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(MEAL_KEY).catch(() => null);
      setLastMeal(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastMeal + COOLDOWN_MS - Date.now());
  const diners = pickPeople(people, `food|${building?.id ?? "food"}|dine`, level >= 3 ? 8 : 6);
  const inLine = pickPeople(people, `food|${building?.id ?? "food"}|line`, level >= 3 ? 3 : 2);

  const cast: PaperCastEntry[] = [
    ...diners.map((person) => ({ person, pose: "seated" as const })),
    ...inLine.map((person) => ({ person, pose: "stand" as const })),
  ];

  const levelBlurb =
    level >= 3
      ? "A gourmet food hall — six cuisines, a kitchen crew, lantern light, and drinks all around."
      : level >= 2
        ? "A bustling court — three stalls, plenty of tables, and plants."
        : "A simple court — two stalls and a couple of shared tables.";

  const handleMeal = async () => {
    if (remaining > 0) {
      Alert.alert("Still full", `Everyone's enjoying their meal.\n\nCome back in about ${formatCooldown(remaining)}.`);
      return;
    }
    if (coins.balance < MEAL_COST) {
      Alert.alert("Not enough coins", `A shared meal costs ${formatCoins(MEAL_COST)} coins. You have ${formatCoins(coins.balance)}.`);
      return;
    }
    const xp = scaledXP(MEAL_XP);
    const t = Date.now();
    setLastMeal(t);
    await AsyncStorage.setItem(MEAL_KEY, String(t)).catch(() => undefined);
    addCoins(-MEAL_COST);
    awardCustomXP(xp, `food-meal-${t}`).catch(() => undefined);
    Alert.alert("Shared Meal", `You buy a round of food and eat together with the villagers.\n\n-${formatCoins(MEAL_COST)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="fastfood" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="restaurant"
          iconColor={ACCENT}
          title="Food Court"
          blurb={`Hungry shoppers gather here. ${levelBlurb}`}
          accent="#F5D6B8"
        />

        {/* food-court scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["food-court"]} level={level} cast={cast} pawn={pawn} pawnPose="seated" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Share a Meal (3 coins)"}
          onPrimary={handleMeal}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "Six cuisines, a kitchen crew, a dessert case, glowing pendants, and warm checker floors." : "Three stalls, more tables, and greenery."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Sharing a meal costs 3 coins and grants 12 XP, once an hour.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Setting the tables…</Text>}
      </ScrollView>
    </View>
  );
}
