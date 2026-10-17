import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  BUILDINGS,
  DECORATIONS,
  COINS_STORAGE_KEY,
  TOWN_GRID_SIZE,
  TOWN_STORAGE_KEY,
  SHOP_OWNED_KEY,
  dailyIncomeForTown,
  roadMultiplierForBuilding,
  buildingFootprint,
  parseCoins,
  parseTown,
  parseOwnedItems,
  tierForFastDay,
  incomeFor,
  upgradeCostFor,
  type BuildingType,
  type DecorationType,
  type HometownCoins,
  type PlacedBuilding,
  type PlacedDecoration,
  type TownState,
} from "@/lib/hometown";
import { getTodayISOString } from "@/lib/prayercircle-data";
import { MONUMENT_STORAGE_KEY, MONUMENT_DESIGNS, parseMonuments } from "@/lib/monuments";

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  if (isNaN(da) || isNaN(db)) return 0;
  return Math.floor((db - da) / 86400000);
}

const TOWNSFOLK = ["🧑", "👩", "🧓", "👴", "👦", "👧", "🧔", "👵"];
const WORKERS: Record<string, string> = {
  "farm": "🧑‍🌾",
  "shop": "🧑‍💼",
  "bakery": "🧑‍🍳",
  "market": "🧑‍💼",
  "bank": "🧑‍💼",
};

function townsfolkFor(buildingId: string): string {
  let hash = 0;
  for (let i = 0; i < buildingId.length; i++) hash = (hash * 31 + buildingId.charCodeAt(i)) % 1000;
  return TOWNSFOLK[hash % TOWNSFOLK.length];
}

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `b${Date.now()}${idCounter}`;
}

// Building art using colored shapes (no emojis) - shape evolves with level
function BuildingArt({ type, size, level = 1 }: { type: string; size: number; level?: number }) {
  const s = size;
  const lv = level || 1;
  switch (type) {
    case "house":
      if (lv >= 3) return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.85, height: s * 0.18, backgroundColor: "#991B1B", borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
          <View style={{ width: s * 0.9, height: s * 0.55, backgroundColor: "#F59E0B", borderRadius: 6 }} />
          <View style={{ flexDirection: "row", position: "absolute", bottom: s * 0.25 }}>
            <View style={{ width: s * 0.15, height: s * 0.15, backgroundColor: "#FEF3C7", marginHorizontal: 4, borderRadius: 2 }} />
            <View style={{ width: s * 0.15, height: s * 0.15, backgroundColor: "#FEF3C7", marginHorizontal: 4, borderRadius: 2 }} />
          </View>
          <View style={{ position: "absolute", bottom: s * 0.05, width: s * 0.18, height: s * 0.28, backgroundColor: "#78350F", borderRadius: 3 }} />
          <View style={{ position: "absolute", top: s * 0.05, right: s * 0.15, width: s * 0.08, height: s * 0.2, backgroundColor: "#78716C", borderRadius: 2 }} />
        </View>
      );
      if (lv >= 2) return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.75, height: s * 0.16, backgroundColor: "#B91C1C", borderTopLeftRadius: 5, borderTopRightRadius: 5 }} />
          <View style={{ width: s * 0.85, height: s * 0.52, backgroundColor: "#F59E0B", borderRadius: 5 }} />
          <View style={{ position: "absolute", bottom: s * 0.2, left: s * 0.15, width: s * 0.14, height: s * 0.14, backgroundColor: "#FEF3C7", borderRadius: 2 }} />
          <View style={{ position: "absolute", bottom: s * 0.05, width: s * 0.18, height: s * 0.28, backgroundColor: "#78350F", borderRadius: 2 }} />
        </View>
      );
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.7, height: s * 0.15, backgroundColor: "#DC2626", borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
          <View style={{ width: s * 0.8, height: s * 0.5, backgroundColor: "#F59E0B", borderRadius: 4 }} />
          <View style={{ position: "absolute", bottom: s * 0.05, width: s * 0.2, height: s * 0.3, backgroundColor: "#78350F", borderRadius: 2 }} />
        </View>
      );
    case "pawn-house":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.75, height: s * 0.15, backgroundColor: "#7C3AED", borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
          <View style={{ width: s * 0.85, height: s * 0.55, backgroundColor: "#A78BFA", borderRadius: 4 }} />
          <View style={{ position: "absolute", bottom: s * 0.08, width: s * 0.25, height: s * 0.25, backgroundColor: "#4C1D95", borderRadius: s * 0.125 }} />
        </View>
      );
    case "farm":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.9, height: s * 0.3, backgroundColor: "#22C55E", borderRadius: 4 }} />
          <View style={{ width: s * 0.5, height: s * 0.4, backgroundColor: "#DC2626", borderRadius: 4, marginTop: -s * 0.1 }} />
          <View style={{ width: s * 0.55, height: s * 0.12, backgroundColor: "#78350F", marginTop: -s * 0.42 }} />
        </View>
      );
    case "shop":
      if (lv >= 3) return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.95, height: s * 0.18, backgroundColor: "#B91C1C", borderRadius: 5 }} />
          <View style={{ flexDirection: "row" }}>
            {[0,1,2,3].map(i => <View key={i} style={{ width: s * 0.2, height: s * 0.08, backgroundColor: "#FCA5A5", marginHorizontal: 1 }} />)}
          </View>
          <View style={{ width: s * 0.95, height: s * 0.55, backgroundColor: "#1D4ED8", borderRadius: 6 }} />
          <View style={{ flexDirection: "row", marginTop: s * 0.05 }}>
            {[0,1,2].map(i => <View key={i} style={{ width: s * 0.18, height: s * 0.22, backgroundColor: "#BFDBFE", marginHorizontal: 3, borderRadius: 2 }} />)}
          </View>
        </View>
      );
      if (lv >= 2) return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.92, height: s * 0.16, backgroundColor: "#DC2626", borderRadius: 4 }} />
          <View style={{ width: s * 0.92, height: s * 0.52, backgroundColor: "#2563EB", borderRadius: 5 }} />
          <View style={{ flexDirection: "row", marginTop: s * 0.05 }}>
            <View style={{ width: s * 0.2, height: s * 0.24, backgroundColor: "#BFDBFE", marginHorizontal: 3, borderRadius: 2 }} />
            <View style={{ width: s * 0.2, height: s * 0.24, backgroundColor: "#BFDBFE", marginHorizontal: 3, borderRadius: 2 }} />
          </View>
        </View>
      );
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.9, height: s * 0.15, backgroundColor: "#EF4444", borderRadius: 4 }} />
          <View style={{ width: s * 0.9, height: s * 0.5, backgroundColor: "#3B82F6", borderRadius: 4 }} />
          <View style={{ flexDirection: "row", marginTop: s * 0.05 }}>
            <View style={{ width: s * 0.2, height: s * 0.25, backgroundColor: "#BFDBFE", marginHorizontal: 2, borderRadius: 2 }} />
            <View style={{ width: s * 0.2, height: s * 0.25, backgroundColor: "#BFDBFE", marginHorizontal: 2, borderRadius: 2 }} />
          </View>
        </View>
      );
    case "bakery":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.85, height: s * 0.6, backgroundColor: "#F59E0B", borderRadius: 6 }} />
          <View style={{ width: s * 0.6, height: s * 0.15, backgroundColor: "#92400E", borderRadius: 8, marginBottom: s * 0.1 }} />
          <View style={{ position: "absolute", top: s * 0.15, width: s * 0.3, height: s * 0.2, backgroundColor: "#FEF3C7", borderRadius: s * 0.1 }} />
        </View>
      );
    case "market":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.95, height: s * 0.7, backgroundColor: "#0EA5E9", borderRadius: 6 }} />
          <View style={{ flexDirection: "row", marginTop: s * 0.08 }}>
            {[0, 1, 2].map(i => (
              <View key={i} style={{ width: s * 0.18, height: s * 0.3, backgroundColor: "#E0F2FE", marginHorizontal: 3, borderRadius: 2 }} />
            ))}
          </View>
          <View style={{ width: s * 0.95, height: s * 0.12, backgroundColor: "#0369A1", borderRadius: 4, marginTop: s * 0.05 }} />
        </View>
      );
    case "bank":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.9, height: s * 0.12, backgroundColor: "#6B7280", borderRadius: 4 }} />
          <View style={{ flexDirection: "row", marginTop: s * 0.05 }}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={{ width: s * 0.12, height: s * 0.45, backgroundColor: "#9CA3AF", marginHorizontal: 4, borderRadius: 2 }} />
            ))}
          </View>
          <View style={{ width: s * 0.9, height: s * 0.12, backgroundColor: "#6B7280", borderRadius: 4, marginTop: s * 0.05 }} />
        </View>
      );
    default:
      return <View style={{ width: s * 0.7, height: s * 0.7, backgroundColor: "#9CA3AF", borderRadius: 8 }} />;
  }
}

/** Spinning coin with accumulated amount underneath */
function SpinningCoin({ amount, onCollect }: { amount: number; onCollect: () => void }) {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  const rotateY = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const hasAmount = amount > 0;

  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation();
        onCollect();
      }}
      style={{ alignItems: "center", padding: 4, zIndex: 10 }}
    >
      <Animated.View
        style={{
          transform: [{ rotateY }],
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: hasAmount ? "#FBBF24" : "#E5E7EB",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: hasAmount ? "#D97706" : "#9CA3AF",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
          elevation: 3,
        }}
      >
        <Text style={{ fontSize: 20 }}>🪙</Text>
      </Animated.View>
      <Text style={{
        fontSize: 10,
        fontWeight: "700",
        color: hasAmount ? "#92400E" : "#9CA3AF",
        marginTop: 2,
        backgroundColor: "rgba(255,255,255,0.9)",
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 8,
      }}>
        {hasAmount ? `+${amount.toFixed(1)}` : "earning"}
      </Text>
    </Pressable>
  );
}

export default function HometownScreen() {
  const router = useRouter();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [town, setTown] = useState<TownState>({ buildings: [], decorations: [], roads: [], lastIncomeDate: null });
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [movingBuilding, setMovingBuilding] = useState<PlacedBuilding | null>(null);
  const [monumentCount, setMonumentCount] = useState(0);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [tier] = useState(1); // TODO: derive from active fast day

  const saveTown = useCallback((next: TownState) => {
    setTown(next);
    AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const saveCoins = useCallback((next: HometownCoins) => {
    setCoins(next);
    AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  // Load + accumulate hourly coins on open
  useEffect(() => {
    (async () => {
      try {
        // Accumulate 0.5 coins per hour per income building (with road multiplier)
        const now = new Date().toISOString();
        const townRawForAccum = await AsyncStorage.getItem(TOWN_STORAGE_KEY);
        if (townRawForAccum) {
          const t = parseTown(JSON.parse(townRawForAccum));
          let changed = false;
          const updatedBuildings = t.buildings.map(b => {
            const lastTick = b.lastTick ? new Date(b.lastTick).getTime() : Date.now();
            const hoursElapsed = Math.floor((Date.now() - lastTick) / 3600000);
            if (hoursElapsed > 0 && incomeFor(b.type, b.level || 1) > 0) {
              changed = true;
              const multiplier = roadMultiplierForBuilding(t, b.id);
              return {
                ...b,
                accumulated: Math.round(((b.accumulated || 0) + (hoursElapsed * 0.5 * multiplier)) * 10) / 10,
                lastTick: now,
              };
            }
            return b.lastTick ? b : { ...b, lastTick: now };
          });
          if (changed) {
            const updatedTown = { ...t, buildings: updatedBuildings };
            await AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(updatedTown));
          }
        }
        const [coinsRaw, townRaw, monumentsRaw, ownedRaw, backfillRaw, fastsRaw] = await Promise.all([
          AsyncStorage.getItem(COINS_STORAGE_KEY),
          AsyncStorage.getItem(TOWN_STORAGE_KEY),
          AsyncStorage.getItem(MONUMENT_STORAGE_KEY),
          AsyncStorage.getItem(SHOP_OWNED_KEY),
          AsyncStorage.getItem("prayercircle.hometown.coin-backfill.v1"),
          AsyncStorage.getItem("prayercircle.fasts.v1"),
        ]);
        // One-time backfill: 1 coin per completed fast day before coins existed
        let effectiveCoinsRaw = coinsRaw;
        if (!backfillRaw) {
          try {
            const fasts = fastsRaw ? JSON.parse(fastsRaw) : [];
            let completedCount = 0;
            for (const f of fasts) {
              const statuses = f.dayStatuses || {};
              for (const d of Object.values(statuses)) {
                if (d === "completed") completedCount++;
              }
            }
            if (completedCount > 0) {
              const c0 = parseCoins(coinsRaw ? JSON.parse(coinsRaw) : {});
              const backfilled = {
                balance: c0.balance + completedCount,
                lifetimeEarned: c0.lifetimeEarned + completedCount,
              };
              await AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(backfilled));
              effectiveCoinsRaw = JSON.stringify(backfilled);
            }
          } catch {}
          await AsyncStorage.setItem("prayercircle.hometown.coin-backfill.v1", "1");
        }
        const c = parseCoins(effectiveCoinsRaw ? JSON.parse(effectiveCoinsRaw) : {});
        let t = parseTown(townRaw ? JSON.parse(townRaw) : {});
        setCoins(c);
        try { setMonumentCount(Object.keys(parseMonuments(monumentsRaw ? JSON.parse(monumentsRaw) : {})).length); } catch {}
        try { setOwnedItems(parseOwnedItems(ownedRaw ? JSON.parse(ownedRaw) : [])); } catch {}

        // Collect business income for missed days
        const today = getTodayISOString();
        const lastDate = t.lastIncomeDate;
        if (lastDate && lastDate !== today) {
          const days = daysBetween(lastDate, today);
          const perDay = dailyIncomeForTown(t);
          if (days > 0 && perDay > 0) {
            const earned = days * perDay;
            const nextCoins = {
              balance: c.balance + earned,
              lifetimeEarned: c.lifetimeEarned + earned,
            };
            saveCoins(nextCoins);
            Alert.alert("Business Income", `Your town earned ${earned} coins while you were away!`);
          }
        }
        t = { ...t, lastIncomeDate: today };
        saveTown(t);
      } catch {}
    })();
  }, []);

  const buildingAt = (x: number, y: number): PlacedBuilding | undefined => {
    return town.buildings.find((b) => {
      const { w, h } = buildingFootprint(b.level || 1);
      return x >= b.x && x < b.x + w && y >= b.y && y < b.y + h;
    });
  };

  const isBuildingOrigin = (b: PlacedBuilding, x: number, y: number): boolean =>
    b.x === x && b.y === y;

  const roadAt = (x: number, y: number) => (town.roads || []).find(r => r.x === x && r.y === y);
  const decorationAt = (x: number, y: number): PlacedDecoration | undefined =>
    town.decorations.find((d) => d.x === x && d.y === y);

  const handleTilePress = (x: number, y: number) => {
    // Move mode: place the moving building here
    if (movingBuilding) {
      const { w, h } = buildingFootprint(movingBuilding.level || 1);
      let fits = true;
      for (let dx = 0; dx < w; dx++) {
        for (let dy = 0; dy < h; dy++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= TOWN_GRID_SIZE || ny >= TOWN_GRID_SIZE) { fits = false; break; }
          const other = buildingAt(nx, ny);
          if (other && other.id !== movingBuilding.id) { fits = false; break; }
          if (decorationAt(nx, ny) || roadAt(nx, ny)) { fits = false; break; }
        }
        if (!fits) break;
      }
      if (!fits) {
        Alert.alert("No Room", "Can't move here - not enough space.");
        return;
      }
      const updatedBuildings = town.buildings.map(b =>
        b.id === movingBuilding.id ? { ...b, x, y } : b
      );
      saveTown({ ...town, buildings: updatedBuildings });
      setMovingBuilding(null);
      return;
    }
    const existingDec = decorationAt(x, y);
    if (existingDec) {
      const def = DECORATIONS[existingDec.type];
      Alert.alert(def.name, "A beautiful decoration.", [
        { text: "OK" },
        { text: "Remove", style: "destructive", onPress: () => {
          saveTown({ ...town, decorations: town.decorations.filter(d => d.id !== existingDec.id) });
        }},
      ]);
      return;
    }
    const existing = buildingAt(x, y);
    if (existing) {
      if (existing.type === "pawn-house") {
        router.push("/pawn-house");
        return;
      } else {
        const def = BUILDINGS[existing.type];
        const level = existing.level || 1;
        
        const currentIncome = incomeFor(existing.type, level);
        if (level >= 3) {
          Alert.alert(`${def.name} (Lv 3)`, `${def.description}\n\nMax level! Earns ${currentIncome} coins/day.`);
        } else {
          const nextLevel = (level + 1) as 2 | 3;
          // Check if expanded footprint fits
          const { w, h } = buildingFootprint(nextLevel);
          let fits = true
          for (let dx = 0; dx < w; dx++) {
            for (let dy = 0; dy < h; dy++) {
              const nx = existing.x + dx, ny = existing.y + dy;
              if (nx >= TOWN_GRID_SIZE || ny >= TOWN_GRID_SIZE) { fits = false; break; }
              const other = buildingAt(nx, ny);
              if (other && other.id !== existing.id) { fits = false; break; }
              if (decorationAt(nx, ny) || roadAt(nx, ny)) { fits = false; break; }
            }
            if (!fits) break;
          }
          if (!fits) {
            Alert.alert("No Room", "Not enough space to expand this building! Clear adjacent tiles.");
            return;
          }
          const cost = upgradeCostFor(existing.type, nextLevel);
          const nextIncome = incomeFor(existing.type, nextLevel);
          Alert.alert(
            `${def.name} (Lv ${level})`,
            `${def.description}\n\nCurrently earns ${currentIncome} coins/day.\nUpgrade to Lv ${nextLevel}: ${nextIncome} coins/day.`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: `Upgrade 🪙${cost}`,
                onPress: () => {
                  if (coins.balance < cost) {
                    Alert.alert("Not enough coins", `You need ${cost} coins. You have ${coins.balance}.`);
                    return;
                  }
                  const updated = town.buildings.map(b =>
                    b.id === existing.id ? { ...b, level: nextLevel } : b
                  );
                  saveTown({ ...town, buildings: updated });
                  const nextCoins = { balance: coins.balance - cost, lifetimeEarned: coins.lifetimeEarned };
                  setCoins(nextCoins);
                  AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(nextCoins)).catch(() => undefined);
                },
              },
            ]
          );
        }
      }
      return;
    }
    setSelectedTile({ x, y });
  };

  const handleBuild = (type: BuildingType) => {
    if (!selectedTile) return;
    const def = BUILDINGS[type];
    if (tier < def.tier) {
      Alert.alert("Locked", `Unlocks at tier ${def.tier} (day ${def.tier === 2 ? 40 : def.tier === 3 ? 100 : 250} of your fast).`);
      return;
    }
    if (coins.balance < def.cost) {
      Alert.alert("Not enough coins", `You need ${def.cost} coins. You have ${coins.balance}.`);
      return;
    }
    if (type === "pawn-house" && town.buildings.some((b) => b.type === "pawn-house")) {
      Alert.alert("Already built", "You already have a pawn house!");
      return;
    }
    const building: PlacedBuilding = { id: nextId(), type, x: selectedTile.x, y: selectedTile.y, level: 1 };
    saveTown({ ...town, buildings: [...town.buildings, building] });
    saveCoins({ balance: coins.balance - def.cost, lifetimeEarned: coins.lifetimeEarned });
    setSelectedTile(null);
  };

  const availableBuildings = (Object.keys(BUILDINGS) as BuildingType[]).filter(
    (t) => tier >= BUILDINGS[t].tier
  );

  const ownedDecorations = (Object.keys(DECORATIONS) as DecorationType[]).filter(
    (t) => ownedItems.includes(DECORATIONS[t].shopId)
  );

  const handlePlaceDecoration = (type: DecorationType) => {
    if (!selectedTile) return;
    if (buildingAt(selectedTile.x, selectedTile.y) || decorationAt(selectedTile.x, selectedTile.y)) {
      Alert.alert("Occupied", "This plot is already occupied.");
      return;
    }
    const dec: PlacedDecoration = { id: `d${Date.now()}`, type, x: selectedTile.x, y: selectedTile.y };
    saveTown({ ...town, decorations: [...town.decorations, dec] });
    setSelectedTile(null);
  };

  const handleCollectBuilding = (buildingId: string) => {
    const building = town.buildings.find(b => b.id === buildingId);
    if (!building || !(building.accumulated || 0)) return;
    const amount = building.accumulated || 0;
    const updatedBuildings = town.buildings.map(b =>
      b.id === buildingId ? { ...b, accumulated: 0, lastTick: new Date().toISOString() } : b
    );
    const updatedTown = { ...town, buildings: updatedBuildings };
    saveTown(updatedTown);
    const updatedCoins = {
      balance: Math.round((coins.balance + amount) * 10) / 10,
      lifetimeEarned: Math.round((coins.lifetimeEarned + amount) * 10) / 10,
    };
    saveCoins(updatedCoins);
  };

  const handlePlaceRoad = () => {
    if (!selectedTile) return;
    if (buildingAt(selectedTile.x, selectedTile.y) || decorationAt(selectedTile.x, selectedTile.y) || roadAt(selectedTile.x, selectedTile.y)) {
      Alert.alert("Occupied", "This plot already has something on it.");
      return;
    }
    const road = { id: `r${Date.now()}`, x: selectedTile.x, y: selectedTile.y };
    const next = { ...town, roads: [...(town.roads || []), road] };
    saveTown(next);
    setSelectedTile(null);
  };

  const cellSize = 40;
  const rows = [];
  for (let y = 0; y < TOWN_GRID_SIZE; y++) {
    const cells = [];
    for (let x = 0; x < TOWN_GRID_SIZE; x++) {
      const b = buildingAt(x, y);
      const isOrigin = b ? isBuildingOrigin(b, x, y) : false;
      const isSelected = selectedTile?.x === x && selectedTile?.y === y;
      const footprint = b ? buildingFootprint(b.level || 1) : { w: 1, h: 1 };
      cells.push(
        <Pressable
          key={`${x}-${y}`}
          onPress={() => handleTilePress(x, y)}
          style={{
            width: cellSize,
            height: cellSize,
            backgroundColor: isSelected ? "#FEF3C7" : b ? "#D1FAE5" : "#F3F4F6",
            borderWidth: isOrigin || !b ? 1 : 0,
            borderColor: isSelected ? "#F59E0B" : "#E5E7EB",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {decorationAt(x, y) && (
            <Text style={{ fontSize: 22 }}>{DECORATIONS[decorationAt(x, y)!.type].icon}</Text>
          )}
          {roadAt(x, y) && (
            <View style={{ position: "absolute", width: cellSize, height: cellSize, backgroundColor: "#9CA3AF", alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: cellSize * 0.7, height: 8, backgroundColor: "#6B7280", borderRadius: 4 }} />
            </View>
          )}
          {b && isOrigin && incomeFor(b.type, b.level || 1) > 0 && (
            <View style={{ position: "absolute", top: -6, right: -6, zIndex: 100 }}>
              <SpinningCoin
                amount={b.accumulated || 0}
                onCollect={() => handleCollectBuilding(b.id)}
              />
            </View>
          )}
          {b && isOrigin && (
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <BuildingArt type={b.type} size={cellSize * 0.85} level={b.level || 1} />
              {(b.level || 1) > 1 && (
                <Text style={{ fontSize: 8, color: "#F59E0B", fontWeight: "700" }}>
                  {"★".repeat(b.level || 1)}
                </Text>
              )}
            </View>
          )}
        </Pressable>
      );
    }
    rows.push(
      <View key={y} style={{ flexDirection: "row" }}>
        {cells}
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FFFBEB" }} contentContainerStyle={{ padding: 16, paddingTop: 48 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>🏘️ Hometown</Text>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ fontSize: 16 }}>🪙</Text>
          <Text style={{ marginLeft: 6, fontWeight: "700" }}>{coins.balance}</Text>
        </View>
      </View>

      <Pressable
        onPress={() => router.push("/hometown-shop")}
        style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginBottom: 12 }}
      >
        <Text style={{ fontSize: 24 }}>🛍️</Text>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ fontWeight: "700", fontSize: 16 }}>Town Shop</Text>
          <Text style={{ fontSize: 12, color: "#78716C" }}>Monuments, decorations, pawn skins</Text>
        </View>
        <Text style={{ fontSize: 20 }}>→</Text>
      </Pressable>

      <Text style={{ color: "#78716C", marginBottom: 12 }}>
        Tap an empty plot to build. Businesses earn coins daily while your fast streak is alive.
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <Text style={{ fontSize: 28 }}>🪨</Text>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ fontWeight: "700", fontSize: 16 }}>Testimony Plaza</Text>
          <Text style={{ fontSize: 12, color: "#78716C" }}>
            {monumentCount} {monumentCount === 1 ? "testimony" : "testimonies"} raised — like Abraham's altars
          </Text>
        </View>
      </View>

      <View style={{ alignItems: "center", marginBottom: 16 }}>{rows}</View>

      {selectedTile && (
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginTop: 8 }}>
          <Text style={{ fontWeight: "700", marginBottom: 8 }}>
            Build on plot ({selectedTile.x + 1}, {selectedTile.y + 1})
          </Text>
          {(buildingAt(selectedTile.x, selectedTile.y) || decorationAt(selectedTile.x, selectedTile.y) || roadAt(selectedTile.x, selectedTile.y)) && (
            <>
              {(() => {
                const b = buildingAt(selectedTile.x, selectedTile.y);
                if (b && isBuildingOrigin(b, selectedTile.x, selectedTile.y)) {
                  const sellPrice = Math.floor(BUILDINGS[b.type].cost * 0.5);
                  return (
                    <>
                      <Pressable
                        onPress={() => {
                          setMovingBuilding(b);
                          setSelectedTile(null);
                          Alert.alert("Move Mode", "Tap a new location to move this building.");
                        }}
                        style={{ padding: 10, backgroundColor: "#DBEAFE", borderRadius: 10, alignItems: "center", marginBottom: 8 }}
                      >
                        <Text style={{ color: "#1D4ED8", fontWeight: "700" }}>↔️ Move Building</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Alert.alert("Sell Building?", `Sell ${BUILDINGS[b.type].name} for ${sellPrice} coins?`, [
                            { text: "Cancel", style: "cancel" },
                            { text: "Sell", style: "destructive", onPress: () => {
                              saveTown({ ...town, buildings: town.buildings.filter(x => x.id !== b.id) });
                              const updatedCoins = {
                                balance: Math.round((coins.balance + sellPrice) * 10) / 10,
                                lifetimeEarned: coins.lifetimeEarned,
                              };
                              saveCoins(updatedCoins);
                              setSelectedTile(null);
                            }},
                          ]);
                        }}
                        style={{ padding: 10, backgroundColor: "#FEF3C7", borderRadius: 10, alignItems: "center", marginBottom: 8 }}
                      >
                        <Text style={{ color: "#92400E", fontWeight: "700" }}>💰 Sell for {sellPrice}</Text>
                      </Pressable>
                    </>
                  );
                }
                return null;
              })()}
              <Pressable
                onPress={() => {
                  const b = buildingAt(selectedTile.x, selectedTile.y);
                  const d = decorationAt(selectedTile.x, selectedTile.y);
                  const r = roadAt(selectedTile.x, selectedTile.y);
                  if (b && !isBuildingOrigin(b, selectedTile.x, selectedTile.y)) return;
                  if (d) {
                    saveTown({ ...town, decorations: town.decorations.filter(x => x.id !== d.id) });
                    setSelectedTile(null);
                  } else if (r) {
                    saveTown({ ...town, roads: (town.roads || []).filter(x => x.id !== r.id) });
                    setSelectedTile(null);
                  } else if (b) {
                    Alert.alert("Remove Building?", `Remove ${BUILDINGS[b.type].name}? (No refund)`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Remove", style: "destructive", onPress: () => {
                        saveTown({ ...town, buildings: town.buildings.filter(x => x.id !== b.id) });
                        setSelectedTile(null);
                      }},
                    ]);
                  }
                }}
                style={{ padding: 10, backgroundColor: "#FEE2E2", borderRadius: 10, alignItems: "center", marginBottom: 8 }}
              >
                <Text style={{ color: "#DC2626", fontWeight: "700" }}>🗑️ Remove</Text>
              </Pressable>
            </>
          )}
          <Pressable
            onPress={handlePlaceRoad}
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
          >
            <Text style={{ fontSize: 24 }}>🛣️</Text>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ fontWeight: "600" }}>Road</Text>
              <Text style={{ fontSize: 12, color: "#78716C" }}>Connect buildings for earning multiplier</Text>
            </View>
            <Text style={{ fontWeight: "700", color: "#22C55E" }}>FREE</Text>
          </Pressable>
          {availableBuildings.map((type) => {
            const def = BUILDINGS[type];
            const affordable = coins.balance >= def.cost;
            return (
              <Pressable
                key={type}
                onPress={() => handleBuild(type)}
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, opacity: affordable ? 1 : 0.5 }}
              >
                <BuildingArt type={type} size={32} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={{ fontWeight: "600" }}>{def.name}</Text>
                  <Text style={{ fontSize: 12, color: "#78716C" }}>{def.description}</Text>
                </View>
                <Text style={{ fontWeight: "700" }}>🪙{def.cost}</Text>
              </Pressable>
            );
          })}
          {ownedDecorations.length > 0 && (
            <>
              <Text style={{ fontWeight: "700", marginTop: 12, marginBottom: 8 }}>Decorations (owned)</Text>
              {ownedDecorations.map((type) => {
                const def = DECORATIONS[type];
                // Check if already placed
                const alreadyPlaced = town.decorations.some(d => d.type === type);
                if (alreadyPlaced) return null;
                return (
                  <Pressable
                    key={type}
                    onPress={() => handlePlaceDecoration(type)}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
                  >
                    <Text style={{ fontSize: 24 }}>{def.icon}</Text>
                    <Text style={{ marginLeft: 10, flex: 1, fontWeight: "600" }}>{def.name}</Text>
                    <Text style={{ color: "#22C55E", fontWeight: "600" }}>Place</Text>
                  </Pressable>
                );
              })}
            </>
          )}
          <Pressable onPress={() => setSelectedTile(null)} style={{ marginTop: 8, alignItems: "center" }}>
            <Text style={{ color: "#78716C" }}>Cancel</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
