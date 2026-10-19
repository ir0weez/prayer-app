// Bookstore interior: a cozy bookshop — tall wooden shelves, a reading
// nook, and villagers browsing and reading. L1: two plain shelves. L2: four
// shelves, reading chairs, and a warm lamp. L3: six shelves, a fireplace
// nook, a rolling ladder, and a chandelier. "Find a Good Book" grants XP on
// a 1-hour cooldown. No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Ellipse, G, Rect } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import { PawnPreview } from "@/components/pawn-preview";
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
  SeatedFigure,
  pickPeople,
  FigureName,
} from "@/components/activity-figures";

const BG = "#F5EFE3"; // warm paper
const CARD = "#FFFFFF";
const WOOD = "#8B5E34";
const WOOD_DARK = "#5E3D22";
const ACCENT = "#92400E";
const TEXT = "#4A3220";
const TEXT_DIM = "#8A7358";

const BROWSE_KEY = "prayercircle.interior.bookstore.browse.v1";
const BROWSE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const BROWSE_XP: Record<1 | 2 | 3, number> = { 1: 10, 2: 18, 3: 30 };

const SPINE_COLORS = ["#B45309", "#2563EB", "#059669", "#DC2626", "#7C3AED", "#0E7490", "#BE123C", "#A16207"];

/** A tall wooden bookshelf packed with books. */
function Bookshelf({ seed, w = 62, h = 118 }: { seed: number; w?: number; h?: number }) {
  const rows = [0, 1, 2, 3];
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Rect x={0} y={0} width={w} height={h} rx={5} fill={WOOD} />
      <Rect x={5} y={5} width={w - 10} height={h - 10} fill={WOOD_DARK} />
      {rows.map((r) => {
        const shelfTop = 8 + r * ((h - 16) / 4);
        const shelfH = (h - 16) / 4;
        let x = 9;
        const books = [];
        let bi = 0;
        while (x < w - 16) {
          const bw = 5 + ((seed + r * 7 + bi * 3) % 3);
          const bh = shelfH - 8 - ((seed + r * 5 + bi * 2) % 6);
          books.push(
            <Rect
              key={bi}
              x={x}
              y={shelfTop + shelfH - 5 - bh}
              width={bw}
              height={bh}
              rx={1}
              fill={SPINE_COLORS[(seed + r + bi) % SPINE_COLORS.length]}
            />
          );
          x += bw + 1.5;
          bi++;
        }
        return (
          <G key={r}>
            {books}
            <Rect x={7} y={shelfTop + shelfH - 5} width={w - 14} height={3} fill={WOOD} />
          </G>
        );
      })}
    </Svg>
  );
}

/** A cozy reading chair with a warm lamp. */
function ReadingCorner() {
  return (
    <View style={{ alignItems: "center" }}>
      <SoftPulse duration={2200}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#FFD98A", opacity: 0.5, marginBottom: -34 }} />
      </SoftPulse>
      <View style={{ alignItems: "center" }}>
        <View style={{ width: 6, height: 52, backgroundColor: WOOD_DARK }} />
        <Svg width={40} height={24} viewBox="0 0 40 24">
          <Rect x={4} y={2} width={32} height={20} rx={4} fill="#D9A441" />
          <Ellipse cx={20} cy={22} rx={14} ry={4} fill="#FFD98A" opacity={0.55} />
        </Svg>
        <View style={{ width: 22, height: 6, borderRadius: 3, backgroundColor: WOOD_DARK, marginTop: 2 }} />
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Lamp</Text>
    </View>
  );
}

/** A stone fireplace with a soft animated flame (L3). */
function Fireplace() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={104} height={76} viewBox="0 0 104 76">
        <Rect x={0} y={0} width={104} height={76} rx={8} fill="#7C5A3E" />
        <Rect x={8} y={8} width={88} height={60} rx={4} fill="#9C7A54" />
        <Rect x={22} y={22} width={60} height={46} rx={4} fill="#2B1D12" />
        {/* bricks hint */}
        <Rect x={10} y={10} width={20} height={6} rx={2} fill="#8A6A48" />
        <Rect x={72} y={60} width={20} height={6} rx={2} fill="#8A6A48" />
        {/* logs */}
        <Rect x={34} y={56} width={36} height={7} rx={3.5} fill="#4A3220" />
        <Rect x={38} y={50} width={30} height={6} rx={3} fill="#5E3D22" />
        {/* mantel */}
        <Rect x={-4} y={2} width={112} height={10} rx={3} fill={WOOD_DARK} />
      </Svg>
      {/* flame */}
      <View style={{ position: "absolute", bottom: 16 }}>
        <GentleBob amount={2}>
          <SoftPulse duration={900}>
            <Svg width={34} height={44} viewBox="0 0 34 44">
              <Ellipse cx={17} cy={34} rx={13} ry={9} fill="#F59E0B" opacity={0.85} />
              <Ellipse cx={17} cy={28} rx={8} ry={12} fill="#FBBF24" />
              <Ellipse cx={17} cy={30} rx={4} ry={7} fill="#FEF3C7" />
            </Svg>
          </SoftPulse>
        </GentleBob>
      </View>
      {/* framed art above mantel */}
      <View style={{ position: "absolute", top: -30 }}>
        <View style={{ width: 56, height: 22, borderRadius: 4, backgroundColor: CARD, borderWidth: 3, borderColor: "#D9A441", alignItems: "center", justifyContent: "center" }}>
          <Svg width={40} height={12} viewBox="0 0 40 12">
            <Rect x={2} y={3} width={6} height={7} fill="#B45309" />
            <Rect x={9} y={1} width={6} height={9} fill="#2563EB" />
            <Rect x={16} y={4} width={6} height={6} fill="#059669" />
            <Rect x={30} y={2} width={8} height={8} fill="#7C3AED" opacity={0.5} />
          </Svg>
        </View>
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Fireplace</Text>
    </View>
  );
}

/** A rolling ladder leaning against the shelves (L3). */
function Ladder() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={46} height={118} viewBox="0 0 46 118">
        <Rect x={4} y={0} width={6} height={118} rx={3} fill={WOOD_DARK} />
        <Rect x={36} y={0} width={6} height={118} rx={3} fill={WOOD_DARK} />
        {[18, 42, 66, 90].map((y) => (
          <Rect key={y} x={4} y={y} width={38} height={6} rx={3} fill={WOOD} />
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Ladder</Text>
    </View>
  );
}

/** A small chandelier hanging over the nook (L3). */
function Chandelier() {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 3, height: 26, backgroundColor: WOOD_DARK }} />
      <Svg width={90} height={30} viewBox="0 0 90 30">
        <Rect x={4} y={10} width={82} height={7} rx={3.5} fill="#D9A441" />
        {[20, 45, 70].map((x) => (
          <Rect key={x} x={x - 3} y={2} width={6} height={12} rx={2} fill="#FFF7E0" />
        ))}
      </Svg>
      <View style={{ flexDirection: "row", marginTop: -28 }}>
        {[20, 45, 70].map((x) => (
          <View key={x} style={{ marginHorizontal: 12 }}>
            <SoftPulse duration={1700}>
              <View style={{ width: 9, height: 13, borderRadius: 5, backgroundColor: "#FCD34D" }} />
            </SoftPulse>
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 16 }}>Chandelier</Text>
    </View>
  );
}

export default function BookstoreInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastBrowse, setLastBrowse] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(BROWSE_KEY);
        setLastBrowse(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
  }, []);

  void addCoins;
  const remaining = Math.max(0, lastBrowse + BROWSE_COOLDOWN_MS - Date.now());
  const browseXp = BROWSE_XP[level];
  const browsers = pickPeople(people, `bookstore|${building?.id ?? "book"}`, 2);
  const readers = pickPeople(people, `bookstore-readers|${building?.id ?? "book"}`, 2);

  const levelBlurb =
    level >= 3
      ? "A grand bookshop — shelves to the ceiling, a crackling fireplace nook."
      : level >= 2
        ? "A growing shop — reading chairs, a warm lamp, more shelves."
        : "A small shop — a couple of shelves and a quiet corner.";

  const handleBrowse = async () => {
    if (remaining > 0) {
      Alert.alert("Keep Reading", `The shelves will hold their secrets a little longer.\n\nCome back in about ${formatCooldown(remaining)} for another good book.`);
      return;
    }
    const t = Date.now();
    setLastBrowse(t);
    await AsyncStorage.setItem(BROWSE_KEY, String(t)).catch(() => undefined);
    await awardCustomXP(browseXp, `bookstore-browse-${t}`).catch(() => undefined);
    Alert.alert("A Good Book", `You settle into the nook with a great find.\n\n+${browseXp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="menu-book" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="menu-book"
          iconColor={ACCENT}
          title="The Reading Nook"
          blurb={`Quiet shelves, warm light. Find a good book — worth +${browseXp} XP. ${levelBlurb}`}
          accent="#EAD9BE"
        />

        {/* bookstore scene — richer with level */}
        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#EAD9BE", overflow: "hidden", backgroundColor: level >= 3 ? "#F8F1E2" : "#F2EAD8" }}>
          {level >= 3 && (
            <View style={{ alignItems: "center", paddingTop: 8 }}>
              <Chandelier />
            </View>
          )}
          {/* shelves row */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 14 }}>
            {level >= 2 && <Ladder />}
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", flex: 1 }}>
              {Array.from({ length: level >= 3 ? 6 : level >= 2 ? 4 : 2 }).map((_, i) => (
                <View key={i} style={{ marginHorizontal: 3, marginBottom: 6 }}>
                  <Bookshelf seed={i * 13 + 7} />
                </View>
              ))}
            </View>
            {level >= 3 && (
              <View style={{ justifyContent: "flex-end", marginBottom: 6 }}>
                <Fireplace />
              </View>
            )}
          </View>

          {/* villagers browsing the shelves */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 2 }}>
            {browsers.map((p, i) => (
              <StandingFigure key={p.id} person={p} delay={i * 220} icon="menu-book" iconColor={ACCENT} showLabel />
            ))}
            {browsers.length === 0 && !pawn && (
              <Text style={{ color: TEXT_DIM, fontSize: 12, fontStyle: "italic", marginVertical: 8 }}>
                The shelves are quiet today.
              </Text>
            )}
          </View>

          {/* reading nook: chairs + lamp (L2+) and seated readers */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 10, paddingBottom: 6 }}>
            {level >= 2 && <ReadingCorner />}
            <View style={{ width: level >= 2 ? 14 : 0 }} />
            {level >= 2 ? (
              readers.map((p, i) => (
                <SeatedFigure key={p.id} person={p} delay={i * 260} chairColor="#A9713F" chairBorder={WOOD_DARK} backH={34} backW={42} />
              ))
            ) : (
              browsers.length > 0 && (
                <SeatedFigure person={browsers[0]} delay={120} chairColor="#A9713F" chairBorder={WOOD_DARK} backH={34} backW={42} />
              )
            )}
            {/* the pawn settles into the nook */}
            {pawn && (
              <View style={{ alignItems: "center", marginHorizontal: 8 }}>
                <FigureName name={pawn.name} color={ACCENT} />
                <PawnPreview pawn={pawn} size={52} />
                <Text style={{ fontSize: 9, color: TEXT_DIM }}>Reading</Text>
              </View>
            )}
          </View>

          {/* floor */}
          <View style={{ height: 26, backgroundColor: "#E3D3B4" }}>
            <View style={{ height: 3, backgroundColor: "#D3BF9C" }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Next book in ${formatCooldown(remaining)}` : "Find a Good Book"}
          onPrimary={handleBrowse}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade("More shelves, a warmer nook, better finds.")}
        />

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the shop…</Text>}
      </ScrollView>
    </View>
  );
}
