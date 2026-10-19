import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
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
  storageCapFor,
  storageUpgradeCostFor,
  type BankFloorInterior,
  type BankFurnitureItem,
  type BankFurnitureType,
  type BankInteriorItem,
  type BankInteriorState,
  type HometownCoins,
  type PlacedBuilding,
} from "@/lib/hometown";
import { completeMission, loadMissions, type Mission } from "@/lib/missions";
import { HolidayInteriorOverlay } from "@/components/holiday-decor";
import { getHolidaySeason } from "@/lib/seasons";

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

const VISITOR_COLORS = ["#F9A8D4", "#93C5FD", "#86EFAC", "#FDE68A", "#C4B5FD", "#FDBA74"];

/** Decorative wall band by bank building level — the room itself gets richer.
 *  L1: plain. L2: wainscoting + wall clock. L3: chandelier + framed art. */
function BankLevelDecor({ level }: { level: number }) {
  if (level < 2) return null;
  return (
    <View style={{ alignItems: "center", marginBottom: 8 }}>
      {level >= 3 && (
        <View style={{ alignItems: "center", marginBottom: 4 }}>
          <View style={{ width: 3, height: 22, backgroundColor: "#8B5E34" }} />
          <View
            style={{
              width: 110,
              height: 22,
              borderRadius: 11,
              backgroundColor: "#8B5E34",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-evenly",
              paddingHorizontal: 10,
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ alignItems: "center" }}>
                <View style={{ width: 6, height: 8, borderRadius: 3, backgroundColor: "#FFB84D" }} />
                <View style={{ width: 7, height: 10, borderRadius: 3, backgroundColor: "#FFF9F0", marginTop: -2 }} />
              </View>
            ))}
          </View>
          <View style={{ width: 130, height: 20, borderRadius: 10, backgroundColor: "#FFB84D", opacity: 0.2, marginTop: -28 }} />
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", paddingHorizontal: 12 }}>
        {/* wainscoting strip */}
        <View style={{ flex: 1, height: 26, backgroundColor: "#6B4A2B", borderRadius: 4, marginRight: 8, borderWidth: 1, borderColor: "#54371F" }}>
          <View style={{ height: 3, backgroundColor: "#8B5E34", marginTop: 4, marginHorizontal: 6, borderRadius: 2 }} />
        </View>
        {/* wall clock */}
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", borderWidth: 3, borderColor: "#8B5E34", alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 3, height: 12, backgroundColor: "#1C1917", marginTop: -10 }} />
          <View style={{ width: 8, height: 3, backgroundColor: "#1C1917", marginLeft: 6, marginTop: -3 }} />
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#B8860B", marginTop: -4 }} />
        </View>
        <View style={{ flex: 1, height: 26, backgroundColor: "#6B4A2B", borderRadius: 4, marginLeft: 8, borderWidth: 1, borderColor: "#54371F" }}>
          <View style={{ height: 3, backgroundColor: "#8B5E34", marginTop: 4, marginHorizontal: 6, borderRadius: 2 }} />
        </View>
        {/* framed art at L3 */}
        {level >= 3 && (
          <View style={{ width: 56, height: 44, borderRadius: 4, backgroundColor: "#1E3A8A", borderWidth: 4, borderColor: "#B8860B", marginLeft: 8, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="account-balance" size={20} color="#FDE68A" />
          </View>
        )}
      </View>
    </View>
  );
}

/** Tiny storage fill bar under an ATM/vault tile. Shows FULL when capped. */
function StorageBar({ pending, cap }: { pending: number; cap: number }) {
  const fill = cap > 0 ? Math.min(1, pending / cap) : 0;
  const isFull = pending >= cap && cap > 0;
  return (
    <View style={{ alignItems: "center", marginTop: 1 }}>
      <View
        style={{
          width: 30,
          height: 4,
          borderRadius: 2,
          backgroundColor: "#E7DCC8",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${Math.round(fill * 100)}%`,
            height: 4,
            borderRadius: 2,
            backgroundColor: isFull ? "#EF4444" : "#FBBF24",
          }}
        />
      </View>
      {isFull && (
        <Text style={{ fontSize: 7, fontWeight: "900", color: "#EF4444", marginTop: 0 }}>
          FULL
        </Text>
      )}
    </View>
  );
}

/** Tiny pulsing coin that sits on an ATM/vault with uncollected drip coins. Tap to collect. */
function DripCoin({ amount, onCollect }: { amount: number; onCollect: () => void }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const label = amount >= 10 ? `${Math.round(amount)}` : `${Math.round(amount * 10) / 10}`;
  return (
    <Pressable
      onPress={onCollect}
      style={{ position: "absolute", right: 1, top: -4, alignItems: "center", zIndex: 5 }}
    >
      <Animated.View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: "#FBBF24",
          borderWidth: 2,
          borderColor: "#B45309",
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale }],
          shadowColor: "#B45309",
          shadowOpacity: 0.35,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: "900", color: "#92400E" }}>¢</Text>
      </Animated.View>
      <Text style={{ fontSize: 9, fontWeight: "800", color: "#92400E", marginTop: 1 }}>+{label}</Text>
    </Pressable>
  );
}

/** Tiny visitor NPCs wandering the bank floor (prefer carpet tiles). Purely visual. */
function BankInteriorVisitors({
  floorInterior,
  cellSize,
  w,
  h,
  count,
}: {
  floorInterior: BankFloorInterior;
  cellSize: number;
  w: number;
  h: number;
  count: number;
}) {
  const logicRef = useRef<Record<string, { pos: Animated.ValueXY; bob: Animated.Value; px: number; py: number; anim: Animated.CompositeAnimation | null; waitUntil: number }>>({});
  const [, force] = useState(0);

  const spots = useMemo(() => {
    const carpets = floorInterior.carpets.map((c) => ({ x: c.x, y: c.y }));
    if (carpets.length > 0) return carpets;
    const all: { x: number; y: number }[] = [];
    for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) all.push({ x, y });
    return all;
  }, [floorInterior.carpets, w, h]);
  const spotsRef = useRef(spots);
  spotsRef.current = spots;

  useEffect(() => {
    const toPx = (t: { x: number; y: number }) => ({ x: (t.x + 0.5) * cellSize, y: (t.y + 0.5) * cellSize });
    const logic = logicRef.current;
    const ids: string[] = [];
    for (let i = 0; i < Math.max(0, Math.min(3, count)); i++) ids.push(`biv${i}`);

    for (const id of ids) {
      if (!logic[id]) {
        const start = spotsRef.current[Math.floor(Math.random() * spotsRef.current.length)] ?? { x: 0, y: 0 };
        const p = toPx(start);
        const bob = new Animated.Value(0);
        const bobDur = 900 + Math.random() * 600;
        Animated.loop(
          Animated.sequence([
            Animated.timing(bob, { toValue: 1, duration: bobDur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(bob, { toValue: 0, duration: bobDur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ])
        ).start();
        logic[id] = {
          pos: new Animated.ValueXY(p),
          bob,
          px: p.x,
          py: p.y,
          anim: null,
          waitUntil: Date.now() + 1000 + Math.random() * 3000,
        };
      }
    }
    for (const id of Object.keys(logic)) {
      if (!ids.includes(id)) {
        logic[id].anim?.stop();
        delete logic[id];
      }
    }
    force((n) => n + 1);

    const step = (id: string) => {
      const v = logic[id];
      if (!v) return;
      const dest = spotsRef.current[Math.floor(Math.random() * spotsRef.current.length)];
      if (!dest) return;
      const p = toPx(dest);
      const dist = Math.hypot(p.x - v.px, p.y - v.py);
      const duration = Math.max(400, (dist / 34) * 1000);
      v.anim?.stop();
      v.anim = Animated.timing(v.pos, {
        toValue: { x: p.x, y: p.y },
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      v.anim.start(({ finished }) => {
        if (!finished) return;
        v.px = p.x;
        v.py = p.y;
        v.waitUntil = Date.now() + 2000 + Math.random() * 3000;
      });
    };

    // Wander driver: each visitor walks to a random spot, waits, walks again.
    const stops = ids.map((id) => {
      let alive = true;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const loop = () => {
        if (!alive || !logic[id]) return;
        step(id);
        const check = () => {
          if (!alive || !logic[id]) return;
          if (Date.now() >= logic[id].waitUntil) loop();
          else timer = setTimeout(check, 600);
        };
        timer = setTimeout(check, 600);
      };
      timer = setTimeout(loop, 1200 + Math.random() * 2500);
      return () => {
        alive = false;
        if (timer) clearTimeout(timer);
      };
    });
    return () => {
      stops.forEach((stop) => stop());
      for (const id of Object.keys(logic)) logic[id].anim?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, cellSize, w, h]);

  const ids = Object.keys(logicRef.current);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
      {ids.map((id, i) => {
        const v = logicRef.current[id];
        if (!v) return null;
        const bobY = v.bob.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });
        return (
          <Animated.View
            key={id}
            style={{
              position: "absolute",
              left: -7,
              top: -9,
              width: 14,
              height: 18,
              alignItems: "center",
              transform: [...v.pos.getTranslateTransform(), { translateY: bobY }],
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: VISITOR_COLORS[i % VISITOR_COLORS.length] }} />
            <View
              style={{
                width: 10,
                height: 7,
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
                borderBottomLeftRadius: 2,
                borderBottomRightRadius: 2,
                backgroundColor: VISITOR_COLORS[i % VISITOR_COLORS.length],
                marginTop: 0.5,
                opacity: 0.92,
              }}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

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

  // Ref mirror of coins for fresh reads inside event handlers (avoids stale closures).
  const coinsRef = useRef(coins);
  useEffect(() => {
    coinsRef.current = coins;
  }, [coins]);

  // Transactional coin delta: functional setState so concurrent transactions never clobber each other.
  const addCoins = useCallback((delta: number) => {
    setCoins(prev => {
      const next = {
        balance: Math.round((prev.balance + delta) * 10) / 10,
        lifetimeEarned: delta > 0 ? Math.round((prev.lifetimeEarned + delta) * 10) / 10 : prev.lifetimeEarned,
      };
      AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const floorInterior: BankFloorInterior = interior.floors[String(safeFloor)] ?? EMPTY_FLOOR;

  const handleAddFloor = useCallback(async () => {
    if (!building || building.type !== "bank-tower") return;
    const current = building.floors || 1;
    if (current >= BANK_MAX_FLOORS) return;
    const cost = bankFloorCost(current);
    if (coinsRef.current.balance < cost) {
      Alert.alert("Not enough coins", `Adding floor ${current + 1} costs ${cost.toFixed(2)} coins.`);
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
      addCoins(-cost);
    } catch {}
  }, [building, addCoins]);

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

  // Totals across ALL floors for the banner.
  // ATMs & vaults drip collectible coins onto their tiles (tap to collect)
  // instead of auto-adding, so they don't count toward the auto multiplier.
  const totals = useMemo(() => {
    let mult = 1;
    let connectedTotal = 0;
    let furnitureCount = 0;
    let dripCount = 0;
    for (let f = 1; f <= numFloors; f++) {
      const fi = interior.floors[String(f)] ?? EMPTY_FLOOR;
      const c = connectedDeskCount(fi);
      connectedTotal += c;
      mult += c * bankDeskBonusPerDesk(f);
      for (const item of fi.furniture) {
        const def = bankFurnitureDef(item.type, f);
        if (!def) continue;
        furnitureCount += 1;
        if (item.type === "atm" || item.type === "vault") {
          dripCount += 1;
        } else {
          mult += def.effectPct / 100;
        }
      }
    }
    return { mult, connectedTotal, furnitureCount, dripCount };
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
        const storageType: "atm" | "vault" | null =
          existing.type === "atm" || existing.type === "vault" ? existing.type : null;
        const storageLvl = existing.storageLevel ?? 0;
        const cap = storageType ? storageCapFor(storageType, storageLvl) : 0;
        const pendingAmt = Math.round((existing.pending || 0) * 10) / 10;
        const upgradeCost = storageType ? storageUpgradeCostFor(storageType, storageLvl) : null;
        const storageLine = storageType
          ? `\n🪙 Storage: ${pendingAmt.toFixed(2)}/${cap.toFixed(2)}${pendingAmt >= cap ? " FULL" : ""}`
          : "";
        const upgradeLine = storageType && upgradeCost != null
          ? `\nUpgrade storage → ${storageCapFor(storageType, storageLvl + 1)} cap (🪙${upgradeCost})`
          : storageType
            ? "\nStorage maxed out!"
            : "";
        Alert.alert(
          def?.name ?? "Furniture",
          `${def?.blurb ?? ""}${def?.blurb ? "\n" : ""}Sells back for full price.${storageLine}${upgradeLine}`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Move",
              onPress: () => {
                setSelectedTile(null);
                setMoveItem({ id: existing.id, kind: "furniture" });
              },
            },
            ...(storageType && upgradeCost != null
              ? [
                  {
                    text: `⬆️ Storage 🪙${upgradeCost}`,
                    onPress: () => {
                      if (coinsRef.current.balance < upgradeCost) {
                        Alert.alert("Not enough coins", `You need ${upgradeCost} coins.`);
                        return;
                      }
                      saveFloor(safeFloor, {
                        ...floorInterior,
                        furniture: floorInterior.furniture.map((f) =>
                          f.id === existing.id ? { ...f, storageLevel: storageLvl + 1 } : f
                        ),
                      });
                      addCoins(-upgradeCost);
                    },
                  },
                ]
              : []),
            {
              text: `Sell 🪙${existing.cost}`,
              onPress: () => {
                saveFloor(safeFloor, {
                  ...floorInterior,
                  furniture: floorInterior.furniture.filter((f) => f.id !== existing.id),
                });
                addCoins(existing.cost);
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
                addCoins(refund);
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
    if (coinsRef.current.balance < cost) {
      Alert.alert("Not enough coins", `You need ${cost.toFixed(2)} coins.`);
      return;
    }
    const item: BankInteriorItem = { id: nextId(), kind, x: selectedTile.x, y: selectedTile.y, cost };
    if (kind === "desk") {
      saveFloor(safeFloor, { ...floorInterior, desks: [...floorInterior.desks, item] });
    } else {
      saveFloor(safeFloor, { ...floorInterior, carpets: [...floorInterior.carpets, item] });
    }
    addCoins(-cost);
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
    if (coinsRef.current.balance < def.cost) {
      Alert.alert("Not enough coins", `You need ${def.cost.toFixed(2)} coins.`);
      return;
    }
    const item: BankFurnitureItem = { id: nextId(), type, x: selectedTile.x, y: selectedTile.y, cost: def.cost };
    saveFloor(safeFloor, { ...floorInterior, furniture: [...floorInterior.furniture, item] });
    addCoins(-def.cost);
    setSelectedTile(null);
  };

  /**
   * Collect drip coins sitting on an ATM/vault: moves the item's pending
   * coins into the bank building's tap-to-collect total outside.
   */
  const handleCollectDrip = useCallback(
    async (floorNum: number, itemId: string) => {
      const fi = interior.floors[String(floorNum)] ?? EMPTY_FLOOR;
      const item = fi.furniture.find((f) => f.id === itemId);
      const amount = Math.round((item?.pending || 0) * 10) / 10;
      if (!item || amount <= 0) return;
      // Zero the item's pending
      saveFloor(floorNum, {
        ...fi,
        furniture: fi.furniture.map((f) => (f.id === itemId ? { ...f, pending: 0 } : f)),
      });
      // Add to the bank building's accumulated total outside
      if (!buildingId) return;
      try {
        const townRaw = await AsyncStorage.getItem(TOWN_STORAGE_KEY);
        const town = parseTown(townRaw ? JSON.parse(townRaw) : {});
        for (const mapId of Object.keys(town.maps) as Array<keyof typeof town.maps>) {
          town.maps[mapId].buildings = town.maps[mapId].buildings.map((b) =>
            b.id === buildingId
              ? { ...b, accumulated: Math.round(((b.accumulated || 0) + amount) * 10) / 10 }
              : b
          );
        }
        await AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(town));
      } catch {}
    },
    [interior, buildingId, saveFloor]
  );

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
            <View style={{ alignItems: "center", justifyContent: "center", opacity: isMovingOrigin ? 0.4 : 1 }}>
              <Text style={{ fontSize: 22 }}>
                {bankFurnitureDef(item.type, safeFloor)?.icon ?? "🪑"}
              </Text>
              {(item.type === "atm" || item.type === "vault") && (
                <StorageBar
                  pending={item.pending || 0}
                  cap={storageCapFor(item.type, item.storageLevel)}
                />
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

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: "#FDF6E3" }} />;
  }

  const themeName = bankFloorTheme(safeFloor);
  const desksMaxed = floorInterior.desks.length >= BANK_MAX_DESKS;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FDF6E3" }} contentContainerStyle={{ padding: 16, paddingTop: 48 }}>
      <HolidayInteriorOverlay season={getHolidaySeason()} />
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <MaterialIcons name="arrow-back" size={24} color="#1C1917" />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#1C1917" }}>Bank Interior</Text>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ fontSize: 16 }}>🪙</Text>
          <Text style={{ marginLeft: 6, fontWeight: "700", color: "#1C1917" }}>{coins.balance.toFixed(2)}</Text>
        </View>
      </View>

      {/* Bonus banner */}
      <View style={{ backgroundColor: "#1C1917", borderRadius: 12, padding: 12, marginBottom: 12, flexDirection: "row", alignItems: "center" }}>
        <MaterialIcons name="trending-up" size={24} color="#4ADE80" />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>
            Interior bonus: ×{totals.mult.toFixed(2)}
            {totals.dripCount > 0 && <Text style={{ color: "#4ADE80" }}> · 🪙 dripping inside</Text>}
          </Text>
          <Text style={{ color: "#A8A29E", fontSize: 12 }}>
            {totals.connectedTotal === 0 && totals.furnitureCount === 0
              ? "Place desks, connect them with carpet, and add furniture to boost this bank's earnings."
              : `${totals.connectedTotal} connected desk${totals.connectedTotal === 1 ? "" : "s"} · ${totals.furnitureCount} furniture boosting earnings.`}
            {totals.dripCount > 0 && " Tap the coins on ATMs & vaults to collect."}
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
                  +Floor 🪙{cost.toFixed(2)}
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
      {/* the room itself gets richer with the building's level */}
      <BankLevelDecor level={Math.min(Math.max(building?.level || 1, 1), 3)} />
      <View style={{ alignItems: "center", marginBottom: 16 }}>
        <View style={{ position: "relative", width: w * cellSize, height: h * cellSize }}>
          {rows}
          {/* Collectible drip coins on ATMs & vaults */}
          {floorInterior.furniture.map((f) => {
            if (f.type !== "atm" && f.type !== "vault") return null;
            const pending = Math.round((f.pending || 0) * 10) / 10;
            if (pending <= 0) return null;
            return (
              <View
                key={`drip-${f.id}`}
                style={{
                  position: "absolute",
                  left: f.x * cellSize,
                  top: f.y * cellSize,
                  width: cellSize,
                  height: cellSize,
                }}
                pointerEvents="box-none"
              >
                <DripCoin amount={pending} onCollect={() => handleCollectDrip(safeFloor, f.id)} />
              </View>
            );
          })}
          {/* Wandering customer visitors */}
          <BankInteriorVisitors
            floorInterior={floorInterior}
            cellSize={cellSize}
            w={w}
            h={h}
            count={Math.min(Math.max(building?.level || 1, 1), 3)}
          />
        </View>
      </View>

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
            <Text style={{ fontWeight: "700", color: "#1C1917" }}>🪙{deskCost.toFixed(2)}</Text>
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
            <Text style={{ fontWeight: "700", color: "#1C1917" }}>🪙{carpetCost.toFixed(2)}</Text>
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
                      🪙{def.cost.toFixed(2)}
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
