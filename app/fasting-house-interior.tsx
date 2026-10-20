// The Fasting House interior: a quiet room set apart for prayer and
// fasting. Prayer benches, lit candles, and one long table that stays
// bare — nothing is served here. Fasting schedule events bring the hero
// here alone. "Sit in the Quiet" grants a few coins + XP on a 1-hour
// cooldown.
// L1: two benches, a candle stand, the bare table.
// L2: a second row of benches, more candles, a rug.
// L3: a garden window, a third row, candle stands along the wall.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { GentleBob, KneelingFigure, SoftPulse, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import { CandleGame } from "@/components/candle-game";
import { PlayCard, type MiniGameReward } from "@/components/mini-game-scene";
import { MINI_GAME_CAPS, playsLeftToday, recordPlay } from "@/lib/mini-games";

const BG = "#F2F3EC";
const SAGE_DARK = "#565840";
const TEXT_DIM = "#9AA184";
const ACCENT = "#6B7250";

const QUIET_COINS: Record<number, number> = { 1: 25, 2: 50, 3: 100 };
const QUIET_XP: Record<number, number> = { 1: 10, 2: 18, 3: 32 };
const COOLDOWN_MS = 60 * 60 * 1000;
const QUIET_KEY = "prayercircle.interior.fastinghouse.quiet.v1";

/** A single lit candle. The flame is wrapped in SoftPulse by the caller. */
function Candle({ h = 30 }: { h?: number }) {
  return (
    <Svg width={16} height={h + 14} viewBox={`0 0 16 ${h + 14}`}>
      <Ellipse cx={8} cy={h + 11} rx={7} ry={2.6} fill="#000" opacity={0.12} />
      <Rect x={5.4} y={12} width={5.2} height={h} rx={1.6} fill="#F8FAFC" stroke="#D8DCC8" strokeWidth={1} />
      <Path d="M8 1.6 C10 4.6, 10 7.4, 8 9.6 C6 7.4, 6 4.6, 8 1.6 Z" fill="#F59E0B" />
      <Path d="M8 4.4 C9 6.2, 9 7.6, 8 8.8 C7 7.6, 7 6.2, 8 4.4 Z" fill="#FDE68A" />
    </Svg>
  );
}

/** A stand of three candles. */
function CandleStand() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <SoftPulse duration={1700}>
          <Candle h={20} />
        </SoftPulse>
        <SoftPulse duration={2100}>
          <View style={{ marginHorizontal: 2 }}>
            <Candle h={30} />
          </View>
        </SoftPulse>
        <SoftPulse duration={1900}>
          <Candle h={24} />
        </SoftPulse>
      </View>
      <View style={{ width: 52, height: 5, backgroundColor: SAGE_DARK, borderRadius: 2.5, marginTop: 1 }} />
      <View style={{ width: 5, height: 16, backgroundColor: SAGE_DARK }} />
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Candles</Text>
    </View>
  );
}

/** A plain prayer bench. */
function PrayerBench({ label }: { label?: string }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={130} height={44} viewBox="0 0 130 44">
        {/* kneeler */}
        <Rect x={18} y={32} width={94} height={7} rx={3} fill="#8A5A2B" stroke="#5E3D22" strokeWidth={1.6} />
        {/* seat back */}
        <Rect x={14} y={8} width={102} height={10} rx={4} fill="#A9713F" stroke="#5E3D22" strokeWidth={1.8} />
        <Rect x={14} y={21} width={102} height={5} rx={2.4} fill="#A9713F" opacity={0.85} />
        {/* legs */}
        <Rect x={20} y={18} width={6} height={22} fill="#5E3D22" />
        <Rect x={104} y={18} width={6} height={22} fill="#5E3D22" />
      </Svg>
      {label && <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 1 }}>{label}</Text>}
    </View>
  );
}

/** The long table — kept bare on purpose. A cloth, nothing else. */
function BareTable() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={210} height={54} viewBox="0 0 210 54">
        <Rect x={8} y={10} width={194} height={12} rx={4} fill="#B08A5A" stroke="#7A5230" strokeWidth={2} />
        {/* plain cloth runner, empty */}
        <Rect x={60} y={12} width={90} height={8} rx={3} fill="#F1EBD8" opacity={0.9} />
        <Rect x={20} y={22} width={8} height={26} fill="#7A5230" />
        <Rect x={182} y={22} width={8} height={26} fill="#7A5230" />
        <Rect x={14} y={46} width={182} height={4} rx={2} fill="#7A5230" opacity={0.7} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>The table stays bare</Text>
    </View>
  );
}

/** Garden window (L3) — green quiet beyond the glass. */
function GardenWindow() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={120} height={104} viewBox="0 0 120 104">
        <Path d="M14 100 L14 40 A46 34 0 0 1 106 40 L106 100 Z" fill="#DDEBD2" stroke={SAGE_DARK} strokeWidth={3} />
        <Circle cx={88} cy={30} r={10} fill="#FDE68A" opacity={0.9} />
        <Ellipse cx={34} cy={76} rx={20} ry={12} fill="#7FA96B" />
        <Ellipse cx={66} cy={84} rx={26} ry={13} fill="#67955A" />
        <Ellipse cx={94} cy={74} rx={15} ry={10} fill="#7FA96B" />
        <Path d="M44 88 L44 62 M44 70 C40 68, 38 65, 37.6 61 C41 61.6, 43.4 64, 44 70 M44 66 C47.4 64.6, 48.8 62, 49.2 58.4 C46 59, 44 61.6, 44 66" stroke="#3E7C43" strokeWidth={2.4} fill="none" strokeLinecap="round" />
        <Line x1={60} y1={8} x2={60} y2={100} stroke={SAGE_DARK} strokeWidth={2.4} />
        <Line x1={14} y1={58} x2={106} y2={58} stroke={SAGE_DARK} strokeWidth={2.4} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Garden window</Text>
    </View>
  );
}

export default function FastingHouseInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastQuiet, setLastQuiet] = useState(0);
  const [candlePlaysLeft, setCandlePlaysLeft] = useState<number | null>(null);
  const [playingCandle, setPlayingCandle] = useState(false);

  useEffect(() => {
    playsLeftToday("candle").then(setCandlePlaysLeft).catch(() => setCandlePlaysLeft(0));
  }, []);

  const handleCandleComplete = (raw: MiniGameReward): MiniGameReward => {
    const c = scaledCoins(raw.coins);
    const xp = scaledXP(raw.xp);
    if (c > 0) addCoins(c);
    if (xp > 0) awardCustomXP(xp, `minigame-candle-${Date.now()}`).catch(() => undefined);
    recordPlay("candle").then(setCandlePlaysLeft).catch(() => undefined);
    return { coins: c, xp };
  };

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(QUIET_KEY).catch(() => null);
      setLastQuiet(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastQuiet + COOLDOWN_MS - Date.now());
  // A few of the prayed-for kneel here too — quietly, at the benches.
  const kneeling = pickPeople(people, `fastinghouse|${building?.id ?? "house"}|kneel`, level >= 3 ? 4 : 3);

  const levelBlurb =
    level >= 3
      ? "A house of stillness — three rows of benches, candles along the wall, and a garden window."
      : level >= 2
        ? "A quiet house — two rows of benches, more candles, and a worn rug."
        : "A small quiet house — a bench or two, a candle stand, and the bare table.";

  const handleQuiet = async () => {
    if (remaining > 0) {
      Alert.alert("Still quiet here", `The hush is unbroken.\n\nSit again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(QUIET_COINS[level] ?? 25);
    const xp = scaledXP(QUIET_XP[level] ?? 10);
    const t = Date.now();
    setLastQuiet(t);
    await AsyncStorage.setItem(QUIET_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `fastinghouse-quiet-${t}`).catch(() => undefined);
    Alert.alert("In the quiet", `No food, no noise — just the Lord and the stillness. You leave lighter than you came.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="self-improvement" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="spa"
          iconColor={ACCENT}
          title="The Fasting House"
          blurb={`A room set apart — benches, candles, and a table that stays bare. ${levelBlurb}`}
          accent="#E2E5D2"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#E2E5D2",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#FBFCF6" : "#F8F9F2",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="fasting-house" />

          {/* candles + garden window along the wall */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 16 }}>
            <CandleStand />
            {level >= 3 && <GardenWindow />}
            {level >= 2 && <CandleStand />}
          </View>

          {/* the bare table */}
          <View style={{ alignItems: "center", marginTop: 10 }}>
            <BareTable />
          </View>

          {/* benches with the hero and a few lights kneeling */}
          <View style={{ alignItems: "center", marginTop: 8 }}>
            <PrayerBench />
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: -6, minHeight: 64 }}>
              {kneeling[0] && <KneelingFigure person={kneeling[0]} delay={150} />}
              {pawn && (
                <GentleBob delay={420} amount={1.6}>
                  <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                    <SoftPulse duration={2200}>
                      <MaterialIcons name="local-fire-department" size={14} color="#D97706" style={{ marginBottom: 1 }} />
                    </SoftPulse>
                    <PawnPreview pawn={pawn} size={42} />
                    <FigureName name={pawn.name} color={ACCENT} />
                  </View>
                </GentleBob>
              )}
              {kneeling[1] && <KneelingFigure person={kneeling[1]} delay={620} />}
            </View>
          </View>

          {level >= 2 && (
            <View style={{ alignItems: "center", marginTop: 2 }}>
              <PrayerBench />
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: -6, minHeight: 64 }}>
                {kneeling[2] && <KneelingFigure person={kneeling[2]} delay={300} />}
                {level >= 3 && kneeling[3] && <KneelingFigure person={kneeling[3]} delay={800} />}
              </View>
            </View>
          )}

          {/* plain floor with a worn rug (L2+) */}
          <View style={{ height: 26, backgroundColor: "#E4E2D2", marginTop: 8, alignItems: "center", justifyContent: "center" }}>
            <View style={{ height: 3, backgroundColor: "#D5D2BE", position: "absolute", top: 0, left: 0, right: 0 }} />
            {level >= 2 && <View style={{ width: 180, height: 12, borderRadius: 6, backgroundColor: "#B9BFA3", borderWidth: 1, borderColor: "#9AA184" }} />}
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Sit in the Quiet"}
          onPrimary={handleQuiet}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A garden window, a third row of benches, and candles along the wall." : "A second row of benches, more candles, and a worn rug."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Sit in the quiet once an hour. The table stays bare; the heart doesn't.
        </Text>

        <PlayCard
          icon="local-fire-department"
          title="Play: Keep the Candle Lit"
          blurb="A minute of stillness. Distraction motes drift toward the flame — brush them away and keep the light bright."
          playsLeft={candlePlaysLeft}
          cap={MINI_GAME_CAPS.candle}
          accent={ACCENT}
          onPlay={() => setPlayingCandle(true)}
        />
        {playingCandle && (
          <CandleGame accent={ACCENT} onComplete={handleCandleComplete} onExit={() => setPlayingCandle(false)} />
        )}

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Lighting the candles…</Text>}
      </ScrollView>
    </View>
  );
}
