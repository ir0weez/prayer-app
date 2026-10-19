// Library interior: a quiet grand library — tall shelves, study tables,
// villagers studying. L1: two shelves, one table. L2: four shelves, two
// tables, a globe. L3: six shelves, three tables, grand windows, a chandelier,
// and a card catalog. "Study" grants XP on a 1-hour cooldown — bigger than
// the bookstore (school building). No emojis — SVG art and MaterialIcons only.

import { useEffect, useState, type ReactNode } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, G, Rect } from "react-native-svg";
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
  SoftPulse,
  SeatedFigure,
  pickPeople,
  FigureName,
} from "@/components/activity-figures";

const BG = "#F1EFE7"; // quiet parchment
const CARD = "#FFFFFF";
const WOOD = "#7A5A38";
const WOOD_DARK = "#4E3A24";
const ACCENT = "#2E7D32";
const ACCENT_DARK = "#1B5E20";
const TEXT = "#3E332A";
const TEXT_DIM = "#8A7B68";

const STUDY_KEY = "prayercircle.interior.library.study.v1";
const STUDY_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const STUDY_XP: Record<1 | 2 | 3, number> = { 1: 12, 2: 22, 3: 38 };

const SPINE_COLORS = ["#1B5E20", "#37474F", "#5D4037", "#6A1B9A", "#0D47A1", "#B71C1C", "#827717", "#4E342E"];

/** A tall grand bookshelf. */
function GrandShelf({ seed }: { seed: number }) {
  const rows = [0, 1, 2, 3, 4];
  const w = 58;
  const h = 132;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Rect x={0} y={0} width={w} height={h} rx={4} fill={WOOD} />
      <Rect x={0} y={0} width={w} height={8} rx={4} fill={WOOD_DARK} />
      <Rect x={5} y={8} width={w - 10} height={h - 16} fill="#2E2317" />
      {rows.map((r) => {
        const shelfTop = 11 + r * ((h - 22) / 5);
        const shelfH = (h - 22) / 5;
        let x = 9;
        const books: ReactNode[] = [];
        let bi = 0;
        while (x < w - 16) {
          const bw = 4.5 + ((seed + r * 7 + bi * 3) % 3);
          const bh = shelfH - 6 - ((seed + r * 5 + bi * 2) % 5);
          books.push(
            <Rect
              key={bi}
              x={x}
              y={shelfTop + shelfH - 4 - bh}
              width={bw}
              height={bh}
              rx={1}
              fill={SPINE_COLORS[(seed + r + bi) % SPINE_COLORS.length]}
            />
          );
          x += bw + 1.4;
          bi++;
        }
        return (
          <G key={r}>
            {books}
            <Rect x={7} y={shelfTop + shelfH - 4} width={w - 14} height={2.6} fill={WOOD} />
          </G>
        );
      })}
      <Rect x={0} y={h - 8} width={w} height={8} rx={4} fill={WOOD_DARK} />
    </Svg>
  );
}

/** A study table with open books. */
function StudyTable({ seed = 0 }: { seed?: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={150} height={64} viewBox="0 0 150 64">
        {/* open books on the table */}
        <G>
          <Rect x={24} y={4} width={26} height={12} rx={2} fill="#FFF7E0" stroke="#D9A441" strokeWidth={1.5} />
          <Rect x={36.5} y={4} width={1.5} height={12} fill="#D9A441" />
          <Rect x={100} y={4} width={26} height={12} rx={2} fill="#E8F5E9" stroke={ACCENT} strokeWidth={1.5} />
          <Rect x={112.5} y={4} width={1.5} height={12} fill={ACCENT} />
        </G>
        {/* tabletop */}
        <Rect x={0} y={18} width={150} height={12} rx={5} fill={WOOD} />
        <Rect x={0} y={18} width={150} height={5} rx={2.5} fill="#8F6E48" />
        {/* legs */}
        <Rect x={12} y={30} width={8} height={30} rx={3} fill={WOOD_DARK} />
        <Rect x={130} y={30} width={8} height={30} rx={3} fill={WOOD_DARK} />
        {/* stacked books under table */}
        <Rect x={62} y={34} width={26} height={7} rx={2} fill={SPINE_COLORS[seed % SPINE_COLORS.length]} />
        <Rect x={64} y={41} width={22} height={7} rx={2} fill={SPINE_COLORS[(seed + 3) % SPINE_COLORS.length]} />
      </Svg>
    </View>
  );
}

/** A desk globe (L2+). */
function Globe() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={44} height={60} viewBox="0 0 44 60">
        <Rect x={16} y={42} width={12} height={14} rx={3} fill={WOOD_DARK} />
        <Rect x={8} y={54} width={28} height={6} rx={3} fill={WOOD} />
        <Circle cx={22} cy={22} r={18} fill="#7FB3D5" />
        <Circle cx={22} cy={22} r={18} fill="none" stroke={ACCENT_DARK} strokeWidth={2} />
        <Rect x={14} y={12} width={10} height={7} rx={3} fill="#7FB069" />
        <Rect x={24} y={24} width={9} height={6} rx={3} fill="#7FB069" />
        <Rect x={12} y={30} width={7} height={5} rx={2.5} fill="#7FB069" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Globe</Text>
    </View>
  );
}

/** A grand arched window with daylight (L3). */
function GrandWindow({ wide = false }: { wide?: boolean }) {
  const w = wide ? 120 : 84;
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{
        width: w, height: 96, borderTopLeftRadius: w / 2, borderTopRightRadius: w / 2,
        backgroundColor: "#BBDDF2", borderWidth: 5, borderColor: CARD, overflow: "hidden",
      }}>
        <Circle cx={w - 24} cy={20} r={13} fill="#FFF7D6" />
        <View style={{ position: "absolute", left: "48%", top: 0, bottom: 0, width: 4, backgroundColor: CARD }} />
        <View style={{ position: "absolute", top: "52%", left: 0, right: 0, height: 4, backgroundColor: CARD }} />
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 26, backgroundColor: "#7FB069", opacity: 0.8 }} />
      </View>
      <View style={{ width: w + 12, height: 7, borderRadius: 3.5, backgroundColor: CARD, marginTop: -2, borderWidth: 1, borderColor: "#E5DDCE" }} />
    </View>
  );
}

/** A card catalog drawer cabinet (L3). */
function CardCatalog() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={92} height={76} viewBox="0 0 92 76">
        <Rect x={0} y={0} width={92} height={76} rx={6} fill={WOOD} />
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => (
            <G key={`${r}-${c}`}>
              <Rect x={6 + c * 28} y={8 + r * 22} width={24} height={18} rx={2} fill="#EFE7D4" stroke={WOOD_DARK} strokeWidth={1.2} />
              <Rect x={12 + c * 28} y={13 + r * 22} width={12} height={3} rx={1.5} fill={WOOD_DARK} />
              <Circle cx={18 + c * 28} cy={21 + r * 22} r={1.6} fill={ACCENT_DARK} />
            </G>
          ))
        )}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Card catalog</Text>
    </View>
  );
}

/** A chandelier for the grand reading hall (L3). */
function HallChandelier() {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 3, height: 24, backgroundColor: WOOD_DARK }} />
      <Svg width={110} height={26} viewBox="0 0 110 26">
        <Rect x={8} y={12} width={94} height={7} rx={3.5} fill="#D9A441" />
        <Circle cx={55} cy={12} r={9} fill="#D9A441" />
        {[24, 44, 64, 84].map((x) => (
          <Rect key={x} x={x - 3} y={2} width={6} height={12} rx={2} fill="#FFF7E0" />
        ))}
      </Svg>
      <View style={{ flexDirection: "row", marginTop: -24 }}>
        {[24, 44, 64, 84].map((x) => (
          <View key={x} style={{ marginHorizontal: 9.5 }}>
            <SoftPulse duration={1700}>
              <View style={{ width: 8, height: 12, borderRadius: 4, backgroundColor: "#FCD34D" }} />
            </SoftPulse>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function LibraryInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastStudy, setLastStudy] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STUDY_KEY);
        setLastStudy(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
  }, []);

  void addCoins;
  const remaining = Math.max(0, lastStudy + STUDY_COOLDOWN_MS - Date.now());
  const studyXp = STUDY_XP[level];
  const shelfCount = level >= 3 ? 6 : level >= 2 ? 4 : 2;
  const tableCount = level >= 3 ? 3 : level >= 2 ? 2 : 1;
  const studiers = pickPeople(people, `library|${building?.id ?? "lib"}`, level >= 3 ? 5 : level >= 2 ? 4 : 2);

  const levelBlurb =
    level >= 3
      ? "A grand library — soaring shelves, grand windows, a card catalog."
      : level >= 2
        ? "A growing reading room — more shelves, two study tables, a globe."
        : "A quiet corner — a couple of shelves and one good table.";

  const handleStudy = async () => {
    if (remaining > 0) {
      Alert.alert("Rest Your Eyes", `The books aren't going anywhere.\n\nStudy again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastStudy(t);
    await AsyncStorage.setItem(STUDY_KEY, String(t)).catch(() => undefined);
    await awardCustomXP(studyXp, `library-study-${t}`).catch(() => undefined);
    Alert.alert("Deep Study", `You lose yourself in a good book.\n\n+${studyXp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="local-library" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="local-library"
          iconColor={ACCENT}
          title="The Reading Hall"
          blurb={`Quiet study earns wisdom — worth +${studyXp} XP. ${levelBlurb}`}
          accent="#D8E4D4"
        />

        {/* library scene — richer with level */}
        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#D8E4D4", overflow: "hidden", backgroundColor: level >= 3 ? "#F7F5EE" : "#F3F1EA" }}>
          {level >= 3 && (
            <View style={{ alignItems: "center", paddingTop: 6 }}>
              <HallChandelier />
            </View>
          )}
          {/* grand windows at L3 */}
          {level >= 3 && (
            <View style={{ flexDirection: "row", justifyContent: "space-evenly", paddingTop: 10, paddingHorizontal: 8 }}>
              <GrandWindow />
              <GrandWindow wide />
              <GrandWindow />
            </View>
          )}
          {/* tall shelves */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-end", paddingTop: 12, paddingHorizontal: 10 }}>
            {Array.from({ length: shelfCount }).map((_, i) => (
              <View key={i} style={{ marginHorizontal: 3, marginBottom: 6 }}>
                <GrandShelf seed={i * 11 + 5} />
              </View>
            ))}
          </View>

          {/* study tables with studiers */}
          <View style={{ paddingHorizontal: 12, marginTop: 8 }}>
            {Array.from({ length: tableCount }).map((_, t) => {
              const perTable = Math.ceil(studiers.length / tableCount);
              const group = studiers.slice(t * perTable, t * perTable + perTable);
              return (
                <View key={t} style={{ alignItems: "center", marginBottom: 10 }}>
                  <StudyTable seed={t} />
                  <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: -4, flexWrap: "wrap" }}>
                    {group.map((p, i) => (
                      <SeatedFigure key={p.id} person={p} delay={t * 300 + i * 220} chairColor="#6B4A2F" chairBorder={WOOD_DARK} backH={30} backW={40} />
                    ))}
                    {t === tableCount - 1 && pawn && (
                      <View style={{ alignItems: "center", marginHorizontal: 6 }}>
                        <FigureName name={pawn.name} color={ACCENT_DARK} />
                        <PawnPreview pawn={pawn} size={50} />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
            {studiers.length === 0 && !pawn && (
              <Text style={{ color: TEXT_DIM, fontSize: 12, fontStyle: "italic", textAlign: "center", marginVertical: 8 }}>
                Only the turning of pages.
              </Text>
            )}
          </View>

          {/* globe and card catalog extras */}
          {level >= 2 && (
            <View style={{ flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", paddingHorizontal: 24, paddingBottom: 6 }}>
              <Globe />
              {level >= 3 ? (
                <CardCatalog />
              ) : (
                <View style={{ alignItems: "center" }}>
                  <MaterialIcons name="menu-book" size={30} color={ACCENT} />
                  <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Reference desk</Text>
                </View>
              )}
            </View>
          )}

          {/* floor */}
          <View style={{ height: 26, backgroundColor: "#DCD4C0" }}>
            <View style={{ height: 3, backgroundColor: "#CFC4AB" }} />
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Next study in ${formatCooldown(remaining)}` : "Study"}
          onPrimary={handleStudy}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade("More shelves, more tables, deeper wisdom.")}
        />

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Shhh… opening the library…</Text>}
      </ScrollView>
    </View>
  );
}
