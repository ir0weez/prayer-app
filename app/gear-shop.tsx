// Gear shop — one screen parameterized by ?type=clothes|armor|weapon|tool.
// Clothes Shop / Armory / Weaponsmith / Tool Shop.
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { PawnPreview } from "@/components/pawn-preview";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import {
  GEAR_BY_ID,
  GEAR_CATALOG,
  GEAR_TYPE_META,
  isUnlocked,
  loadEquipped,
  loadInventory,
  refreshGearBoostCache,
  saveEquipped,
  saveInventory,
  shopLevelFor,
  type EquippedGear,
  type GearItem,
  type GearType,
} from "@/lib/gear";
import { COINS_STORAGE_KEY } from "@/lib/hometown";
import { FASTS_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { getActiveFast, getCurrentFastDay, type PersonalFast } from "@/lib/prayercircle-fasting";

const BG = "#1E1B4B";
const CARD = "rgba(255,255,255,0.08)";
const LABEL = "#A78BFA";
const ACCENT = "#7C5CFF";
const GOLD = "#FBBF24";

type Coins = { balance: number; lifetimeEarned: number };

async function loadCoins(): Promise<Coins> {
  try {
    const raw = await AsyncStorage.getItem(COINS_STORAGE_KEY);
    if (!raw) return { balance: 0, lifetimeEarned: 0 };
    const c = JSON.parse(raw);
    return {
      balance: typeof c.balance === "number" ? c.balance : 0,
      lifetimeEarned: typeof c.lifetimeEarned === "number" ? c.lifetimeEarned : 0,
    };
  } catch {
    return { balance: 0, lifetimeEarned: 0 };
  }
}

async function loadFastDay(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(FASTS_STORAGE_KEY);
    if (!raw) return 1;
    const fasts = JSON.parse(raw) as PersonalFast[];
    const active = getActiveFast(Array.isArray(fasts) ? fasts : []);
    if (!active) return 1;
    return getCurrentFastDay(active);
  } catch {
    return 1;
  }
}

function boostLabel(item: GearItem): string | null {
  const parts: string[] = [];
  if (item.boost.xpMult) parts.push(`+${Math.round(item.boost.xpMult * 100)}% XP`);
  if (item.boost.coinMult) parts.push(`+${Math.round(item.boost.coinMult * 100)}% coins`);
  if (item.boost.hearts) parts.push(`+${item.boost.hearts} heart${item.boost.hearts > 1 ? "s" : ""}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export default function GearShopScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const rawType = typeof params.type === "string" ? params.type : "clothes";
  const shopType: GearType = (["clothes", "armor", "weapon", "tool"] as GearType[]).includes(rawType as GearType)
    ? (rawType as GearType)
    : "clothes";
  const meta = GEAR_TYPE_META[shopType];

  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  const [coins, setCoins] = useState<Coins>({ balance: 0, lifetimeEarned: 0 });
  const [inventory, setInventory] = useState<string[]>([]);
  const [equipped, setEquipped] = useState<EquippedGear>({ clothes: null, armor: null, weapon: null, tool: null });
  const [fastDay, setFastDay] = useState(1);
  const [shopLevel, setShopLevel] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const [p, c, inv, eq, day, lvl] = await Promise.all([
      loadCustomPawn(),
      loadCoins(),
      loadInventory(),
      loadEquipped(),
      loadFastDay(),
      shopLevelFor(shopType),
    ]);
    setPawn(p);
    setCoins(c);
    setInventory(inv);
    setEquipped(eq);
    setFastDay(day);
    setShopLevel(lvl);
    setLoaded(true);
  }, [shopType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleBuy = async (item: GearItem) => {
    if (inventory.includes(item.id)) return;
    if (item.minShopLevel > shopLevel) {
      Alert.alert("Locked", `Upgrade your shop to Lv ${item.minShopLevel} to unlock this.`);
      return;
    }
    if (!isUnlocked(item, fastDay)) {
      Alert.alert("Locked", `Requires a ${item.unlockDays}-day fast. You're on day ${fastDay}.`);
      return;
    }
    if (coins.balance < item.cost) {
      Alert.alert("Not enough coins", `${item.name} costs ${item.cost} coins. You have ${Math.floor(coins.balance)}.`);
      return;
    }
    const nextInv = [...inventory, item.id];
    await saveInventory(nextInv);
    const nextCoins: Coins = {
      balance: Math.round((coins.balance - item.cost) * 10) / 10,
      lifetimeEarned: coins.lifetimeEarned,
    };
    await AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(nextCoins));
    setInventory(nextInv);
    setCoins(nextCoins);
    // Auto-equip on purchase
    const nextEq: EquippedGear = { ...equipped, [item.type]: item.id };
    await saveEquipped(nextEq);
    setEquipped(nextEq);
    await refreshGearBoostCache();
  };

  const handleEquip = async (item: GearItem) => {
    const nextEq: EquippedGear = { ...equipped, [item.type]: equipped[item.type] === item.id ? null : item.id };
    await saveEquipped(nextEq);
    setEquipped(nextEq);
    await refreshGearBoostCache();
  };

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: BG }} />;
  }

  const items = GEAR_CATALOG.filter((g) => g.type === shopType);
  const equippedClothes = equipped.clothes ? GEAR_BY_ID[equipped.clothes] || null : null;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View pointerEvents="none" style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(124,92,255,0.18)" }} />
      <View pointerEvents="none" style={{ position: "absolute", bottom: 120, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(76,29,149,0.35)" }} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: 6 }}>Back</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 24 }}>
            {meta.title}{shopLevel > 0 ? ` · Lv ${shopLevel}` : ""}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontSize: 16 }}>🪙</Text>
            <Text style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: 4 }}>{Math.floor(coins.balance)}</Text>
          </View>
        </View>
        <Text style={{ color: LABEL, fontSize: 13, marginTop: 4, marginBottom: 16 }}>
          You're on day {fastDay} of your fast.
        </Text>

        {pawn && shopType === "clothes" && (
          <View style={{ alignItems: "center", backgroundColor: CARD, borderRadius: 16, paddingVertical: 16, marginBottom: 16 }}>
            <PawnPreview pawn={pawn} size={120} equippedGear={equippedClothes} />
            <Text style={{ color: LABEL, fontSize: 12, marginTop: 8 }}>Live preview</Text>
          </View>
        )}

        {items.map((item) => {
          const owned = inventory.includes(item.id);
          const isEquipped = equipped[item.type] === item.id;
          const unlocked = isUnlocked(item, fastDay);
          const levelLocked = item.minShopLevel > shopLevel;
          const blocked = !unlocked || levelLocked;
          const boost = boostLabel(item);
          return (
            <View key={item.id} style={{ backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 12, opacity: blocked ? 0.6 : 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(124,92,255,0.25)", alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name={item.icon as any} size={26} color={blocked ? "#6B7280" : GOLD} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>{item.name}</Text>
                  <Text style={{ color: LABEL, fontSize: 12, marginTop: 2 }}>{item.description}</Text>
                  {boost && <Text style={{ color: GOLD, fontSize: 12, fontWeight: "700", marginTop: 2 }}>{boost}</Text>}
                  {levelLocked && (
                    <Text style={{ color: "#F87171", fontSize: 12, marginTop: 2 }}>
                      🔒 Upgrade shop to Lv {item.minShopLevel}
                    </Text>
                  )}
                  {!unlocked && (
                    <Text style={{ color: "#F87171", fontSize: 12, marginTop: 2 }}>
                      🔒 Requires {item.unlockDays}-day fast (day {fastDay})
                    </Text>
                  )}
                </View>
              </View>
              <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
                {!owned ? (
                  <Pressable
                    onPress={() => handleBuy(item)}
                    disabled={blocked}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: blocked ? "rgba(255,255,255,0.12)" : ACCENT,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                      {item.cost === 0 ? "Claim free" : `Buy · 🪙${item.cost}`}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => handleEquip(item)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: isEquipped ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.12)",
                      borderWidth: isEquipped ? 1 : 0,
                      borderColor: "#10B981",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                      {isEquipped ? "✓ Equipped" : "Equip"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
