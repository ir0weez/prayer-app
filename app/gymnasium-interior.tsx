// Gymnasium interior (School Campus): a school gym that grows with level —
// L1 a court and one hoop, L2 bleachers and a ball rack, L3 a second hoop,
// a scoreboard, and championship banners. "Open Gym Session" grants coins +
// XP on a 1-hour cooldown. While the Gymnasium stands, the Training Reps
// forest buff strengthens to +20% attack & defense until midnight
// (lib/school-perks.ts, applied in the Dark Forest stats refresh).
// No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import { scaledCoins, scaledXP,
  formatCoins,
} from "@/lib/hometown";
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import { pickPeople } from "@/components/activity-figures";
import { PaperRoomScene } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";

import { TrainingGame } from "@/components/training-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";
import { grantTrainingBonus } from "@/lib/mini-games";
import { loadSchoolPerks, type SchoolPerks } from "@/lib/school-perks";

const BG = "#FFF7ED";
const WOOD = "#C08A4E";
const ACCENT = "#C2410C";
const ACCENT_DARK = "#7C2D12";
const TEXT_DIM = "#A8876B";

const SESSION_KEY = "prayercircle.interior.gymnasium.session.v1";
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const ACTION_COINS: Record<1 | 2 | 3, number> = { 1: 10, 2: 18, 3: 32 };
const ACTION_XP: Record<1 | 2 | 3, number> = { 1: 8, 2: 14, 3: 24 };

export default function GymnasiumInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastAction, setLastAction] = useState(0);
  const [schoolPerks, setSchoolPerks] = useState<SchoolPerks | null>(null);

  // Training Reps, hosted here in the Gymnasium — shared host
  // (components/mini-game-host.ts): the same daily cap and payout
  // pipeline as the town Gym. Finishing grants the forest training buff;
  // its strength (+20% while this Gymnasium stands) is read from the
  // campus perks where the forest stats are computed.
  const training = useMiniGameHost("training", addCoins, {
    onGranted: () => {
      grantTrainingBonus().catch(() => undefined);
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        setLastAction(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
    loadSchoolPerks().then(setSchoolPerks).catch(() => undefined);
  }, []);

  const remaining = Math.max(0, lastAction + COOLDOWN_MS - Date.now());
  const actionCoins = scaledCoins(ACTION_COINS[level]);
  const actionXp = scaledXP(ACTION_XP[level]);
  const players = pickPeople(people, `gymnasium|${building?.id ?? "gym"}|players`, level >= 3 ? 4 : 3);

  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const levelBlurb =
    level >= 3
      ? "A full gym — racks of gear, heavy beams, and room to run."
      : level >= 2
        ? "Gear racks line the wall — pickup games draw a crowd now."
        : "A polished court and room to move.";

  const handleAction = async () => {
    if (remaining > 0) {
      Alert.alert("Court's Booked", `Another group has the court.\n\nRun the next open gym in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastAction(t);
    await AsyncStorage.setItem(SESSION_KEY, String(t)).catch(() => undefined);
    addCoins(actionCoins);
    await awardCustomXP(actionXp, `gymnasium-session-${t}`).catch(() => undefined);
    Alert.alert("Open Gym", `Shirts versus skins, winners stay on — an hour of running does a body good.\n\n+${formatCoins(actionCoins)} coins, +${actionXp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="sports-basketball" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="sports-basketball"
          iconColor={ACCENT}
          title="Open Gym"
          blurb={`Run an open gym session — worth +${formatCoins(actionCoins)} coins, +${actionXp} XP. ${levelBlurb}`}
          accent="#FED7AA"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["gymnasium"]} level={level} cast={players.map((person) => ({ person, pose: "work" as const }))} pawn={pawn} pawnPose="work" width={sceneWidth} />
        </View>

                <InteriorActions
          primaryLabel={remaining > 0 ? `Open gym in ${formatCooldown(remaining)}` : "Open Gym Session"}
          onPrimary={handleAction}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade(level + 1 >= 3 ? "A second hoop, a scoreboard, and championship banners." : "Bleachers and a ball rack for pickup games.")}
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          While the Gymnasium stands, Training Reps strengthens the Hero +20% instead of +10% in the Dark Forest, until midnight.
        </Text>

        <PlayCard
          icon="timer"
          title="Play: Training Reps"
          blurb={`Stop the sweeping marker in the green — gold is perfect. Twelve reps, and finishing sharpens the Hero in the Dark Forest (+${schoolPerks?.gymnasiumBuilt ? "20" : "10"}% attack & defense until midnight${schoolPerks?.gymnasiumBuilt ? ", thanks to this Gymnasium" : ""}).`}
          playsLeft={training.playsLeft}
          cap={training.cap}
          accent={ACCENT}
          onPlay={() => training.setPlaying(true)}
        />
        {training.playing && (
          <TrainingGame accent={ACCENT} onComplete={training.handleComplete} onExit={() => training.setPlaying(false)} />
        )}

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Sweeping the court…</Text>}
      </ScrollView>
    </View>
  );
}
