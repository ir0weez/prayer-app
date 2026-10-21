// Department store interior: a grand multi-department store with an
// escalator, department signs, and shoppers. Villagers shop in departments
// and ride the escalator; the pawn greets by the directory.
// "Greet Shoppers" grants coins + XP on a 1-hour cooldown.
// L1: 2 departments, plain. L2: 3 departments, directory sign, plants.
// L3: a true luxury emporium — six departments, a jewelry salon with a glowing
// display case, velvet ropes, marble columns, a grand chandelier, banners,
// and marble underfoot.
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

const BG = "#F4F1EA";
const TEXT = "#2C2A33";
const TEXT_DIM = "#8A8794";
const ACCENT = "#7C3AED";
const ACCENT_DARK = "#5B21B6";
const GOLD = "#C9963C";

const GREET_COINS: Record<number, number> = { 1: 60, 2: 120, 3: 220 };
const GREET_XP: Record<number, number> = { 1: 6, 2: 12, 3: 20 };
const COOLDOWN_MS = 60 * 60 * 1000;
const GREET_KEY = "prayercircle.interior.deptstore.greet.v1";

export default function DepartmentStoreInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastGreet, setLastGreet] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(GREET_KEY).catch(() => null);
      setLastGreet(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastGreet + COOLDOWN_MS - Date.now());
  const shoppers = pickPeople(people, `dept|${building?.id ?? "dept"}|shop`, level >= 3 ? 7 : 5);
  const onEscalator = pickPeople(people, `dept|${building?.id ?? "dept"}|esc`, 2);
  const cast: PaperCastEntry[] = [
    ...shoppers.map((person) => ({ person, pose: "stand" as const })),
    ...onEscalator.map((person) => ({ person, pose: "stand" as const })),
  ];

  const levelBlurb =
    level >= 3
      ? "A true luxury emporium — six departments of full racks under warm pendant light."
      : level >= 2
        ? "A fine department store — three departments, full racks, and greenery."
        : "A modest shop — two departments, but everything's neatly stocked.";

  const handleGreet = async () => {
    if (remaining > 0) {
      Alert.alert("Shoppers are browsing", `Everyone's finding what they need.\n\nCome back in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(GREET_COINS[level] ?? 6);
    const xp = scaledXP(GREET_XP[level] ?? 6);
    const t = Date.now();
    setLastGreet(t);
    await AsyncStorage.setItem(GREET_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `dept-greet-${t}`).catch(() => undefined);
    Alert.alert("Warm Welcome", `You greet every shopper with a smile.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="shopping-bag" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="store"
          iconColor={ACCENT}
          title="Department Store"
          blurb={`Everything under one roof. ${levelBlurb}`}
          accent="#DDD6FE"
        />

        {/* department-store scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["department-store"]} level={level} cast={cast} pawn={pawn} pawnPose="stand" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Greet Shoppers"}
          onPrimary={handleGreet}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "Six departments, a jewelry salon, velvet ropes, marble columns, and marble floors." : "Three departments, a directory sign, and plants."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Greet shoppers once an hour. Bigger stores draw bigger crowds.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the store…</Text>}
      </ScrollView>
    </View>
  );
}
