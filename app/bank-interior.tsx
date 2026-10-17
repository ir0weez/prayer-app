import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  BANK_INTERIOR_GRID,
  BANK_MAX_DESKS,
  BANK_MAX_FLOORS,
  COINS_STORAGE_KEY,
  TOWN_STORAGE_KEY,
  bankCarpetColor,
  bankCarpetCost,
  bankCarpetName,
  bankDeskBonusPerDesk,
  bankDeskCost,
  bankDeskName,
  bankFloorCost,
  bankFloorMultiplier,
  bankFloorTheme,
  bankFurnitureCatalog,
  bankFurnitureDef,
  bankInteriorKey,
  connectedDeskCount,
  parseBankInterior,
  parseCoins,
  parseTown,
  type BankFloorInterior,
  type BankFurnitureItem,
  type BankFurnitureType,
  type BankInteriorItem,
  type BankInteriorState,
  type HometownCoins,
  type PlacedBuilding,
} from "@/lib/hometown";
import { completeMission, loadMissions, type Mission } from "@/lib/missions";

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `bi${Date.now()}${idCounter}`;
}

const EMPTY_FLOOR: BankFloorInterior = { desks: [], carpets: [], furniture: [] };

// Tiles that are part of the connected desk network (for highlight)
function activeNetworkTiles(items: { desks: BankInteriorItem[]; carpets: BankInteriorItem[] }): { desks: Set<string>; carpets: Set<string> } {
  const { desks, carpets } = items;
  const carpetSet = new Set(carpets.map((c) => `${c.x},${c.y}`));
  const deskSet = new Set(desks.map((d) => `${d.x},${d.y}`));
  const walkable = new Set([...carpetSet, ...deskSet]);
  const neighbors = (x: number, y: number) => [
    [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1],
  ] as Array<[number, number]>;

  // Find desks that connect to another desk
  const connectedDeskKeys = new Set<string>();
  const deskReach: Map<string, Set<string>> = new Map();
  for (const desk of desks) {
    const key = `${desk.x},${desk.y}`;
    const visited = new Set<string>([key]);
    const queue: Array<[number, number]> = [[desk.x, desk.y]];
    let foundOther = false;
    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!;
      for (const [nx, ny] of neighbors(cx, cy)) {
        const nkey = `${nx},${ny}`;
        if (visited.has(nkey) || !walkable.has(nkey)) continue;
        visited.add(nkey);
        if (deskSet.has(nkey) && nkey !== key) foundOther = true;
        queue.push([nx, ny]);
      }
    }
    deskReach.set(key, visited);
    if (foundOther) connectedDeskKeys.add(key);
  }

  // Active carpets = carpet tiles visited from any connected desk
  const activeCarpets = new Set<string>();
  for (const key of connectedDeskKeys) {
    const visited = deskReach.get(key);
    if (!visited) continue;
    for (const v of visited) {
      if (carpetSet.has(v)) activeCarpets.add(v);
    }
  }
  return { desks: connectedDeskKeys, carpets: activeCarpets };
}

function DeskShape({ connected }: { connected: boolean }) {
  return (
    <View style={{ alignItems: "center" }}>
      {/* desktop surface */}
      <View
        style={{
          width: 30,
          height: 10,
          borderRadius: 2,
          backgroundColor: connected ? "#92400E" : "#B45309",
          borderWidth: connected ? 2 : 0,
          borderColor: "#34D399",
        }}
      />
      {/* legs */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", width: 26 }}>
        <View style={{ width: 4, height: 10, backgroundColor: "#78350F", borderRadius: 1 }} />
        <View style={{ width: 4, height: 10, backgroundColor: "#78350F", borderRadius: 1 }} />
      </View>
    </View>
  );
}

type MoveKind = "desk" | "carpet" | "furniture";

export default function BankInteriorScreen() {
  const router = useRouter();
  const { buildingId } = useLocalSearchParams<{ buildingId?: string }>();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [interior, setInterior] = useState<BankInteriorState>({ floors: {} });
  const [floor, setFloor] = useState(1);
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [moveItem, setMoveItem] = useState<{ id: string; kind: MoveKind } | null>(null);
  const [building, setBuilding] = useState<PlacedBuilding | null>(null);
  const [loaded, setLoaded] = useState(false);

  const storageKey = buildingId ? bankInteriorKey(buildingId) : null;
  const numFloors = building?.type === "bank-tower" ? Math.min(Math.max(building.floors || 1, 1), BANK_MAX_FLOORS) : 1;
  const safeFloor = Math.min(Math.max(floor, 1), numFloors);

  const saveInterior = useCallback(
    (next: BankInteriorState) => {
      setInterior(next);
      if (storageKey) AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => undefined);
    },
    [storageKey]
  );

  const saveFloor = useCallback(
    (f: number, next: BankFloorInterior) => {
      const nf: BankInteriorState = { floors: { ...interior.floors, [String(f)]: next } };
      saveInterior(nf);
    },
    [interior, saveInterior]
  );

  const saveCoins = useCallback((next: HometownCoins) => {
    setCoins(next);
    AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const floorInterior: BankFloorInterior = interior.floors[String(safeFloor)] ?? EMPTY_FLOOR;

  const handleAddFloor = useCallback(async () => {
    if (!building || building.type !== "bank-tower") return;
    const current = building.floors || 1;
    if (current >= BANK_MAX_FLOORS) return;
    const cost = bankFloorCost(current);
    if (coins.balance < cost) {
      Alert.alert("Not enough coins", `Adding floor ${current + 1} costs ${cost} coins.`);
      return;
    }
    try {
      const townRaw = await AsyncStorage.getItem(TOWN_STORAGE_KEY);
      const town = parseTown(townRaw ? JSON.parse(townRaw) : {});
      let updated: PlacedBuilding | null = null;
      for (const mapId of Object.keys(town.maps) as Array<keyof typeof town.maps>) {
        town.maps[mapId].buildings = town.maps[mapId].buildings.map((b) => {
          if (b.id === building!.id) {
            updated = { ...b, floors: current + 1 };
            return updated;
          }
          return b;
        });
      }
      await AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(town));
      if (updated) setBuilding(updated);
      saveCoins({ balance: Math.round((coins.balance - cost) * 10) / 10, lifetimeEarned: coins.lifetimeEarned });
    } catch {}
  }, [building, coins, saveCoins]);

  useEffect(() => {
    (async () => {
      try {
        const [coinsRaw, interiorRaw, missions, townRaw] = await Promise.all([
          AsyncStorage.getItem(COINS_STORAGE_KEY),
          storageKey ? AsyncStorage.getItem(storageKey) : null,
          loadMissions(),
          AsyncStorage.getItem(TOWN_STORAGE_KEY),
        ]);
        setCoins(parseCoins(coinsRaw ? JSON.parse(coinsRaw) : {}));
        // Find this building for floor management (bank-tower only)
        try {
          const town = parseTown(townRaw ? JSON.parse(townRaw) : {});
          outer: for (const mapId of Object.keys(town.maps) as Array<keyof typeof town.maps>) {
            const found = town.maps[mapId].buildings.find((b) => b.id === buildingId);
            if (found) { setBuilding(found); break outer; }
          }
        } catch {}
        setInterior(parseBankInterior(interiorRaw ? JSON.parse(interiorRaw) : {}));
        // Complete the bank-visit mission on entry
        const visit = missions.find((m: Mission) => m.type === "bank-visit" && !m.completed);
        if (visit) await completeMission(visit.id);
      } catch {}
      setLoaded(true);
    })();
  }, [storageKey]);

  // Totals across ALL floors for the banner
  const totals = useMemo(() => {
    let mult = 1;
    let flat = 0;
    let connectedTotal = 0;
    let furnitureCount = 0;
    for (let f = 1; f <= numFloors; f++) {
      const fi = interior.floors[String(f)] ?? EMPTY_FLOOR;
      const c = connectedDeskCount(fi);
      connectedTotal += c;
      mult += c * bankDeskBonusPerDesk(f);
      for (const item of fi.furniture) {
        const def = bankFurnitureDef(item.type, f);
        if (!def) continue;
        mult += def.effectPct / 100;
        flat += def.flatPerDay;
        furnitureCount += 1;
      }
    }
    return { mult, flat, connectedTotal, furnitureCount };
  }, [interior, numFloors]);

  const network = useMemo(() => activeNetworkTiles(floorInterior), [floorInterior]);
  const catalog = useMemo(() => bankFurnitureCatalog(safeFloor), [safeFloor]);
  const deskCost = bankDeskCost(safeFloor);
  const carpetCost = bankCarpetCost(safeFloor);
  const deskName = bankDeskName(safeFloor);
  const carpetName = bankCarpetName(safeFloor);
  const carpetColor = bankCarpetColor(safeFloor);
  const deskBonusPct = Math.round(bankDeskBonusPerDesk(safeFloor) * 100);

  const itemAt = (x: number, y: number): (BankInteriorItem & { kind: MoveKind }) | (BankFurnitureItem & { kind: "furniture" }) | undefined =>
    (floorInterior.desks.find((d) => d.x === x && d.y === y) as (BankInteriorItem & { kind: MoveKind }) | undefined) ??
    (floorInterior.carpets.find((c) => c.x === x && c.y === y) as (BankInteriorItem & { kind: MoveKind }) | undefined) ??
    (floorInterior.furniture.find((f) => f.x === x && f.y === y)
      ? { ...floorInterior.furniture.find((f) => f.x === x && f.y === y)!, kind: "furniture" as const }
      : undefined);

  const moveKindLabel = (kind: MoveKind) =>
    kind === "desk" ? deskName : kind === "carpet" ? carpetName : "Furniture";

  const handleTilePress = (x: number, y: number) => {
    // --- Move mode ---
    if (moveItem) {
      const existing = itemAt(x, y);
      if (existing && existing.id === moveItem.id) {
        // tapped the item itself: put it back (cancel)
        setMoveItem(null);
        return;
      }
      if (existing) {
        // different occupied tile: cancel move mode
        setMoveItem(null);
        return;
      }
      // empty destination: move it (free — already paid)
      if (moveItem.kind === "desk") {
        saveFloor(safeFloor, {
          ...floorInterior,
          desks: floorInterior.desks.map((d) => (d.id === moveItem.id ? { ...d, x, y } : d)),
        });
      } else if (moveItem.kind === "carpet") {
        saveFloor(safeFloor, {
          ...floorInterior,
          carpets: floorInterior.carpets.map((c) => (c.id === moveItem.id ? { ...c, x, y } : c)),
        });
      } else {
        saveFloor(safeFloor, {
          ...floorInterior,
          furniture: floorInterior.furniture.map((f) => (f.id === moveItem.id ? { ...f, x, y } : f)),
        });
      }
      setMoveItem(null);
      return;
    }
    // --- Normal mode ---
    const existing = itemAt(x, y);
    if (existing) {
      if (existing.kind === "furniture") {
        const def = bankFurnitureDef(existing.type, safeFloor);
        Alert.alert(
          def?.name ?? "Furniture",
          `${def?.blurb ?? ""}${def?.blurb ? "\n" : ""}Sells back for full price.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Move",
              onPress: () => {
                setSelectedTile(null);
                setMoveItem({ id: existing.id, kind: "furniture" });
              },
            },
            {
              text: `Sell 🪙${existing.cost}`,
              onPress: () => {
                saveFloor(safeFloor, {
                  ...floorInterior,
                  furniture: floorInterior.furniture.filter((f) => f.id !== existing.id),
                });
                saveCoins({ balance: coins.balance + existing.cost, lifetimeEarned: coins.lifetimeEarned });
              },
            },
          ]
        );
        return;
      }
      if (existing.kind === "carpet") {
        const refund = existing.cost ?? 5; // legacy carpets cost 5 coins
        Alert.alert(
          carpetName,
          `${carpetName} connects desks together.\nSells back for full price.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Move",
              onPress: () => {
                setSelectedTile(null);
                setMoveItem({ id: existing.id, kind: "carpet" });
              },
            },
            {
              text: `Sell 🪙${refund}`,
              onPress: () => {
                saveFloor(safeFloor, {
                  ...floorInterior,
                  carpets: floorInterior.carpets.filter((c) => c.id !== existing.id),
                });
                saveCoins({ balance: coins.balance + refund, lifetimeEarned: coins.lifetimeEarned });
              },
            },
          ]
        );
        return;
      }
      Alert.alert(
        deskName,
        `${deskName}s connected by ${carpetName.toLowerCase()} to another desk earn +${deskBonusPct}% each.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Move",
            onPress: () => {
              setSelectedTile(null);
              setMoveItem({ id: existing.id, kind: "desk" });
            },
          },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              saveFloor(safeFloor, {
                ...floorInterior,
                desks: floorInterior.desks.filter((d) => d.id !== existing.id),
              });
            },
          },
        ]
      );
      return;
    }
    setSelectedTile({ x, y });
  };

  const handleTileLongPress = (x: number, y: number) => {
    if (moveItem) {
      // long-press also confirms/cancels during move mode
      handleTilePress(x, y);
      return;
    }
    const existing = itemAt(x, y);
    if (!existing) return;
    // pick up the item — enters move mode
    setSelectedTile(null);
    setMoveItem({ id: existing.id, kind: existing.kind });
  };

  const handlePlace = (kind: "desk" | "carpet") => {
    if (!selectedTile) return;
    const cost = kind === "desk" ? deskCost : carpetCost;
    if (kind === "desk" && floorInterior.desks.length >= BANK_MAX_DESKS) {
      Alert.alert("Max desks", `Each floor can hold ${BANK_MAX_DESKS} desks.`);
      return;
    }
    if (coins.balance < cost) {
      Alert.alert("Not enough coins", `You need ${cost} coins.`);
      return;
    }
    const item: BankInteriorItem = { id: nextId(), kind, x: selectedTile.x, y: selectedTile.y, cost };
    if (kind === "desk") {
      saveFloor(safeFloor, { ...floorInterior, desks: [...floorInterior.desks, item] });
    } else {
      saveFloor(safeFloor, { ...floorInterior, carpets: [...floorInterior.carpets, item] });
    }
    saveCoins({ balance: coins.balance - cost, lifetimeEarned: coins.lifetimeEarned });
    setSelectedTile(null);
  };

  const handlePlaceFurniture = (type: BankFurnitureType) => {
    if (!selectedTile) return;
    const def = catalog.find((d) => d.type === type);
    if (!def) return;
    const count = floorInterior.furniture.filter((f) => f.type === type).length;
    if (count >= def.max) {
      Alert.alert("Max reached", `Each floor can hold ${def.max} × ${def.name}.`);
      return;
    }
    if (coins.balance < def.cost) {
      Alert.alert("Not enough coins", `You need ${def.cost} coins.`);
      return;
    }
    const item: BankFurnitureItem = { id: nextId(), type, x: selectedTile.x, y: selectedTile.y, cost: def.cost };
    saveFloor(safeFloor, { ...floorInterior, furniture: [...floorInterior.furniture, item] });
    saveCoins({ balance: coins.balance - def.cost, lifetimeEarned: coins.lifetimeEarned });
    setSelectedTile(null);
  };

  const cellSize = 40;
  const { w, h } = BANK_INTERIOR_GRID;
  // Current tile of the item being moved (for origin highlight)
  const movingTile = moveItem
    ? (moveItem.kind === "desk"
        ? floorInterior.desks.find((d) => d.id === moveItem.id)
        : moveItem.kind === "carpet"
          ? floorInterior.carpets.find((c) => c.id === moveItem.id)
          : floorInterior.furniture.find((f) => f.id === moveItem.id))
    : undefined;
  const rows = [];
  for (let y = 0; y < h; y++) {
    const cells = [];
    for (let x = 0; x < w; x++) {
      const item = itemAt(x, y);
      const key = `${x},${y}`;
      const isSelected = selectedTile?.x === x && selectedTile?.y === y;
      const isActiveCarpet = item?.kind === "carpet" && network.carpets.has(key);
      const isConnectedDesk = item?.kind === "desk" && network.desks.has(key);
      const isMovingOrigin = !!moveItem && movingTile?.x === x && movingTile?.y === y;
      const isMoveTarget = !!moveItem && !item && !isMovingOrigin;
      const bgColor = isMovingOrigin
        ? "#DBEAFE" // picked-up item's tile: blue tint
        : isMoveTarget
          ? "#ECFDF5" // valid destination: green glow
          : isSelected
            ? "#FEF3C7"
            : item?.kind === "carpet"
              ? isActiveCarpet
                ? "#A7F3D0" // active network carpet: green tint
                : carpetColor // tier-themed carpet
              : "#F5F1E8"; // floor
      const borderColor = isMovingOrigin
        ? "#2563EB"
        : isMoveTarget
          ? "#6EE7B7"
          : isSelected
            ? "#F59E0B"
            : isActiveCarpet
              ? "#34D399"
              : "#E7DCC8";
      cells.push(
        <Pressable
          key={key}
          onPress={() => handleTilePress(x, y)}
          onLongPress={() => handleTileLongPress(x, y)}
          style={{
            width: cellSize,
            height: cellSize,
            backgroundColor: bgColor,
            borderWidth: isMovingOrigin || isMoveTarget ? 2 : 1,
            borderColor,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {item?.kind === "desk" && (
            <View style={{ opacity: isMovingOrigin ? 0.4 : 1 }}>
              <DeskShape connected={isConnectedDesk} />
            </View>
          )}
          {item?.kind === "furniture" && (
            <Text style={{ fontSize: 22, opacity: isMovingOrigin ? 0.4 : 1 }}>
              {bankFurnitureDef(item.type, safeFloor)?.icon ?? "🪑"}
            </Text>
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

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: "#FDF6E3" }} />;
  }

  const themeName = bankFloorTheme(safeFloor);
  const desksMaxed = floorInterior.desks.length >= BANK_MAX_DESKS;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FDF6E3" }} contentContainerStyle={{ padding: 16, paddingTop: 48 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <MaterialIcons name="arrow-back" size={24} color="#1C1917" />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#1C1917" }}>Bank Interior</Text>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ fontSize: 16 }}>🪙</Text>
          <Text style={{ marginLeft: 6, fontWeight: "700", color: "#1C1917" }}>{coins.balance}</Text>
        </View>
      </View>

      {/* Bonus banner */}
      <View style={{ backgroundColor: "#1C1917", borderRadius: 12, padding: 12, marginBottom: 12, flexDirection: "row", alignItems: "center" }}>
        <MaterialIcons name="trending-up" size={24} color="#4ADE80" />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>
            Interior bonus: ×{totals.mult.toFixed(2)}
            {totals.flat > 0 && <Text style={{ color: "#4ADE80" }}> + {totals.flat}/day</Text>}
          </Text>
          <Text style={{ color: "#A8A29E", fontSize: 12 }}>
            {totals.connectedTotal === 0 && totals.furnitureCount === 0
              ? "Place desks, connect them with carpet, and add furniture to boost this bank's earnings."
              : `${totals.connectedTotal} connected desk${totals.connectedTotal === 1 ? "" : "s"} · ${totals.furnitureCount} furniture boosting earnings.`}
          </Text>
        </View>
      </View>

      {building?.type === "bank-tower" && (() => {
        const fl = building.floors || 1;
        const maxed = fl >= BANK_MAX_FLOORS;
        const cost = bankFloorCost(fl);
        const canAfford = coins.balance >= cost;
        return (
          <View style={{ backgroundColor: "#1E3A8A", borderRadius: 12, padding: 12, marginBottom: 12, flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name="apartment" size={24} color="#FDE68A" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>
                {fl}/{BANK_MAX_FLOORS} floors · ×{bankFloorMultiplier(fl).toFixed(1)} earnings
              </Text>
              <Text style={{ color: "#BFDBFE", fontSize: 12 }}>
                {maxed ? "Tower complete! Maximum height reached." : `Each floor adds +50% to this tower's income.`}
              </Text>
            </View>
            {!maxed && (
              <Pressable
                onPress={handleAddFloor}
                disabled={!canAfford}
                style={{ backgroundColor: canAfford ? "#FDE68A" : "#4B5563", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, opacity: canAfford ? 1 : 0.6 }}
              >
                <Text style={{ fontWeight: "800", color: canAfford ? "#1E3A8A" : "#D1D5DB", fontSize: 13 }}>
                  +Floor 🪙{cost}
                </Text>
              </Pressable>
            )}
          </View>
        );
      })()}

      {/* Floor selector */}
      {numFloors > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: "row" }}>
            {Array.from({ length: numFloors }, (_, i) => i + 1).map((f) => {
              const active = f === safeFloor;
              return (
                <Pressable
                  key={f}
                  onPress={() => { setFloor(f); setSelectedTile(null); if (moveItem) setMoveItem(null); }}
                  style={{
                    backgroundColor: active ? "#1C1917" : "#FFFFFF",
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor: active ? "#1C1917" : "#E7DCC8",
                  }}
                >
                  <Text style={{ fontWeight: "800", color: active ? "#FFFFFF" : "#1C1917", fontSize: 13 }}>
                    Floor {f}
                  </Text>
                  <Text style={{ color: active ? "#A8A29E" : "#78716C", fontSize: 11 }}>
                    {bankFloorTheme(f)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      <View style={{ alignItems: "center", marginBottom: 8 }}>
        <Text style={{ color: "#78716C", fontSize: 12, marginBottom: 6 }}>
          Floor {safeFloor} · {themeName}
        </Text>
      </View>
      <View style={{ alignItems: "center", marginBottom: 16 }}>{rows}</View>

      {moveItem ? (
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12 }}>
          <Text style={{ fontWeight: "700", marginBottom: 4, color: "#1C1917" }}>
            Moving {moveKindLabel(moveItem.kind)} — tap a glowing tile to place it
          </Text>
          <Text style={{ color: "#78716C", fontSize: 13, marginBottom: 8 }}>
            Moving is free. Tap the item again to put it back where it was.
          </Text>
          <Pressable onPress={() => setMoveItem(null)} style={{ alignItems: "center" }}>
            <Text style={{ color: "#2563EB", fontWeight: "700" }}>Cancel move</Text>
          </Pressable>
        </View>
      ) : selectedTile ? (
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12 }}>
          <Text style={{ fontWeight: "700", marginBottom: 8, color: "#1C1917" }}>
            Place on tile ({selectedTile.x}, {selectedTile.y}) — Floor {safeFloor} · {themeName}
          </Text>
          <Pressable
            onPress={() => handlePlace("desk")}
            disabled={coins.balance < deskCost || desksMaxed}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 10,
              opacity: coins.balance < deskCost || desksMaxed ? 0.5 : 1,
            }}
          >
            <View style={{ width: 32, alignItems: "center" }}>
              <DeskShape connected={false} />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ fontWeight: "600", color: "#1C1917" }}>
                {deskName} ({floorInterior.desks.length}/{BANK_MAX_DESKS})
              </Text>
              <Text style={{ color: "#78716C", fontSize: 12 }}>+{deskBonusPct}% each when connected</Text>
            </View>
            <Text style={{ fontWeight: "700", color: "#1C1917" }}>🪙{deskCost}</Text>
          </Pressable>
          <Pressable
            onPress={() => handlePlace("carpet")}
            disabled={coins.balance < carpetCost}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 10,
              opacity: coins.balance < carpetCost ? 0.5 : 1,
            }}
          >
            <View style={{ width: 32, height: 24, borderRadius: 4, backgroundColor: carpetColor, borderWidth: 1, borderColor: "#D6C9B0" }} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ fontWeight: "600", color: "#1C1917" }}>{carpetName}</Text>
              <Text style={{ color: "#78716C", fontSize: 12 }}>Connects desks · sells back full price</Text>
            </View>
            <Text style={{ fontWeight: "700", color: "#1C1917" }}>🪙{carpetCost}</Text>
          </Pressable>

          <Text style={{ fontWeight: "700", marginTop: 8, marginBottom: 4, color: "#1C1917" }}>Furniture</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row" }}>
              {catalog.map((def) => {
                const count = floorInterior.furniture.filter((f) => f.type === def.type).length;
                const maxed = count >= def.max;
                const afford = coins.balance >= def.cost;
                const disabled = maxed || !afford;
                return (
                  <Pressable
                    key={def.type}
                    onPress={() => handlePlaceFurniture(def.type)}
                    disabled={disabled}
                    style={{
                      width: 96,
                      backgroundColor: "#FDF6E3",
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "#E7DCC8",
                      padding: 8,
                      marginRight: 8,
                      alignItems: "center",
                      opacity: disabled ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{def.icon}</Text>
                    <Text style={{ fontWeight: "700", fontSize: 11, color: "#1C1917", textAlign: "center", marginTop: 4 }} numberOfLines={2}>
                      {def.name}
                    </Text>
                    <Text style={{ fontSize: 10, color: "#78716C", marginTop: 2 }}>{def.blurb}</Text>
                    <Text style={{ fontSize: 10, color: "#78716C", marginTop: 2 }}>
                      {count}/{def.max}
                    </Text>
                    <Text style={{ fontWeight: "700", fontSize: 12, color: "#1C1917", marginTop: 2 }}>
                      🪙{def.cost}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Pressable onPress={() => setSelectedTile(null)} style={{ marginTop: 8, alignItems: "center" }}>
            <Text style={{ color: "#78716C" }}>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={{ color: "#78716C", textAlign: "center", fontSize: 13 }}>
          Tap an empty tile to place desks, {carpetName.toLowerCase()}s, or furniture.{"\n"}
          Long-press any item to move it. Tap furniture or {carpetName.toLowerCase()}s to sell them back.
        </Text>
      )}
    </ScrollView>
  );
}
