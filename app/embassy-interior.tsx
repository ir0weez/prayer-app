// Embassy interior: flags of many lands. Diplomats gather around the
// great round table, translators lean in, gifts are exchanged, and the
// pawn greets the delegations.
// "Exchange Greetings" grants coins + XP on a 1-hour cooldown.
// L1: round table, two flags. L2: gift display, more flags, balcony.
// L3: grand embassy — great seal, five flags, fountain court, gold trim.
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

const BG = "#EFF1F6";
const TEXT_DIM = "#8A99AD";
const ACCENT = "#1D4ED8";
const GOLD = "#C9963C";

const GREET_COINS: Record<number, number> = { 1: 70, 2: 140, 3: 280 };
const GREET_XP: Record<number, number> = { 1: 5, 2: 10, 3: 20 };
const COOLDOWN_MS = 60 * 60 * 1000;
const GREET_KEY = "prayercircle.interior.embassy.greet.v1";

export default function EmbassyInteriorScreen() {
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
  const delegates = pickPeople(people, `embassy|${building?.id ?? "embassy"}|delegate`, 4);
  const translator = pickPeople(people, `embassy|${building?.id ?? "embassy"}|translate`, 1)[0];
  const cast: PaperCastEntry[] = [
    ...delegates.map((person) => ({ person, pose: "seated" as const })),
    ...(translator ? [{ person: translator, pose: "stand" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "A grand embassy — five flags and tall banners over a long rug."
      : level >= 2
        ? "A fine embassy — three delegations' flags over the hall."
        : "A humble embassy — two flags, a speaker's podium, open doors.";

  const handleGreet = async () => {
    if (remaining > 0) {
      Alert.alert("The delegations rest", `All greetings have been exchanged for now.\n\nGreet again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(GREET_COINS[level] ?? 7);
    const xp = scaledXP(GREET_XP[level] ?? 5);
    const t = Date.now();
    setLastGreet(t);
    await AsyncStorage.setItem(GREET_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `embassy-greet-${t}`).catch(() => undefined);
    Alert.alert("Greetings Exchanged", `You welcome each delegation in turn — "Blessed are the peacemakers."\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="flag" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="handshake"
          iconColor={ACCENT}
          title="Embassy"
          blurb={`Flags of many lands. ${levelBlurb}`}
          accent="#D5E0F0"
        />

        {/* embassy scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["embassy"]} level={level} cast={cast} pawn={pawn} pawnPose="stand" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Exchange Greetings"}
          onPrimary={handleGreet}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand embassy — the great seal, five flags, gifts from every land." : "Three delegations' flags and a display of exchanged gifts."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Exchange greetings once an hour. Blessed are the peacemakers.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Raising the flags…</Text>}
      </ScrollView>
    </View>
  );
}
