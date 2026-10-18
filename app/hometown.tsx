import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Path, Circle, Ellipse, Rect, Line } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  BUILDINGS,
  DECORATIONS,
  COINS_STORAGE_KEY,  TOWN_GRID_SIZE,
  TOWN_GRID_W, TOWN_GRID_H, mapGridSize,
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
  LIGHT_TAP_KEY,
  LIGHT_TAP_COOLDOWN_MS,
  LIGHT_TAP_COINS,
  parseLightTaps,
  canThankLight,
  PRAYER_BONUS_KEY,
  PRAYER_COIN_BONUSES,
  parsePrayerBonus,
  WORK_SHIFT_KEY,
  WORK_SHIFT_COOLDOWN_MS,
  WORK_SHIFT_TAPS_PER_COIN,
  WORK_SHIFT_MAX_COINS,
  WORK_SHIFT_DURATION_MS,
  parseWorkShifts,
  canWorkShift,
  FAST_DAY_COIN_KEY,
  FAST_DAY_COINS,
  parseFastDayCoins,
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
  loadWell,
  saveWell,
  emptyWell,
  recordWellDraw,
  localDateStr,
  wellDrawnOn,
  type WellState,
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
  BANQUET_GATHER_CAPS,
  BANQUET_FELLOWSHIP_RATES,
  findBanquetTable,
  TREE_OF_LIFE_TILE,
  TREE_FRUIT_COINS,
  emptyTreeOfLife,
  loadTreeOfLife,
  saveTreeOfLife,
  treeVerseForDate,
  type TreeOfLifeState,
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
  emptyMissions,
  loadMissions as loadFieldMissions,
  saveMissions as saveFieldMissions,
  pruneMissions,
  rollMissionBlessing,
  MISSION_DURATIONS,
  MAX_ACTIVE_MISSIONS,
  missionStatus,
  type FieldMission,
  type MissionDurationId,
} from "@/lib/hometown";
import { refreshHouseBonusCache } from "@/lib/pawn-house";
import { isEnterableRestaurant, restaurantInteriorBonus } from "@/lib/restaurant-interior";
import { getTodayISOString } from "@/lib/prayercircle-data";
import { MONUMENT_STORAGE_KEY, MONUMENT_DESIGNS, parseMonuments } from "@/lib/monuments";
import { getCachedBoosts, refreshGearBoostCache } from "@/lib/gear";
import { awardCustomXP } from "@/lib/xp-engine";
import { generateDailyMissions, loadMissions, completeMission, pendingMissions, type Mission } from "@/lib/missions";
import {
  loadVillagerMissionState,
  saveVillagerMissionState,
  spawnDueVillagerMissions,
  completeVillagerMission,
  setVillagerMissionStatus,
  activeVillagerMissions,
  findVillagerTargetBuilding,
  villagerMissionDateKey,
  type VillagerMission,
  type VillagerMissionKind,
  type VillagerMissionState,
  type VillagerMissionAvailability,
} from "@/lib/villager-missions";
import { refreshStatBoostCache, getCachedStatBoosts } from "@/lib/character-stats";
import { SeasonalBorder } from "@/components/seasonal-border";
import { MapSigns } from "@/components/map-signs";
import { MissionField } from "@/components/mission-field";
import { getTimeOfDay, PAGE_THEMES, type TimeOfDay } from "@/lib/daynight";
import { TownNPCs, CityNPCs, countHometownNpcs, type LightInfo } from "@/components/town-npcs";
import { CityTraffic } from "@/components/city-traffic";
import { GardenOfRemembrance } from "@/components/garden-of-remembrance";
import { TheWell } from "@/components/the-well";

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
      // L1 Chapel — small white chapel with steeple and cross.
      // L2 Church — warm community church: glowing amber windows, front porch, welcome sign.
      // L3 Community Church — fellowship hall wing, glowing windows with people silhouettes
      // inside, open double doors spilling warm light, string lights at the entrance.
      const isCommunity = lv >= 3;
      const isChurch = lv >= 2;
      const bodyW = isCommunity ? 0.62 : isChurch ? 0.85 : 0.75;
      const bodyH = isCommunity ? 0.58 : isChurch ? 0.55 : 0.48;
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          {/* Warm halo — the light of a gathering place (L2/L3) */}
          {isChurch && (
            <View style={{
              position: "absolute", bottom: s * 0.02,
              width: s * (isCommunity ? 1.02 : 0.9), height: s * 0.68,
              backgroundColor: "#FDE68A", opacity: 0.22, borderRadius: s * 0.5,
            }} />
          )}
          {/* Main body */}
          <View style={{
            width: s * bodyW, height: s * bodyH,
            backgroundColor: "#FFFBEB", borderRadius: 4,
            borderWidth: 2, borderColor: "#D6C79A",
            alignItems: "center", justifyContent: "center",
          }}>
            {/* Windows — warm amber glow at L2/L3, like light from inside */}
            <View style={{ flexDirection: "row" }}>
              {(isCommunity ? [0, 1, 2] : isChurch ? [0, 1] : [0]).map(i => (
                <View key={i} style={{
                  width: s * 0.13, height: s * 0.22, marginHorizontal: 3,
                  backgroundColor: isChurch ? "#FCD34D" : (i % 2 === 0 ? "#93C5FD" : "#C4B5FD"),
                  borderTopLeftRadius: s * 0.065, borderTopRightRadius: s * 0.065,
                  borderWidth: 1, borderColor: "#92400E",
                  alignItems: "center", justifyContent: "flex-end", overflow: "hidden",
                }}>
                  {/* People silhouettes gathered inside (L3) */}
                  {isCommunity && (
                    <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 2 }}>
                      <View style={{ width: s * 0.035, height: s * 0.07, backgroundColor: "#78350F", borderRadius: s * 0.018, marginRight: 1 }} />
                      <View style={{ width: s * 0.035, height: s * 0.09, backgroundColor: "#92400E", borderRadius: s * 0.018 }} />
                    </View>
                  )}
                </View>
              ))}
            </View>
            {/* Doors — L2/L3: double doors, slightly open with warm light spilling out */}
            {isChurch ? (
              <View style={{
                position: "absolute", bottom: 0,
                width: s * 0.24, height: s * 0.3,
                flexDirection: "row",
                borderTopLeftRadius: s * 0.06, borderTopRightRadius: s * 0.06,
                overflow: "hidden",
                borderWidth: 2, borderBottomWidth: 0, borderColor: "#78350F",
              }}>
                <View style={{ flex: 1, backgroundColor: "#78350F" }} />
                <View style={{ width: s * 0.05, backgroundColor: "#FDE68A" }} />
                <View style={{ flex: 1, backgroundColor: "#92400E" }} />
              </View>
            ) : (
              <View style={{
                position: "absolute", bottom: 0,
                width: s * 0.16, height: s * 0.24,
                backgroundColor: "#78350F",
                borderTopLeftRadius: s * 0.08, borderTopRightRadius: s * 0.08,
              }} />
            )}
          </View>
          {/* Roof */}
          <View style={{
            position: "absolute", bottom: s * bodyH,
            width: 0, height: 0,
            borderLeftWidth: s * bodyW / 2, borderRightWidth: s * bodyW / 2,
            borderBottomWidth: s * 0.22,
            borderLeftColor: "transparent", borderRightColor: "transparent",
            borderBottomColor: "#92400E",
          }} />
          {/* L2: front porch — columns + little roof over the doors, welcome sign out front */}
          {isChurch && !isCommunity && (
            <>
              <View style={{ position: "absolute", bottom: 0, left: "50%", marginLeft: -s * 0.19, width: s * 0.05, height: s * 0.34, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#D6C79A" }} />
              <View style={{ position: "absolute", bottom: 0, left: "50%", marginLeft: s * 0.14, width: s * 0.05, height: s * 0.34, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#D6C79A" }} />
              <View style={{
                position: "absolute", bottom: s * 0.34, left: "50%", marginLeft: -s * 0.22,
                width: 0, height: 0,
                borderLeftWidth: s * 0.22, borderRightWidth: s * 0.22,
                borderBottomWidth: s * 0.12,
                borderLeftColor: "transparent", borderRightColor: "transparent",
                borderBottomColor: "#92400E",
              }} />
              {/* Welcome sign */}
              <View style={{ position: "absolute", bottom: 0, left: s * 0.045, width: s * 0.03, height: s * 0.22, backgroundColor: "#78350F" }} />
              <View style={{ position: "absolute", bottom: s * 0.2, left: -s * 0.015, width: s * 0.15, height: s * 0.12, backgroundColor: "#FFFBEB", borderWidth: 1.5, borderColor: "#78350F", borderRadius: 3, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: s * 0.1, height: 3, backgroundColor: "#F59E0B", borderRadius: 2, marginBottom: 2 }} />
                <View style={{ width: s * 0.07, height: 3, backgroundColor: "#FCD34D", borderRadius: 2 }} />
              </View>
            </>
          )}
          {/* L3: fellowship hall wing + entrance canopy with string lights */}
          {isCommunity && (
            <>
              <View style={{ position: "absolute", bottom: 0, right: s * 0.02, width: s * 0.3, height: s * 0.4, backgroundColor: "#FFFBEB", borderWidth: 2, borderColor: "#D6C79A", borderRadius: 3, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: s * 0.1, height: s * 0.14, backgroundColor: "#FCD34D", borderTopLeftRadius: s * 0.05, borderTopRightRadius: s * 0.05, borderWidth: 1, borderColor: "#92400E" }} />
              </View>
              <View style={{
                position: "absolute", bottom: s * 0.4, right: s * 0.02,
                width: 0, height: 0,
                borderLeftWidth: s * 0.15, borderRightWidth: s * 0.15,
                borderBottomWidth: s * 0.1,
                borderLeftColor: "transparent", borderRightColor: "transparent",
                borderBottomColor: "#92400E",
              }} />
              {/* Entrance canopy with string lights */}
              <View style={{ position: "absolute", bottom: s * 0.28, alignItems: "center" }}>
                <View style={{ width: s * 0.34, height: s * 0.05, backgroundColor: "#92400E", borderRadius: 3 }} />
                <View style={{ flexDirection: "row", marginTop: 1 }}>
                  {[0, 1, 2, 3, 4].map(i => (
                    <View key={i} style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FDE68A", marginHorizontal: s * 0.025, borderWidth: 1, borderColor: "#F59E0B" }} />
                  ))}
                </View>
              </View>
            </>
          )}
          {/* Single steeple with cross — a humble spire, not twin cathedral towers */}
          <>
            <View style={{ position: "absolute", bottom: s * (bodyH + 0.17), width: s * 0.18, height: s * 0.28, backgroundColor: "#FFFBEB", borderWidth: 2, borderColor: "#D6C79A", borderRadius: 2 }} />
            <View style={{ position: "absolute", bottom: s * (bodyH + 0.43), width: 0, height: 0, borderLeftWidth: s * 0.09, borderRightWidth: s * 0.09, borderBottomWidth: s * 0.15, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#92400E" }} />
            {/* Cross */}
            <View style={{ position: "absolute", bottom: s * (bodyH + 0.55), left: s * 0.485, width: s * 0.03, height: s * 0.1, backgroundColor: "#FBBF24" }} />
            <View style={{ position: "absolute", bottom: s * (bodyH + 0.59), left: s * 0.45, width: s * 0.1, height: s * 0.03, backgroundColor: "#FBBF24" }} />
          </>
          {/* Prayer lights: glowing figures gathered around the church */}
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
    case "banquet-table": {
      // The Marriage Supper — one long table under open sky, candles lit,
      // benches waiting for the whole town. Grander with level.
      const candles: number = lv >= 3 ? 5 : lv >= 2 ? 4 : 3;
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          {/* warm hearth-glow behind the table */}
          <View pointerEvents="none" style={{ position: "absolute", bottom: s * 0.02, width: s * 0.98, height: s * 0.6, backgroundColor: "#FBBF24", opacity: 0.16, borderRadius: s * 0.2 }} />
          <Svg width={s} height={s * 0.72} viewBox="0 0 80 58">
            {/* back bench */}
            <Rect x={10} y={12} width={60} height={6} rx={3} fill="#92400E" />
            {/* table */}
            <Rect x={6} y={22} width={68} height={17} rx={4} fill="#B45309" />
            <Rect x={6} y={22} width={68} height={5} rx={2.5} fill="#D97706" />
            {/* cloth runner */}
            <Rect x={6} y={29} width={68} height={7} fill="#FEF3C7" opacity={0.9} />
            {/* plates */}
            {[17, 31, 45, 59].map((px) => (
              <Ellipse key={px} cx={px} cy={32.5} rx={5} ry={3.4} fill="#FFFFFF" stroke="#D6A85C" strokeWidth={1} />
            ))}
            {/* candles */}
            {Array.from({ length: candles }).map((_, i) => {
              const cx = candles === 1 ? 40 : 15 + (i * 50) / (candles - 1);
              return (
                <React.Fragment key={i}>
                  <Rect x={cx - 1.6} y={16} width={3.2} height={9} rx={1.6} fill="#FFF7ED" />
                  <Ellipse cx={cx} cy={13} rx={2.3} ry={3.4} fill="#FBBF24" />
                  <Ellipse cx={cx} cy={14} rx={1.1} ry={1.9} fill="#FEF3C7" />
                </React.Fragment>
              );
            })}
            {/* front bench */}
            <Rect x={10} y={46} width={60} height={6} rx={3} fill="#92400E" />
            <Rect x={14} y={52} width={5} height={5} fill="#78350F" />
            <Rect x={61} y={52} width={5} height={5} fill="#78350F" />
          </Svg>
        </View>
      );
    }
    default:
      return <View style={{ width: s * 0.7, height: s * 0.7, backgroundColor: "#9CA3AF", borderRadius: 8 }} />;
  }
}

/** Animated SVG primitives (for shimmer/glow loops inside Svg). */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

/** Small SVG table glyph for the Marriage Supper (no emoji — drawn, not typed). */
function BanquetGlyph({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={5} width={18} height={2.4} rx={1.2} fill="#92400E" />
      <Rect x={2} y={9} width={20} height={6} rx={2} fill="#B45309" />
      <Rect x={2} y={11.5} width={20} height={2.6} fill="#FEF3C7" opacity={0.9} />
      <Ellipse cx={7.5} cy={12.8} rx={2} ry={1.3} fill="#FFFFFF" />
      <Ellipse cx={16.5} cy={12.8} rx={2} ry={1.3} fill="#FFFFFF" />
      <Rect x={3} y={17} width={18} height={2.4} rx={1.2} fill="#92400E" />
      <Ellipse cx={12} cy={7} rx={1.4} ry={2} fill="#FBBF24" />
    </Svg>
  );
}

/** The River of Life — crystal water along the town's north edge (Rev 22:1).
 * Purely visual: clear ethereal waves with glinting sparkles. */
function RiverOfLife({ cellSize }: { cellSize: number }) {
  const glint = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glint, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glint, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glint]);
  const sparkleOpacity = glint.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] });
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: -12,
        left: 0,
        width: TOWN_GRID_SIZE * cellSize,
        flexDirection: "row",
        justifyContent: "space-around",
        opacity: 0.9,
      }}
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <Svg key={i} width={30} height={20} viewBox="0 0 30 20">
          <Path
            d="M0 8 Q7.5 1 15 8 T30 8"
            fill="none"
            stroke="#BAE6FD"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Path
            d="M0 14 Q7.5 7 15 14 T30 14"
            fill="none"
            stroke="#E0F2FE"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.8}
          />
          <AnimatedCircle cx={8 + (i % 3) * 7} cy={5} r={1.6} fill="#FFFFFF" opacity={sparkleOpacity} />
        </Svg>
      ))}
    </View>
  );
}

/** The Tree of Life — a fixed landmark on the town map. Leaves shimmer by
 * day; a soft golden glow surrounds it at night. Tappable. */
function TreeOfLife({
  cellSize,
  timeOfDay,
  onPress,
}: {
  cellSize: number;
  timeOfDay: string;
  onPress: () => void;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);
  const highlightOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.95] });
  const nightGlow = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.3] });
  const night = timeOfDay === "night";
  // Centered on the plaza gap between church and pawn house (tile x=5, rows 0-1).
  const W = 92;
  const H = 148;
  const left = (TREE_OF_LIFE_TILE.x + 0.5) * cellSize - W / 2;
  const top = (TREE_OF_LIFE_TILE.y + 1) * cellSize - H + 8;
  // Twelve fruits — "twelve manner of fruits" (Rev 22:2)
  const fruits: Array<[number, number]> = [
    [30, 52], [46, 40], [62, 52], [24, 68], [40, 62], [54, 66],
    [68, 68], [32, 84], [50, 80], [62, 86], [42, 94], [56, 96],
  ];
  return (
    <Pressable
      onPress={onPress}
      style={{ position: "absolute", left, top, width: W, height: H }}
      accessibilityLabel="The Tree of Life"
    >
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {night && (
          <AnimatedCircle cx={W / 2} cy={58} r={52} fill="#FBBF24" opacity={nightGlow} />
        )}
        {/* trunk */}
        <Path d={`M${W / 2 - 7} ${H} C ${W / 2 - 9} 118, ${W / 2 - 6} 108, ${W / 2 - 4} 96 L ${W / 2 + 4} 96 C ${W / 2 + 6} 108, ${W / 2 + 9} 118, ${W / 2 + 7} ${H} Z`} fill="#78350F" />
        <Path d={`M${W / 2 - 4} 104 C ${W / 2 - 14} 96, ${W / 2 - 20} 92, ${W / 2 - 26} 88`} stroke="#78350F" strokeWidth={5} strokeLinecap="round" fill="none" />
        <Path d={`M${W / 2 + 4} 100 C ${W / 2 + 14} 92, ${W / 2 + 20} 88, ${W / 2 + 26} 84`} stroke="#78350F" strokeWidth={5} strokeLinecap="round" fill="none" />
        {/* canopy — layered greens */}
        <Ellipse cx={W / 2} cy={58} rx={40} ry={44} fill="#166534" />
        <Ellipse cx={W / 2 - 14} cy={48} rx={24} ry={28} fill="#15803D" />
        <Ellipse cx={W / 2 + 14} cy={50} rx={22} ry={26} fill="#15803D" />
        {/* shimmering highlights */}
        <AnimatedEllipse cx={W / 2 - 12} cy={42} rx={14} ry={16} fill="#4ADE80" opacity={highlightOpacity} />
        <AnimatedEllipse cx={W / 2 + 16} cy={62} rx={10} ry={12} fill="#4ADE80" opacity={highlightOpacity} />
        <AnimatedEllipse cx={W / 2 - 2} cy={76} rx={11} ry={10} fill="#86EFAC" opacity={highlightOpacity} />
        {/* twelve fruits */}
        {fruits.map(([fx, fy], i) => (
          <Circle key={i} cx={fx} cy={fy} r={3.2} fill={i % 3 === 0 ? "#FBBF24" : "#F87171"} stroke="#FFF7ED" strokeWidth={0.8} />
        ))}
      </Svg>
    </Pressable>
  );
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
  // Per-minute income rates cached at mount tick, for the live interval tick.
  const perMinuteRateRef = useRef<Record<string, { coins: number; xp: number }>>({});
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [movingBuilding, setMovingBuilding] = useState<PlacedBuilding | null>(null);
  const [popupBuilding, setPopupBuilding] = useState<PlacedBuilding | null>(null);
  // Gratitude coins — tap a prayer light once per hour
  const [lightTaps, setLightTaps] = useState<Record<string, number>>({});
  const [thankedLight, setThankedLight] = useState(false);
  // Work shifts — rapid-tap mini-game on shops
  const [workShiftBuilding, setWorkShiftBuilding] = useState<PlacedBuilding | null>(null);
  const [workShifts, setWorkShifts] = useState<Record<string, number>>({});
  const [shiftTaps, setShiftTaps] = useState(0);
  const [shiftTimeLeft, setShiftTimeLeft] = useState(0);
  const shiftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Lot purchase modal — replaces Alert (Android Alert caps at ~3 buttons, hiding restaurants)
  const [purchaseLot, setPurchaseLot] = useState<TownLot | null>(null);
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
  const [well, setWell] = useState<WellState>(() => emptyWell());
  // Garden visits: prayer lights paying their respects (+0.1% income/visit, 24h)
  const [gardenVisits, setGardenVisits] = useState<GardenVisitState>(() => emptyGardenVisits());
  // Tree of Life: tap once a day to taste its fruit (+coins, verse of the day)
  const [treeState, setTreeState] = useState<TreeOfLifeState>(() => emptyTreeOfLife());
  const [treeModalVisible, setTreeModalVisible] = useState(false);
  // Mission Field: prayer lights sent out on missions (blessings on return)
  const [fieldMissions, setFieldMissions] = useState<FieldMission[]>(() => emptyMissions());
  // Villager missions: lights with a "?" ask Jonathan for help (2-5/day).
  const [vmState, setVmState] = useState<VillagerMissionState | null>(null);
  const vmStateRef = useRef<VillagerMissionState | null>(null);
  const [villagerMissionModal, setVillagerMissionModal] = useState<VillagerMission | null>(null);
  const [vmCelebration, setVmCelebration] = useState<{ mission: VillagerMission } | null>(null);
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

  // Refs for the villager-mission spawn checks (init + live tick).
  const townRef = useRef(town);
  townRef.current = town;
  const lightInfosRef = useRef(lightInfos);
  lightInfosRef.current = lightInfos;
  const unlockedMapsRef = useRef(unlockedMaps);
  unlockedMapsRef.current = unlockedMaps;
  const fieldMissionsRef = useRef(fieldMissions);
  fieldMissionsRef.current = fieldMissions;

  /** Lights eligible for a villager request (not away on a field mission). */
  const eligibleVmLights = useCallback(() => {
    const away = new Set(
      fieldMissionsRef.current.filter((m) => !m.collected).map((m) => m.personId)
    );
    return lightInfosRef.current.filter((l) => !away.has(l.personId));
  }, []);

  /** Spawn any villager-mission slots that have passed. Idempotent. */
  const runVillagerMissionSpawn = useCallback(async () => {
    const st = vmStateRef.current;
    const townState = townRef.current;
    if (!st || !townState) return;
    const nowMs = Date.now();
    const dateKey = villagerMissionDateKey();
    const townMap = townState.maps.town;
    const buildings = townMap?.buildings ?? [];
    const unlocked = unlockedMapsRef.current;
    const availability: VillagerMissionAvailability = {
      church: buildings.some((b) => b.type === "church"),
      barbershop: buildings.some((b) => b.type === "barbershop"),
      restaurant: buildings.some((b) => isRestaurantType(b.type)),
      garden: unlocked.includes("mall"),
      bank: buildings.some((b) => b.type === "bank" || b.type === "bank-tower"),
      well: true,
    };
    const res = spawnDueVillagerMissions({
      state: st,
      nowMs,
      dateKey,
      lights: eligibleVmLights(),
      availability,
    });
    if (
      res.spawned.length > 0 ||
      res.state.spawnedSlots.length !== st.spawnedSlots.length ||
      res.state.dateKey !== st.dateKey
    ) {
      vmStateRef.current = res.state;
      setVmState(res.state);
      await saveVillagerMissionState(res.state);
    }
  }, [eligibleVmLights]);

  // Load villager-mission state once lights are ready, then check for due spawns.
  useEffect(() => {
    if (vmStateRef.current || lightInfos.length === 0) return;
    (async () => {
      const st = await loadVillagerMissionState();
      vmStateRef.current = st;
      setVmState(st);
      await runVillagerMissionSpawn();
    })().catch(() => undefined);
  }, [lightInfos, runVillagerMissionSpawn]);

  // Garden visitors: 1-2 prayer lights paying their respects this hour
  // (daytime only). Deterministic per hour so they linger while you visit.
  // Lights away on field missions — or busy with a villager request — don't visit.
  const gardenVisitors = useMemo(() => {
    if (timeOfDay === "night") return [];
    const away = new Set(fieldMissions.filter((m) => !m.collected).map((m) => m.personId));
    const vmBusy = new Set(
      (vmState?.missions ?? []).filter((m) => m.status !== "done").map((m) => m.personId)
    );
    const blessed = lightInfos
      .filter((r) => !away.has(r.personId) && !vmBusy.has(r.personId))
      .map((r) => ({ personId: r.personId, name: r.name }));
    return pickGardenVisitors(blessed, gardenVisitHourKey(), false);
  }, [lightInfos, timeOfDay, fieldMissions, vmState]);

  // Villager missions: personIds with a waiting "?" (stand still) and
  // guiding targets (walk straight to the mission building).
  const vmWaitingIds = useMemo(
    () =>
      new Set(
        (vmState?.missions ?? [])
          .filter((m) => m.status === "waiting")
          .map((m) => m.personId)
      ),
    [vmState]
  );
  const vmGuides = useMemo(() => {
    const out: Record<string, { tile: { x: number; y: number }; buildingId: string; type: string }> = {};
    if (!vmState || !town) return out;
    const buildings = town.maps.town?.buildings ?? [];
    for (const m of vmState.missions) {
      if (m.status !== "guiding") continue;
      const b = findVillagerTargetBuilding(m.kind, buildings);
      if (!b) continue;
      const fp = buildingFootprint(b.level || 1, b.type);
      out[m.personId] = {
        tile: { x: b.x + fp.w / 2 - 0.5, y: b.y + fp.h / 2 - 0.5 },
        buildingId: b.id,
        type: b.type,
      };
    }
    return out;
  }, [vmState, town]);

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
  /** Refresh the coin chip from storage (after mission rewards land). */
  const refreshCoins = useCallback(async () => {
    try {
      const coinsRaw = await AsyncStorage.getItem(COINS_STORAGE_KEY);
      setCoins(parseCoins(coinsRaw ? JSON.parse(coinsRaw) : {}));
    } catch {}
  }, []);

  /** Jonathan taps "Help" on a villager request — the light heads to its target. */
  const helpVillagerMission = useCallback(async (mission: VillagerMission) => {
    const st = vmStateRef.current;
    const townState = townRef.current;
    if (!st || !townState) return;
    // On-town targets need their building to still exist.
    if (mission.kind !== "garden" && mission.kind !== "well") {
      const b = findVillagerTargetBuilding(mission.kind, townState.maps.town?.buildings ?? []);
      if (!b) {
        Alert.alert(
          "Not built yet",
          `The ${mission.targetLabel} isn't in town right now — ${mission.personName} will wait.`
        );
        return;
      }
    }
    const next = await setVillagerMissionStatus(st, mission.id, "guiding");
    vmStateRef.current = next;
    setVmState(next);
    setVillagerMissionModal(null);
  }, []);

  /** A guided light arrived at its on-town mission target — complete with reward. */
  const handleVmArrival = useCallback(async (personId: string) => {
    const st = vmStateRef.current;
    if (!st) return;
    const m = st.missions.find((x) => x.personId === personId && x.status === "guiding");
    if (!m) return;
    // Only on-town targets complete on arrival; garden/well complete on map visit.
    if (m.kind === "garden" || m.kind === "well") return;
    const res = await completeVillagerMission(st, m.id);
    vmStateRef.current = res.state;
    setVmState(res.state);
    if (res.mission) {
      setVmCelebration({ mission: res.mission });
      await refreshCoins();
    }
  }, [refreshCoins]);

  // Off-map requests (garden / well): complete when Jonathan visits that map
  // with the mission guiding — the light walks with him there.
  useEffect(() => {
    const st = vmStateRef.current;
    if (!st) return;
    const guiding = st.missions.filter((m) => m.status === "guiding");
    if (guiding.length === 0) return;
    const doneKinds: VillagerMissionKind[] = [];
    if (activeMap === "mall") doneKinds.push("garden");
    if (activeMap === "well") doneKinds.push("well");
    if (doneKinds.length === 0) return;
    (async () => {
      for (const m of guiding) {
        if (!doneKinds.includes(m.kind)) continue;
        const cur = vmStateRef.current;
        if (!cur) continue;
        const target = cur.missions.find((x) => x.id === m.id && x.status === "guiding");
        if (!target) continue;
        const res = await completeVillagerMission(cur, m.id);
        vmStateRef.current = res.state;
        setVmState(res.state);
        if (res.mission) {
          setVmCelebration({ mission: res.mission });
          await refreshCoins();
        }
      }
    })().catch(() => undefined);
  }, [activeMap, refreshCoins]);

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

  /** Draw from the well for today — persists the streak, no coins involved. */
  const handleWellDraw = useCallback(() => {
    const today = localDateStr();
    setWell((prev) => {
      const next = recordWellDraw(prev, today);
      if (next !== prev) saveWell(next);
      return next;
    });
  }, []);

  const handleUnlockMap = useCallback((id: TownMapId) => {
    const info = MAP_INFO[id];
    if (info.comingSoon) {
      Alert.alert(info.name, "This map is coming soon!");
      return;
    }
    if (coinsRef.current.balance < info.unlockCost) {
      Alert.alert("Not enough coins", `Unlocking ${info.name} costs ${info.unlockCost} coins. You have ${coinsRef.current.balance.toFixed(2)}.`);
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
        // The Well state (daily draw date + streak)
        try { setWell(await loadWell()); } catch {}
        // Mission Field state (field missions, pruned of old collected ones)
        try {
          const fm = await loadFieldMissions();
          const pruned = pruneMissions(fm);
          setFieldMissions(pruned);
          if (pruned.length !== fm.length) saveFieldMissions(pruned).catch(() => undefined);
        } catch {}
        setUnlockedMaps(parseUnlockedMaps(unlockedRaw ? JSON.parse(unlockedRaw) : null));
        try { setPurchasedPlots(await loadPurchasedPlots()); } catch {}
        setCoins(c);
        try {
          const lastFrenzy = await AsyncStorage.getItem(FRENZY_STORAGE_KEY);
          lastFrenzyRef.current = lastFrenzy ? parseInt(lastFrenzy, 10) || 0 : 0;
        } catch {}
        try { setMonumentCount(Object.keys(parseMonuments(monumentsRaw ? JSON.parse(monumentsRaw) : {})).length); } catch {}
        try { setOwnedItems(parseOwnedItems(ownedRaw ? JSON.parse(ownedRaw) : [])); } catch {}
        // Gratitude coins + work shifts
        try {
          const tapsRaw = await AsyncStorage.getItem(LIGHT_TAP_KEY);
          setLightTaps(parseLightTaps(tapsRaw ? JSON.parse(tapsRaw) : {}));
        } catch {}
        try {
          const shiftsRaw = await AsyncStorage.getItem(WORK_SHIFT_KEY);
          setWorkShifts(parseWorkShifts(shiftsRaw ? JSON.parse(shiftsRaw) : {}));
        } catch {}

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
        // Preload restaurant interior furniture bonuses (async) for enterable
        // restaurants across all maps. Furniture tiers add % income multipliers.
        const restInteriorMult: Record<string, number> = {};
        try {
          const restIds: string[] = [];
          for (const id of TOWN_MAP_IDS) {
            for (const b of t.maps[id].buildings) {
              if (isEnterableRestaurant(b.type)) restIds.push(b.id);
            }
          }
          const restBonuses = await Promise.all(restIds.map((bid) => restaurantInteriorBonus(bid)));
          restIds.forEach((bid, i) => { restInteriorMult[bid] = restBonuses[i].mult; });
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
        // Daily prayer bonus — thresholds for praying for people
        try {
          const bonusRaw = await AsyncStorage.getItem(PRAYER_BONUS_KEY);
          const bonusState = parsePrayerBonus(bonusRaw ? JSON.parse(bonusRaw) : {});
          if (bonusState.date !== today) {
            bonusState.date = today;
            bonusState.awarded = [];
          }
          for (const { threshold, coins: bonusCoins } of PRAYER_COIN_BONUSES) {
            if (prayedCount >= threshold && !bonusState.awarded.includes(threshold)) {
              bonusState.awarded.push(threshold);
              await AsyncStorage.setItem(PRAYER_BONUS_KEY, JSON.stringify(bonusState));
              // Award via addCoins — but we're in load, use direct storage
              const cRaw = await AsyncStorage.getItem(COINS_STORAGE_KEY);
              const c0 = parseCoins(cRaw ? JSON.parse(cRaw) : {});
              const next = {
                balance: Math.round((c0.balance + bonusCoins) * 10) / 10,
                lifetimeEarned: Math.round((c0.lifetimeEarned + bonusCoins) * 10) / 10,
              };
              await AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next));
              setCoins(next);
              Alert.alert(
                "🙏 Prayer Bonus!",
                `You prayed for ${prayedCount} people today! +${bonusCoins.toFixed(2)} coins.`
              );
            }
          }
          // Save even if no new awards (date rollover)
          await AsyncStorage.setItem(PRAYER_BONUS_KEY, JSON.stringify(bonusState));
        } catch {}
        // Fast day green bonus — 5 coins per newly completed fast day
        try {
          const countedRaw = await AsyncStorage.getItem(FAST_DAY_COIN_KEY);
          const counted = new Set(parseFastDayCoins(countedRaw ? JSON.parse(countedRaw) : []));
          const fasts = fastsRaw ? JSON.parse(fastsRaw) : [];
          let newGreens = 0;
          for (const f of fasts) {
            const fid = String(f.id || f.name || "fast");
            const statuses = f.dayStatuses || {};
            for (const [date, status] of Object.entries(statuses)) {
              if (status === "completed") {
                const key = `${fid}:${date}`;
                if (!counted.has(key)) {
                  counted.add(key);
                  newGreens++;
                }
              }
            }
          }
          if (newGreens > 0) {
            await AsyncStorage.setItem(FAST_DAY_COIN_KEY, JSON.stringify([...counted]));
            const reward = newGreens * FAST_DAY_COINS;
            const cRaw = await AsyncStorage.getItem(COINS_STORAGE_KEY);
            const c0 = parseCoins(cRaw ? JSON.parse(cRaw) : {});
            const next = {
              balance: Math.round((c0.balance + reward) * 10) / 10,
              lifetimeEarned: Math.round((c0.lifetimeEarned + reward) * 10) / 10,
            };
            await AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next));
            setCoins(next);
          }
        } catch {}
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
          // The Marriage Supper: when the whole town gathers as one table,
          // the breaking-bread blessing is richer than any restaurant's.
          const banquet = findBanquetTable(t);
          let capacity = 0;
          let rate = 0;
          if (banquet) {
            capacity = BANQUET_GATHER_CAPS[banquet.level || 1] ?? 40;
            rate = BANQUET_FELLOWSHIP_RATES[banquet.level || 1] ?? 0.012;
          } else {
            const cityBuildings = t.maps.city?.buildings || [];
            capacity = totalGatherCapacity(cityBuildings);
            rate = fellowshipRate(cityBuildings);
          }
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
        // Tree of Life: once-a-day fruit tasting (coins + verse).
        try { setTreeState(await loadTreeOfLife()); } catch {}
        // Garden visits: from time to time, prayer lights visit the Garden
        // of Remembrance to pay their respects (1-2 per hour, daytime only).
        // Each visit blesses the town: +0.1% income for 24h.
        let gardenVisitState = emptyGardenVisits();
        try { gardenVisitState = await loadGardenVisits(); } catch {}
        if (getTimeOfDay() !== "night") {
          const hourKey = gardenVisitHourKey();
          if (!gardenVisitState.slots[hourKey]) {
            const blessedNow = prayedList.map((p) => ({ personId: String(p.id), name: p.name }));
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
        const dripOps: { buildingId: string; minutes: number; basePerHour: number }[] = [];
        for (const id of TOWN_MAP_IDS) {
          const m = newMaps[id];
          const updatedBuildings = m.buildings.map(b => {
            const lastTick = b.lastTick ? new Date(b.lastTick).getTime() : Date.now();
            const minutesElapsed = Math.floor((Date.now() - lastTick) / 60000);
            const earnsCoins = effectiveIncomeFor(b) > 0;
            const earnsXP = xpIncomeFor(b.type, b.level || 1) > 0;
            // Cache per-minute rates for every earning building (even with 0 elapsed,
            // e.g. just placed) so the live interval tick can accrue while watching.
            if ((earnsCoins || earnsXP) && mapHasPopulation(m, t)) {
              const multiplier = roadMultiplierForBuilding(m, b.id);
              const shopBoost = barbershopBoostForBuilding(m, b.id);
              const adjacency = shopAdjacencyBonusForBuilding(m, b.id);
              const ib = interiorBonuses[b.id] ?? { mult: 1, vaultDrips: [], atmDrips: [] };
              const floorMult = b.type === "bank-tower" ? bankFloorMultiplier(b.floors || 1) : 1;
              const wMult = workerMult(b);
              const popMult = populationMult(prayedCount);
              const basePerHour = 2.0 * multiplier * shopBoost * adjacency * ib.mult * floorMult * plotIncomeMult(b) * gearCoinMult * (1 + generosityMult) * wMult * msMult * popMult * prMult * fellowshipBonus * remembranceBonus * gardenVisitBonus * (1 + houseCoinMult) * (restInteriorMult[b.id] ?? 1);
              const churchPerMinute = b.type === "church" && earnsCoins
                ? (CHURCH_PRAYER_COINS_PER_HOUR * prayedCount) / 60
                : 0;
              perMinuteRateRef.current[b.id] = {
                coins: earnsCoins ? basePerHour / 60 + churchPerMinute : 0,
                xp: !earnsCoins && earnsXP ? (xpIncomeFor(b.type, b.level || 1) * wMult) / 24 / 60 : 0,
              };
            }
            if (minutesElapsed > 0 && (earnsCoins || earnsXP) && mapHasPopulation(m, t)) {
              const rate = perMinuteRateRef.current[b.id];
              const perMinuteCoins = rate ? rate.coins : 0;
              const perMinuteXP = rate ? rate.xp : 0;
              const add = earnsCoins
                ? minutesElapsed * perMinuteCoins
                : minutesElapsed * perMinuteXP;
              // ATM & vault bonuses drip as collectible coins inside the bank
              // interior instead of auto-adding to the building total.
              if (earnsCoins && (b.type === "bank" || b.type === "bank-tower")) {
                const ib = interiorBonuses[b.id] ?? { mult: 1, vaultDrips: [], atmDrips: [] };
                if (ib.vaultDrips.length > 0 || ib.atmDrips.length > 0) {
                  // basePerHour needed for vault % — recompute cheaply from cached rate
                  dripOps.push({ buildingId: b.id, minutes: minutesElapsed, basePerHour: perMinuteCoins * 60 });
                }
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
          await Promise.all(dripOps.map((op) => accrueBankDrips(op.buildingId, op.minutes, op.basePerHour)));
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

  // Live tick: every 30s, accrue another slice of minute-by-minute income so the
  // coin badges visibly grow while watching. Uses the per-minute rates cached at
  // mount; the next full open re-syncs everything exactly via lastTick.
  useEffect(() => {
    const id = setInterval(() => {
      // Villager missions arrive through the day — check for newly due slots.
      runVillagerMissionSpawn().catch(() => undefined);
      setTown((prev) => {
        const now = Date.now();
        const newMaps = { ...prev.maps };
        let changed = false;
        for (const mapId of TOWN_MAP_IDS) {
          const m = newMaps[mapId];
          if (!m) continue;
          const updatedBuildings = m.buildings.map((b) => {
            const lastTick = b.lastTick ? new Date(b.lastTick).getTime() : now;
            const minutesElapsed = Math.floor((now - lastTick) / 60000);
            if (minutesElapsed <= 0) return b;
            const rate = perMinuteRateRef.current[b.id];
            const perMin = rate ? rate.coins + rate.xp : 0;
            if (!rate || perMin <= 0) {
              return b.lastTick ? b : { ...b, lastTick: new Date(now).toISOString() };
            }
            changed = true;
            const add = minutesElapsed * perMin;
            return {
              ...b,
              accumulated: Math.round(Math.min(buildingStorageCap(b), (b.accumulated || 0) + add) * 100) / 100,
              lastTick: new Date(now).toISOString(),
            };
          });
          newMaps[mapId] = { ...m, buildings: updatedBuildings };
        }
        if (!changed) return prev;
        const next = { ...prev, maps: newMaps };
        saveTown(next);
        return next;
      });
    }, 30000);
    return () => clearInterval(id);
  }, [runVillagerMissionSpawn]);

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
      Alert.alert("Not enough coins", `${plot.name} costs ${plot.cost} coins. You have ${coins.balance.toFixed(2)}.`);
      return;
    }
    Alert.alert(
      `${plot.name} — FOR SALE`,
      `${def.name}\n${def.description}\n\nPurchase this downtown plot for ${plot.cost.toFixed(2)} coins?`,
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
    if (isRestaurantType(b.type)) {
      enterActions.push({
        text: "🍞 Enter Restaurant",
        onPress: () => router.push(`/restaurant-interior?buildingId=${b.id}`),
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
              Alert.alert("Not enough coins", `You need ${cost} coins. You have ${coins.balance.toFixed(2)}.`);
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
    // Preset lots: the building is fixed — open the modal directly (no tier gate;
    // the preset IS the design, coins are the only gate).
    // If the preset building is already owned, treat the lot as flexible (no duplicate)
    const presetOwned = lot.presetType && map.buildings.some((b) => b.type === lot.presetType);
    if (lot.presetType && !presetOwned) {
      setPurchaseLot(lot);
      return;
    }
    const availableCount = lot.allowedTypes.filter(
      (type) => tier >= BUILDINGS[type].tier && BUILDINGS[type].maps.includes("town")
    ).length;
    if (availableCount === 0) {
      Alert.alert("Locked", "No buildings available for this lot yet. Keep growing your fast streak!");
      return;
    }
    // Open the purchase modal (Alert truncates buttons on Android, hiding restaurants)
    setPurchaseLot(lot);
  };

  /** Actually build on a purchased town lot. Lot + building paid together. */
  const purchaseOnLot = (lot: TownLot, type: BuildingType) => {
    const def = BUILDINGS[type];
    const total = lot.cost + def.cost;
    if (type === "pawn-house" && map.buildings.some((b) => b.type === "pawn-house")) {
      Alert.alert("Already built", "You already have a pawn house!");
      return;
    }
    if (type === "banquet-table" && map.buildings.some((b) => b.type === "banquet-table")) {
      Alert.alert("Already built", "The Marriage Supper is already prepared — one table for the whole town.");
      return;
    }
    if (coinsRef.current.balance < total) {
      Alert.alert("Not enough coins", `${def.name} on ${lot.name} costs ${total.toFixed(2)} coins (lot ${lot.cost.toFixed(2)} + building ${def.cost.toFixed(2)}). You have ${coins.balance.toFixed(2)}.`);
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
    setPurchaseLot(null);
  };

  /** Taste the Tree of Life's fruit — once per day. A quiet blessing. */
  const handleTasteFruit = () => {
    const today = localDateStr();
    if (treeState.lastFruitDate === today) return;
    const next = { lastFruitDate: today };
    setTreeState(next);
    saveTreeOfLife(next).catch(() => undefined);
    addCoins(TREE_FRUIT_COINS);
    setTreeModalVisible(false);
    Alert.alert(
      "The Tree of Life",
      `You taste its fruit — sweet, and full of light. +${TREE_FRUIT_COINS} coins.\n\n"${treeVerseForDate().text}"\n— ${treeVerseForDate().ref}`
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
    } else if (isEnterableRestaurant(b.type)) {
      router.push(`/restaurant-interior?buildingId=${b.id}`);
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
          if (nx >= mapGridSize(activeMap).w || ny >= mapGridSize(activeMap).h) { fits = false; break; }
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
              if (nx >= mapGridSize(activeMap).w || ny >= mapGridSize(activeMap).h) { fits = false; break; }
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
      Alert.alert("Not enough coins", `You need ${def.cost} coins. You have ${coins.balance.toFixed(2)}.`);
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

  /** Collect all accumulated coins/XP from every building on the active map at once. */
  const handleCollectAll = () => {
    const now = Date.now();
    let totalCoins = 0;
    let totalXP = 0;
    const updatedBuildings = map.buildings.map((b) => {
      const acc = b.accumulated || 0;
      if (acc <= 0) return b;
      if (xpIncomeFor(b.type, b.level || 1) > 0) {
        totalXP += Math.max(1, Math.floor(acc));
      } else {
        let amount = acc;
        if (now < frenzyUntilRef.current) amount = Math.round(amount * FRENZY_MULT * 10) / 10;
        totalCoins += amount;
      }
      return { ...b, accumulated: 0, lastTick: new Date().toISOString() };
    });
    if (totalCoins <= 0 && totalXP <= 0) return;
    saveMap({ ...map, buildings: updatedBuildings });
    if (totalXP > 0) {
      awardCustomXP(totalXP, `collect-all-${now}`).catch(() => undefined);
    }
    if (totalCoins > 0) {
      addCoins(Math.round(totalCoins * 100) / 100);
    }
  };

  /** Send a prayer light out on a mission. */
  const handleSendMission = useCallback((personId: string, duration: MissionDurationId) => {
    const def = MISSION_DURATIONS[duration];
    setFieldMissions(prev => {
      const active = prev.filter(m => !m.collected);
      if (active.length >= MAX_ACTIVE_MISSIONS) {
        Alert.alert("Field is full", `You can have up to ${MAX_ACTIVE_MISSIONS} lights out at once. Welcome some home first.`);
        return prev;
      }
      if (active.some(m => m.personId === personId)) return prev; // already out
      const light = lightInfos.find(l => l.personId === personId);
      if (!light) return prev;
      const now = new Date();
      const id = `m${now.getTime().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
      const blessing = rollMissionBlessing(id, duration);
      const mission: FieldMission = {
        id,
        personId: light.personId,
        name: light.name,
        duration,
        sentAt: now.toISOString(),
        returnAt: new Date(now.getTime() + def.hours * 3600000).toISOString(),
        coins: blessing.coins,
        xp: blessing.xp,
        verse: blessing.verse,
        collected: false,
      };
      const next = [...prev, mission];
      saveFieldMissions(next).catch(() => undefined);
      return next;
    });
  }, [lightInfos]);

  /** Welcome a returned light home: award their blessing. */
  const handleCollectMission = useCallback((mission: FieldMission) => {
    if (mission.collected || missionStatus(mission) !== "returned") return;
    if (mission.coins > 0) addCoins(mission.coins);
    if (mission.xp > 0) {
      awardCustomXP(mission.xp, `mission-${mission.id}`).catch(() => undefined);
    }
    setFieldMissions(prev => {
      const next = prev.map(m =>
        m.id === mission.id ? { ...m, collected: true, collectedAt: new Date().toISOString() } : m
      );
      saveFieldMissions(next).catch(() => undefined);
      return next;
    });
  }, [addCoins]);

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
  // The town grid is taller (10x14) so every district gets its own street;
  // other maps stay 10x10.
  const gridW = activeMap === "town" ? TOWN_GRID_W : TOWN_GRID_SIZE;
  const gridH = activeMap === "town" ? TOWN_GRID_H : TOWN_GRID_SIZE;
  // Beach district cells (sandy lots on the south side)
  const beachCells = new Set<string>();
  if (activeMap === "town") {
    for (const lot of TOWN_LOTS) {
      if (!lot.beach) continue;
      for (let yy = lot.y; yy < lot.y + lot.h; yy++)
        for (let xx = lot.x; xx < lot.x + lot.w; xx++)
          beachCells.add(`${xx}-${yy}`);
    }
  }
  for (let y = 0; y < gridH; y++) {
    const cells = [];
    for (let x = 0; x < gridW; x++) {
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
            backgroundColor: isSelected ? "#FEF3C7" : b ? "#D1FAE5" : beachCells.has(`${x}-${y}`) ? "#FDE68A" : "#F3F4F6",
            borderWidth: isOrigin || !b ? 1 : 0,
            borderColor: isSelected ? "#F59E0B" : beachCells.has(`${x}-${y}`) ? "#FCD34D" : "#E5E7EB",
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
        {(() => {
          const collectible = map.buildings.reduce((s, b) => s + (b.accumulated || 0), 0);
          if (collectible <= 0) return null;
          return (
            <Pressable
              onPress={handleCollectAll}
              style={{ backgroundColor: "#D4AF37", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 }}
            >
              <Text style={{ fontWeight: "800", fontSize: 13, color: "#FFFFFF" }}>Collect All</Text>
            </Pressable>
          );
        })()}
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ fontSize: 16 }}>🪙</Text>
          <Text style={{ marginLeft: 6, fontWeight: "700" }}>{coins.balance.toFixed(2)}</Text>
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
              Fellowship: +{((fm - 1) * 100).toFixed(1)}%{gatheringNow ? (map.buildings.some((b) => b.type === "banquet-table") ? " — the Marriage Supper is served!" : " — breaking bread now!") : ""}
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

      {/* Garden visits chip — prayer lights paying respects (+0.1%/visit, 24h) */}
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

      {/* Mission Field: lights back from missions, waiting to be welcomed home */}
      {(() => {
        const home = fieldMissions.filter((m) => !m.collected && missionStatus(m) === "returned");
        if (home.length === 0) return null;
        return (
          <Pressable
            onPress={() => {
              if (!unlockedMaps.includes("reserve")) {
                handleUnlockMap("reserve");
                return;
              }
              switchMap("reserve");
            }}
            style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFBEB", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12, alignSelf: "flex-start", borderWidth: 1, borderColor: "#FCD34D" }}
          >
            <Text style={{ fontSize: 14 }}>✦</Text>
            <Text style={{ marginLeft: 6, fontWeight: "700", fontSize: 12, color: "#92400E" }}>
              {home.length === 1 ? `${home[0].name} is home from the field!` : `${home.length} lights home from the field!`} Tap to welcome them.
            </Text>
          </Pressable>
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
        {activeMap === "city" ? "Tap a FOR SALE lot to purchase it. Upgrade towers for bigger payouts." : activeMap === "mall" ? "A quiet, sacred place. Tap a flower to remember, or the wall to read every name." : activeMap === "well" ? "A quiet place. Draw from the well once a day, and be still." : "Tap an empty plot to build. Businesses earn coins daily while your fast streak is alive."}
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
              Alert.alert("Not enough coins", `Lighting a candle costs ${MEMORY_CANDLE_COST.toFixed(2)} coins.`);
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
      ) : activeMap === "well" ? (
        <TheWell
          well={well}
          timeOfDay={timeOfDay}
          pt={pt}
          onDraw={handleWellDraw}
        />
      ) : activeMap === "reserve" ? (
        <MissionField
          missions={fieldMissions}
          availableLights={lightInfos.filter(
            (l) => !fieldMissions.some((m) => !m.collected && m.personId === l.personId)
          )}
          timeOfDay={timeOfDay}
          pt={pt}
          onSend={handleSendMission}
          onCollect={handleCollectMission}
        />
      ) : (
      <View style={{ alignItems: "center", marginBottom: 16 }}>
        <SeasonalBorder>
        <View style={{ position: "relative" }}>
          {rows}
          {/* Heavenly landmarks — the River of Life along the north edge,
              and the Tree of Life in the chapel plaza */}
          {activeMap === "town" && (
            <>
              <RiverOfLife cellSize={cellSize} />
              <TreeOfLife cellSize={cellSize} timeOfDay={timeOfDay} onPress={() => setTreeModalVisible(true)} />
            </>
          )}
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
                {/* The Gathering: warm golden glow around restaurants — and the
                    Marriage Supper, where the whole town gathers as one — while breaking bread */}
                {gatheringNow && ((isRestaurantType(b.type) && !!b.plotId) || b.type === "banquet-table") && (
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
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#374151", marginTop: 2 }}>🪙{plot.cost.toFixed(2)}</Text>
              <Text style={{ fontSize: 8, color: "#9CA3AF", marginTop: 2 }}>{BUILDINGS[plot.buildingType].name}</Text>
            </View>
          ))}
          {/* Town neighborhood lots: soft heavenly glow (unpurchased) */}
          {activeMap === "town" && TOWN_LOTS.filter(lot => !map.buildings.some(b => b.townLotId === lot.id)).map((lot) => {
            const isSmall = lot.w === 1 && lot.h === 1;
            const isBeach = !!lot.beach;
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
                borderColor: isBeach ? "#F59E0B" : "#FCD34D",
                borderRadius: isSmall ? 8 : 12,
                backgroundColor: isBeach ? "rgba(253, 230, 138, 0.35)" : "rgba(253, 224, 71, 0.10)",
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
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#92400E" }}>🪙{lot.cost.toFixed(2)}</Text>
              ) : (
                <>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#B45309", letterSpacing: 1 }}>{"FOR SALE"}</Text>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#92400E", marginTop: 2 }}>🪙{lot.cost.toFixed(2)}</Text>
                  <Text style={{ fontSize: 8, color: "#B45309", marginTop: 2, textAlign: "center" }} numberOfLines={1}>{lot.name}</Text>
                  {lot.presetType && !map.buildings.some((b) => b.type === lot.presetType) && (
                    lot.presetType === "banquet-table" ? (
                      <View style={{ marginTop: 2 }}><BanquetGlyph size={20} /></View>
                    ) : (
                      <Text style={{ fontSize: 16, marginTop: 2 }}>{BUILDINGS[lot.presetType].icon}</Text>
                    )
                  )}
                </>
              )}
            </View>
            );
          })}
          {/* Townsfolk — prayer lights; those out on field missions (or waiting to be welcomed home) are away */}
          <TownNPCs mapState={map} cellSize={cellSize} onBankVisit={handleBankVisit} lights={lightInfos.filter((l) => !fieldMissions.some((m) => !m.collected && m.personId === l.personId))} onVillagerTap={(p) => {
            const pid = String(p.id);
            const vm = (vmState?.missions ?? []).find((x) => x.personId === pid && x.status !== "done");
            if (vm) setVillagerMissionModal(vm);
            else setPrayerVillagerInfo(p);
          }} missionWaitingIds={vmWaitingIds} missionGuides={vmGuides} onMissionArrival={handleVmArrival} />
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
          {/* Beachside wave strip — along the south edge below the beach district */}
          {activeMap === "town" && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: TOWN_GRID_H * cellSize - 6,
                left: 0,
                width: TOWN_GRID_SIZE * cellSize,
                flexDirection: "row",
                justifyContent: "space-around",
                opacity: 0.85,
              }}
            >
              {Array.from({ length: 10 }).map((_, i) => (
                <Svg key={i} width={28} height={18} viewBox="0 0 28 18">
                  <Path
                    d="M0 9 Q7 2 14 9 T28 9"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                  <Path
                    d="M0 14 Q7 7 14 14 T28 14"
                    fill="none"
                    stroke="#7DD3FC"
                    strokeWidth={2}
                    strokeLinecap="round"
                    opacity={0.7}
                  />
                </Svg>
              ))}
            </View>
          )}
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

      {selectedTile && activeMap !== "reserve" && activeMap !== "city" && activeMap !== "town" && activeMap !== "mall" && activeMap !== "well" && (
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
                <Text style={{ fontWeight: "700", color: pt.text }}>🪙{def.cost.toFixed(2)}</Text>
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
              {/* Villager Requests — missions that come from the lights themselves */}
              {(() => {
                const requests = activeVillagerMissions(vmState?.missions ?? []);
                if (requests.length === 0) return null;
                return (
                  <>
                    <Text style={{ fontWeight: "700", fontSize: 16, color: pt.text, marginTop: 12, marginBottom: 8 }}>
                      Villager Requests
                    </Text>
                    {requests.map((m) => (
                      <View key={m.id} style={{ backgroundColor: pt.bg, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#DDD6FE" }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <View
                            style={{
                              width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF",
                              borderWidth: 1.5, borderColor: "#7C3AED",
                              alignItems: "center", justifyContent: "center", marginRight: 8,
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: "800", color: "#7C3AED" }}>?</Text>
                          </View>
                          <Text style={{ fontWeight: "700", fontSize: 15, color: pt.text, flex: 1 }}>{m.personName}</Text>
                        </View>
                        <Text style={{ fontSize: 13, color: pt.subtext, marginTop: 6, fontStyle: "italic" }}>
                          &ldquo;{m.message}&rdquo;
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                          <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                            <Text style={{ fontSize: 13, fontWeight: "700", color: "#B45309" }}>🪙 {m.rewardCoins}</Text>
                            <Text style={{ fontSize: 13, fontWeight: "700", color: "#7C3AED" }}>⚡ {m.rewardXP} XP</Text>
                          </View>
                          <Text style={{ fontSize: 12, color: pt.subtext, fontStyle: "italic" }}>
                            {m.status === "waiting" ? "Waiting in Hometown — tap them" : "On the way…"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </>
                );
              })()}
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
                    if (nx >= mapGridSize(activeMap).w || ny >= mapGridSize(activeMap).h) { fits = false; break; }
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
                  Alert.alert("Not enough coins", `You need ${upgradeCost} coins. You have ${coins.balance.toFixed(2)}.`);
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
                  Alert.alert("Not enough coins", `Hiring costs ${WORKER_HIRE_COST} coins. You have ${coins.balance.toFixed(2)}.`);
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
                            Storage: {stored.toFixed(2)}/{cap.toFixed(2)}
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
                      🙏 {prayedToday} prayed for today (+{(prayedToday * CHURCH_PRAYER_COINS_PER_HOUR).toFixed(2)} coins/hour){!isMax ? ` — upgrade to ${churchNameFor(nextLevel)}` : " — a warm Community Church, full of light!"}
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
                        ⬆️ Upgrade to {b.type === "house" ? houseNameFor(nextLevel) : b.type === "church" ? churchNameFor(nextLevel) : `Lv ${nextLevel}`} 🪙{upgradeCost.toFixed(2)}
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
                        👷 Hire Worker 🪙{WORKER_HIRE_COST.toFixed(2)} ({workerCount}/{MAX_WORKERS_PER_BUILDING})
                      </Text>
                    </Pressable>
                  )}
                  {effectiveIncomeFor(b) > 0 && (() => {
                    const ready = canWorkShift(workShifts, b.id);
                    return (
                      <Pressable
                        onPress={() => {
                          if (!ready) {
                            Alert.alert("Resting", "This shop needs a break. Come back soon!");
                            return;
                          }
                          setPopupBuilding(null);
                          setWorkShiftBuilding(b);
                          setShiftTaps(0);
                          setShiftTimeLeft(WORK_SHIFT_DURATION_MS / 1000);
                        }}
                        style={{ backgroundColor: ready ? "#10B981" : pt.bg, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 10, opacity: ready ? 1 : 0.6 }}
                      >
                        <Text style={{ color: ready ? "#FFFFFF" : pt.text, fontWeight: "700", fontSize: 16 }}>
                          🔨 Work Shift {ready ? "" : "(resting)"}
                        </Text>
                        <Text style={{ color: ready ? "#D1FAE5" : pt.subtext, fontSize: 12, marginTop: 2 }}>
                          Tap fast for 10 seconds to earn coins!
                        </Text>
                      </Pressable>
                    );
                  })()}
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
            {(() => {
              const lightId = prayerVillagerInfo ? String(prayerVillagerInfo.id) : "";
              const canThank = lightId && canThankLight(lightTaps, lightId);
              const doThank = async () => {
                if (!lightId || !canThank) return;
                const now = Date.now();
                const updated = { ...lightTaps, [lightId]: now };
                setLightTaps(updated);
                setThankedLight(true);
                try { await AsyncStorage.setItem(LIGHT_TAP_KEY, JSON.stringify(updated)); } catch {}
                addCoins(LIGHT_TAP_COINS);
              };
              return canThank && !thankedLight ? (
                <Pressable
                  onPress={doThank}
                  style={{ marginTop: 12, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, backgroundColor: "#10B981" }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>💛 Say Thanks (+{LIGHT_TAP_COINS.toFixed(2)} coins)</Text>
                </Pressable>
              ) : (
                <Text style={{ color: pt.subtext, fontSize: 12, marginTop: 12, fontStyle: "italic", textAlign: "center" }}>
                  {thankedLight ? "\"Thank you for praying for me!\"" : "Thanks given — come back in an hour"}
                </Text>
              );
            })()}
            <Pressable
              onPress={() => { setPrayerVillagerInfo(null); setThankedLight(false); }}
              style={{ marginTop: 16, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, backgroundColor: "#F59E0B" }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Villager mission — a light with a "?" asks Jonathan for help */}
      <Modal
        visible={villagerMissionModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setVillagerMissionModal(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }}
          onPress={() => setVillagerMissionModal(null)}
        >
          <Pressable
            style={{ backgroundColor: pt.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, alignItems: "center" }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* little golden light with a "?" */}
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFFFFF",
                  borderWidth: 1.5, borderColor: "#7C3AED",
                  alignItems: "center", justifyContent: "center",
                  position: "absolute", top: -14, zIndex: 1,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#7C3AED" }}>?</Text>
              </View>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#FBBF24", alignItems: "center", justifyContent: "center", marginTop: 8 }}>
                <View style={{ flexDirection: "row", gap: 3 }}>
                  <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#1F2937" }} />
                  <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#1F2937" }} />
                </View>
              </View>
              <View
                style={{
                  width: 22, height: 16,
                  borderTopLeftRadius: 8, borderTopRightRadius: 8,
                  borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
                  backgroundColor: "#FBBF24", marginTop: 1,
                }}
              />
            </View>
            <Text style={{ color: pt.text, fontSize: 20, fontWeight: "800", marginTop: 12, textAlign: "center" }}>
              {villagerMissionModal?.personName} needs a hand
            </Text>
            <Text style={{ color: pt.subtext, fontSize: 15, marginTop: 8, textAlign: "center", fontStyle: "italic" }}>
              &ldquo;{villagerMissionModal?.message}&rdquo;
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
              <Text style={{ fontSize: 14, color: pt.subtext }}>Walk together to the </Text>
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#7C3AED" }}>{villagerMissionModal?.targetLabel}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#B45309" }}>🪙 {villagerMissionModal?.rewardCoins}</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#7C3AED" }}>⚡ {villagerMissionModal?.rewardXP} XP</Text>
            </View>
            {villagerMissionModal?.status === "waiting" ? (
              <>
                <Pressable
                  onPress={() => { if (villagerMissionModal) helpVillagerMission(villagerMissionModal); }}
                  style={{ marginTop: 16, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, backgroundColor: "#7C3AED" }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Help</Text>
                </Pressable>
                <Pressable
                  onPress={() => setVillagerMissionModal(null)}
                  style={{ marginTop: 8, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 32 }}
                >
                  <Text style={{ color: pt.subtext, fontWeight: "600", fontSize: 14 }}>Not now</Text>
                </Pressable>
              </>
            ) : (
              <Text style={{ color: pt.subtext, fontSize: 13, marginTop: 16, fontStyle: "italic", textAlign: "center" }}>
                {villagerMissionModal?.kind === "garden" || villagerMissionModal?.kind === "well"
                  ? `Visit the ${villagerMissionModal?.targetLabel} to complete this.`
                  : "On the way — watch for the sparkle when you arrive."}
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Villager mission complete — sparkle + reward */}
      <Modal
        visible={vmCelebration !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setVmCelebration(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }}
          onPress={() => setVmCelebration(null)}
        >
          <Pressable
            style={{ backgroundColor: pt.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, alignItems: "center" }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 40 }}>✦</Text>
            <Text style={{ color: pt.text, fontSize: 20, fontWeight: "800", marginTop: 8, textAlign: "center" }}>
              {vmCelebration?.mission.personName} is grateful!
            </Text>
            <Text style={{ color: pt.subtext, fontSize: 14, marginTop: 8, textAlign: "center" }}>
              &ldquo;Thank you for walking with me.&rdquo;
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#B45309" }}>🪙 +{vmCelebration?.mission.rewardCoins}</Text>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#7C3AED" }}>⚡ +{vmCelebration?.mission.rewardXP} XP</Text>
            </View>
            <Pressable
              onPress={() => setVmCelebration(null)}
              style={{ marginTop: 16, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, backgroundColor: "#F59E0B" }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Amen</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Work shift mini-game — tap fast for 10 seconds to earn coins */}
      <Modal
        visible={workShiftBuilding !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (shiftTimerRef.current) clearInterval(shiftTimerRef.current);
          setWorkShiftBuilding(null);
        }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }}
          onPress={() => {
            if (shiftTimerRef.current) clearInterval(shiftTimerRef.current);
            setWorkShiftBuilding(null);
          }}
        >
          <Pressable
            style={{ backgroundColor: pt.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, alignItems: "center" }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ color: pt.text, fontSize: 20, fontWeight: "800", marginBottom: 4 }}>
              🔨 Work Shift
            </Text>
            <Text style={{ color: pt.subtext, fontSize: 14, marginBottom: 12, textAlign: "center" }}>
              Tap as fast as you can! {WORK_SHIFT_TAPS_PER_COIN} taps = 1 coin (max {WORK_SHIFT_MAX_COINS})
            </Text>
            {/* Timer bar */}
            <View style={{ width: "100%", height: 8, backgroundColor: pt.bg, borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
              <View
                style={{
                  height: 8,
                  width: `${Math.max(0, (shiftTimeLeft / (WORK_SHIFT_DURATION_MS / 1000)) * 100)}%`,
                  backgroundColor: shiftTimeLeft > 3 ? "#10B981" : "#DC2626",
                  borderRadius: 4,
                }}
              />
            </View>
            <Text style={{ color: pt.text, fontSize: 32, fontWeight: "800", marginBottom: 4 }}>
              {Math.ceil(shiftTimeLeft)}s
            </Text>
            <Text style={{ color: "#B45309", fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
              {shiftTaps} taps → {Math.min(WORK_SHIFT_MAX_COINS, Math.floor(shiftTaps / WORK_SHIFT_TAPS_PER_COIN))} coins
            </Text>
            <Pressable
              onPress={() => {
                // Start timer on first tap
                if (shiftTaps === 0 && !shiftTimerRef.current) {
                  shiftTimerRef.current = setInterval(() => {
                    setShiftTimeLeft((prev) => {
                      const next = prev - 0.1;
                      if (next <= 0) {
                        if (shiftTimerRef.current) clearInterval(shiftTimerRef.current);
                        shiftTimerRef.current = null;
                        // Shift over — award coins
                        setShiftTaps((taps) => {
                          const earned = Math.min(WORK_SHIFT_MAX_COINS, Math.floor(taps / WORK_SHIFT_TAPS_PER_COIN));
                          if (earned > 0 && workShiftBuilding) {
                            addCoins(earned);
                            const updated = { ...workShifts, [workShiftBuilding.id]: Date.now() };
                            setWorkShifts(updated);
                            AsyncStorage.setItem(WORK_SHIFT_KEY, JSON.stringify(updated)).catch(() => undefined);
                            Alert.alert("Shift Complete!", `You earned ${earned} coins!`);
                          } else {
                            Alert.alert("Shift Complete", "Tap faster next time!");
                          }
                          setWorkShiftBuilding(null);
                          return 0;
                        });
                        return 0;
                      }
                      return next;
                    });
                  }, 100);
                }
                if (shiftTimeLeft > 0) setShiftTaps((t) => t + 1);
              }}
              style={{ backgroundColor: "#10B981", borderRadius: 60, width: 120, height: 120, alignItems: "center", justifyContent: "center", marginBottom: 12 }}
            >
              <Text style={{ fontSize: 48 }}>👆</Text>
            </Pressable>
            <Text style={{ color: pt.subtext, fontSize: 12 }}>Tap the button!</Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Tree of Life modal — taste its fruit once a day */}
      <Modal
        visible={treeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTreeModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}
          onPress={() => setTreeModalVisible(false)}
        >
          <Pressable
            style={{ backgroundColor: pt.card, borderRadius: 20, padding: 24, alignItems: "center" }}
            onPress={(e) => e.stopPropagation()}
          >
            {(() => {
              const verse = treeVerseForDate();
              const tasted = treeState.lastFruitDate === localDateStr();
              return (
                <>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: pt.text, textAlign: "center" }}>
                    The Tree of Life
                  </Text>
                  <Text style={{ fontSize: 13, color: pt.subtext, textAlign: "center", marginTop: 6, marginBottom: 16, fontStyle: "italic" }}>
                    "In the midst of the street of it, and on either side of the river, was there the tree of life."
                  </Text>
                  <View style={{ backgroundColor: pt.bg, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: pt.border }}>
                    <Text style={{ fontSize: 14, color: pt.text, textAlign: "center", fontStyle: "italic" }}>
                      "{verse.text}"
                    </Text>
                    <Text style={{ fontSize: 12, color: pt.subtext, textAlign: "center", marginTop: 6, fontWeight: "700" }}>
                      — {verse.ref}
                    </Text>
                  </View>
                  <Pressable
                    onPress={handleTasteFruit}
                    disabled={tasted}
                    style={({ pressed }) => [{
                      borderRadius: 12,
                      paddingVertical: 14,
                      paddingHorizontal: 24,
                      alignItems: "center",
                      backgroundColor: tasted ? pt.border : "#166534",
                      opacity: pressed && !tasted ? 0.85 : 1,
                    }]}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16 }}>
                      {tasted ? "Tasted today — come back tomorrow" : `Taste its fruit (+${TREE_FRUIT_COINS} coins)`}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => setTreeModalVisible(false)} style={{ marginTop: 12, padding: 8 }}>
                    <Text style={{ color: pt.subtext, fontWeight: "700" }}>Close</Text>
                  </Pressable>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Lot purchase modal — shows ALL allowed building types (Alert hid restaurants on Android) */}
      <Modal
        visible={purchaseLot !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPurchaseLot(null)}
      >        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }}
          onPress={() => setPurchaseLot(null)}
        >
          <Pressable
            style={{ backgroundColor: pt.card, borderRadius: 16, padding: 20, width: "100%", maxWidth: 380, maxHeight: "85%" }}
            onPress={(e) => e.stopPropagation()}
          >
            {(() => {
              const lot = purchaseLot;
              if (!lot) return null;
              // Preset lot: one fixed building — show it directly, unlock & upgrade.
              // But if already owned, fall through to flexible options (no duplicates).
              const presetOwned = lot.presetType && map.buildings.some((b) => b.type === lot.presetType);
              if (lot.presetType && !presetOwned) {
                const def = BUILDINGS[lot.presetType];
                const total = lot.cost + def.cost;
                const affordable = coinsRef.current.balance >= total;
                return (
                  <>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: pt.text, textAlign: "center" }}>
                      {lot.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: pt.subtext, textAlign: "center", marginTop: 6, marginBottom: 12 }}>
                      Unlock this plot and open the {def.name}. Lot buildings have a fixed home here — they can't be moved or sold, only upgraded.
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, marginBottom: 12, backgroundColor: pt.bg, borderWidth: 1, borderColor: pt.border }}>
                      {lot.presetType === "banquet-table" ? (
                        <View style={{ marginRight: 14 }}><BanquetGlyph size={44} /></View>
                      ) : (
                        <Text style={{ fontSize: 40, marginRight: 14 }}>{def.icon}</Text>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: "800", color: pt.text }}>{def.name}</Text>
                        <Text style={{ fontSize: 13, color: pt.subtext, marginTop: 2 }}>
                          {def.description}
                        </Text>
                        <Text style={{ fontSize: 12, color: pt.subtext, marginTop: 4 }}>
                          Plot 🪙{lot.cost.toFixed(2)} + building 🪙{def.cost.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => purchaseOnLot(lot, lot.presetType!)}
                      style={({ pressed }) => [{ borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: affordable ? "#D4AF37" : pt.border, opacity: pressed ? 0.85 : 1 }]}
                    >
                      <Text style={{ color: affordable ? "#FFFFFF" : pt.subtext, fontWeight: "800", fontSize: 16 }}>
                        Unlock for 🪙{total.toFixed(2)}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setPurchaseLot(null)}
                      style={{ marginTop: 12, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: pt.border }}
                    >
                      <Text style={{ color: pt.text, fontWeight: "700", fontSize: 16 }}>Cancel</Text>
                    </Pressable>
                  </>
                );
              }
              const available = lot.allowedTypes.filter(
                (type) => tier >= BUILDINGS[type].tier && BUILDINGS[type].maps.includes("town")
              );
              const groups: { title: string; types: BuildingType[] }[] = [
                { title: "Food & Drink", types: ["pizza-place", "burger-joint", "taco-stand", "sushi-bar", "diner", "bakery"] },
                { title: "Shops", types: ["shop", "market", "clothes-shop", "armory", "weaponsmith", "toolshop"] },
                { title: "Services", types: ["bank", "barbershop"] },
                { title: "Special", types: ["church", "pawn-house", "farm", "house"] },
              ];
              return (
                <>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: pt.text, textAlign: "center" }}>
                    {lot.name} — FOR SALE
                  </Text>
                  <Text style={{ fontSize: 13, color: pt.subtext, textAlign: "center", marginTop: 6, marginBottom: 12 }}>
                    Purchase this lot for {lot.cost} coins and choose what to build. Lot buildings have a fixed home here — they can't be moved or sold, only upgraded.
                  </Text>
                  <ScrollView style={{ maxHeight: 420 }}>
                    {groups.map((g) => {
                      const items = g.types.filter((t) => available.includes(t));
                      if (items.length === 0) return null;
                      return (
                        <View key={g.title} style={{ marginBottom: 12 }}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: pt.subtext, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                            {g.title}
                          </Text>
                          {items.map((type) => {
                            const def = BUILDINGS[type];
                            const total = lot.cost + def.cost;
                            const affordable = coinsRef.current.balance >= total;
                            return (
                              <Pressable
                                key={type}
                                onPress={() => purchaseOnLot(lot, type)}
                                style={({ pressed }) => [{
                                  flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12,
                                  borderRadius: 12, marginBottom: 6,
                                  backgroundColor: pressed ? pt.border + "40" : pt.bg,
                                  borderWidth: 1, borderColor: pt.border, opacity: affordable ? 1 : 0.55,
                                }]}
                              >
                                <Text style={{ fontSize: 28, marginRight: 12 }}>{def.icon}</Text>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 15, fontWeight: "700", color: pt.text }}>{def.name}</Text>
                                  <Text style={{ fontSize: 12, color: pt.subtext }}>
                                    {def.incomePerDay > 0 ? `+${def.incomePerDay}/day` : def.xpPerDay > 0 ? `+${def.xpPerDay} XP/day` : def.description}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 15, fontWeight: "800", color: affordable ? "#B8860B" : "#EF4444" }}>
                                  🪙{total.toFixed(2)}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      );
                    })}
                  </ScrollView>
                  <Pressable
                    onPress={() => setPurchaseLot(null)}
                    style={{ marginTop: 12, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: pt.border }}
                  >
                    <Text style={{ color: pt.text, fontWeight: "700", fontSize: 16 }}>Cancel</Text>
                  </Pressable>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
