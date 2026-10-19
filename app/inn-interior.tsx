// Wayside Inn interior: a warm lodging house. Villagers rest in cozy rooms,
// one naps by the fireplace, and the pawn greets guests at the welcome desk.
// "Welcome Guests" grants coins + XP on a 1-hour cooldown.
// L1: hearth, two rooms, plain desk. L2: three rooms, rug, wall sconces.
// L3: grand lobby, chandelier, balcony rail, twin hearths.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Line, Rect } from "react-native-svg";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { GentleBob, SeatedFigure, SoftPulse, StandingFigure, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

const BG = "#FBF3E1";
const WOOD = "#8A5A2B";
const WOOD_DARK = "#5E3D22";
const TEXT = "#4A3421";
const TEXT_DIM = "#9A7B55";
const ACCENT = "#B45309";

const GREET_COINS: Record<number, number> = { 1: 5, 2: 10, 3: 18 };
const GREET_XP: Record<number, number> = { 1: 4, 2: 8, 3: 14 };
const COOLDOWN_MS = 60 * 60 * 1000;
const GREET_KEY = "prayercircle.interior.inn.greet.v1";

/** A stone hearth with a softly pulsing fire. */
function Hearth({ grand = false }: { grand?: boolean }) {
  const W = grand ? 120 : 96;
  const H = grand ? 100 : 84;
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <View style={{ width: W, height: H }}>
        <Svg width={W} height={H} viewBox="0 0 120 100">
          <Rect x={14} y={40} width={92} height={52} rx={6} fill="#78716C" stroke="#57534E" strokeWidth={2.5} />
          <Rect x={30} y={56} width={60} height={36} rx={4} fill="#1C1917" />
          <Rect x={38} y={84} width={44} height={6} rx={3} fill="#5E3D22" />
          <Rect x={14} y={34} width={92} height={10} rx={4} fill="#A8A29E" stroke="#57534E" strokeWidth={2} />
          {grand && <Rect x={8} y={28} width={104} height={8} rx={4} fill="#C9963C" stroke="#8A6D1C" strokeWidth={1.5} />}
        </Svg>
        <View style={{ position: "absolute", left: W / 2 - 20, top: H * 0.62 }}>
          <SoftPulse duration={1100}>
            <Svg width={40} height={30} viewBox="0 0 40 30">
              <Ellipse cx={20} cy={16} rx={16} ry={13} fill="#F97316" />
              <Ellipse cx={20} cy={20} rx={10} ry={8} fill="#FBBF24" />
              <Ellipse cx={20} cy={23} rx={5} ry={4} fill="#FEF3C7" />
            </Svg>
          </SoftPulse>
        </View>
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Hearth</Text>
    </View>
  );
}

/** A guest bed: frame, mattress, quilt, pillow. */
function GuestBed({ quilt }: { quilt: string }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={110} height={64} viewBox="0 0 110 64">
        <Rect x={8} y={10} width={10} height={44} rx={4} fill={WOOD_DARK} />
        <Rect x={92} y={10} width={10} height={44} rx={4} fill={WOOD_DARK} />
        <Rect x={8} y={30} width={94} height={14} rx={5} fill={WOOD} />
        <Rect x={14} y={24} width={82} height={12} rx={6} fill="#F8FAFC" stroke="#CBD5E1" strokeWidth={1.5} />
        <Rect x={14} y={30} width={82} height={8} rx={4} fill={quilt} opacity={0.9} />
        <Rect x={16} y={18} width={26} height={10} rx={5} fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={1.5} />
        <Line x1={14} y1={48} x2={14} y2={58} stroke={WOOD_DARK} strokeWidth={4} />
        <Line x1={96} y1={48} x2={96} y2={58} stroke={WOOD_DARK} strokeWidth={4} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Guest room</Text>
    </View>
  );
}

/** Welcome desk — plain at L1, brass bell + ledger at L2, grand with gold trim at L3. */
function WelcomeDesk({ level }: { level: number }) {
  return (
    <View style={{ alignItems: "center", marginTop: 10 }}>
      <Svg width={150} height={70} viewBox="0 0 150 70">
        <Rect x={10} y={26} width={130} height={38} rx={5} fill={level >= 3 ? "#9A6B35" : WOOD} stroke={WOOD_DARK} strokeWidth={2.5} />
        {level >= 3 && <Rect x={8} y={22} width={134} height={7} rx={3.5} fill="#C9963C" stroke="#8A6D1C" strokeWidth={1.5} />}
        <Line x1={10} y1={44} x2={140} y2={44} stroke={WOOD_DARK} strokeWidth={1.5} />
        {level >= 2 && (
          <>
            <Circle cx={34} cy={18} r={7} fill="#E8B44C" stroke="#8A6D1C" strokeWidth={1.5} />
            <Rect x={32} y={8} width={4} height={5} rx={2} fill="#8A6D1C" />
            <Rect x={86} y={12} width={40} height={12} rx={2} fill="#F8FAFC" stroke="#94A3B8" strokeWidth={1.5} />
            <Line x1={90} y1={17} x2={122} y2={17} stroke="#94A3B8" strokeWidth={1.5} />
            <Line x1={90} y1={21} x2={116} y2={21} stroke="#94A3B8" strokeWidth={1.5} />
          </>
        )}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Welcome desk</Text>
    </View>
  );
}

export default function InnInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastGreet, setLastGreet] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(GREET_KEY).catch(() => null);
      setLastGreet(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastGreet + COOLDOWN_MS - Date.now());
  const resting = pickPeople(people, `inn|${building?.id ?? "inn"}|rest`, 3);
  const byFire = pickPeople(people, `inn|${building?.id ?? "inn"}|fire`, 1)[0];

  const levelBlurb =
    level >= 3
      ? "A grand inn — twin hearths, a chandelier, and a balcony rail over the lobby."
      : level >= 2
        ? "A comfortable inn — warm rooms, wall sconces, and a rug by the fire."
        : "A humble inn — a crackling hearth and clean beds for weary travelers.";

  const handleGreet = async () => {
    if (remaining > 0) {
      Alert.alert("Guests are settled", `Everyone is resting comfortably.\n\nWelcome new guests in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(GREET_COINS[level] ?? 5);
    const xp = scaledXP(GREET_XP[level] ?? 4);
    const t = Date.now();
    setLastGreet(t);
    await AsyncStorage.setItem(GREET_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `inn-greet-${t}`).catch(() => undefined);
    Alert.alert("Guests Welcomed", `You greet the travelers warmly and show them to their rooms.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="hotel" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="bed"
          iconColor={ACCENT}
          title="Wayside Inn"
          blurb={`A warm rest for weary travelers. ${levelBlurb}`}
          accent="#F0DDB8"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#F0DDB8",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#FDF6E6" : "#F9EFDB",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="inn" />

          {/* hearths */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            <Hearth grand={level >= 3} />
            {byFire && (
              <GentleBob delay={300}>
                <SeatedFigure person={byFire} delay={300} chairColor="#7A5230" chairBorder="#4E2F16" />
              </GentleBob>
            )}
            {level >= 3 && <Hearth grand />}
          </View>

          {/* guest beds */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 10 }}>
            <GuestBed quilt="#F472B6" />
            {level >= 2 && <GuestBed quilt="#7FA8C9" />}
            {level >= 3 && <GuestBed quilt="#9BC53D" />}
          </View>

          {/* resting villagers */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 80 }}>
            {resting[0] && (
              <GentleBob delay={150}>
                <SeatedFigure person={resting[0]} delay={150} />
              </GentleBob>
            )}
            {pawn && (
              <GentleBob delay={400}>
                <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="waving-hand" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#B45309" />
                </View>
              </GentleBob>
            )}
            {resting[1] && (
              <GentleBob delay={650}>
                <StandingFigure person={resting[1]} delay={650} icon="hotel" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {level >= 3 && resting[2] && (
              <GentleBob delay={900}>
                <SeatedFigure person={resting[2]} delay={900} />
              </GentleBob>
            )}
          </View>

          <WelcomeDesk level={level} />

          {/* rug at L2+, grand runner at L3 */}
          <View style={{ alignItems: "center", marginTop: 10, marginBottom: 4 }}>
            {level >= 2 && (
              <View style={{ width: level >= 3 ? 262 : 220, height: level >= 3 ? 40 : 32, borderRadius: 18, backgroundColor: "#B45309", opacity: 0.85, borderWidth: level >= 3 ? 3 : 2, borderColor: level >= 3 ? "#C9963C" : "#8A3D06", alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: "88%", height: "55%", borderRadius: 10, borderWidth: 1.5, borderColor: "#F5DEB3" }} />
              </View>
            )}
          </View>
          <View style={{ height: 26, backgroundColor: "#C89B62" }}>
            <View style={{ height: 3, backgroundColor: "#B08A54" }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Welcome Guests"}
          onPrimary={handleGreet}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "Twin hearths, a grand lobby with a chandelier, and a balcony rail." : "More rooms, wall sconces, and a warm rug by the fire."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Welcome guests once an hour. Warmer rooms draw more travelers.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Lighting the hearth…</Text>}
      </ScrollView>
    </View>
  );
}
