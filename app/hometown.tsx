import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Modal, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  BUILDINGS,
  DECORATIONS,
  COINS_STORAGE_KEY,  TOWN_GRID_SIZE,
  TOWN_STORAGE_KEY,
  SHOP_OWNED_KEY,
  MAP_INFO,
  MAP_UNLOCKED_KEY,
  TOWN_MAP_IDS,
  dailyIncomeForTown,
  dailyXPForTown,
  roadMultiplierForBuilding,
  barbershopBoostForBuilding,
  shopAdjacencyBonusForBuilding,
  mapHasPopulation,
  workerMult,
  totalHiredWorkers,
  milestoneMultiplier,
  milestoneFor,
  maxLevelFor,
  houseNameFor,
  populationMult,
  WORKER_HIRE_COST,
  MAX_WORKERS_PER_BUILDING,
  FRENZY_STORAGE_KEY,
  FRENZY_TAPS_NEEDED,
  FRENZY_WINDOW_MS,
  FRENZY_DURATION_MS,
  FRENZY_COOLDOWN_MS,
  FRENZY_MULT,
  bankInteriorBonus,
  accrueBankDrips,
  bankFloorMultiplier,
  buildingFootprint,
  prayedTodayPeople,
  prayerMult,
  PRAYER_VILLAGER_CAP,
  churchNameFor,
  CHURCH_PRAYER_COINS_PER_HOUR,
  parseCoins,
  parseTown,
  parseOwnedItems,
  parseUnlockedMaps,
  emptyTownState,
  tierForFastDay,
  effectiveIncomeFor,
  plotIncomeMult,
  xpIncomeFor,
  upgradeCostFor,
  CITY_PLOTS,
  plotAt,
  isCityStreet,
  loadPurchasedPlots,
  savePurchasedPlots,
  TOWN_LOTS,
  townLotAt,
  isTownLotBuilding,
  isTownPath,
  hasFixedFootprint,
  buildingStorageCap,
  isBuildingStorageFull,
  isRestaurantType,
  RESTAURANT_GATHER_CAPS,
  isGatheringTime,
  totalGatherCapacity,
  fellowshipRate,
  loadFellowship,
  saveFellowship,
  fellowshipMult,
  type FellowshipState,
  loadRemembrance,
  saveRemembrance,
  remembranceMult,
  remembranceRefundFor,
  emptyRemembrance,
  REMEMBRANCE_MALL_REFUND_KEY,
  HOUSE_REMOVAL_REFUND_KEY,
  REMEMBRANCE_UPGRADE_COSTS,
  type RememberedPerson,
  type RemembranceState,
  MEMORY_CANDLE_COST,
  candleLit,
  emptyGardenVisits,
  loadGardenVisits,
  saveGardenVisits,
  pruneGardenVisits,
  gardenVisitMult,
  gardenVisitHourKey,
  pickGardenVisitors,
  type GardenVisitState,
  type CityPlot,
  type TownLot,
  type BuildingType,
  type DecorationType,
  type HometownCoins,
  type PlacedBuilding,
  type PlacedDecoration,
  type TownMapId,
  type MapState,
  type TownState,
  type PrayedPerson,
} from "@/lib/hometown";
import { refreshHouseBonusCache } from "@/lib/pawn-house";
import { getTodayISOString } from "@/lib/prayercircle-data";
import { MONUMENT_STORAGE_KEY, MONUMENT_DESIGNS, parseMonuments } from "@/lib/monuments";
import { getCachedBoosts, refreshGearBoostCache } from "@/lib/gear";
import { awardCustomXP } from "@/lib/xp-engine";
import { generateDailyMissions, loadMissions, completeMission, pendingMissions, type Mission } from "@/lib/missions";
import { refreshStatBoostCache, getCachedStatBoosts } from "@/lib/character-stats";
import { SeasonalBorder } from "@/components/seasonal-border";
import { MapSigns } from "@/components/map-signs";
import { getTimeOfDay, PAGE_THEMES, type TimeOfDay } from "@/lib/daynight";
import { TownNPCs, CityNPCs, countHometownNpcs, type LightInfo } from "@/components/town-npcs";
import { CityTraffic } from "@/components/city-traffic";
import { GardenOfRemembrance } from "@/components/garden-of-remembrance";

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  if (isNaN(da) || isNaN(db)) return 0;
  return Math.floor((db - da) / 86400000);
}

const TOWNSFOLK = ["🧑", "👩", "🧓", "👴", "👦", "👧", "🧔", "👵"];
const WORKERS: Record<string, string> = {
  "farm": "🧑‍🌾",
  "shop": "🧑‍💼",
  "bakery": "🧑‍🍳",
  "market": "🧑‍💼",
  "bank": "🧑‍💼",
};

function townsfolkFor(buildingId: string): string {
  let hash = 0;
  for (let i = 0; i < buildingId.length; i++) hash = (hash * 31 + buildingId.charCodeAt(i)) % 1000;
  return TOWNSFOLK[hash % TOWNSFOLK.length];
}

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `b${Date.now()}${idCounter}`;
}

// Building art using colored shapes (no emojis) - shape evolves with level
function BuildingArt({ type, size, level = 1, floors = 1, prayedCount = 0 }: { type: string; size: number; level?: number; floors?: number; prayedCount?: number }) {
  const s = size;
  const lv = level || 1;
  // City towers feel more alive as they level up: more lit windows.
  // L1 ~30% lit (quiet), L2 ~60% (busy), L3 ~90% (buzzing).
  const litRatio = lv >= 3 ? 0.9 : lv === 2 ? 0.6 : 0.3;
  const isLit = (i: number, j: number) => ((i * 7 + j * 13 + lv * 5) % 10) < litRatio * 10;
  const LIT = "#FDE68A";
  switch (type) {
    case "house":
      // L5 Mansion — grand estate with columns, gate, and fountain
      if (lv >= 5) return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.95, height: s * 0.14, backgroundColor: "#7C2D12", borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
          <View style={{ width: s * 0.98, height: s * 0.5, backgroundColor: "#FEF3C7", borderRadius: 6, borderWidth: 2, borderColor: "#D6A85C" }} />
          <View style={{ flexDirection: "row", position: "absolute", bottom: s * 0.42 }}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={{ width: s * 0.09, height: s * 0.32, backgroundColor: "#FFFFFF", marginHorizontal: s * 0.045, borderRadius: 2, borderWidth: 1, borderColor: "#D6A85C" }} />
            ))}
          </View>
          <View style={{ flexDirection: "row", position: "absolute", bottom: s * 0.24 }}>
            <View style={{ width: s * 0.13, height: s * 0.13, backgroundColor: "#FDE68A", marginHorizontal: 3, borderRadius: 2 }} />
            <View style={{ width: s * 0.13, height: s * 0.13, backgroundColor: "#FDE68A", marginHorizontal: 3, borderRadius: 2 }} />
          </View>
          <View style={{ position: "absolute", bottom: s * 0.04, width: s * 0.2, height: s * 0.22, backgroundColor: "#7C2D12", borderRadius: 3 }} />
          <View style={{ position: "absolute", bottom: s * 0.01, left: s * 0.06, width: s * 0.12, height: s * 0.1, backgroundColor: "#60A5FA", borderRadius: 6 }} />
          <View style={{ position: "absolute", bottom: s * 0.01, right: s * 0.06, width: s * 0.12, height: s * 0.1, backgroundColor: "#60A5FA", borderRadius: 6 }} />
        </View>
      );
      // L4 Villa — two stories, balcony
      if (lv >= 4) return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.9, height: s * 0.16, backgroundColor: "#9A3412", borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
          <View style={{ width: s * 0.94, height: s * 0.6, backgroundColor: "#FDBA74", borderRadius: 6 }} />
          <View style={{ position: "absolute", bottom: s * 0.38, width: s * 0.7, height: s * 0.05, backgroundColor: "#78350F", borderRadius: 2 }} />
          <View style={{ flexDirection: "row", position: "absolute", bottom: s * 0.44 }}>
            <View style={{ width: s * 0.13, height: s * 0.13, backgroundColor: "#FFFBEB", marginHorizontal: 4, borderRadius: 2 }} />
            <View style={{ width: s * 0.13, height: s * 0.13, backgroundColor: "#FFFBEB", marginHorizontal: 4, borderRadius: 2 }} />
          </View>
          <View style={{ position: "absolute", bottom: s * 0.18, left: s * 0.18, width: s * 0.13, height: s * 0.13, backgroundColor: "#FFFBEB", borderRadius: 2 }} />
          <View style={{ position: "absolute", bottom: s * 0.04, width: s * 0.18, height: s * 0.26, backgroundColor: "#78350F", borderRadius: 3 }} />
        </View>
      );
      // L3 Townhouse — tall and narrow, two windows up top
      if (lv >= 3) return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.85, height: s * 0.18, backgroundColor: "#991B1B", borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
          <View style={{ width: s * 0.9, height: s * 0.55, backgroundColor: "#F59E0B", borderRadius: 6 }} />
          <View style={{ flexDirection: "row", position: "absolute", bottom: s * 0.25 }}>
            <View style={{ width: s * 0.15, height: s * 0.15, backgroundColor: "#FEF3C7", marginHorizontal: 4, borderRadius: 2 }} />
            <View style={{ width: s * 0.15, height: s * 0.15, backgroundColor: "#FEF3C7", marginHorizontal: 4, borderRadius: 2 }} />
          </View>
          <View style={{ position: "absolute", bottom: s * 0.05, width: s * 0.18, height: s * 0.28, backgroundColor: "#78350F", borderRadius: 3 }} />
          <View style={{ position: "absolute", top: s * 0.05, right: s * 0.15, width: s * 0.08, height: s * 0.2, backgroundColor: "#78716C", borderRadius: 2 }} />
        </View>
      );
      // L2 House
      if (lv >= 2) return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.75, height: s * 0.16, backgroundColor: "#B91C1C", borderTopLeftRadius: 5, borderTopRightRadius: 5 }} />
          <View style={{ width: s * 0.85, height: s * 0.52, backgroundColor: "#F59E0B", borderRadius: 5 }} />
          <View style={{ position: "absolute", bottom: s * 0.2, left: s * 0.15, width: s * 0.14, height: s * 0.14, backgroundColor: "#FEF3C7", borderRadius: 2 }} />
          <View style={{ position: "absolute", bottom: s * 0.05, width: s * 0.18, height: s * 0.28, backgroundColor: "#78350F", borderRadius: 2 }} />
        </View>
      );
      // L1 Cottage
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.7, height: s * 0.15, backgroundColor: "#DC2626", borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
          <View style={{ width: s * 0.8, height: s * 0.5, backgroundColor: "#F59E0B", borderRadius: 4 }} />
          <View style={{ position: "absolute", bottom: s * 0.05, width: s * 0.2, height: s * 0.3, backgroundColor: "#78350F", borderRadius: 2 }} />
        </View>
      );
    case "pawn-house":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.75, height: s * 0.15, backgroundColor: "#7C3AED", borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
          <View style={{ width: s * 0.85, height: s * 0.55, backgroundColor: "#A78BFA", borderRadius: 4 }} />
          <View style={{ position: "absolute", bottom: s * 0.08, width: s * 0.25, height: s * 0.25, backgroundColor: "#4C1D95", borderRadius: s * 0.125 }} />
        </View>
      );
    case "farm":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.9, height: s * 0.3, backgroundColor: "#22C55E", borderRadius: 4 }} />
          <View style={{ width: s * 0.5, height: s * 0.4, backgroundColor: "#DC2626", borderRadius: 4, marginTop: -s * 0.1 }} />
          <View style={{ width: s * 0.55, height: s * 0.12, backgroundColor: "#78350F", marginTop: -s * 0.42 }} />
        </View>
      );
    case "shop":
      if (lv >= 3) return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.95, height: s * 0.18, backgroundColor: "#B91C1C", borderRadius: 5 }} />
          <View style={{ flexDirection: "row" }}>
            {[0,1,2,3].map(i => <View key={i} style={{ width: s * 0.2, height: s * 0.08, backgroundColor: "#FCA5A5", marginHorizontal: 1 }} />)}
          </View>
          <View style={{ width: s * 0.95, height: s * 0.55, backgroundColor: "#1D4ED8", borderRadius: 6 }} />
          <View style={{ flexDirection: "row", marginTop: s * 0.05 }}>
            {[0,1,2].map(i => <View key={i} style={{ width: s * 0.18, height: s * 0.22, backgroundColor: "#BFDBFE", marginHorizontal: 3, borderRadius: 2 }} />)}
          </View>
        </View>
      );
      if (lv >= 2) return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.92, height: s * 0.16, backgroundColor: "#DC2626", borderRadius: 4 }} />
          <View style={{ width: s * 0.92, height: s * 0.52, backgroundColor: "#2563EB", borderRadius: 5 }} />
          <View style={{ flexDirection: "row", marginTop: s * 0.05 }}>
            <View style={{ width: s * 0.2, height: s * 0.24, backgroundColor: "#BFDBFE", marginHorizontal: 3, borderRadius: 2 }} />
            <View style={{ width: s * 0.2, height: s * 0.24, backgroundColor: "#BFDBFE", marginHorizontal: 3, borderRadius: 2 }} />
          </View>
        </View>
      );
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.9, height: s * 0.15, backgroundColor: "#EF4444", borderRadius: 4 }} />
          <View style={{ width: s * 0.9, height: s * 0.5, backgroundColor: "#3B82F6", borderRadius: 4 }} />
          <View style={{ flexDirection: "row", marginTop: s * 0.05 }}>
            <View style={{ width: s * 0.2, height: s * 0.25, backgroundColor: "#BFDBFE", marginHorizontal: 2, borderRadius: 2 }} />
            <View style={{ width: s * 0.2, height: s * 0.25, backgroundColor: "#BFDBFE", marginHorizontal: 2, borderRadius: 2 }} />
          </View>
        </View>
      );
    case "bakery":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.85, height: s * 0.6, backgroundColor: "#F59E0B", borderRadius: 6 }} />
          <View style={{ width: s * 0.6, height: s * 0.15, backgroundColor: "#92400E", borderRadius: 8, marginBottom: s * 0.1 }} />
          <View style={{ position: "absolute", top: s * 0.15, width: s * 0.3, height: s * 0.2, backgroundColor: "#FEF3C7", borderRadius: s * 0.1 }} />
        </View>
      );
    case "market":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.95, height: s * 0.7, backgroundColor: "#0EA5E9", borderRadius: 6 }} />
          <View style={{ flexDirection: "row", marginTop: s * 0.08 }}>
            {[0, 1, 2].map(i => (
              <View key={i} style={{ width: s * 0.18, height: s * 0.3, backgroundColor: "#E0F2FE", marginHorizontal: 3, borderRadius: 2 }} />
            ))}
          </View>
          <View style={{ width: s * 0.95, height: s * 0.12, backgroundColor: "#0369A1", borderRadius: 4, marginTop: s * 0.05 }} />
        </View>
      );
    case "bank":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.9, height: s * 0.12, backgroundColor: "#6B7280", borderRadius: 4 }} />
          <View style={{ flexDirection: "row", marginTop: s * 0.05 }}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={{ width: s * 0.12, height: s * 0.45, backgroundColor: "#9CA3AF", marginHorizontal: 4, borderRadius: 2 }} />
            ))}
          </View>
          <View style={{ width: s * 0.9, height: s * 0.12, backgroundColor: "#6B7280", borderRadius: 4, marginTop: s * 0.05 }} />
        </View>
      );
    case "church": {
      // L1 Chapel — small white chapel with steeple; L2 Church — stained glass;
      // L3 Cathedral — grand twin spires.
      const isCath = lv >= 3;
      const isChurch = lv >= 2;
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          {/* Main body */}
          <View style={{
            width: s * (isCath ? 0.95 : isChurch ? 0.85 : 0.75),
            height: s * (isCath ? 0.62 : isChurch ? 0.55 : 0.48),
            backgroundColor: "#FFFBEB", borderRadius: 4,
            borderWidth: 2, borderColor: "#D6C79A",
            alignItems: "center", justifyContent: "center",
          }}>
            {/* Stained glass windows */}
            <View style={{ flexDirection: "row" }}>
              {(isCath ? [0, 1, 2] : isChurch ? [0, 1] : [0]).map(i => (
                <View key={i} style={{
                  width: s * 0.13, height: s * 0.22, marginHorizontal: 3,
                  backgroundColor: i % 2 === 0 ? "#93C5FD" : "#C4B5FD",
                  borderTopLeftRadius: s * 0.065, borderTopRightRadius: s * 0.065,
                  borderWidth: 1, borderColor: "#92400E",
                }} />
              ))}
            </View>
            {/* Door */}
            <View style={{
              position: "absolute", bottom: 0,
              width: s * 0.16, height: s * 0.24,
              backgroundColor: "#78350F",
              borderTopLeftRadius: s * 0.08, borderTopRightRadius: s * 0.08,
            }} />
          </View>
          {/* Roof */}
          <View style={{
            position: "absolute", bottom: s * (isCath ? 0.62 : isChurch ? 0.55 : 0.48),
            width: 0, height: 0,
            borderLeftWidth: s * (isCath ? 0.475 : isChurch ? 0.425 : 0.375),
            borderRightWidth: s * (isCath ? 0.475 : isChurch ? 0.425 : 0.375),
            borderBottomWidth: s * 0.22,
            borderLeftColor: "transparent", borderRightColor: "transparent",
            borderBottomColor: "#92400E",
          }} />
          {/* Steeple(s) */}
          {isCath ? (
            <>
              <View style={{ position: "absolute", left: s * 0.06, bottom: s * 0.62, width: s * 0.16, height: s * 0.3, backgroundColor: "#FFFBEB", borderWidth: 2, borderColor: "#D6C79A", borderRadius: 2 }} />
              <View style={{ position: "absolute", left: s * 0.06, bottom: s * 0.9, width: 0, height: 0, borderLeftWidth: s * 0.08, borderRightWidth: s * 0.08, borderBottomWidth: s * 0.14, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#92400E" }} />
              <View style={{ position: "absolute", left: s * 0.125, bottom: s * 1.0, width: s * 0.03, height: s * 0.08, backgroundColor: "#FBBF24" }} />
              <View style={{ position: "absolute", left: s * 0.095, bottom: s * 1.05, width: s * 0.09, height: s * 0.03, backgroundColor: "#FBBF24" }} />
              <View style={{ position: "absolute", right: s * 0.06, bottom: s * 0.62, width: s * 0.16, height: s * 0.3, backgroundColor: "#FFFBEB", borderWidth: 2, borderColor: "#D6C79A", borderRadius: 2 }} />
              <View style={{ position: "absolute", right: s * 0.06, bottom: s * 0.9, width: 0, height: 0, borderLeftWidth: s * 0.08, borderRightWidth: s * 0.08, borderBottomWidth: s * 0.14, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#92400E" }} />
              <View style={{ position: "absolute", right: s * 0.125, bottom: s * 1.0, width: s * 0.03, height: s * 0.08, backgroundColor: "#FBBF24" }} />
              <View style={{ position: "absolute", right: s * 0.095, bottom: s * 1.05, width: s * 0.09, height: s * 0.03, backgroundColor: "#FBBF24" }} />
            </>
          ) : (
            <>
              <View style={{ position: "absolute", bottom: s * (isChurch ? 0.72 : 0.65), width: s * 0.18, height: s * 0.28, backgroundColor: "#FFFBEB", borderWidth: 2, borderColor: "#D6C79A", borderRadius: 2 }} />
              <View style={{ position: "absolute", bottom: s * (isChurch ? 0.98 : 0.91), width: 0, height: 0, borderLeftWidth: s * 0.09, borderRightWidth: s * 0.09, borderBottomWidth: s * 0.15, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#92400E" }} />
              {/* Cross */}
              <View style={{ position: "absolute", bottom: s * (isChurch ? 1.1 : 1.03), left: s * 0.485, width: s * 0.03, height: s * 0.1, backgroundColor: "#FBBF24" }} />
              <View style={{ position: "absolute", bottom: s * (isChurch ? 1.14 : 1.07), left: s * 0.45, width: s * 0.1, height: s * 0.03, backgroundColor: "#FBBF24" }} />
            </>
          )}
          {/* Prayer residents: glowing figures gathered around the church */}
          {prayedCount > 0 && (
            <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: -s * 0.06, flexDirection: "row", justifyContent: "center", alignItems: "flex-end" }}>
              {Array.from({ length: Math.min(prayedCount, 6) }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: s * 0.1, height: s * 0.14, marginHorizontal: 1,
                    backgroundColor: "#FDE68A", borderRadius: s * 0.05,
                    borderWidth: 1, borderColor: "#F59E0B",
                  }}
                />
              ))}
              {prayedCount > 6 && (
                <Text style={{ fontSize: 10, color: "#92400E", fontWeight: "700", marginLeft: 2 }}>+{prayedCount - 6}</Text>
              )}
            </View>
          )}
        </View>
      );
    }
    case "barbershop":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
          {/* Building */}
          <View style={{ width: s * 0.85, height: s * 0.6, backgroundColor: "#F3F4F6", borderRadius: 6, borderWidth: 2, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: s * 0.5, height: s * 0.25, backgroundColor: "#BFDBFE", borderRadius: 4 }} />
          </View>
          {/* Barber pole */}
          <View style={{ position: "absolute", right: s * 0.08, top: s * 0.15, width: s * 0.14, height: s * 0.5, backgroundColor: "#FFFFFF", borderRadius: s * 0.07, borderWidth: 1, borderColor: "#D1D5DB", overflow: "hidden" }}>
            <View style={{ position: "absolute", top: 0, width: "200%", height: "33%", backgroundColor: "#EF4444", transform: [{ rotate: "-20deg" }], marginLeft: "-50%" }} />
            <View style={{ position: "absolute", top: "33%", left: 0, right: 0, height: "34%", backgroundColor: "#FFFFFF" }} />
            <View style={{ position: "absolute", bottom: 0, width: "200%", height: "33%", backgroundColor: "#3B82F6", transform: [{ rotate: "-20deg" }], marginLeft: "-50%" }} />
          </View>
        </View>
      );
    case "clothes-shop":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: s * 0.85, height: s * 0.62, backgroundColor: "#FDE68A", borderRadius: 6, borderWidth: 2, borderColor: "#D97706", alignItems: "center", justifyContent: "center" }}>
            {/* Shirt shape */}
            <View style={{ width: s * 0.4, height: s * 0.34, backgroundColor: "#3B82F6", borderRadius: 4 }} />
            <View style={{ position: "absolute", top: s * 0.12, left: s * 0.12, width: s * 0.14, height: s * 0.1, backgroundColor: "#3B82F6", transform: [{ rotate: "25deg" }], borderRadius: 3 }} />
            <View style={{ position: "absolute", top: s * 0.12, right: s * 0.12, width: s * 0.14, height: s * 0.1, backgroundColor: "#3B82F6", transform: [{ rotate: "-25deg" }], borderRadius: 3 }} />
          </View>
        </View>
      );
    case "armory":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: s * 0.85, height: s * 0.62, backgroundColor: "#E5E7EB", borderRadius: 6, borderWidth: 2, borderColor: "#6B7280", alignItems: "center", justifyContent: "center" }}>
            {/* Shield */}
            <View style={{ width: s * 0.4, height: s * 0.44, backgroundColor: "#9CA3AF", borderTopLeftRadius: s * 0.06, borderTopRightRadius: s * 0.06, borderBottomLeftRadius: s * 0.2, borderBottomRightRadius: s * 0.2, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: s * 0.16, height: s * 0.16, borderRadius: s * 0.08, backgroundColor: "#6B7280" }} />
            </View>
          </View>
        </View>
      );
    case "weaponsmith":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: s * 0.85, height: s * 0.62, backgroundColor: "#FEE2E2", borderRadius: 6, borderWidth: 2, borderColor: "#B91C1C", alignItems: "center", justifyContent: "center" }}>
            {/* Crossed swords */}
            <View style={{ width: s * 0.1, height: s * 0.44, backgroundColor: "#9CA3AF", borderRadius: 3, transform: [{ rotate: "35deg" }] }} />
            <View style={{ position: "absolute", width: s * 0.1, height: s * 0.44, backgroundColor: "#9CA3AF", borderRadius: 3, transform: [{ rotate: "-35deg" }] }} />
            <View style={{ position: "absolute", width: s * 0.3, height: s * 0.06, backgroundColor: "#78350F", borderRadius: 3 }} />
          </View>
        </View>
      );
    case "toolshop":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: s * 0.85, height: s * 0.62, backgroundColor: "#FEF3C7", borderRadius: 6, borderWidth: 2, borderColor: "#B45309", alignItems: "center", justifyContent: "center" }}>
            {/* Hammer */}
            <View style={{ width: s * 0.34, height: s * 0.14, backgroundColor: "#6B7280", borderRadius: 4 }} />
            <View style={{ position: "absolute", top: s * 0.3, width: s * 0.08, height: s * 0.3, backgroundColor: "#92400E", borderRadius: 3 }} />
          </View>
        </View>
      );
    case "bank-tower": {
      // Stacked stories — one segment per floor, grows taller with floors
      const stories = Math.min(Math.max(floors || 1, 1), 5);
      const segH = (s * 0.82) / stories;
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.62, alignItems: "center" }}>
            {Array.from({ length: stories }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: s * 0.62,
                  height: segH,
                  backgroundColor: i === 0 ? "#1E3A8A" : "#2748A8",
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: "#172554",
                  alignItems: "center",
                  justifyContent: "center",
                  borderTopLeftRadius: i === stories - 1 ? 4 : 0,
                  borderTopRightRadius: i === stories - 1 ? 4 : 0,
                }}
              >
                <View style={{ flexDirection: "row" }}>
                  {[0, 1, 2].map(j => (
                    <View key={j} style={{ width: s * 0.1, height: segH * 0.4, backgroundColor: isLit(i, j) ? LIT : "#1E3A8A", marginHorizontal: s * 0.02, borderRadius: 1 }} />
                  ))}
                </View>
              </View>
            ))}
            <View style={{ width: s * 0.7, height: s * 0.07, backgroundColor: "#172554", borderRadius: 3, marginTop: 1 }} />
          </View>
        </View>
      );
    }
    case "department-store":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ flexDirection: "row" }}>
            {[0, 1, 2, 3].map(i => <View key={i} style={{ width: s * 0.22, height: s * 0.08, backgroundColor: i % 2 ? "#FFFFFF" : "#EF4444" }} />)}
          </View>
          <View style={{ width: s * 0.95, height: s * 0.72, backgroundColor: "#7C3AED", borderRadius: 5, alignItems: "center", justifyContent: "center" }}>
            {[0, 1].map(r => (
              <View key={r} style={{ flexDirection: "row", marginVertical: s * 0.03 }}>
                {[0, 1, 2].map(i => <View key={i} style={{ width: s * 0.2, height: s * 0.18, backgroundColor: isLit(r, i) ? LIT : "#4C1D95", marginHorizontal: 4, borderRadius: 2 }} />)}
              </View>
            ))}
          </View>
        </View>
      );
    case "hotel":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.7, height: s * 0.82, backgroundColor: "#B45309", borderRadius: 5, alignItems: "center", paddingTop: s * 0.06 }}>
            <View style={{ width: s * 0.34, height: s * 0.16, backgroundColor: "#FEF3C7", borderRadius: 4, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: s * 0.12, fontWeight: "800", color: "#92400E" }}>H</Text>
            </View>
            {[0, 1, 2].map(r => (
              <View key={r} style={{ flexDirection: "row", marginTop: s * 0.05 }}>
                {[0, 1].map(i => <View key={i} style={{ width: s * 0.16, height: s * 0.12, backgroundColor: isLit(r, i) ? LIT : "#78350F", marginHorizontal: 4, borderRadius: 2 }} />)}
              </View>
            ))}
          </View>
        </View>
      );
    case "office":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.65, height: s * 0.88, backgroundColor: "#93C5FD", borderRadius: 4, alignItems: "center", paddingTop: s * 0.05 }}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={{ flexDirection: "row", marginVertical: s * 0.02 }}>
                {[0, 1].map(j => <View key={j} style={{ width: s * 0.2, height: s * 0.09, backgroundColor: isLit(i, j) ? LIT : "#1E40AF", marginHorizontal: 3, borderRadius: 1 }} />)}
              </View>
            ))}
          </View>
        </View>
      );
    case "food-court":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.9, height: s * 0.55, backgroundColor: "#F97316", borderRadius: 6, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: s * 0.32 }}>🍔</Text>
          </View>
          <View style={{ width: s * 0.9, height: s * 0.1, backgroundColor: "#9A3412", borderRadius: 3, marginTop: 2 }} />
        </View>
      );
    case "bookstore":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.85, height: s * 0.55, backgroundColor: "#92400E", borderRadius: 6, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: s * 0.32 }}>📚</Text>
          </View>
          <View style={{ width: s * 0.85, height: s * 0.1, backgroundColor: "#451A03", borderRadius: 3, marginTop: 2 }} />
        </View>
      );
    case "arcade":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.9, height: s * 0.6, backgroundColor: "#4C1D95", borderRadius: 6, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: s * 0.32 }}>🕹️</Text>
            <View style={{ flexDirection: "row", marginTop: 2 }}>
              {["#F0ABFC", "#67E8F9", "#FDE68A"].map((c, i) => <View key={i} style={{ width: s * 0.08, height: s * 0.08, borderRadius: s * 0.04, backgroundColor: c, marginHorizontal: 2 }} />)}
            </View>
          </View>
        </View>
      );
    case "cinema":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.9, height: s * 0.14, backgroundColor: "#FBBF24", borderRadius: 4, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: s * 0.09, fontWeight: "800", color: "#78350F" }}>CINEMA</Text>
          </View>
          <View style={{ width: s * 0.85, height: s * 0.5, backgroundColor: "#1F2937", borderRadius: 5, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: s * 0.5, height: s * 0.28, backgroundColor: "#E5E7EB", borderRadius: 3 }} />
          </View>
        </View>
      );
    case "library":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.85, height: s * 0.6, backgroundColor: "#0F766E", borderRadius: 6, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: s * 0.32 }}>📖</Text>
          </View>
          <View style={{ width: s * 0.9, height: s * 0.1, backgroundColor: "#134E4A", borderRadius: 3, marginTop: 2 }} />
        </View>
      );
    case "classroom":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.9, height: s * 0.6, backgroundColor: "#15803D", borderRadius: 6, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: s * 0.55, height: s * 0.3, backgroundColor: "#166534", borderRadius: 3, borderWidth: 2, borderColor: "#BBF7D0", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: s * 0.16, color: "#FFFFFF", fontWeight: "700" }}>A+</Text>
            </View>
          </View>
        </View>
      );
    case "chapel":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.7, height: s * 0.55, backgroundColor: "#F8FAFC", borderRadius: 5, borderWidth: 2, borderColor: "#CBD5E1", alignItems: "center", paddingTop: s * 0.06 }}>
            <View style={{ width: s * 0.08, height: s * 0.22, backgroundColor: "#B45309", borderRadius: 2 }} />
            <View style={{ position: "absolute", top: s * 0.1, width: s * 0.2, height: s * 0.07, backgroundColor: "#B45309", borderRadius: 2 }} />
            <View style={{ width: s * 0.3, height: s * 0.18, backgroundColor: "#BFDBFE", borderRadius: 8, marginTop: s * 0.04 }} />
          </View>
          <View style={{ width: s * 0.8, height: s * 0.08, backgroundColor: "#94A3B8", borderRadius: 3, marginTop: 1 }} />
        </View>
      );
    case "pizza-place":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ flexDirection: "row" }}>
            {[0, 1, 2, 3].map(i => <View key={i} style={{ width: s * 0.2, height: s * 0.09, backgroundColor: i % 2 ? "#FFFFFF" : "#DC2626" }} />)}
          </View>
          <View style={{ width: s * 0.85, height: s * 0.55, backgroundColor: "#F5D0A9", borderRadius: 6, alignItems: "center", justifyContent: "center" }}>
            {/* pizza: tan circle, red pepperoni dots */}
            <View style={{ width: s * 0.4, height: s * 0.4, borderRadius: s * 0.2, backgroundColor: "#FBBF24", alignItems: "center", justifyContent: "center" }}>
              <View style={{ flexDirection: "row" }}>
                {[0, 1].map(i => <View key={i} style={{ width: s * 0.07, height: s * 0.07, borderRadius: s * 0.035, backgroundColor: "#DC2626", margin: 2 }} />)}
              </View>
            </View>
          </View>
        </View>
      );
    case "burger-joint":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.85, height: s * 0.62, backgroundColor: "#92400E", borderRadius: 6, alignItems: "center", justifyContent: "center" }}>
            {/* burger stack */}
            <View style={{ width: s * 0.44, height: s * 0.14, borderRadius: s * 0.07, backgroundColor: "#FBBF24" }} />
            <View style={{ width: s * 0.48, height: s * 0.06, backgroundColor: "#65A30D", borderRadius: 3, marginVertical: 1 }} />
            <View style={{ width: s * 0.46, height: s * 0.08, backgroundColor: "#78350F", borderRadius: 3 }} />
            <View style={{ width: s * 0.44, height: s * 0.1, borderRadius: s * 0.05, backgroundColor: "#FBBF24", marginTop: 1 }} />
          </View>
          <View style={{ width: s * 0.85, height: s * 0.08, backgroundColor: "#451A03", borderRadius: 3, marginTop: 2 }} />
        </View>
      );
    case "taco-stand":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ flexDirection: "row" }}>
            {[0, 1, 2].map(i => <View key={i} style={{ width: s * 0.22, height: s * 0.1, backgroundColor: i % 2 ? "#FDE68A" : "#16A34A" }} />)}
          </View>
          <View style={{ width: s * 0.7, height: s * 0.5, backgroundColor: "#FEF3C7", borderRadius: 5, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#D97706" }}>
            {/* taco: yellow half-disc */}
            <View style={{ width: s * 0.36, height: s * 0.2, backgroundColor: "#FACC15", borderTopLeftRadius: s * 0.18, borderTopRightRadius: s * 0.18 }} />
            <View style={{ width: s * 0.28, height: s * 0.06, backgroundColor: "#65A30D", borderRadius: 3, marginTop: -s * 0.03 }} />
          </View>
        </View>
      );
    case "sushi-bar":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.85, height: s * 0.58, backgroundColor: "#1F2937", borderRadius: 6, alignItems: "center", justifyContent: "center" }}>
            {/* sushi pieces */}
            <View style={{ flexDirection: "row" }}>
              {[0, 1].map(i => (
                <View key={i} style={{ width: s * 0.22, height: s * 0.16, backgroundColor: "#FFFFFF", borderRadius: 4, marginHorizontal: 3, alignItems: "center", justifyContent: "center" }}>
                  <View style={{ width: s * 0.16, height: s * 0.07, backgroundColor: "#FB7185", borderRadius: 3 }} />
                </View>
              ))}
            </View>
            <View style={{ width: s * 0.5, height: s * 0.05, backgroundColor: "#374151", borderRadius: 2, marginTop: s * 0.05 }} />
          </View>
        </View>
      );
    case "diner":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.9, height: s * 0.12, backgroundColor: "#E5E7EB", borderRadius: 4, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#9CA3AF" }}>
            <Text style={{ fontSize: s * 0.08, fontWeight: "800", color: "#DC2626" }}>DINER</Text>
          </View>
          <View style={{ width: s * 0.85, height: s * 0.52, backgroundColor: "#F8FAFC", borderRadius: 5, borderWidth: 2, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" }}>
            {/* pancake stack */}
            {[0, 1, 2].map(i => (
              <View key={i} style={{ width: s * 0.36 - i * s * 0.02, height: s * 0.07, backgroundColor: "#FCD34D", borderRadius: s * 0.035, marginVertical: 1, borderWidth: 1, borderColor: "#D97706" }} />
            ))}
            <View style={{ width: s * 0.08, height: s * 0.08, backgroundColor: "#FDE68A", borderRadius: 2, marginTop: -s * 0.2 }} />
          </View>
        </View>
      );
    case "upper-room":
      // The Upper Room — warm communal dining hall.
      // L1: simple tables + candles. L2: banquet tables + lanterns. L3: grand hall + chandeliers.
      if (lv >= 3) return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          {/* Grand hall */}
          <View style={{ width: s * 0.95, height: s * 0.68, backgroundColor: "#92400E", borderRadius: 6, alignItems: "center", justifyContent: "flex-end", paddingBottom: s * 0.06 }}>
            {/* Golden chandeliers */}
            <View style={{ flexDirection: "row", position: "absolute", top: s * 0.06 }}>
              {[0, 1, 2].map(i => (
                <View key={i} style={{ alignItems: "center", marginHorizontal: s * 0.06 }}>
                  <View style={{ width: 2, height: s * 0.08, backgroundColor: "#78350F" }} />
                  <View style={{ width: s * 0.12, height: s * 0.05, backgroundColor: "#FBBF24", borderRadius: 3 }} />
                  <View style={{ width: s * 0.04, height: s * 0.04, backgroundColor: "#FEF3C7", borderRadius: s * 0.02, marginTop: 1 }} />
                </View>
              ))}
            </View>
            {/* Long banquet table with glowing centerpiece */}
            <View style={{ width: s * 0.75, height: s * 0.1, backgroundColor: "#78350F", borderRadius: 4 }} />
            <View style={{ width: s * 0.1, height: s * 0.1, backgroundColor: "#FDE68A", borderRadius: s * 0.05, marginTop: -s * 0.1, shadowColor: "#FBBF24", shadowOpacity: 0.8, shadowRadius: 8 }} />
            <View style={{ flexDirection: "row", marginTop: s * 0.04 }}>
              {[0, 1, 2, 3].map(i => <View key={i} style={{ width: s * 0.1, height: s * 0.1, backgroundColor: isLit(2, i) ? LIT : "#451A03", marginHorizontal: 3, borderRadius: 2 }} />)}
            </View>
          </View>
          <View style={{ width: s * 0.98, height: s * 0.08, backgroundColor: "#451A03", borderRadius: 3, marginTop: 2 }} />
        </View>
      );
      if (lv >= 2) return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.9, height: s * 0.62, backgroundColor: "#B45309", borderRadius: 6, alignItems: "center", justifyContent: "flex-end", paddingBottom: s * 0.06 }}>
            {/* Hanging lanterns */}
            <View style={{ flexDirection: "row", position: "absolute", top: s * 0.08 }}>
              {[0, 1].map(i => (
                <View key={i} style={{ alignItems: "center", marginHorizontal: s * 0.1 }}>
                  <View style={{ width: 2, height: s * 0.06, backgroundColor: "#78350F" }} />
                  <View style={{ width: s * 0.09, height: s * 0.09, backgroundColor: "#F59E0B", borderRadius: s * 0.045 }} />
                </View>
              ))}
            </View>
            {/* Banquet table */}
            <View style={{ width: s * 0.68, height: s * 0.09, backgroundColor: "#92400E", borderRadius: 4 }} />
            <View style={{ flexDirection: "row", marginTop: s * 0.03 }}>
              {[0, 1, 2].map(i => <View key={i} style={{ width: s * 0.04, height: s * 0.06, backgroundColor: "#FDE68A", marginHorizontal: 6, borderRadius: 2 }} />)}
            </View>
          </View>
        </View>
      );
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.85, height: s * 0.55, backgroundColor: "#D97706", borderRadius: 6, alignItems: "center", justifyContent: "flex-end", paddingBottom: s * 0.08 }}>
            {/* Simple tables with warm candles */}
            <View style={{ flexDirection: "row" }}>
              {[0, 1].map(i => (
                <View key={i} style={{ alignItems: "center", marginHorizontal: s * 0.08 }}>
                  <View style={{ width: s * 0.22, height: s * 0.07, backgroundColor: "#92400E", borderRadius: 3 }} />
                  <View style={{ width: s * 0.03, height: s * 0.05, backgroundColor: "#FEF3C7", borderRadius: 2, marginTop: -s * 0.1 }} />
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    case "manna-house":
      // Manna House — cozy bakery for breaking bread.
      if (lv >= 3) return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.92, height: s * 0.66, backgroundColor: "#F59E0B", borderRadius: 6, alignItems: "center", paddingTop: s * 0.06 }}>
            <View style={{ width: s * 0.5, height: s * 0.1, backgroundColor: "#92400E", borderRadius: 5 }}>
              <Text style={{ fontSize: s * 0.06, fontWeight: "800", color: "#FEF3C7", textAlign: "center", marginTop: s * 0.015 }}>MANNA</Text>
            </View>
            {/* Golden chandelier + bread display */}
            <View style={{ alignItems: "center", marginTop: s * 0.04 }}>
              <View style={{ width: 2, height: s * 0.06, backgroundColor: "#78350F" }} />
              <View style={{ width: s * 0.2, height: s * 0.06, backgroundColor: "#FBBF24", borderRadius: 4 }} />
            </View>
            <View style={{ flexDirection: "row", marginTop: s * 0.06 }}>
              {[0, 1, 2].map(i => (
                <View key={i} style={{ width: s * 0.16, height: s * 0.1, backgroundColor: "#FDE68A", borderRadius: s * 0.05, marginHorizontal: 4, borderWidth: 1, borderColor: "#D97706" }} />
              ))}
            </View>
            <View style={{ flexDirection: "row", marginTop: s * 0.04 }}>
              {[0, 1, 2].map(i => <View key={i} style={{ width: s * 0.12, height: s * 0.12, backgroundColor: isLit(1, i) ? LIT : "#92400E", marginHorizontal: 5, borderRadius: 2 }} />)}
            </View>
          </View>
        </View>
      );
      if (lv >= 2) return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.88, height: s * 0.6, backgroundColor: "#FBBF24", borderRadius: 6, alignItems: "center", paddingTop: s * 0.08 }}>
            {/* Hanging lanterns */}
            <View style={{ flexDirection: "row" }}>
              {[0, 1].map(i => (
                <View key={i} style={{ alignItems: "center", marginHorizontal: s * 0.12 }}>
                  <View style={{ width: 2, height: s * 0.05, backgroundColor: "#92400E" }} />
                  <View style={{ width: s * 0.08, height: s * 0.08, backgroundColor: "#F59E0B", borderRadius: s * 0.04 }} />
                </View>
              ))}
            </View>
            {/* Bread shelves */}
            <View style={{ marginTop: s * 0.08 }}>
              {[0, 1].map(r => (
                <View key={r} style={{ flexDirection: "row", marginVertical: 3 }}>
                  {[0, 1, 2].map(i => <View key={i} style={{ width: s * 0.14, height: s * 0.08, backgroundColor: "#FEF3C7", borderRadius: s * 0.04, marginHorizontal: 3 }} />)}
                </View>
              ))}
            </View>
          </View>
        </View>
      );
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.85, height: s * 0.55, backgroundColor: "#FCD34D", borderRadius: 6, alignItems: "center", justifyContent: "center" }}>
            {/* Simple bread + candle */}
            <View style={{ width: s * 0.3, height: s * 0.16, backgroundColor: "#FEF3C7", borderRadius: s * 0.08, borderWidth: 1, borderColor: "#D97706" }} />
            <View style={{ width: s * 0.04, height: s * 0.08, backgroundColor: "#FDE68A", borderRadius: 2, marginTop: 6 }} />
          </View>
        </View>
      );
    case "feast-hall":
      // Feast Hall — grand banquet building.
      if (lv >= 3) return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.95, height: s * 0.7, backgroundColor: "#7C2D12", borderRadius: 6, alignItems: "center", paddingTop: s * 0.05 }}>
            {/* Twin golden chandeliers */}
            <View style={{ flexDirection: "row" }}>
              {[0, 1].map(i => (
                <View key={i} style={{ alignItems: "center", marginHorizontal: s * 0.14 }}>
                  <View style={{ width: 2, height: s * 0.07, backgroundColor: "#451A03" }} />
                  <View style={{ width: s * 0.16, height: s * 0.07, backgroundColor: "#FBBF24", borderRadius: 4 }} />
                  <View style={{ flexDirection: "row", marginTop: 2 }}>
                    {[0, 1, 2].map(j => <View key={j} style={{ width: s * 0.03, height: s * 0.03, backgroundColor: "#FEF3C7", borderRadius: s * 0.015, marginHorizontal: 2 }} />)}
                  </View>
                </View>
              ))}
            </View>
            {/* Glowing centerpiece table */}
            <View style={{ width: s * 0.7, height: s * 0.1, backgroundColor: "#92400E", borderRadius: 4, marginTop: s * 0.06 }} />
            <View style={{ width: s * 0.14, height: s * 0.14, backgroundColor: "#FDE68A", borderRadius: s * 0.07, marginTop: -s * 0.12, shadowColor: "#FBBF24", shadowOpacity: 0.9, shadowRadius: 10 }} />
            <View style={{ flexDirection: "row", marginTop: s * 0.08 }}>
              {[0, 1, 2, 3].map(i => <View key={i} style={{ width: s * 0.11, height: s * 0.14, backgroundColor: isLit(0, i) ? LIT : "#451A03", marginHorizontal: 4, borderRadius: 2 }} />)}
            </View>
          </View>
        </View>
      );
      if (lv >= 2) return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.9, height: s * 0.64, backgroundColor: "#9A3412", borderRadius: 6, alignItems: "center", paddingTop: s * 0.08 }}>
            <View style={{ flexDirection: "row" }}>
              {[0, 1, 2].map(i => (
                <View key={i} style={{ alignItems: "center", marginHorizontal: s * 0.07 }}>
                  <View style={{ width: 2, height: s * 0.05, backgroundColor: "#451A03" }} />
                  <View style={{ width: s * 0.08, height: s * 0.08, backgroundColor: "#FBBF24", borderRadius: s * 0.04 }} />
                </View>
              ))}
            </View>
            <View style={{ width: s * 0.65, height: s * 0.09, backgroundColor: "#7C2D12", borderRadius: 4, marginTop: s * 0.08 }} />
            <View style={{ flexDirection: "row", marginTop: s * 0.04 }}>
              {[0, 1, 2].map(i => <View key={i} style={{ width: s * 0.1, height: s * 0.12, backgroundColor: isLit(2, i) ? LIT : "#451A03", marginHorizontal: 5, borderRadius: 2 }} />)}
            </View>
          </View>
        </View>
      );
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ width: s * 0.88, height: s * 0.58, backgroundColor: "#C2410C", borderRadius: 6, alignItems: "center", justifyContent: "flex-end", paddingBottom: s * 0.08 }}>
            <View style={{ width: s * 0.6, height: s * 0.08, backgroundColor: "#7C2D12", borderRadius: 4 }} />
            <View style={{ flexDirection: "row", marginTop: s * 0.03 }}>
              {[0, 1].map(i => <View key={i} style={{ width: s * 0.04, height: s * 0.06, backgroundColor: "#FDE68A", marginHorizontal: 8, borderRadius: 2 }} />)}
            </View>
          </View>
        </View>
      );
    default:
      return <View style={{ width: s * 0.7, height: s * 0.7, backgroundColor: "#9CA3AF", borderRadius: 8 }} />;
  }
}

/** Spinning coin with accumulated amount underneath. kind=xp shows XP styling. */
function SpinningCoin({ amount, kind = "coins", onCollect, frenzy = false, isFull = false }: { amount: number; kind?: "coins" | "xp"; onCollect: () => void; frenzy?: boolean; isFull?: boolean }) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  useEffect(() => {
    if (!frenzy) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [frenzy]);

  const rotateY = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const hasAmount = amount > 0;
  const isXP = kind === "xp";

  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation();
        onCollect();
      }}
      style={{ alignItems: "center", padding: 4, zIndex: 10 }}
    >
      <Animated.View
        style={{
          transform: [{ rotateY }, { scale: frenzy ? pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) : 1 }],
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: frenzy ? "#FDE047" : hasAmount ? (isXP ? "#C4B5FD" : "#FBBF24") : "#E5E7EB",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: frenzy ? "#CA8A04" : hasAmount ? (isXP ? "#7C3AED" : "#D97706") : "#9CA3AF",
          shadowColor: frenzy ? "#CA8A04" : "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: frenzy ? 0.6 : 0.2,
          shadowRadius: frenzy ? 8 : 3,
          elevation: frenzy ? 8 : 3,
        }}
      >
        <Text style={{ fontSize: 20 }}>{isXP ? "⚡" : "🪙"}</Text>
      </Animated.View>
      {frenzy && (
        <View style={{ position: "absolute", top: -8, right: -8, backgroundColor: "#CA8A04", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontSize: 10, fontWeight: "800", color: "#FFFFFF" }}>2x</Text>
        </View>
      )}
      {isFull && !frenzy && (
        <View style={{ position: "absolute", top: -8, right: -8, backgroundColor: "#DC2626", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontSize: 10, fontWeight: "800", color: "#FFFFFF" }}>FULL</Text>
        </View>
      )}
      <Text style={{
        fontSize: 10,
        fontWeight: "700",
        color: hasAmount ? (isXP ? "#5B21B6" : "#92400E") : "#9CA3AF",
        marginTop: 2,
        backgroundColor: "rgba(255,255,255,0.9)",
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 8,
      }}>
        {hasAmount ? (isXP ? `+${Math.floor(amount)} XP` : `+${amount.toFixed(2)}`) : "earning"}
      </Text>
    </Pressable>
  );
}

export default function HometownScreen() {
  const router = useRouter();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [town, setTown] = useState<TownState>(() => emptyTownState());
  const [activeMap, setActiveMap] = useState<TownMapId>("town");
  const [unlockedMaps, setUnlockedMaps] = useState<TownMapId[]>(["town"]);
  // Day/night page theme: re-evaluate every 5 minutes so the whole
  // screen shifts with the sky.
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => getTimeOfDay());
  useEffect(() => {
    const t = setInterval(() => setTimeOfDay(getTimeOfDay()), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
  const pt = PAGE_THEMES[timeOfDay];
  // Tap frenzy: 5+ rapid taps → 2x collects for 10s (5-min cooldown)
  const [frenzyActive, setFrenzyActive] = useState(false);
  const tapTimesRef = useRef<number[]>([]);
  const frenzyUntilRef = useRef(0);
  const lastFrenzyRef = useRef(0);
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [movingBuilding, setMovingBuilding] = useState<PlacedBuilding | null>(null);
  const [popupBuilding, setPopupBuilding] = useState<PlacedBuilding | null>(null);
  const [monumentCount, setMonumentCount] = useState(0);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [prayedToday, setPrayedToday] = useState(0);
  const [prayedPeople, setPrayedPeople] = useState<PrayedPerson[]>([]);
  const [prayerVillagerInfo, setPrayerVillagerInfo] = useState<{ id: string; name: string } | null>(null);
  const [missionsVisible, setMissionsVisible] = useState(false);
  const [purchasedPlots, setPurchasedPlots] = useState<string[]>([]);
  const [fellowship, setFellowship] = useState<FellowshipState | null>(null);
  const [gatheringNow, setGatheringNow] = useState(false);
  // Garden of Remembrance: loved ones remembered here, with garden upgrades.
  const [remembrance, setRemembrance] = useState<RemembranceState>(() => emptyRemembrance());
  // Garden visits: blessed residents paying their respects (+0.1% income/visit, 24h)
  const [gardenVisits, setGardenVisits] = useState<GardenVisitState>(() => emptyGardenVisits());
  const [tier] = useState(1); // TODO: derive from active fast day

  // The active map's state (all grid logic operates on this)
  const map: MapState = town.maps[activeMap];

  // Prayer lights: everyone prayed for today appears as a golden light.
  // Gone by midnight — each day brings a new set.
  const lightInfos = useMemo<LightInfo[]>(() => {
    return prayedPeople.map((p) => ({
      personId: String(p.id),
      name: p.name,
    }));
  }, [prayedPeople]);

  // Garden visitors: 1-2 prayer lights paying their respects this hour
  // (daytime only). Deterministic per hour so they linger while you visit.
  const gardenVisitors = useMemo(() => {
    if (timeOfDay === "night") return [];
    const blessed = lightInfos.map((r) => ({ personId: r.personId, name: r.name }));
    return pickGardenVisitors(blessed, gardenVisitHourKey(), false);
  }, [lightInfos, timeOfDay]);

  const saveTown = useCallback((next: TownState) => {
    setTown(next);
    AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  /** Persist a new state for the currently active map. */
  const saveMap = useCallback((next: MapState) => {
    setTown(prev => {
      const updated: TownState = { ...prev, maps: { ...prev.maps, [activeMap]: next } };
      AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(updated)).catch(() => undefined);
      return updated;
    });
  }, [activeMap]);

  /**
   * NPC bank visit bonus: a townsfolk/commuter arriving at a bank or
   * bank-tower adds +1 coin × building level to that building's
   * tap-to-collect total. Capped at 5 visit bonuses per bank per hour.
   */
  const handleBankVisit = useCallback((buildingId: string) => {
    const hourBucket = new Date().toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
    setTown(prev => {
      const maps = { ...prev.maps };
      let changed = false;
      for (const mapId of TOWN_MAP_IDS) {
        const m = maps[mapId];
        const idx = m.buildings.findIndex(b => b.id === buildingId);
        if (idx === -1) continue;
        const b = m.buildings[idx];
        const count = b.visitBonusHour === hourBucket ? (b.visitBonusCount || 0) : 0;
        if (count >= 5) break; // hourly cap reached
        const bonus = Math.max(1, b.level || 1);
        maps[mapId] = {
          ...m,
          buildings: m.buildings.map(x =>
            x.id === buildingId
              ? {
                  ...x,
                  accumulated: Math.round(Math.min(buildingStorageCap(x), (x.accumulated || 0) + bonus) * 100) / 100,
                  visitBonusCount: count + 1,
                  visitBonusHour: hourBucket,
                }
              : x
          ),
        };
        changed = true;
        break;
      }
      if (!changed) return prev;
      const updated = { ...prev, maps };
      AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(updated)).catch(() => undefined);
      return updated;
    });
  }, []);

  const saveCoins = useCallback((next: HometownCoins) => {
    setCoins(next);
    AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  // Ref mirror of coins for fresh reads inside event handlers (avoids stale closures).
  const coinsRef = useRef(coins);
  useEffect(() => {
    coinsRef.current = coins;
  }, [coins]);

  // Transactional coin delta: functional setState so concurrent transactions
  // (sell, upgrade, collect, hire, purchases) never clobber each other.
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

  const switchMap = useCallback((id: TownMapId) => {
    setActiveMap(id);
    setSelectedTile(null);
    setMovingBuilding(null);
  }, []);

  const handleUnlockMap = useCallback((id: TownMapId) => {
    const info = MAP_INFO[id];
    if (info.comingSoon) {
      Alert.alert(info.name, "This map is coming soon!");
      return;
    }
    if (coinsRef.current.balance < info.unlockCost) {
      Alert.alert("Not enough coins", `Unlocking ${info.name} costs ${info.unlockCost} coins. You have ${Math.floor(coinsRef.current.balance)}.`);
      return;
    }
    Alert.alert(`Unlock ${info.name}?`, `${info.description}\n\nCost: ${info.unlockCost} coins.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unlock",
        onPress: () => {
          const next = [...unlockedMaps, id];
          setUnlockedMaps(next);
          AsyncStorage.setItem(MAP_UNLOCKED_KEY, JSON.stringify(next)).catch(() => undefined);
          addCoins(-info.unlockCost);
          switchMap(id);
        },
      },
    ]);
  }, [unlockedMaps, addCoins, switchMap]);

  // Signpost taps mirror the map pill behavior: unlock flow or switch.
  const handleMapSignSelect = useCallback((id: TownMapId) => {
    const info = MAP_INFO[id];
    if (info.comingSoon) {
      Alert.alert(info.name, "This map is coming soon!");
      return;
    }
    if (!unlockedMaps.includes(id)) {
      handleUnlockMap(id);
      return;
    }
    switchMap(id);
  }, [unlockedMaps, handleUnlockMap, switchMap]);

  // Load + accumulate hourly income on open (across all maps)
  useEffect(() => {
    (async () => {
      try {
        // Refresh gear boosts (tools boost town coins)
        await refreshGearBoostCache();
        const gearCoinMult = 1 + getCachedBoosts().coinMult;
        const now = new Date().toISOString();
        const today = getTodayISOString();
        const [coinsRaw, townRaw, monumentsRaw, ownedRaw, backfillRaw, fastsRaw, unlockedRaw] = await Promise.all([
          AsyncStorage.getItem(COINS_STORAGE_KEY),
          AsyncStorage.getItem(TOWN_STORAGE_KEY),
          AsyncStorage.getItem(MONUMENT_STORAGE_KEY),
          AsyncStorage.getItem(SHOP_OWNED_KEY),
          AsyncStorage.getItem("prayercircle.hometown.coin-backfill.v1"),
          AsyncStorage.getItem("prayercircle.fasts.v1"),
          AsyncStorage.getItem(MAP_UNLOCKED_KEY),
        ]);
        // One-time backfill: 1 coin per completed fast day before coins existed
        let effectiveCoinsRaw = coinsRaw;
        if (!backfillRaw) {
          try {
            const fasts = fastsRaw ? JSON.parse(fastsRaw) : [];
            let completedCount = 0;
            for (const f of fasts) {
              const statuses = f.dayStatuses || {};
              for (const d of Object.values(statuses)) {
                if (d === "completed") completedCount++;
              }
            }
            if (completedCount > 0) {
              const c0 = parseCoins(coinsRaw ? JSON.parse(coinsRaw) : {});
              const backfilled = {
                balance: c0.balance + completedCount,
                lifetimeEarned: c0.lifetimeEarned + completedCount,
              };
              await AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(backfilled));
              effectiveCoinsRaw = JSON.stringify(backfilled);
            }
          } catch {}
          await AsyncStorage.setItem("prayercircle.hometown.coin-backfill.v1", "1");
        }
        let c = parseCoins(effectiveCoinsRaw ? JSON.parse(effectiveCoinsRaw) : {});
        let t = parseTown(townRaw ? JSON.parse(townRaw) : {});
        // One-time Mall → Garden of Remembrance migration: refund retired mall
        // buildings at FULL price (base cost + upgrades paid), then clear the map.
        try {
          const refundDone = await AsyncStorage.getItem(REMEMBRANCE_MALL_REFUND_KEY);
          const mallBuildings = t.maps.mall?.buildings || [];
          if (!refundDone && mallBuildings.length > 0) {
            const refund = mallBuildings.reduce((sum, b) => sum + remembranceRefundFor(b), 0);
            if (refund > 0) {
              c = { balance: c.balance + refund, lifetimeEarned: c.lifetimeEarned + refund };
              await AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(c));
            }
            t = { ...t, maps: { ...t.maps, mall: { buildings: [], decorations: [], roads: [] } } };
            await AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(t));
            await AsyncStorage.setItem(REMEMBRANCE_MALL_REFUND_KEY, "1");
          } else if (!refundDone) {
            await AsyncStorage.setItem(REMEMBRANCE_MALL_REFUND_KEY, "1");
          }
        } catch {}
        // One-time house removal: houses are gone (prayer lights are the
        // population now). Refund at FULL price, clear them from the town map.
        try {
          const houseRefundDone = await AsyncStorage.getItem(HOUSE_REMOVAL_REFUND_KEY);
          const townBuildings = t.maps.town?.buildings || [];
          const houses = townBuildings.filter((b) => b.type === "house");
          if (!houseRefundDone && houses.length > 0) {
            const refund = houses.reduce((sum, b) => sum + remembranceRefundFor(b), 0);
            if (refund > 0) {
              c = { balance: Math.round((c.balance + refund) * 100) / 100, lifetimeEarned: Math.round((c.lifetimeEarned + refund) * 100) / 100 };
              await AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(c));
            }
            t = {
              ...t,
              maps: {
                ...t.maps,
                town: { ...t.maps.town, buildings: townBuildings.filter((b) => b.type !== "house") },
              },
            };
            await AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(t));
            await AsyncStorage.setItem(HOUSE_REMOVAL_REFUND_KEY, "1");
          } else if (!houseRefundDone) {
            await AsyncStorage.setItem(HOUSE_REMOVAL_REFUND_KEY, "1");
          }
        } catch {}
        // Garden of Remembrance state (loved ones + garden level)
        let remembranceState = emptyRemembrance();
        try { remembranceState = await loadRemembrance(); setRemembrance(remembranceState); } catch {}
        setUnlockedMaps(parseUnlockedMaps(unlockedRaw ? JSON.parse(unlockedRaw) : null));
        try { setPurchasedPlots(await loadPurchasedPlots()); } catch {}
        setCoins(c);
        try {
          const lastFrenzy = await AsyncStorage.getItem(FRENZY_STORAGE_KEY);
          lastFrenzyRef.current = lastFrenzy ? parseInt(lastFrenzy, 10) || 0 : 0;
        } catch {}
        try { setMonumentCount(Object.keys(parseMonuments(monumentsRaw ? JSON.parse(monumentsRaw) : {})).length); } catch {}
        try { setOwnedItems(parseOwnedItems(ownedRaw ? JSON.parse(ownedRaw) : [])); } catch {}

        // Hourly accumulation per map: coins 0.5/hr, XP at xpPerDay/24 per hr
        // Preload bank interior bonuses (async) for bank/bank-tower buildings.
        // ATM & vault bonuses drip as collectible coins INSIDE the bank (tapped
        // in the interior), so they are not part of the auto hourly add.
        const interiorBonuses: Record<string, Awaited<ReturnType<typeof bankInteriorBonus>>> = {};
        try {
          const bankIds: string[] = [];
          for (const id of TOWN_MAP_IDS) {
            for (const b of t.maps[id].buildings) {
              if (b.type === "bank" || b.type === "bank-tower") bankIds.push(b.id);
            }
          }
          const bonuses = await Promise.all(bankIds.map((bid) => bankInteriorBonus(bid)));
          bankIds.forEach((bid, i) => { interiorBonuses[bid] = bonuses[i]; });
        } catch {}
        // Generate today's missions
        let missions: Mission[] = [];
        try { missions = await generateDailyMissions(); } catch {}
        setMissions(missions);
        // Generosity stat boosts coin earnings
        let generosityMult = 0;
        try { generosityMult = (await refreshStatBoostCache()).coinMult; } catch {}
        const msMult = milestoneMultiplier(c.lifetimeEarned);
        // Prayer contacts prayed for today boost church income (+2/hr each)
        // and send blessed villagers into town (+3% income each).
        let prayedCount = 0;
        let prayedIdSet = new Set<string>();
        let prayedList: { id: string | number; name: string }[] = [];
        try {
          const people = await prayedTodayPeople();
          setPrayedPeople(people.slice(0, PRAYER_VILLAGER_CAP));
          prayedCount = people.length;
          prayedIdSet = new Set(people.map((p) => String(p.id)));
          prayedList = people.map((p) => ({ id: p.id, name: p.name }));
        } catch {}
        setPrayedToday(prayedCount);
        const prMult = prayerMult(prayedCount);
        // Pawn house rooms + desirables boost coin income
        let houseCoinMult = 0;
        try { houseCoinMult = (await refreshHouseBonusCache()).coinMult; } catch {}
        // Fellowship: if the gathering is happening now (Mon/Wed/Fri 6-8pm),
        // breaking bread together sets a 24h income blessing.
        const gathering = isGatheringTime();
        setGatheringNow(gathering);
        let fellowshipState: FellowshipState | null = null;
        try { fellowshipState = await loadFellowship(); } catch {}
        if (gathering) {
          const cityBuildings = t.maps.city?.buildings || [];
          const capacity = totalGatherCapacity(cityBuildings);
          const rate = fellowshipRate(cityBuildings);
          if (capacity > 0 && rate > 0 && prayedCount > 0) {
            const villagers = Math.min(prayedCount, capacity, PRAYER_VILLAGER_CAP);
            fellowshipState = { villagers, rate, earnedAt: new Date().toISOString() };
            try { await saveFellowship(fellowshipState); } catch {}
          }
        }
        setFellowship(fellowshipState);
        const fellowshipBonus = fellowshipMult(fellowshipState);
        // Garden of Remembrance: each remembered loved one blesses the town (+0.5%).
        const remembranceBonus = remembranceMult(remembranceState.people.length);
        // Garden visits: from time to time, blessed residents visit the Garden
        // of Remembrance to pay their respects (1-2 per hour, daytime only).
        // Each visit blesses the town: +0.1% income for 24h.
        let gardenVisitState = emptyGardenVisits();
        try { gardenVisitState = await loadGardenVisits(); } catch {}
        if (getTimeOfDay() !== "night") {
          const hourKey = gardenVisitHourKey();
          if (!gardenVisitState.slots[hourKey]) {
            const blessedNow = prayedPeople.map((p) => ({ personId: String(p.id), name: p.name }));
            const picked = pickGardenVisitors(blessedNow, hourKey, false);
            if (picked.length > 0) {
              const next = pruneGardenVisits({
                slots: { ...gardenVisitState.slots, [hourKey]: picked.map((p) => p.personId) },
              });
              gardenVisitState = next;
              try { await saveGardenVisits(next); } catch {}
            }
          }
        }
        setGardenVisits(gardenVisitState);
        const gardenVisitBonus = gardenVisitMult(gardenVisitState);
        const newMaps = { ...t.maps };
        // ATM/vault drip accruals, applied after the loop (async storage writes)
        const dripOps: { buildingId: string; hours: number; basePerHour: number }[] = [];
        for (const id of TOWN_MAP_IDS) {
          const m = newMaps[id];
          const updatedBuildings = m.buildings.map(b => {
            const lastTick = b.lastTick ? new Date(b.lastTick).getTime() : Date.now();
            const hoursElapsed = Math.floor((Date.now() - lastTick) / 3600000);
            const earnsCoins = effectiveIncomeFor(b) > 0;
            const earnsXP = xpIncomeFor(b.type, b.level || 1) > 0;
            if (hoursElapsed > 0 && (earnsCoins || earnsXP) && mapHasPopulation(m, t)) {
              const multiplier = roadMultiplierForBuilding(m, b.id);
              const shopBoost = barbershopBoostForBuilding(m, b.id);
              const adjacency = shopAdjacencyBonusForBuilding(m, b.id);
              const ib = interiorBonuses[b.id] ?? { mult: 1, vaultDrips: [], atmDrips: [] };
              const floorMult = b.type === "bank-tower" ? bankFloorMultiplier(b.floors || 1) : 1;
              const wMult = workerMult(b);
              const popMult = populationMult(prayedCount);
              const basePerHour = 2.0 * multiplier * shopBoost * adjacency * ib.mult * floorMult * plotIncomeMult(b) * gearCoinMult * (1 + generosityMult) * wMult * msMult * popMult * prMult * fellowshipBonus * remembranceBonus * gardenVisitBonus * (1 + houseCoinMult);
              // Church: +2 coins/hour for each prayer contact prayed for today
              const churchPrayerBonus = b.type === "church" && earnsCoins
                ? hoursElapsed * CHURCH_PRAYER_COINS_PER_HOUR * prayedCount
                : 0;
              const add = earnsCoins
                ? hoursElapsed * basePerHour + churchPrayerBonus
                : (hoursElapsed * xpIncomeFor(b.type, b.level || 1) * wMult) / 24;
              // ATM & vault bonuses drip as collectible coins inside the bank
              // interior instead of auto-adding to the building total.
              if (earnsCoins && (b.type === "bank" || b.type === "bank-tower") &&
                  (ib.vaultDrips.length > 0 || ib.atmDrips.length > 0)) {
                dripOps.push({ buildingId: b.id, hours: hoursElapsed, basePerHour });
              }
              return {
                ...b,
                accumulated: earnsCoins
                  ? Math.round(Math.min(buildingStorageCap(b), (b.accumulated || 0) + add) * 100) / 100
                  : Math.round(((b.accumulated || 0) + add) * 100) / 100,
                lastTick: now,
              };
            }
            return b.lastTick ? b : { ...b, lastTick: now };
          });
          newMaps[id] = { ...m, buildings: updatedBuildings };
        }
        t = { ...t, maps: newMaps };
        // Accrue ATM/vault drips onto interior furniture (collectible inside)
        try {
          await Promise.all(dripOps.map((op) => accrueBankDrips(op.buildingId, op.hours, op.basePerHour)));
        } catch {}

        // Collect business income for missed days (all maps)
        const lastDate = t.lastIncomeDate;
        if (lastDate && lastDate !== today) {
          const days = daysBetween(lastDate, today);
          const perDayCoins = dailyIncomeForTown(t, milestoneMultiplier(c.lifetimeEarned), 1 + houseCoinMult, fellowshipBonus, prayedCount, remembranceBonus, gardenVisitBonus);
          const perDayXP = dailyXPForTown(t);
          if (days > 0 && (perDayCoins > 0 || perDayXP > 0)) {
            const earnedCoins = Math.floor(days * perDayCoins);
            const earnedXP = Math.round(days * perDayXP);
            if (earnedCoins > 0) {
              const nextCoins = {
                balance: c.balance + earnedCoins,
                lifetimeEarned: c.lifetimeEarned + earnedCoins,
              };
              saveCoins(nextCoins);
            }
            if (earnedXP > 0) {
              await awardCustomXP(earnedXP, `town-missed-${lastDate}-to-${today}`).catch(() => undefined);
            }
            Alert.alert("Town Income", `Your towns earned ${earnedCoins} coins${earnedXP > 0 ? ` and ${earnedXP} XP` : ""} while you were away!`);
          }
        }
        t = { ...t, lastIncomeDate: today };
        saveTown(t);
      } catch {}
    })();
  }, []);

  const buildingAt = (x: number, y: number): PlacedBuilding | undefined => {
    return map.buildings.find((b) => {
      const { w, h } = buildingFootprint(b.level || 1, b.type, hasFixedFootprint(b));
      return x >= b.x && x < b.x + w && y >= b.y && y < b.y + h;
    });
  };

  const isBuildingOrigin = (b: PlacedBuilding, x: number, y: number): boolean =>
    b.x === x && b.y === y;

  const roadAt = (x: number, y: number) => (map.roads || []).find(r => r.x === x && r.y === y);
  const decorationAt = (x: number, y: number): PlacedDecoration | undefined =>
    map.decorations.find((d) => d.x === x && d.y === y);

  /** Plot-aware income label ("87 coins/day"). */
  const incomeLabelFor = (b: PlacedBuilding): string => {
    const xp = xpIncomeFor(b.type, b.level || 1);
    if (xp > 0) return `${xp} XP/day`;
    return `${effectiveIncomeFor(b)} coins/day`;
  };

  /** Purchase a city plot (creates the L1 building). */
  const handlePurchasePlot = (plot: CityPlot) => {
    const def = BUILDINGS[plot.buildingType];
    // Don't build over legacy free-placed buildings
    for (let dx = 0; dx < 2; dx++) {
      for (let dy = 0; dy < 2; dy++) {
        if (buildingAt(plot.x + dx, plot.y + dy)) {
          Alert.alert("Plot Occupied", "There's already a building on this lot. Move or sell it first.");
          return;
        }
      }
    }
    if (coinsRef.current.balance < plot.cost) {
      Alert.alert("Not enough coins", `${plot.name} costs ${plot.cost} coins. You have ${Math.floor(coins.balance)}.`);
      return;
    }
    Alert.alert(
      `${plot.name} — FOR SALE`,
      `${def.name}\n${def.description}\n\nPurchase this downtown plot for ${plot.cost} coins?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Buy for ${plot.cost}🪙`,
          onPress: () => {
            const now = new Date().toISOString();
            const building: PlacedBuilding = {
              id: `plot-${plot.id}-${Date.now()}`,
              type: plot.buildingType,
              x: plot.x,
              y: plot.y,
              level: 1,
              plotId: plot.id,
              lastTick: now,
              accumulated: 0,
            };
            const nextPlots = [...purchasedPlots, plot.id];
            setPurchasedPlots(nextPlots);
            savePurchasedPlots(nextPlots);
            saveMap({ ...map, buildings: [...map.buildings, building] });
            addCoins(-plot.cost);
          },
        },
      ]
    );
  };

  /** Tap a purchased plot building: upgrade only (no move/sell). */
  const handlePlotBuildingPress = (b: PlacedBuilding, plot: CityPlot) => {
    const def = BUILDINGS[b.type];
    const level = b.level || 1;
    // Bank towers route to their interior, with plot upgrade offered there too
    const enterActions: { text: string; onPress?: () => void; style?: "cancel" | "destructive" | "default" }[] = [];
    if (b.type === "bank-tower") {
      enterActions.push({
        text: "🏦 Enter Bank",
        onPress: () => router.push(`/bank-interior?buildingId=${b.id}`),
      });
    }
    if (level >= 3) {
      Alert.alert(
        `${def.name} (Lv 3) — ${plot.name}`,
        `${def.description}\n\nMax level! Earns ${incomeLabelFor(b)}. This prime plot can't be moved or sold.`,
        [{ text: "OK" }, ...enterActions]
      );
      return;
    }
    const nextLevel = (level + 1) as 2 | 3;
    const cost = upgradeCostFor(b.type, nextLevel);
    const preview: PlacedBuilding = { ...b, level: nextLevel };
    const isRestaurant = isRestaurantType(b.type);
    const upgradeBlurb = isRestaurant
      ? `Upgrade to Lv ${nextLevel}: ${incomeLabelFor(preview)} — grander hall, more villagers can gather, bigger fellowship blessing.`
      : `Upgrade to Lv ${nextLevel}: ${incomeLabelFor(preview)} — taller tower, more life, bigger payouts.`;
    const capacityBlurb = isRestaurant
      ? `\nGathering capacity: ${RESTAURANT_GATHER_CAPS[level] ?? 10} → ${RESTAURANT_GATHER_CAPS[nextLevel] ?? 10} villagers.`
      : "";
    Alert.alert(
      `${def.name} (Lv ${level}) — ${plot.name}`,
      `${def.description}\n\nCurrently earns ${incomeLabelFor(b)}.\n${upgradeBlurb}${capacityBlurb}\n\nPlots can't be moved or sold.`,
      [
        { text: "Cancel", style: "cancel" },
        ...enterActions,
        {
          text: `Upgrade 🪙${cost}`,
          onPress: () => {
            if (coinsRef.current.balance < cost) {
              Alert.alert("Not enough coins", `You need ${cost} coins. You have ${Math.floor(coins.balance)}.`);
              return;
            }
            const updated = map.buildings.map(x => (x.id === b.id ? { ...x, level: nextLevel } : x));
            saveMap({ ...map, buildings: updated });
            addCoins(-cost);
          },
        },
      ]
    );
  };

  /** Purchase a town neighborhood lot (creates the L1 building). Lot + building paid together. */
  const handleTownLotPress = (lot: TownLot) => {
    const options = lot.allowedTypes
      .filter((type) => tier >= BUILDINGS[type].tier && BUILDINGS[type].maps.includes("town"))
      .map((type) => {
        const def = BUILDINGS[type];
        const total = lot.cost + def.cost;
        return {
          text: `${def.name} — 🪙${total}`,
          onPress: () => {
            if (type === "pawn-house" && map.buildings.some((b) => b.type === "pawn-house")) {
              Alert.alert("Already built", "You already have a pawn house!");
              return;
            }
            if (coinsRef.current.balance < total) {
              Alert.alert("Not enough coins", `${def.name} on ${lot.name} costs ${total} coins (lot ${lot.cost} + building ${def.cost}). You have ${Math.floor(coins.balance)}.`);
              return;
            }
            const now = new Date().toISOString();
            const building: PlacedBuilding = {
              id: `townlot-${lot.id}-${Date.now()}`,
              type,
              x: lot.x,
              y: lot.y,
              level: 1,
              townLotId: lot.id,
              lastTick: now,
              accumulated: 0,
            };
            saveMap({ ...map, buildings: [...map.buildings, building] });
            addCoins(-total);
          },
        };
      });
    if (options.length === 0) {
      Alert.alert("Locked", "No buildings available for this lot yet. Keep growing your fast streak!");
      return;
    }
    Alert.alert(
      `${lot.name} — FOR SALE`,
      `Purchase this lot for ${lot.cost} coins and choose what to build.\n\nLot buildings have a fixed home here — they can't be moved or sold, only upgraded.`,
      [{ text: "Cancel", style: "cancel" }, ...options]
    );
  };

  /** Tap a town lot building: open the popup (upgrade only, no move/sell). */
  const handleTownLotBuildingPress = (b: PlacedBuilding) => {
    // Enterable buildings route to their interiors first
    if (b.type === "pawn-house") {
      router.push("/pawn-house");
      return;
    } else if (b.type === "bank" || b.type === "bank-tower") {
      router.push(`/bank-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "church") {
      router.push(`/church-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "barbershop") {
      router.push("/barbershop");
      return;
    } else if (b.type === "clothes-shop") {
      router.push("/gear-shop?type=clothes");
      return;
    } else if (b.type === "armory") {
      router.push("/gear-shop?type=armor");
      return;
    } else if (b.type === "weaponsmith") {
      router.push("/gear-shop?type=weapon");
      return;
    } else if (b.type === "toolshop") {
      router.push("/gear-shop?type=tool");
      return;
    }
    setPopupBuilding(b);
  };

  const handleTilePress = (x: number, y: number) => {
    // City map: plots only — no free placement
    if (activeMap === "city") {
      const existing = buildingAt(x, y);
      // Plot buildings get the plot treatment (upgrade only, no move/sell)
      if (existing?.plotId) {
        const plot = CITY_PLOTS.find(p => p.id === existing.plotId);
        if (plot) { handlePlotBuildingPress(existing, plot); return; }
      }
      // Legacy free-placed buildings (pre-plots) keep normal handling
      if (!existing) {
        const plot = plotAt(x, y);
        if (plot) {
          if (purchasedPlots.includes(plot.id)) {
            const b = map.buildings.find(bb => bb.plotId === plot.id);
            if (b) { handlePlotBuildingPress(b, plot); return; }
          }
          handlePurchasePlot(plot);
          return;
        }
        // Tapped outside any plot — ignore (city is plots-only)
        return;
      }
      // else: legacy building tapped — fall through to normal handling below
    }
    // Town map: neighborhood lots only — no free placement
    if (activeMap === "town") {
      const existing = buildingAt(x, y);
      // Town lot buildings: popup with upgrade only (no move/sell)
      if (existing?.townLotId) {
        handleTownLotBuildingPress(existing);
        return;
      }
      // Legacy free-placed buildings (pre-neighborhood) keep normal handling
      if (!existing) {
        const lot = townLotAt(x, y);
        if (lot) {
          const b = map.buildings.find((bb) => bb.townLotId === lot.id);
          if (b) { handleTownLotBuildingPress(b); return; }
          handleTownLotPress(lot);
          return;
        }
        // Tapped outside any lot — ignore (town is lots-only)
        return;
      }
      // else: legacy building tapped — fall through to normal handling below
    }
    // Move mode: place the moving building here
    if (movingBuilding) {
      const { w, h } = buildingFootprint(movingBuilding.level || 1, movingBuilding.type, hasFixedFootprint(movingBuilding));
      let fits = true;
      for (let dx = 0; dx < w; dx++) {
        for (let dy = 0; dy < h; dy++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= TOWN_GRID_SIZE || ny >= TOWN_GRID_SIZE) { fits = false; break; }
          const other = buildingAt(nx, ny);
          if (other && other.id !== movingBuilding.id) { fits = false; break; }
          if (decorationAt(nx, ny) || roadAt(nx, ny)) { fits = false; break; }
        }
        if (!fits) break;
      }
      if (!fits) {
        Alert.alert("No Room", "Can't move here - not enough space.");
        return;
      }
      const updatedBuildings = map.buildings.map(b =>
        b.id === movingBuilding.id ? { ...b, x, y } : b
      );
      saveMap({ ...map, buildings: updatedBuildings });
      setMovingBuilding(null);
      return;
    }
    const existingDec = decorationAt(x, y);
    if (existingDec) {
      const def = DECORATIONS[existingDec.type];
      Alert.alert(def.name, "A beautiful decoration.", [
        { text: "OK" },
        { text: "Remove", style: "destructive", onPress: () => {
          saveMap({ ...map, decorations: map.decorations.filter(d => d.id !== existingDec.id) });
        }},
      ]);
      return;
    }
    const existing = buildingAt(x, y);
    if (existing) {
      if (existing.type === "pawn-house") {
        router.push("/pawn-house");
        return;
      } else if (existing.type === "bank" || existing.type === "bank-tower") {
        router.push(`/bank-interior?buildingId=${existing.id}`);
        return;
      } else if (existing.type === "church") {
        router.push(`/church-interior?buildingId=${existing.id}`);
        return;
      } else if (existing.type === "barbershop") {
        router.push("/barbershop");
        return;
      } else if (existing.type === "clothes-shop") {
        router.push("/gear-shop?type=clothes");
        return;
      } else if (existing.type === "armory") {
        router.push("/gear-shop?type=armor");
        return;
      } else if (existing.type === "weaponsmith") {
        router.push("/gear-shop?type=weapon");
        return;
      } else if (existing.type === "toolshop") {
        router.push("/gear-shop?type=tool");
        return;
      } else {
        const def = BUILDINGS[existing.type];
        const level = existing.level || 1;

        if (level >= maxLevelFor(existing.type)) {
          setPopupBuilding(existing);
        } else {
          const nextLevel = level + 1;
          // Check if expanded footprint fits
          const { w, h } = buildingFootprint(nextLevel, existing.type, hasFixedFootprint(existing));
          let fits = true
          for (let dx = 0; dx < w; dx++) {
            for (let dy = 0; dy < h; dy++) {
              const nx = existing.x + dx, ny = existing.y + dy;
              if (nx >= TOWN_GRID_SIZE || ny >= TOWN_GRID_SIZE) { fits = false; break; }
              const other = buildingAt(nx, ny);
              if (other && other.id !== existing.id) { fits = false; break; }
              if (decorationAt(nx, ny) || roadAt(nx, ny)) { fits = false; break; }
            }
            if (!fits) break;
          }
          if (!fits) {
            setPopupBuilding(existing);
            return;
          }
          setPopupBuilding(existing);
        }
      }
      return;
    }
    setSelectedTile({ x, y });
  };

  const handleBuild = (type: BuildingType) => {
    if (!selectedTile) return;
    const def = BUILDINGS[type];
    if (tier < def.tier) {
      Alert.alert("Locked", `Unlocks at tier ${def.tier} (day ${def.tier === 2 ? 40 : def.tier === 3 ? 100 : 250} of your fast).`);
      return;
    }
    if (coinsRef.current.balance < def.cost) {
      Alert.alert("Not enough coins", `You need ${def.cost} coins. You have ${coins.balance}.`);
      return;
    }
    if (type === "pawn-house" && map.buildings.some((b) => b.type === "pawn-house")) {
      Alert.alert("Already built", "You already have a pawn house!");
      return;
    }
    const building: PlacedBuilding = { id: nextId(), type, x: selectedTile.x, y: selectedTile.y, level: 1 };
    saveMap({ ...map, buildings: [...map.buildings, building] });
    addCoins(-def.cost);
    setSelectedTile(null);
  };

  const availableBuildings = (Object.keys(BUILDINGS) as BuildingType[]).filter(
    (t) => tier >= BUILDINGS[t].tier && BUILDINGS[t].maps.includes(activeMap)
  );

  const ownedDecorations = (Object.keys(DECORATIONS) as DecorationType[]).filter(
    (t) => ownedItems.includes(DECORATIONS[t].shopId)
  );

  const handlePlaceDecoration = (type: DecorationType) => {
    if (!selectedTile) return;
    if (buildingAt(selectedTile.x, selectedTile.y) || decorationAt(selectedTile.x, selectedTile.y)) {
      Alert.alert("Occupied", "This plot is already occupied.");
      return;
    }
    const dec: PlacedDecoration = { id: `d${Date.now()}`, type, x: selectedTile.x, y: selectedTile.y };
    saveMap({ ...map, decorations: [...map.decorations, dec] });
    setSelectedTile(null);
  };

  const handleCollectBuilding = (buildingId: string) => {
    const now = Date.now();
    // Frenzy tap tracking (every press counts, even on empty coins)
    const recentTaps = tapTimesRef.current.filter(t => now - t < FRENZY_WINDOW_MS);
    recentTaps.push(now);
    tapTimesRef.current = recentTaps;
    if (recentTaps.length >= FRENZY_TAPS_NEEDED && now >= frenzyUntilRef.current && now - lastFrenzyRef.current >= FRENZY_COOLDOWN_MS) {
      // FRENZY!
      lastFrenzyRef.current = now;
      frenzyUntilRef.current = now + FRENZY_DURATION_MS;
      setFrenzyActive(true);
      AsyncStorage.setItem(FRENZY_STORAGE_KEY, String(now)).catch(() => undefined);
      setTimeout(() => { frenzyUntilRef.current = 0; setFrenzyActive(false); }, FRENZY_DURATION_MS);
    }
    const building = map.buildings.find(b => b.id === buildingId);
    if (!building || !(building.accumulated || 0)) return;
    let amount = building.accumulated || 0;
    if (now < frenzyUntilRef.current) amount = Math.round(amount * FRENZY_MULT * 10) / 10;
    const updatedBuildings = map.buildings.map(b =>
      b.id === buildingId ? { ...b, accumulated: 0, lastTick: new Date().toISOString() } : b
    );
    saveMap({ ...map, buildings: updatedBuildings });
    if (xpIncomeFor(building.type, building.level || 1) > 0) {
      // School building: awards XP instead of coins
      const xp = Math.max(1, Math.floor(amount));
      awardCustomXP(xp, `collect-${buildingId}-${Date.now()}`).catch(() => undefined);
    } else {
      addCoins(amount);
    }
  };

  const handlePlaceRoad = () => {
    if (!selectedTile) return;
    if (buildingAt(selectedTile.x, selectedTile.y) || decorationAt(selectedTile.x, selectedTile.y) || roadAt(selectedTile.x, selectedTile.y)) {
      Alert.alert("Occupied", "This plot already has something on it.");
      return;
    }
    const road = { id: `r${Date.now()}`, x: selectedTile.x, y: selectedTile.y };
    saveMap({ ...map, roads: [...(map.roads || []), road] });
    setSelectedTile(null);
  };

  const cellSize = 40;
  const rows = [];
  for (let y = 0; y < TOWN_GRID_SIZE; y++) {
    const cells = [];
    for (let x = 0; x < TOWN_GRID_SIZE; x++) {
      const b = buildingAt(x, y);
      const isOrigin = b ? isBuildingOrigin(b, x, y) : false;
      const isSelected = selectedTile?.x === x && selectedTile?.y === y;
      const footprint = b ? buildingFootprint(b.level || 1, b.type, hasFixedFootprint(b)) : { w: 1, h: 1 };
      cells.push(
        <Pressable
          key={`${x}-${y}`}
          onPress={() => handleTilePress(x, y)}
          onLongPress={() => {
            const b = buildingAt(x, y);
            if (b) setPopupBuilding(b);
          }}
          style={{
            width: cellSize,
            height: cellSize,
            backgroundColor: isSelected ? "#FEF3C7" : b ? "#D1FAE5" : "#F3F4F6",
            borderWidth: isOrigin || !b ? 1 : 0,
            borderColor: isSelected ? "#F59E0B" : "#E5E7EB",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {decorationAt(x, y) && (
            <Text style={{ fontSize: 22 }}>{DECORATIONS[decorationAt(x, y)!.type].icon}</Text>
          )}
          {roadAt(x, y) && (
            <View style={{ position: "absolute", width: cellSize, height: cellSize, backgroundColor: "#9CA3AF", alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: cellSize * 0.7, height: 8, backgroundColor: "#6B7280", borderRadius: 4 }} />
            </View>
          )}
          {null}
        </Pressable>
      );
    }
    rows.push(
      <View key={y} style={{ flexDirection: "row" }}>
        {cells}
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: pt.bg }} contentContainerStyle={{ padding: 16, paddingTop: 48 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 24, color: pt.text }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "800", color: pt.text }}>{MAP_INFO[activeMap].icon} {MAP_INFO[activeMap].name}</Text>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ fontSize: 16 }}>🪙</Text>
          <Text style={{ marginLeft: 6, fontWeight: "700" }}>{coins.balance}</Text>
        </View>
      </View>

      {/* Coin milestone chip */}
      {(() => {
        const { current, next } = milestoneFor(coins.lifetimeEarned);
        if (!current && !next) return null;
        return (
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#EDE9FE", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12, alignSelf: "flex-start" }}>
            <Text style={{ fontSize: 14 }}>🏆</Text>
            <Text style={{ marginLeft: 6, fontWeight: "700", fontSize: 12, color: "#5B21B6" }}>
              {current ? `${current.name} +${Math.round((current.mult - 1) * 100)}%` : "No milestone yet"}
            </Text>
            {next && (
              <Text style={{ marginLeft: 6, fontSize: 12, color: "#7C3AED" }}>
                → {next.name} at {next.threshold.toLocaleString()} lifetime
              </Text>
            )}
          </View>
        );
      })()}

      {/* Prayer blessing chip */}
      {prayedToday > 0 ? (
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12, alignSelf: "flex-start" }}>
          <Text style={{ fontSize: 14 }}>🙏</Text>
          <Text style={{ marginLeft: 6, fontWeight: "700", fontSize: 12, color: "#92400E" }}>
            {prayedToday} prayed (+{Math.round((prayerMult(prayedToday) - 1) * 100)}% income)
          </Text>
        </View>
      ) : null}

      {/* Fellowship chip — breaking bread blessing (24h) */}
      {(() => {
        const fm = fellowshipMult(fellowship);
        if (fm <= 1) return null;
        return (
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFBEB", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12, alignSelf: "flex-start", borderWidth: 1, borderColor: "#FDE68A" }}>
            <Text style={{ fontSize: 14 }}>🍞</Text>
            <Text style={{ marginLeft: 6, fontWeight: "700", fontSize: 12, color: "#92400E" }}>
              Fellowship: +{((fm - 1) * 100).toFixed(1)}%{gatheringNow ? " — breaking bread now!" : ""}
            </Text>
          </View>
        );
      })()}

      {/* Remembrance chip — loved ones remembered in the garden */}
      {remembrance.people.length > 0 ? (
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FDF6EC", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12, alignSelf: "flex-start", borderWidth: 1, borderColor: "#E7D8B7" }}>
          <Text style={{ fontSize: 14 }}>🕯️</Text>
          <Text style={{ marginLeft: 6, fontWeight: "700", fontSize: 12, color: "#8A6D1B" }}>
            {remembrance.people.length} remembered (+{((remembranceMult(remembrance.people.length) - 1) * 100).toFixed(1)}% income)
          </Text>
        </View>
      ) : null}

      {/* Garden visits chip — residents paying their respects (+0.1%/visit, 24h) */}
      {(() => {
        const gv = gardenVisitMult(gardenVisits);
        if (gv <= 1) return null;
        return (
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F0FDF4", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12, alignSelf: "flex-start", borderWidth: 1, borderColor: "#BBF7D0" }}>
            <Text style={{ fontSize: 14 }}>🌸</Text>
            <Text style={{ marginLeft: 6, fontWeight: "700", fontSize: 12, color: "#166534" }}>
              Garden visits: +{((gv - 1) * 100).toFixed(1)}%
            </Text>
          </View>
        );
      })()}

      {/* Map selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        {TOWN_MAP_IDS.map((id) => {
          const info = MAP_INFO[id];
          const unlocked = unlockedMaps.includes(id);
          const isActive = activeMap === id;
          const label = info.comingSoon
            ? `${info.icon} ${info.name}`
            : unlocked
              ? `${info.icon} ${info.name}`
              : `${info.icon} ${info.name} 🔒 ${info.unlockCost}🪙`;
          return (
            <Pressable
              key={id}
              onPress={() => {
                if (info.comingSoon) {
                  Alert.alert(info.name, "This map is coming soon!");
                  return;
                }
                if (!unlocked) {
                  handleUnlockMap(id);
                  return;
                }
                switchMap(id);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: isActive ? "#1D4ED8" : pt.card,
                borderWidth: isActive ? 0 : 1,
                borderColor: pt.border,
              }}
            >
              <Text style={{ fontWeight: "700", color: isActive ? "#FFFFFF" : pt.text, fontSize: 13 }}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={() => router.push("/hometown-shop")}
        style={{ flexDirection: "row", alignItems: "center", backgroundColor: pt.card, borderRadius: 12, padding: 12, marginBottom: 12 }}
      >
        <Text style={{ fontSize: 24 }}>🛍️</Text>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ fontWeight: "700", fontSize: 16, color: pt.text }}>Town Shop</Text>
          <Text style={{ fontSize: 12, color: pt.subtext }}>Monuments, decorations, pawn skins</Text>
        </View>
        <Text style={{ fontSize: 20, color: pt.subtext }}>→</Text>
      </Pressable>

      {pendingMissions(missions).length > 0 && (
        <Pressable
          onPress={() => setMissionsVisible(true)}
          style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#FCD34D" }}
        >
          <Text style={{ fontSize: 24 }}>📋</Text>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={{ fontWeight: "700", fontSize: 16, color: "#92400E" }}>
              {pendingMissions(missions).length} mission{pendingMissions(missions).length > 1 ? "s" : ""} available
            </Text>
            <Text style={{ fontSize: 12, color: "#B45309" }}>Complete them for bonus coins & XP</Text>
          </View>
          <Text style={{ fontSize: 20, color: "#92400E" }}>→</Text>
        </Pressable>
      )}

      <Text style={{ color: pt.subtext, marginBottom: 12 }}>
        {activeMap === "city" ? "Tap a FOR SALE lot to purchase it. Upgrade towers for bigger payouts." : activeMap === "mall" ? "A quiet, sacred place. Tap a flower to remember, or the wall to read every name." : "Tap an empty plot to build. Businesses earn coins daily while your fast streak is alive."}
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: pt.card, borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <Text style={{ fontSize: 28 }}>🪨</Text>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ fontWeight: "700", fontSize: 16, color: pt.text }}>Testimony Plaza</Text>
          <Text style={{ fontSize: 12, color: pt.subtext }}>
            {monumentCount} {monumentCount === 1 ? "testimony" : "testimonies"} raised — like Abraham's altars
          </Text>
        </View>
      </View>

      {activeMap === "mall" ? (
        <GardenOfRemembrance
          remembrance={remembrance}
          timeOfDay={timeOfDay}
          pt={pt}
          coins={coins.balance}
          onAddPerson={(name, note, flower) => {
            const person: RememberedPerson = {
              id: `r${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
              name,
              note,
              addedAt: new Date().toISOString(),
              flower,
            };
            const next = { ...remembrance, people: [...remembrance.people, person] };
            setRemembrance(next);
            saveRemembrance(next);
          }}
          onUpdateNote={(id, note) => {
            const next = { ...remembrance, people: remembrance.people.map((p) => (p.id === id ? { ...p, note } : p)) };
            setRemembrance(next);
            saveRemembrance(next);
          }}
          onRemovePerson={(id) => {
            const next = { ...remembrance, people: remembrance.people.filter((p) => p.id !== id) };
            setRemembrance(next);
            saveRemembrance(next);
          }}
          onUpgrade={() => {
            const nextLevel = (remembrance.level + 1) as 2 | 3;
            const cost = REMEMBRANCE_UPGRADE_COSTS[nextLevel];
            if (coinsRef.current.balance < cost) return;
            addCoins(-cost);
            const next = { ...remembrance, level: nextLevel };
            setRemembrance(next);
            saveRemembrance(next);
          }}
          visitors={gardenVisitors}
          onLightCandle={(id) => {
            const person = remembrance.people.find((p) => p.id === id);
            if (!person || candleLit(person)) return;
            if (coinsRef.current.balance < MEMORY_CANDLE_COST) {
              Alert.alert("Not enough coins", `Lighting a candle costs ${MEMORY_CANDLE_COST} coins.`);
              return;
            }
            addCoins(-MEMORY_CANDLE_COST);
            const next = {
              ...remembrance,
              people: remembrance.people.map((p) =>
                p.id === id ? { ...p, candleLitAt: new Date().toISOString() } : p
              ),
            };
            setRemembrance(next);
            saveRemembrance(next);
          }}
        />
      ) : activeMap === "reserve" ? (
        <View style={{ alignItems: "center", backgroundColor: pt.card, borderRadius: 12, padding: 48, marginBottom: 16 }}>
          <Text style={{ fontSize: 56 }}>❓</Text>
          <Text style={{ fontWeight: "800", fontSize: 20, marginTop: 12, color: pt.text }}>Coming Soon</Text>
          <Text style={{ color: pt.subtext, textAlign: "center", marginTop: 8 }}>
            A new frontier awaits beyond the {MAP_INFO.school.name}...
          </Text>
        </View>
      ) : (
      <View style={{ alignItems: "center", marginBottom: 16 }}>
        <SeasonalBorder>
        <View style={{ position: "relative" }}>
          {rows}
          {/* Buildings overlay - buildings don't capture touches, coins do */}
          {map.buildings.map((b) => {
            const fp = buildingFootprint(b.level || 1, b.type, hasFixedFootprint(b));
            return (
              <View
                key={`bldg-${b.id}`}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: b.x * cellSize,
                  top: b.y * cellSize,
                  width: fp.w * cellSize,
                  height: fp.h * cellSize,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BuildingArt type={b.type} size={Math.min(fp.w, fp.h) * cellSize * 0.85} level={b.level || 1} floors={b.floors || 1} prayedCount={b.type === "church" ? prayedToday : 0} />
                {/* L3 city towers glow with activity */}
                {(b.level || 1) >= 3 && !!b.plotId && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      bottom: 2,
                      width: fp.w * cellSize * 0.7,
                      height: 10,
                      backgroundColor: "#FDE68A",
                      opacity: 0.35,
                      borderRadius: 5,
                    }}
                  />
                )}
                {/* The Gathering: warm golden glow around restaurants while breaking bread */}
                {gatheringNow && isRestaurantType(b.type) && !!b.plotId && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: -6,
                      top: -6,
                      width: fp.w * cellSize + 12,
                      height: fp.h * cellSize + 12,
                      backgroundColor: "#FBBF24",
                      opacity: 0.25,
                      borderRadius: 12,
                      shadowColor: "#F59E0B",
                      shadowOpacity: 0.6,
                      shadowRadius: 16,
                    }}
                  />
                )}
                {(b.level || 1) > 1 && (
                  <Text style={{ fontSize: 10, color: "#F59E0B", fontWeight: "700" }}>
                    {"★".repeat(b.level || 1)}
                  </Text>
                )}
              </View>
            );
          })}
          {/* City plots: FOR SALE lots (unpurchased) */}
          {activeMap === "city" && CITY_PLOTS.filter(p => !purchasedPlots.includes(p.id)).map((plot) => (
            <View
              key={`plot-${plot.id}`}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: plot.x * cellSize,
                top: plot.y * cellSize,
                width: 2 * cellSize,
                height: 2 * cellSize,
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: "#9CA3AF",
                borderRadius: 8,
                backgroundColor: "rgba(156, 163, 175, 0.08)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: "800", color: "#6B7280", letterSpacing: 1 }}>FOR SALE</Text>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#374151", marginTop: 2 }}>🪙{plot.cost}</Text>
              <Text style={{ fontSize: 8, color: "#9CA3AF", marginTop: 2 }}>{BUILDINGS[plot.buildingType].name}</Text>
            </View>
          ))}
          {/* Town neighborhood lots: soft heavenly glow (unpurchased) */}
          {activeMap === "town" && TOWN_LOTS.filter(lot => !map.buildings.some(b => b.townLotId === lot.id)).map((lot) => {
            const isSmall = lot.w === 1 && lot.h === 1;
            return (
            <View
              key={`townlot-${lot.id}`}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: lot.x * cellSize,
                top: lot.y * cellSize,
                width: lot.w * cellSize,
                height: lot.h * cellSize,
                borderWidth: 2,
                borderColor: "#FCD34D",
                borderRadius: isSmall ? 8 : 12,
                backgroundColor: "rgba(253, 224, 71, 0.10)",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#F59E0B",
                shadowOpacity: 0.35,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 0 },
                padding: 2,
              }}
            >
              {isSmall ? (
                // 1x1 lots (40px): just the price, no overflowing labels
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#92400E" }}>🪙{lot.cost}</Text>
              ) : (
                <>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#B45309", letterSpacing: 1 }}>FOR SALE</Text>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#92400E", marginTop: 2 }}>🪙{lot.cost}</Text>
                  <Text style={{ fontSize: 8, color: "#B45309", marginTop: 2, textAlign: "center" }} numberOfLines={1}>{lot.name}</Text>
                </>
              )}
            </View>
            );
          })}
          {/* Townsfolk — Jonathan's chosen residents + prayed-for visitors; all tappable */}
          <TownNPCs mapState={map} cellSize={cellSize} onBankVisit={handleBankVisit} lights={lightInfos} onVillagerTap={(p) => setPrayerVillagerInfo(p)} />
          {/* City life: plot workers + commuters from town */}
          {activeMap === "city" && (
            <>
              <CityTraffic
                cellSize={cellSize}
                carCount={Math.min(6, Math.max(0, town.maps.town.buildings.filter((b) => b.type === "house").length))}
              />
              <CityNPCs
                mapState={map}
                cellSize={cellSize}
                hometownNpcCount={countHometownNpcs(prayedToday)}
                onBankVisit={handleBankVisit}
              />
            </>
          )}
          {/* Coins/XP overlay - only collectibles capture touches */}
          {map.buildings.map((b) => {
            const fp = buildingFootprint(b.level || 1, b.type, hasFixedFootprint(b));
            const earnsCoins = effectiveIncomeFor(b) > 0;
            const earnsXP = xpIncomeFor(b.type, b.level || 1) > 0;
            if (!earnsCoins && !earnsXP) return null;
            // Only show the collectible once something has accumulated
            if (!(b.accumulated && b.accumulated > 0)) return null;
            return (
              <View
                key={`coin-${b.id}`}
                pointerEvents="box-none"
                style={{
                  position: "absolute",
                  left: b.x * cellSize + fp.w * cellSize - 30,
                  top: b.y * cellSize - 14,
                  width: 60,
                  height: 60,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SpinningCoin
                  amount={b.accumulated || 0}
                  kind={earnsXP ? "xp" : "coins"}
                  onCollect={() => handleCollectBuilding(b.id)}
                  frenzy={frenzyActive}
                  isFull={!earnsXP && isBuildingStorageFull(b)}
                />
              </View>
            );
          })}
        </View>
        </SeasonalBorder>
        {activeMap === "town" && (
          <MapSigns
            activeMap={activeMap}
            unlockedMaps={unlockedMaps}
            onSelectMap={handleMapSignSelect}
          />
        )}
      </View>
      )}

      {selectedTile && activeMap !== "reserve" && activeMap !== "city" && activeMap !== "town" && activeMap !== "mall" && (
        <View style={{ backgroundColor: pt.card, borderRadius: 12, padding: 12, marginTop: 8 }}>
          <Text style={{ fontWeight: "700", marginBottom: 8, color: pt.text }}>
            Build on plot ({selectedTile.x + 1}, {selectedTile.y + 1})
          </Text>
          {(buildingAt(selectedTile.x, selectedTile.y) || decorationAt(selectedTile.x, selectedTile.y) || roadAt(selectedTile.x, selectedTile.y)) && (
            <>
              {(() => {
                const b = buildingAt(selectedTile.x, selectedTile.y);
                if (b) {
                  const sellPrice = Math.floor(BUILDINGS[b.type].cost * 0.5);
                  return (
                    <>
                      <Pressable
                        onPress={() => {
                          setMovingBuilding(b);
                          setSelectedTile(null);
                          Alert.alert("Move Mode", "Tap a new location to move this building.");
                        }}
                        style={{ padding: 10, backgroundColor: "#DBEAFE", borderRadius: 10, alignItems: "center", marginBottom: 8 }}
                      >
                        <Text style={{ color: "#1D4ED8", fontWeight: "700" }}>↔️ Move Building</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Alert.alert("Sell Building?", `Sell ${BUILDINGS[b.type].name} for ${sellPrice} coins?`, [
                            { text: "Cancel", style: "cancel" },
                            { text: "Sell", style: "destructive", onPress: () => {
                              saveMap({ ...map, buildings: map.buildings.filter(x => x.id !== b.id) });
                              addCoins(sellPrice);
                              setSelectedTile(null);
                            }},
                          ]);
                        }}
                        style={{ padding: 10, backgroundColor: "#FEF3C7", borderRadius: 10, alignItems: "center", marginBottom: 8 }}
                      >
                        <Text style={{ color: "#92400E", fontWeight: "700" }}>💰 Sell for {sellPrice}</Text>
                      </Pressable>
                    </>
                  );
                }
                return null;
              })()}
              <Pressable
                onPress={() => {
                  const b = buildingAt(selectedTile.x, selectedTile.y);
                  const d = decorationAt(selectedTile.x, selectedTile.y);
                  const r = roadAt(selectedTile.x, selectedTile.y);
                  if (b && !isBuildingOrigin(b, selectedTile.x, selectedTile.y)) return;
                  if (d) {
                    saveMap({ ...map, decorations: map.decorations.filter(x => x.id !== d.id) });
                    setSelectedTile(null);
                  } else if (r) {
                    if (isCityStreet(r)) {
                      Alert.alert("City Street", "City streets are permanent infrastructure and can't be removed.");
                      return;
                    }
                    saveMap({ ...map, roads: (map.roads || []).filter(x => x.id !== r.id) });
                    setSelectedTile(null);
                  } else if (b) {
                    Alert.alert("Remove Building?", `Remove ${BUILDINGS[b.type].name}? (No refund)`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Remove", style: "destructive", onPress: () => {
                        saveMap({ ...map, buildings: map.buildings.filter(x => x.id !== b.id) });
                        setSelectedTile(null);
                      }},
                    ]);
                  }
                }}
                style={{ padding: 10, backgroundColor: "#FEE2E2", borderRadius: 10, alignItems: "center", marginBottom: 8 }}
              >
                <Text style={{ color: "#DC2626", fontWeight: "700" }}>🗑️ Remove</Text>
              </Pressable>
            </>
          )}
          <Pressable
            onPress={handlePlaceRoad}
            style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
          >
            <Text style={{ fontSize: 24 }}>🛣️</Text>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ fontWeight: "600", color: pt.text }}>Road</Text>
              <Text style={{ fontSize: 12, color: pt.subtext }}>Connect buildings for earning multiplier</Text>
            </View>
            <Text style={{ fontWeight: "700", color: "#22C55E" }}>FREE</Text>
          </Pressable>
          {availableBuildings.map((type) => {
            const def = BUILDINGS[type];
            const affordable = coins.balance >= def.cost;
            return (
              <Pressable
                key={type}
                onPress={() => handleBuild(type)}
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, opacity: affordable ? 1 : 0.5 }}
              >
                <BuildingArt type={type} size={32} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={{ fontWeight: "600", color: pt.text }}>{def.name}</Text>
                  <Text style={{ fontSize: 12, color: pt.subtext }}>{def.description}</Text>
                </View>
                <Text style={{ fontWeight: "700", color: pt.text }}>🪙{def.cost}</Text>
              </Pressable>
            );
          })}
          {ownedDecorations.length > 0 && (
            <>
              <Text style={{ fontWeight: "700", marginTop: 12, marginBottom: 8, color: pt.text }}>Decorations (owned)</Text>
              {ownedDecorations.map((type) => {
                const def = DECORATIONS[type];
                // Check if already placed
                const alreadyPlaced = map.decorations.some(d => d.type === type);
                if (alreadyPlaced) return null;
                return (
                  <Pressable
                    key={type}
                    onPress={() => handlePlaceDecoration(type)}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
                  >
                    <Text style={{ fontSize: 24 }}>{def.icon}</Text>
                    <Text style={{ marginLeft: 10, flex: 1, fontWeight: "600", color: pt.text }}>{def.name}</Text>
                    <Text style={{ color: "#22C55E", fontWeight: "600" }}>Place</Text>
                  </Pressable>
                );
              })}
            </>
          )}
          <Pressable onPress={() => setSelectedTile(null)} style={{ marginTop: 8, alignItems: "center" }}>
            <Text style={{ color: pt.subtext }}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {/* Missions modal */}
      {missionsVisible && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 }}>
          <View style={{ backgroundColor: pt.card, borderRadius: 16, padding: 16, width: "100%", maxHeight: "80%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: "800", flex: 1, color: pt.text }}>Missions</Text>
              <Pressable onPress={() => setMissionsVisible(false)}>
                <Text style={{ fontSize: 20, color: pt.subtext }}>✕</Text>
              </Pressable>
            </View>
            <ScrollView>
              {missions.filter((m) => !m.completed).length === 0 && (
                <Text style={{ color: pt.subtext, textAlign: "center", paddingVertical: 16 }}>
                  No missions right now. Check back tomorrow!
                </Text>
              )}
              {missions.filter((m) => !m.completed).map((m) => (
                <View key={m.id} style={{ backgroundColor: pt.bg, borderRadius: 12, padding: 12, marginBottom: 10 }}>
                  <Text style={{ fontWeight: "700", fontSize: 15, color: pt.text }}>{m.title}</Text>
                  <Text style={{ fontSize: 13, color: pt.subtext, marginTop: 4 }}>{m.description}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                    <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                      {m.rewardCoins > 0 && (
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "#B45309" }}>🪙 {m.rewardCoins}</Text>
                      )}
                      {m.rewardXP > 0 && (
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "#7C3AED" }}>⚡ {m.rewardXP} XP</Text>
                      )}
                    </View>
                    <Pressable
                      onPress={async () => {
                        const next = await completeMission(m.id);
                        setMissions(next);
                        // Refresh coin display
                        try {
                          const coinsRaw = await AsyncStorage.getItem(COINS_STORAGE_KEY);
                          setCoins(parseCoins(coinsRaw ? JSON.parse(coinsRaw) : {}));
                        } catch {}
                      }}
                      style={{ backgroundColor: "#22C55E", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}
                    >
                      <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Done</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              {missions.filter((m) => m.completed).length > 0 && (
                <>
                  <Text style={{ fontWeight: "700", fontSize: 13, color: "#9CA3AF", marginTop: 4, marginBottom: 8 }}>
                    Completed
                  </Text>
                  {missions.filter((m) => m.completed).map((m) => (
                    <View key={m.id} style={{ paddingVertical: 6, opacity: 0.5 }}>
                      <Text style={{ fontSize: 13, textDecorationLine: "line-through" }}>{m.title}</Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Building popup modal — replaces Alert (Android cuts off 4+ buttons) */}
      <Modal
        visible={popupBuilding !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPopupBuilding(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }}
          onPress={() => setPopupBuilding(null)}
        >
          <Pressable
            style={{ backgroundColor: pt.card, borderRadius: 16, padding: 20, width: "100%", maxWidth: 340 }}
            onPress={(e) => e.stopPropagation()}
          >
            {(() => {
              const b = popupBuilding;
              if (!b) return null;
              const def = BUILDINGS[b.type];
              const level = b.level || 1;
              const maxLv = maxLevelFor(b.type);
              const isMax = level >= maxLv;
              const nextLevel = Math.min(level + 1, maxLv) as 1 | 2 | 3 | 4 | 5;
              // Check if upgrade footprint fits
              let fits = true;
              if (!isMax) {
                const { w, h } = buildingFootprint(nextLevel, b.type, hasFixedFootprint(b));
                for (let dx = 0; dx < w && fits; dx++) {
                  for (let dy = 0; dy < h && fits; dy++) {
                    const nx = b.x + dx, ny = b.y + dy;
                    if (nx >= TOWN_GRID_SIZE || ny >= TOWN_GRID_SIZE) { fits = false; break; }
                    const other = buildingAt(nx, ny);
                    if (other && other.id !== b.id) { fits = false; break; }
                    if (decorationAt(nx, ny) || roadAt(nx, ny)) { fits = false; break; }
                  }
                }
              }
              const canUpgrade = !isMax && fits;
              const upgradeCost = !isMax ? upgradeCostFor(b.type, nextLevel) : 0;
              const sellPrice = Math.floor(def.cost * 0.5);
              const workerCount = b.workers || 0;
              const preview = { ...b, level: nextLevel };

              const doUpgrade = () => {
                if (coinsRef.current.balance < upgradeCost) {
                  Alert.alert("Not enough coins", `You need ${upgradeCost} coins. You have ${Math.floor(coins.balance)}.`);
                  return;
                }
                const updated = map.buildings.map(x => x.id === b.id ? { ...x, level: nextLevel } : x);
                saveMap({ ...map, buildings: updated });
                addCoins(-upgradeCost);
                setPopupBuilding(null);
              };
              const doMove = () => {
                setPopupBuilding(null);
                setMovingBuilding(b);
                Alert.alert("Move Mode", `Moving ${def.name}. Tap a new location.`, [
                  { text: "Cancel", style: "cancel", onPress: () => setMovingBuilding(null) },
                  { text: "OK" },
                ]);
              };
              const doSell = () => {
                Alert.alert("Sell Building?", `Sell ${def.name} for ${sellPrice} coins?`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Sell", style: "destructive", onPress: () => {
                    saveMap({ ...map, buildings: map.buildings.filter(x => x.id !== b.id) });
                    addCoins(sellPrice);
                    setPopupBuilding(null);
                  }},
                ]);
              };
              const doHireWorker = () => {
                const earns = effectiveIncomeFor(b) > 0 || xpIncomeFor(b.type, b.level || 1) > 0;
                if (!earns) {
                  Alert.alert("No income", "Workers only help buildings that earn coins or XP.");
                  return;
                }
                if (workerCount >= MAX_WORKERS_PER_BUILDING) {
                  Alert.alert("Full crew", "This building already has the maximum workers.");
                  return;
                }
                const available = countHometownNpcs(prayedToday) - totalHiredWorkers(town);
                if (available <= 0) {
                  Alert.alert("No workers available", "Pray for more people today to grow your workforce.");
                  return;
                }
                if (coinsRef.current.balance < WORKER_HIRE_COST) {
                  Alert.alert("Not enough coins", `Hiring costs ${WORKER_HIRE_COST} coins. You have ${Math.floor(coins.balance)}.`);
                  return;
                }
                const updated = map.buildings.map(x =>
                  x.id === b.id ? { ...x, workers: (x.workers || 0) + 1 } : x
                );
                saveMap({ ...map, buildings: updated });
                addCoins(-WORKER_HIRE_COST);
                setPopupBuilding({ ...b, workers: workerCount + 1 });
              };

              return (
                <>
                  <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 8, color: pt.text }}>
                    {b.type === "house" ? houseNameFor(level) : b.type === "church" ? churchNameFor(level) : def.name} (Lv {level})
                  </Text>
                  <Text style={{ fontSize: 14, color: pt.subtext, marginBottom: 4 }}>
                    {def.description}
                  </Text>
                  <Text style={{ fontSize: 14, color: pt.subtext, marginBottom: 4 }}>
                    Currently earns {incomeLabelFor(b)}.
                  </Text>
                  {effectiveIncomeFor(b) > 0 && (() => {
                    const cap = buildingStorageCap(b);
                    const stored = b.accumulated || 0;
                    const pct = Math.min(1, stored / cap);
                    const isFull = isBuildingStorageFull(b);
                    return (
                      <View style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                          <Text style={{ fontSize: 13, color: pt.subtext, fontWeight: "600" }}>
                            Storage: {stored.toFixed(2)}/{cap}
                          </Text>
                          {isFull && (
                            <View style={{ marginLeft: 8, backgroundColor: "#DC2626", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, fontWeight: "800", color: "#FFFFFF" }}>FULL</Text>
                            </View>
                          )}
                        </View>
                        <View style={{ height: 6, backgroundColor: pt.bg, borderRadius: 3, overflow: "hidden" }}>
                          <View
                            style={{
                              height: 6,
                              width: `${pct * 100}%`,
                              backgroundColor: isFull ? "#DC2626" : "#F59E0B",
                              borderRadius: 3,
                            }}
                          />
                        </View>
                        {!isMax && (
                          <Text style={{ fontSize: 12, color: pt.subtext, marginTop: 4 }}>
                            Upgrade to Lv {nextLevel} for {buildingStorageCap(preview)} storage
                          </Text>
                        )}
                      </View>
                    );
                  })()}
                  {b.type === "church" ? (
                    <Text style={{ fontSize: 14, color: pt.subtext, marginBottom: 16 }}>
                      🙏 {prayedToday} prayed for today (+{prayedToday * CHURCH_PRAYER_COINS_PER_HOUR} coins/hour){!isMax ? ` — upgrade to ${churchNameFor(nextLevel)}` : " — a glorious Cathedral!"}
                    </Text>
                  ) : b.type === "house" ? (
                    <Text style={{ fontSize: 14, color: pt.subtext, marginBottom: 16 }}>
                      🏠 A cozy home (legacy — houses have been retired)
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 14, color: pt.subtext, marginBottom: 16 }}>
                      Workers: {workerCount}/{MAX_WORKERS_PER_BUILDING} (+{Math.round(workerCount * 10)}% output)
                    </Text>
                  )}
                  {!isMax && !fits && (
                    <Text style={{ fontSize: 14, color: "#DC2626", marginBottom: 16 }}>
                      Not enough space to expand! Clear adjacent tiles.
                    </Text>
                  )}
                  {isMax && (
                    <Text style={{ fontSize: 14, color: "#059669", marginBottom: 16, fontWeight: "600" }}>
                      Max level!
                    </Text>
                  )}
                  {canUpgrade && (
                    <Pressable
                      onPress={doUpgrade}
                      style={{ backgroundColor: "#7C5CFF", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 10 }}
                    >
                      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
                        ⬆️ Upgrade to {b.type === "house" ? houseNameFor(nextLevel) : b.type === "church" ? churchNameFor(nextLevel) : `Lv ${nextLevel}`} 🪙{upgradeCost}
                      </Text>
                      <Text style={{ color: "#E9E4FF", fontSize: 12, marginTop: 2 }}>
                        {incomeLabelFor(preview)}
                      </Text>
                    </Pressable>
                  )}
                  {b.type !== "house" && (
                    <Pressable
                      onPress={doHireWorker}
                      style={{ backgroundColor: pt.bg, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 10 }}
                    >
                      <Text style={{ color: pt.text, fontWeight: "700", fontSize: 16 }}>
                        👷 Hire Worker 🪙{WORKER_HIRE_COST} ({workerCount}/{MAX_WORKERS_PER_BUILDING})
                      </Text>
                    </Pressable>
                  )}
                  {activeMap !== "town" && (
                  <Pressable
                    onPress={doMove}
                    style={{ backgroundColor: pt.bg, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 10 }}
                  >
                    <Text style={{ color: pt.text, fontWeight: "700", fontSize: 16 }}>↔️ Move</Text>
                  </Pressable>
                  )}
                  {!isTownLotBuilding(b) && (
                  <Pressable
                    onPress={doSell}
                    style={{ backgroundColor: "#FEF2F2", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 10 }}
                  >
                    <Text style={{ color: "#DC2626", fontWeight: "700", fontSize: 16 }}>💰 Sell {sellPrice}</Text>
                  </Pressable>
                  )}
                  <Pressable
                    onPress={() => setPopupBuilding(null)}
                    style={{ borderRadius: 12, paddingVertical: 14, alignItems: "center" }}
                  >
                    <Text style={{ color: pt.subtext, fontWeight: "600", fontSize: 16 }}>Cancel</Text>
                  </Pressable>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
      {/* Villager identity — tap a light to see who walks with you */}
      <Modal
        visible={prayerVillagerInfo !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPrayerVillagerInfo(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }}
          onPress={() => setPrayerVillagerInfo(null)}
        >
          <Pressable
            style={{ backgroundColor: pt.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, alignItems: "center" }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* little golden light */}
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#FBBF24",
                  opacity: 0.25,
                  position: "absolute",
                  top: -8,
                }}
              />
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#FBBF24", alignItems: "center", justifyContent: "center" }}>
                <View style={{ flexDirection: "row", gap: 3 }}>
                  <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#1F2937" }} />
                  <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#1F2937" }} />
                </View>
              </View>
              <View
                style={{
                  width: 22,
                  height: 16,
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                  borderBottomLeftRadius: 4,
                  borderBottomRightRadius: 4,
                  backgroundColor: "#FBBF24",
                  marginTop: 1,
                }}
              />
            </View>
            <Text style={{ color: pt.text, fontSize: 20, fontWeight: "800", marginTop: 12, textAlign: "center" }}>
              {prayerVillagerInfo?.name}
            </Text>
            <Text style={{ color: "#B45309", fontSize: 14, fontWeight: "600", marginTop: 6 }}>
              🕯️ Lit candle — prayed for today
            </Text>
            <Text style={{ color: pt.subtext, fontSize: 14, marginTop: 8, textAlign: "center" }}>
              Walking with you in Hometown
            </Text>
            <Pressable
              onPress={() => setPrayerVillagerInfo(null)}
              style={{ marginTop: 16, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, backgroundColor: "#F59E0B" }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
