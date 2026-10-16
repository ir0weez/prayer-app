import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
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

export default function HometownScreen() {
  const router = useRouter();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [town, setTown] = useState<TownState>({ buildings: [], decorations: [], roads: [], lastIncomeDate: null });
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
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
                accumulated: (b.accumulated || 0) + (hoursElapsed * 0.5 * multiplier),
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
      balance: coins.balance + amount,
      lifetimeEarned: coins.lifetimeEarned + amount,
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
          {b && (b.accumulated || 0) > 0 && (
            <Pressable
              onPress={() => handleCollectBuilding(b.id)}
              style={{ position: "absolute", top: -8, right: -8, zIndex: 10, alignItems: "center" }}
            >
              <View style={{ backgroundColor: "#FEF3C7", borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: "#F59E0B" }}>
                <Text style={{ fontSize: 12 }}>🪙</Text>
              </View>
              <Text style={{ fontSize: 9, fontWeight: "700", color: "#92400E", marginTop: 1 }}>
                +{(b.accumulated || 0).toFixed(1)}
              </Text>
            </Pressable>
          )}
          {b && isOrigin && (
            <View style={{ alignItems: "center", width: cellSize * footprint.w, height: cellSize * footprint.h, justifyContent: "center" }}>
              <Text style={{ fontSize: 22 * Math.max(footprint.w, footprint.h) * 0.7 }}>{BUILDINGS[b.type].icon}</Text>
              {(b.level || 1) > 1 && (
                <Text style={{ fontSize: 8, color: "#F59E0B", fontWeight: "700" }}>
                  {"★".repeat(b.level || 1)}
                </Text>
              )}
              {(b.type === "house" || b.type === "pawn-house") && (
                <Text style={{ fontSize: 12, marginTop: -4 }}>{b.type === "pawn-house" ? "🐾" : townsfolkFor(b.id)}</Text>
              )}
              {WORKERS[b.type] && (
                <Text style={{ fontSize: 12, marginTop: -4 }}>{WORKERS[b.type]}</Text>
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
                <Text style={{ fontSize: 24 }}>{def.icon}</Text>
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
