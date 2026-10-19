// Apothecary interior: herbs hung to dry, remedies brewing. Villagers
// grind and bottle at the work counter, potion shelves glow amber and
// violet, and the pawn brews a remedy of their own.
// "Brew a Remedy" grants coins + XP on a 1-hour cooldown.
// L1: counter, herb bundles, small shelf. L2: brewing cauldron, more
// shelves, hanging garden. L3: grand apothecary — great cauldron,
// alchemy glassware, gold-trimmed shelves, skylight of green glass.
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
import { GentleBob, SoftPulse, StandingFigure, WorkingFigure, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

const BG = "#F1F7EC";
const WOOD = "#7A5230";
const WOOD_DARK = "#4E2F16";
const TEXT_DIM = "#8A9A76";
const ACCENT = "#3F7A3A";
const GOLD = "#C9963C";

const BREW_COINS: Record<number, number> = { 1: 5, 2: 10, 3: 18 };
const BREW_XP: Record<number, number> = { 1: 4, 2: 8, 3: 14 };
const COOLDOWN_MS = 60 * 60 * 1000;
const BREW_KEY = "prayercircle.interior.apothecary.brew.v1";

const POTION_COLORS = ["#C084FC", "#34D399", "#FBBF24", "#F472B6", "#7FA8C9"];

/** The brewing cauldron with bubbling brew. */
function Cauldron({ grand = false }: { grand?: boolean }) {
  const W = grand ? 140 : 110;
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8, position: "relative" }}>
      <View style={{ position: "absolute", top: -30, left: W / 2 - 40 }}>
        <GentleBob delay={200} amount={3}>
          <Svg width={80} height={40} viewBox="0 0 80 40">
            <Path d="M28 38 C24 30, 32 26, 29 18 C27 12, 31 8, 31 4" fill="none" stroke="#D9EAD3" strokeWidth={4} strokeLinecap="round" opacity={0.85} />
            <Path d="M52 38 C48 30, 56 26, 53 18" fill="none" stroke="#E8F5E9" strokeWidth={4} strokeLinecap="round" opacity={0.8} />
          </Svg>
        </GentleBob>
      </View>
      <Svg width={W} height={grand ? 110 : 96} viewBox="0 0 140 110">
        {/* fire beneath */}
        <SoftPulseFire />
        <Path d="M30 60 h80 l-10 34 a8 8 0 0 1 -8 8 h-44 a8 8 0 0 1 -8 -8 Z" fill="#2B2118" stroke={grand ? GOLD : "#57534E"} strokeWidth={2.5} />
        <Ellipse cx={70} cy={60} rx={40} ry={9} fill="#34D399" opacity={0.9} stroke="#1F7A4D" strokeWidth={2} />
        <Circle cx={58} cy={60} r={3.5} fill="#A7F3D0" />
        <Circle cx={80} cy={59} r={2.8} fill="#A7F3D0" />
        <Circle cx={70} cy={62} r={2.2} fill="#D1FAE5" />
        {grand && <Rect x={24} y={50} width={92} height={7} rx={3.5} fill={GOLD} stroke="#8A6D1C" strokeWidth={1.5} />}
        {/* hanging hook */}
        <Line x1={70} y1={0} x2={70} y2={52} stroke="#57534E" strokeWidth={4} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Brewing cauldron</Text>
    </View>
  );
}

function SoftPulseFire() {
  return (
    <>
      <Ellipse cx={52} cy={102} rx={12} ry={6} fill="#F97316" opacity={0.85} />
      <Ellipse cx={70} cy={103} rx={14} ry={7} fill="#FBBF24" opacity={0.9} />
      <Ellipse cx={88} cy={102} rx={12} ry={6} fill="#F97316" opacity={0.85} />
    </>
  );
}

/** The work counter: mortar, bottles, scale. */
function WorkCounter({ level }: { level: number }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={150} height={80} viewBox="0 0 150 80">
        <Rect x={8} y={44} width={134} height={30} rx={5} fill={WOOD} stroke={WOOD_DARK} strokeWidth={2.5} />
        {level >= 3 && <Rect x={6} y={40} width={138} height={7} rx={3.5} fill={GOLD} stroke="#8A6D1C" strokeWidth={1.5} />}
        <Line x1={8} y1={58} x2={142} y2={58} stroke={WOOD_DARK} strokeWidth={1.5} />
        {/* mortar and pestle */}
        <Path d="M28 22 h26 c0 9 -5.5 14 -13 14 s-13 -5 -13 -14 Z" fill="#8A5A2B" stroke="#4E2F16" strokeWidth={1.5} />
        <Line x1={36} y1={8} x2={50} y2={24} stroke="#4E2F16" strokeWidth={4} strokeLinecap="round" />
        {/* bottles */}
        <Rect x={70} y={18} width={12} height={24} rx={4} fill="#C084FC" stroke="#6D4C9E" strokeWidth={1.5} />
        <Rect x={88} y={24} width={10} height={18} rx={4} fill="#34D399" stroke="#1F7A4D" strokeWidth={1.5} />
        {level >= 2 && (
          <>
            <Rect x={106} y={16} width={12} height={26} rx={4} fill="#FBBF24" stroke="#8A6D1C" strokeWidth={1.5} />
            {/* little scale */}
            <Line x1={126} y1={14} x2={126} y2={38} stroke="#57534E" strokeWidth={2.5} />
            <Line x1={116} y1={18} x2={136} y2={18} stroke="#57534E" strokeWidth={2.5} />
            <Circle cx={116} cy={26} r={5} fill="#D1D5DB" stroke="#6B7280" strokeWidth={1.5} />
            <Circle cx={136} cy={26} r={5} fill="#D1D5DB" stroke="#6B7280" strokeWidth={1.5} />
          </>
        )}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Work counter</Text>
    </View>
  );
}

/** Shelves of glowing potion bottles. */
function PotionShelves({ level }: { level: number }) {
  const bottles = level >= 3 ? 12 : level >= 2 ? 8 : 5;
  const items: { color: string; h: number }[] = [];
  for (let i = 0; i < bottles; i++) {
    items.push({ color: POTION_COLORS[i % POTION_COLORS.length], h: 18 + (i % 3) * 7 });
  }
  const rows = [items.slice(0, Math.ceil(bottles / 2)), items.slice(Math.ceil(bottles / 2))];
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <View
        style={{
          borderRadius: 6,
          backgroundColor: WOOD,
          borderWidth: 2,
          borderColor: level >= 3 ? GOLD : WOOD_DARK,
          paddingHorizontal: 8,
          paddingVertical: 6,
        }}
      >
        {rows.map((row, ri) => (
          <View key={ri}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", minHeight: 34, justifyContent: "center" }}>
              {row.map((b, i) => (
                <View key={i} style={{ alignItems: "center", marginHorizontal: 3 }}>
                  <View style={{ width: 6, height: 5, backgroundColor: "#4E2F16", borderRadius: 2 }} />
                  <View
                    style={{
                      width: 16,
                      height: b.h,
                      borderRadius: 5,
                      backgroundColor: b.color,
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.2)",
                      opacity: 0.92,
                    }}
                  />
                </View>
              ))}
            </View>
            <View style={{ height: 4, backgroundColor: level >= 3 ? GOLD : WOOD_DARK, borderRadius: 2, marginTop: 3, marginBottom: ri === 0 ? 4 : 0 }} />
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Remedies</Text>
    </View>
  );
}

/** Herbs hanging from a beam (L2+). */
function HangingHerbs() {
  const herbs = ["#3E8E41", "#4C9A50", "#2F6B31", "#65A30D"];
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={140} height={64} viewBox="0 0 140 64">
        <Rect x={4} y={4} width={132} height={7} rx={3.5} fill={WOOD_DARK} />
        {herbs.map((c, i) => (
          <G key={i}>
            <Line x1={24 + i * 30} y1={11} x2={24 + i * 30} y2={20} stroke={WOOD_DARK} strokeWidth={2} />
            <Ellipse cx={24 + i * 30} cy={34} rx={10} ry={14} fill={c} />
            <Ellipse cx={20 + i * 30} cy={30} rx={4} ry={7} fill="#ffffff" opacity={0.18} />
          </G>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Drying herbs</Text>
    </View>
  );
}

export default function ApothecaryInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastBrew, setLastBrew] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(BREW_KEY).catch(() => null);
      setLastBrew(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastBrew + COOLDOWN_MS - Date.now());
  const brewing = pickPeople(people, `apothecary|${building?.id ?? "apothecary"}|brew`, 3);
  const grinding = pickPeople(people, `apothecary|${building?.id ?? "apothecary"}|grind`, 1)[0];

  const levelBlurb =
    level >= 3
      ? "A grand apothecary — a great cauldron, alchemy glassware, and gold-trimmed remedy shelves."
      : level >= 2
        ? "A thriving apothecary — a bubbling cauldron and herbs hanging to dry."
        : "A humble apothecary — a work counter, small shelf, and bundles of herbs.";

  const handleBrew = async () => {
    if (remaining > 0) {
      Alert.alert("The brew is steeping", `The cauldron needs time to work.\n\nBrew another remedy in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(BREW_COINS[level] ?? 5);
    const xp = scaledXP(BREW_XP[level] ?? 4);
    const t = Date.now();
    setLastBrew(t);
    await AsyncStorage.setItem(BREW_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `apothecary-brew-${t}`).catch(() => undefined);
    Alert.alert("Remedy Brewed", `You stir the green-gold brew and bottle it with care.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="science" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="local-pharmacy"
          iconColor={ACCENT}
          title="Apothecary"
          blurb={`Herbs hung to dry, remedies brewed with care. ${levelBlurb}`}
          accent="#DCEBD2"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#DCEBD2",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#F2F9EC" : "#EEF6E6",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="apothecary" />
          {level >= 2 && <HangingHerbs />}

          {/* cauldron */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 12 }}>
            <Cauldron grand={level >= 3} />
          </View>

          {/* villagers brewing */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 84 }}>
            {brewing[0] && (
              <GentleBob delay={150}>
                <WorkingFigure person={brewing[0]} delay={150} icon="science" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {pawn && (
              <GentleBob delay={400}>
                <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="local-pharmacy" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#3F7A3A" />
                </View>
              </GentleBob>
            )}
            {brewing[1] && (
              <GentleBob delay={650}>
                <WorkingFigure person={brewing[1]} delay={650} icon="biotech" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {level >= 3 && brewing[2] && (
              <GentleBob delay={900}>
                <WorkingFigure person={brewing[2]} delay={900} icon="science" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
          </View>

          {/* counter + shelves */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 10 }}>
            <WorkCounter level={level} />
            <PotionShelves level={level} />
          </View>
          {grinding && (
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 4 }}>
              <StandingFigure person={grinding} delay={500} icon="grain" iconColor={ACCENT} showLabel />
            </View>
          )}

          {/* herb-strewn floor */}
          <View style={{ height: 26, backgroundColor: "#B9CBA4", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: "#A3B88C" }} />
            <View style={{ flexDirection: "row", marginTop: 6, marginHorizontal: 50 }}>
              <View style={{ width: 26, height: 5, borderRadius: 3, backgroundColor: "#3E8E41", opacity: 0.6, transform: [{ rotate: "12deg" }] }} />
              <View style={{ width: 20, height: 5, borderRadius: 3, backgroundColor: "#4C9A50", opacity: 0.6, marginLeft: 30, transform: [{ rotate: "-8deg" }] }} />
            </View>
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Brew a Remedy"}
          onPrimary={handleBrew}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A great cauldron, alchemy glassware, and gold-trimmed remedy shelves." : "A bubbling cauldron and herbs hanging from the beam."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Brew a remedy once an hour. Measure twice, stir once.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Grinding the herbs…</Text>}
      </ScrollView>
    </View>
  );
}
