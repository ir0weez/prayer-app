// Music Studio interior: warm wood, glass booths, and tracks being laid down.
// Villagers wear headphones in the booths, play keyboards and guitars, and
// work the mixing console. The pawn records a session alongside them.
// "Record a Session" grants coins + XP on a 1-hour cooldown.
// L1: one recording booth, a keyboard and a guitar on stands.
// L2: a second booth and a mixing console with sliders.
// L3: grand studio — live room with a drum kit, gold record plaques,
// and warm stage lighting.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Line, Path, Rect, G } from "react-native-svg";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { GentleBob, SoftPulse, StandingFigure, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

const BG = "#F2EFF7";
const WOOD = "#8A5A2B";
const WOOD_DARK = "#5E3D22";
const TEXT_DIM = "#97889E";
const ACCENT = "#6D28D9";
const GOLD = "#C9963C";
const RED = "#B91C1C";

const SESSION_COINS: Record<number, number> = { 1: 7, 2: 14, 3: 26 };
const SESSION_XP: Record<number, number> = { 1: 5, 2: 10, 3: 20 };
const COOLDOWN_MS = 60 * 60 * 1000;
const SESSION_KEY = "prayercircle.interior.music-studio.session.v1";

/** A recording booth: glass window, microphone, ON AIR sign. */
function RecordingBooth({ grand = false }: { grand?: boolean }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={104} height={118} viewBox="0 0 104 118">
        {/* booth frame */}
        <Rect x={6} y={10} width={92} height={100} rx={6} fill={WOOD} stroke={WOOD_DARK} strokeWidth={2.5} />
        {/* glass */}
        <Rect x={16} y={26} width={72} height={56} rx={4} fill="#D9EDF5" opacity={0.55} stroke="#9FB3C8" strokeWidth={2} />
        {/* on-air sign */}
        <Rect x={32} y={14} width={40} height={10} rx={3} fill={RED} />
        {/* microphone */}
        <Line x1={52} y1={82} x2={52} y2={56} stroke="#374151" strokeWidth={3} strokeLinecap="round" />
        <Ellipse cx={52} cy={50} rx={6} ry={9} fill="#1F2937" stroke="#4B5563" strokeWidth={1.5} />
        {/* pop filter */}
        <Circle cx={64} cy={54} r={8} fill="none" stroke="#6B7280" strokeWidth={1.5} opacity={0.8} />
        {/* headphones hanging on the wall */}
        <Path d="M26 66 a8 8 0 0 1 16 0" stroke="#1F2937" strokeWidth={2.5} fill="none" />
        <Rect x={24} y={64} width={5} height={9} rx={2} fill="#1F2937" />
        <Rect x={39} y={64} width={5} height={9} rx={2} fill="#1F2937" />
        {/* glass shine + floor shadow */}
        <Line x1={24} y1={34} x2={38} y2={74} stroke="#FFFFFF" strokeWidth={3} opacity={0.5} strokeLinecap="round" />
        <Rect x={16} y={98} width={72} height={6} rx={3} fill={WOOD_DARK} opacity={0.6} />
        {grand && <Circle cx={88} cy={20} r={3.5} fill={GOLD} />}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Recording booth</Text>
    </View>
  );
}

/** A keyboard on a stand. */
function Keyboard() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={96} height={64} viewBox="0 0 96 64">
        <Line x1={24} y1={34} x2={16} y2={58} stroke="#374151" strokeWidth={3} strokeLinecap="round" />
        <Line x1={72} y1={34} x2={80} y2={58} stroke="#374151" strokeWidth={3} strokeLinecap="round" />
        <Rect x={8} y={14} width={80} height={22} rx={4} fill="#1F2937" stroke="#111827" strokeWidth={2} />
        <Rect x={12} y={20} width={72} height={12} rx={2} fill="#F8FAFC" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Rect key={i} x={21 + i * 8} y={20} width={4.5} height={8} fill="#111827" />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <Circle key={i} cx={22 + i * 14} cy={17.5} r={1.8} fill={i % 2 ? "#F59E0B" : RED} />
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Keyboard</Text>
    </View>
  );
}

/** A guitar resting on its stand. */
function Guitar() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={56} height={82} viewBox="0 0 56 82">
        <Line x1={14} y1={76} x2={42} y2={76} stroke="#374151" strokeWidth={3} strokeLinecap="round" />
        <Line x1={28} y1={66} x2={28} y2={76} stroke="#374151" strokeWidth={3} />
        {/* neck */}
        <Rect x={25} y={4} width={6} height={38} rx={2} fill={WOOD_DARK} transform="rotate(18 28 22)" />
        {/* body */}
        <Ellipse cx={26} cy={56} rx={15} ry={17} fill="#B45309" stroke="#7A3606" strokeWidth={2} />
        <Ellipse cx={30} cy={48} rx={10} ry={11} fill="#B45309" stroke="#7A3606" strokeWidth={2} />
        <Circle cx={27} cy={54} r={5.5} fill="#3B2410" />
        <Line x1={30} y1={10} x2={26} y2={50} stroke="#E5E7EB" strokeWidth={1} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Guitar</Text>
    </View>
  );
}

/** The mixing console with sliders and meters (L2+). */
function MixingConsole({ grand = false }: { grand?: boolean }) {
  const channels = grand ? 8 : 6;
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <Svg width={grand ? 240 : 200} height={64} viewBox={`0 0 ${grand ? 240 : 200} 64`}>
        <Rect x={4} y={8} width={(grand ? 240 : 200) - 8} height={48} rx={6} fill="#1F2937" stroke="#111827" strokeWidth={2} />
        {Array.from({ length: channels }).map((_, i) => {
          const x = 22 + i * (((grand ? 240 : 200) - 44) / (channels - 1));
          const knobY = 22 + ((i * 7) % 18);
          return (
            <G key={i}>
              <Line x1={x} y1={18} x2={x} y2={44} stroke="#4B5563" strokeWidth={2.5} />
              <Rect x={x - 4} y={knobY} width={8} height={5} rx={2} fill={i % 3 === 0 ? "#F59E0B" : "#E5E7EB"} />
              <Circle cx={x} cy={51} r={2} fill={i % 2 ? "#34D399" : RED} />
            </G>
          );
        })}
        {/* meter bridge */}
        {[0, 1, 2, 3, 4].map((i) => (
          <Rect key={i} x={14 + i * 7} y={11} width={4} height={3} fill={i < 4 ? "#34D399" : "#F59E0B"} />
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Mixing console</Text>
    </View>
  );
}

/** A drum kit for the grand live room (L3). */
function DrumKit() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={110} height={76} viewBox="0 0 110 76">
        {/* cymbals */}
        <Ellipse cx={18} cy={16} rx={14} ry={3.5} fill={GOLD} stroke="#8A6D1C" strokeWidth={1.5} />
        <Ellipse cx={92} cy={16} rx={14} ry={3.5} fill={GOLD} stroke="#8A6D1C" strokeWidth={1.5} />
        <Line x1={18} y1={18} x2={18} y2={52} stroke="#374151" strokeWidth={2.5} />
        <Line x1={92} y1={18} x2={92} y2={52} stroke="#374151" strokeWidth={2.5} />
        {/* toms */}
        <Ellipse cx={40} cy={30} rx={11} ry={8} fill={ACCENT} stroke="#4C1D95" strokeWidth={2} />
        <Ellipse cx={70} cy={30} rx={11} ry={8} fill={ACCENT} stroke="#4C1D95" strokeWidth={2} />
        {/* kick drum */}
        <Circle cx={55} cy={54} r={17} fill="#7C3AED" stroke="#4C1D95" strokeWidth={2.5} />
        <Circle cx={55} cy={54} r={7} fill="#F5F0E6" />
        {/* snare */}
        <Ellipse cx={24} cy={48} rx={10} ry={6} fill="#E5E7EB" stroke="#6B7280" strokeWidth={2} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Drum kit</Text>
    </View>
  );
}

/** Gold record plaques on the wall (L3). */
function GoldRecords() {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 10 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ alignItems: "center", marginHorizontal: 10 }}>
          <Svg width={52} height={66} viewBox="0 0 52 66">
            <Rect x={3} y={3} width={46} height={60} rx={4} fill="#3B2F1E" stroke={GOLD} strokeWidth={2} />
            <Circle cx={26} cy={28} r={16} fill={GOLD} stroke="#8A6D1C" strokeWidth={2} />
            <Circle cx={26} cy={28} r={6} fill="#3B2F1E" />
            <Circle cx={26} cy={28} r={2} fill={GOLD} />
            <Rect x={14} y={50} width={24} height={5} rx={2} fill={GOLD} opacity={0.85} />
          </Svg>
        </View>
      ))}
    </View>
  );
}

export default function MusicStudioInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastSession, setLastSession] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(SESSION_KEY).catch(() => null);
      setLastSession(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastSession + COOLDOWN_MS - Date.now());
  const performers = pickPeople(people, `musicstudio|${building?.id ?? "music-studio"}|perform`, 4);
  const engineer = pickPeople(people, `musicstudio|${building?.id ?? "music-studio"}|engineer`, 1)[0];

  const levelBlurb =
    level >= 3
      ? "A grand studio — a live room with a drum kit, gold records on the wall, and warm stage light."
      : level >= 2
        ? "A working studio — two booths, a mixing console, and instruments everywhere."
        : "A humble studio — one booth, a keyboard, and a guitar ready to play.";

  const handleSession = async () => {
    if (remaining > 0) {
      Alert.alert("The tape is full", `The last session is still being mixed.\n\nRecord again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(SESSION_COINS[level] ?? 7);
    const xp = scaledXP(SESSION_XP[level] ?? 5);
    const t = Date.now();
    setLastSession(t);
    await AsyncStorage.setItem(SESSION_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `musicstudio-session-${t}`).catch(() => undefined);
    Alert.alert("Session Recorded", `Headphones on, red light glowing — the take is the one.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="album" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="music-note"
          iconColor={ACCENT}
          title="Music Studio"
          blurb={`Warm wood, glass booths, and songs taking shape. ${levelBlurb}`}
          accent="#E2D9F2"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#E2D9F2",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#F7F2E9" : "#F4F1F8",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="music-studio" />

          {level >= 3 && <GoldRecords />}

          {/* booths */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            <RecordingBooth grand={level >= 3} />
            {level >= 2 && <RecordingBooth />}
          </View>

          {/* performers: villagers with headphones, singing and playing */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 6, minHeight: 84 }}>
            {performers[0] && (
              <GentleBob delay={150}>
                <StandingFigure person={performers[0]} delay={150} icon="headphones" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {pawn && (
              <GentleBob delay={400}>
                <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="mic" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#6D28D9" />
                </View>
              </GentleBob>
            )}
            {performers[1] && (
              <GentleBob delay={650}>
                <StandingFigure person={performers[1]} delay={650} icon="headphones" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {level >= 3 && performers[2] && (
              <GentleBob delay={900}>
                <StandingFigure person={performers[2]} delay={900} icon="music-note" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
          </View>

          {level >= 2 && <MixingConsole grand={level >= 3} />}
          {level >= 2 && engineer && (
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 2 }}>
              <StandingFigure person={engineer} delay={500} icon="tune" iconColor={ACCENT} showLabel />
            </View>
          )}

          {/* instruments */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 10 }}>
            <Keyboard />
            <Guitar />
            {level >= 3 && <DrumKit />}
          </View>

          {/* warm wood floor */}
          <View style={{ height: 26, backgroundColor: WOOD, marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: WOOD_DARK }} />
            <View style={{ flexDirection: "row", marginTop: 6, marginHorizontal: 24 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={{ flex: 1, height: 8, backgroundColor: i % 2 ? "#7A5230" : WOOD, borderWidth: 0.5, borderColor: WOOD_DARK }} />
              ))}
            </View>
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Record a Session"}
          onPrimary={handleSession}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand studio — live room, drum kit, and gold records on the wall." : "A second booth and a mixing console with sliders."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Record a session once an hour. Every song starts with one take.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Warming up the tubes…</Text>}
      </ScrollView>
    </View>
  );
}
