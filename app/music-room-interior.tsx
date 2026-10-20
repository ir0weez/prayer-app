// Music Room interior (School Campus): a choir room that grows with level —
// L1 a piano and a music stand, L2 drums and guitars join, L3 risers full of
// singers, a banner, and speakers. "Lead a Rehearsal" grants coins + XP on a
// 1-hour cooldown, in the ministry-building pattern. While the Music Room
// stands, Rhythm of Worship payouts grow +25% (lib/school-perks.ts).
// No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from "react-native-svg";
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
  StandingFigure,
  pickPeople,
  FigureName,
} from "@/components/activity-figures";

const BG = "#F5F0FA";
const WOOD = "#8B5E34";
const WOOD_DARK = "#5E3D22";
const ACCENT = "#7C3AED";
const ACCENT_DARK = "#5B21B6";
const TEXT_DIM = "#8A7CA8";

const REHEARSAL_KEY = "prayercircle.interior.musicroom.rehearsal.v1";
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const ACTION_COINS: Record<1 | 2 | 3, number> = { 1: 12, 2: 22, 3: 38 };
const ACTION_XP: Record<1 | 2 | 3, number> = { 1: 8, 2: 14, 3: 24 };

/** An upright piano. */
function Piano() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={86} height={74} viewBox="0 0 86 74">
        <Rect x={4} y={4} width={78} height={52} rx={5} fill="#2E2A26" />
        <Rect x={4} y={4} width={78} height={10} rx={5} fill="#4A4238" />
        <Rect x={12} y={40} width={62} height={12} rx={2} fill="#F8FAFC" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Rect key={i} x={17 + i * 8} y={40} width={4} height={7} fill="#1C1917" />
        ))}
        <Rect x={14} y={56} width={6} height={14} fill="#2E2A26" />
        <Rect x={66} y={56} width={6} height={14} fill="#2E2A26" />
        {/* sheet music */}
        <Rect x={30} y={14} width={26} height={18} rx={2} fill="#FFFDF5" stroke="#D6CDB8" strokeWidth={1} />
        <Line x1={35} y1={20} x2={51} y2={20} stroke="#8A7CA8" strokeWidth={1.4} />
        <Line x1={35} y1={25} x2={51} y2={25} stroke="#8A7CA8" strokeWidth={1.4} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Piano</Text>
    </View>
  );
}

/** A drum kit (L2+). */
function Drums() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={76} height={62} viewBox="0 0 76 62">
        <Ellipse cx={38} cy={40} rx={17} ry={15} fill="#B45309" />
        <Ellipse cx={38} cy={40} rx={11} ry={9.5} fill="#FDE68A" />
        <Circle cx={16} cy={22} r={9} fill="#E7E5E4" stroke="#A8A29E" strokeWidth={2} />
        <Circle cx={60} cy={22} r={9} fill="#E7E5E4" stroke="#A8A29E" strokeWidth={2} />
        <Ellipse cx={38} cy={8} rx={14} ry={3.4} fill="#FACC15" stroke="#B45309" strokeWidth={1.4} />
        <Line x1={24} y1={14} x2={32} y2={26} stroke={WOOD_DARK} strokeWidth={2.4} />
        <Line x1={54} y1={12} x2={45} y2={26} stroke={WOOD_DARK} strokeWidth={2.4} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Drums</Text>
    </View>
  );
}

/** A guitar on a stand (L2+). */
function Guitar() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={44} height={72} viewBox="0 0 44 72">
        <Rect x={20} y={2} width={5} height={26} rx={2} fill={WOOD_DARK} />
        <Rect x={17} y={0} width={11} height={8} rx={2} fill={WOOD_DARK} />
        <Ellipse cx={22} cy={44} rx={15} ry={17} fill="#B0724A" />
        <Ellipse cx={22} cy={38} rx={10} ry={11} fill="#C08A5A" />
        <Circle cx={22} cy={42} r={5.5} fill="#3E2723" />
        <Line x1={10} y1={66} x2={34} y2={66} stroke={WOOD_DARK} strokeWidth={2.4} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Guitar</Text>
    </View>
  );
}

/** Choir risers with singers (L3). */
function Risers() {
  return (
    <Svg width={300} height={26} viewBox="0 0 300 26">
      <Rect x={0} y={16} width={300} height={10} rx={3} fill={WOOD} />
      <Rect x={26} y={6} width={248} height={10} rx={3} fill={WOOD_DARK} />
    </Svg>
  );
}

/** A song banner (L3). */
function SongBanner() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={240} height={44} viewBox="0 0 240 44">
        <Rect x={4} y={4} width={232} height={34} rx={6} fill={ACCENT} />
        <Rect x={10} y={10} width={220} height={22} rx={4} fill="#EDE9FE" />
        {/* a run of notes */}
        {[0, 1, 2, 3, 4].map((i) => (
          <G key={i}>
            <Ellipse cx={52 + i * 36} cy={25} rx={5} ry={3.8} fill={ACCENT_DARK} transform={`rotate(-18 ${52 + i * 36} 25)`} />
            <Line x1={56.5 + i * 36} y1={24} x2={56.5 + i * 36} y2={13} stroke={ACCENT_DARK} strokeWidth={1.8} />
          </G>
        ))}
      </Svg>
    </View>
  );
}

export default function MusicRoomInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastAction, setLastAction] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(REHEARSAL_KEY);
        setLastAction(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
  }, []);

  const remaining = Math.max(0, lastAction + COOLDOWN_MS - Date.now());
  const actionCoins = scaledCoins(ACTION_COINS[level]);
  const actionXp = scaledXP(ACTION_XP[level]);
  const singers = pickPeople(people, `musicroom|${building?.id ?? "music"}|singers`, level >= 3 ? 6 : 3);

  const levelBlurb =
    level >= 3
      ? "A full choir room — risers, a song banner, and speakers humming."
      : level >= 2
        ? "Drums and a guitar have joined the piano — the room is finding its sound."
        : "A piano, a stand, and a fresh song to learn.";

  const handleAction = async () => {
    if (remaining > 0) {
      Alert.alert("Voices Resting", `The choir is taking a break.\n\nLead another rehearsal in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastAction(t);
    await AsyncStorage.setItem(REHEARSAL_KEY, String(t)).catch(() => undefined);
    addCoins(actionCoins);
    await awardCustomXP(actionXp, `musicroom-rehearsal-${t}`).catch(() => undefined);
    Alert.alert("A Good Rehearsal", `You run the new song twice through — by the second pass, the room is singing it like they wrote it.\n\n+${actionCoins.toFixed(2)} coins, +${actionXp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="music-note" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="music-note"
          iconColor={ACCENT}
          title="Rehearsal Room"
          blurb={`Lead a rehearsal — worth +${actionCoins.toFixed(2)} coins, +${actionXp} XP. ${levelBlurb}`}
          accent="#DDD6FE"
        />

        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#DDD6FE", overflow: "hidden", backgroundColor: "#FBFAFF" }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="music-room" />

          {level >= 3 && (
            <View style={{ alignItems: "center", marginTop: 12 }}>
              <SongBanner />
            </View>
          )}

          {/* instruments */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 14, gap: 18 }}>
            {level >= 2 && <Guitar />}
            <Piano />
            {level >= 2 && <Drums />}
          </View>

          {/* the hero at the stand */}
          {pawn && (
            <View style={{ alignItems: "center", marginTop: 8 }}>
              <SoftPulse duration={2100}>
                <FigureName name={pawn.name} color={ACCENT_DARK} />
              </SoftPulse>
              <PawnPreview pawn={pawn} size={48} />
            </View>
          )}

          {/* singers on risers */}
          {singers.length > 0 && (
            <View style={{ alignItems: "center", marginTop: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 10, paddingHorizontal: 12 }}>
                {singers.map((p, i) => (
                  <StandingFigure key={p.id} person={p} delay={i * 220} icon="music-note" iconColor={ACCENT} />
                ))}
              </View>
              {level >= 3 && <Risers />}
            </View>
          )}

          {/* stage floor */}
          <View style={{ height: 24, backgroundColor: "#E4D9C3", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: WOOD }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Rehearsal in ${formatCooldown(remaining)}` : "Lead a Rehearsal"}
          onPrimary={handleAction}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade(level + 1 >= 3 ? "Risers for the whole choir, a song banner, and speakers." : "Drums and a guitar join the piano.")}
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          While the Music Room stands, Rhythm of Worship payouts grow +25%.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Tuning the piano…</Text>}
      </ScrollView>
    </View>
  );
}
