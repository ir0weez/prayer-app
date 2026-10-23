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
  applyCoinsDelta,
  beginConstruction,
  constructionTimeLabel,
  parseCoins,
  parseTown,
  prayedTodayPeople,
  upgradeCostFor,
  type BuildingType,
  type HometownCoins,
  type PlacedBuilding,
  type PrayedPerson,
  formatCoins,
} from "@/lib/hometown";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import { useSkin } from "@/hooks/use-skin";
import { paperPressedLift } from "./paper-motion";
import { bitPressedSnap } from "./bit-motion";

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

  // Canonical ledger (v167): the delta is applied to the FRESHEST stored
  // record via lib applyCoinsDelta — never computed from this screen's
  // mount-time snapshot, whose whole-record write used to erase coins
  // other screens had earned (the Main Office collect that vanished).
  const addCoins = useCallback((delta: number) => {
    void applyCoinsDelta(delta, "cent").then((next) => setCoins(next));
  }, []);

  const level = Math.min(Math.max(building?.level || 1, 1), 3) as 1 | 2 | 3;
  const def = building ? BUILDINGS[building.type as BuildingType] : null;
  const buildingName = def?.name ?? "Building";

  const router = useRouter();
  const handleUpgrade = useCallback((upgradeBlurb: string) => {
    if (level >= 3 || !buildingId) return;
    const nextLevel = (level + 1) as 2 | 3;
    const cost = upgradeCostFor(building?.type as BuildingType, nextLevel);
    if (coinsRef.current.balance < cost) {
      Alert.alert("Not enough coins", `You need ${formatCoins(cost)} coins. You have ${formatCoins(coinsRef.current.balance)}.`);
      return;
    }
    // Upgrades are built, not instant (Jonathan's construction timers):
    // the time is named BEFORE he commits, the building then closes under
    // scaffolding and reopens at the new level when the timer completes.
    Alert.alert(
      `Upgrade to level ${nextLevel}?`,
      `${formatCoins(cost)} coins. ${constructionTimeLabel(nextLevel, false)} — ${buildingName} closes while it builds and reopens at level ${nextLevel}.\n\n${upgradeBlurb}`,
      [
        { text: "Not yet", style: "cancel" },
        {
          text: "Start upgrade",
          onPress: () => {
            addCoins(-cost);
            (async () => {
              try {
                const townRaw = await AsyncStorage.getItem(TOWN_STORAGE_KEY);
                if (!townRaw) return;
                const town = parseTown(JSON.parse(townRaw));
                for (const mapId of Object.keys(town.maps) as Array<keyof typeof town.maps>) {
                  const idx = town.maps[mapId].buildings.findIndex((x) => x.id === buildingId);
                  if (idx >= 0) {
                    town.maps[mapId].buildings[idx] = beginConstruction(town.maps[mapId].buildings[idx], nextLevel, Date.now());
                    break;
                  }
                }
                await AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(town));
                setBuilding((prev) => (prev ? beginConstruction(prev, nextLevel, Date.now()) : prev));
                Alert.alert(
                  buildingName,
                  `Upgrade underway! The builders move in — ${buildingName} reopens at level ${nextLevel} in ${nextLevel === 2 ? "30 minutes" : "1 hour"}.`,
                  [{ text: "Back to the map", onPress: () => router.back() }]
                );
              } catch {}
            })();
          },
        },
      ]
    );
  }, [level, buildingId, building?.type, buildingName, addCoins, router]);

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
  // Paper skin (v174): only the header's own chrome changes — a paper
  // surface when the caller left the default white, and the coin pill
  // becomes a paper chip with the kit's offset shadow. Scene-colored
  // headers (mine, shops) keep their exact colors.
  const { isSkinned, tokens } = useSkin();
  const headerBg = isSkinned && bg === "#FFFFFF" ? (tokens.surface ?? bg) : bg;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: headerBg }}>
      <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
        <MaterialIcons name="arrow-back" size={24} color={textColor} />
      </Pressable>
      <MaterialIcons name={icon} size={26} color={iconColor} style={{ marginLeft: 4 }} />
      <Text style={{ marginLeft: 8, fontSize: 20, fontWeight: "800", color: textColor }} numberOfLines={1}>{title}</Text>
      <View style={{ flex: 1 }} />
      <View style={[{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#E5E7EB" }, isSkinned ? tokens.cardShadow : null]}>
        <MaterialIcons name="monetization-on" size={15} color="#B45309" />
        <Text style={{ marginLeft: 5, fontWeight: "700", color: textColor }}>{formatCoins(coins.balance)}</Text>
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
  const { isSkinned, tokens } = useSkin();
  return (
    <View style={[{ marginHorizontal: 16, marginBottom: 12, borderRadius: 16, backgroundColor: isSkinned ? (tokens.surface ?? "#FFFFFF") : "#FFFFFF", borderWidth: 1, borderColor: accent, padding: 14, flexDirection: "row", alignItems: "center" }, isSkinned ? tokens.cardShadow : null]}>
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
  const { isSkinned, tokens } = useSkin();
  return (
    <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 16 }}>
      <Pressable onPress={onPrimary} style={({ pressed }) => [{ flex: 1, backgroundColor: primaryColor, borderRadius: 14, paddingVertical: 13, alignItems: "center", marginRight: 8 }, isSkinned ? (tokens.isPaper ? tokens.buttonShadow : tokens.cardShadow) : null, paperPressedLift(tokens, pressed), bitPressedSnap(tokens, pressed)]}>
        <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>{primaryLabel}</Text>
      </Pressable>
      {level < 3 && (
        <Pressable onPress={onUpgrade} style={({ pressed }) => [{ backgroundColor: isSkinned ? (tokens.surface ?? "#FFFFFF") : "#FFFFFF", borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, alignItems: "center", borderWidth: 1, borderColor: primaryColor }, isSkinned ? (tokens.isPaper ? tokens.buttonShadow : tokens.cardShadow) : null, paperPressedLift(tokens, pressed), bitPressedSnap(tokens, pressed)]}>
          <Text style={{ color: primaryColor, fontWeight: "800", fontSize: 14 }}>{upgradeLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
