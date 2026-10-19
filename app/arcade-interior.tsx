// Arcade interior: a fun neon arcade — game cabinets with glowing screens,
// a prize counter, villagers playing. L1: two cabinets, plain. L2: four
// cabinets, neon signs, a prize shelf. L3: six cabinets, a prize counter with
// plush toys, a disco ball, and neon floor trim. "Play a Game" costs 2 coins,
// grants 10 XP, 30-minute cooldown. No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, G, Rect } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
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
  GentleBob,
  SoftPulse,
  StandingFigure,
  pickPeople,
  FigureName,
} from "@/components/activity-figures";

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

const CABINET_SCREENS = [NEON_CYAN, NEON_PINK, NEON_GREEN, NEON_PURPLE];

/** A game cabinet with a glowing animated screen. */
function Cabinet({ screenColor, delay = 0 }: { screenColor: string; delay?: number }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 5 }}>
      <Svg width={54} height={88} viewBox="0 0 54 88">
        {/* cabinet body */}
        <Rect x={5} y={2} width={44} height={84} rx={7} fill="#1F2A44" />
        <Rect x={5} y={2} width={44} height={84} rx={7} fill="none" stroke={screenColor} strokeWidth={1.6} opacity={0.7} />
        {/* marquee */}
        <Rect x={10} y={6} width={34} height={5} rx={2.5} fill={screenColor} />
        {/* control deck */}
        <Rect x={8} y={42} width={38} height={11} rx={4} fill="#31415F" />
        <Circle cx={20} cy={47.5} r={3.4} fill="#EF4444" />
        <Circle cx={30} cy={47.5} r={3.4} fill="#FACC15" />
        <Rect x={24} y={40} width={3} height={9} rx={1.5} fill="#0B1020" />
        {/* coin slot */}
        <Rect x={22} y={58} width={10} height={16} rx={3} fill="#0B1020" />
        <Rect x={25} y={61} width={4} height={4} rx={1} fill={screenColor} />
      </Svg>
      {/* glowing screen overlay */}
      <View style={{ position: "absolute", top: 14, width: 32, height: 26 }}>
        <SoftPulse duration={1100 + delay}>
          <Svg width={32} height={26} viewBox="0 0 32 26">
            <Rect x={0} y={0} width={32} height={26} rx={3} fill={screenColor} />
            {/* pixel action on screen */}
            <Rect x={13} y={5} width={6} height={5} fill="#0B1020" />
            <Rect x={10} y={8} width={12} height={3} fill="#0B1020" />
            <Rect x={5} y={16} width={4} height={4} fill="#0B1020" />
            <Rect x={23} y={16} width={4} height={4} fill="#0B1020" />
            <Rect x={14} y={20} width={4} height={3} fill="#0B1020" />
          </Svg>
        </SoftPulse>
      </View>
    </View>
  );
}

/** A neon wall sign. */
function NeonSign({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 10 }}>
      <View style={{ borderWidth: 2, borderColor: color, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
        <SoftPulse duration={1500}>
          <Text style={{ color, fontWeight: "900", fontSize: 13, letterSpacing: 1 }}>{label}</Text>
        </SoftPulse>
      </View>
    </View>
  );
}

/** A prize shelf with little trophies (L2). */
function PrizeShelf() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={86} height={64} viewBox="0 0 86 64">
        <Rect x={2} y={6} width={82} height={52} rx={5} fill="#241C40" stroke={NEON_PURPLE} strokeWidth={1.5} />
        <Rect x={6} y={30} width={74} height={4} fill="#3B2F5E" />
        {[14, 36, 58].map((x) => (
          <Circle key={`top-${x}`} cx={x + 6} cy={18} r={8} fill="#FACC15" stroke="#B45309" strokeWidth={2} />
        ))}
        <Rect x={14} y={40} width={12} height={12} rx={2} fill={NEON_CYAN} />
        <Rect x={36} y={40} width={12} height={12} rx={2} fill={NEON_PINK} />
        <Rect x={58} y={40} width={12} height={12} rx={2} fill={NEON_GREEN} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Prizes</Text>
    </View>
  );
}

/** A prize counter with plush toys (L3). */
function PrizeCounter() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={130} height={72} viewBox="0 0 130 72">
        <Rect x={4} y={34} width={122} height={36} rx={6} fill="#2A2145" stroke={NEON_PINK} strokeWidth={1.5} />
        <Rect x={4} y={34} width={122} height={12} rx={6} fill="#3B2F5E" />
        {/* plush shelf behind counter */}
        <Rect x={14} y={4} width={102} height={4} fill="#3B2F5E" />
        {[
          { x: 24, c: "#F472B6" }, { x: 44, c: "#22D3EE" }, { x: 64, c: "#A78BFA" }, { x: 84, c: "#4ADE80" }, { x: 104, c: "#FACC15" },
        ].map(({ x, c }) => (
          <G key={x}>
            <Circle cx={x} cy={22} r={9} fill={c} />
            <Circle cx={x - 3.5} cy={20} r={2.5} fill="#0B1020" />
            <Circle cx={x + 3.5} cy={20} r={2.5} fill="#0B1020" />
          </G>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Prize counter</Text>
    </View>
  );
}

/** A disco ball with soft sparkle (L3). */
function DiscoBall() {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 2.5, height: 30, backgroundColor: "#5B5378" }} />
      <GentleBob amount={1.5}>
        <SoftPulse duration={1300}>
          <Svg width={44} height={44} viewBox="0 0 44 44">
            <Circle cx={22} cy={22} r={20} fill="#C4B5FD" />
            <Circle cx={22} cy={22} r={20} fill="none" stroke="#8B7BD8" strokeWidth={1.5} />
            {[8, 18, 28].map((y) =>
              [12, 22, 32].map((x) => (
                <Rect key={`${x}-${y}`} x={x - 4} y={y - 4} width={8} height={8} fill="#EDE9FE" opacity={0.85} />
              ))
            )}
            <Circle cx={15} cy={12} r={3.5} fill="#FFFFFF" opacity={0.9} />
          </Svg>
        </SoftPulse>
      </GentleBob>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Disco</Text>
    </View>
  );
}

export default function ArcadeInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
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
  const players = pickPeople(people, `arcade|${building?.id ?? "arc"}`, level >= 3 ? 4 : level >= 2 ? 3 : 2);
  const cabinetCount = level >= 3 ? 6 : level >= 2 ? 4 : 2;

  const levelBlurb =
    level >= 3
      ? "The full arcade — six cabinets, a prize counter, and a disco ball."
      : level >= 2
        ? "A growing arcade — neon signs, four cabinets, a prize shelf."
        : "A couple of cabinets humming in the dark.";

  const handlePlay = async () => {
    if (remaining > 0) {
      Alert.alert("Catch Your Breath", `The high scores can wait.\n\nPlay again in about ${formatCooldown(remaining)}.`);
      return;
    }
    if (coins.balance < PLAY_COST) {
      Alert.alert("Not enough coins", `A game costs ${PLAY_COST.toFixed(2)} coins. You have ${coins.balance.toFixed(2)}.`);
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

        {/* arcade scene — richer with level */}
        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#3B2F5E", overflow: "hidden", backgroundColor: CARD }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} />
          {level >= 3 && (
            <View style={{ alignItems: "center", paddingTop: 8 }}>
              <DiscoBall />
            </View>
          )}
          {level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "center", paddingTop: 12 }}>
              <NeonSign label="ARCADE" color={NEON_PINK} />
              <NeonSign label="HIGH SCORE" color={NEON_CYAN} />
              {level >= 3 && <NeonSign label="WINNER" color={NEON_GREEN} />}
            </View>
          )}

          {/* cabinets */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-end", paddingTop: 14, paddingHorizontal: 8 }}>
            {Array.from({ length: cabinetCount }).map((_, i) => (
              <Cabinet key={i} screenColor={CABINET_SCREENS[i % CABINET_SCREENS.length]} delay={i * 160} />
            ))}
          </View>

          {/* players at the cabinets */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-end", marginTop: 2, paddingBottom: 4 }}>
            {players.map((p, i) => (
              <StandingFigure key={p.id} person={p} delay={i * 200} icon="sports-esports" iconColor={NEON_CYAN} showLabel />
            ))}
            {players.length === 0 && !pawn && (
              <Text style={{ color: TEXT_DIM, fontSize: 12, fontStyle: "italic", marginVertical: 8 }}>
                The cabinets hum, waiting for players.
              </Text>
            )}
          </View>

          {/* prize shelf / counter */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, paddingBottom: 6 }}>
            {level >= 2 && (level >= 3 ? <PrizeCounter /> : <PrizeShelf />)}
            {pawn && (
              <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                <FigureName name={pawn.name} color={NEON_CYAN} />
                <PawnPreview pawn={pawn} size={52} />
                <Text style={{ fontSize: 9, color: TEXT_DIM }}>Player one</Text>
              </View>
            )}
          </View>

          {/* neon floor trim */}
          <View style={{ height: 26, backgroundColor: "#171226" }}>
            <View style={{ height: 4, backgroundColor: level >= 3 ? NEON_PINK : level >= 2 ? NEON_CYAN : "#3B2F5E" }} />
            {level >= 3 && (
              <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 6 }}>
                {[NEON_CYAN, NEON_PINK, NEON_GREEN].map((c) => (
                  <SoftPulse key={c} duration={1200}>
                    <View style={{ width: 26, height: 5, borderRadius: 2.5, backgroundColor: c }} />
                  </SoftPulse>
                ))}
              </View>
            )}
          </View>
        </View>

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
