// Carpenter's Workshop interior: the smell of sawdust and fresh-cut pine.
// Villagers saw and hammer at workbenches, planks and finished furniture
// stack the walls, and the pawn helps build.
// "Help Build" grants coins + XP on a 1-hour cooldown.
// L1: one bench, hand tools. L2: two benches, log rack, hanging lamp.
// L3: grand timber hall, three benches, tool wall, skylight.
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
import { BeamGame } from "@/components/beam-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";

const BG = "#F5EBD7";
const TEXT_DIM = "#9A7B55";
const ACCENT = "#92400E";

const BUILD_COINS: Record<number, number> = { 1: 50, 2: 100, 3: 180 };
const BUILD_XP: Record<number, number> = { 1: 4, 2: 8, 3: 14 };
const COOLDOWN_MS = 60 * 60 * 1000;
const BUILD_KEY = "prayercircle.interior.carpenter.build.v1";

export default function CarpenterInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const beam = useMiniGameHost("beam", addCoins);
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastBuild, setLastBuild] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(BUILD_KEY).catch(() => null);
      setLastBuild(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastBuild + COOLDOWN_MS - Date.now());
  const sawing = pickPeople(people, `carpenter|${building?.id ?? "carpenter"}|saw`, 2);
  const hammering = pickPeople(people, `carpenter|${building?.id ?? "carpenter"}|hammer`, 1)[0];
  const browsing = pickPeople(people, `carpenter|${building?.id ?? "carpenter"}|browse`, 1)[0];

  const cast = [
    ...sawing.map((person) => ({ person, pose: "work" as const })),
    ...(hammering ? [{ person: hammering, pose: "work" as const }] : []),
    ...(browsing ? [{ person: browsing, pose: "stand" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "A grand timber hall — three benches under heavy beams, and sawdust in the warm light."
      : level >= 2
        ? "A busy workshop — two benches and warm light overhead."
        : "A humble workshop — one bench, hand tools, and the smell of fresh pine.";

  const handleBuild = async () => {
    if (remaining > 0) {
      Alert.alert("The glue is drying", `The villagers are finishing the current piece.\n\nHelp build again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(BUILD_COINS[level] ?? 5);
    const xp = scaledXP(BUILD_XP[level] ?? 4);
    const t = Date.now();
    setLastBuild(t);
    await AsyncStorage.setItem(BUILD_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `carpenter-build-${t}`).catch(() => undefined);
    Alert.alert("Well Built", `You plane a board true and help raise a sturdy chair.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="handyman" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="carpenter"
          iconColor={ACCENT}
          title="Carpenter's Workshop"
          blurb={`Saws and hammers ring through the shop. ${levelBlurb}`}
          accent="#EAD3A8"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["carpenter"]} level={level} cast={cast} pawn={pawn} pawnPose="work" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Help Build"}
          onPrimary={handleBuild}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand timber hall — three benches under heavy beams." : "A second bench and more room to work."
            )
          }
        />
        <PlayCard
          icon="handyman"
          title="Play: True the Beam"
          blurb="A marker sweeps the beam — stop it in the chalk band to set it true."
          playsLeft={beam.playsLeft}
          cap={beam.cap}
          accent={ACCENT}
          onPlay={() => beam.setPlaying(true)}
        />
        {beam.playing && <BeamGame accent={ACCENT} onComplete={beam.handleComplete} onExit={() => beam.setPlaying(false)} />}
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Help build once an hour. Finer tools mean finer furniture.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Sweeping the sawdust…</Text>}
      </ScrollView>
    </View>
  );
}
