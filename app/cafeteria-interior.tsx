// Cafeteria interior (School Campus): long tables and a serving line that
// fill out with level — L1 two tables and a counter, L2 four tables and a
// menu board, L3 six tables, a salad bar, and hanging lamps.
// The Cafeteria is a STOCKED food building: it joins the town stock system
// (shelves drain to zero by midnight; a day it reaches 100% switches on the
// +50% stocked income bonus — see lib/hometown.ts stock helpers). The
// church-box restock route is town-map only, so the cafeteria fills its own
// shelves: "Serve Lunch" (1-hour cooldown) serves a full lunch rush and
// fills +50% of capacity — two services fill it. A small XP thank-you comes
// with each service.
// No emojis — SVG art and MaterialIcons only.

import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, G, Line, Rect } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import {
  TOWN_STORAGE_KEY,
  currentStockForBuilding,
  isStockedToday,
  localDateStr,
  parseTown,
  scaledXP,
  stockCapForLevel,
  type TownState,
} from "@/lib/hometown";
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
  SeatedFigure,
  pickPeople,
  FigureName,
} from "@/components/activity-figures";

const BG = "#FFFBEB";
const WOOD = "#B0724A";
const WOOD_DARK = "#7C4A21";
const ACCENT = "#D97706";
const ACCENT_DARK = "#92400E";
const TEXT_DIM = "#A88B5F";

const SERVE_KEY = "prayercircle.interior.cafeteria.serve.v1";
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const ACTION_XP: Record<1 | 2 | 3, number> = { 1: 6, 2: 10, 3: 16 };
/** Each Serve Lunch fills this fraction of the shelf capacity. */
const SERVE_FILL_FRACTION = 0.5;

/** A cafeteria table with trays. */
function LunchTable({ seed = 0 }: { seed?: number }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 4 }}>
      <Svg width={92} height={44} viewBox="0 0 92 44">
        <Rect x={2} y={8} width={88} height={14} rx={5} fill={WOOD} />
        <Rect x={2} y={8} width={88} height={5} rx={2.5} fill="#D9A96B" />
        <Rect x={10} y={22} width={6} height={18} fill={WOOD_DARK} />
        <Rect x={76} y={22} width={6} height={18} fill={WOOD_DARK} />
        {/* trays with lunch */}
        {[16, 42, 66].map((x, i) => (
          <G key={x}>
            <Rect x={x} y={10} width={16} height={8} rx={2} fill={["#94A3B8", "#F87171", "#60A5FA"][(seed + i) % 3]} />
            <Circle cx={x + 5} cy={14} r={2.4} fill="#FDE68A" />
            <Circle cx={x + 11} cy={14} r={2.4} fill="#86A860" />
          </G>
        ))}
      </Svg>
    </View>
  );
}

/** The serving counter with trays under a heat lamp glow. */
function ServingCounter({ level }: { level: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={250} height={74} viewBox="0 0 250 74">
        {/* heat lamps */}
        {[45, 125, 205].map((x) => (
          <G key={x}>
            <Line x1={x} y1={0} x2={x} y2={10} stroke={WOOD_DARK} strokeWidth={2} />
            <Rect x={x - 13} y={10} width={26} height={9} rx={4} fill="#78716C" />
            <Rect x={x - 9} y={19} width={18} height={3.4} rx={1.7} fill="#FBBF24" opacity={0.9} />
          </G>
        ))}
        {/* steam trays */}
        <Rect x={8} y={28} width={234} height={16} rx={4} fill="#CBD5E1" />
        {[0, 1, 2, 3].map((i) => (
          <Rect key={i} x={16 + i * 58} y={31} width={48} height={10} rx={3} fill={["#F59E0B", "#DC2626", "#65A30D", "#B45309"][i]} opacity={0.85} />
        ))}
        {/* counter body */}
        <Rect x={4} y={44} width={242} height={24} rx={4} fill={WOOD} />
        <Rect x={4} y={44} width={242} height={6} fill="#D9A96B" />
        {level >= 3 && (
          <>
            <Rect x={30} y={54} width={52} height={8} rx={3} fill="#FEF3C7" />
            <Rect x={100} y={54} width={52} height={8} rx={3} fill="#FEF3C7" />
            <Rect x={170} y={54} width={52} height={8} rx={3} fill="#FEF3C7" />
          </>
        )}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>The serving line</Text>
    </View>
  );
}

/** A menu board (L2+). */
function MenuBoard() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={92} height={66} viewBox="0 0 92 66">
        <Rect x={0} y={0} width={92} height={66} rx={5} fill="#292524" />
        <Rect x={6} y={6} width={80} height={54} rx={3} fill="#1C1917" />
        <Rect x={14} y={13} width={44} height={5} rx={2.5} fill="#FDE68A" />
        {[0, 1, 2, 3].map((i) => (
          <G key={i}>
            <Rect x={14} y={25 + i * 9} width={38 + (i % 2) * 10} height={3.6} rx={1.8} fill="#E7E5E4" opacity={0.75} />
            <Rect x={72} y={25 + i * 9} width={8} height={3.6} rx={1.8} fill="#FBBF24" opacity={0.9} />
          </G>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>Today's menu</Text>
    </View>
  );
}

/** A salad bar (L3). */
function SaladBar() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={150} height={48} viewBox="0 0 150 48">
        <Rect x={4} y={16} width={142} height={12} rx={4} fill="#A7F3D0" opacity={0.65} />
        {[0, 1, 2, 3, 4].map((i) => (
          <Circle key={i} cx={24 + i * 26} cy={22} r={8} fill={["#65A30D", "#DC2626", "#F59E0B", "#84CC16", "#F472B6"][i]} opacity={0.9} />
        ))}
        <Rect x={2} y={28} width={146} height={10} rx={3} fill={WOOD} />
        <Rect x={10} y={38} width={6} height={8} fill={WOOD_DARK} />
        <Rect x={134} y={38} width={6} height={8} fill={WOOD_DARK} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Salad bar</Text>
    </View>
  );
}

/** Read the cafeteria's live stock from town storage. */
async function readStock(buildingId: string, level: number): Promise<{ pct: number; stockedToday: boolean }> {
  try {
    const raw = await AsyncStorage.getItem(TOWN_STORAGE_KEY);
    if (!raw) return { pct: 0, stockedToday: false };
    const town = parseTown(JSON.parse(raw)) as TownState;
    const cur = currentStockForBuilding(town.stockByBuilding, town.stockAnchorsByBuilding, buildingId, level, Date.now());
    const cap = stockCapForLevel(level);
    return {
      pct: cap > 0 ? Math.min(1, cur / cap) : 0,
      stockedToday: isStockedToday(town.stockedDateByBuilding, buildingId, Date.now()),
    };
  } catch {
    return { pct: 0, stockedToday: false };
  }
}

export default function CafeteriaInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, handleUpgrade } = useInteriorData();
  const [lastServe, setLastServe] = useState(0);
  const [stockPct, setStockPct] = useState(0);
  const [stockedToday, setStockedToday] = useState(false);

  const buildingId = building?.id;

  const refreshStock = useCallback(() => {
    if (!buildingId) return;
    readStock(buildingId, level).then((s) => {
      setStockPct(s.pct);
      setStockedToday(s.stockedToday);
    }).catch(() => undefined);
  }, [buildingId, level]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SERVE_KEY);
        setLastServe(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
  }, []);

  useEffect(() => { refreshStock(); }, [refreshStock]);

  const remaining = Math.max(0, lastServe + COOLDOWN_MS - Date.now());
  const actionXp = scaledXP(ACTION_XP[level]);
  const tableCount = level >= 3 ? 6 : level >= 2 ? 4 : 2;
  const diners = pickPeople(people, `cafeteria|${building?.id ?? "cafe"}|diners`, tableCount * 2);

  const levelBlurb =
    level >= 3
      ? "The full lunch room — six tables, a salad bar, and a line that moves like a river."
      : level >= 2
        ? "Four tables and a menu board — the lunch rush has found this place."
        : "Two tables and a warm serving line.";

  const handleServe = async () => {
    if (!buildingId) return;
    if (remaining > 0) {
      Alert.alert("Between Meals", `The trays are washed and stacked.\n\nServe the next lunch in about ${formatCooldown(remaining)}.`);
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(TOWN_STORAGE_KEY);
      if (!raw) return;
      const town = parseTown(JSON.parse(raw)) as TownState;
      const now = Date.now();
      const cap = stockCapForLevel(level);
      const cur = currentStockForBuilding(town.stockByBuilding, town.stockAnchorsByBuilding, buildingId, level, now);
      const next = Math.min(cap, cur + cap * SERVE_FILL_FRACTION);
      town.stockByBuilding = { ...(town.stockByBuilding ?? {}), [buildingId]: next };
      town.stockAnchorsByBuilding = { ...(town.stockAnchorsByBuilding ?? {}), [buildingId]: { stock: next, atMs: now } };
      if (next >= cap - 0.001) {
        town.stockedDateByBuilding = { ...(town.stockedDateByBuilding ?? {}), [buildingId]: localDateStr() };
      }
      await AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(town));
      const full = next >= cap - 0.001;
      const t = Date.now();
      setLastServe(t);
      await AsyncStorage.setItem(SERVE_KEY, String(t)).catch(() => undefined);
      await awardCustomXP(actionXp, `cafeteria-serve-${t}`).catch(() => undefined);
      refreshStock();
      Alert.alert(
        full ? "Shelves Full!" : "Lunch Served",
        full
          ? `Every shelf is stocked — the cafeteria earns its +50% stocked bonus for the rest of today.\n\n+${actionXp} XP.`
          : `A full lunch rush, served with a smile. The shelves are about ${Math.round((next / cap) * 100)}% full — one more service tops them off.\n\n+${actionXp} XP.`
      );
    } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="restaurant" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="restaurant"
          iconColor={ACCENT}
          title="The Lunch Room"
          blurb={`Serve lunch to fill the shelves (+50% stock each service). ${levelBlurb}`}
          accent="#FDE68A"
        />

        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#FDE68A", overflow: "hidden", backgroundColor: "#FFFEF7" }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="cafeteria" />

          <View style={{ alignItems: "center", marginTop: 12 }}>
            <ServingCounter level={level} />
          </View>

          {level >= 2 && (
            <View style={{ alignItems: "center", marginTop: 8 }}>
              <MenuBoard />
            </View>
          )}

          {/* tables with diners */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-end", marginTop: 10, paddingHorizontal: 6 }}>
            {Array.from({ length: tableCount }).map((_, i) => {
              const pair = [diners[i * 2], diners[i * 2 + 1]].filter(Boolean);
              return (
                <View key={i} style={{ alignItems: "center", marginBottom: 4 }}>
                  <View style={{ flexDirection: "row", gap: 6, marginBottom: -4 }}>
                    {pair.map((p) => (
                      <SeatedFigure key={p.id} person={p} delay={i * 130} chairColor={WOOD} chairBorder={WOOD_DARK} backH={22} backW={32} />
                    ))}
                  </View>
                  <LunchTable seed={i} />
                </View>
              );
            })}
          </View>

          {level >= 3 && (
            <View style={{ alignItems: "center", marginTop: 2 }}>
              <SaladBar />
            </View>
          )}

          {/* the hero, tray in hand */}
          {pawn && (
            <View style={{ alignItems: "center", marginTop: 6 }}>
              <SoftPulse duration={2150}>
                <FigureName name={pawn.name} color={ACCENT_DARK} />
              </SoftPulse>
              <PawnPreview pawn={pawn} size={48} />
            </View>
          )}

          {/* checkerboard floor */}
          <View style={{ height: 22, backgroundColor: "#F3E9CF", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: ACCENT }} />
          </View>
        </View>

        {/* stock meter */}
        <View style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#FDE68A", padding: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name="inventory-2" size={18} color={ACCENT} />
            <Text style={{ marginLeft: 8, fontWeight: "800", color: "#1C1917", fontSize: 13 }}>Shelves: {Math.round(stockPct * 100)}% full</Text>
            <View style={{ flex: 1 }} />
            {stockedToday && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialIcons name="check-circle" size={15} color="#16A34A" />
                <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: "700", color: "#16A34A" }}>Stocked today: +50% income</Text>
              </View>
            )}
          </View>
          <View style={{ height: 9, borderRadius: 5, backgroundColor: "#F3E9CF", marginTop: 8, overflow: "hidden" }}>
            <View style={{ height: 9, width: `${Math.round(stockPct * 100)}%`, backgroundColor: stockedToday ? "#16A34A" : ACCENT, borderRadius: 5 }} />
          </View>
          <Text style={{ fontSize: 11, color: TEXT_DIM, marginTop: 6 }}>
            Shelves empty by midnight, like every stocked shop. Fill them to 100% on a day and the +50% stocked bonus holds for that whole day.
          </Text>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Next lunch in ${formatCooldown(remaining)}` : "Serve Lunch (+50% stock)"}
          onPrimary={handleServe}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade(level + 1 >= 3 ? "Six tables, a salad bar, and room for the whole school." : "More tables and a menu board.")}
        />

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Warming the trays…</Text>}
      </ScrollView>
    </View>
  );
}
