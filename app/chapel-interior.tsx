// Chapel interior: a small peaceful chapel — simpler and more intimate than
// the big church. Wooden pews, a small altar, candles, stained glass.
// L1: two pews, a plain altar. L2: four pews, candles, a banner.
// L3: six pews, stained glass windows, a flower altar, kneelers. Villagers
// kneel in prayer or sit in the pews. "Light a Candle" costs 1 coin, grants
// 6 XP, 1-hour cooldown. No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, Ellipse, G, Rect } from "react-native-svg";
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
  KneelingFigure,
  SeatedFigure,
  pickPeople,
  FigureName,
} from "@/components/activity-figures";

const BG = "#F7F4EE"; // soft candlelight white
const CARD = "#FFFFFF";
const WOOD = "#7A5A38";
const WOOD_DARK = "#4E3A24";
const ACCENT = "#8B7B4F";
const GOLD = "#D9A441";
const TEXT = "#4A4038";
const TEXT_DIM = "#8A7B68";

const CANDLE_KEY = "prayercircle.interior.chapel.candle.v1";
const CANDLE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const CANDLE_COST = 1; // coin
const CANDLE_XP = 6;

/** A wooden pew, side view. */
function Pew({ wide = false }: { wide?: boolean }) {
  const w = wide ? 150 : 110;
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={w} height={46} viewBox={`0 0 ${w} 46`}>
        {/* bench back */}
        <Rect x={4} y={0} width={w - 8} height={26} rx={5} fill={WOOD} />
        <Rect x={10} y={6} width={w - 20} height={4} rx={2} fill={WOOD_DARK} opacity={0.6} />
        {/* seat */}
        <Rect x={4} y={24} width={w - 8} height={8} rx={4} fill={WOOD} />
        {/* legs */}
        <Rect x={12} y={32} width={7} height={12} rx={3} fill={WOOD_DARK} />
        <Rect x={w - 19} y={32} width={7} height={12} rx={3} fill={WOOD_DARK} />
        {/* hymnals resting on the seat */}
        <Rect x={w / 2 - 24} y={14} width={20} height={10} rx={2} fill={GOLD} opacity={0.9} />
        <Rect x={w / 2 + 4} y={14} width={20} height={10} rx={2} fill="#B0724A" opacity={0.9} />
      </Svg>
    </View>
  );
}

/** The small altar — richer with level: flowers at L3. */
function Altar({ level }: { level: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={120} height={78} viewBox="0 0 120 78">
        {/* cloth */}
        <Rect x={16} y={10} width={88} height={52} rx={5} fill="#FDFBF5" stroke={GOLD} strokeWidth={2} />
        <Rect x={16} y={10} width={88} height={10} rx={5} fill={GOLD} opacity={0.45} />
        {/* cross */}
        <Rect x={56} y={2} width={8} height={26} rx={2} fill={GOLD} />
        <Rect x={48} y={10} width={24} height={8} rx={2} fill={GOLD} />
        {level >= 3 && (
          <G>
            {/* flower vases */}
            <Rect x={22} y={34} width={10} height={16} rx={3} fill="#7FB3D5" />
            <Circle cx={27} cy={30} r={6} fill="#F472B6" />
            <Circle cx={27} cy={30} r={2.4} fill="#FDE68A" />
            <Rect x={88} y={34} width={10} height={16} rx={3} fill="#7FB3D5" />
            <Circle cx={93} cy={30} r={6} fill="#A78BFA" />
            <Circle cx={93} cy={30} r={2.4} fill="#FDE68A" />
          </G>
        )}
        {/* altar base */}
        <Rect x={26} y={62} width={68} height={10} rx={4} fill={WOOD_DARK} />
      </Svg>
    </View>
  );
}

/** A candle stand with softly flickering flames (L2+). */
function CandleStand({ count = 3 }: { count?: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={{ alignItems: "center", marginHorizontal: 4 }}>
            <SoftPulse duration={1400 + i * 300}>
              <GentleBob amount={1.2} delay={i * 150}>
                <Svg width={12} height={18} viewBox="0 0 12 18">
                  <Ellipse cx={6} cy={12} rx={5} ry={5.5} fill="#F59E0B" opacity={0.85} />
                  <Ellipse cx={6} cy={10} rx={3} ry={4.5} fill="#FDE68A" />
                </Svg>
              </GentleBob>
            </SoftPulse>
            <Svg width={10} height={26} viewBox="0 0 10 26">
              <Rect x={1} y={0} width={8} height={24} rx={3} fill="#FFF7E0" stroke="#EAD9BE" strokeWidth={1} />
            </Svg>
          </View>
        ))}
      </View>
      <Svg width={110} height={14} viewBox="0 0 110 14">
        <Rect x={0} y={4} width={110} height={8} rx={4} fill={WOOD_DARK} />
        <Rect x={8} y={10} width={6} height={4} fill={WOOD} />
        <Rect x={96} y={10} width={6} height={4} fill={WOOD} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Candles</Text>
    </View>
  );
}

/** A hanging banner with a cross (L2+). */
function Banner() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={64} height={92} viewBox="0 0 64 92">
        <Rect x={4} y={0} width={56} height={8} rx={4} fill={WOOD_DARK} />
        <Rect x={10} y={8} width={44} height={70} fill="#8B7B4F" />
        <Rect x={28} y={20} width={8} height={40} rx={2} fill={GOLD} />
        <Rect x={18} y={32} width={28} height={8} rx={2} fill={GOLD} />
        {/* pointed bottom */}
        <Rect x={10} y={78} width={22} height={8} fill="#8B7B4F" />
        <Rect x={32} y={78} width={22} height={8} fill="#8B7B4F" />
        <Rect x={10} y={78} width={44} height={8} fill="#6F6240" opacity={0.5} />
      </Svg>
    </View>
  );
}

/** A stained glass window, arched and colorful (L3). */
function StainedGlass() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={72} height={100} viewBox="0 0 72 100">
        <Rect x={4} y={20} width={64} height={80} fill="#2B2118" />
        <Rect x={4} y={20} width={64} height={80} fill="none" stroke={WOOD_DARK} strokeWidth={5} />
        {/* panes */}
        <Rect x={9} y={25} width={24} height={30} fill="#7C3AED" opacity={0.9} />
        <Rect x={39} y={25} width={24} height={30} fill="#2563EB" opacity={0.9} />
        <Rect x={9} y={61} width={24} height={34} fill="#059669" opacity={0.9} />
        <Rect x={39} y={61} width={24} height={34} fill="#DC2626" opacity={0.9} />
        {/* cross of light */}
        <Rect x={32} y={32} width={8} height={56} fill="#FDE68A" opacity={0.85} />
        <Rect x={16} y={50} width={40} height={8} fill="#FDE68A" opacity={0.85} />
        {/* arch */}
        <Circle cx={36} cy={24} r={30} fill="#FBBF24" opacity={0.9} />
        <Circle cx={36} cy={24} r={30} fill="none" stroke={WOOD_DARK} strokeWidth={5} />
      </Svg>
    </View>
  );
}

/** A kneeler cushion (L3). */
function Kneeler() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <View style={{ width: 44, height: 12, borderRadius: 6, backgroundColor: "#B0724A", borderWidth: 1.5, borderColor: WOOD_DARK }} />
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Kneeler</Text>
    </View>
  );
}

export default function ChapelInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastCandle, setLastCandle] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CANDLE_KEY);
        setLastCandle(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
  }, []);

  const remaining = Math.max(0, lastCandle + CANDLE_COOLDOWN_MS - Date.now());
  const pewCount = level >= 3 ? 6 : level >= 2 ? 4 : 2;
  const kneelers = pickPeople(people, `chapel-kneel|${building?.id ?? "chp"}`, 3);
  const sitters = pickPeople(people, `chapel-sit|${building?.id ?? "chp"}`, Math.min(4, pewCount));

  const levelBlurb =
    level >= 3
      ? "A lovely chapel — stained glass, a flower altar, and kneelers."
      : level >= 2
        ? "A growing chapel — candlelight, a banner, more pews."
        : "A quiet chapel — a couple of pews and a simple altar.";

  const handleCandle = async () => {
    if (remaining > 0) {
      Alert.alert("Still Burning", `Your candle is still lit.\n\nLight another in about ${formatCooldown(remaining)}.`);
      return;
    }
    if (coins.balance < CANDLE_COST) {
      Alert.alert("Not enough coins", `Lighting a candle costs ${CANDLE_COST.toFixed(2)} coin. You have ${coins.balance.toFixed(2)}.`);
      return;
    }
    const t = Date.now();
    setLastCandle(t);
    addCoins(-CANDLE_COST);
    await AsyncStorage.setItem(CANDLE_KEY, String(t)).catch(() => undefined);
    await awardCustomXP(CANDLE_XP, `chapel-candle-${t}`).catch(() => undefined);
    Alert.alert("A Quiet Prayer", `You light a candle and sit in the stillness.\n\n+${CANDLE_XP} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="church" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="church"
          iconColor={ACCENT}
          title="A Quiet Place"
          blurb={`Light a candle for 1 coin — worth +${CANDLE_XP} XP. ${levelBlurb}`}
          accent="#E8DFC8"
        />

        {/* chapel scene — richer with level */}
        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#E8DFC8", overflow: "hidden", backgroundColor: level >= 3 ? "#FBF9F3" : "#F6F2E8" }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="chapel" />
          {/* back wall: banner + altar + candles + stained glass */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", paddingTop: 12, paddingHorizontal: 10 }}>
            {level >= 3 && <StainedGlass />}
            <View style={{ marginHorizontal: level >= 3 ? 8 : 0, alignItems: "center" }}>
              {level >= 2 && <Banner />}
              <Altar level={level} />
            </View>
            {level >= 2 && <CandleStand count={level >= 3 ? 5 : 3} />}
          </View>

          {/* kneelers in prayer before the altar */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            {kneelers.map((p, i) => (
              <KneelingFigure key={p.id} person={p} delay={i * 260} showLabel={i === 0} />
            ))}
            {level >= 3 && kneelers.length > 0 && (
              <View style={{ flexDirection: "row", marginLeft: 6 }}>
                <Kneeler />
                <Kneeler />
              </View>
            )}
            {pawn && (
              <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                <FigureName name={pawn.name} color={ACCENT} />
                <PawnPreview pawn={pawn} size={48} />
                <Text style={{ fontSize: 9, color: TEXT_DIM }}>Praying</Text>
              </View>
            )}
          </View>

          {/* pews with seated villagers */}
          <View style={{ paddingHorizontal: 12, marginTop: 6 }}>
            {Array.from({ length: Math.ceil(pewCount / 2) }).map((_, r) => {
              const rowSitters = sitters.slice(r * 2, r * 2 + 2);
              return (
                <View key={r} style={{ alignItems: "center", marginBottom: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginBottom: -8 }}>
                    {rowSitters.map((p, i) => (
                      <SeatedFigure key={p.id} person={p} delay={r * 300 + i * 220} chairColor={WOOD} chairBorder={WOOD_DARK} backH={30} backW={44} />
                    ))}
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "center" }}>
                    <Pew wide />
                    <View style={{ width: 8 }} />
                    <Pew wide />
                  </View>
                </View>
              );
            })}
            {sitters.length === 0 && !pawn && (
              <Text style={{ color: TEXT_DIM, fontSize: 12, fontStyle: "italic", textAlign: "center", marginVertical: 8 }}>
                The chapel waits in quiet.
              </Text>
            )}
          </View>

          {/* soft candle-glow floor */}
          <View style={{ height: 26, backgroundColor: "#EFE7D3" }}>
            <SoftPulse duration={2000}>
              <View style={{ height: 4, backgroundColor: "#F5C96B" }} />
            </SoftPulse>
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Next candle in ${formatCooldown(remaining)}` : "Light a Candle"}
          onPrimary={handleCandle}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade("Stained glass, a flower altar, a warmer glow.")}
        />

        {/* gentle verse line */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 12, paddingHorizontal: 32 }}>
          <MaterialIcons name="favorite-border" size={14} color={ACCENT} />
          <Text style={{ color: TEXT_DIM, fontSize: 12, fontStyle: "italic", marginLeft: 6, textAlign: "center" }}>
            Be still, and know.
          </Text>
        </View>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Entering quietly…</Text>}
      </ScrollView>
    </View>
  );
}
