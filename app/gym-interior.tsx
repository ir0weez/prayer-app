// The Gym interior: mats, a dumbbell rack, and room to move. Workout
// schedule events send the hero here to train. Villagers work out
// alongside — lifting, stretching, spotting one another.
// "Work Out" grants coins + XP on a 1-hour cooldown.
// L1: two mats and a small rack.
// L2: a weight bench, a bigger rack, kettlebells.
// L3: a trophy shelf, a punching bag, and a small court with lines.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { GentleBob, SoftPulse, StandingFigure, WorkingFigure, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import { TrainingGame } from "@/components/training-game";
import { PlayCard, type MiniGameReward } from "@/components/mini-game-scene";
import { MINI_GAME_CAPS, grantTrainingBonus, playsLeftToday, recordPlay } from "@/lib/mini-games";

const BG = "#F5F1EE";
const BRICK = "#A5553F";
const STEEL = "#374151";
const TEXT_DIM = "#A08B7D";
const ACCENT = "#B3402A";

const TRAIN_COINS: Record<number, number> = { 1: 40, 2: 80, 3: 160 };
const TRAIN_XP: Record<number, number> = { 1: 5, 2: 10, 3: 18 };
const COOLDOWN_MS = 60 * 60 * 1000;
const TRAIN_KEY = "prayercircle.interior.gym.workout.v1";

/** A rack of dumbbells, two shelves. */
function DumbbellRack({ wide = false }: { wide?: boolean }) {
  const pairs = wide ? 4 : 3;
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={pairs * 36 + 12} height={64} viewBox={`0 0 ${pairs * 36 + 12} 64`}>
        <Rect x={3} y={4} width={pairs * 36 + 6} height={56} rx={4} fill="#E7DED6" stroke={STEEL} strokeWidth={2} />
        {[0, 1].map((r) => (
          <G key={r}>
            {Array.from({ length: pairs }).map((_, i) => (
              <G key={i} transform={`translate(${10 + i * 36} ${10 + r * 26}) scale(0.92)`}>
                <Line x1={4} y1={9.5} x2={30} y2={9.5} stroke="#6B7280" strokeWidth={3} strokeLinecap="round" />
                <Rect x={4.5} y={2} width={5.4} height={15} rx={1.8} fill={r ? "#4B5563" : STEEL} />
                <Rect x={24.1} y={2} width={5.4} height={15} rx={1.8} fill={r ? "#4B5563" : STEEL} />
              </G>
            ))}
            <Rect x={6} y={27 + r * 26} width={pairs * 36} height={3} fill={STEEL} opacity={0.6} />
          </G>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Dumbbell rack</Text>
    </View>
  );
}

/** A kettlebell. */
function Kettlebell({ size = 30, color = "#374151" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size * 1.15} viewBox="0 0 26 30">
      <Path d="M6.8 12.8 C6.8 5, 19.2 5, 19.2 12.8" fill="none" stroke={color} strokeWidth={3.4} />
      <Circle cx={13} cy={19.6} r={8.6} fill={color} />
      <Circle cx={10.4} cy={16.8} r={2.3} fill="#9CA3AF" opacity={0.8} />
    </Svg>
  );
}

/** A flat weight bench (L2+). */
function WeightBench() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={120} height={52} viewBox="0 0 120 52">
        <Rect x={10} y={16} width={86} height={9} rx={4} fill={STEEL} />
        <Rect x={16} y={25} width={7} height={20} fill="#6B7280" />
        <Rect x={82} y={25} width={7} height={20} fill="#6B7280" />
        {/* barbell resting on the uprights */}
        <Line x1={6} y1={8} x2={114} y2={8} stroke="#6B7280" strokeWidth={3.4} strokeLinecap="round" />
        <Rect x={12} y={1} width={6} height={15} rx={2} fill={STEEL} />
        <Rect x={102} y={1} width={6} height={15} rx={2} fill={STEEL} />
        <Rect x={26} y={3.4} width={4.6} height={10} rx={1.6} fill={STEEL} opacity={0.85} />
        <Rect x={89.4} y={3.4} width={4.6} height={10} rx={1.6} fill={STEEL} opacity={0.85} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Weight bench</Text>
    </View>
  );
}

/** A trophy shelf (L3) — cups earned the slow way. */
function TrophyShelf() {
  const cup = (x: number, big = false) => (
    <G key={x} transform={`translate(${x} 6) scale(${big ? 1.15 : 0.9})`}>
      <Path d="M3 1 h12 v5 c0 3-2 4.6-6 4.6 S3 9, 3 6 Z" fill="#E9C767" stroke="#8A6D1C" strokeWidth={1.2} />
      <Path d="M3 2.4 C0.8 2.4, 0.2 4.8, 1.6 6.4 M15 2.4 C17.2 2.4, 17.8 4.8, 16.4 6.4" stroke="#8A6D1C" strokeWidth={1.2} fill="none" />
      <Rect x={7.6} y={10.8} width={2.8} height={2.8} fill="#8A6D1C" />
      <Rect x={4.6} y={13.6} width={8.8} height={2.6} fill="#8A6D1C" />
    </G>
  );
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={130} height={40} viewBox="0 0 130 40">
        <Rect x={4} y={2} width={122} height={30} rx={4} fill="#FBF3DF" stroke="#C9963C" strokeWidth={2} />
        {cup(16)}
        {cup(52, true)}
        {cup(90)}
        <Rect x={4} y={30} width={122} height={4} fill="#C9963C" opacity={0.7} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Trophy shelf</Text>
    </View>
  );
}

/** A hanging punching bag (L3). */
function PunchingBag() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={44} height={96} viewBox="0 0 44 96">
        <Line x1={22} y1={0} x2={22} y2={16} stroke={STEEL} strokeWidth={3} />
        <Line x1={22} y1={16} x2={12} y2={26} stroke={STEEL} strokeWidth={2} />
        <Line x1={22} y1={16} x2={32} y2={26} stroke={STEEL} strokeWidth={2} />
        <Rect x={10} y={26} width={24} height={58} rx={11} fill={BRICK} stroke="#71382A" strokeWidth={2} />
        <Rect x={10} y={44} width={24} height={5} fill="#71382A" opacity={0.6} />
        <Rect x={10} y={64} width={24} height={5} fill="#71382A" opacity={0.6} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Heavy bag</Text>
    </View>
  );
}

/** An exercise mat. */
function Mat({ color }: { color: string }) {
  return <View style={{ width: 74, height: 13, borderRadius: 6, backgroundColor: color, borderWidth: 1.4, borderColor: "rgba(0,0,0,0.18)", marginHorizontal: 5 }} />;
}

export default function GymInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastTrain, setLastTrain] = useState(0);
  const [trainingPlaysLeft, setTrainingPlaysLeft] = useState<number | null>(null);
  const [playingTraining, setPlayingTraining] = useState(false);

  useEffect(() => {
    playsLeftToday("training").then(setTrainingPlaysLeft).catch(() => setTrainingPlaysLeft(0));
  }, []);

  const handleTrainingComplete = (raw: MiniGameReward): MiniGameReward => {
    const c = scaledCoins(raw.coins);
    const xp = scaledXP(raw.xp);
    if (c > 0) addCoins(c);
    if (xp > 0) awardCustomXP(xp, `minigame-training-${Date.now()}`).catch(() => undefined);
    // A finished session leaves the Hero sharper until midnight.
    grantTrainingBonus().catch(() => undefined);
    recordPlay("training").then(setTrainingPlaysLeft).catch(() => undefined);
    return { coins: c, xp };
  };

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
      ? "A real gym — a full rack, a heavy bag, a small court, and trophies on the shelf."
      : level >= 2
        ? "A solid gym — a weight bench, a bigger rack, and kettlebells by the wall."
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
    Alert.alert("Good work", `You put in the work — steady reps, honest sweat. The body keeps the score.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
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

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#F0DCD2",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#FCF8F4" : "#FAF5F0",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="gym" />

          {/* equipment wall */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 14 }}>
            <DumbbellRack wide={level >= 2} />
            {level >= 3 && <PunchingBag />}
          </View>
          {level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 4 }}>
              <WeightBench />
              <View style={{ flexDirection: "row", alignItems: "flex-end", marginHorizontal: 6 }}>
                <Kettlebell color="#374151" />
                <View style={{ marginLeft: 4 }}>
                  <Kettlebell size={24} color="#B3402A" />
                </View>
              </View>
              {level >= 3 && <TrophyShelf />}
            </View>
          )}

          {/* training floor — hero and villagers on the mats */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 12, minHeight: 74 }}>
            {training[0] && <WorkingFigure person={training[0]} delay={150} icon="fitness-center" iconColor={ACCENT} />}
            {pawn && (
              <GentleBob delay={400} amount={3}>
                <View style={{ alignItems: "center", marginHorizontal: 6 }}>
                  <SoftPulse duration={1600}>
                    <MaterialIcons name="fitness-center" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color={ACCENT} />
                </View>
              </GentleBob>
            )}
            {training[1] && <StandingFigure person={training[1]} delay={650} icon="sports-gymnastics" iconColor={ACCENT} />}
          </View>
          {(training[2] || training[3]) && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 2, minHeight: 64 }}>
              {training[2] && <StandingFigure person={training[2]} delay={300} icon="self-improvement" iconColor={ACCENT} />}
              {training[3] && <WorkingFigure person={training[3]} delay={850} icon="fitness-center" iconColor={ACCENT} />}
            </View>
          )}

          {/* mats + court floor */}
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "center" }}>
              <Mat color="#3E6B8C" />
              <Mat color="#B3402A" />
              {level >= 2 && <Mat color="#5F7D4F" />}
            </View>
            <View style={{ height: 24, backgroundColor: "#D9C6B4", marginTop: 8 }}>
              <View style={{ height: 3, backgroundColor: "#C4AC93" }} />
              {level >= 3 && (
                <>
                  <View style={{ position: "absolute", left: "18%", right: "18%", top: 10, height: 2.4, backgroundColor: "#F5F1EE" }} />
                  <View style={{ position: "absolute", left: "50%", top: 4, width: 2.4, height: 16, backgroundColor: "#F5F1EE" }} />
                </>
              )}
            </View>
          </View>
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
          blurb="Stop the sweeping marker in the green — gold is perfect. Twelve reps, and finishing sharpens the Hero in the Dark Forest (+10% attack & defense until midnight)."
          playsLeft={trainingPlaysLeft}
          cap={MINI_GAME_CAPS.training}
          accent={ACCENT}
          onPlay={() => setPlayingTraining(true)}
        />
        {playingTraining && (
          <TrainingGame accent={ACCENT} onComplete={handleTrainingComplete} onExit={() => setPlayingTraining(false)} />
        )}

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Chalking up…</Text>}
      </ScrollView>
    </View>
  );
}
