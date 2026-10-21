// Grand Hotel interior: an elegant lobby. The pawn greets travelers at the
// check-in desk, villagers check in and relax in the lounge.
// "Welcome Guests" grants coins + XP on a 1-hour cooldown.
// No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import { pickPeople } from "@/components/activity-figures";
import { PaperRoomScene, type PaperCastEntry } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";

const BG = "#F6F1E7"; // warm cream walls
const CARD = "#FFFFFF";
const NAVY = "#2B3A55"; // deep navy accents
const NAVY_DARK = "#1E2A40";
const GOLD = "#C9A227"; // brass / gold
const GOLD_LIGHT = "#EAD58A";
const WOOD = "#8B5E34";
const TEXT = "#2E2A24";
const TEXT_DIM = "#8A7E6D";
const COOLDOWN_MS = 60 * 60 * 1000;
const STORAGE_KEY = "prayercircle.interior.hotel.welcome.v1";
const COINS_BY_LEVEL = [80, 150, 280];
const XP_BY_LEVEL = [5, 10, 18];

export default function HotelInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastWelcome, setLastWelcome] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setLastWelcome(Number(raw) || 0);
      } catch {}
    })();
  }, []);

  const remaining = Math.max(0, COOLDOWN_MS - (Date.now() - lastWelcome));
  const guests = pickPeople(people, `hotel|${building?.id ?? "hotel"}`, 3);
  const coinsGain = COINS_BY_LEVEL[level - 1];
  const xpGain = XP_BY_LEVEL[level - 1];

  const cast: PaperCastEntry[] = guests.map((person, i) => ({
    person,
    pose: i === 0 ? ("stand" as const) : ("seated" as const),
  }));

  const levelBlurb =
    level >= 3
      ? "Pure luxury — quilted beds, warm pendant light, and a deep rug in the lobby."
      : level >= 2
        ? "Warm light, soft rugs, and smiling faces."
        : "A simple, tidy lobby ready to grow.";

  const handleWelcome = async () => {
    if (remaining > 0) {
      Alert.alert("All welcomed", `Every guest is settled in.\n\nWelcome the next group in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastWelcome(t);
    await AsyncStorage.setItem(STORAGE_KEY, String(t)).catch(() => undefined);
    addCoins(coinsGain);
    await awardCustomXP(xpGain, `hotel-welcome-${t}`).catch(() => undefined);
    Alert.alert(
      "Welcome Guests",
      `You greet each traveler by name and show them to their room.\n\n+${xpGain} XP  ·  +${coinsGain} coins`
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="hotel" iconColor={GOLD} title={buildingName} coins={coins} bg={BG} textColor={TEXT} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="room-service"
          iconColor={GOLD}
          title="A warm welcome"
          blurb={`Every traveler finds rest here. ${levelBlurb}`}
          accent="#E7DCC3"
        />

        {/* hotel scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["hotel"]} level={level} cast={cast} pawn={pawn} pawnPose="stand" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Next welcome in ${formatCooldown(remaining)}` : "Welcome Guests"}
          onPrimary={handleWelcome}
          primaryColor={NAVY}
          level={level}
          onUpgrade={() => handleUpgrade(level + 1 >= 3 ? "Marble columns, a grand piano, crystal chandeliers, and velvet ropes." : "A grander desk, chandelier, and soft rugs.")}
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Hospitality pays: each welcome brings coins and XP. Refreshes in an hour.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Preparing the lobby…</Text>}
      </ScrollView>
    </View>
  );
}
