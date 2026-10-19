// Pottery Studio interior: cool clay, warm kiln. Villagers shape vessels at
// the wheels, the kiln glows in the corner, and finished pots line the
// shelves. The pawn throws a pot of their own.
// "Throw a Pot" grants coins + XP on a 1-hour cooldown.
// L1: one wheel, small kiln. L2: two wheels, bigger kiln, drying rack.
// L3: grand studio — three wheels, tall kiln, gallery wall of fine ware.
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
import { GentleBob, SoftPulse, StandingFigure, WorkingFigure, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

const BG = "#F3EDE2";
const CLAY = "#C97B4A";
const CLAY_DARK = "#96522C";
const TEXT_DIM = "#A08B6B";
const ACCENT = "#9C4A1A";

const THROW_COINS: Record<number, number> = { 1: 4, 2: 8, 3: 16 };
const THROW_XP: Record<number, number> = { 1: 3, 2: 6, 3: 12 };
const COOLDOWN_MS = 60 * 60 * 1000;
const THROW_KEY = "prayercircle.interior.pottery.throw.v1";

const WARE_COLORS = ["#C97FA8", "#7FA8C9", "#D96C47", "#9BC53D", "#E8B44C"];

/** A potter's wheel with a clay vessel taking shape. */
function PottersWheel({ clay = CLAY }: { clay?: string }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={86} height={84} viewBox="0 0 86 84">
        {/* pedal base */}
        <Rect x={33} y={64} width={20} height={12} rx={3} fill={CLAY_DARK} />
        <Line x1={43} y1={64} x2={43} y2={48} stroke="#6B4226" strokeWidth={4} />
        {/* wheel head */}
        <Ellipse cx={43} cy={46} rx={20} ry={7} fill="#78716C" stroke="#57534E" strokeWidth={2} />
        <Ellipse cx={43} cy={44} rx={14} ry={5} fill="#A8A29E" />
        {/* clay vessel */}
        <Path d="M35 44 C33 34, 37 28, 43 26 C49 28, 53 34, 51 44 Z" fill={clay} stroke={CLAY_DARK} strokeWidth={2} />
        <Ellipse cx={43} cy={27} rx={6} ry={2.5} fill={CLAY_DARK} opacity={0.7} />
        {/* water bowl */}
        <Rect x={60} y={52} width={16} height={12} rx={5} fill="#7FA8C9" stroke="#3D5A76" strokeWidth={1.5} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Wheel</Text>
    </View>
  );
}

/** The kiln — small at L1, taller and hotter at L2/L3. */
function Kiln({ level }: { level: number }) {
  const glow = level >= 3 ? "#F97316" : "#FBBF24";
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <View style={{ width: 104, height: level >= 3 ? 120 : 100 }}>
        <Svg width={104} height={level >= 3 ? 120 : 100} viewBox="0 0 104 120">
          <Path d="M14 110 A40 46 0 0 1 90 110 Z" fill="#B45309" stroke="#7A3606" strokeWidth={2.5} />
          <Path d="M14 110 A40 46 0 0 1 90 110" fill="none" stroke="#7A3606" strokeWidth={2.5} />
          <Rect x={36} y={78} width={32} height={32} rx={6} fill="#1C1917" />
          <Rect x={30} y={104} width={44} height={8} rx={4} fill="#78716C" />
          {level >= 3 && <Rect x={44} y={30} width={16} height={26} rx={8} fill="#FDE68A" stroke="#8A6D1C" strokeWidth={1.5} />}
        </Svg>
        <View style={{ position: "absolute", left: 32, top: level >= 3 ? 66 : 54 }}>
          <SoftPulse duration={1300}>
            <Svg width={40} height={44} viewBox="0 0 40 44">
              <Ellipse cx={20} cy={28} rx={14} ry={14} fill={glow} opacity={0.9} />
              <Ellipse cx={20} cy={32} rx={8} ry={9} fill="#FDE68A" />
            </Svg>
          </SoftPulse>
        </View>
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Kiln</Text>
    </View>
  );
}

/** Shelves of finished ware — fuller and finer with level. */
function WareShelves({ level }: { level: number }) {
  const pots = level >= 3 ? 10 : level >= 2 ? 7 : 4;
  const items: { color: string; h: number }[] = [];
  for (let i = 0; i < pots; i++) {
    items.push({ color: WARE_COLORS[i % WARE_COLORS.length], h: 16 + (i % 3) * 6 });
  }
  const rows = [items.slice(0, Math.ceil(pots / 2)), items.slice(Math.ceil(pots / 2))];
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <View
        style={{
          borderRadius: 6,
          backgroundColor: "#8A5A2B",
          borderWidth: 2,
          borderColor: level >= 3 ? "#C9963C" : "#5E3D22",
          paddingHorizontal: 8,
          paddingVertical: 6,
        }}
      >
        {rows.map((row, ri) => (
          <View key={ri}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", minHeight: 30, justifyContent: "center" }}>
              {row.map((p, i) => (
                <View
                  key={i}
                  style={{
                    width: 18,
                    height: p.h,
                    borderRadius: 7,
                    backgroundColor: p.color,
                    marginHorizontal: 3,
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.15)",
                  }}
                />
              ))}
            </View>
            <View style={{ height: 4, backgroundColor: level >= 3 ? "#C9963C" : "#5E3D22", borderRadius: 2, marginTop: 3, marginBottom: ri === 0 ? 4 : 0 }} />
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Finished ware</Text>
    </View>
  );
}

/** Drying rack with leather-hard pots (L2+). */
function DryingRack() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={110} height={64} viewBox="0 0 110 64">
        <Rect x={8} y={8} width={6} height={50} fill="#6B4226" />
        <Rect x={96} y={8} width={6} height={50} fill="#6B4226" />
        <Rect x={8} y={26} width={94} height={5} fill="#8A5A2B" />
        <Rect x={8} y={46} width={94} height={5} fill="#8A5A2B" />
        {[24, 52, 80].map((cx, i) => (
          <g key={i}>
            <Ellipse cx={cx} cy={20} rx={8} ry={6} fill="#D9A066" stroke="#96522C" strokeWidth={1.5} />
            <Ellipse cx={cx} cy={40} rx={9} ry={6} fill="#C98F5A" stroke="#96522C" strokeWidth={1.5} />
          </g>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Drying rack</Text>
    </View>
  );
}

export default function PotteryInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastThrow, setLastThrow] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(THROW_KEY).catch(() => null);
      setLastThrow(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastThrow + COOLDOWN_MS - Date.now());
  const throwing = pickPeople(people, `pottery|${building?.id ?? "pottery"}|throw`, 3);
  const glazing = pickPeople(people, `pottery|${building?.id ?? "pottery"}|glaze`, 1)[0];

  const levelBlurb =
    level >= 3
      ? "A grand studio — three wheels, a towering kiln, and a gallery wall of fine ware."
      : level >= 2
        ? "A thriving studio — two wheels, a hot kiln, and pots drying on the rack."
        : "A humble studio — one wheel, a small kiln, and clay ready to shape.";

  const handleThrow = async () => {
    if (remaining > 0) {
      Alert.alert("The clay is resting", `Fresh pots are drying on the rack.\n\nThrow another pot in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(THROW_COINS[level] ?? 4);
    const xp = scaledXP(THROW_XP[level] ?? 3);
    const t = Date.now();
    setLastThrow(t);
    await AsyncStorage.setItem(THROW_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `pottery-throw-${t}`).catch(() => undefined);
    Alert.alert("A Fine Vessel", `Your hands steady the spinning clay — a beautiful pot rises.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="gesture" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="circle"
          iconColor={ACCENT}
          title="Pottery Studio"
          blurb={`Clay turns to beauty on the wheel. ${levelBlurb}`}
          accent="#EBD3B4"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#EBD3B4",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#F8F0E0" : "#F5ECDA",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="pottery" />

          {/* wheels */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            <PottersWheel />
            {level >= 2 && <PottersWheel clay="#B4663A" />}
            {level >= 3 && <PottersWheel clay="#D98F5F" />}
          </View>

          {/* villagers shaping */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 84 }}>
            {throwing[0] && (
              <GentleBob delay={150}>
                <WorkingFigure person={throwing[0]} delay={150} icon="brush" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {pawn && (
              <GentleBob delay={400}>
                <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="gesture" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#9C4A1A" />
                </View>
              </GentleBob>
            )}
            {throwing[1] && (
              <GentleBob delay={650}>
                <WorkingFigure person={throwing[1]} delay={650} icon="palette" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {level >= 3 && throwing[2] && (
              <GentleBob delay={900}>
                <WorkingFigure person={throwing[2]} delay={900} icon="brush" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
          </View>

          {/* kiln + shelves */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 10 }}>
            <Kiln level={level} />
            {level >= 2 && <DryingRack />}
            <WareShelves level={level} />
          </View>
          {glazing && level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 4 }}>
              <StandingFigure person={glazing} delay={500} icon="format-paint" iconColor={ACCENT} showLabel />
            </View>
          )}

          {/* clay-stained floor */}
          <View style={{ height: 26, backgroundColor: "#D9BE93", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: "#C4A67C" }} />
            <Svg width={320} height={23} viewBox="0 0 320 23">
              <Circle cx={60} cy={14} r={5} fill={CLAY} opacity={0.5} />
              <Ellipse cx={200} cy={16} rx={8} ry={3} fill={CLAY} opacity={0.4} />
              <Ellipse cx={270} cy={12} rx={6} ry={2.5} fill={CLAY} opacity={0.35} />
            </Svg>
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Throw a Pot"}
          onPrimary={handleThrow}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "Three wheels, a towering kiln, and a gallery wall of fine ware." : "A second wheel, a hotter kiln, and a drying rack."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Throw a pot once an hour. Patience shapes the finest vessels.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Warming the kiln…</Text>}
      </ScrollView>
    </View>
  );
}
