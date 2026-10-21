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
import { Alert, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import { pickPeople } from "@/components/activity-figures";
import { PaperRoomScene } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";

import { ServeGame } from "@/components/serve-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";

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
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();

  // Serve the Table, hosted here in the Cafeteria — shared host
  // (components/mini-game-host.ts): the same daily cap and payout
  // pipeline as the town restaurants, with the school lunch line's own
  // menu (SERVE_MENUS.cafeteria).
  const serve = useMiniGameHost("serve", addCoins);
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

  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const levelBlurb =
    level >= 3
      ? "The full lunch room — a long serving counter, and a line that moves like a river."
      : level >= 2
        ? "A longer counter and a fuller room — the lunch rush has found this place."
        : "A warm serving line, ready for the rush.";

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

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["cafeteria"]} level={level} cast={diners.map((person) => ({ person, pose: "seated" as const }))} pawn={pawn} pawnPose="seated" width={sceneWidth} />
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

        <PlayCard
          icon="room-service"
          title="Play: Serve the Table"
          blurb="Five tables this shift. Serve each order dish by dish, in order — the lunch line's own menu — before patience runs thin. Good service earns good tips."
          playsLeft={serve.playsLeft}
          cap={serve.cap}
          accent={ACCENT}
          onPlay={() => serve.setPlaying(true)}
        />
        {serve.playing && (
          <ServeGame accent={ACCENT} onComplete={serve.handleComplete} onExit={() => serve.setPlaying(false)} cuisine="cafeteria" />
        )}

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Warming the trays…</Text>}
      </ScrollView>
    </View>
  );
}
