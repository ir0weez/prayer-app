// Gymnasium interior (School Campus): a school gym that grows with level —
// L1 a court and one hoop, L2 bleachers and a ball rack, L3 a second hoop,
// a scoreboard, and championship banners. "Open Gym Session" grants coins +
// XP on a 1-hour cooldown. While the Gymnasium stands, the Training Reps
// forest buff strengthens to +20% attack & defense until midnight
// (lib/school-perks.ts, applied in the Dark Forest stats refresh).
// No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { PawnPreview } from "@/components/pawn-preview";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import {
  SoftPulse,
  WorkingFigure,
  pickPeople,
  FigureName,
} from "@/components/activity-figures";
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

/** A hoop: backboard, rim, net. */
function Hoop({ flip = false }: { flip?: boolean }) {
  return (
    <Svg width={54} height={66} viewBox="0 0 54 66">
      <Rect x={flip ? 34 : 8} y={0} width={5} height={18} fill="#78716C" />
      <Rect x={6} y={16} width={42} height={28} rx={3} fill="#FFFFFF" stroke={ACCENT} strokeWidth={2.4} />
      <Rect x={19} y={26} width={16} height={12} fill="none" stroke={ACCENT} strokeWidth={2} />
      <Rect x={18} y={44} width={18} height={4} rx={2} fill={ACCENT} />
      <Line x1={19} y1={48} x2={23} y2={62} stroke="#D6D3D1" strokeWidth={1.6} />
      <Line x1={35} y1={48} x2={31} y2={62} stroke="#D6D3D1" strokeWidth={1.6} />
      <Line x1={23} y1={62} x2={31} y2={62} stroke="#D6D3D1" strokeWidth={1.6} />
    </Svg>
  );
}

/** The court floor with painted lines. */
function CourtFloor() {
  return (
    <Svg width={320} height={92} viewBox="0 0 320 92">
      <Rect x={0} y={0} width={320} height={92} fill="#E8B06B" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Rect key={i} x={0} y={i * 16 + 6} width={320} height={1.6} fill="#D99E4F" />
      ))}
      <Rect x={6} y={6} width={308} height={80} fill="none" stroke="#FFF7ED" strokeWidth={2.4} />
      <Line x1={160} y1={6} x2={160} y2={86} stroke="#FFF7ED" strokeWidth={2.4} />
      <Circle cx={160} cy={46} r={17} fill="none" stroke="#FFF7ED" strokeWidth={2.4} />
      <Rect x={6} y={26} width={44} height={40} fill="none" stroke="#FFF7ED" strokeWidth={2.2} />
      <Rect x={270} y={26} width={44} height={40} fill="none" stroke="#FFF7ED" strokeWidth={2.2} />
    </Svg>
  );
}

/** Bleachers (L2+). */
function Bleachers() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={150} height={40} viewBox="0 0 150 40">
        {[0, 1, 2].map((r) => (
          <G key={r}>
            <Rect x={6 + r * 10} y={28 - r * 10} width={138 - r * 20} height={6} rx={2} fill={r % 2 ? "#A8A29E" : "#C0BAB2"} />
            <Rect x={6 + r * 10} y={34 - r * 10} width={138 - r * 20} height={4} fill="#78716C" />
          </G>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Bleachers</Text>
    </View>
  );
}

/** A rack of basketballs (L2+). */
function BallRack() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={76} height={44} viewBox="0 0 76 44">
        {[0, 1, 2].map((i) => (
          <G key={i}>
            <Circle cx={14 + i * 24} cy={16} r={11} fill="#EA580C" />
            <Path d={`M${3 + i * 24} 16 H${25 + i * 24}`} stroke="#7C2D12" strokeWidth={1.4} />
            <Path d={`M${14 + i * 24} 5 V27`} stroke="#7C2D12" strokeWidth={1.4} />
          </G>
        ))}
        <Rect x={2} y={30} width={72} height={5} rx={2} fill="#78716C" />
        <Rect x={6} y={35} width={5} height={8} fill="#78716C" />
        <Rect x={65} y={35} width={5} height={8} fill="#78716C" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Ball rack</Text>
    </View>
  );
}

/** A scoreboard (L3). */
function Scoreboard() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={120} height={52} viewBox="0 0 120 52">
        <Rect x={0} y={0} width={120} height={52} rx={6} fill="#1C1917" />
        <Rect x={6} y={6} width={50} height={24} rx={3} fill="#292524" />
        <Rect x={64} y={6} width={50} height={24} rx={3} fill="#292524" />
        <Rect x={14} y={13} width={14} height={10} rx={2} fill="#FBBF24" />
        <Rect x={32} y={13} width={14} height={10} rx={2} fill="#FBBF24" />
        <Rect x={72} y={13} width={14} height={10} rx={2} fill="#F87171" />
        <Rect x={90} y={13} width={14} height={10} rx={2} fill="#F87171" />
        <Rect x={38} y={36} width={44} height={8} rx={2} fill="#44403C" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Scoreboard — HOME ahead, as it should be</Text>
    </View>
  );
}

/** Championship banners (L3). */
function Banners() {
  return (
    <Svg width={300} height={40} viewBox="0 0 300 40">
      <Line x1={0} y1={3} x2={300} y2={3} stroke={WOOD} strokeWidth={2.4} />
      {[40, 110, 180, 250].map((x, i) => (
        <G key={x}>
          <Rect x={x - 16} y={3} width={32} height={30} rx={2} fill={[ACCENT, "#B45309", "#0F766E", "#1D4ED8"][i]} />
          <Rect x={x - 16} y={27} width={32} height={6} fill={[ACCENT, "#B45309", "#0F766E", "#1D4ED8"][i]} transform={`rotate(0 ${x} 30)`} />
          <Circle cx={x} cy={15} r={6} fill="#FDE68A" />
        </G>
      ))}
    </Svg>
  );
}

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

  const levelBlurb =
    level >= 3
      ? "A full gym — two hoops, a lit scoreboard, and banners from seasons of wins."
      : level >= 2
        ? "Bleachers and a ball rack — pickup games draw a crowd now."
        : "A polished court and one good hoop.";

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
    Alert.alert("Open Gym", `Shirts versus skins, winners stay on — an hour of running does a body good.\n\n+${actionCoins.toFixed(2)} coins, +${actionXp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="sports-basketball" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="sports-basketball"
          iconColor={ACCENT}
          title="Open Gym"
          blurb={`Run an open gym session — worth +${actionCoins.toFixed(2)} coins, +${actionXp} XP. ${levelBlurb}`}
          accent="#FED7AA"
        />

        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#FED7AA", overflow: "hidden", backgroundColor: "#FFFBF2" }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="gymnasium" />

          {level >= 3 && (
            <View style={{ alignItems: "center", marginTop: 10 }}>
              <Scoreboard />
              <View style={{ marginTop: 4 }}>
                <Banners />
              </View>
            </View>
          )}

          {/* hoops at both ends */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 26, marginTop: level >= 3 ? 2 : 14 }}>
            <Hoop />
            {level >= 3 && <Hoop flip />}
          </View>

          {/* players on the court */}
          {players.length > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 14, marginTop: 2 }}>
              {players.map((p, i) => (
                <WorkingFigure key={p.id} person={p} delay={i * 240} icon="sports-basketball" iconColor={ACCENT} />
              ))}
            </View>
          )}

          {/* the hero takes a shot */}
          {pawn && (
            <View style={{ alignItems: "center", marginTop: 4 }}>
              <SoftPulse duration={2000}>
                <FigureName name={pawn.name} color={ACCENT_DARK} />
              </SoftPulse>
              <PawnPreview pawn={pawn} size={48} />
            </View>
          )}

          {/* court floor */}
          <View style={{ alignItems: "center", marginTop: 8 }}>
            <CourtFloor />
          </View>

          {level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 18, paddingVertical: 8, backgroundColor: "#F5E8D5" }}>
              <Bleachers />
              <BallRack />
            </View>
          )}
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
