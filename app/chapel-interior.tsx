// Chapel interior: a small peaceful chapel — simpler and more intimate than
// the big church. Wooden pews, a small altar, candles, stained glass.
// L1: two pews, a plain altar. L2: four pews, candles, a banner.
// L3: six pews, stained glass windows, a flower altar, kneelers. Villagers
// kneel in prayer or sit in the pews. "Light a Candle" costs 1 coin, grants
// 6 XP, 1-hour cooldown. No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { formatCoins } from "@/lib/hometown";
import { Alert, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import { pickPeople } from "@/components/activity-figures";
import { PaperRoomScene } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";

import { CandleGame } from "@/components/candle-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";

const BG = "#F7F4EE"; // soft candlelight white
const CARD = "#FFFFFF";
const WOOD = "#7A5A38";
const WOOD_DARK = "#4E3A24";
const ACCENT = "#8B7B4F";
const GOLD = "#D9A441";
const TEXT = "#4A4038";
const TEXT_DIM = "#8A7B68";

const CANDLE_KEY = "prayercircle.interior.chapel.candle.v1";
const CANDLE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const CANDLE_COST = 1; // coin
const CANDLE_XP = 6;

export default function ChapelInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastCandle, setLastCandle] = useState(0);

  // Keep the Candle Lit, hosted here in the Chapel — shared host
  // (components/mini-game-host.ts): the same daily cap and payout
  // pipeline as the town Fasting House.
  const candle = useMiniGameHost("candle", addCoins);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CANDLE_KEY);
        setLastCandle(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
  }, []);

  const remaining = Math.max(0, lastCandle + CANDLE_COOLDOWN_MS - Date.now());
  const pewCount = level >= 3 ? 6 : level >= 2 ? 4 : 2;
  const kneelers = pickPeople(people, `chapel-kneel|${building?.id ?? "chp"}`, 3);
  const sitters = pickPeople(people, `chapel-sit|${building?.id ?? "chp"}`, Math.min(4, pewCount));

  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const cast = [
    ...kneelers.map((person) => ({ person, pose: "kneel" as const })),
    ...sitters.map((person) => ({ person, pose: "seated" as const })),
  ];

  const levelBlurb =
    level >= 3
      ? "A beautiful mini-cathedral — rows of pews, lantern light, and a deep red rug."
      : level >= 2
        ? "A growing chapel — lantern light, and more pews."
        : "A quiet chapel — a couple of pews and a stillness.";

  const handleCandle = async () => {
    if (remaining > 0) {
      Alert.alert("Still Burning", `Your candle is still lit.\n\nLight another in about ${formatCooldown(remaining)}.`);
      return;
    }
    if (coins.balance < CANDLE_COST) {
      Alert.alert("Not enough coins", `Lighting a candle costs ${formatCoins(CANDLE_COST)} coin. You have ${formatCoins(coins.balance)}.`);
      return;
    }
    const t = Date.now();
    setLastCandle(t);
    addCoins(-CANDLE_COST);
    await AsyncStorage.setItem(CANDLE_KEY, String(t)).catch(() => undefined);
    await awardCustomXP(CANDLE_XP, `chapel-candle-${t}`).catch(() => undefined);
    Alert.alert("A Quiet Prayer", `You light a candle and sit in the stillness.\n\n+${CANDLE_XP} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="church" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="church"
          iconColor={ACCENT}
          title="A Quiet Place"
          blurb={`Light a candle for 1 coin — worth +${CANDLE_XP} XP. ${levelBlurb}`}
          accent="#E8DFC8"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["chapel"]} level={level} cast={cast} pawn={pawn} pawnPose="kneel" width={sceneWidth} />
        </View>
        {sitters.length === 0 && !pawn && (
          <Text style={{ color: TEXT_DIM, fontSize: 12, fontStyle: "italic", textAlign: "center", marginTop: 8, marginBottom: 4 }}>
            The chapel waits in quiet.
          </Text>
        )}

                <InteriorActions
          primaryLabel={remaining > 0 ? `Next candle in ${formatCooldown(remaining)}` : "Light a Candle"}
          onPrimary={handleCandle}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade("A rose window, twin stained glass, a dove, and golden candelabras.")}
        />

        {/* gentle verse line */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 12, paddingHorizontal: 32 }}>
          <MaterialIcons name="favorite-border" size={14} color={ACCENT} />
          <Text style={{ color: TEXT_DIM, fontSize: 12, fontStyle: "italic", marginLeft: 6, textAlign: "center" }}>
            Be still, and know.
          </Text>
        </View>

        <PlayCard
          icon="local-fire-department"
          title="Play: Keep the Candle Lit"
          blurb="A minute of stillness. Distraction motes drift toward the flame — brush them away and keep the light bright."
          playsLeft={candle.playsLeft}
          cap={candle.cap}
          accent={ACCENT}
          onPlay={() => candle.setPlaying(true)}
          gameId="candle"
        />
        {candle.playing && (
          <CandleGame accent={ACCENT} onComplete={candle.handleComplete} onExit={() => candle.setPlaying(false)} />
        )}

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Entering quietly…</Text>}
      </ScrollView>
    </View>
  );
}
