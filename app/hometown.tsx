import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  BUILDINGS,
  COINS_STORAGE_KEY,
  TOWN_GRID_SIZE,
  TOWN_STORAGE_KEY,
  dailyIncomeForTown,
  parseCoins,
  parseTown,
  tierForFastDay,
  type BuildingType,
  type HometownCoins,
  type PlacedBuilding,
  type TownState,
} from "@/lib/hometown";
import { getTodayISOString } from "@/lib/prayercircle-data";

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  if (isNaN(da) || isNaN(db)) return 0;
  return Math.floor((db - da) / 86400000);
}

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `b${Date.now()}${idCounter}`;
}

export default function HometownScreen() {
  const router = useRouter();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [town, setTown] = useState<TownState>({ buildings: [], lastIncomeDate: null });
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [tier] = useState(1); // TODO: derive from active fast day

  const saveTown = useCallback((next: TownState) => {
    setTown(next);
    AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const saveCoins = useCallback((next: HometownCoins) => {
    setCoins(next);
    AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  // Load + collect income on open
  useEffect(() => {
    (async () => {
      try {
        const [coinsRaw, townRaw] = await Promise.all([
          AsyncStorage.getItem(COINS_STORAGE_KEY),
          AsyncStorage.getItem(TOWN_STORAGE_KEY),
        ]);
        const c = parseCoins(coinsRaw ? JSON.parse(coinsRaw) : {});
        let t = parseTown(townRaw ? JSON.parse(townRaw) : {});
        setCoins(c);

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

  const buildingAt = (x: number, y: number): PlacedBuilding | undefined =>
    town.buildings.find((b) => b.x === x && b.y === y);

  const handleTilePress = (x: number, y: number) => {
    const existing = buildingAt(x, y);
    if (existing) {
      if (existing.type === "pawn-house") {
        router.push("/pawn-house");
        return;
      } else {
        const def = BUILDINGS[existing.type];
        Alert.alert(def.name, `${def.description}\n\nEarns ${def.incomePerDay} coins/day while your streak is alive.`);
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
    const building: PlacedBuilding = { id: nextId(), type, x: selectedTile.x, y: selectedTile.y };
    saveTown({ ...town, buildings: [...town.buildings, building] });
    saveCoins({ balance: coins.balance - def.cost, lifetimeEarned: coins.lifetimeEarned });
    setSelectedTile(null);
  };

  const availableBuildings = (Object.keys(BUILDINGS) as BuildingType[]).filter(
    (t) => tier >= BUILDINGS[t].tier
  );

  const cellSize = 40;
  const rows = [];
  for (let y = 0; y < TOWN_GRID_SIZE; y++) {
    const cells = [];
    for (let x = 0; x < TOWN_GRID_SIZE; x++) {
      const b = buildingAt(x, y);
      const isSelected = selectedTile?.x === x && selectedTile?.y === y;
      cells.push(
        <Pressable
          key={`${x}-${y}`}
          onPress={() => handleTilePress(x, y)}
          style={{
            width: cellSize,
            height: cellSize,
            backgroundColor: isSelected ? "#FEF3C7" : b ? "#D1FAE5" : "#F3F4F6",
            borderWidth: 1,
            borderColor: isSelected ? "#F59E0B" : "#E5E7EB",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {b && <Text style={{ fontSize: 22 }}>{BUILDINGS[b.type].icon}</Text>}
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
    <ScrollView style={{ flex: 1, backgroundColor: "#FFFBEB" }} contentContainerStyle={{ padding: 16 }}>
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

      <View style={{ alignItems: "center", marginBottom: 16 }}>{rows}</View>

      {selectedTile && (
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginTop: 8 }}>
          <Text style={{ fontWeight: "700", marginBottom: 8 }}>
            Build on plot ({selectedTile.x + 1}, {selectedTile.y + 1})
          </Text>
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
          <Pressable onPress={() => setSelectedTile(null)} style={{ marginTop: 8, alignItems: "center" }}>
            <Text style={{ color: "#78716C" }}>Cancel</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
