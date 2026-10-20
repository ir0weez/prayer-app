// Art Gallery interior: quiet white walls, framed paintings, and sculptures.
// Villagers wander the gallery — stopping before paintings, circling the
// sculpture, resting on the bench. The pawn takes in the collection with them.
// "View the Collection" grants coins + XP on a 1-hour cooldown.
// L1: two framed paintings on white walls, a rope barrier.
// L2: more frames, a sculpture pedestal, a rest bench.
// L3: grand gallery — tall arched windows, gold frames, a centerpiece
// sculpture, and warm skylight glow.
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

const BG = "#F7F5F0";
const STONE = "#D8D2C4";
const STONE_DARK = "#8A8070";
const TEXT_DIM = "#A09682";
const ACCENT = "#475569";
const GOLD = "#C9963C";
const WOOD_COLOR = "#8A5A2B";

const VIEW_COINS: Record<number, number> = { 1: 70, 2: 140, 3: 260 };
const VIEW_XP: Record<number, number> = { 1: 5, 2: 10, 3: 20 };
const COOLDOWN_MS = 60 * 60 * 1000;
const VIEW_KEY = "prayercircle.interior.art-gallery.view.v1";

/** A framed painting with a small artwork inside. */
function GalleryPainting({
  w = 84,
  h = 64,
  art,
  gold = false,
}: {
  w?: number;
  h?: number;
  art: "sunrise" | "portrait" | "abstract";
  gold?: boolean;
}) {
  const frame = gold ? GOLD : "#334155";
  const frameStroke = gold ? "#8A6D1C" : "#1E293B";
  return (
    <View style={{ alignItems: "center", marginHorizontal: 8 }}>
      <Svg width={w + 16} height={h + 16} viewBox={`0 0 ${w + 16} ${h + 16}`}>
        <Rect x={2} y={2} width={w + 12} height={h + 12} rx={3} fill={frame} stroke={frameStroke} strokeWidth={2.5} />
        <Rect x={8} y={8} width={w} height={h} fill="#FFFFFF" />
        {art === "sunrise" && (
          <G>
            <Rect x={8} y={8} width={w} height={h * 0.6} fill="#FDE68A" />
            <Circle cx={8 + w * 0.5} cy={8 + h * 0.62} r={h * 0.2} fill="#F97316" />
            <Rect x={8} y={8 + h * 0.62} width={w} height={h * 0.38} fill="#7C2D12" />
            <Path d={`M8 ${8 + h * 0.78} L${8 + w * 0.5} ${8 + h * 0.6} L${8 + w} ${8 + h * 0.78}`} stroke="#FDBA74" strokeWidth={2} fill="none" />
          </G>
        )}
        {art === "portrait" && (
          <G>
            <Rect x={8} y={8} width={w} height={h} fill="#E0E7FF" />
            <Ellipse cx={8 + w * 0.5} cy={8 + h * 0.42} rx={w * 0.18} ry={h * 0.2} fill="#D6A87C" />
            <Path d={`M${8 + w * 0.22} ${8 + h} Q${8 + w * 0.5} ${8 + h * 0.6} ${8 + w * 0.78} ${8 + h}`} fill="#475569" />
          </G>
        )}
        {art === "abstract" && (
          <G>
            <Rect x={8} y={8} width={w} height={h} fill="#F8FAFC" />
            <Circle cx={8 + w * 0.3} cy={8 + h * 0.4} r={h * 0.28} fill={ACCENT} opacity={0.85} />
            <Path d={`M${8 + w * 0.5} ${8 + h * 0.75} L${8 + w * 0.85} ${8 + h * 0.25} L${8 + w} ${8 + h * 0.7} L${8 + w} ${8 + h} L${8 + w * 0.5} ${8 + h} Z`} fill={GOLD} opacity={0.8} />
            <Line x1={8 + w * 0.15} y1={8 + h * 0.7} x2={8 + w * 0.6} y2={8 + h * 0.15} stroke="#B91C1C" strokeWidth={2.5} />
          </G>
        )}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>{art === "portrait" ? "A quiet face" : art === "abstract" ? "Untitled, in blue" : "Morning over the hills"}</Text>
    </View>
  );
}

/** A rope barrier in front of a display. */
function RopeBarrier() {
  return (
    <Svg width={120} height={22} viewBox="0 0 120 22">
      <Line x1={6} y1={4} x2={6} y2={20} stroke={GOLD} strokeWidth={3} />
      <Line x1={114} y1={4} x2={114} y2={20} stroke={GOLD} strokeWidth={3} />
      <Path d="M6 8 Q60 24 114 8" stroke="#B91C1C" strokeWidth={3} fill="none" />
    </Svg>
  );
}

/** A sculpture on a pedestal — a carved figure (L2+) or grand centerpiece (L3). */
function Sculpture({ grand = false }: { grand?: boolean }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 10 }}>
      <Svg width={grand ? 100 : 84} height={grand ? 132 : 118} viewBox={`0 0 ${grand ? 100 : 84} ${grand ? 132 : 118}`}>
        {/* pedestal */}
        <Rect x={grand ? 26 : 24} y={grand ? 96 : 88} width={grand ? 48 : 36} height={grand ? 30 : 24} fill={STONE} stroke={STONE_DARK} strokeWidth={2} />
        <Rect x={grand ? 20 : 18} y={grand ? 88 : 80} width={grand ? 60 : 48} height={9} rx={2} fill={STONE_DARK} />
        {/* figure: carved stone */}
        <Path d={`M${grand ? 50 : 42} 20 C${grand ? 40 : 34} 22, ${grand ? 40 : 34} 38, ${grand ? 44 : 38} 50 C${grand ? 42 : 36} 58, ${grand ? 40 : 34} 70, ${grand ? 46 : 40} 88 C${grand ? 48 : 41} 72, ${grand ? 52 : 43} 72, ${grand ? 54 : 44} 88 C${grand ? 60 : 50} 70, ${grand ? 58 : 48} 58, ${grand ? 56 : 46} 50 C${grand ? 60 : 50} 38, ${grand ? 60 : 50} 22, ${grand ? 50 : 42} 20 Z`} fill="#E7DFCE" stroke={STONE_DARK} strokeWidth={1.8} />
        {/* head */}
        <Circle cx={grand ? 50 : 42} cy={17} r={grand ? 9 : 8} fill="#E7DFCE" stroke={STONE_DARK} strokeWidth={1.8} />
        {grand && (
          <G>
            {/* laurel wreath */}
            <Path d={`M${50 - 12} 24 Q50 32 ${50 + 12} 24`} stroke="#3E8E41" strokeWidth={2.5} fill="none" />
            <Circle cx={50} cy={14} r={2.5} fill={GOLD} />
          </G>
        )}
      </Svg>
      <RopeBarrier />
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>{grand ? "Centerpiece: The Keeper" : "Study in stone"}</Text>
    </View>
  );
}

/** A simple rest bench (L2+). */
function GalleryBench() {
  return (
    <View style={{ alignItems: "center", marginTop: 8 }}>
      <Svg width={110} height={34} viewBox="0 0 110 34">
        <Rect x={14} y={8} width={82} height={10} rx={4} fill={WOOD_COLOR} stroke="#4A2F18" strokeWidth={2} />
        <Rect x={20} y={18} width={6} height={14} fill="#4A2F18" />
        <Rect x={84} y={18} width={6} height={14} fill="#4A2F18" />
        <Line x1={14} y1={13} x2={96} y2={13} stroke="#FFFFFF" strokeWidth={1.5} opacity={0.35} />
      </Svg>
    </View>
  );
}

/** Tall arched windows along the back wall (L3). */
function ArchedWindows() {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 8 }}>
      {[0, 1, 2].map((i) => (
        <Svg key={i} width={54} height={88} viewBox="0 0 54 88" style={{ marginHorizontal: 10 }}>
          <Path d="M8 84 L8 34 Q8 8 27 8 Q46 8 46 34 L46 84 Z" fill="#D9EDF5" stroke={STONE_DARK} strokeWidth={2.5} />
          <Line x1={27} y1={8} x2={27} y2={84} stroke={STONE_DARK} strokeWidth={1.8} />
          <Line x1={8} y1={48} x2={46} y2={48} stroke={STONE_DARK} strokeWidth={1.8} />
          <Circle cx={16} cy={24} r={4} fill="#FFF7D6" opacity={0.9} />
        </Svg>
      ))}
    </View>
  );
}

/** Warm skylight glow washing over the gallery (L3). */
function SkylightGlow() {
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      <SoftPulse duration={3000}>
        <Svg width={200} height={40} viewBox="0 0 200 40">
          <Ellipse cx={100} cy={20} rx={92} ry={17} fill="#FFE9A8" opacity={0.4} />
          <Ellipse cx={100} cy={20} rx={60} ry={10} fill="#FFF7D6" opacity={0.5} />
        </Svg>
      </SoftPulse>
    </View>
  );
}

export default function ArtGalleryInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastView, setLastView] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(VIEW_KEY).catch(() => null);
      setLastView(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastView + COOLDOWN_MS - Date.now());
  const gazers = pickPeople(people, `artgallery|${building?.id ?? "art-gallery"}|gaze`, 4);
  const docent = pickPeople(people, `artgallery|${building?.id ?? "art-gallery"}|docent`, 1)[0];

  const levelBlurb =
    level >= 3
      ? "A grand gallery — tall arched windows, gold frames, a centerpiece sculpture, and skylight glow."
      : level >= 2
        ? "A growing gallery — more frames, a stone sculpture, and a bench to rest on."
        : "A humble gallery — two paintings, a rope barrier, and quiet white walls.";

  const handleView = async () => {
    if (remaining > 0) {
      Alert.alert("You have seen the collection", `The gallery needs a moment to change its lights.\n\nView the collection again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(VIEW_COINS[level] ?? 7);
    const xp = scaledXP(VIEW_XP[level] ?? 5);
    const t = Date.now();
    setLastView(t);
    await AsyncStorage.setItem(VIEW_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `artgallery-view-${t}`).catch(() => undefined);
    Alert.alert("Collection Viewed", `Slow rooms, bright canvases — beauty you can walk through.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="palette" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="image"
          iconColor={ACCENT}
          title="Art Gallery"
          blurb={`Paintings and sculptures on quiet gallery walls. ${levelBlurb}`}
          accent="#DDE3EC"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#DDE3EC",
            overflow: "hidden",
            backgroundColor: "#FDFCFA",
          }}
        >
          {level >= 3 && <SkylightGlow />}
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="art-gallery" />
          {level >= 3 && <ArchedWindows />}

          {/* the paintings */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            <GalleryPainting art="sunrise" gold={level >= 3} />
            <GalleryPainting art="portrait" gold={level >= 3} />
            {level >= 3 && <GalleryPainting art="abstract" gold w={94} />}
          </View>
          {level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 6 }}>
              <GalleryPainting art="abstract" w={76} h={56} gold={level >= 3} />
              {level >= 3 && <GalleryPainting art="portrait" w={76} h={56} gold />}
            </View>
          )}

          {/* gazers before the art */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 84 }}>
            {gazers[0] && (
              <GentleBob delay={150}>
                <StandingFigure person={gazers[0]} delay={150} icon="visibility" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {pawn && (
              <GentleBob delay={400}>
                <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="palette" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#475569" />
                </View>
              </GentleBob>
            )}
            {gazers[1] && (
              <GentleBob delay={650}>
                <StandingFigure person={gazers[1]} delay={650} icon="visibility" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {level >= 3 && gazers[2] && (
              <GentleBob delay={900}>
                <StandingFigure person={gazers[2]} delay={900} icon="visibility" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
          </View>

          {/* sculptures + bench */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            {level >= 2 && <Sculpture grand={level >= 3} />}
          </View>
          {level >= 2 && <GalleryBench />}

          {docent && (
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 4 }}>
              <StandingFigure person={docent} delay={500} icon="record-voice-over" iconColor={ACCENT} showLabel />
            </View>
          )}

          {/* polished stone floor */}
          <View style={{ height: 26, backgroundColor: STONE, marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: "#B8AE99" }} />
            <View style={{ flexDirection: "row", marginTop: 6, marginHorizontal: 40 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={{ flex: 1, height: 8, backgroundColor: i % 2 ? "#CFC6B2" : STONE, borderWidth: 0.5, borderColor: "#A89E8C" }} />
              ))}
            </View>
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "View the Collection"}
          onPrimary={handleView}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand gallery — arched windows, gold frames, and a centerpiece sculpture." : "More frames, a stone sculpture, and a bench to rest on."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          View the collection once an hour. Take your time — beauty waits.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Hanging the paintings…</Text>}
      </ScrollView>
    </View>
  );
}
