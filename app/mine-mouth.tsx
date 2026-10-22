// The Mouth — the mine's entrance and setup area (v172).
//
// Tapping the Great Peak no longer drops the hero straight down the
// shaft: it brings him here first, to the cave mouth — lantern light
// pooled on the ground, the hearth breathing just inside the arch,
// the town spread out below. This is the surface half of the mine:
// rest by the fire, check the pick, and sell the satchel at the
// counter. Selling lives HERE and only here (v172) — the cave below
// sells nothing; ore is heavy rock until it's hauled up to the
// Mouth. The satchel's bag is bought here too, one tier at a time.
// When he's ready, the cave mouth itself is the door down.
//
// The feeling is the brief (his correction, 2026-10-22): refuge,
// shelter, welcome — rendered in warm light and a place to sit,
// never spelled anywhere. The place has no name beyond "The Mine".
// No emojis — SVG paper art and MaterialIcons only.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Path, Polygon } from "react-native-svg";
import { InteriorHeader } from "@/components/interior-shell";
import { GreatPeakArt } from "@/components/great-peak";
import { PaperHeroFigure, PaperSeatedHero } from "@/components/paper-interior";
import { getTimeOfDay } from "@/lib/daynight";
import {
  applyCoinsDelta,
  formatCoins,
  loadCoinsRecord,
  type HometownCoins,
} from "@/lib/hometown";
import { loadPrestigeLevel, loadPrestigeState } from "@/lib/prestige";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import { loadHouseState } from "@/lib/pawn-house";
import { boonFor, combineBoons, loadHeroNeeds, poolBoonFor } from "@/lib/hero-needs";
import {
  loadHeroHealthRaw,
  restPctForBedTier,
  saveHeroHealth,
  settleHealth,
  type HeroHealthState,
} from "@/lib/hero-health";
import { combatStats, loadEquipped, refreshGearBoostCache } from "@/lib/gear";
import { refreshBadgeCache } from "@/lib/badges";
import { refreshStatBoostCache } from "@/lib/character-stats";
import {
  DAILY_FACE_CAP,
  MAX_BAG_TIER,
  MAX_PICK_TIER,
  MINE_TITLE,
  ORE_KINDS,
  ORE_PRICES,
  PICKAXES,
  applySellAll,
  bagFor,
  bagPurchaseCheck,
  formatHaulMultiplier,
  haulValue,
  loadMineState,
  pickGateMet,
  pickaxeFor,
  satchelCapacity,
  satchelCount,
  saveMineState,
  type MineGates,
  type MineState,
  type OreKind,
} from "@/lib/mountain";

const BG = "#20142E";
const INK = "#2A1A33";
const PANEL = "#2E2140";
const CREAM = "#F7F0DE";
const DIM = "#B8A9CC";
const GOLD = "#C9963C";

/* ------------------------------------------------------------------ */
/* Small paper glyphs (the mine interior's own, carried up)            */
/* ------------------------------------------------------------------ */

/** A pickaxe in a 24-box, head in the tier's color. */
function PickIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.5 6.5 C 8 2.8, 16 2.8, 20.5 6.5 C 15 5, 9 5, 3.5 6.5 Z" fill={color} />
      <Path d="M11.2 5.2 L14.8 18.6" stroke="#8A5A2B" strokeWidth={2.1} strokeLinecap="round" />
    </Svg>
  );
}

/** An ore nugget / gem in the satchel's colors. */
function OreGlyph({ kind, size = 16 }: { kind: OreKind; size?: number }) {
  if (kind === "diamond") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 3 L19 10 L12 21 L5 10 Z" fill="#9BE8F5" />
        <Path d="M5 10 H19 M12 21 L8.5 10 L12 3 L15.5 10 L12 21" fill="none" stroke="#CFF7FF" strokeWidth={1.1} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon points="7,5 15,3.4 20,8.6 18.4,16.6 10,20 4.4,14.6" fill={kind === "gold" ? "#F2B33D" : "#C96F3F"} />
      <Polygon points="7,5 12,9 10,20 4.4,14.6" fill={kind === "gold" ? "#FBBF24" : "#D97E4A"} opacity={0.75} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Relax — a chair, not a system                                       */
/* ------------------------------------------------------------------ */

/**
 * Sitting by the hearth is PURE SCENE STATE: it reads nothing,
 * writes nothing, heals nothing, pays nothing. The rest is in the
 * sitting. (Pinned by test: nothing in this hook may touch storage,
 * the ledger, or health.)
 */
function useRelax() {
  const [relaxing, setRelaxing] = useState(false);
  const toggleRelax = useCallback(() => setRelaxing((v) => !v), []);
  return { relaxing, toggleRelax };
}

/** The seated hero, breathing — a calm sine sway on the native
 *  driver, the kit's house motion. No bounce, no spring. */
function BreathingSeat({ children }: { children: ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View
      style={{
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -1.6] }) },
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* The screen                                                          */
/* ------------------------------------------------------------------ */

export default function MineMouthScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [mine, setMine] = useState<MineState | null>(null);
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [gates, setGates] = useState<MineGates>({ totalPrestiges: 0, crowns: 0 });
  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  const [heroHealth, setHeroHealth] = useState<HeroHealthState | null>(null);
  const [effMax, setEffMax] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { relaxing, toggleRelax } = useRelax();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const refresh = useCallback(async () => {
    const [m, c, pState, crowns, pwn] = await Promise.all([
      loadMineState(),
      loadCoinsRecord(),
      loadPrestigeState(),
      loadPrestigeLevel(),
      loadCustomPawn().catch(() => null),
    ]);
    setMine(m);
    setCoins(c);
    setGates({ totalPrestiges: pState.totalPrestiges, crowns });
    setPawn(pwn);
    // Hero health, settled and maxed exactly as the cave, the
    // forest and the hospital compute it — one HP, every door.
    try {
      try { await refreshGearBoostCache(); } catch {}
      try { await refreshBadgeCache(); } catch {}
      try { await refreshStatBoostCache(); } catch {}
      const [house, nds, equipped] = await Promise.all([
        loadHouseState(),
        loadHeroNeeds(),
        loadEquipped(),
      ]);
      const boon = combineBoons(boonFor(nds, house), poolBoonFor(nds));
      const base = combatStats(equipped);
      const max = boon.active ? Math.round(base.maxHp * (1 + boon.hpPct)) : base.maxHp;
      setEffMax(max);
      const bedTier = house.rooms.bedroom?.furniture["bed"] || 0;
      const raw = await loadHeroHealthRaw();
      const { state: settled, changed } = settleHealth(raw, Date.now(), max, restPctForBedTier(bedTier));
      setHeroHealth(settled);
      if (changed) await saveHeroHealth(settled).catch(() => undefined);
    } catch {}
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  /** Sell the satchel at the counter — the mine's ONLY till (v172),
   *  paid through the canonical ledger, haul multiplier and all. */
  const handleSellAll = useCallback(() => {
    if (!mine) return;
    const { state, coins: total } = applySellAll(mine);
    if (total <= 0) return;
    void (async () => {
      const next = await applyCoinsDelta(total, "cent");
      setCoins(next);
      setMine(state);
      await saveMineState(state);
      showToast(`Satchel sold — +${formatCoins(total)} coins`);
    })();
  }, [mine, showToast]);

  /** Buy the next bag up, here at the counter, one tier at a time. */
  const handleBuyBag = useCallback(() => {
    if (!mine) return;
    const tier = mine.bagTier + 1;
    const bag = bagFor(tier);
    const check = bagPurchaseCheck(mine.bagTier, tier, gates);
    if (!check.ok) {
      if (check.reason === "crown") {
        Alert.alert(
          "Crown work",
          "The Crown Haul Bag belongs to the Crown. Earn a Crown — a 365-day fast, then Begin Again — and the biggest bag can be yours."
        );
      }
      return;
    }
    if (coins.balance < check.cost) {
      Alert.alert("Not enough coins", `${bag.name} costs ${formatCoins(check.cost)} coins. You have ${formatCoins(coins.balance)}.`);
      return;
    }
    Alert.alert(`Buy the ${bag.name}?`, `${formatCoins(check.cost)} coins. It holds ${bag.capacity} pieces of ore — longer hauls before the climb back up.`, [
      { text: "Not yet", style: "cancel" },
      {
        text: "Buy",
        onPress: () => {
          void (async () => {
            const nextCoins = await applyCoinsDelta(-check.cost, "dime");
            setCoins(nextCoins);
            const nextMine: MineState = { ...mine, bagTier: tier };
            await saveMineState(nextMine);
            setMine(nextMine);
            showToast(`${bag.name} — holds ${bag.capacity}`);
          })();
        },
      },
    ]);
  }, [mine, gates, coins.balance, showToast]);

  const tod = getTimeOfDay();
  const night = tod === "night" || tod === "evening";
  const sceneW = Math.max(0, width - 32);
  const sceneH = sceneW * (46 / 100);
  const heroUnit = (sceneW / 100) * 1.05;

  const count = mine ? satchelCount(mine.satchel) : 0;
  const cap = mine ? satchelCapacity(mine) : 0;
  const worth = mine ? haulValue(mine) : 0;
  const hp = heroHealth && effMax > 0 ? heroHealth.hp ?? effMax : null;
  const pick = mine ? pickaxeFor(mine.pickTier) : null;
  const nextPick = mine && mine.pickTier < MAX_PICK_TIER ? pickaxeFor(mine.pickTier + 1) : null;
  const nextBag = mine && mine.bagTier < MAX_BAG_TIER ? bagFor(mine.bagTier + 1) : null;
  const nextBagCheck = mine ? bagPurchaseCheck(mine.bagTier, mine.bagTier + 1, gates) : null;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="terrain" iconColor={GOLD} title={MINE_TITLE} coins={coins} bg={BG} textColor={CREAM} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={{ color: DIM, fontSize: 13, lineHeight: 19, marginHorizontal: 16, marginBottom: 12 }}>
          The mouth of the mine, under the peak — lantern light on warm stone, a hearth by the door, and the
          town spread out below. Rest a while. Check your pick. Sell what you've hauled. The rock will keep.
        </Text>

        {toast && (
          <View style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: "#3B2C14", borderColor: GOLD, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: "center" }}>
            <Text style={{ color: "#FDE68A", fontWeight: "800", fontSize: 14 }}>{toast}</Text>
          </View>
        )}

        {/* the entrance scene — the peak's own art, the hero at the
            mouth. Tap it and he sits down by the hearth; tap again
            and he stands. Nothing else happens. That's the point. */}
        <Pressable
          onPress={toggleRelax}
          accessibilityLabel={relaxing ? "Stand up" : "Relax by the hearth"}
          style={{ marginHorizontal: 16, borderRadius: 16, overflow: "hidden" }}
        >
          <View style={{ width: sceneW, height: sceneH }}>
            <GreatPeakArt width={sceneW} night={night} />
            {pawn && !relaxing && (
              <View pointerEvents="none" style={{ position: "absolute", bottom: 0, left: sceneW * 0.63 - (11 * heroUnit) / 2 }}>
                <PaperHeroFigure pawn={pawn} unit={heroUnit} />
              </View>
            )}
            {pawn && relaxing && (
              <View pointerEvents="none" style={{ position: "absolute", bottom: sceneH * 0.05, left: sceneW * 0.5 - (12 * heroUnit) / 2 }}>
                <BreathingSeat>
                  <PaperSeatedHero pawn={pawn} unit={heroUnit} />
                </BreathingSeat>
              </View>
            )}
          </View>
        </Pressable>
        <Pressable
          onPress={toggleRelax}
          style={{ alignSelf: "center", flexDirection: "row", alignItems: "center", marginTop: 10, backgroundColor: PANEL, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(201,150,60,.45)" }}
        >
          <MaterialIcons name="self-improvement" size={16} color="#FDE68A" />
          <Text style={{ color: CREAM, fontWeight: "700", fontSize: 12.5, marginLeft: 6 }}>
            {relaxing ? "Stand up" : "Relax by the hearth"}
          </Text>
        </Pressable>
        <Text style={{ color: DIM, fontSize: 11.5, textAlign: "center", marginTop: 6, marginBottom: 2 }}>
          {relaxing ? "Resting. The fire, the quiet, the town below." : "Sit a while, if you like. There's no hurry at the Mouth."}
        </Text>

        {!mine ? (
          <Text style={{ color: DIM, textAlign: "center", marginTop: 24 }}>Lighting the lanterns…</Text>
        ) : (
          <>
            {/* hero strength — the state he walks in with */}
            {hp != null && (
              <View style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: PANEL, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(24,8,44,.6)" }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialIcons name="favorite" size={17} color="#F87171" />
                  <Text style={{ color: CREAM, fontWeight: "800", fontSize: 13, marginLeft: 7 }}>Hero HP</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={{ color: CREAM, fontWeight: "800", fontSize: 13 }}>{hp} / {effMax}</Text>
                </View>
                <View style={{ height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,.12)", marginTop: 8, overflow: "hidden" }}>
                  <View style={{ height: 7, borderRadius: 4, backgroundColor: hp / effMax > 0.35 ? "#4ADE80" : "#F87171", width: `${Math.max(0, Math.min(100, (hp / effMax) * 100))}%` }} />
                </View>
                <Text style={{ color: DIM, fontSize: 11, lineHeight: 15, marginTop: 7 }}>
                  The deep rock can take it out of him — a cave-in costs a fifth of his strength. The still pool
                  below and the hospital in town can mend him.
                </Text>
              </View>
            )}

            {/* tool check — what he carries, and where the next rung lives */}
            {pick && (
              <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: PANEL, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(24,8,44,.6)" }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <PickIcon color={pick.color} size={26} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={{ color: DIM, fontSize: 10.5, fontWeight: "700", letterSpacing: 1 }}>YOUR PICK</Text>
                    <Text style={{ color: CREAM, fontWeight: "800", fontSize: 15 }}>{pick.name}</Text>
                  </View>
                  <Pressable
                    onPress={() => router.push("/gear-shop?type=tool")}
                    style={{ backgroundColor: GOLD, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center" }}
                  >
                    <MaterialIcons name="storefront" size={15} color={INK} />
                    <Text style={{ color: INK, fontWeight: "800", fontSize: 12.5, marginLeft: 5 }}>Tool Shop</Text>
                  </Pressable>
                </View>
                <Text style={{ color: DIM, fontSize: 12, lineHeight: 17, marginTop: 9 }}>
                  Carried: {PICKAXES.filter((p) => p.tier <= mine.pickTier).map((p) => p.name).join(" · ")}
                </Text>
                {nextPick ? (
                  <Text style={{ color: DIM, fontSize: 12, lineHeight: 17, marginTop: 3 }}>
                    Next rung: {nextPick.name}
                    {nextPick.gate !== "none" && !pickGateMet(nextPick.tier, gates)
                      ? nextPick.gate === "crown"
                        ? " — it belongs to the Crown."
                        : " — it waits behind Begin Again."
                      : ` — ${formatCoins(nextPick.cost)} coins at the Tool Shop.`}
                  </Text>
                ) : (
                  <Text style={{ color: DIM, fontSize: 12, lineHeight: 17, marginTop: 3 }}>
                    You carry the finest pick the mountain knows.
                  </Text>
                )}
              </View>
            )}

            {/* the counter — the satchel, the haul, the bag */}
            <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: PANEL, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(24,8,44,.6)" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ color: CREAM, fontWeight: "800", fontSize: 14 }}>Satchel</Text>
                <Text style={{ color: DIM, fontSize: 12, marginLeft: 8 }}>{bagFor(mine.bagTier).name} · {count} / {cap}</Text>
                <View style={{ flex: 1 }} />
                <Text style={{ color: "#FDE68A", fontWeight: "800", fontSize: 13 }}>Haul ×{formatHaulMultiplier(mine.haulMultiplier)}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
                {ORE_KINDS.map((k) => (
                  <View key={k} style={{ flexDirection: "row", alignItems: "center", marginRight: 14 }}>
                    <OreGlyph kind={k} size={18} />
                    <Text style={{ color: CREAM, fontSize: 13.5, fontWeight: "700", marginLeft: 4 }}>× {mine.satchel[k]}</Text>
                    <Text style={{ color: DIM, fontSize: 10.5, marginLeft: 3 }}>@{ORE_PRICES[k]}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ color: DIM, fontSize: 11.5, lineHeight: 16, marginTop: 8 }}>
                The deeper the rock you've broken, the more the whole haul pays — the Deep triples it. Selling
                banks the rate; a cave-in spends it. Ore sells here at the Mouth, and nowhere else.
              </Text>
              <Pressable
                onPress={handleSellAll}
                disabled={worth <= 0}
                style={{ backgroundColor: worth > 0 ? GOLD : "rgba(255,255,255,.12)", borderRadius: 10, paddingVertical: 11, alignItems: "center", marginTop: 10 }}
              >
                <Text style={{ color: worth > 0 ? INK : DIM, fontWeight: "800", fontSize: 13.5 }}>
                  Sell all{worth > 0 ? ` · ${formatCoins(worth)} coins` : ""}
                </Text>
              </Pressable>

              {/* the next bag, sold at this same counter */}
              {nextBag ? (
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, backgroundColor: "rgba(255,255,255,.05)", borderRadius: 10, paddingVertical: 9, paddingHorizontal: 11 }}>
                  <MaterialIcons name="shopping-bag" size={17} color={DIM} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ color: CREAM, fontWeight: "700", fontSize: 12.5 }}>{nextBag.name} — holds {nextBag.capacity}</Text>
                    {nextBagCheck && !nextBagCheck.ok && nextBagCheck.reason === "crown" ? (
                      <Text style={{ color: DIM, fontSize: 11 }}>It belongs to the Crown.</Text>
                    ) : (
                      <Text style={{ color: DIM, fontSize: 11 }}>{formatCoins(nextBag.cost)} coins</Text>
                    )}
                  </View>
                  {nextBagCheck?.ok && (
                    <Pressable onPress={handleBuyBag} style={{ backgroundColor: "rgba(201,150,60,.25)", borderWidth: 1, borderColor: GOLD, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 }}>
                      <Text style={{ color: "#FDE68A", fontWeight: "800", fontSize: 12 }}>Buy</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <Text style={{ color: DIM, fontSize: 11.5, marginTop: 10 }}>
                  The Crown Haul Bag is the biggest there is — this one carries it all.
                </Text>
              )}
            </View>

            {/* the door down */}
            <Pressable
              onPress={() => router.push("/mine-interior")}
              style={{ marginHorizontal: 16, marginTop: 14, backgroundColor: GOLD, borderRadius: 14, paddingVertical: 15, alignItems: "center", flexDirection: "row", justifyContent: "center" }}
            >
              <MaterialIcons name="arrow-downward" size={19} color={INK} />
              <Text style={{ color: INK, fontWeight: "900", fontSize: 16, marginLeft: 7 }}>Enter the Cave</Text>
            </Pressable>
            <Text style={{ color: DIM, fontSize: 12, textAlign: "center", marginTop: 9 }}>
              Faces mined today: {mine.minedToday} / {DAILY_FACE_CAP}
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
