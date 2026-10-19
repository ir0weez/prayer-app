// Arcade interior: a fun neon arcade — game cabinets with glowing screens,
// a prize counter, villagers playing. L1: two cabinets, plain. L2: four
// cabinets, neon signs, a prize shelf. L3: the ultimate game palace — ten
// glowing cabinets, a "GAME PALACE" marquee, neon pillars, a claw machine, a
// trophy case, a plush prize counter, a disco ball, and a pulsing neon floor.
// "Play a Game" costs 2 coins,
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

/** A twin neon pillar framing the palace — L3 only. */
function NeonPillar({ color, delay = 0 }: { color: string; delay?: number }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 4 }}>
      <SoftPulse duration={1400 + delay}>
        <Svg width={26} height={118} viewBox="0 0 26 118">
          <Rect x={8} y={0} width={10} height={118} rx={5} fill={color} opacity={0.9} />
          <Rect x={11} y={0} width={4} height={118} rx={2} fill="#FFFFFF" opacity={0.65} />
          <Rect x={2} y={110} width={22} height={8} rx={3} fill="#2A2145" stroke={color} strokeWidth={1.5} />
          <Rect x={2} y={0} width={22} height={8} rx={3} fill="#2A2145" stroke={color} strokeWidth={1.5} />
        </Svg>
      </SoftPulse>
    </View>
  );
}

/** The grand "GAME PALACE" marquee with a bulb row — L3 only. */
function MarqueeBanner() {
  return (
    <View style={{ alignItems: "center", paddingTop: 8 }}>
      <View style={{ width: 4, height: 12, backgroundColor: "#5B5378" }} />
      <SoftPulse duration={1600}>
        <View style={{ borderWidth: 3, borderColor: NEON_CYAN, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 7, backgroundColor: "#0B1020" }}>
          <Text style={{ color: NEON_CYAN, fontWeight: "900", fontSize: 17, letterSpacing: 4 }}>GAME PALACE</Text>
        </View>
      </SoftPulse>
      {/* chasing bulb row */}
      <View style={{ flexDirection: "row", marginTop: 6 }}>
        {[NEON_PINK, NEON_CYAN, NEON_GREEN, NEON_PURPLE, NEON_PINK, NEON_CYAN, NEON_GREEN].map((c, i) => (
          <SoftPulse key={i} duration={900 + i * 130}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c, marginHorizontal: 4 }} />
          </SoftPulse>
        ))}
      </View>
    </View>
  );
}

/** A claw machine stuffed with prizes — L3 only. */
function ClawMachine() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={88} height={100} viewBox="0 0 88 100">
        {/* glass box */}
        <Rect x={4} y={4} width={80} height={66} rx={8} fill="#1F2A44" stroke={NEON_CYAN} strokeWidth={2} />
        <Rect x={12} y={12} width={64} height={50} rx={5} fill="#0B1020" opacity={0.92} />
        {/* prizes */}
        {[
          { x: 26, y: 46, c: NEON_PINK }, { x: 44, y: 42, c: NEON_GREEN }, { x: 62, y: 46, c: NEON_PURPLE },
          { x: 35, y: 55, c: NEON_CYAN }, { x: 53, y: 55, c: "#FACC15" },
        ].map(({ x, y, c }, i) => (
          <G key={i}>
            <Circle cx={x} cy={y} r={7} fill={c} />
            <Circle cx={x - 2.5} cy={y - 2} r={1.8} fill="#0B1020" />
            <Circle cx={x + 2.5} cy={y - 2} r={1.8} fill="#0B1020" />
          </G>
        ))}
        {/* claw */}
        <Rect x={42} y={14} width={4} height={14} fill="#9CA3B8" />
        <Rect x={36} y={26} width={16} height={4} rx={2} fill="#9CA3B8" />
        <Rect x={34} y={28} width={4} height={10} rx={2} fill="#9CA3B8" transform="rotate(18 36 30)" />
        <Rect x={50} y={28} width={4} height={10} rx={2} fill="#9CA3B8" transform="rotate(-18 52 30)" />
        {/* base */}
        <Rect x={4} y={70} width={80} height={28} rx={6} fill="#2A2145" stroke={NEON_CYAN} strokeWidth={1.5} />
        <Rect x={34} y={78} width={20} height={8} rx={4} fill={NEON_CYAN} />
        <Circle cx={28} cy={82} r={4} fill="#EF4444" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Claw machine</Text>
    </View>
  );
}

/** The winner's trophy case — L3 only. */
function TrophyCase() {
  return (
    <View style={{ alignItems: "center" }}>
      <SoftPulse duration={2000}>
        <Svg width={100} height={72} viewBox="0 0 100 72">
          <Rect x={2} y={0} width={96} height={64} rx={6} fill="#1F2A44" stroke={NEON_GREEN} strokeWidth={2} />
          <Rect x={8} y={5} width={12} height={54} rx={6} fill="#FFFFFF" opacity={0.08} />
          <Rect x={8} y={36} width={84} height={3} fill="#3B2F5E" />
          {[
            { x: 28, s: 1 }, { x: 50, s: 1.25 }, { x: 72, s: 1 },
          ].map(({ x, s }) => (
            <G key={x}>
              <Rect x={x - 6 * s} y={58 - 6 * s} width={12 * s} height={6 * s} rx={2} fill="#B45309" />
              <Rect x={x - 2 * s} y={44 - 6 * s} width={4 * s} height={14 * s} fill="#B45309" />
              <Circle cx={x} cy={38 - 6 * s} r={8 * s} fill="#FACC15" stroke="#B45309" strokeWidth={2} />
            </G>
          ))}
        </Svg>
      </SoftPulse>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Trophy case</Text>
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
  const players = pickPeople(people, `arcade|${building?.id ?? "arc"}`, level >= 3 ? 6 : level >= 2 ? 3 : 2);
  const cabinetCount = level >= 3 ? 10 : level >= 2 ? 4 : 2;

  const levelBlurb =
    level >= 3
      ? "The ultimate game palace — ten glowing cabinets, a claw machine, a trophy case, and neon everywhere."
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
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="arcade" />
          {level >= 3 && (
            <View style={{ alignItems: "center", paddingTop: 8 }}>
              <DiscoBall />
            </View>
          )}
          {level >= 3 ? (
            <MarqueeBanner />
          ) : (
            level >= 2 && (
              <View style={{ flexDirection: "row", justifyContent: "center", paddingTop: 12 }}>
                <NeonSign label="ARCADE" color={NEON_PINK} />
                <NeonSign label="HIGH SCORE" color={NEON_CYAN} />
              </View>
            )
          )}

          {/* cabinets — flanked by glowing neon pillars at L3 */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", paddingTop: 12, paddingHorizontal: 6 }}>
            {level >= 3 && <NeonPillar color={NEON_CYAN} />}
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-end", flex: 1 }}>
              {Array.from({ length: cabinetCount }).map((_, i) => (
                <Cabinet key={i} screenColor={CABINET_SCREENS[i % CABINET_SCREENS.length]} delay={i * 160} />
              ))}
            </View>
            {level >= 3 && <NeonPillar color={NEON_PINK} delay={350} />}
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

          {/* prize shelf / counter / L3 prize row */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, paddingBottom: 6 }}>
            {level >= 2 && (level >= 3 ? <PrizeCounter /> : <PrizeShelf />)}
            {level >= 3 && (
              <>
                <View style={{ width: 10 }} />
                <ClawMachine />
                <View style={{ width: 10 }} />
                <TrophyCase />
              </>
            )}
            {pawn && (
              <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                <FigureName name={pawn.name} color={NEON_CYAN} />
                <PawnPreview pawn={pawn} size={52} />
                <Text style={{ fontSize: 9, color: TEXT_DIM }}>Player one</Text>
              </View>
            )}
          </View>

          {/* neon floor trim — a pulsing dance floor at L3 */}
          <View style={{ height: level >= 3 ? 50 : 26, backgroundColor: "#171226" }}>
            <View style={{ height: 4, backgroundColor: level >= 3 ? NEON_PINK : level >= 2 ? NEON_CYAN : "#3B2F5E" }} />
            {level >= 3 && (
              <>
                <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 8 }}>
                  {[NEON_CYAN, NEON_PINK, NEON_GREEN, NEON_PURPLE].map((c, i) => (
                    <SoftPulse key={c} duration={1000 + i * 160}>
                      <View style={{ width: 34, height: 8, borderRadius: 4, backgroundColor: c, marginHorizontal: 5 }} />
                    </SoftPulse>
                  ))}
                </View>
                <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 5 }}>
                  {[NEON_GREEN, NEON_PURPLE, NEON_CYAN, NEON_PINK].map((c, i) => (
                    <SoftPulse key={`${c}-${i}`} duration={1250 + i * 180}>
                      <View style={{ width: 24, height: 5, borderRadius: 2.5, backgroundColor: c, marginHorizontal: 6, opacity: 0.75 }} />
                    </SoftPulse>
                  ))}
                </View>
              </>
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
