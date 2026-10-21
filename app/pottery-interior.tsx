// Pottery Studio interior: cool clay, warm kiln. Villagers shape vessels at
// the wheels, the kiln glows in the corner, and finished pots line the
// shelves. The pawn throws a pot of their own.
// "Throw a Pot" grants coins + XP on a 1-hour cooldown.
// L1: one wheel, small kiln. L2: two wheels, bigger kiln, drying rack.
// L3: grand studio — three wheels, tall kiln, gallery wall of fine ware.
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
import { PaperRoomScene } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP,
  formatCoins,
} from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { ClayGame } from "@/components/clay-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";

const BG = "#F3EDE2";
const TEXT_DIM = "#A08B6B";
const ACCENT = "#9C4A1A";

const THROW_COINS: Record<number, number> = { 1: 40, 2: 80, 3: 160 };
const THROW_XP: Record<number, number> = { 1: 3, 2: 6, 3: 12 };
const COOLDOWN_MS = 60 * 60 * 1000;
const THROW_KEY = "prayercircle.interior.pottery.throw.v1";





export default function PotteryInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const clay = useMiniGameHost("clay", addCoins);
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastThrow, setLastThrow] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(THROW_KEY).catch(() => null);
      setLastThrow(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastThrow + COOLDOWN_MS - Date.now());
  const throwing = pickPeople(people, `pottery|${building?.id ?? "pottery"}|throw`, 3);
  const glazing = pickPeople(people, `pottery|${building?.id ?? "pottery"}|glaze`, 1)[0];
  const cast = [
    ...throwing.map((person) => ({ person, pose: "work" as const })),
    ...(glazing ? [{ person: glazing, pose: "stand" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "A grand studio — three wheels turning and shelves of fine ware."
      : level >= 2
        ? "A thriving studio — two wheels and pots lining the shelves."
        : "A humble studio — one wheel and clay ready to shape.";

  const handleThrow = async () => {
    if (remaining > 0) {
      Alert.alert("The clay is resting", `Fresh pots are drying on the rack.\n\nThrow another pot in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(THROW_COINS[level] ?? 4);
    const xp = scaledXP(THROW_XP[level] ?? 3);
    const t = Date.now();
    setLastThrow(t);
    await AsyncStorage.setItem(THROW_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `pottery-throw-${t}`).catch(() => undefined);
    Alert.alert("A Fine Vessel", `Your hands steady the spinning clay — a beautiful pot rises.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="gesture" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="circle"
          iconColor={ACCENT}
          title="Pottery Studio"
          blurb={`Clay turns to beauty on the wheel. ${levelBlurb}`}
          accent="#EBD3B4"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["pottery"]} level={level} cast={cast} pawn={pawn} pawnPose="work" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Throw a Pot"}
          onPrimary={handleThrow}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "Three wheels and shelves of fine ware." : "A second wheel and shelves for drying ware."
            )
          }
        />
        <PlayCard
          icon="filter-vintage"
          title="Play: Center the Clay"
          blurb="The clay keeps drifting off-center on the wheel — nudge it back and keep it true."
          playsLeft={clay.playsLeft}
          cap={clay.cap}
          accent={ACCENT}
          onPlay={() => clay.setPlaying(true)}
        />
        {clay.playing && <ClayGame accent={ACCENT} onComplete={clay.handleComplete} onExit={() => clay.setPlaying(false)} />}
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Throw a pot once an hour. Patience shapes the finest vessels.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Warming the kiln…</Text>}
      </ScrollView>
    </View>
  );
}
