// Tailor interior: cut and sewn to measure. Villagers sew at tables, bolts
// of fabric lean against the walls, a fitting room stands in the corner,
// and the pawn helps stitch a seam.
// "Help Sew" grants coins + XP on a 1-hour cooldown.
// L1: one sewing table, fabric shelf. L2: two tables, fitting room, rug.
// L3: grand atelier — three tables, mannequins, chandelier, gold trim.
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
import { NeedleGame } from "@/components/needle-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";

const BG = "#F6F0F8";
const TEXT_DIM = "#A08BB5";
const ACCENT = "#7C3AED";

const SEW_COINS: Record<number, number> = { 1: 40, 2: 90, 3: 160 };
const SEW_XP: Record<number, number> = { 1: 3, 2: 6, 3: 12 };
const COOLDOWN_MS = 60 * 60 * 1000;
const SEW_KEY = "prayercircle.interior.tailor.sew.v1";





export default function TailorInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const needle = useMiniGameHost("needle", addCoins);
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastSew, setLastSew] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(SEW_KEY).catch(() => null);
      setLastSew(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastSew + COOLDOWN_MS - Date.now());
  const sewing = pickPeople(people, `tailor|${building?.id ?? "tailor"}|sew`, 3);
  const fitting = pickPeople(people, `tailor|${building?.id ?? "tailor"}|fit`, 1)[0];
  const cast = [
    ...sewing.map((person) => ({ person, pose: "work" as const })),
    ...(fitting ? [{ person: fitting, pose: "stand" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "A grand atelier — three tables, dress forms, and warm light over fine cloth."
      : level >= 2
        ? "A fine shop — two tables and bolts of bright fabric."
        : "A humble shop — one table, sharp scissors, and cloth waiting to be cut.";

  const handleSew = async () => {
    if (remaining > 0) {
      Alert.alert("The seam is pressing", `The villagers are finishing the current garment.\n\nHelp sew again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(SEW_COINS[level] ?? 4);
    const xp = scaledXP(SEW_XP[level] ?? 3);
    const t = Date.now();
    setLastSew(t);
    await AsyncStorage.setItem(SEW_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `tailor-sew-${t}`).catch(() => undefined);
    Alert.alert("A Straight Seam", `You guide the cloth under the needle — the seam runs true.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="content-cut" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="checkroom"
          iconColor={ACCENT}
          title="Tailor"
          blurb={`Clothes cut and sewn to measure. ${levelBlurb}`}
          accent="#E4D7F5"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["tailor"]} level={level} cast={cast} pawn={pawn} pawnPose="work" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Help Sew"}
          onPrimary={handleSew}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand atelier — three tables, dress forms, and warm pendant light." : "A second table and brighter bolts of fabric."
            )
          }
        />
        <PlayCard
          icon="content-cut"
          title="Play: Thread the Needle"
          blurb="The thread swings past the needle's eye — thread it as it crosses."
          playsLeft={needle.playsLeft}
          cap={needle.cap}
          accent={ACCENT}
          onPlay={() => needle.setPlaying(true)}
        />
        {needle.playing && <NeedleGame accent={ACCENT} onComplete={needle.handleComplete} onExit={() => needle.setPlaying(false)} />}
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Help sew once an hour. Every stitch is measured twice.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Threading the needle…</Text>}
      </ScrollView>
    </View>
  );
}
