// Arcade interior: a fun neon arcade — game cabinets with glowing screens,
// a prize counter, villagers playing. L1: two cabinets, plain. L2: four
// cabinets, neon signs, a prize shelf. L3: the ultimate game palace — ten
// glowing cabinets, a "GAME PALACE" marquee, neon pillars, a claw machine, a
// trophy case, a plush prize counter, a disco ball, and a pulsing neon floor.
// "Play a Game" costs 2 coins,
// grants 10 XP, 30-minute cooldown. No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { formatCoins } from "@/lib/hometown";
import { Alert, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import { pickPeople } from "@/components/activity-figures";
import { PaperRoomScene, type PaperCastEntry } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";

const BG = "#14101F"; // deep arcade dark
const CARD = "#1F1933";
const NEON_PINK = "#F472B6";
const NEON_CYAN = "#22D3EE";
const NEON_PURPLE = "#A78BFA";
const NEON_GREEN = "#4ADE80";
const TEXT = "#EDE9FE";
const TEXT_DIM = "#A79BC9";

const PLAY_KEY = "prayercircle.interior.arcade.play.v1";
const PLAY_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const PLAY_COST = 2; // coins
const PLAY_XP = 10;

export default function ArcadeInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastPlay, setLastPlay] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PLAY_KEY);
        setLastPlay(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
  }, []);

  const remaining = Math.max(0, lastPlay + PLAY_COOLDOWN_MS - Date.now());
  const players = pickPeople(people, `arcade|${building?.id ?? "arc"}`, level >= 3 ? 6 : level >= 2 ? 3 : 2);
  const cast: PaperCastEntry[] = players.map((person) => ({ person, pose: "stand" as const }));

  const levelBlurb =
    level >= 3
      ? "The ultimate game palace — glowing cabinets, prize cases, and neon everywhere."
      : level >= 2
        ? "A growing arcade — neon glow, lit cabinets, and prizes on display."
        : "A couple of cabinets humming in the dark.";

  const handlePlay = async () => {
    if (remaining > 0) {
      Alert.alert("Catch Your Breath", `The high scores can wait.\n\nPlay again in about ${formatCooldown(remaining)}.`);
      return;
    }
    if (coins.balance < PLAY_COST) {
      Alert.alert("Not enough coins", `A game costs ${formatCoins(PLAY_COST)} coins. You have ${formatCoins(coins.balance)}.`);
      return;
    }
    const t = Date.now();
    setLastPlay(t);
    addCoins(-PLAY_COST);
    await AsyncStorage.setItem(PLAY_KEY, String(t)).catch(() => undefined);
    await awardCustomXP(PLAY_XP, `arcade-play-${t}`).catch(() => undefined);
    Alert.alert("High Score", `You played a great round — the villagers cheer.\n\n+${PLAY_XP} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="games" iconColor={NEON_PURPLE} title={buildingName} coins={coins} bg={BG} textColor={TEXT} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="sports-esports"
          iconColor={NEON_PINK}
          title="Game On"
          blurb={`Play a game for 2 coins — worth +${PLAY_XP} XP. ${levelBlurb}`}
          accent="#3B2F5E"
        />

        {/* arcade scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["arcade"]} level={level} cast={cast} pawn={pawn} pawnPose="stand" width={sceneWidth} labelColor={PAPER_ROOMS["arcade"].pale} />
        </View>
        {players.length === 0 && !pawn && (
          <Text style={{ color: TEXT_DIM, fontSize: 12, fontStyle: "italic", textAlign: "center", marginTop: 8, paddingHorizontal: 16 }}>
            The cabinets hum, waiting for players.
          </Text>
        )}

        <InteriorActions
          primaryLabel={remaining > 0 ? `Next game in ${formatCooldown(remaining)}` : "Play a Game"}
          onPrimary={handlePlay}
          primaryColor={NEON_PINK}
          level={level}
          onUpgrade={() => handleUpgrade("More cabinets, brighter neon, better prizes.")}
        />

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Powering on…</Text>}
      </ScrollView>
    </View>
  );
}
