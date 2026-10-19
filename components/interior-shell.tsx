// Shared shell for building interior screens.
// Provides: data loading (coins, building, people, pawn), header with back
// button + coin balance, upgrade handling, and level helpers.
// Each interior screen renders its own unique scene inside this shell.
// No emojis — SVG art and MaterialIcons only.

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  BUILDINGS,
  COINS_STORAGE_KEY,
  TOWN_STORAGE_KEY,
  parseCoins,
  parseTown,
  prayedTodayPeople,
  upgradeCostFor,
  type BuildingType,
  type HometownCoins,
  type PlacedBuilding,
  type PrayedPerson,
} from "@/lib/hometown";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";

export type InteriorData = {
  coins: HometownCoins;
  building: PlacedBuilding | null;
  people: PrayedPerson[];
  pawn: CustomPawn | null;
  loaded: boolean;
  level: 1 | 2 | 3;
  buildingName: string;
  addCoins: (delta: number) => void;
  handleUpgrade: (upgradeBlurb: string) => void;
};

/** Load the shared interior data for a building. */
export function useInteriorData(): InteriorData {
  const { buildingId } = useLocalSearchParams<{ buildingId?: string }>();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [building, setBuilding] = useState<PlacedBuilding | null>(null);
  const [people, setPeople] = useState<PrayedPerson[]>([]);
  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [coinsRaw, townRaw] = await Promise.all([
          AsyncStorage.getItem(COINS_STORAGE_KEY),
          AsyncStorage.getItem(TOWN_STORAGE_KEY),
        ]);
        setCoins(parseCoins(coinsRaw ? JSON.parse(coinsRaw) : {}));
        if (townRaw && buildingId) {
          const town = parseTown(JSON.parse(townRaw));
          outer: for (const mapId of Object.keys(town.maps) as Array<keyof typeof town.maps>) {
            const found = town.maps[mapId].buildings.find((b) => b.id === buildingId);
            if (found) { setBuilding(found); break outer; }
          }
        }
        setPeople(await prayedTodayPeople());
        const p = await loadCustomPawn().catch(() => null);
        if (p) setPawn(p);
      } catch {}
      setLoaded(true);
    })();
  }, [buildingId]);

  const coinsRef = useRef(coins);
  useEffect(() => { coinsRef.current = coins; }, [coins]);

  const addCoins = useCallback((delta: number) => {
    setCoins((prev) => {
      const next = {
        balance: Math.round((prev.balance + delta) * 100) / 100,
        lifetimeEarned: delta > 0 ? Math.round((prev.lifetimeEarned + delta) * 100) / 100 : prev.lifetimeEarned,
      };
      AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const level = Math.min(Math.max(building?.level || 1, 1), 3) as 1 | 2 | 3;
  const def = building ? BUILDINGS[building.type as BuildingType] : null;
  const buildingName = def?.name ?? "Building";

  const handleUpgrade = useCallback((upgradeBlurb: string) => {
    if (level >= 3 || !buildingId) return;
    const cost = upgradeCostFor(building?.type as BuildingType, (level + 1) as 2 | 3);
    if (coinsRef.current.balance < cost) {
      Alert.alert("Not enough coins", `You need ${cost.toFixed(2)} coins. You have ${coinsRef.current.balance.toFixed(2)}.`);
      return;
    }
    addCoins(-cost);
    (async () => {
      try {
        const townRaw = await AsyncStorage.getItem(TOWN_STORAGE_KEY);
        if (!townRaw) return;
        const town = parseTown(JSON.parse(townRaw));
        for (const mapId of Object.keys(town.maps) as Array<keyof typeof town.maps>) {
          const b = town.maps[mapId].buildings.find((x) => x.id === buildingId);
          if (b) { b.level = (level + 1) as 2 | 3; break; }
        }
        await AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(town));
        setBuilding((prev) => (prev ? { ...prev, level: (level + 1) as 2 | 3 } : prev));
        Alert.alert(buildingName, `Upgraded to level ${level + 1}! ${upgradeBlurb}`);
      } catch {}
    })();
  }, [level, buildingId, building?.type, buildingName, addCoins]);

  return { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade };
}

/** Standard interior header: back button, icon, name, coin balance. */
export function InteriorHeader({
  icon,
  iconColor,
  title,
  coins,
  bg = "#FFFFFF",
  textColor = "#1C1917",
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  title: string;
  coins: HometownCoins;
  bg?: string;
  textColor?: string;
}) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: bg }}>
      <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
        <MaterialIcons name="arrow-back" size={24} color={textColor} />
      </Pressable>
      <MaterialIcons name={icon} size={26} color={iconColor} style={{ marginLeft: 4 }} />
      <Text style={{ marginLeft: 8, fontSize: 20, fontWeight: "800", color: textColor }} numberOfLines={1}>{title}</Text>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#E5E7EB" }}>
        <MaterialIcons name="monetization-on" size={15} color="#B45309" />
        <Text style={{ marginLeft: 5, fontWeight: "700", color: textColor }}>{coins.balance.toFixed(2)}</Text>
      </View>
    </View>
  );
}

/** Standard info banner for the top of an interior. */
export function InteriorBanner({
  icon,
  iconColor,
  title,
  blurb,
  accent = "#E5E7EB",
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  title: string;
  blurb: string;
  accent?: string;
}) {
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: accent, padding: 14, flexDirection: "row", alignItems: "center" }}>
      <MaterialIcons name={icon} size={26} color={iconColor} />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ color: "#1C1917", fontWeight: "800", fontSize: 15 }}>{title}</Text>
        <Text style={{ color: "#78716C", fontSize: 12, marginTop: 2 }}>{blurb}</Text>
      </View>
    </View>
  );
}

/** Standard action row: primary action + upgrade button. */
export function InteriorActions({
  primaryLabel,
  onPrimary,
  primaryColor,
  level,
  onUpgrade,
  upgradeLabel = "Upgrade",
}: {
  primaryLabel: string;
  onPrimary: () => void;
  primaryColor: string;
  level: 1 | 2 | 3;
  onUpgrade: () => void;
  upgradeLabel?: string;
}) {
  return (
    <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 16 }}>
      <Pressable onPress={onPrimary} style={{ flex: 1, backgroundColor: primaryColor, borderRadius: 14, paddingVertical: 13, alignItems: "center", marginRight: 8 }}>
        <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>{primaryLabel}</Text>
      </Pressable>
      {level < 3 && (
        <Pressable onPress={onUpgrade} style={{ backgroundColor: "#FFFFFF", borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, alignItems: "center", borderWidth: 1, borderColor: primaryColor }}>
          <Text style={{ color: primaryColor, fontWeight: "800", fontSize: 14 }}>{upgradeLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
