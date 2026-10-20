// Art Studio interior (School Campus): easels under bright windows that
// multiply with level — L1 two easels, L2 three and a supply shelf, L3 four
// easels, a gallery wall, and a sculpture on a pedestal. "Open Studio Hour"
// grants coins + XP on a 1-hour cooldown. While the Art Studio stands,
// collections completion payouts grow +25% (lib/school-perks.ts).
// No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, Ellipse, G, Line, Rect } from "react-native-svg";
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

const BG = "#FDF4F5";
const WOOD = "#8B5E34";
const WOOD_DARK = "#5E3D22";
const ACCENT = "#BE3455";
const ACCENT_DARK = "#9F1239";
const TEXT_DIM = "#A8878F";

const STUDIO_KEY = "prayercircle.interior.artstudio.openhour.v1";
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const ACTION_COINS: Record<1 | 2 | 3, number> = { 1: 12, 2: 22, 3: 38 };
const ACTION_XP: Record<1 | 2 | 3, number> = { 1: 10, 2: 18, 3: 30 };

const CANVAS_SCENES = ["#38BDF8", "#F59E0B", "#4D7C4D", "#7C3AED"];

/** An easel with a canvas mid-painting. */
function Easel({ seed = 0 }: { seed?: number }) {
  const sky = CANVAS_SCENES[seed % CANVAS_SCENES.length];
  return (
    <View style={{ alignItems: "center", marginHorizontal: 3 }}>
      <Svg width={62} height={80} viewBox="0 0 62 80">
        <Line x1={31} y1={4} x2={10} y2={76} stroke={WOOD_DARK} strokeWidth={3.4} />
        <Line x1={31} y1={4} x2={52} y2={76} stroke={WOOD_DARK} strokeWidth={3.4} />
        <Line x1={31} y1={30} x2={31} y2={76} stroke={WOOD_DARK} strokeWidth={3} />
        <Rect x={10} y={8} width={42} height={34} rx={3} fill="#FFFDF5" stroke={WOOD} strokeWidth={2.4} />
        <Rect x={14} y={12} width={34} height={15} fill={sky} opacity={0.75} />
        <Circle cx={40} cy={18} r={4} fill="#FDE68A" />
        <Path2 seed={seed} />
        <Rect x={14} y={31} width={34} height={7} fill="#86A860" opacity={0.8} />
        {/* palette resting on the ledge */}
        <Ellipse cx={22} cy={47} rx={8} ry={5} fill={WOOD} />
        <Circle cx={19} cy={46} r={1.7} fill="#DC2626" />
        <Circle cx={24} cy={48} r={1.7} fill="#2563EB" />
        <Circle cx={25} cy={44.5} r={1.5} fill="#FACC15" />
      </Svg>
    </View>
  );
}

/** Little hill strokes on the canvas — varies by seed. */
function Path2({ seed }: { seed: number }) {
  const y = 24 + (seed % 3);
  return (
    <G>
      <Rect x={14} y={y} width={16} height={3.4} rx={1.7} fill="#5B8A5B" opacity={0.85} />
      <Rect x={30} y={y + 2} width={18} height={3.4} rx={1.7} fill="#4D7C4D" opacity={0.85} />
    </G>
  );
}

/** A supply shelf with paint jars (L2+). */
function SupplyShelf() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={96} height={54} viewBox="0 0 96 54">
        <Rect x={0} y={0} width={96} height={54} rx={5} fill={WOOD} />
        <Rect x={5} y={5} width={86} height={44} fill="#6B4A2F" />
        {[0, 1, 2, 3, 4].map((i) => (
          <G key={i}>
            <Rect x={10 + i * 17} y={18} width={11} height={20} rx={2.4} fill="#F8FAFC" opacity={0.92} />
            <Rect x={10 + i * 17} y={26} width={11} height={12} rx={2.4} fill={["#DC2626", "#2563EB", "#FACC15", "#059669", "#7C3AED"][i]} />
            <Rect x={11 + i * 17} y={13} width={9} height={5} rx={2} fill="#94A3B8" />
          </G>
        ))}
        <Rect x={8} y={40} width={80} height={3} fill={WOOD} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Paints</Text>
    </View>
  );
}

/** A gallery wall of framed work (L3). */
function GalleryWall() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={230} height={56} viewBox="0 0 230 56">
        {[0, 1, 2].map((i) => (
          <G key={i}>
            <Rect x={8 + i * 76} y={6} width={62} height={44} rx={3} fill="#FFFDF5" stroke="#B45309" strokeWidth={3} />
            <Rect x={14 + i * 76} y={12} width={50} height={20} fill={CANVAS_SCENES[(i + 1) % CANVAS_SCENES.length]} opacity={0.7} />
            <Circle cx={52 + i * 76} cy={20} r={5} fill="#FDE68A" />
            <Rect x={14 + i * 76} y={36} width={50} height={8} fill="#86A860" opacity={0.75} />
          </G>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>The gallery wall — finished work, framed</Text>
    </View>
  );
}

/** A small sculpture on a pedestal (L3). */
function Sculpture() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={44} height={74} viewBox="0 0 44 74">
        <Circle cx={22} cy={14} r={9} fill="#CBD5E1" />
        <Rect x={15} y={22} width={14} height={16} rx={6} fill="#CBD5E1" />
        <Rect x={8} y={38} width={28} height={6} rx={2} fill="#94A3B8" />
        <Rect x={12} y={44} width={20} height={26} rx={2} fill="#78716C" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Sculpture</Text>
    </View>
  );
}

export default function ArtStudioInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastAction, setLastAction] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STUDIO_KEY);
        setLastAction(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
  }, []);

  const remaining = Math.max(0, lastAction + COOLDOWN_MS - Date.now());
  const actionCoins = scaledCoins(ACTION_COINS[level]);
  const actionXp = scaledXP(ACTION_XP[level]);
  const easelCount = level >= 3 ? 4 : level >= 2 ? 3 : 2;
  const artists = pickPeople(people, `artstudio|${building?.id ?? "art"}|artists`, easelCount);

  const levelBlurb =
    level >= 3
      ? "A real studio — four easels, a gallery wall of finished work, and a sculpture watching over it all."
      : level >= 2
        ? "A third easel and a shelf of paints — the studio is filling with color."
        : "Two easels under the windows, and everything smelling faintly of paint.";

  const handleAction = async () => {
    if (remaining > 0) {
      Alert.alert("Paint Drying", `The studio is mid-piece.\n\nOpen the next studio hour in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastAction(t);
    await AsyncStorage.setItem(STUDIO_KEY, String(t)).catch(() => undefined);
    addCoins(actionCoins);
    await awardCustomXP(actionXp, `artstudio-openhour-${t}`).catch(() => undefined);
    Alert.alert("Studio Hour", `Brushes out, sleeves up — an hour of making things that didn't exist this morning.\n\n+${actionCoins.toFixed(2)} coins, +${actionXp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="palette" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="palette"
          iconColor={ACCENT}
          title="The Studio"
          blurb={`Open studio hour — worth +${actionCoins.toFixed(2)} coins, +${actionXp} XP. ${levelBlurb}`}
          accent="#FBCFE8"
        />

        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#FBCFE8", overflow: "hidden", backgroundColor: "#FFFBFB" }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="art-studio" />

          {level >= 3 && (
            <View style={{ alignItems: "center", marginTop: 12 }}>
              <GalleryWall />
            </View>
          )}
          {level >= 2 && level < 3 && (
            <View style={{ alignItems: "center", marginTop: 12 }}>
              <SupplyShelf />
            </View>
          )}

          {/* easels with artists */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 12, flexWrap: "wrap" }}>
            {Array.from({ length: easelCount }).map((_, i) => (
              <View key={i} style={{ alignItems: "center" }}>
                {artists[i] && (
                  <View style={{ marginBottom: -4 }}>
                    <StandingFigure person={artists[i]} delay={i * 200} icon="brush" iconColor={ACCENT} />
                  </View>
                )}
                <Easel seed={i} />
              </View>
            ))}
            {level >= 3 && <Sculpture />}
          </View>

          {level >= 3 && (
            <View style={{ alignItems: "center", marginTop: 4 }}>
              <SupplyShelf />
            </View>
          )}

          {/* the hero's own canvas */}
          {pawn && (
            <View style={{ alignItems: "center", marginTop: 6 }}>
              <SoftPulse duration={2200}>
                <FigureName name={pawn.name} color={ACCENT_DARK} />
              </SoftPulse>
              <PawnPreview pawn={pawn} size={48} />
            </View>
          )}

          {/* warm wood floor */}
          <View style={{ height: 22, backgroundColor: "#F3E2D3", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: WOOD }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Studio hour in ${formatCooldown(remaining)}` : "Open Studio Hour"}
          onPrimary={handleAction}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade(level + 1 >= 3 ? "A gallery wall, a fourth easel, and a sculpture pedestal." : "A third easel and a shelf of paints.")}
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          While the Art Studio stands, collections completion payouts grow +25%.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the paint jars…</Text>}
      </ScrollView>
    </View>
  );
}
