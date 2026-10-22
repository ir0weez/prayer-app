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
  MAX_TEMPER,
  applyTemper,
  isLevelUnlocked,
  isPrestigeUnlocked,
  isTemperable,
  isUnlocked,
  loadEquipped,
  loadInventory,
  refreshGearBoostCache,
  refreshTemperCache,
  saveEquipped,
  saveInventory,
  saveTemper,
  shopLevelFor,
  temperCost,
  temperLevelFor,
  type EquippedGear,
  type GearItem,
  type GearType,
} from "@/lib/gear";
import { getLevelForXP, loadXPState } from "@/lib/xp-engine";
import { loadPrestigeLevel, loadPrestigeState } from "@/lib/prestige";
import Svg, { Path } from "react-native-svg";
import {
  PICKAXES,
  loadMineState,
  pickGateMet,
  pickPurchaseCheck,
  pickaxeFor,
  saveMineState,
  type MineGates,
  type MineState,
} from "@/lib/mountain";
import { COINS_STORAGE_KEY,
  formatCoins,
  applyCoinsDelta,
} from "@/lib/hometown";
import { FASTS_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { getActiveFast, getCurrentFastDay, type PersonalFast } from "@/lib/prayercircle-fasting";

import { useSkin } from "@/hooks/use-skin";

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

/** A pickaxe glyph in the mine's own art (tier-colored head). */
function PickGlyph({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.5 6.5 C 8 2.8, 16 2.8, 20.5 6.5 C 15 5, 9 5, 3.5 6.5 Z" fill={color} />
      <Path d="M11.2 5.2 L14.8 18.6" stroke="#8A5A2B" strokeWidth={2.1} strokeLinecap="round" />
    </Svg>
  );
}

/** One line per rung of the mountain ladder (Tool Shop, v170). */
const PICK_BLURBS: Record<number, string> = {
  0: "Where every miner starts — the Stone band.",
  1: "Opens the Iron band in the mine.",
  2: "Opens the Gold band — where the rock starts to groan.",
  3: "Opens the Deep, where diamonds sleep.",
  4: "Prestige work — the Deep pays it back richer.",
  5: "The Crown's own pick — the richest tool in the mountain.",
};

function boostLabel(item: GearItem): string | null {
  const parts: string[] = [];
  if (item.boost.xpMult) parts.push(`+${Math.round(item.boost.xpMult * 100)}% XP`);
  if (item.boost.coinMult) parts.push(`+${Math.round(item.boost.coinMult * 100)}% coins`);
  if (item.boost.hearts) parts.push(`+${item.boost.hearts} forest heart${item.boost.hearts > 1 ? "s" : ""}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export default function GearShopScreen() {
  const router = useRouter();
  const { tokens: skinTokens } = useSkin();
  const sceneBg = skinTokens.darkBackground ?? BG;
  const sceneCard = skinTokens.darkSurface ?? CARD;
  const params = useLocalSearchParams<{ type?: string }>();
  const rawType = typeof params.type === "string" ? params.type : "clothes";
  const shopType: GearType = (["clothes", "armor", "weapon", "tool"] as GearType[]).includes(rawType as GearType)
    ? (rawType as GearType)
    : "clothes";
  const meta = GEAR_TYPE_META[shopType];

  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  const [coins, setCoins] = useState<Coins>({ balance: 0, lifetimeEarned: 0 });
  const [inventory, setInventory] = useState<string[]>([]);
  const [temper, setTemper] = useState<Record<string, number>>({});
  const [equipped, setEquipped] = useState<EquippedGear>({ clothes: null, armor: null, weapon: null, tool: null });
  const [fastDay, setFastDay] = useState(1);
  const [level, setLevel] = useState(1);
  const [shopLevel, setShopLevel] = useState(0);
  const [prestigeLevel, setPrestigeLevel] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // Mountain Picks (v170, Tool Shop only): the mine's ladder lives in
  // lib/mountain's one record — the shop reads and writes THAT record,
  // never a copy, so the mine strip and this shelf always agree.
  const [mineState, setMineState] = useState<MineState | null>(null);
  const [mineGates, setMineGates] = useState<MineGates>({ totalPrestiges: 0, crowns: 0 });

  const refresh = useCallback(async () => {
    const [p, c, inv, eq, day, lvl, xp, prestige, temperMap] = await Promise.all([
      loadCustomPawn(),
      loadCoins(),
      loadInventory(),
      loadEquipped(),
      loadFastDay(),
      shopLevelFor(shopType),
      loadXPState(),
      loadPrestigeLevel(),
      refreshTemperCache(),
    ]);
    setPrestigeLevel(prestige);
    setPawn(p);
    setCoins(c);
    setInventory(inv);
    setTemper(temperMap);
    setEquipped(eq);
    setFastDay(day);
    setLevel(getLevelForXP(xp.totalXP));
    setShopLevel(lvl);
    if (shopType === "tool") {
      try {
        const [ms, ps] = await Promise.all([loadMineState(), loadPrestigeState()]);
        setMineState(ms);
        setMineGates({ totalPrestiges: ps.totalPrestiges, crowns: prestige });
      } catch {}
    }
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
    if (!isLevelUnlocked(item, level)) {
      Alert.alert("Locked", `Unlocks at Level ${item.unlockLevel}. You're Level ${level}.`);
      return;
    }
    if (!isPrestigeUnlocked(item, prestigeLevel)) {
      Alert.alert("Locked", `${item.name} requires Crown ${item.unlockPrestige}. Prestige by completing 365 days of fasting, then choose Begin Again in Hometown.`);
      return;
    }
    if (coins.balance < item.cost) {
      Alert.alert("Not enough coins", `${item.name} costs ${item.cost} coins. You have ${formatCoins(coins.balance)}.`);
      return;
    }
    const nextInv = [...inventory, item.id];
    await saveInventory(nextInv);
    const nextCoins = await applyCoinsDelta(-item.cost, "dime");
    setInventory(nextInv);
    setCoins(nextCoins);
    // Auto-equip on purchase
    const nextEq: EquippedGear = { ...equipped, [item.type]: item.id };
    await saveEquipped(nextEq);
    setEquipped(nextEq);
    await refreshGearBoostCache();
  };

  /** Buy a rung of the mountain ladder — the same checks, gates, and
   *  ledger path the mine used before the shelf moved here (v170). */
  const handleBuyPick = async (tier: number) => {
    if (!mineState) return;
    const pick = pickaxeFor(tier);
    const check = pickPurchaseCheck(mineState.pickTier, tier, mineGates);
    if (!check.ok) {
      if (check.reason === "owned") return;
      if (check.reason === "order") {
        Alert.alert("One rung at a time", `The ${pickaxeFor(mineState.pickTier + 1).name} comes first — the ladder is climbed in order.`);
      } else if (check.reason === "prestige") {
        Alert.alert("Behind Begin Again", "The Diamond Pick waits behind prestige. Begin Again once — any fast — and the deep way opens.");
      } else if (check.reason === "crown") {
        Alert.alert("Crown work", "The Crown Pick belongs to the Crown. Earn a Crown — a 365-day fast, then Begin Again — and it can be yours.");
      }
      return;
    }
    if (coins.balance < check.cost) {
      Alert.alert("Not enough coins", `${pick.name} costs ${formatCoins(check.cost)} coins. You have ${formatCoins(coins.balance)}.`);
      return;
    }
    Alert.alert(`Buy the ${pick.name}?`, `${formatCoins(check.cost)} coins. It cracks deeper rock — and lesser rock faster.`, [
      { text: "Not yet", style: "cancel" },
      {
        text: "Buy",
        onPress: () => {
          void (async () => {
            const nextCoins = await applyCoinsDelta(-check.cost, "dime");
            setCoins(nextCoins);
            const nextMine: MineState = { ...mineState, pickTier: tier };
            await saveMineState(nextMine);
            setMineState(nextMine);
          })();
        },
      },
    ]);
  };

  const handleEquip = async (item: GearItem) => {
    const nextEq: EquippedGear = { ...equipped, [item.type]: equipped[item.type] === item.id ? null : item.id };
    await saveEquipped(nextEq);
    setEquipped(nextEq);
    await refreshGearBoostCache();
  };

  const handleTemper = async (item: GearItem) => {
    if (!isTemperable(item)) return;
    const current = temperLevelFor(item.id, temper);
    if (current >= MAX_TEMPER) return;
    const cost = temperCost(item, current);
    if (coins.balance < cost) {
      Alert.alert(
        "Not enough coins",
        `Tempering ${item.name} to +${current + 1} costs ${formatCoins(cost)} coins. You have ${formatCoins(coins.balance)}.`
      );
      return;
    }
    const nextTemper: Record<string, number> = { ...temper, [item.id]: current + 1 };
    await saveTemper(nextTemper);
    // Same hometown coin ledger as purchases (v167): deduct via the
    // canonical fresh read-modify-write, with the shop's rounding.
    const nextCoins = await applyCoinsDelta(-cost, "dime");
    const savedTemper = await refreshTemperCache();
    setTemper(savedTemper);
    setCoins(nextCoins);
    await refreshGearBoostCache();
  };

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: sceneBg }} />;
  }

  const items = GEAR_CATALOG.filter((g) => g.type === shopType);
  const equippedClothes = equipped.clothes ? GEAR_BY_ID[equipped.clothes] || null : null;

  return (
    <View style={{ flex: 1, backgroundColor: sceneBg }}>
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
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: sceneCard, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontSize: 16 }}>🪙</Text>
            <Text style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: 4 }}>{formatCoins(coins.balance)}</Text>
          </View>
        </View>
        <Text style={{ color: LABEL, fontSize: 13, marginTop: 4, marginBottom: 16 }}>
          Level {level} · Day {fastDay} of your fast.
        </Text>

        {pawn && shopType === "clothes" && (
          <View style={{ alignItems: "center", backgroundColor: sceneCard, borderRadius: 16, paddingVertical: 16, marginBottom: 16 }}>
            <PawnPreview pawn={pawn} size={120} equippedGear={equippedClothes} />
            <Text style={{ color: LABEL, fontSize: 12, marginTop: 8 }}>Live preview</Text>
          </View>
        )}

        {items.map((item) => {
          const owned = inventory.includes(item.id);
          const isEquipped = equipped[item.type] === item.id;
          const unlocked = isUnlocked(item, fastDay);
          const levelLocked = item.minShopLevel > shopLevel;
          const xpLocked = !isLevelUnlocked(item, level);
          const crownLocked = !isPrestigeUnlocked(item, prestigeLevel);
          const blocked = !unlocked || levelLocked || xpLocked || crownLocked;
          const boost = boostLabel(item);
          const temperLevel = temperLevelFor(item.id, temper);
          const showTemper = owned && isTemperable(item);
          const temperCostNext = temperCost(item, temperLevel);
          const temperedNow = applyTemper(item.boost, item, temper);
          const temperedNext =
            temperLevel < MAX_TEMPER
              ? applyTemper(item.boost, item, { ...temper, [item.id]: temperLevel + 1 })
              : temperedNow;
          const temperStatLabel = item.type === "weapon" ? "attack" : "defense";
          const temperCurrentStat =
            item.type === "weapon" ? temperedNow.attack || 0 : temperedNow.defense || 0;
          const temperNextStat =
            item.type === "weapon" ? temperedNext.attack || 0 : temperedNext.defense || 0;
          const temperAffordable = coins.balance >= temperCostNext;
          return (
            <View key={item.id} style={{ backgroundColor: sceneCard, borderRadius: 16, padding: 16, marginBottom: 12, opacity: blocked ? 0.6 : 1 }}>
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
                  {xpLocked && (
                    <Text style={{ color: "#F87171", fontSize: 12, marginTop: 2 }}>
                      Unlocks at Level {item.unlockLevel} (you're Level {level})
                    </Text>
                  )}
                  {crownLocked && (
                    <Text style={{ color: "#F87171", fontSize: 12, marginTop: 2 }}>
                      Requires Crown {item.unlockPrestige} (you have {prestigeLevel})
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
              {showTemper && (
                <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)", paddingTop: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
                      Temper +{temperLevel}
                    </Text>
                    <Text style={{ color: LABEL, fontSize: 12 }}>
                      {temperStatLabel} {temperCurrentStat}
                    </Text>
                  </View>
                  {temperLevel >= MAX_TEMPER ? (
                    <Text style={{ color: GOLD, fontSize: 12, fontWeight: "700", marginTop: 6 }}>
                      Fully tempered
                    </Text>
                  ) : (
                    <>
                      <Text style={{ color: LABEL, fontSize: 12, marginTop: 4 }}>
                        Next level: {temperStatLabel} {temperCurrentStat} to {temperNextStat} (+
                        {temperNextStat - temperCurrentStat})
                      </Text>
                      {!temperAffordable && (
                        <Text style={{ color: "#F87171", fontSize: 12, marginTop: 4 }}>
                          Need {formatCoins(temperCostNext - coins.balance)} more coins to temper
                        </Text>
                      )}
                      <Pressable
                        onPress={() => handleTemper(item)}
                        disabled={!temperAffordable}
                        style={{
                          marginTop: 8,
                          paddingVertical: 10,
                          borderRadius: 12,
                          backgroundColor: temperAffordable ? ACCENT : "rgba(255,255,255,0.12)",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                          Temper · {formatCoins(temperCostNext)}
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Mountain Picks — the mine's ladder, sold here where tools
            are sold (v170). The town-coin tools above are untouched;
            picks write lib/mountain's one record through the ledger. */}
        {shopType === "tool" && mineState && (
          <>
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 20, marginTop: 12, marginBottom: 4 }}>
              Mountain Picks
            </Text>
            <Text style={{ color: LABEL, fontSize: 13, marginBottom: 16 }}>
              For the mine under the Great Peak. Your pick now: {pickaxeFor(mineState.pickTier).name}.
            </Text>
            {PICKAXES.map((pick) => {
              const owned = pick.tier <= mineState.pickTier;
              const current = pick.tier === mineState.pickTier;
              const gateMet = pickGateMet(pick.tier, mineGates);
              const gated = pick.gate !== "none" && !gateMet;
              return (
                <View key={pick.tier} style={{ backgroundColor: sceneCard, borderRadius: 16, padding: 16, marginBottom: 12, opacity: gated ? 0.6 : 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(124,92,255,0.25)", alignItems: "center", justifyContent: "center" }}>
                      <PickGlyph color={gated ? "#6B7280" : pick.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>{pick.name}</Text>
                      <Text style={{ color: LABEL, fontSize: 12, marginTop: 2 }}>{PICK_BLURBS[pick.tier]}</Text>
                      {pick.gate === "prestige" && !gateMet && (
                        <Text style={{ color: "#F87171", fontSize: 12, marginTop: 2 }}>
                          🔒 Requires a prestige — Begin Again once, any fast
                        </Text>
                      )}
                      {pick.gate === "crown" && !gateMet && (
                        <Text style={{ color: "#F87171", fontSize: 12, marginTop: 2 }}>
                          🔒 Requires a Crown — a 365-day fast, then Begin Again
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
                    {current ? (
                      <View
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 12,
                          backgroundColor: "rgba(16,185,129,0.25)",
                          borderWidth: 1,
                          borderColor: "#10B981",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>✓ Your pick</Text>
                      </View>
                    ) : owned ? (
                      <View
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 12,
                          backgroundColor: "rgba(255,255,255,0.12)",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Owned</Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => handleBuyPick(pick.tier)}
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 12,
                          backgroundColor: gated ? "rgba(255,255,255,0.12)" : ACCENT,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                          Buy · {formatCoins(pick.cost)}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}
