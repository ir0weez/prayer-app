// The Gym interior: mats, a dumbbell rack, and room to move. Workout
// schedule events send the hero here to train. Villagers work out
// alongside — lifting, stretching, spotting one another.
// "Work Out" grants coins + XP on a 1-hour cooldown.
// L1: two mats and a small rack.
// L2: a weight bench, a bigger rack, kettlebells.
// L3: a trophy shelf, a punching bag, and a small court with lines.
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
import { TrainingGame } from "@/components/training-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";
import { grantTrainingBonus } from "@/lib/mini-games";
import { loadSchoolPerks, type SchoolPerks } from "@/lib/school-perks";

const BG = "#F5F1EE";
const TEXT_DIM = "#A08B7D";
const ACCENT = "#B3402A";

const TRAIN_COINS: Record<number, number> = { 1: 40, 2: 80, 3: 160 };
const TRAIN_XP: Record<number, number> = { 1: 5, 2: 10, 3: 18 };
const COOLDOWN_MS = 60 * 60 * 1000;
const TRAIN_KEY = "prayercircle.interior.gym.workout.v1";

export default function GymInteriorScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastTrain, setLastTrain] = useState(0);
  const [schoolPerks, setSchoolPerks] = useState<SchoolPerks | null>(null);

  // Training Reps — shared host (components/mini-game-host.ts): the same
  // daily cap and payout pipeline as the campus Gymnasium. A finished
  // session leaves the Hero sharper until midnight (the buff's strength —
  // +20% while the campus Gymnasium stands — is read from the campus
  // perks where the forest stats are computed).
  const trainingGame = useMiniGameHost("training", addCoins, {
    onGranted: () => {
      grantTrainingBonus().catch(() => undefined);
    },
  });

  useEffect(() => {
    // School Campus perk: the campus Gymnasium strengthens the buff to +20%.
    loadSchoolPerks().then(setSchoolPerks).catch(() => undefined);
  }, []);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(TRAIN_KEY).catch(() => null);
      setLastTrain(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastTrain + COOLDOWN_MS - Date.now());
  const training = pickPeople(people, `gym|${building?.id ?? "gym"}|train`, level >= 3 ? 4 : 3);

  const levelBlurb =
    level >= 3
      ? "A real gym — full racks, more machines, and room to train."
      : level >= 2
        ? "A solid gym — a weight bench, and a bigger rack."
        : "A starter gym — two mats and a small rack of dumbbells.";

  const handleTrain = async () => {
    if (remaining > 0) {
      Alert.alert("Catching your breath", `Muscles need their rest too.\n\nTrain again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(TRAIN_COINS[level] ?? 40);
    const xp = scaledXP(TRAIN_XP[level] ?? 5);
    const t = Date.now();
    setLastTrain(t);
    await AsyncStorage.setItem(TRAIN_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `gym-workout-${t}`).catch(() => undefined);
    Alert.alert("Good work", `You put in the work — steady reps, honest sweat. The body keeps the score.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="fitness-center" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="directions-run"
          iconColor={ACCENT}
          title="The Gym"
          blurb={`Mats, iron, and room to move. ${levelBlurb}`}
          accent="#F0DCD2"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene
            config={PAPER_ROOMS["gym"]}
            level={level}
            cast={training.map((person) => ({ person, pose: "work" as const }))}
            pawn={pawn}
            pawnPose="work"
            width={sceneWidth}
          />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Work Out"}
          onPrimary={handleTrain}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A heavy bag, a small court with lines, and a trophy shelf." : "A weight bench, a wider rack, and kettlebells by the wall."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Work out once an hour. Train the body; it carries everything else.
        </Text>

        <PlayCard
          icon="timer"
          title="Play: Training Reps"
          blurb={`Stop the sweeping marker in the green — gold is perfect. Twelve reps, and finishing sharpens the Hero in the Dark Forest (+${schoolPerks?.gymnasiumBuilt ? "20" : "10"}% attack & defense until midnight${schoolPerks?.gymnasiumBuilt ? ", thanks to the campus Gymnasium" : ""}).`}
          playsLeft={trainingGame.playsLeft}
          cap={trainingGame.cap}
          accent={ACCENT}
          onPlay={() => trainingGame.setPlaying(true)}
          gameId="training"
        />
        {trainingGame.playing && (
          <TrainingGame accent={ACCENT} onComplete={trainingGame.handleComplete} onExit={() => trainingGame.setPlaying(false)} />
        )}

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Chalking up…</Text>}
      </ScrollView>
    </View>
  );
}
