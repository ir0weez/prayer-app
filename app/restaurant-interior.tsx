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
import {
  CUISINE_THEMES,
  CuisineWallDecor,
  CuisineOverhead,
  CuisineSignature,
  CuisineFloor,
  CuisineCenterpiece,
  DinerCoffeeStation,
  TacoCantinaCounter,
  type CuisinePalette,
} from "@/components/cuisine-themes";
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
import { AnimatronicStage, ArcadeCabinetRow, PrizeCounter } from "@/components/pizza-party";
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

// ---------- gentle bob for seated villagers (sin easing, no bounce) ----------
function Bobbing({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    const t = setTimeout(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bob, { toValue: 1, duration: 1100 + Math.random() * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0, duration: 1100 + Math.random() * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loop.start();
    }, delay);
    return () => {
      clearTimeout(t);
      loop?.stop();
    };
  }, [bob, delay]);
  return (
    <Animated.View
      style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -2.5] }) }] }}
    >
      {children}
    </Animated.View>
  );
}

// ---------- the player's pawn, seated and eating ----------
// Sits at the head of the table — this is Jonathan's seat.
function PawnDiner({ delay = 0, pal = DEFAULT_PAL }: { delay?: number; pal?: CuisinePalette }) {
  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  useEffect(() => {
    loadCustomPawn().then((p) => p && setPawn(p)).catch(() => undefined);
  }, []);
  if (!pawn) return null;
  return (
    <GentleBob delay={delay} amount={2}>
      <View style={{ alignItems: "center", marginHorizontal: 7 }}>
        <FigureName name={pawn.name} />
        {/* warm glow behind */}
        <View
          style={{
            position: "absolute",
            top: 8,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: FLAME,
            opacity: 0.32,
          }}
        />
        <View style={{ borderWidth: 2, borderColor: pal.accent, borderRadius: 24, padding: 1, backgroundColor: "rgba(224,166,63,0.12)" }}>
          <PawnPreview pawn={pawn} size={38} />
        </View>
        {/* plate in front */}
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: "#FFF9F0",
            borderWidth: 1,
            borderColor: "#D9C9A8",
            marginTop: 2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="restaurant" size={11} color="#8B5E34" />
        </View>
      </View>
    </GentleBob>
  );
}

// ---------- seated villager: golden figure in a chair ----------
function SeatedVillager({ person, chairTier, delay, pal = DEFAULT_PAL }: { person: PrayedPerson; chairTier: number; delay: number; pal?: CuisinePalette }) {
  // Chair style by tier: 0-1 simple stool, 2 cushioned, 3 banquet (taller back)
  const backH = chairTier >= 3 ? 30 : 22;
  const backW = chairTier >= 3 ? 40 : 34;
  const seatColor = chairTier === 0 ? pal.wood : chairTier === 1 ? pal.wood : chairTier === 2 ? "#7A3B2E" : "#4E2A1E";
  return (
    <Bobbing delay={delay}>
      <View style={{ alignItems: "center", marginHorizontal: 7 }}>
        {/* warm glow behind the head */}
        <View
          style={{
            position: "absolute",
            top: -9,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: FLAME,
            opacity: 0.28,
          }}
        />
        {/* head */}
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: person.accentColor || "#E8C088",
            borderWidth: 1.5,
            borderColor: pal.accent,
          }}
        />
        {/* shoulders */}
        <View
          style={{
            width: 30,
            height: 15,
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
            backgroundColor: "#C98B4A",
            marginTop: -4,
          }}
        />
        {/* chair back */}
        <View
          style={{
            position: "absolute",
            bottom: -2,
            width: backW,
            height: backH,
            borderRadius: 6,
            backgroundColor: seatColor,
            borderWidth: 2,
            borderColor: pal.woodDark,
            zIndex: -1,
          }}
        />
      </View>
    </Bobbing>
  );
}

// ---------- one dining table with chairs around it ----------
// grand (building L3): candlelit floral centerpiece + gold fringe under rich cloths.
function DiningTable({
  diners,
  tablesTier,
  chairsTier,
  pawnFirst = false,
  grand = false,
  pal = DEFAULT_PAL,
  cuisine = "",
}: {
  diners: PrayedPerson[];
  tablesTier: number;
  chairsTier: number;
  pawnFirst?: boolean;
  grand?: boolean;
  pal?: CuisinePalette;
  cuisine?: string;
}) {
  const cloth = pal.cloth[Math.min(tablesTier, 3)] || "";
  const topColor = cloth || pal.wood;
  return (
    <View style={{ alignItems: "center", marginVertical: 10 }}>
      {/* seated diners (up to 4: two above, two below the table) — the pawn takes the head seat */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", minHeight: 52 }}>
        {pawnFirst && <PawnDiner delay={0} pal={pal} />}
        {diners.slice(0, pawnFirst ? 1 : 2).map((p, i) => (
          <SeatedVillager key={p.id} person={p} chairTier={chairsTier} delay={(i + 1) * 180} pal={pal} />
        ))}
      </View>
      {/* round table top */}
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: 128,
            height: 40,
            borderRadius: 20,
            backgroundColor: topColor,
            borderWidth: 2,
            borderColor: tablesTier > 0 ? pal.accent : pal.woodDark,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* plates */}
          <View style={{ flexDirection: "row" }}>
            {[0, 1].map((i) => (
              <View
                key={i}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: "#FFF9F0",
                  marginHorizontal: 10,
                  borderWidth: 1,
                  borderColor: "#D9C9A8",
                }}
              />
            ))}
          </View>
        </View>
        {/* gold fringe under rich tablecloths */}
        {tablesTier >= 3 && (
          <View style={{ flexDirection: "row", marginTop: -3 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={i} style={{ width: 5, height: 8, borderRadius: 2, backgroundColor: pal.accent, marginHorizontal: 2.5, opacity: 0.9 }} />
            ))}
          </View>
        )}
        {/* themed centerpiece at the grand level */}
        {grand && (
          <View style={{ position: "absolute", top: -4, left: 0, right: 0, alignItems: "center", zIndex: 3 }}>
            <CuisineCenterpiece cuisine={cuisine} grand={grand} />
          </View>
        )}
        {/* table leg + base */}
        <View style={{ width: 12, height: 26, backgroundColor: pal.woodDark }} />
        <View style={{ width: 70, height: 8, borderRadius: 4, backgroundColor: pal.woodDark }} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "center", minHeight: 52, marginTop: -38 }}>
        {diners.slice(2, 4).map((p, i) => (
          <View key={p.id} style={{ transform: [{ scaleY: -1 }] }}>
            <SeatedVillager person={p} chairTier={chairsTier} delay={(i + 2) * 180} pal={pal} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------- cantina booth bench (taco-stand tables) ----------
// A drawn bench behind each row of diners: slatted back in the chair
// tier's own colors (so it reads as one seat with the chair backs),
// pink piping, a teal vinyl cushion strip from chairs tier 1, and
// button tufts at the banquet tier.
function CantinaBench({ chairsTier, pal }: { chairsTier: number; pal: CuisinePalette }) {
  const seatColor = chairsTier <= 1 ? pal.wood : chairsTier === 2 ? "#7A3B2E" : "#4E2A1E";
  return (
    <View
      style={{
        width: 174,
        height: 44,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        backgroundColor: seatColor,
        borderWidth: 2,
        borderColor: pal.woodDark,
        overflow: "hidden",
      }}
    >
      {[40, 86, 132].map((x) => (
        <View key={x} style={{ position: "absolute", top: 0, bottom: 0, left: x, width: 2, backgroundColor: pal.woodDark, opacity: 0.5 }} />
      ))}
      <View style={{ position: "absolute", top: 2.5, left: 7, right: 7, height: 2.5, borderRadius: 1.25, backgroundColor: pal.accent, opacity: 0.9 }} />
      {chairsTier >= 3 && (
        <View style={{ position: "absolute", top: 13, left: 0, right: 0, flexDirection: "row", justifyContent: "space-evenly" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: pal.woodDark, opacity: 0.8 }} />
          ))}
        </View>
      )}
      {chairsTier >= 1 && (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 8, backgroundColor: "#1F8A80", borderTopWidth: 1.5, borderTopColor: "#14665E" }} />
      )}
    </View>
  );
}

// ---------- the taco stand's tables: drawn, not bare ovals ----------
// The style proof for interiors. Same seats, same diners, same slicing
// as DiningTable — only the drawing changes: booth benches, a tiled rim,
// and tabletop life that arrives with the tables tier (cups at 1, tacos
// + salsa + tile edge at 2, serving tray + two-tone fringe at 3).
function CantinaTable({
  diners,
  tablesTier,
  chairsTier,
  pawnFirst = false,
  grand = false,
  pal = DEFAULT_PAL,
  cuisine = "",
}: {
  diners: PrayedPerson[];
  tablesTier: number;
  chairsTier: number;
  pawnFirst?: boolean;
  grand?: boolean;
  pal?: CuisinePalette;
  cuisine?: string;
}) {
  const cloth = pal.cloth[Math.min(tablesTier, 3)] || "";
  const topColor = cloth || pal.wood;
  const setting = (key: number, flip: boolean) => (
    <View key={key} style={{ flexDirection: flip ? "row-reverse" : "row", alignItems: "center" }}>
      {/* cup with a straw (tables tier 1+) */}
      {tablesTier >= 1 && (
        <View style={{ alignItems: "center", marginHorizontal: 2 }}>
          <View style={{ width: 2.5, height: 8, borderRadius: 1.25, backgroundColor: "#FF7BAC", transform: [{ rotate: "16deg" }], marginBottom: -2, zIndex: 2 }} />
          <View style={{ width: 8, height: 11, borderRadius: 2, backgroundColor: "#F6EEFC", borderWidth: 1.25, borderColor: "#B9A3D9" }} />
        </View>
      )}
      {/* plate — a taco joins it at tables tier 2 */}
      <View
        style={{
          width: 21,
          height: 21,
          borderRadius: 10.5,
          backgroundColor: "#FFF9F0",
          borderWidth: 1.25,
          borderColor: "#D9C9A8",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: 15, height: 15, borderRadius: 7.5, borderWidth: 1, borderColor: "#E3D3AC", alignItems: "center", justifyContent: "center" }}>
          {tablesTier >= 2 && (
            <View style={{ width: 11, height: 6.5, borderTopLeftRadius: 5.5, borderTopRightRadius: 5.5, backgroundColor: "#E8C86A", borderWidth: 1, borderColor: "#A87838" }} />
          )}
        </View>
      </View>
    </View>
  );
  const salsaBowl = (key: number, salsa: string, fleck: string) => (
    <View key={key} style={{ alignItems: "center", marginHorizontal: 3 }}>
      <View style={{ width: 14, height: 4.5, borderRadius: 2.25, backgroundColor: salsa, flexDirection: "row", justifyContent: "center" }}>
        <View style={{ width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: fleck, marginTop: 1, marginHorizontal: 1 }} />
        <View style={{ width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: fleck, marginTop: 1, marginHorizontal: 1 }} />
      </View>
      <View style={{ width: 12, height: 6, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: "#5E2A6E", borderWidth: 1, borderColor: "#3A1A45", marginTop: -1 }} />
    </View>
  );
  return (
    <View style={{ alignItems: "center", marginVertical: 10 }}>
      {/* north seats, on the booth bench */}
      <View style={{ position: "relative", minHeight: 54, justifyContent: "flex-end" }}>
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 1, alignItems: "center" }}>
          <CantinaBench chairsTier={chairsTier} pal={pal} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", minHeight: 52 }}>
          {pawnFirst && <PawnDiner delay={0} pal={pal} />}
          {diners.slice(0, pawnFirst ? 1 : 2).map((p, i) => (
            <SeatedVillager key={p.id} person={p} chairTier={chairsTier} delay={(i + 1) * 180} pal={pal} />
          ))}
        </View>
      </View>
      {/* the table */}
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: 136,
            height: 46,
            borderRadius: 23,
            backgroundColor: topColor,
            borderWidth: 3,
            borderColor: tablesTier > 0 ? "#2EC4B6" : pal.woodDark,
            justifyContent: "center",
          }}
        >
          {/* top highlight */}
          <View style={{ position: "absolute", top: 4, left: 16, right: 16, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF", opacity: 0.15 }} />
          {/* serving tray under the middle settings (tables tier 3) */}
          {tablesTier >= 3 && (
            <View style={{ position: "absolute", alignSelf: "center", width: 62, height: 30, borderRadius: 8, backgroundColor: "#B9C0C9", borderWidth: 1.5, borderColor: "#7A828C" }} />
          )}
          {/* place settings + salsa for the table */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 13 }}>
            {setting(0, false)}
            {tablesTier >= 2 ? (
              <View style={{ flexDirection: "row" }}>
                {salsaBowl(0, "#C0392B", "#4E8B4A")}
                {salsaBowl(1, "#4E8B4A", "#C0392B")}
              </View>
            ) : (
              <View />
            )}
            {setting(1, true)}
          </View>
          {/* cantina tile edge along the front (tables tier 2+) */}
          {tablesTier >= 2 && (
            <View style={{ position: "absolute", bottom: 4, left: 0, right: 0, flexDirection: "row", justifyContent: "center" }}>
              {Array.from({ length: 9 }).map((_, i) => (
                <View key={i} style={{ width: 5.5, height: 5.5, borderRadius: 1.25, backgroundColor: i % 2 === 0 ? "#2EC4B6" : "#FF7BAC", marginHorizontal: 2.25 }} />
              ))}
            </View>
          )}
          {/* themed centerpiece at the grand level */}
          {grand && (
            <View style={{ position: "absolute", top: -6, left: 0, right: 0, alignItems: "center", zIndex: 3 }}>
              <CuisineCenterpiece cuisine={cuisine} grand={grand} />
            </View>
          )}
        </View>
        {/* two-tone fringe under the cloth (tables tier 3) */}
        {tablesTier >= 3 && (
          <View style={{ flexDirection: "row", marginTop: -2 }}>
            {Array.from({ length: 13 }).map((_, i) => (
              <View key={i} style={{ width: 4.5, height: 9, borderRadius: 2.25, backgroundColor: i % 2 === 0 ? "#FF7BAC" : "#2EC4B6", marginHorizontal: 2.4 }} />
            ))}
          </View>
        )}
        {/* splayed legs, foot bar, ground shadow */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", width: 64, marginTop: 1 }}>
          <View style={{ width: 10, height: 22, borderRadius: 2, backgroundColor: pal.woodDark, transform: [{ rotate: "6deg" }] }} />
          <View style={{ width: 10, height: 22, borderRadius: 2, backgroundColor: pal.woodDark, transform: [{ rotate: "-6deg" }] }} />
        </View>
        <View style={{ width: 78, height: 8, borderRadius: 4, backgroundColor: pal.woodDark, marginTop: -2 }} />
        <View style={{ width: 118, height: 9, borderRadius: 4.5, backgroundColor: "#000000", opacity: 0.15, marginTop: 2 }} />
      </View>
      {/* south seats, on their bench */}
      <View style={{ position: "relative", minHeight: 54, marginTop: -34 }}>
        <View style={{ position: "absolute", left: 0, right: 0, top: 3, alignItems: "center" }}>
          <CantinaBench chairsTier={chairsTier} pal={pal} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "center", minHeight: 52 }}>
          {diners.slice(2, 4).map((p, i) => (
            <View key={p.id} style={{ transform: [{ scaleY: -1 }] }}>
              <SeatedVillager person={p} chairTier={chairsTier} delay={(i + 2) * 180} pal={pal} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ---------- banquet seating: named villager at the long table ----------
// Each diner gets their name above them so Jonathan knows who sits where.
function BanquetSeated({ person, delay, pal = DEFAULT_PAL }: { person: PrayedPerson; delay: number; pal?: CuisinePalette }) {
  const firstName = (person.name || "Guest").split(" ")[0];
  return (
    <Bobbing delay={delay}>
      <View style={{ alignItems: "center", marginHorizontal: 5, minWidth: 44 }}>
        {/* name above */}
        <Text
          numberOfLines={1}
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: "#FFE9C4",
            marginBottom: 3,
            maxWidth: 56,
            textAlign: "center",
            textShadowColor: "rgba(0,0,0,0.6)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          {firstName}
        </Text>
        {/* warm glow behind the head */}
        <View
          style={{
            position: "absolute",
            top: 8,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: FLAME,
            opacity: 0.28,
          }}
        />
        {/* head */}
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: person.accentColor || "#E8C088",
            borderWidth: 1.5,
            borderColor: pal.accent,
          }}
        />
        {/* shoulders */}
        <View
          style={{
            width: 30,
            height: 15,
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
            backgroundColor: "#C98B4A",
            marginTop: -4,
          }}
        />
        {/* banquet chair back */}
        <View
          style={{
            position: "absolute",
            bottom: -2,
            width: 40,
            height: 30,
            borderRadius: 6,
            backgroundColor: "#4E2A1E",
            borderWidth: 2,
            borderColor: pal.woodDark,
            zIndex: -1,
          }}
        />
      </View>
    </Bobbing>
  );
}

// ---------- the one long banquet table ----------
// Diners sit along both sides; names above every seat.
function BanquetTable({ diners, tablesTier, pal = DEFAULT_PAL, cuisine = "" }: { diners: PrayedPerson[]; tablesTier: number; pal?: CuisinePalette; cuisine?: string }) {
  const cloth = pal.cloth[Math.min(tablesTier, 3)] || "";
  const topColor = cloth || pal.wood;
  // Split diners along the two long sides
  const topRow = diners.filter((_, i) => i % 2 === 0);
  const bottomRow = diners.filter((_, i) => i % 2 === 1);
  const plateCount = Math.max(topRow.length, bottomRow.length, 2);
  return (
    <View style={{ alignItems: "center", marginVertical: 12, paddingHorizontal: 8 }}>
      {/* the pawn at the head of the table */}
      <View style={{ marginBottom: 2 }}>
        <PawnDiner delay={0} pal={pal} />
      </View>
      {/* top side diners */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", flexWrap: "wrap", minHeight: 64 }}>
        {topRow.map((p, i) => (
          <BanquetSeated key={p.id} person={p} delay={i * 150} pal={pal} />
        ))}
      </View>
      {/* the long table */}
      <View style={{ alignItems: "center", marginVertical: 2 }}>
        {/* themed centerpieces along the table */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: -6, zIndex: 3 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ marginHorizontal: 18 }}>
              <CuisineCenterpiece cuisine={cuisine} grand />
            </View>
          ))}
        </View>
        <View
          style={{
            minWidth: 220,
            maxWidth: "100%",
            height: 44,
            borderRadius: 12,
            backgroundColor: topColor,
            borderWidth: 2,
            borderColor: tablesTier > 0 ? pal.accent : pal.woodDark,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 12,
          }}
        >
          {/* plates down the length */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
            {Array.from({ length: Math.min(plateCount, 10) }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: "#FFF9F0",
                  marginHorizontal: 5,
                  marginVertical: 2,
                  borderWidth: 1,
                  borderColor: "#D9C9A8",
                }}
              />
            ))}
          </View>
        </View>
        {/* table legs */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", width: 180 }}>
          <View style={{ width: 12, height: 22, backgroundColor: pal.woodDark }} />
          <View style={{ width: 12, height: 22, backgroundColor: pal.woodDark }} />
        </View>
      </View>
      {/* bottom side diners (mirrored) */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "center", flexWrap: "wrap", minHeight: 64, marginTop: -30 }}>
        {bottomRow.map((p, i) => (
          <View key={p.id} style={{ transform: [{ scaleY: -1 }] }}>
            <View style={{ transform: [{ scaleY: -1 }] }}>
              <BanquetSeated person={p} delay={(i + topRow.length) * 150} pal={pal} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------- kitchen counter at the back (style by kitchen tier) ----------
// Cuisines with their own signature oven/grill skip the generic brick oven.
function KitchenCounter({ tier, cuisine = "" }: { tier: number; cuisine?: string }) {
  // The taco stand cooks at its own cantina counter (drawn, tiled) —
  // its station is the Cantina Kitchen, never the generic home one.
  if (cuisine === "taco-stand") return <TacoCantinaCounter tier={tier} />;
  const hasSignatureOven = cuisine === "pizza-place" || cuisine === "manna-house" || cuisine === "taco-stand" || cuisine === "sushi-bar" || cuisine === "diner" || cuisine === "burger-joint";
  if (tier >= 2 && !hasSignatureOven) {
    // Brick oven (t2) / Chef's Kitchen (t3): arched oven with a warm fire
    return (
      <View style={{ alignItems: "center", marginTop: 6 }}>
        <View
          style={{
            width: 110,
            height: 78,
            borderTopLeftRadius: 55,
            borderTopRightRadius: 55,
            backgroundColor: "#7A4A2B",
            borderWidth: 3,
            borderColor: WOOD_DARK,
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: 10,
            overflow: "hidden",
          }}
        >
          <View style={{ width: 30, height: 22, borderRadius: 8, backgroundColor: FLAME, opacity: 0.85 }} />
        </View>
        <View style={{ width: 130, height: 10, borderRadius: 5, backgroundColor: WOOD, marginTop: 2 }} />
        {tier >= 3 && (
          <View style={{ flexDirection: "row", marginTop: 4 }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: "#3E3E46",
                  marginHorizontal: 6,
                  borderWidth: 1,
                  borderColor: GOLD,
                }}
              />
            ))}
          </View>
        )}
        <Text style={{ color: TEXT_DIM, fontSize: 10, marginTop: 4, fontStyle: "italic" }}>
          {tier >= 3 ? "Chef's Kitchen" : "Brick Oven"}
        </Text>
      </View>
    );
  }
  // Home Kitchen (t1) or bare counter (t0): counter with pots
  return (
    <View style={{ alignItems: "center", marginTop: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <View style={{ width: 24, height: 20, borderRadius: 4, backgroundColor: "#4A4A52", marginHorizontal: 4 }} />
        <View style={{ width: 30, height: 26, borderRadius: 4, backgroundColor: "#5A5A64", marginHorizontal: 4 }} />
        <View style={{ width: 20, height: 16, borderRadius: 4, backgroundColor: "#4A4A52", marginHorizontal: 4 }} />
      </View>
      <View
        style={{
          width: 150,
          height: 44,
          borderRadius: 8,
          backgroundColor: tier > 0 ? WOOD : "#6B5A44",
          borderWidth: 2,
          borderColor: WOOD_DARK,
          marginTop: -2,
        }}
      />
      <Text style={{ color: TEXT_DIM, fontSize: 10, marginTop: 4, fontStyle: "italic" }}>
        {tier > 0 ? "Home Kitchen" : "Kitchen"}
      </Text>
    </View>
  );
}

// ---------- string lights across the top (glowing dots, fade only) ----------
function StringLights({ tier }: { tier: number }) {
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);
  const dotSize = tier >= 3 ? 10 : tier >= 2 ? 8 : 6;
  const dotColor = tier >= 3 ? "#FFD97A" : tier >= 2 ? "#FFB84D" : "#FFE9B8";
  const count = tier >= 3 ? 12 : tier >= 2 ? 10 : 8;
  return (
    <View style={{ alignItems: "center", marginTop: 8, marginBottom: -4 }}>
      {/* the wire */}
      <View style={{ position: "absolute", top: 8, left: 30, right: 30, height: 2, backgroundColor: "#3E2C1A" }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", width: "88%" }}>
        {Array.from({ length: count }).map((_, i) => (
          <Animated.View
            key={i}
            style={{
              marginTop: 6 + (i % 2) * 4,
              width: dotSize * 2.2,
              height: dotSize * 2.2,
              borderRadius: dotSize * 1.1,
              backgroundColor: dotColor,
              opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] }),
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View style={{ width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: dotColor }} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// ---------- wall art frames ----------
function WallArt({ tier }: { tier: number }) {
  const frameColor = tier >= 3 ? GOLD : tier >= 2 ? "#8B5E34" : "#5E3D22";
  const art = (key: number) => (
    <View
      key={key}
      style={{
        width: 64,
        height: 52,
        borderRadius: 6,
        backgroundColor: tier >= 3 ? "#3B2E5E" : tier >= 2 ? "#C98B4A" : "#8B6A4A",
        borderWidth: 4,
        borderColor: frameColor,
        marginHorizontal: 14,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {tier >= 3 ? (
        // stained-glass: colored panes
        <View style={{ flexDirection: "row", flexWrap: "wrap", width: 56, height: 44, justifyContent: "center" }}>
          {["#C0392B", "#E0A63F", "#2E86AB", "#7D3C98"].map((c, i) => (
            <View key={i} style={{ width: 24, height: 20, backgroundColor: c, margin: 1, borderRadius: 2 }} />
          ))}
        </View>
      ) : tier >= 2 ? (
        // fresco: sun + hills
        <View>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFE9B8", alignSelf: "center" }} />
          <View style={{ width: 56, height: 16, backgroundColor: "#5B7A4E", borderRadius: 4, marginTop: -4 }} />
        </View>
      ) : (
        // simple mural: one warm shape
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#E0A63F", opacity: 0.8 }} />
      )}
    </View>
  );
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", marginVertical: 10 }}>
      {art(0)}
      {art(1)}
    </View>
  );
}

// ---------- tiny animated sparkle (crystal twinkle, sine easing, no bounce) ----------
function Sparkle({ size = 8, delay = 0 }: { size?: number; delay?: number }) {
  const tw = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    const t = setTimeout(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(tw, { toValue: 1, duration: 800 + Math.random() * 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(tw, { toValue: 0, duration: 800 + Math.random() * 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loop.start();
    }, delay);
    return () => {
      clearTimeout(t);
      loop?.stop();
    };
  }, [tw, delay]);
  const scale = tw.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.3] });
  const opacity = tw.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#FFF9D6",
        borderWidth: 1,
        borderColor: "#F5D97A",
        transform: [{ scale }],
        opacity,
        shadowColor: "#FFD97A",
        shadowOpacity: 0.8,
        shadowRadius: 4,
      }}
    />
  );
}

// ---------- grand crystal chandelier (L3): two golden tiers, flickering glow, twinkling crystals ----------
function GrandCrystalChandelier() {
  const flick = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flick, { toValue: 1, duration: 1000 + Math.random() * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flick, { toValue: 0, duration: 1000 + Math.random() * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [flick]);
  const glow = flick.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.3] });
  const candle = (key: number) => (
    <View key={key} style={{ alignItems: "center" }}>
      <View style={{ width: 7, height: 10, borderRadius: 3.5, backgroundColor: FLAME }} />
      <View style={{ width: 8, height: 12, borderRadius: 3, backgroundColor: "#FFF9F0", marginTop: -2 }} />
    </View>
  );
  return (
    <View style={{ alignItems: "center", marginBottom: 2 }}>
      {/* chains */}
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-start" }}>
        <View style={{ width: 2, height: 32, backgroundColor: "#B8860B", transform: [{ rotate: "16deg" }], marginHorizontal: 8 }} />
        <View style={{ width: 2, height: 38, backgroundColor: "#B8860B" }} />
        <View style={{ width: 2, height: 32, backgroundColor: "#B8860B", transform: [{ rotate: "-16deg" }], marginHorizontal: 8 }} />
      </View>
      {/* upper tier */}
      <View
        style={{
          width: 100,
          height: 24,
          borderRadius: 12,
          backgroundColor: GOLD,
          borderWidth: 2,
          borderColor: "#B8860B",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-evenly",
          paddingHorizontal: 10,
          zIndex: 2,
        }}
      >
        {[0, 1, 2, 3].map(candle)}
      </View>
      {/* crystal strands */}
      <View style={{ flexDirection: "row", justifyContent: "center", zIndex: 1 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={{ marginHorizontal: 8, marginTop: -2 }}>
            <Sparkle size={7} delay={i * 220} />
          </View>
        ))}
      </View>
      {/* lower grand tier */}
      <View
        style={{
          width: 190,
          height: 30,
          borderRadius: 15,
          backgroundColor: GOLD,
          borderWidth: 2,
          borderColor: "#B8860B",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-evenly",
          paddingHorizontal: 12,
          marginTop: -4,
          zIndex: 2,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7].map(candle)}
      </View>
      {/* lower crystal fringe */}
      <View style={{ flexDirection: "row", justifyContent: "center" }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <View key={i} style={{ marginHorizontal: 6, marginTop: -1 }}>
            <Sparkle size={6} delay={i * 170 + 100} />
          </View>
        ))}
      </View>
      <Animated.View
        style={{ width: 230, height: 56, borderRadius: 28, backgroundColor: FLAME, opacity: glow, marginTop: -70 }}
      />
    </View>
  );
}

// ---------- elegant velvet drapery (L3): swagged valance with gold trim + medallions ----------
function ElegantDrapery() {
  return (
    <View style={{ alignItems: "center", paddingTop: 4, marginBottom: -6 }}>
      {/* valance rod */}
      <View style={{ width: "94%", height: 8, borderRadius: 4, backgroundColor: WOOD_DARK }} />
      <View style={{ flexDirection: "row", marginTop: -2 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={{ alignItems: "center", marginHorizontal: -3 }}>
            <View
              style={{
                width: 66,
                height: 30,
                backgroundColor: "#7A2E2E",
                borderBottomLeftRadius: 33,
                borderBottomRightRadius: 33,
                borderWidth: 2,
                borderTopWidth: 0,
                borderColor: GOLD,
              }}
            />
            {/* gold medallion at each swag point */}
            <View
              style={{
                width: 11,
                height: 11,
                borderRadius: 5.5,
                backgroundColor: GOLD,
                borderWidth: 1,
                borderColor: "#B8860B",
                marginTop: -6,
              }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------- wall candle sconces (L3): gilded candlelight along the walls ----------
function WallSconces() {
  const sconce = (key: number) => (
    <View key={key} style={{ alignItems: "center", marginHorizontal: 24 }}>
      {/* halo */}
      <View
        style={{
          position: "absolute",
          top: -8,
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: FLAME,
          opacity: 0.2,
        }}
      />
      <View style={{ width: 7, height: 10, borderRadius: 3.5, backgroundColor: FLAME }} />
      <View style={{ width: 8, height: 14, borderRadius: 3, backgroundColor: "#FFF9F0", borderWidth: 1, borderColor: GOLD, marginTop: -2 }} />
      {/* gilded wall plate */}
      <View
        style={{
          width: 26,
          height: 34,
          borderRadius: 5,
          backgroundColor: "#4A3319",
          borderWidth: 2,
          borderColor: GOLD,
          marginTop: 2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GOLD, opacity: 0.85 }} />
      </View>
    </View>
  );
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 2, marginBottom: 4 }}>
      {[0, 1, 2].map(sconce)}
    </View>
  );
}

// ---------- chandelier by building level ----------
// L1: none. L2: simple candle ring. L3: grand crystal chandelier.
function DiningChandelier({ level }: { level: number }) {
  if (level < 2) return null;
  if (level >= 3) return <GrandCrystalChandelier />;
  const candleCount = 5;
  return (
    <View style={{ alignItems: "center", marginBottom: 2 }}>
      <View style={{ width: 3, height: 30, backgroundColor: WOOD_DARK }} />
      <View
        style={{
          width: 120,
          height: 24,
          borderRadius: 12,
          backgroundColor: WOOD_DARK,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-evenly",
          paddingHorizontal: 12,
        }}
      >
        {Array.from({ length: candleCount }).map((_, i) => (
          <View key={i} style={{ alignItems: "center" }}>
            <View style={{ width: 7, height: 10, borderRadius: 3.5, backgroundColor: FLAME }} />
            <View style={{ width: 8, height: 12, borderRadius: 3, backgroundColor: "#FFF9F0", marginTop: -2 }} />
          </View>
        ))}
      </View>
      <View
        style={{
          width: 140,
          height: 26,
          borderRadius: 13,
          backgroundColor: FLAME,
          opacity: 0.16,
          marginTop: -34,
        }}
      />
    </View>
  );
}

// ---------- banquet candelabras + flowers by building level ----------
function BanquetDressing({ level }: { level: number }) {
  if (level < 2) return null;
  const candelabra = (key: number) => (
    <View key={key} style={{ alignItems: "center", marginHorizontal: 18 }}>
      <View style={{ flexDirection: "row" }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ alignItems: "center", marginHorizontal: 3 }}>
            <View style={{ width: 6, height: 9, borderRadius: 3, backgroundColor: FLAME }} />
            <View style={{ width: 7, height: 16, borderRadius: 3, backgroundColor: "#FFF9F0", marginTop: -2 }} />
          </View>
        ))}
      </View>
      <View style={{ width: 10, height: 26, backgroundColor: GOLD, marginTop: 2 }} />
      <View style={{ width: 30, height: 6, borderRadius: 3, backgroundColor: GOLD, marginTop: 1 }} />
    </View>
  );
  const bouquet = (key: number) => (
    <View key={key} style={{ alignItems: "center", marginHorizontal: 14 }}>
      <View style={{ flexDirection: "row" }}>
        {["#E86A92", "#F2A541", "#9C6FB5", "#E4572E"].map((c, i) => (
          <View key={i} style={{ width: 13, height: 13, borderRadius: 6.5, backgroundColor: c, marginHorizontal: 1 }} />
        ))}
      </View>
      <View style={{ width: 20, height: 24, borderRadius: 4, backgroundColor: "#B0724A", marginTop: -3 }} />
    </View>
  );
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginBottom: 6 }}>
      {candelabra(0)}
      {level >= 3 && bouquet(0)}
      {level >= 3 && bouquet(1)}
      {candelabra(1)}
    </View>
  );
}

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
          {/* back wall — themed decor */}
          <View style={{ backgroundColor: pal.wall, paddingBottom: 4 }}>
            <CuisineOverhead cuisine={cuisine} level={bLevel} lightsTier={lightsTier} />
            {lightsTier > 0 && (cuisine === "feast-hall" || cuisine === "upper-room") && <StringLights tier={lightsTier} />}
            {artTier > 0 && <CuisineWallDecor cuisine={cuisine} tier={artTier} />}
            {bLevel >= 3 && (cuisine === "feast-hall" || cuisine === "upper-room" || cuisine === "manna-house") && <WallSconces />}
          </View>
          {/* floor — themed treatment */}
          <View style={{ backgroundColor: pal.floor, paddingTop: 6, paddingBottom: 10 }}>
            <CuisineFloor cuisine={cuisine} level={bLevel} />
            {/* floorboards for wood-floor cuisines (the taco stand has tile now) */}
            {(cuisine === "pizza-place" || cuisine === "manna-house") && (
              <>
                <View style={{ position: "absolute", top: 24, left: 0, right: 0, height: 1, backgroundColor: pal.floorLine, opacity: 0.5 }} />
                <View style={{ position: "absolute", top: 60, left: 0, right: 0, height: 1, backgroundColor: pal.floorLine, opacity: 0.5 }} />
                <View style={{ position: "absolute", top: 100, left: 0, right: 0, height: 1, backgroundColor: pal.floorLine, opacity: 0.5 }} />
              </>
            )}
            {/* elegant drapery + chandelier for the grand candlelit halls */}
            {bLevel >= 3 && (cuisine === "feast-hall" || cuisine === "upper-room") && <ElegantDrapery />}
            {(cuisine === "feast-hall" || cuisine === "upper-room" || cuisine === "manna-house") && <DiningChandelier level={bLevel} />}
            {/* grand rug at L3 for the warm halls */}
            {bLevel >= 3 && (cuisine === "feast-hall" || cuisine === "upper-room" || cuisine === "manna-house") && (
              <View style={{ alignItems: "center", marginBottom: -6 }}>
                <View
                  style={{
                    width: "86%",
                    height: 300,
                    borderRadius: 24,
                    backgroundColor: "#7A2E2E",
                    borderWidth: 3,
                    borderColor: pal.accent,
                    opacity: 0.9,
                    position: "absolute",
                    top: 120,
                  }}
                />
                <View
                  style={{
                    width: "78%",
                    height: 284,
                    borderRadius: 18,
                    borderWidth: 2,
                    borderColor: pal.accent,
                    opacity: 0.9,
                    position: "absolute",
                    top: 128,
                  }}
                />
              </View>
            )}

            {gathering && (
              <View
                style={{
                  position: "absolute",
                  top: 10,
                  bottom: 10,
                  left: 12,
                  right: 12,
                  borderRadius: 16,
                  backgroundColor: pal.accent,
                  opacity: 0.10,
                }}
              />
            )}

            {/* signature cuisine piece + kitchen at the back */}
            <CuisineSignature cuisine={cuisine} level={bLevel} kitchenTier={kitchenTier} />
            <KitchenCounter tier={kitchenTier} cuisine={cuisine} />

            {/* the pizza party: animatronic stage, arcade row, prize counter */}
            {cuisine === "pizza-place" && (
              <>
                <AnimatronicStage tier={stageTier} />
                <ArcadeCabinetRow tier={arcadeTier} />
                <PrizeCounter tier={prizeTier} />
              </>
            )}
            {/* the diner's coffee station */}
            {cuisine === "diner" && <DinerCoffeeStation level={bLevel} />}

            {/* the tables — or the one long banquet table */}
            {isBanquet ? (
              <>
                <BanquetDressing level={bLevel} />
                <BanquetTable diners={diners} tablesTier={tablesTier} pal={pal} cuisine={cuisine} />
              </>
            ) : cuisine === "taco-stand" ? (
              tableDiners.map((group, i) => (
                <CantinaTable key={i} diners={group} tablesTier={tablesTier} chairsTier={chairsTier} pawnFirst={i === 0} grand={bLevel >= 3} pal={pal} cuisine={cuisine} />
              ))
            ) : (
              tableDiners.map((group, i) => (
                <DiningTable key={i} diners={group} tablesTier={tablesTier} chairsTier={chairsTier} pawnFirst={i === 0} grand={bLevel >= 3} pal={pal} cuisine={cuisine} />
              ))
            )}

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
                {isBanquet
                  ? "The long table is set, but every seat is empty. Pray for someone today and they'll take their place."
                  : "The tables are set, but the chairs are empty. Pray for someone today and they'll pull up a chair."}
              </Text>
            )}
          </View>
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
