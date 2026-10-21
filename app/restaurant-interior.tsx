import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  BUILDINGS,
  COINS_STORAGE_KEY,
  TOWN_STORAGE_KEY,
  BANQUET_FELLOWSHIP_RATES,
  BANQUET_GATHER_CAPS,
  isGatheringTime,
  parseCoins,
  parseTown,
  prayedTodayPeople,
  scaledCoins,
  scaledXP,
  type HometownCoins,
  type PlacedBuilding,
  type PrayedPerson,
} from "@/lib/hometown";
import {
  RESTAURANT_SLOTS,
  loadRestaurantInterior,
  saveRestaurantInterior,
  type RestaurantInteriorState,
  type RestaurantSlot,
} from "@/lib/restaurant-interior";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import { PawnPreview } from "@/components/pawn-preview";
import { FigureName, GentleBob } from "@/components/activity-figures";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import { CUISINE_THEMES, type CuisinePalette } from "@/components/cuisine-themes";
import { PaperTacoRoom } from "@/components/paper-taco-room";
import { PaperRestaurantRoom } from "@/components/paper-restaurant-room";
import { PaperBanquetRoom } from "@/components/paper-banquet-room";
import { paperCuisineFor } from "@/lib/paper-restaurant";
import { getTimeOfDay } from "@/lib/daynight";
import { awardCustomXP } from "@/lib/xp-engine";
import { ServeGame } from "@/components/serve-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";
import {
  PIZZA_FEATURES,
  loadPizzaFeatures,
  pizzaFeaturesBonusPct,
  savePizzaFeatures,
  type PizzaFeatureDef,
  type PizzaFeaturesState,
} from "@/lib/pizza-features";
import { TokenTossGame } from "@/components/token-toss-game";
import {
  COFFEE_PRICE,
  COFFEE_XP,
  coffeesLeftToday,
  grantCoffeeEnergy,
  recordCoffeePurchase,
} from "@/lib/diner-coffee";

// ---------- palette: warm candlelit dining room ----------
// Dark warm wood, amber candlelight, golden accents — an evening meal together.
const BG = "#241811"; // dark warm brown walls
const CARD = "#3A2A1C"; // warm card
const CARD_BORDER = "#5C4227";
const WOOD = "#8B5E34"; // wood
const WOOD_DARK = "#5E3D22";
const WOOD_PALE = "#C68B4E";
const GOLD = "#E0A63F";
const FLAME = "#FF9A3D";
const TEXT = "#F5E6D0"; // warm cream
const TEXT_DIM = "#B89A72"; // warm muted
const FLOOR = "#6B4A2B"; // wooden floor
const FLOOR_LINE = "#54371F";

// Tablecloth color per tables tier (0 = bare wood, no cloth)
const TABLECLOTH = ["", "#F7EBD4", "#C9754A", "#7A3B2E"];

// Default palette (generic candlelit dining room) for themed sub-components.
const DEFAULT_PAL: CuisinePalette = {
  bg: BG, wall: "#3A2817", floor: FLOOR, floorLine: FLOOR_LINE,
  card: CARD, cardBorder: CARD_BORDER, accent: GOLD,
  text: TEXT, textDim: TEXT_DIM,
  cloth: TABLECLOTH, wood: WOOD, woodDark: WOOD_DARK,
};

// ---------- gentle floating bread indicator (fade only, no bounce) ----------
function BreakingBreadFloat() {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);
  return (
    <Animated.View
      style={{
        alignItems: "center",
        marginTop: 4,
        opacity: drift.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
        transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
      }}
    >
      {/* drawn bread loaf */}
      <View style={{ alignItems: "center" }}>
        <View style={{ width: 40, height: 22, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: "#D8A85C", borderWidth: 2, borderColor: "#A87838" }} />
        <View style={{ flexDirection: "row", marginTop: -18 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: 8, height: 3, borderRadius: 1.5, backgroundColor: "#FFF3D6", marginHorizontal: 2, transform: [{ rotate: "-20deg" }] }} />
          ))}
        </View>
        <View style={{ width: 46, height: 5, borderRadius: 2.5, backgroundColor: "#8B5E34", marginTop: 12 }} />
      </View>
      <Text style={{ color: GOLD, fontSize: 12, fontWeight: "700", marginTop: 2 }}>Breaking bread together</Text>
    </Animated.View>
  );
}

// ---------- furniture row ----------
function FurnitureRow({
  slot,
  tier,
  affordable,
  onBuy,
  pal = DEFAULT_PAL,
}: {
  slot: RestaurantSlot;
  tier: number;
  affordable: (cost: number) => boolean;
  onBuy: (slot: RestaurantSlot) => void;
  pal?: CuisinePalette;
}) {
  const maxed = tier >= 3;
  const nextName = maxed ? null : slot.tierNames[tier]; // tier 0 -> tierNames[0]
  const nextCost = maxed ? 0 : slot.costs[tier];
  const bonus = maxed ? slot.bonusPct[2] : tier > 0 ? slot.bonusPct[tier - 1] : 0;
  const canAfford = !maxed && affordable(nextCost);
  return (
    <View
      style={{
        backgroundColor: pal.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: pal.cardBorder,
        padding: 12,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 26 }}>{slot.icon}</Text>
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ color: pal.text, fontWeight: "800", fontSize: 14 }}>{slot.name}</Text>
        <Text style={{ color: pal.textDim, fontSize: 12, marginTop: 1 }}>
          {tier > 0 ? slot.tierNames[tier - 1] : "Not furnished"}
          {bonus > 0 ? `  ·  +${bonus}% income` : ""}
        </Text>
        {!maxed && <Text style={{ color: pal.textDim, fontSize: 11, marginTop: 1 }}>{slot.blurb}</Text>}
        {maxed && <Text style={{ color: pal.accent, fontSize: 11, marginTop: 1, fontWeight: "700" }}>Fully furnished</Text>}
      </View>
      {!maxed && (
        <Pressable
          onPress={() => onBuy(slot)}
          disabled={!canAfford}
          style={{
            backgroundColor: canAfford ? pal.accent : "#4A3826",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            opacity: canAfford ? 1 : 0.5,
          }}
        >
          <Text style={{ color: canAfford ? "#241811" : pal.textDim, fontWeight: "800", fontSize: 12 }}>
            {tier === 0 ? "Buy" : "Upgrade"} 🪙{nextCost.toFixed(2)}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ---------- pizza party feature row (stage / arcade / prize) ----------
function PizzaFeatureRow({
  def,
  tier,
  affordable,
  onBuy,
  pal = DEFAULT_PAL,
}: {
  def: PizzaFeatureDef;
  tier: number;
  affordable: (cost: number) => boolean;
  onBuy: (def: PizzaFeatureDef) => void;
  pal?: CuisinePalette;
}) {
  const maxed = tier >= 3;
  const nextCost = maxed ? 0 : def.costs[tier];
  const bonus = maxed ? def.bonusPct[2] : tier > 0 ? def.bonusPct[tier - 1] : 0;
  const canAfford = !maxed && affordable(nextCost);
  return (
    <View
      style={{
        backgroundColor: pal.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: pal.cardBorder,
        padding: 12,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: "rgba(255,90,122,0.14)",
          borderWidth: 1,
          borderColor: pal.accent,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name={def.icon as keyof typeof MaterialIcons.glyphMap} size={24} color={pal.accent} />
      </View>
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ color: pal.text, fontWeight: "800", fontSize: 14 }}>{def.name}</Text>
        <Text style={{ color: pal.textDim, fontSize: 12, marginTop: 1 }}>
          {tier > 0 ? def.tierNames[tier - 1] : "Not built yet"}
          {bonus > 0 ? `  ·  +${bonus}% income` : ""}
        </Text>
        {!maxed && <Text style={{ color: pal.textDim, fontSize: 11, marginTop: 1 }}>{def.blurb}</Text>}
        {maxed && <Text style={{ color: pal.accent, fontSize: 11, marginTop: 1, fontWeight: "700" }}>Fully built — the party is complete</Text>}
      </View>
      {!maxed && (
        <Pressable
          onPress={() => onBuy(def)}
          disabled={!canAfford}
          style={{
            backgroundColor: canAfford ? pal.accent : "#4A3826",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            opacity: canAfford ? 1 : 0.5,
          }}
        >
          <Text style={{ color: canAfford ? "#FFFFFF" : pal.textDim, fontWeight: "800", fontSize: 12 }}>
            {tier === 0 ? "Build" : "Upgrade"} · {nextCost} coins
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ---------- a curl of steam when a coffee is poured ----------
function CoffeeSteamBurst({ burstKey, color }: { burstKey: number; color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 1300, easing: Easing.out(Easing.sin), useNativeDriver: true }).start();
  }, [burstKey, v]);
  if (burstKey <= 0) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: -16,
        right: 26,
        opacity: v.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.85, 0] }),
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [6, -16] }) }],
      }}
    >
      <View style={{ flexDirection: "row" }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: 5, height: 14, borderRadius: 2.5, backgroundColor: color, marginHorizontal: 2.5, opacity: 0.75 }} />
        ))}
      </View>
    </Animated.View>
  );
}

// ---------- deterministic daily diner pick (stable per building + day) ----------
function pickDiners(people: PrayedPerson[], buildingId: string, cap: number): PrayedPerson[] {
  if (people.length === 0 || cap <= 0) return [];
  const now = new Date();
  const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const seed = `${buildingId}|${dayKey}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const start = hash % people.length;
  const picked: PrayedPerson[] = [];
  for (let i = 0; i < Math.min(cap, people.length); i++) picked.push(people[(start + i) % people.length]);
  return picked;
}

// ---------- main screen ----------
export default function RestaurantInteriorScreen() {
  const router = useRouter();
  const { buildingId } = useLocalSearchParams<{ buildingId?: string }>();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [building, setBuilding] = useState<PlacedBuilding | null>(null);
  const [people, setPeople] = useState<PrayedPerson[]>([]);
  const [interior, setInterior] = useState<RestaurantInteriorState>({ furniture: {} });
  const [pizza, setPizza] = useState<PizzaFeaturesState>({ features: {} });
  const [coffeeLeft, setCoffeeLeft] = useState<number | null>(null);
  const [coffeeBursts, setCoffeeBursts] = useState(0);
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
            if (found) {
              setBuilding(found);
              break outer;
            }
          }
        }
        setPeople(await prayedTodayPeople());
        if (buildingId) {
          setInterior(await loadRestaurantInterior(buildingId));
          setPizza(await loadPizzaFeatures(buildingId));
        }
        setCoffeeLeft(await coffeesLeftToday());
      } catch {}
      setLoaded(true);
    })();
  }, [buildingId]);

  // Ref mirror of coins for fresh reads inside event handlers (avoids stale closures).
  const coinsRef = useRef(coins);
  useEffect(() => {
    coinsRef.current = coins;
  }, [coins]);

  // Transactional coin delta: functional setState so concurrent transactions never clobber each other.
  const addCoins = useCallback((delta: number) => {
    setCoins((prev) => {
      const next = {
        balance: Math.round((prev.balance + delta) * 10) / 10,
        lifetimeEarned: delta > 0 ? Math.round((prev.lifetimeEarned + delta) * 10) / 10 : prev.lifetimeEarned,
      };
      AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const handleBuy = useCallback(
    (slot: RestaurantSlot) => {
      if (!buildingId) return;
      const tier = interior.furniture[slot.id] || 0;
      if (tier >= 3) return;
      const cost = slot.costs[tier];
      if (coinsRef.current.balance < cost) {
        Alert.alert("Not enough coins", `You need ${cost} coins. You have ${coinsRef.current.balance.toFixed(2)}.`);
        return;
      }
      const next = { furniture: { ...interior.furniture, [slot.id]: tier + 1 } };
      setInterior(next);
      saveRestaurantInterior(buildingId, next);
      addCoins(-cost);
    },
    [buildingId, interior, addCoins]
  );

  const handleBuyFeature = useCallback(
    (def: PizzaFeatureDef) => {
      if (!buildingId) return;
      const tier = pizza.features[def.id] || 0;
      if (tier >= 3) return;
      const cost = def.costs[tier];
      if (coinsRef.current.balance < cost) {
        Alert.alert("Not enough coins", `You need ${cost} coins. You have ${coinsRef.current.balance.toFixed(2)}.`);
        return;
      }
      const next = { features: { ...pizza.features, [def.id]: tier + 1 } };
      setPizza(next);
      savePizzaFeatures(buildingId, next);
      addCoins(-cost);
    },
    [buildingId, pizza, addCoins]
  );

  // Diner coffee: 3 cups a day, each +1 forest energy (over the cap) + 10 XP.
  const handleBuyCoffee = useCallback(async () => {
    if (coffeeLeft === null || coffeeLeft <= 0) return;
    if (coinsRef.current.balance < COFFEE_PRICE) {
      Alert.alert("Not enough coins", `A coffee is ${COFFEE_PRICE} coins. You have ${coinsRef.current.balance.toFixed(2)}.`);
      return;
    }
    const left = await recordCoffeePurchase();
    if (left < 0) {
      setCoffeeLeft(0);
      return;
    }
    addCoins(-COFFEE_PRICE);
    await grantCoffeeEnergy();
    awardCustomXP(COFFEE_XP, `diner-coffee-${Date.now()}`).catch(() => undefined);
    setCoffeeLeft(left);
    setCoffeeBursts((n) => n + 1);
  }, [coffeeLeft, addCoins]);

  // Serve the Table — shared host (components/mini-game-host.ts): the
  // same daily cap and payout pipeline as the campus Cafeteria.
  const serve = useMiniGameHost("serve", addCoins);
  // Token Toss — the Pizza Place arcade game, same shared host pipeline.
  const arcade = useMiniGameHost("arcade", addCoins);

  const def = building ? BUILDINGS[building.type] : null;
  const name = def?.name ?? "Restaurant";
  // Cuisine theme: the interior is styled to the food this place serves.
  const cuisine = building?.type ?? "diner";
  const pal: CuisinePalette =
    cuisine in CUISINE_THEMES ? CUISINE_THEMES[cuisine as keyof typeof CUISINE_THEMES] : DEFAULT_PAL;
  // Building upgrade level drives the room's richness: more tables, chandelier, rug.
  const bLevel = Math.min(Math.max(building?.level || 1, 1), 3);

  const gathering = isGatheringTime();
  const isBanquet = building?.type === "feast-hall" || building?.type === "banquet-table";
  const isMarriageSupper = building?.type === "banquet-table";
  // The Banquet Table seats everyone during the Gathering; a few linger otherwise.
  // The Marriage Supper seats the whole town by level.
  const cap = isMarriageSupper
    ? BANQUET_GATHER_CAPS[Math.min(Math.max(building?.level || 1, 1), 3)] ?? 40
    : isBanquet ? (gathering ? 24 : 6) : gathering ? 12 : 6;
  const diners = pickDiners(people, buildingId ?? "restaurant", cap);
  // More tables as the building levels up: 2 → 3 → 4 (banquet uses the one long table).
  const tableCount = isBanquet ? 1 : bLevel >= 3 ? 4 : bLevel >= 2 ? 3 : 2;
  const tableDiners: PrayedPerson[][] = Array.from({ length: tableCount }, () => []);
  diners.forEach((p, i) => tableDiners[i % tableCount].push(p));

  const tablesTier = interior.furniture["tables"] || 0;
  const chairsTier = interior.furniture["chairs"] || 0;
  const kitchenTier = interior.furniture["kitchen"] || 0;
  const lightsTier = interior.furniture["stringlights"] || 0;
  const artTier = interior.furniture["wallart"] || 0;

  let totalBonusPct = 0;
  for (const slot of RESTAURANT_SLOTS) {
    const t = interior.furniture[slot.id] || 0;
    if (t > 0) totalBonusPct += slot.bonusPct[t - 1] ?? 0;
  }
  // Pizza Place party features add their % to the same banner (and to the
  // same income hook in restaurantInteriorBonus).
  const stageTier = pizza.features["stage"] || 0;
  const arcadeTier = pizza.features["arcade"] || 0;
  const prizeTier = pizza.features["prize"] || 0;
  if (cuisine === "pizza-place") totalBonusPct += pizzaFeaturesBonusPct(pizza);

  return (
    <View style={{ flex: 1, backgroundColor: pal.bg }}>
      {/* header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 48,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={pal.text} />
        </Pressable>
        <MaterialIcons name="restaurant" size={26} color={pal.accent} style={{ marginLeft: 4 }} />
        <Text style={{ marginLeft: 8, fontSize: 20, fontWeight: "800", color: pal.text }}>{name}</Text>
        <View style={{ flex: 1 }} />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: pal.card,
            borderRadius: 16,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderWidth: 1,
            borderColor: pal.cardBorder,
          }}
        >
          <Text style={{ fontSize: 15 }}>🪙</Text>
          <Text style={{ marginLeft: 5, fontWeight: "700", color: pal.text }}>
            {coins.balance.toFixed(2)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {gathering && (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              borderRadius: 16,
              backgroundColor: pal.card,
              borderWidth: 1,
              borderColor: pal.accent,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 30, height: 18, borderTopLeftRadius: 15, borderTopRightRadius: 15, backgroundColor: "#D8A85C", borderWidth: 2, borderColor: "#A87838" }} />
              <View style={{ width: 34, height: 4, borderRadius: 2, backgroundColor: "#8B5E34", marginTop: -2 }} />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: pal.text, fontWeight: "800", fontSize: 15 }}>The Gathering is on</Text>
              <Text style={{ color: pal.textDim, fontSize: 12, marginTop: 2 }}>
                Extra chairs are out — up to 12 villagers can break bread together tonight.
              </Text>
            </View>
          </View>
        )}

        {/* dining room scene */}
        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: pal.cardBorder,
            overflow: "hidden",
            backgroundColor: pal.wall,
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="restaurant" />
          {cuisine === "taco-stand" ? (
            <>
              {/* the Taco Stand renders as a paper diorama now — the
                  paper cutout proof for every interior (the pixel room
                  stays in the repo, shelved) — room, furniture and
                  people alike, all layered paper */}
              <PaperTacoRoom
                tableDiners={tableDiners}
                tablesTier={tablesTier}
                chairsTier={chairsTier}
                kitchenTier={kitchenTier}
                level={bLevel}
                gathering={gathering}
                halloween={getHolidaySeason() === "halloween"}
                isNight={getTimeOfDay() === "night"}
              />
              {gathering && diners.length > 0 && <BreakingBreadFloat />}
              {diners.length === 0 && (
                <Text
                  style={{
                    color: pal.textDim,
                    fontSize: 13,
                    fontStyle: "italic",
                    textAlign: "center",
                    marginVertical: 18,
                    paddingHorizontal: 24,
                  }}
                >
                  The tables are set, but the chairs are empty. Pray for someone today and they'll pull up a chair.
                </Text>
              )}
            </>
          ) : isBanquet ? (
            <>
              {/* the banquet rooms render as paper dioramas now —
                  one long table, diners down both sides, the hero
                  at its head (paper rollout batch 1) */}
              <PaperBanquetRoom
                config={paperCuisineFor(cuisine)}
                diners={diners}
                tablesTier={tablesTier}
                level={bLevel}
                lightsTier={lightsTier}
                artTier={artTier}
                gathering={gathering}
                halloween={getHolidaySeason() === "halloween"}
                isNight={getTimeOfDay() === "night"}
              />
              {gathering && diners.length > 0 && <BreakingBreadFloat />}
              {diners.length === 0 && (
                <Text
                  style={{
                    color: pal.textDim,
                    fontSize: 13,
                    fontStyle: "italic",
                    textAlign: "center",
                    marginVertical: 18,
                    paddingHorizontal: 24,
                  }}
                >
                  The long table is set, but every seat is empty. Pray for someone today and they'll take their place.
                </Text>
              )}
            </>
          ) : (
            <>
              {/* every other restaurant renders as a paper diorama
                  now (paper rollout batch 1) — booths, kitchen and
                  people from the shared paper kit, each cuisine's
                  identity carried by its config: pizza oven + party
                  band, burger palms, diner pie case + coffee, sushi
                  conveyor, communion table, bread oven */}
              <PaperRestaurantRoom
                config={paperCuisineFor(cuisine)}
                tableDiners={tableDiners}
                tablesTier={tablesTier}
                chairsTier={chairsTier}
                kitchenTier={kitchenTier}
                level={bLevel}
                lightsTier={lightsTier}
                artTier={artTier}
                pizzaTiers={cuisine === "pizza-place" ? { stageTier, arcadeTier, prizeTier } : undefined}
                gathering={gathering}
                halloween={getHolidaySeason() === "halloween"}
                isNight={getTimeOfDay() === "night"}
              />
              {gathering && diners.length > 0 && <BreakingBreadFloat />}
              {diners.length === 0 && (
                <Text
                  style={{
                    color: pal.textDim,
                    fontSize: 13,
                    fontStyle: "italic",
                    textAlign: "center",
                    marginVertical: 18,
                    paddingHorizontal: 24,
                  }}
                >
                  The tables are set, but the chairs are empty. Pray for someone today and they'll pull up a chair.
                </Text>
              )}
            </>
          )}
        </View>

        {/* interior bonus banner — the Marriage Supper is a sacred green, not a business:
            no furniture, but a richer fellowship blessing */}
        {isMarriageSupper ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 16,
              borderRadius: 16,
              backgroundColor: pal.card,
              borderWidth: 1,
              borderColor: pal.accent,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <MaterialIcons name="favorite" size={26} color={pal.accent} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: pal.text, fontWeight: "800", fontSize: 15 }}>
                Fellowship blessing: +{(100 * (BANQUET_FELLOWSHIP_RATES[Math.min(Math.max(building?.level || 1, 1), 3)] ?? 0.012) * Math.min(diners.length, cap)).toFixed(1)}% income
              </Text>
              <Text style={{ color: pal.textDim, fontSize: 12, marginTop: 2 }}>
                {diners.length} {diners.length === 1 ? "villager" : "villagers"} gathered at the long table — the whole town breaks bread as one.
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 16,
              borderRadius: 16,
              backgroundColor: pal.card,
              borderWidth: 1,
              borderColor: pal.accent,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <MaterialIcons name="trending-up" size={26} color={pal.accent} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: pal.text, fontWeight: "800", fontSize: 15 }}>
                Interior bonus: +{totalBonusPct}% income
              </Text>
              <Text style={{ color: pal.textDim, fontSize: 12, marginTop: 2 }}>
                Furnishing your restaurant draws more villagers — and more coins.
              </Text>
            </View>
          </View>
        )}

        {/* furniture panel — not for the Marriage Supper */}
        {!isMarriageSupper && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Text style={{ color: pal.accent, fontWeight: "800", fontSize: 13, letterSpacing: 1.5, marginBottom: 8 }}>
              FURNISH THE DINING ROOM
            </Text>
            {RESTAURANT_SLOTS.map((slot) => (
              <FurnitureRow
                key={slot.id}
                slot={slot}
                tier={interior.furniture[slot.id] || 0}
                affordable={(cost) => coinsRef.current.balance >= cost}
                onBuy={handleBuy}
                pal={pal}
              />
            ))}
          </View>
        )}

        {/* pizza party features — pizza places only */}
        {cuisine === "pizza-place" && !isMarriageSupper && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Text style={{ color: pal.accent, fontWeight: "800", fontSize: 13, letterSpacing: 1.5, marginBottom: 8 }}>
              PARTY FEATURES
            </Text>
            {PIZZA_FEATURES.map((def) => (
              <PizzaFeatureRow
                key={def.id}
                def={def}
                tier={pizza.features[def.id] || 0}
                affordable={(cost) => coinsRef.current.balance >= cost}
                onBuy={handleBuyFeature}
                pal={pal}
              />
            ))}
          </View>
        )}

        {/* diner coffee — 3 cups a day: +1 forest energy (over the cap) + 10 XP */}
        {cuisine === "diner" && (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 14,
              borderRadius: 16,
              backgroundColor: pal.card,
              borderWidth: 1,
              borderColor: pal.accent,
              padding: 14,
            }}
          >
            <CoffeeSteamBurst burstKey={coffeeBursts} color="#F5EFE0" />
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialIcons name="local-cafe" size={26} color={pal.accent} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ color: pal.text, fontWeight: "800", fontSize: 15 }}>Diner Coffee</Text>
                <Text style={{ color: pal.textDim, fontSize: 12, marginTop: 2 }}>
                  One cup: +1 Dark Forest energy (yes, even past your cap) and +10 XP. Three a day — the pot refills at midnight.
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
              {/* cups remaining today */}
              <View style={{ flexDirection: "row", flex: 1 }}>
                {[0, 1, 2].map((i) => {
                  const left = coffeeLeft ?? 0;
                  const full = i < left;
                  return (
                    <MaterialIcons
                      key={i}
                      name="local-cafe"
                      size={24}
                      color={full ? pal.accent : pal.textDim}
                      style={{ marginRight: 6, opacity: full ? 1 : 0.3 }}
                    />
                  );
                })}
                <Text style={{ color: pal.textDim, fontSize: 12, marginLeft: 4, alignSelf: "center" }}>
                  {coffeeLeft === null ? "…" : coffeeLeft > 0 ? `${coffeeLeft} left today` : "Pot's empty — back tomorrow"}
                </Text>
              </View>
              <Pressable
                onPress={handleBuyCoffee}
                disabled={!coffeeLeft || coins.balance < COFFEE_PRICE}
                style={{
                  backgroundColor: coffeeLeft && coins.balance >= COFFEE_PRICE ? pal.accent : "#4A3826",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  opacity: coffeeLeft && coins.balance >= COFFEE_PRICE ? 1 : 0.55,
                }}
              >
                <Text style={{ color: coffeeLeft && coins.balance >= COFFEE_PRICE ? "#241811" : pal.textDim, fontWeight: "800", fontSize: 12.5 }}>
                  Buy · {COFFEE_PRICE} coins
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Token Toss — needs the arcade row standing */}
        {cuisine === "pizza-place" &&
          (arcadeTier >= 1 ? (
            <>
              <PlayCard
                icon="sports-esports"
                title="Play: Token Toss"
                blurb="Five tokens, one ring board. The marker sweeps — toss as it crosses the gold. Dead center pays 50, and the machine pays in XP."
                playsLeft={arcade.playsLeft}
                cap={arcade.cap}
                accent={pal.accent}
                onPlay={() => arcade.setPlaying(true)}
              />
              {arcade.playing && (
                <TokenTossGame accent={pal.accent} onComplete={arcade.handleComplete} onExit={() => arcade.setPlaying(false)} />
              )}
            </>
          ) : (
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 14,
                borderRadius: 16,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: pal.accent,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                opacity: 0.75,
              }}
            >
              <MaterialIcons name="lock" size={24} color={pal.accent} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ color: "#1C1917", fontWeight: "800", fontSize: 15 }}>Play: Token Toss</Text>
                <Text style={{ color: "#78716C", fontSize: 12, marginTop: 2 }}>
                  The arcade is dark. Build the Arcade Row in Party Features and the cabinets light up.
                </Text>
              </View>
            </View>
          ))}

        <PlayCard
          icon="room-service"
          title="Play: Serve the Table"
          blurb="Five tables this shift. Serve each order dish by dish, in order — this kitchen's own menu — before patience runs thin. Good service earns good tips."
          playsLeft={serve.playsLeft}
          cap={serve.cap}
          accent={pal.accent}
          onPlay={() => serve.setPlaying(true)}
        />
        {serve.playing && (
          <ServeGame accent={pal.accent} onComplete={serve.handleComplete} onExit={() => serve.setPlaying(false)} cuisine={cuisine} />
        )}

        {!loaded && (
          <Text style={{ color: pal.textDim, textAlign: "center", marginTop: 20 }}>Setting the tables…</Text>
        )}
      </ScrollView>
    </View>
  );
}
