import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { PaperHeroThumbnail, PawnPreview } from "@/components/pawn-preview";
import {
  BARBERSHOP_TRIM_COST,
  PAWN_BEARD_STYLES,
  PAWN_HAIR_COLORS,
  PAWN_HAIR_STYLES,
  beardGrowthFor,
  beardLabel,
  cutHair,
  hairGrowthFor,
  hairLabel,
  loadCustomPawn,
  loadOwnedBeardStyles,
  loadOwnedHairStyles,
  saveCustomPawn,
  saveOwnedBeardStyles,
  saveOwnedHairStyles,
  trimBeard,
  type CustomPawn,
  type PawnBeardStyle,
  type PawnHairStyle,
  styleDiscountMult,
  discountedStylePrice,
  shopLevelFor,
} from "@/lib/pawn";
import { COINS_STORAGE_KEY, TOWN_STORAGE_KEY, scaledCoins, scaledXP,
  formatCoins,
} from "@/lib/hometown";
import { loadPrestigeLevel } from "@/lib/prestige";
import { awardCustomXP } from "@/lib/xp-engine";
import { TrimGame } from "@/components/trim-game";
import { PlayCard, type MiniGameReward } from "@/components/mini-game-scene";
import { MINI_GAME_CAPS, playsLeftToday, recordPlay, scaleMiniGamePayout } from "@/lib/mini-games";

const BG = "#1E1B4B";
const CARD = "rgba(255,255,255,0.08)";
const LABEL = "#A78BFA";
const ACCENT = "#7C5CFF";

type Coins = { balance: number; lifetimeEarned: number };

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{ color: LABEL, fontWeight: "800", fontSize: 13, letterSpacing: 1.5, marginTop: 24, marginBottom: 10 }}>
      {title}
    </Text>
  );
}

function StyleGridItem({
  preview,
  name,
  owned,
  equipped,
  cost,
  canAfford,
  locked,
  lockLabel,
  onBuy,
  onEquip,
}: {
  preview: React.ReactNode;
  name: string;
  owned: boolean;
  equipped: boolean;
  cost: number;
  canAfford: boolean;
  locked?: boolean;
  lockLabel?: string;
  onBuy: () => void;
  onEquip: () => void;
}) {
  return (
    <View
      style={{
        width: "31%",
        backgroundColor: CARD,
        borderRadius: 14,
        padding: 10,
        alignItems: "center",
        marginBottom: 12,
        borderWidth: equipped ? 2 : 0,
        borderColor: "#FFFFFF",
        opacity: locked && !owned ? 0.55 : 1,
      }}
    >
      {preview}
      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 12, marginTop: 6, textAlign: "center" }}>{name}</Text>
      {locked && !owned ? (
        <Text style={{ color: "#F87171", fontWeight: "700", fontSize: 11, marginTop: 6, textAlign: "center" }}>
          🔒 {lockLabel}
        </Text>
      ) : owned ? (
        equipped ? (
          <Text style={{ color: ACCENT, fontWeight: "800", fontSize: 12, marginTop: 6 }}>Equipped</Text>
        ) : (
          <Pressable
            onPress={onEquip}
            style={{ marginTop: 6, backgroundColor: "rgba(124,92,255,0.25)", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 12 }}>Equip</Text>
          </Pressable>
        )
      ) : (
        <Pressable
          onPress={onBuy}
          disabled={!canAfford}
          style={{
            marginTop: 6,
            backgroundColor: canAfford ? ACCENT : "rgba(255,255,255,0.12)",
            borderRadius: 8,
            paddingVertical: 6,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 12 }}>🪙 {cost}</Text>
        </Pressable>
      )}
    </View>
  );
}

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

export default function BarbershopScreen() {
  const router = useRouter();
  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  const [coins, setCoins] = useState<Coins>({ balance: 0, lifetimeEarned: 0 });
  const [ownedHair, setOwnedHair] = useState<PawnHairStyle[]>(["bald", "short"]);
  const [ownedBeard, setOwnedBeard] = useState<PawnBeardStyle[]>(["none", "full"]);
  const [discountMult, setDiscountMult] = useState(1);
  const [shopLevel, setShopLevel] = useState(0);
  const [prestigeLevel, setPrestigeLevel] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [hasShop, setHasShop] = useState(true);
  const [trimPlaysLeft, setTrimPlaysLeft] = useState<number | null>(null);
  const [playingTrim, setPlayingTrim] = useState(false);

  useEffect(() => {
    playsLeftToday("trim").then(setTrimPlaysLeft).catch(() => setTrimPlaysLeft(0));
  }, []);

  const handleTrimGameComplete = (raw: MiniGameReward): MiniGameReward => {
    const _pay = scaleMiniGamePayout(scaledCoins(raw.coins), scaledXP(raw.xp));
    const c = _pay.coins;
    const xp = _pay.xp;
    if (c > 0) {
      setCoins((prev) => {
        const next = {
          balance: Math.round((prev.balance + c) * 10) / 10,
          lifetimeEarned: Math.round((prev.lifetimeEarned + c) * 10) / 10,
        };
        AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
    }
    if (xp > 0) awardCustomXP(xp, `minigame-trim-${Date.now()}`).catch(() => undefined);
    recordPlay("trim").then(setTrimPlaysLeft).catch(() => undefined);
    return { coins: c, xp };
  };

  const refresh = useCallback(async () => {
    const [p, c, oh, ob, townRaw, disc, lvl, prestige] = await Promise.all([
      loadCustomPawn(),
      loadCoins(),
      loadOwnedHairStyles(),
      loadOwnedBeardStyles(),
      AsyncStorage.getItem(TOWN_STORAGE_KEY),
      styleDiscountMult(),
      shopLevelFor("barbershop"),
      loadPrestigeLevel(),
    ]);
    setPrestigeLevel(prestige);
    setDiscountMult(disc);
    setShopLevel(lvl);
    setPawn(p);
    setCoins(c);
    setOwnedHair(oh);
    setOwnedBeard(ob);
    // Must have placed a barbershop building to use this screen (check all maps)
    try {
      const town = townRaw ? JSON.parse(townRaw) : null;
      const maps = town?.maps;
      let found = false;
      if (maps && typeof maps === "object") {
        for (const m of Object.values(maps) as any[]) {
          if (m?.buildings?.some((b: any) => b.type === "barbershop")) { found = true; break; }
        }
      } else {
        // Old single-map format
        found = (town?.buildings || []).some((b: any) => b.type === "barbershop");
      }
      setHasShop(found);
    } catch { setHasShop(false); }
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleTrim = async () => {
    if (!pawn) return;
    if (coins.balance < BARBERSHOP_TRIM_COST) {
      Alert.alert("Not enough coins", `A trim costs ${BARBERSHOP_TRIM_COST} coins. You have ${formatCoins(coins.balance)}.`);
      return;
    }
    const trimmed = trimBeard(pawn);
    await saveCustomPawn(trimmed);
    const next: Coins = {
      balance: Math.round((coins.balance - BARBERSHOP_TRIM_COST) * 10) / 10,
      lifetimeEarned: coins.lifetimeEarned,
    };
    await AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next));
    setPawn(trimmed);
    setCoins(next);
  };

  const handleHaircut = async () => {
    if (!pawn) return;
    if (coins.balance < BARBERSHOP_TRIM_COST) {
      Alert.alert("Not enough coins", `A haircut costs ${BARBERSHOP_TRIM_COST} coins. You have ${formatCoins(coins.balance)}.`);
      return;
    }
    const cut = cutHair(pawn);
    await saveCustomPawn(cut);
    const next: Coins = {
      balance: Math.round((coins.balance - BARBERSHOP_TRIM_COST) * 10) / 10,
      lifetimeEarned: coins.lifetimeEarned,
    };
    await AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next));
    setPawn(cut);
    setCoins(next);
  };

  const deductCoins = async (cost: number): Promise<boolean> => {
    if (coins.balance < cost) {
      Alert.alert("Not enough coins", `That costs ${cost} coins. You have ${formatCoins(coins.balance)}.`);
      return false;
    }
    const next: Coins = {
      balance: Math.round((coins.balance - cost) * 10) / 10,
      lifetimeEarned: coins.lifetimeEarned,
    };
    await AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next));
    setCoins(next);
    return true;
  };

  const handleBuyHair = async (id: PawnHairStyle, cost: number, minShopLevel?: number) => {
    if (!pawn) return;
    const style = PAWN_HAIR_STYLES.find((s) => s.id === id);
    const required = minShopLevel ?? style?.minShopLevel ?? 1;
    if (required > shopLevel) {
      Alert.alert("Locked", `Upgrade your barbershop to Lv ${required} to unlock this style.`);
      return;
    }
    if (!(await deductCoins(cost))) return;
    const nextOwned = ownedHair.includes(id) ? ownedHair : [...ownedHair, id];
    await saveOwnedHairStyles(nextOwned);
    setOwnedHair(nextOwned);
    const updated = { ...pawn, hairStyle: id };
    await saveCustomPawn(updated);
    setPawn(updated);
  };

  const handleEquipHair = async (id: PawnHairStyle) => {
    if (!pawn) return;
    const updated = { ...pawn, hairStyle: id };
    await saveCustomPawn(updated);
    setPawn(updated);
  };

  const handleBuyBeard = async (id: PawnBeardStyle, cost: number, minShopLevel?: number) => {
    if (!pawn) return;
    const style = PAWN_BEARD_STYLES.find((s) => s.id === id);
    const required = minShopLevel ?? style?.minShopLevel ?? 1;
    if (required > shopLevel) {
      Alert.alert("Locked", `Upgrade your barbershop to Lv ${required} to unlock this style.`);
      return;
    }
    if (!(await deductCoins(cost))) return;
    const nextOwned = ownedBeard.includes(id) ? ownedBeard : [...ownedBeard, id];
    await saveOwnedBeardStyles(nextOwned);
    setOwnedBeard(nextOwned);
    const updated = { ...pawn, beardStyle: id };
    await saveCustomPawn(updated);
    setPawn(updated);
  };

  const handleEquipBeard = async (id: PawnBeardStyle) => {
    if (!pawn) return;
    const updated = { ...pawn, beardStyle: id };
    await saveCustomPawn(updated);
    setPawn(updated);
  };

  const handleHairColor = async (color: string) => {
    if (!pawn || pawn.hairColor === color) return;
    const updated = { ...pawn, hairColor: color };
    await saveCustomPawn(updated);
    setPawn(updated);
  };

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: BG }} />;
  }

  if (!hasShop) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, padding: 20, paddingTop: 56, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 48 }}>💈</Text>
        <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 20, marginTop: 16, textAlign: "center" }}>
          No Barbershop Yet
        </Text>
        <Text style={{ color: "#A78BFA", fontSize: 14, marginTop: 8, textAlign: "center" }}>
          Place a Barbershop in your Hometown to trim beards and unlock styles.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{ marginTop: 24, backgroundColor: "#7C5CFF", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const beardLength = pawn ? beardGrowthFor(pawn) : 0;
  const hairLength = pawn ? hairGrowthFor(pawn) : 0;
  const isMale = pawn?.gender === "male";
  const canTrim = isMale && beardLength > 0 && coins.balance >= BARBERSHOP_TRIM_COST;
  const canCut = hairLength > 0 && pawn?.hairStyle !== "bald" && coins.balance >= BARBERSHOP_TRIM_COST;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* decorative background shapes */}
      <View pointerEvents="none" style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(124,92,255,0.18)" }} />
      <View pointerEvents="none" style={{ position: "absolute", bottom: 120, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(76,29,149,0.35)" }} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#FFFFFF", textAlign: "center" }}>
              Barbershop{shopLevel > 0 ? ` · Lv ${shopLevel}` : ""}
            </Text>
            <Text style={{ fontSize: 13, color: LABEL, textAlign: "center", marginTop: 2 }}>Keep that beard in check</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {!pawn ? (
          <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 24, alignItems: "center", marginTop: 16 }}>
            <MaterialIcons name="person-add" size={40} color={LABEL} />
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16, marginTop: 12, textAlign: "center" }}>
              No pawn yet
            </Text>
            <Text style={{ color: LABEL, fontSize: 13, marginTop: 6, textAlign: "center" }}>
              Forge a pawn first, then come back for a trim.
            </Text>
            <Pressable
              onPress={() => router.push("/pawn-creator")}
              style={{ marginTop: 16, backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Forge Your Hero</Text>
            </Pressable>
          </View>
        ) : !isMale ? (
          <>
            <View style={{ alignItems: "center", backgroundColor: CARD, borderRadius: 16, paddingVertical: 24, marginTop: 8 }}>
              <PawnPreview pawn={pawn} size={150} />
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 18, marginTop: 12 }}>
                {hairLabel(hairLength)}
              </Text>
              <Text style={{ color: LABEL, fontSize: 13, marginTop: 4 }}>
                Hair grows a little every day. A cut costs {BARBERSHOP_TRIM_COST} coins.
              </Text>
            </View>
            <Pressable
              onPress={handleHaircut}
              disabled={!canCut}
              style={{
                marginTop: 20,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: canCut ? ACCENT : "rgba(255,255,255,0.12)",
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="content-cut" size={20} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15, marginLeft: 8 }}>
                Cut Hair ({BARBERSHOP_TRIM_COST} coins)
              </Text>
            </Pressable>

            {discountMult < 1 && (
              <Text style={{ color: "#4ADE80", fontSize: 12, textAlign: "center", marginBottom: 8, fontWeight: "700" }}>
                🎉 75% OFF — new Hero discount! (Ends after first prestige)
              </Text>
            )}
            <SectionHeader title="HAIR STYLES" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
              {PAWN_HAIR_STYLES.filter((s) => s.gender === "both" || s.gender === pawn.gender).map((s) => {
                const crownLocked = !!s.unlockPrestige && prestigeLevel < s.unlockPrestige;
                const owned = ownedHair.includes(s.id) || (!!s.unlockPrestige && !crownLocked);
                const equipped = pawn.hairStyle === s.id;
                const price = discountedStylePrice(s.cost, discountMult);
                const locked = crownLocked || (!owned && s.minShopLevel > shopLevel);
                return (
                  <StyleGridItem
                    key={s.id}
                    preview={
                    <PaperHeroThumbnail
                      headOnly
                      size={64}
                      tunicColor={pawn.bodyColor}
                      hairStyle={s.id}
                      hairColor={pawn.hairColor || "#111827"}
                      beardStyle={pawn.beardStyle}
                      beardLength={isMale ? beardLength : 0}
                      eyeStyle={pawn.eyeStyle}
                      mouthStyle={pawn.mouthStyle}
                      accessory={pawn.accessory}
                      bodyStyle={pawn.bodyStyle}
                    />
                  }
                    name={s.label}
                    owned={owned}
                    equipped={equipped}
                    cost={price}
                    canAfford={coins.balance >= price}
                    locked={locked}
                    lockLabel={crownLocked ? `Requires Crown ${s.unlockPrestige}` : `Upgrade barbershop to Lv ${s.minShopLevel}`}
                    onBuy={() => handleBuyHair(s.id, discountedStylePrice(s.cost, discountMult), s.minShopLevel)}
                    onEquip={() => handleEquipHair(s.id)}
                  />
                );
              })}
            </View>

            <SectionHeader title="HAIR COLOR" />
            <Text style={{ color: LABEL, fontSize: 12, marginBottom: 8 }}>
              Free to change, anytime.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
              {PAWN_HAIR_COLORS.map((c) => {
                const selected = (pawn.hairColor || "#111827") === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => handleHairColor(c.id)}
                    accessibilityLabel={c.name}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: c.id,
                      borderWidth: selected ? 3 : 1,
                      borderColor: selected ? "#FFFFFF" : "rgba(255,255,255,0.25)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selected && <MaterialIcons name="check" size={22} color="#FFFFFF" />}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <View style={{ alignItems: "center", backgroundColor: CARD, borderRadius: 16, paddingVertical: 24, marginTop: 8 }}>
              <PawnPreview pawn={pawn} size={150} />
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 18, marginTop: 12 }}>
                {beardLabel(beardLength)}
              </Text>
              <Text style={{ color: LABEL, fontSize: 13, marginTop: 4 }}>
                Beards grow a little every day. A trim costs {BARBERSHOP_TRIM_COST} coins.
              </Text>
            </View>

            <Pressable
              onPress={handleTrim}
              disabled={!canTrim}
              style={{
                marginTop: 20,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: canTrim ? ACCENT : "rgba(255,255,255,0.12)",
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="content-cut" size={20} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15, marginLeft: 8 }}>
                Trim Beard ({BARBERSHOP_TRIM_COST} coins)
              </Text>
            </Pressable>
            {!canTrim && beardLength <= 0 && (
              <Text style={{ color: LABEL, fontSize: 12, textAlign: "center", marginTop: 8 }}>
                Already clean shaven — check back tomorrow.
              </Text>
            )}
            {!canTrim && beardLength > 0 && coins.balance < BARBERSHOP_TRIM_COST && (
              <Text style={{ color: LABEL, fontSize: 12, textAlign: "center", marginTop: 8 }}>
                Not enough coins for a trim right now.
              </Text>
            )}

            {/* Hair section for males */}
            <View style={{ alignItems: "center", backgroundColor: CARD, borderRadius: 16, paddingVertical: 20, marginTop: 16 }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16 }}>
                {hairLabel(hairLength)}
              </Text>
              <Text style={{ color: LABEL, fontSize: 12, marginTop: 4 }}>
                Hair also grows daily.
              </Text>
            </View>
            <Pressable
              onPress={handleHaircut}
              disabled={!canCut}
              style={{
                marginTop: 12,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: canCut ? ACCENT : "rgba(255,255,255,0.12)",
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="content-cut" size={20} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15, marginLeft: 8 }}>
                Cut Hair ({BARBERSHOP_TRIM_COST} coins)
              </Text>
            </Pressable>

            {discountMult < 1 && (
              <Text style={{ color: "#4ADE80", fontSize: 12, textAlign: "center", marginBottom: 8, fontWeight: "700" }}>
                🎉 75% OFF — new Hero discount! (Ends after first prestige)
              </Text>
            )}
            <SectionHeader title="HAIR STYLES" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
              {PAWN_HAIR_STYLES.filter((s) => s.gender === "both" || s.gender === pawn.gender).map((s) => {
                const crownLocked = !!s.unlockPrestige && prestigeLevel < s.unlockPrestige;
                const owned = ownedHair.includes(s.id) || (!!s.unlockPrestige && !crownLocked);
                const equipped = pawn.hairStyle === s.id;
                const price = discountedStylePrice(s.cost, discountMult);
                const locked = crownLocked || (!owned && s.minShopLevel > shopLevel);
                return (
                  <StyleGridItem
                    key={s.id}
                    preview={
                    <PaperHeroThumbnail
                      headOnly
                      size={64}
                      tunicColor={pawn.bodyColor}
                      hairStyle={s.id}
                      hairColor={pawn.hairColor || "#111827"}
                      beardStyle={pawn.beardStyle}
                      beardLength={isMale ? beardLength : 0}
                      eyeStyle={pawn.eyeStyle}
                      mouthStyle={pawn.mouthStyle}
                      accessory={pawn.accessory}
                      bodyStyle={pawn.bodyStyle}
                    />
                  }
                    name={s.label}
                    owned={owned}
                    equipped={equipped}
                    cost={price}
                    canAfford={coins.balance >= price}
                    locked={locked}
                    lockLabel={crownLocked ? `Requires Crown ${s.unlockPrestige}` : `Upgrade barbershop to Lv ${s.minShopLevel}`}
                    onBuy={() => handleBuyHair(s.id, discountedStylePrice(s.cost, discountMult), s.minShopLevel)}
                    onEquip={() => handleEquipHair(s.id)}
                  />
                );
              })}
            </View>

            <SectionHeader title="HAIR COLOR" />
            <Text style={{ color: LABEL, fontSize: 12, marginBottom: 8 }}>
              Free to change, anytime.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
              {PAWN_HAIR_COLORS.map((c) => {
                const selected = (pawn.hairColor || "#111827") === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => handleHairColor(c.id)}
                    accessibilityLabel={c.name}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: c.id,
                      borderWidth: selected ? 3 : 1,
                      borderColor: selected ? "#FFFFFF" : "rgba(255,255,255,0.25)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selected && <MaterialIcons name="check" size={22} color="#FFFFFF" />}
                  </Pressable>
                );
              })}
            </View>

            <SectionHeader title="BEARD STYLES" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
              {PAWN_BEARD_STYLES.map((s) => {
                const crownLocked = !!s.unlockPrestige && prestigeLevel < s.unlockPrestige;
                const owned = ownedBeard.includes(s.id) || (!!s.unlockPrestige && !crownLocked);
                const equipped = pawn.beardStyle === s.id;
                const price = discountedStylePrice(s.cost, discountMult);
                const locked = crownLocked || (!owned && s.minShopLevel > shopLevel);
                return (
                  <StyleGridItem
                    key={s.id}
                    preview={
                    <PaperHeroThumbnail
                      headOnly
                      size={64}
                      tunicColor={pawn.bodyColor}
                      hairStyle={pawn.hairStyle}
                      hairColor={pawn.hairColor || "#111827"}
                      beardStyle={s.id}
                      beardLength={55}
                      eyeStyle={pawn.eyeStyle}
                      mouthStyle={pawn.mouthStyle}
                      accessory={pawn.accessory}
                      bodyStyle={pawn.bodyStyle}
                    />
                  }
                    name={s.name}
                    owned={owned}
                    equipped={equipped}
                    cost={price}
                    canAfford={coins.balance >= price}
                    locked={locked}
                    lockLabel={crownLocked ? `Requires Crown ${s.unlockPrestige}` : `Upgrade barbershop to Lv ${s.minShopLevel}`}
                    onBuy={() => handleBuyBeard(s.id, price, s.minShopLevel)}
                    onEquip={() => handleEquipBeard(s.id)}
                  />
                );
              })}
            </View>
            <Text style={{ color: LABEL, fontSize: 12, textAlign: "center", marginTop: 4 }}>
              Styles you buy are yours forever.
            </Text>
          </>
        )}

        {hasShop && pawn && (
          <>
            <PlayCard
              icon="content-cut"
              title="Play: The Steady Trim"
              blurb="Eight passes with the clippers. The guide zone moves every pass — stop dead center for a barber's perfect line."
              playsLeft={trimPlaysLeft}
              cap={MINI_GAME_CAPS.trim}
              accent={ACCENT}
              onPlay={() => setPlayingTrim(true)}
            />
            {playingTrim && (
              <TrimGame
                accent={ACCENT}
                onComplete={handleTrimGameComplete}
                onExit={() => setPlayingTrim(false)}
                hairState={hairLabel(hairLength)}
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
