// Wayside Inn interior: a warm lodging house. Villagers rest in cozy rooms,
// one naps by the fireplace, and the pawn greets guests at the welcome desk.
// "Welcome Guests" grants coins + XP on a 1-hour cooldown.
// L1: hearth, two rooms, plain desk. L2: three rooms, rug, wall sconces.
// L3: grand lobby, chandelier, balcony rail, twin hearths.
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

const BG = "#FBF3E1";
const WOOD = "#8A5A2B";
const WOOD_DARK = "#5E3D22";
const TEXT = "#4A3421";
const TEXT_DIM = "#9A7B55";
const ACCENT = "#B45309";

const GREET_COINS: Record<number, number> = { 1: 50, 2: 100, 3: 180 };
const GREET_XP: Record<number, number> = { 1: 4, 2: 8, 3: 14 };
const COOLDOWN_MS = 60 * 60 * 1000;
const GREET_KEY = "prayercircle.interior.inn.greet.v1";

export default function InnInteriorScreen() {
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
  const resting = pickPeople(people, `inn|${building?.id ?? "inn"}|rest`, 3);
  const byFire = pickPeople(people, `inn|${building?.id ?? "inn"}|fire`, 1)[0];

  const cast: PaperCastEntry[] = [
    ...resting.map((person) => ({ person, pose: "seated" as const })),
    ...(byFire ? [{ person: byFire, pose: "seated" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "A grand inn — rows of quilted beds, lantern light, and a long rug down the lobby."
      : level >= 2
        ? "A comfortable inn — warm rooms and a rug on the floor."
        : "A humble inn — clean beds and a warm welcome for weary travelers.";

  const handleGreet = async () => {
    if (remaining > 0) {
      Alert.alert("Guests are settled", `Everyone is resting comfortably.\n\nWelcome new guests in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(GREET_COINS[level] ?? 5);
    const xp = scaledXP(GREET_XP[level] ?? 4);
    const t = Date.now();
    setLastGreet(t);
    await AsyncStorage.setItem(GREET_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `inn-greet-${t}`).catch(() => undefined);
    Alert.alert("Guests Welcomed", `You greet the travelers warmly and show them to their rooms.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="hotel" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="bed"
          iconColor={ACCENT}
          title="Wayside Inn"
          blurb={`A warm rest for weary travelers. ${levelBlurb}`}
          accent="#F0DDB8"
        />

        {/* inn scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["inn"]} level={level} cast={cast} pawn={pawn} pawnPose="stand" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Welcome Guests"}
          onPrimary={handleGreet}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "Twin hearths, a grand lobby with a chandelier, and a balcony rail." : "More rooms, wall sconces, and a warm rug by the fire."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Welcome guests once an hour. Warmer rooms draw more travelers.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Lighting the hearth…</Text>}
      </ScrollView>
    </View>
  );
}
