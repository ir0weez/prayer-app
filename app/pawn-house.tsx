import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  COINS_STORAGE_KEY,
  FURNITURE,
  HOUSE_EXPAND_COSTS,
  PAWN_HOUSE_STORAGE_KEY,
  parseCoins,
  parsePawnHouse,
  type FurnitureType,
  type HometownCoins,
  type PawnHouseState,
  type PlacedFurniture,
} from "@/lib/hometown";

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `f${Date.now()}${idCounter}`;
}

export default function PawnHouseScreen() {
  const router = useRouter();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [house, setHouse] = useState<PawnHouseState>({ furniture: [], size: 4 });
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);

  const saveHouse = useCallback((next: PawnHouseState) => {
    setHouse(next);
    AsyncStorage.setItem(PAWN_HOUSE_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const saveCoins = useCallback((next: HometownCoins) => {
    setCoins(next);
    AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [coinsRaw, houseRaw] = await Promise.all([
          AsyncStorage.getItem(COINS_STORAGE_KEY),
          AsyncStorage.getItem(PAWN_HOUSE_STORAGE_KEY),
        ]);
        setCoins(parseCoins(coinsRaw ? JSON.parse(coinsRaw) : {}));
        setHouse(parsePawnHouse(houseRaw ? JSON.parse(houseRaw) : {}));
      } catch {}
    })();
  }, []);

  const furnitureAt = (x: number, y: number): PlacedFurniture | undefined =>
    house.furniture.find((f) => f.x === x && f.y === y);

  const handleTilePress = (x: number, y: number) => {
    const existing = furnitureAt(x, y);
    if (existing) {
      Alert.alert(
        FURNITURE[existing.type].name,
        "Remove this furniture?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              saveHouse({ ...house, furniture: house.furniture.filter((f) => f.id !== existing.id) });
            },
          },
        ]
      );
      return;
    }
    setSelectedTile({ x, y });
  };

  const handlePlace = (type: FurnitureType) => {
    if (!selectedTile) return;
    const def = FURNITURE[type];
    if (coins.balance < def.cost) {
      Alert.alert("Not enough coins", `You need ${def.cost} coins.`);
      return;
    }
    const item: PlacedFurniture = { id: nextId(), type, x: selectedTile.x, y: selectedTile.y };
    saveHouse({ ...house, furniture: [...house.furniture, item] });
    saveCoins({ balance: coins.balance - def.cost, lifetimeEarned: coins.lifetimeEarned });
    setSelectedTile(null);
  };

  const handleExpand = () => {
    const cost = HOUSE_EXPAND_COSTS[house.size];
    if (!cost) {
      Alert.alert("Max size", "Your house is already at maximum size!");
      return;
    }
    if (coins.balance < cost) {
      Alert.alert("Not enough coins", `Expansion costs ${cost} coins.`);
      return;
    }
    const newSize = house.size === 4 ? 6 : 8;
    Alert.alert(
      "Expand House",
      `Expand from ${house.size}x${house.size} to ${newSize}x${newSize} for ${cost} coins?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Expand",
          onPress: () => {
            saveHouse({ ...house, size: newSize });
            saveCoins({ balance: coins.balance - cost, lifetimeEarned: coins.lifetimeEarned });
          },
        },
      ]
    );
  };

  const cellSize = 44;
  const rows = [];
  for (let y = 0; y < house.size; y++) {
    const cells = [];
    for (let x = 0; x < house.size; x++) {
      const f = furnitureAt(x, y);
      const isSelected = selectedTile?.x === x && selectedTile?.y === y;
      cells.push(
        <Pressable
          key={`${x}-${y}`}
          onPress={() => handleTilePress(x, y)}
          style={{
            width: cellSize,
            height: cellSize,
            backgroundColor: isSelected ? "#FEF3C7" : f ? "#D1FAE5" : "#FAF5EB",
            borderWidth: 1,
            borderColor: isSelected ? "#F59E0B" : "#E7DCC8",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {f && <Text style={{ fontSize: 24 }}>{FURNITURE[f.type].icon}</Text>}
        </Pressable>
      );
    }
    rows.push(
      <View key={y} style={{ flexDirection: "row" }}>
        {cells}
      </View>
    );
  }

  const expandCost = HOUSE_EXPAND_COSTS[house.size];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FDF6E3" }} contentContainerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>🏡 Pawn House</Text>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ fontSize: 16 }}>🪙</Text>
          <Text style={{ marginLeft: 6, fontWeight: "700" }}>{coins.balance}</Text>
        </View>
      </View>

      <Text style={{ color: "#78716C", marginBottom: 12 }}>
        Your pawn's cozy home. Tap a tile to place furniture.
      </Text>

      <View style={{ alignItems: "center", marginBottom: 16 }}>{rows}</View>

      {expandCost && (
        <Pressable
          onPress={handleExpand}
          style={{ backgroundColor: "#F59E0B", borderRadius: 12, padding: 12, alignItems: "center", marginBottom: 12 }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
            Expand to {house.size === 4 ? "6x6" : "8x8"} — 🪙{expandCost}
          </Text>
        </Pressable>
      )}

      {selectedTile && (
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12 }}>
          <Text style={{ fontWeight: "700", marginBottom: 8 }}>Place furniture</Text>
          {(Object.keys(FURNITURE) as FurnitureType[]).map((type) => {
            const def = FURNITURE[type];
            const affordable = coins.balance >= def.cost;
            return (
              <Pressable
                key={type}
                onPress={() => handlePlace(type)}
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, opacity: affordable ? 1 : 0.5 }}
              >
                <Text style={{ fontSize: 24 }}>{def.icon}</Text>
                <Text style={{ marginLeft: 10, flex: 1, fontWeight: "600" }}>{def.name}</Text>
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
