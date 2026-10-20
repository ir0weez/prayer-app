import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Svg, { Path, Circle, Ellipse, Rect, Line, Polygon, G } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  BUILDINGS,
  DECORATIONS,
  COINS_STORAGE_KEY,  TOWN_GRID_SIZE,
  TOWN_GRID_H, mapGridSize,
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
  isStockedBuildingType,
  stockCapForLevel,
  stockMultiplierFor,
  stockForBuilding,
  STOCK_DEPLETION_PER_MIN,
  STOCK_RESTOCK_PER_MIN,
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
  // Fast-length gating + economy scaling: Hometown unlocks on 40+ day
  // fasts; costs and income scale with the selected fast's length.
  HOMETOWN_MIN_FAST_DAYS,
  hometownUnlockedForFastLength,
  economyScaleForFastLength,
  setEconomyScale,
  getEconomyScale,
  scaledCoins,
  scaledXP,
  loadActiveFastLength,
  mapUnlockCost,
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
  cottageResidents,
  LIGHTHOUSE_BLESSING_COINS,
  LIGHTHOUSE_MAX_LEVEL,
  LIGHTHOUSE_UPGRADE_COSTS,
  emptyLighthouse,
  loadLighthouse,
  saveLighthouse,
  lighthouseVerseForDate,
  hospitalBlessingForLevel,
  loadHospitalBuff,
  saveHospitalBuff,
  consumeHospitalBuff,
  type HospitalBuff,
  type LighthouseState,
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
  TOWN_LANDMARKS,
  townLandmarkAt,
  type TownLandmark,
  isStreamTile,
  isBridgeTile,
} from "@/lib/hometown";
import { refreshHouseBonusCache } from "@/lib/pawn-house";
import { isEnterableRestaurant, restaurantInteriorBonus } from "@/lib/restaurant-interior";
import { getTodayISOString } from "@/lib/prayercircle-data";
import { MONUMENT_STORAGE_KEY, MONUMENT_DESIGNS, parseMonuments } from "@/lib/monuments";
import { getCachedBoosts, refreshGearBoostCache, combatStats, loadEquipped, GEAR_BY_ID, type CombatStats } from "@/lib/gear";
import { awardCustomXP } from "@/lib/xp-engine";
import { checkInStreak, nextMilestoneFor, type StreakState, emptyStreak } from "@/lib/town-streak";
import {
  getTodayVisitors, markVisitorClaimed, buildMerchantDeal,
  type Visitor, type MerchantDeal,
} from "@/lib/surprise-visitors";
import {
  recordFishCatch, recordDemonDefeat, recordFlowerPlanted,
  COLLECTION_SETS, loadCollections, type CollectionState,
} from "@/lib/collections";
import { CollectionsBook } from "@/components/collections-book";
import { getActiveEvents, formatCountdown, isEventActive, type HeavenlyEvent } from "@/lib/heavenly-events";
import { getLevelForXP, loadXPState } from "@/lib/xp-engine";
import {
  loadGarden, saveGarden, gardenIsRipe, gardenMsUntilRipe, gardenHarvestReward,
  GARDEN_PLOTS, GARDEN_RIPEN_MINUTES,
  loadLastShow, saveLastShow, showMsRemaining, SHOW_COINS, SHOW_XP,
  loadLastStudy, saveLastStudy, studyMsRemaining, STUDY_XP,
  loadLastRest, saveLastRest, restMsRemaining, REST_COINS, REST_XP,
  loadLastCheckup, saveLastCheckup, checkupMsRemaining,
  formatCooldown, type GardenState,
} from "@/lib/gathering-places";
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
import {
  loadVillagerWorkState,
  saveVillagerWorkState,
  createWorkAssignment,
  tickWorkAssignments,
  markWorkArrived,
  collectWorkAssignment,
  activeWorkAssignments,
  personHasActiveWork,
  workCountdownText,
  staffedSupplySites,
  anySupplySiteStaffed,
  SUPPLY_RADIUS_TILES,
  WORK_KINDS,
  type WorkKind,
  type VillagerWorkAssignment,
  type VillagerWorkState,
} from "@/lib/villager-work";
import { SeasonalBorder } from "@/components/seasonal-border";
import { MapSigns } from "@/components/map-signs";
import { MissionField } from "@/components/mission-field";
import { DarkForest } from "@/components/dark-forest";
import {
  demonForWave,
  loadDarkForestState,
  saveDarkForestState,
  type DarkForestState,
} from "@/lib/dark-forest";
import { RiverCamp } from "@/components/river";
import { HolidayMapOverlay } from "@/components/holiday-decor";
import { SeasonMapOverlay } from "@/components/season-decor";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import {
  loadRiverState,
  saveRiverState,
  newDayCheck,
  RIVER_LEVELS,
  RIVER_LEVEL_NAMES,
  defaultRiverState,
  type RiverLevel,
  type RiverState,
} from "@/lib/river";
import { SafeBoundary } from "@/components/safe-boundary";
import { getTimeOfDay, PAGE_THEMES, type TimeOfDay } from "@/lib/daynight";
import { TownNPCs, CityNPCs, countHometownNpcs, type LightInfo } from "@/components/town-npcs";
import { CityTraffic } from "@/components/city-traffic";
import { ChimneySmoke, hasChimney } from "@/components/chimney-smoke";
import { MapBirds } from "@/components/map-birds";
import { NightWindowGlow, hasLitWindows } from "@/components/night-window-glow";
import {
  getActiveScheduleActivity,
  resolveScheduleTarget,
  type ScheduleActivity,
  type ScheduleTarget,
} from "@/lib/schedule-sync";
import { PlayerPawnWanderer } from "@/components/player-pawn";
import { GardenOfRemembrance } from "@/components/garden-of-remembrance";
import { TheWell } from "@/components/the-well";
import { FireworksOverlay } from "@/components/fireworks";
import {
  emptyCelebrations, loadCelebrations, saveCelebrations, todayStr,
  COIN_CACHE_SPOTS, cacheReward, cacheClaimedToday,
  WISHING_FOUNTAIN_TILE, FOUNTAIN_TOSS_COST, FOUNTAIN_COOLDOWN_MS, fountainBlessing, fountainMsRemaining,
  STREET_PERFORMER_TILE, PERFORMER_TIP_COST, PERFORMER_XP, PERFORMER_COOLDOWN_MS, performerMsRemaining,
  formatCooldown as celebrationCooldown,
  type CelebrationKind, type CelebrationSpec,
} from "@/lib/celebrations";
import { CelebrationOverlay } from "@/components/celebration-overlay";
import { CoinCacheMarker, WishingFountain, StreetPerformer } from "@/components/city-delights";

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  if (isNaN(da) || isNaN(db)) return 0;
  return Math.floor((db - da) / 86400000);
}

/**
 * Presence-gated income multiplier: a building only earns when villagers
 * are actually there. This drives the prayer loop — pray → villagers appear
 * → villagers visit buildings → buildings earn coins.
 *
 * - Live (app open): counts villagers within 2 tiles of the building.
 *   0 nearby = 0 income, 1 = 40%, 2 = 70%, 3+ = 100%.
 * - Away (on-open accrual): uses prayed count as a proxy — villagers were
 *   "around" during the day. 0 prayed = 0 income, scales up to full at 8+.
 */
export function presenceMultiplierFor(
  building: { x: number; y: number },
  positions: Array<{ x: number; y: number }>,
  prayedCount: number,
  isLive: boolean,
): number {
  if (!isLive) {
    // Time away: proxy by prayed count (villagers existed that day).
    if (prayedCount <= 0) return 0;
    return Math.min(1, prayedCount / 8);
  }
  // Live: count villagers within 2 tiles (Chebyshev distance).
  const bx = building.x;
  const by = building.y;
  let count = 0;
  for (const p of positions) {
    const dx = Math.abs(p.x - bx);
    const dy = Math.abs(p.y - by);
    // Building footprints are 2x2; check within 2 tiles of the building origin.
    if (dx <= 3 && dy <= 3) {
      count++;
      if (count >= 3) break;
    }
  }
  if (count === 0) return 0;
  if (count === 1) return 0.4;
  if (count === 2) return 0.7;
  return 1;
}

/**
 * Stock flow: each staffed farm/garden produces STOCK_RESTOCK_PER_MIN
 * units of stock per minute, flowing to stocked buildings within
 * SUPPLY_RADIUS_TILES (nearest first) until they are full. Mutates the
 * provided stock record; returns true if any stock moved.
 */
export function restockFromSites(
  buildings: Array<{ id: string; x: number; y: number; type: string; level?: number }>,
  sites: Array<{ x: number; y: number }>,
  stock: Record<string, number>,
  minutes: number,
): boolean {
  if (sites.length === 0 || !Number.isFinite(minutes) || minutes <= 0) return false;
  let moved = false;
  for (const site of sites) {
    let remaining = STOCK_RESTOCK_PER_MIN * minutes;
    const targets = buildings
      .filter((tb) => isStockedBuildingType(tb.type))
      .map((tb) => ({
        tb,
        d: Math.max(Math.abs(tb.x - site.x), Math.abs(tb.y - site.y)),
      }))
      .filter(({ d }) => d <= SUPPLY_RADIUS_TILES)
      .sort((a, z) => a.d - z.d);
    for (const { tb } of targets) {
      if (remaining <= 0) break;
      const level = tb.level || 1;
      const cap = stockCapForLevel(level);
      const cur = stockForBuilding(stock, tb.id, level);
      const room = cap - cur;
      if (room <= 0) continue;
      const give = Math.min(room, remaining);
      stock[tb.id] = cur + give;
      remaining -= give;
      moved = true;
    }
  }
  return moved;
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

// Pseudo-3D: taller buildings render art that extends ABOVE their grid square,
// overlapping neighboring squares (grid positions and tap targets are unchanged).
// Returns extra height in grid cells for the building's art.
function tallArtExtraCells(type: string, level: number, floors: number): number {
  switch (type) {
    case "church": return 1.0;
    case "chapel": return 0.7;
    case "bank": return 0.7;
    case "bank-tower": return 0.5 + 0.4 * Math.min(Math.max(floors || 1, 1), 5);
    case "office": return 0.9;
    case "hotel": return 0.8;
    case "apartments": return 0.8;
    case "department-store": return 0.7;
    case "theater": return 0.5;
    case "city-market": return 0.4;
    case "market": return 0.3;
    case "hospital": return 0.8;
    // Artisans' Row — towers that rise above their squares
    case "observatory": return 0.8;
    case "town-hall": return 0.6;
    case "music-hall": return 0.5;
    case "inn": return 0.4;
    case "carpenter": return 0.4;
    case "apothecary": return 0.4;
    case "post-office": return 0.4;
    case "bathhouse": return 0.3;
    case "pottery": return 0.3;
    case "tailor": return 0.3;
    // City cultural district — towers that rise over downtown
    case "clock-tower": return 1.2;
    case "grand-library": return 0.9;
    case "opera-house": return 0.7;
    case "museum": return 0.6;
    case "embassy": return 0.6;
    // City eastside — art & market row
    case "music-studio": return 0.5;
    case "art-gallery": return 0.5;
    case "flower-market": return 0.3;
    case "coffee-roastery": return 0.4;
    default: return 0;
  }
}

// Generic pseudo-3D tower block: front face with content, darker side face for
// depth, roof cap with highlight, and a soft ground shadow. w = px width,
// H = total px height. Children render inside the front face.
function tallBlock(opts: {
  s: number; H: number; w: number;
  front: string; side: string; roof: string;
  lit: (i: number, j: number) => boolean; LIT: string;
  rows: number; cols: number;
  winW?: number; winH?: number; gap?: number; topPad?: number; winOff?: string;
  extraTop?: React.ReactNode; extraBottom?: React.ReactNode;
}) {
  const { s, H, w, front, side, roof, lit, LIT, rows, cols } = opts;
  const sideW = Math.max(5, w * 0.11);
  const roofH = Math.max(6, H * 0.045);
  const winW = opts.winW ?? s * 0.13;
  const winH = opts.winH ?? Math.max(8, (H * 0.8) / Math.max(rows, 1) * 0.42);
  const gap = opts.gap ?? s * 0.035;
  return (
    <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
      {/* ground shadow */}
      <View style={{ position: "absolute", bottom: 0, width: w * 1.12, height: Math.max(5, s * 0.05), backgroundColor: "#000000", opacity: 0.13, borderRadius: 999 }} />
      {opts.extraBottom}
      <View style={{ width: w, height: H * 0.94 }}>
        {/* roof cap */}
        <View style={{ position: "absolute", top: 0, left: -3, width: w + 6, height: roofH, backgroundColor: roof, borderRadius: 3, zIndex: 2 }}>
          <View style={{ height: 2, backgroundColor: "#FFFFFF", opacity: 0.35, borderRadius: 1 }} />
        </View>
        {opts.extraTop}
        <View style={{ flex: 1, flexDirection: "row", paddingTop: roofH + 2 }}>
          {/* front face */}
          <View style={{ flex: 1, backgroundColor: front, borderBottomLeftRadius: 5, overflow: "hidden", alignItems: "center", paddingTop: opts.topPad ?? H * 0.04 }}>
            {Array.from({ length: rows }).map((_, r) => (
              <View key={r} style={{ flexDirection: "row", marginVertical: gap / 2 }}>
                {Array.from({ length: cols }).map((_, c) => (
                  <View key={c} style={{ width: winW, height: winH, backgroundColor: lit(r, c) ? LIT : (opts.winOff ?? front), marginHorizontal: gap / 2, borderRadius: 2, opacity: lit(r, c) ? 1 : 0.55 }} />
                ))}
              </View>
            ))}
          </View>
          {/* side face — darker, suggests volume */}
          <View style={{ width: sideW, backgroundColor: side, borderBottomRightRadius: 5 }}>
            <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, backgroundColor: "#FFFFFF", opacity: 0.22 }} />
          </View>
        </View>
      </View>
    </View>
  );
}

// Building art using colored shapes (no emojis) - shape evolves with level.
// artH: optional taller canvas height (px) for pseudo-3D tall buildings; art
// stays bottom-anchored so it extends upward over neighboring squares.
/** Living Stream water — gentle animated shimmer. Phase-offset per tile so the current feels alive. */
function StreamWater({ size, phase = 0 }: { size: number; phase?: number }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), (phase % 10) * 240);
    return () => { clearTimeout(t); loop.stop(); };
  }, [shimmer, phase]);
  const op = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.75] });
  const dx = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-3, 3] });
  return (
    <View style={{ position: "absolute", width: size, height: size, backgroundColor: "#7DD3FC", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <View style={{ position: "absolute", width: size, height: size * 0.35, backgroundColor: "#38BDF8", opacity: 0.6, borderRadius: size }} />
      <Animated.View style={{ opacity: op, transform: [{ translateX: dx }] }}>
        <Svg width={size} height={size * 0.5} viewBox={`0 0 40 20`}>
          <Path d="M0 10 Q10 4 20 10 T40 10" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
          <Path d="M0 16 Q10 10 20 16 T40 16" fill="none" stroke="#E0F2FE" strokeWidth={1.5} strokeLinecap="round" opacity={0.8} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Wooden footbridge spanning the stream where Pilgrim's Way crosses. */
function StreamBridge({ size }: { size: number }) {
  return (
    <View style={{ position: "absolute", width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* planks */}
      <View style={{ position: "absolute", width: size * 0.9, height: size * 0.55, backgroundColor: "#92400E", borderRadius: 3, borderWidth: 1.5, borderColor: "#78350F" }} />
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ position: "absolute", top: size * 0.24 + i * size * 0.09, width: size * 0.9, height: 1.5, backgroundColor: "#78350F", opacity: 0.7 }} />
      ))}
      {/* rails */}
      <View style={{ position: "absolute", top: size * 0.16, width: size * 0.9, height: size * 0.08, backgroundColor: "#B45309", borderRadius: 2 }} />
      <View style={{ position: "absolute", bottom: size * 0.16, width: size * 0.9, height: size * 0.08, backgroundColor: "#B45309", borderRadius: 2 }} />
      <View style={{ position: "absolute", top: size * 0.16, left: size * 0.08, width: size * 0.07, height: size * 0.68, backgroundColor: "#92400E", borderRadius: 2 }} />
      <View style={{ position: "absolute", top: size * 0.16, right: size * 0.08, width: size * 0.07, height: size * 0.68, backgroundColor: "#92400E", borderRadius: 2 }} />
    </View>
  );
}

/** Hub landmark art — the five gates to the other maps. 2x2 cells. */
function LandmarkArt({ art, size }: { art: TownLandmark["art"]; size: number }) {
  const s = size;
  switch (art) {
    case "well":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ position: "absolute", bottom: s * 0.42, width: s * 0.62, height: s * 0.3, backgroundColor: "#A8A29E", borderRadius: 8, borderWidth: 2, borderColor: "#78716C" }} />
          <View style={{ position: "absolute", bottom: s * 0.48, width: s * 0.4, height: s * 0.16, backgroundColor: "#0C4A6E", borderRadius: s * 0.08 }} />
          <View style={{ position: "absolute", bottom: s * 0.42, left: s * 0.22, width: s * 0.07, height: s * 0.42, backgroundColor: "#78350F", borderRadius: 2 }} />
          <View style={{ position: "absolute", bottom: s * 0.42, right: s * 0.22, width: s * 0.07, height: s * 0.42, backgroundColor: "#78350F", borderRadius: 2 }} />
          <View style={{ position: "absolute", bottom: s * 0.78, width: s * 0.78, height: s * 0.16, backgroundColor: "#92400E", borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
          <View style={{ position: "absolute", bottom: s * 0.06, width: s * 0.7, height: s * 0.1, backgroundColor: "#000000", opacity: 0.12, borderRadius: 999 }} />
        </View>
      );
    case "garden-gate":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ position: "absolute", bottom: s * 0.1, left: s * 0.12, width: s * 0.12, height: s * 0.62, backgroundColor: "#D6D3D1", borderRadius: 4, borderWidth: 1.5, borderColor: "#A8A29E" }} />
          <View style={{ position: "absolute", bottom: s * 0.1, right: s * 0.12, width: s * 0.12, height: s * 0.62, backgroundColor: "#D6D3D1", borderRadius: 4, borderWidth: 1.5, borderColor: "#A8A29E" }} />
          <View style={{ position: "absolute", bottom: s * 0.66, width: s * 0.8, height: s * 0.14, backgroundColor: "#D6D3D1", borderRadius: 6, borderWidth: 1.5, borderColor: "#A8A29E" }} />
          {[0.2, 0.38, 0.56, 0.74].map((fx, i) => (
            <View key={i} style={{ position: "absolute", bottom: s * 0.72, left: s * fx, width: s * 0.09, height: s * 0.09, borderRadius: s * 0.045, backgroundColor: i % 2 ? "#F9A8D4" : "#F472B6" }} />
          ))}
          <View style={{ position: "absolute", bottom: s * 0.1, width: s * 0.5, height: s * 0.08, backgroundColor: "#000000", opacity: 0.1, borderRadius: 999 }} />
        </View>
      );
    case "mission-field":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ position: "absolute", top: s * 0.08, right: s * 0.12, width: s * 0.22, height: s * 0.22, borderRadius: s * 0.11, backgroundColor: "#FBBF24" }} />
          {[0, 1, 2].map((r) => (
            <View key={r} style={{ position: "absolute", bottom: s * (0.14 + r * 0.2), width: s * 0.84, height: s * 0.12, backgroundColor: "#65A30D", borderRadius: 4, opacity: 0.9 - r * 0.12 }}>
              {[0, 1, 2, 3, 4].map((c) => (
                <View key={c} style={{ position: "absolute", bottom: s * 0.1, left: s * (0.08 + c * 0.16), width: s * 0.05, height: s * 0.14, backgroundColor: "#3F6212", borderRadius: 2 }} />
              ))}
            </View>
          ))}
        </View>
      );
    case "dark-forest":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ position: "absolute", top: 0, width: s, height: s * 0.9, backgroundColor: "#1C1917", opacity: 0.35, borderRadius: 8 }} />
          {[0.16, 0.42, 0.68].map((fx, i) => (
            <View key={i} style={{ position: "absolute", bottom: s * 0.1, left: s * fx, alignItems: "center" }}>
              <View style={{ width: 0, height: 0, borderLeftWidth: s * 0.11, borderRightWidth: s * 0.11, borderBottomWidth: s * 0.3, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: i === 1 ? "#14532D" : "#1C3A2A" }} />
              <View style={{ width: s * 0.06, height: s * 0.12, backgroundColor: "#3F2D1C" }} />
            </View>
          ))}
          <View style={{ position: "absolute", top: s * 0.2, left: s * 0.3, width: s * 0.06, height: s * 0.06, borderRadius: s * 0.03, backgroundColor: "#FDE68A", opacity: 0.9 }} />
          <View style={{ position: "absolute", top: s * 0.32, right: s * 0.28, width: s * 0.05, height: s * 0.05, borderRadius: s * 0.025, backgroundColor: "#FDE68A", opacity: 0.7 }} />
        </View>
      );
    case "river-dock":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ position: "absolute", bottom: s * 0.08, width: s * 0.9, height: s * 0.34, backgroundColor: "#7DD3FC", borderRadius: 8 }} />
          <Svg width={s * 0.9} height={s * 0.2} viewBox="0 0 72 16" style={{ position: "absolute", bottom: s * 0.2 }}>
            <Path d="M0 8 Q9 3 18 8 T36 8 T54 8 T72 8" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
          </Svg>
          <View style={{ position: "absolute", bottom: s * 0.3, width: s * 0.5, height: s * 0.1, backgroundColor: "#92400E", borderRadius: 2 }} />
          {[0.3, 0.45, 0.6].map((fx, i) => (
            <View key={i} style={{ position: "absolute", bottom: s * 0.14, left: s * fx, width: s * 0.05, height: s * 0.24, backgroundColor: "#78350F", borderRadius: 2 }} />
          ))}
        </View>
      );
  }
}

function BuildingArt({ type, size, level = 1, floors = 1, prayedCount = 0, artH }: { type: string; size: number; level?: number; floors?: number; prayedCount?: number; artH?: number }) {
  const s = size;
  const lv = level || 1;
  // Shared pseudo-3D bits for tall buildings.
  const groundShadow = (w: number) => (
    <View style={{ position: "absolute", bottom: 0, width: w, height: Math.max(5, s * 0.05), backgroundColor: "#000000", opacity: 0.13, borderRadius: 999 }} />
  );
  // Darker side strip on a building face — suggests volume/depth.
  const sideShade = (faceW: number, faceH: number, radius: number) => (
    <View style={{ position: "absolute", right: 0, top: 0, width: Math.max(4, faceW * 0.12), height: faceH, backgroundColor: "#000000", opacity: 0.12, borderTopRightRadius: radius, borderBottomRightRadius: radius }} />
  );
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
    case "villager-cottage":
      // A cozy home for the prayer lights — warm cream walls, terracotta
      // roof, a glowing amber window, and a little chimney. Homes, not businesses.
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(s * 0.9)}
          {/* chimney */}
          <View style={{ position: "absolute", bottom: s * 0.66, right: s * 0.18, width: s * 0.1, height: s * 0.2, backgroundColor: "#A8A29E", borderRadius: 2 }} />
          {/* roof */}
          <View style={{ width: s * 0.94, height: s * 0.2, backgroundColor: "#C2410C", borderTopLeftRadius: 6, borderTopRightRadius: 6, zIndex: 2 }}>
            <View style={{ height: 2, backgroundColor: "#FFFFFF", opacity: 0.3, borderRadius: 1 }} />
          </View>
          {/* body */}
          <View style={{ width: s * 0.86, height: s * 0.52, backgroundColor: "#FDE68A", borderBottomLeftRadius: 6, borderBottomRightRadius: 6, overflow: "hidden" }}>
            {/* warm glowing window */}
            <View style={{ position: "absolute", top: s * 0.1, left: s * 0.1, width: s * 0.2, height: s * 0.2, backgroundColor: "#FBBF24", borderRadius: 3, borderWidth: 2, borderColor: "#92400E" }} />
            <View style={{ position: "absolute", top: s * 0.1 + s * 0.09, left: s * 0.1, width: s * 0.2, height: 2, backgroundColor: "#92400E", opacity: 0.6 }} />
            <View style={{ position: "absolute", top: s * 0.1, left: s * 0.1 + s * 0.09, width: 2, height: s * 0.2, backgroundColor: "#92400E", opacity: 0.6 }} />
            {/* door */}
            <View style={{ position: "absolute", bottom: 0, right: s * 0.12, width: s * 0.2, height: s * 0.34, backgroundColor: "#92400E", borderTopLeftRadius: 5, borderTopRightRadius: 5 }}>
              <View style={{ position: "absolute", top: s * 0.12, right: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: "#FBBF24" }} />
            </View>
            {sideShade(s * 0.86, s * 0.52, 6)}
          </View>
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
    case "market": {
      // Taller market hall — pseudo-3D with side face and ground shadow.
      const H = artH ?? s;
      const w = s * 0.95;
      const sideW = Math.max(5, w * 0.1);
      const bodyH = H * 0.8;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.05)}
          <View style={{ width: w, height: Math.max(8, H * 0.07), backgroundColor: "#0369A1", borderRadius: 4, zIndex: 2 }} />
          <View style={{ width: w, height: bodyH, flexDirection: "row" }}>
            <View style={{ flex: 1, backgroundColor: "#0EA5E9", borderBottomLeftRadius: 6, alignItems: "center", justifyContent: "center" }}>
              <View style={{ flexDirection: "row" }}>
                {[0, 1, 2].map(i => (
                  <View key={i} style={{ width: s * 0.17, height: bodyH * 0.42, backgroundColor: "#E0F2FE", marginHorizontal: 3, borderRadius: 2 }} />
                ))}
              </View>
            </View>
            <View style={{ width: sideW, backgroundColor: "#0B7AB5", borderBottomRightRadius: 6 }} />
          </View>
          <View style={{ width: w, height: Math.max(6, H * 0.06), backgroundColor: "#0369A1", borderRadius: 4, marginTop: 2 }} />
        </View>
      );
    }
    case "bank": {
      // Classical bank: pediment, tall columns, steps — pseudo-3D with side face and shadow.
      const H = artH ?? s;
      const w = s * 0.9;
      const sideW = Math.max(5, w * 0.1);
      const colH = H * 0.52;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.1)}
          {/* steps */}
          <View style={{ width: w * 1.06, height: Math.max(5, H * 0.04), backgroundColor: "#9CA3AF", borderRadius: 2 }} />
          <View style={{ width: w, height: H * 0.9, flexDirection: "row" }}>
            <View style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
              {/* pediment */}
              <View style={{
                width: 0, height: 0,
                borderLeftWidth: w * 0.42, borderRightWidth: w * 0.42,
                borderBottomWidth: Math.max(10, H * 0.12),
                borderLeftColor: "transparent", borderRightColor: "transparent",
                borderBottomColor: "#6B7280",
              }} />
              <View style={{ width: w * 0.84, height: Math.max(5, H * 0.04), backgroundColor: "#6B7280", borderRadius: 2 }} />
              {/* columns */}
              <View style={{ flexDirection: "row", marginTop: 2 }}>
                {[0, 1, 2, 3].map(i => (
                  <View key={i} style={{ width: s * 0.11, height: colH, backgroundColor: "#D1D5DB", marginHorizontal: 4, borderRadius: 2, borderLeftWidth: 2, borderLeftColor: "#F3F4F6" }} />
                ))}
              </View>
              <View style={{ width: w * 0.84, height: Math.max(5, H * 0.04), backgroundColor: "#6B7280", borderRadius: 2, marginTop: 2 }} />
            </View>
            <View style={{ width: sideW, backgroundColor: "#000000", opacity: 0.14, borderBottomRightRadius: 4, marginBottom: Math.max(5, H * 0.04) }} />
          </View>
        </View>
      );
    }
    case "chapel": {
      // Taller chapel with steeple — pseudo-3D with side face and shadow.
      const H = artH ?? s;
      const w = s * 0.7;
      const sideW = Math.max(4, w * 0.11);
      const bodyH = H * 0.6;
      const steepleH = H * 0.22;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.15)}
          <View style={{ width: w, height: bodyH + steepleH, alignItems: "center" }}>
            {/* cross */}
            <View style={{ width: s * 0.035, height: steepleH * 0.32, backgroundColor: "#B45309", borderRadius: 2 }} />
            <View style={{ width: s * 0.11, height: s * 0.035, backgroundColor: "#B45309", borderRadius: 2, marginTop: -steepleH * 0.22 }} />
            {/* steeple */}
            <View style={{ width: s * 0.1, height: steepleH * 0.5, backgroundColor: "#F8FAFC", borderWidth: 2, borderColor: "#CBD5E1", borderRadius: 2, marginTop: steepleH * 0.06 }} />
            <View style={{
              width: 0, height: 0,
              borderLeftWidth: s * 0.09, borderRightWidth: s * 0.09,
              borderBottomWidth: Math.max(8, H * 0.08),
              borderLeftColor: "transparent", borderRightColor: "transparent",
              borderBottomColor: "#94A3B8", marginTop: -2,
            }} />
            {/* body with side face */}
            <View style={{ width: w, height: bodyH, flexDirection: "row", marginTop: 2 }}>
              <View style={{ flex: 1, backgroundColor: "#F8FAFC", borderWidth: 2, borderColor: "#CBD5E1", borderBottomLeftRadius: 5, alignItems: "center", paddingTop: s * 0.05 }}>
                <View style={{ width: s * 0.26, height: bodyH * 0.3, backgroundColor: "#BFDBFE", borderRadius: 8 }} />
                <View style={{ width: s * 0.2, height: bodyH * 0.32, backgroundColor: "#78350F", borderRadius: 3, marginTop: s * 0.04 }} />
              </View>
              <View style={{ width: sideW, backgroundColor: "#D7DEE8", borderBottomRightRadius: 5, borderWidth: 2, borderLeftWidth: 0, borderColor: "#CBD5E1" }} />
            </View>
          </View>
          <View style={{ width: s * 0.8, height: Math.max(5, H * 0.045), backgroundColor: "#94A3B8", borderRadius: 3, marginTop: 1 }} />
        </View>
      );
    }
    case "church": {
      // L1 Chapel — small white chapel with steeple and cross.
      // L2 Church — warm community church: glowing amber windows, front porch, welcome sign.
      // L3 Community Church — fellowship hall wing, glowing windows with people silhouettes
      // inside, open double doors spilling warm light, string lights at the entrance.
      const isCommunity = lv >= 3;
      const isChurch = lv >= 2;
      const bodyW = isCommunity ? 0.62 : isChurch ? 0.85 : 0.75;
      const bodyH = isCommunity ? 0.58 : isChurch ? 0.55 : 0.48;
      const H = artH ?? s; // taller canvas — art extends above its square
      const V = H * 0.97 / 1.23; // vertical unit — the classic design spans 1.23, fit it to the tall box
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(s * (isCommunity ? 1.02 : 0.9))}
          {/* Warm halo — the light of a gathering place (L2/L3) */}
          {isChurch && (
            <View style={{
              position: "absolute", bottom: V * 0.02,
              width: s * (isCommunity ? 1.02 : 0.9), height: V * 0.68,
              backgroundColor: "#FDE68A", opacity: 0.22, borderRadius: s * 0.5,
            }} />
          )}
          {/* Main body */}
          <View style={{
            width: s * bodyW, height: V * bodyH,
            backgroundColor: "#FFFBEB", borderRadius: 4,
            borderWidth: 2, borderColor: "#D6C79A",
            alignItems: "center", justifyContent: "center",
          }}>
            {/* pseudo-3D: shaded right edge suggests the building's side */}
            {sideShade(s * bodyW, H * bodyH, 4)}
            {/* Windows — warm amber glow at L2/L3, like light from inside */}
            <View style={{ flexDirection: "row" }}>
              {(isCommunity ? [0, 1, 2] : isChurch ? [0, 1] : [0]).map(i => (
                <View key={i} style={{
                  width: s * 0.13, height: V * 0.22, marginHorizontal: 3,
                  backgroundColor: isChurch ? "#FCD34D" : (i % 2 === 0 ? "#93C5FD" : "#C4B5FD"),
                  borderTopLeftRadius: s * 0.065, borderTopRightRadius: s * 0.065,
                  borderWidth: 1, borderColor: "#92400E",
                  alignItems: "center", justifyContent: "flex-end", overflow: "hidden",
                }}>
                  {/* People silhouettes gathered inside (L3) */}
                  {isCommunity && (
                    <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 2 }}>
                      <View style={{ width: s * 0.035, height: V * 0.07, backgroundColor: "#78350F", borderRadius: s * 0.018, marginRight: 1 }} />
                      <View style={{ width: s * 0.035, height: V * 0.09, backgroundColor: "#92400E", borderRadius: s * 0.018 }} />
                    </View>
                  )}
                </View>
              ))}
            </View>
            {/* Doors — L2/L3: double doors, slightly open with warm light spilling out */}
            {isChurch ? (
              <View style={{
                position: "absolute", bottom: 0,
                width: s * 0.24, height: V * 0.3,
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
                width: s * 0.16, height: V * 0.24,
                backgroundColor: "#78350F",
                borderTopLeftRadius: s * 0.08, borderTopRightRadius: s * 0.08,
              }} />
            )}
          </View>
          {/* Roof */}
          <View style={{
            position: "absolute", bottom: V * bodyH,
            width: 0, height: 0,
            borderLeftWidth: s * bodyW / 2, borderRightWidth: s * bodyW / 2,
            borderBottomWidth: V * 0.22,
            borderLeftColor: "transparent", borderRightColor: "transparent",
            borderBottomColor: "#92400E",
          }} />
          {/* L2: front porch — columns + little roof over the doors, welcome sign out front */}
          {isChurch && !isCommunity && (
            <>
              <View style={{ position: "absolute", bottom: 0, left: "50%", marginLeft: -s * 0.19, width: s * 0.05, height: V * 0.34, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#D6C79A" }} />
              <View style={{ position: "absolute", bottom: 0, left: "50%", marginLeft: s * 0.14, width: s * 0.05, height: V * 0.34, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#D6C79A" }} />
              <View style={{
                position: "absolute", bottom: V * 0.34, left: "50%", marginLeft: -s * 0.22,
                width: 0, height: 0,
                borderLeftWidth: s * 0.22, borderRightWidth: s * 0.22,
                borderBottomWidth: V * 0.12,
                borderLeftColor: "transparent", borderRightColor: "transparent",
                borderBottomColor: "#92400E",
              }} />
              {/* Welcome sign */}
              <View style={{ position: "absolute", bottom: 0, left: s * 0.045, width: s * 0.03, height: V * 0.22, backgroundColor: "#78350F" }} />
              <View style={{ position: "absolute", bottom: V * 0.2, left: -s * 0.015, width: s * 0.15, height: V * 0.12, backgroundColor: "#FFFBEB", borderWidth: 1.5, borderColor: "#78350F", borderRadius: 3, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: s * 0.1, height: 3, backgroundColor: "#F59E0B", borderRadius: 2, marginBottom: 2 }} />
                <View style={{ width: s * 0.07, height: 3, backgroundColor: "#FCD34D", borderRadius: 2 }} />
              </View>
            </>
          )}
          {/* L3: fellowship hall wing + entrance canopy with string lights */}
          {isCommunity && (
            <>
              <View style={{ position: "absolute", bottom: 0, right: s * 0.02, width: s * 0.3, height: V * 0.4, backgroundColor: "#FFFBEB", borderWidth: 2, borderColor: "#D6C79A", borderRadius: 3, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: s * 0.1, height: V * 0.14, backgroundColor: "#FCD34D", borderTopLeftRadius: s * 0.05, borderTopRightRadius: s * 0.05, borderWidth: 1, borderColor: "#92400E" }} />
              </View>
              <View style={{
                position: "absolute", bottom: V * 0.4, right: s * 0.02,
                width: 0, height: 0,
                borderLeftWidth: s * 0.15, borderRightWidth: s * 0.15,
                borderBottomWidth: V * 0.1,
                borderLeftColor: "transparent", borderRightColor: "transparent",
                borderBottomColor: "#92400E",
              }} />
              {/* Entrance canopy with string lights */}
              <View style={{ position: "absolute", bottom: V * 0.28, alignItems: "center" }}>
                <View style={{ width: s * 0.34, height: V * 0.05, backgroundColor: "#92400E", borderRadius: 3 }} />
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
            <View style={{ position: "absolute", bottom: V * (bodyH + 0.17), width: s * 0.18, height: V * 0.28, backgroundColor: "#FFFBEB", borderWidth: 2, borderColor: "#D6C79A", borderRadius: 2 }} />
            <View style={{ position: "absolute", bottom: V * (bodyH + 0.43), width: 0, height: 0, borderLeftWidth: s * 0.09, borderRightWidth: s * 0.09, borderBottomWidth: V * 0.15, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#92400E" }} />
            {/* Cross */}
            <View style={{ position: "absolute", bottom: V * (bodyH + 0.55), left: s * 0.485, width: s * 0.03, height: V * 0.1, backgroundColor: "#FBBF24" }} />
            <View style={{ position: "absolute", bottom: V * (bodyH + 0.59), left: s * 0.45, width: s * 0.1, height: V * 0.03, backgroundColor: "#FBBF24" }} />
          </>
          {/* Prayer lights: glowing figures gathered around the church */}
          {prayedCount > 0 && (
            <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: -s * 0.06, flexDirection: "row", justifyContent: "center", alignItems: "flex-end" }}>
              {Array.from({ length: Math.min(prayedCount, 6) }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: s * 0.1, height: V * 0.14, marginHorizontal: 1,
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
      // Stacked stories — one segment per floor, grows taller with floors.
      // Pseudo-3D: side face, roof cap, ground shadow; art extends above its square.
      const H = artH ?? s;
      const stories = Math.min(Math.max(floors || 1, 1), 5);
      return tallBlock({
        s, H, w: s * 0.62,
        front: "#2748A8", side: "#1B3170", roof: "#172554",
        lit: isLit, LIT,
        rows: stories, cols: 3,
        winW: s * 0.1, winH: Math.max(7, (H * 0.8) / stories * 0.4), gap: s * 0.04,
        winOff: "#1E3A8A", topPad: H * 0.05,
      });
    }
    case "department-store":
      // Pseudo-3D: side face, striped awning roof, window grid, ground shadow.
      return tallBlock({
        s, H: artH ?? s, w: s * 0.95,
        front: "#7C3AED", side: "#5B21B6", roof: "#4C1D95",
        lit: isLit, LIT, rows: 2 + (lv >= 2 ? 1 : 0), cols: 3,
        winW: s * 0.2, winH: s * 0.14, gap: s * 0.05, winOff: "#4C1D95",
        extraTop: (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "center", zIndex: 3 }}>
            {[0, 1, 2, 3].map(i => <View key={i} style={{ width: s * 0.22, height: s * 0.07, backgroundColor: i % 2 ? "#FFFFFF" : "#EF4444" }} />)}
          </View>
        ),
      });
    case "hotel":
      // Pseudo-3D grand hotel: warm facade, sign, window grid, ground shadow.
      return tallBlock({
        s, H: artH ?? s, w: s * 0.7,
        front: "#B45309", side: "#8A3F06", roof: "#78350F",
        lit: isLit, LIT, rows: 3, cols: 2,
        winW: s * 0.16, winH: s * 0.11, gap: s * 0.05, winOff: "#78350F",
        extraTop: (
          <View style={{ position: "absolute", top: s * 0.02, alignSelf: "center", width: s * 0.34, height: s * 0.15, backgroundColor: "#FEF3C7", borderRadius: 4, alignItems: "center", justifyContent: "center", zIndex: 3 }}>
            <Text style={{ fontSize: s * 0.11, fontWeight: "800", color: "#92400E" }}>H</Text>
          </View>
        ),
      });
    case "office":
      // Pseudo-3D glass office tower: blue facade, window grid, ground shadow.
      return tallBlock({
        s, H: artH ?? s, w: s * 0.65,
        front: "#93C5FD", side: "#5B8BD0", roof: "#1E40AF",
        lit: isLit, LIT, rows: 4, cols: 2,
        winW: s * 0.2, winH: s * 0.08, gap: s * 0.04, winOff: "#1E40AF",
      });
    case "apartments": {
      // Two residential blocks, side by side, pseudo-3D.
      const H = artH ?? s;
      const mk = (bh: number, front: string, side: string, seed: number) => {
        const w = s * 0.4;
        const sideW = Math.max(4, w * 0.12);
        return (
          <View style={{ width: w, height: bh, marginHorizontal: s * 0.02 }}>
            <View style={{ position: "absolute", top: 0, left: -2, width: w + 4, height: Math.max(5, H * 0.04), backgroundColor: "#713F12", borderRadius: 3, zIndex: 2 }} />
            <View style={{ flex: 1, flexDirection: "row", paddingTop: Math.max(5, H * 0.04) + 2 }}>
              <View style={{ flex: 1, backgroundColor: front, borderBottomLeftRadius: 4, overflow: "hidden", alignItems: "center", paddingTop: H * 0.03 }}>
                {[0, 1, 2].map(r => (
                  <View key={r} style={{ flexDirection: "row", marginVertical: s * 0.018 }}>
                    {[0, 1].map(j => <View key={j} style={{ width: s * 0.1, height: s * 0.08, backgroundColor: isLit(r + seed, j) ? LIT : "#713F12", marginHorizontal: 2, borderRadius: 1, opacity: isLit(r + seed, j) ? 1 : 0.6 }} />)}
                  </View>
                ))}
              </View>
              <View style={{ width: sideW, backgroundColor: side, borderBottomRightRadius: 4 }} />
            </View>
          </View>
        );
      };
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(s * 0.92)}
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            {mk(H * 0.9, "#A16207", "#7A4E05", 0)}
            {mk(H * 0.74, "#CA8A04", "#9A6A03", 3)}
          </View>
        </View>
      );
    }
    case "city-market": {
      // Striped awning, stall windows, door — pseudo-3D with side face and shadow.
      const H = artH ?? s;
      const w = s * 0.95;
      const sideW = Math.max(5, w * 0.1);
      const bodyH = H * 0.82;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.05)}
          {/* awning */}
          <View style={{ flexDirection: "row", zIndex: 2 }}>
            {[0, 1, 2, 3, 4].map(i => <View key={i} style={{ width: s * 0.18, height: s * 0.09, backgroundColor: i % 2 ? "#FFFFFF" : "#16A34A" }} />)}
          </View>
          <View style={{ width: w, height: bodyH, flexDirection: "row" }}>
            <View style={{ flex: 1, backgroundColor: "#15803D", borderBottomLeftRadius: 5, alignItems: "center", justifyContent: "center" }}>
              <View style={{ flexDirection: "row" }}>
                {[0, 1, 2].map(i => <View key={i} style={{ width: s * 0.2, height: s * 0.18, backgroundColor: isLit(0, i) ? LIT : "#14532D", marginHorizontal: 4, borderRadius: 2, opacity: isLit(0, i) ? 1 : 0.7 }} />)}
              </View>
              <View style={{ width: s * 0.18, height: s * 0.22, backgroundColor: "#052E16", borderRadius: 3, marginTop: s * 0.04 }} />
            </View>
            <View style={{ width: sideW, backgroundColor: "#0E6B32", borderBottomRightRadius: 5 }} />
          </View>
        </View>
      );
    }
    case "theater": {
      // Marquee with lights, curtain doors — pseudo-3D with side face and shadow.
      const H = artH ?? s;
      const w = s * 0.85;
      const sideW = Math.max(5, w * 0.1);
      const bodyH = H * 0.78;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.08)}
          {/* marquee */}
          <View style={{ width: s * 0.8, height: Math.max(14, H * 0.12), backgroundColor: "#FDE68A", borderRadius: 4, borderWidth: 2, borderColor: "#B45309", alignItems: "center", justifyContent: "center", marginBottom: 2, zIndex: 2 }}>
            <View style={{ flexDirection: "row" }}>
              {[0, 1, 2, 3, 4].map(i => <View key={i} style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: isLit(0, i) ? LIT : "#92400E", marginHorizontal: 2 }} />)}
            </View>
          </View>
          <View style={{ width: w, height: bodyH, flexDirection: "row" }}>
            <View style={{ flex: 1, backgroundColor: "#7C2D12", borderBottomLeftRadius: 5, alignItems: "center", justifyContent: "flex-end", paddingBottom: s * 0.05 }}>
              <View style={{ flexDirection: "row" }}>
                <View style={{ width: s * 0.28, height: bodyH * 0.55, backgroundColor: "#991B1B", borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                <View style={{ width: s * 0.28, height: bodyH * 0.55, backgroundColor: "#991B1B", borderTopLeftRadius: 4, borderTopRightRadius: 4, marginLeft: 3 }} />
              </View>
            </View>
            <View style={{ width: sideW, backgroundColor: "#5F220D", borderBottomRightRadius: 5 }} />
          </View>
        </View>
      );
    }
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
    case "community-garden": {
      // Community Garden — rows of growing crops, richer with level.
      // L1: 4 plots, L2: 8 plots, L3: 12 plots + greenhouse.
      const rows: number = lv >= 3 ? 3 : lv >= 2 ? 2 : 2;
      const cols: number = lv >= 3 ? 4 : lv >= 2 ? 4 : 2;
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(s * 0.95)}
          <Svg width={s} height={s * 0.7} viewBox="0 0 80 56">
            {/* soil bed */}
            <Rect x={6} y={8} width={68} height={42} rx={6} fill="#92400E" />
            <Rect x={6} y={8} width={68} height={42} rx={6} fill="#000000" opacity={0.12} />
            {/* crop rows */}
            {Array.from({ length: rows }).map((_, r) =>
              Array.from({ length: cols }).map((_, c) => {
                const cx = 16 + c * ((68 - 20) / Math.max(cols - 1, 1));
                const cy = 18 + r * ((42 - 20) / Math.max(rows - 1, 1));
                return (
                  <React.Fragment key={`${r}-${c}`}>
                    {/* sprout */}
                    <Rect x={cx - 1.2} y={cy - 7} width={2.4} height={9} rx={1.2} fill="#16A34A" />
                    <Ellipse cx={cx - 3.4} cy={cy - 4} rx={3.4} ry={2.2} fill="#22C55E" />
                    <Ellipse cx={cx + 3.4} cy={cy - 5.4} rx={3.4} ry={2.2} fill="#4ADE80" />
                    {/* ripe fruit dot */}
                    <Circle cx={cx} cy={cy - 8} r={2.2} fill={lv >= 2 ? "#FBBF24" : "#86EFAC"} />
                  </React.Fragment>
                );
              })
            )}
            {/* greenhouse at L3 */}
            {lv >= 3 && (
              <React.Fragment>
                <Rect x={58} y={2} width={16} height={12} rx={2} fill="#BAE6FD" opacity={0.75} stroke="#0284C7" strokeWidth={1.2} />
                <Rect x={58} y={2} width={16} height={3} rx={1.5} fill="#0284C7" opacity={0.5} />
              </React.Fragment>
            )}
          </Svg>
        </View>
      );
    }
    case "amphitheater": {
      // Amphitheater — tiered stone seating around a central stage.
      // Grander with level: more tiers, banners at L2, glowing braziers at L3.
      const tiers: number = lv >= 3 ? 4 : lv >= 2 ? 3 : 2;
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(s * 0.98)}
          <Svg width={s} height={s * 0.72} viewBox="0 0 80 58">
            {/* tiered seating (concentric arcs) */}
            {Array.from({ length: tiers }).map((_, i) => {
              const inset = i * 9;
              const y = 6 + i * 9;
              return (
                <React.Fragment key={i}>
                  <Rect x={6 + inset} y={y} width={68 - inset * 2} height={8} rx={4}
                    fill={i % 2 === 0 ? "#D6D3D1" : "#C7BFAE"} stroke="#A8A29E" strokeWidth={0.8} />
                </React.Fragment>
              );
            })}
            {/* central stage */}
            <Ellipse cx={40} cy={44} rx={17} ry={7} fill="#B45309" />
            <Ellipse cx={40} cy={42} rx={17} ry={7} fill="#D97706" />
            {/* banners at L2+ */}
            {lv >= 2 && (
              <React.Fragment>
                <Rect x={10} y={2} width={4} height={12} fill="#7C3AED" />
                <Rect x={66} y={2} width={4} height={12} fill="#7C3AED" />
              </React.Fragment>
            )}
            {/* glowing braziers at L3 */}
            {lv >= 3 && (
              <React.Fragment>
                <Ellipse cx={24} cy={42} rx={2.6} ry={3.6} fill="#FBBF24" />
                <Ellipse cx={24} cy={43} rx={1.2} ry={2} fill="#FEF3C7" />
                <Ellipse cx={56} cy={42} rx={2.6} ry={3.6} fill="#FBBF24" />
                <Ellipse cx={56} cy={43} rx={1.2} ry={2} fill="#FEF3C7" />
              </React.Fragment>
            )}
          </Svg>
        </View>
      );
    }
    case "fountain-plaza": {
      // Fountain Plaza — a stone fountain with arcing water, benches at L2+,
      // flower rings at L3. A quiet gathering place.
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(s * 0.92)}
          <Svg width={s} height={s * 0.72} viewBox="0 0 80 58">
            {/* plaza stone */}
            <Ellipse cx={40} cy={48} rx={32} ry={8} fill="#D6D3D1" />
            <Ellipse cx={40} cy={47} rx={32} ry={8} fill="#E7E5E4" />
            {/* fountain basin */}
            <Ellipse cx={40} cy={40} rx={16} ry={7} fill="#A8A29E" />
            <Ellipse cx={40} cy={38.5} rx={13} ry={5.4} fill="#7DD3FC" />
            <Ellipse cx={40} cy={38.5} rx={13} ry={5.4} fill="#FFFFFF" opacity={0.25} />
            {/* central column */}
            <Rect x={37.5} y={20} width={5} height={18} rx={2} fill="#C7BFAE" />
            <Ellipse cx={40} cy={20} rx={6} ry={2.6} fill="#D6D3D1" />
            {/* arcing water */}
            <Path d="M40 18 C 30 26, 28 32, 28 36" stroke="#7DD3FC" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.85} />
            <Path d="M40 18 C 50 26, 52 32, 52 36" stroke="#7DD3FC" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.85} />
            <Path d="M40 18 L40 34" stroke="#BAE6FD" strokeWidth={2.6} strokeLinecap="round" opacity={0.9} />
            {/* sparkles */}
            <Circle cx={30} cy={30} r={1.4} fill="#FFFFFF" opacity={0.9} />
            <Circle cx={50} cy={30} r={1.4} fill="#FFFFFF" opacity={0.9} />
            {/* benches at L2+ */}
            {lv >= 2 && (
              <React.Fragment>
                <Rect x={8} y={42} width={12} height={3.4} rx={1.7} fill="#92400E" />
                <Rect x={60} y={42} width={12} height={3.4} rx={1.7} fill="#92400E" />
              </React.Fragment>
            )}
            {/* flower ring at L3 */}
            {lv >= 3 && (
              <React.Fragment>
                {[18, 30, 42, 54, 64].map((fx) => (
                  <React.Fragment key={fx}>
                    <Circle cx={fx} cy={50} r={2.4} fill="#F472B6" />
                    <Circle cx={fx} cy={50} r={1.1} fill="#FDE68A" />
                  </React.Fragment>
                ))}
              </React.Fragment>
            )}
          </Svg>
        </View>
      );
    }
    case "hospital": {
      // Hospital — white healing hall with a red cross, tall windows,
      // entrance canopy. Grander with level: more floors of windows.
      const H = artH ?? s;
      const w = s * 0.92;
      const sideW = Math.max(5, w * 0.1);
      const rows = lv >= 3 ? 4 : lv >= 2 ? 3 : 2;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.1)}
          <View style={{ width: w, height: H * 0.92, flexDirection: "row" }}>
            <View style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
              {/* cross sign */}
              <View style={{ width: s * 0.22, height: s * 0.22, backgroundColor: "#FFFFFF", borderRadius: 6, borderWidth: 2, borderColor: "#DC2626", alignItems: "center", justifyContent: "center", marginBottom: 4, zIndex: 2 }}>
                <View style={{ width: s * 0.12, height: s * 0.045, backgroundColor: "#DC2626", borderRadius: 2 }} />
                <View style={{ width: s * 0.045, height: s * 0.12, backgroundColor: "#DC2626", borderRadius: 2, marginTop: -s * 0.0825 }} />
              </View>
              {/* facade */}
              <View style={{ width: w * 0.94, height: H * 0.62, backgroundColor: "#F8FAFC", borderWidth: 2, borderColor: "#CBD5E1", borderBottomLeftRadius: 5, alignItems: "center", paddingTop: s * 0.04 }}>
                {Array.from({ length: rows }).map((_, r) => (
                  <View key={r} style={{ flexDirection: "row", marginVertical: s * 0.02 }}>
                    {[0, 1, 2].map((c) => (
                      <View key={c} style={{ width: s * 0.13, height: s * 0.1, backgroundColor: isLit(r, c) ? LIT : "#BFDBFE", marginHorizontal: s * 0.03, borderRadius: 3, borderWidth: 1, borderColor: "#93C5FD" }} />
                    ))}
                  </View>
                ))}
                {/* entrance canopy */}
                <View style={{ width: s * 0.4, height: s * 0.05, backgroundColor: "#DC2626", borderRadius: 3, marginTop: s * 0.03 }} />
                <View style={{ width: s * 0.22, height: s * 0.12, backgroundColor: "#1F2937", borderTopLeftRadius: 6, borderTopRightRadius: 6, marginTop: 1 }} />
              </View>
            </View>
            <View style={{ width: sideW, backgroundColor: "#D7DEE8", borderBottomRightRadius: 5, marginBottom: 2 }}>
              <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, backgroundColor: "#FFFFFF", opacity: 0.3 }} />
            </View>
          </View>
        </View>
      );
    }
    case "inn": {
      // Wayside Inn — warm timber inn. L1: cozy single story with a hanging
      // sign. L2: second story + porch awning. L3: grand inn with balcony,
      // gold trim, and glowing lanterns.
      const H = artH ?? s;
      const w = s * 0.92;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.1)}
          {lv >= 2 && (
            <View style={{ width: w * 0.8, height: H * 0.22, backgroundColor: "#EAD9AE", borderWidth: 2, borderColor: "#8A5A2B", borderBottomWidth: 0, borderTopLeftRadius: 4, borderTopRightRadius: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: s * 0.08 }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ width: s * 0.11, height: s * 0.11, backgroundColor: isLit(i, 1) ? LIT : "#BEE3F8", borderRadius: 3, borderWidth: 1, borderColor: "#8A5A2B" }} />
              ))}
              {sideShade(w * 0.8, H * 0.22, 4)}
            </View>
          )}
          <View style={{ width: w, height: H * (lv >= 2 ? 0.42 : 0.52), backgroundColor: "#F3E3BC", borderWidth: 2, borderColor: "#8A5A2B", borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}>
            {sideShade(w, H * 0.52, 4)}
            {/* timber framing */}
            <View style={{ position: "absolute", top: 0, bottom: 0, left: w * 0.3, width: 3, backgroundColor: "#8A5A2B", opacity: 0.85 }} />
            <View style={{ position: "absolute", top: 0, bottom: 0, right: w * 0.3, width: 3, backgroundColor: "#8A5A2B", opacity: 0.85 }} />
            <View style={{ position: "absolute", top: s * 0.06, left: s * 0.08, width: s * 0.16, height: s * 0.13, backgroundColor: isLit(0, 0) ? LIT : "#BEE3F8", borderRadius: 3, borderWidth: 1.5, borderColor: "#8A5A2B" }} />
            <View style={{ position: "absolute", bottom: 0, left: w / 2 - s * 0.09, width: s * 0.18, height: s * 0.26, backgroundColor: "#6B4423", borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 1.5, borderColor: "#4E2F16" }} />
            {lv >= 2 && (
              <View style={{ position: "absolute", top: -s * 0.04, left: w * 0.05, right: w * 0.05, height: s * 0.07, backgroundColor: "#B45309", borderRadius: 3, borderWidth: 1.5, borderColor: "#8A3D06" }} />
            )}
            {lv >= 3 && (
              <View style={{ position: "absolute", top: -s * 0.16, left: w * 0.1, right: w * 0.1, height: s * 0.09, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                {[0, 1].map((i) => (
                  <View key={i} style={{ width: s * 0.1, height: s * 0.14, backgroundColor: "#FDE68A", borderRadius: 4, borderWidth: 1.5, borderColor: "#8A6D1C" }} />
                ))}
                <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: "#3F2D1C", borderRadius: 3, borderWidth: 1.5, borderColor: "#C9963C" }}>
                  <Text style={{ color: "#F4D47C", fontSize: 9, fontWeight: "800", letterSpacing: 2 }}>INN</Text>
                </View>
              </View>
            )}
          </View>
          {/* hanging sign */}
          <View style={{ position: "absolute", bottom: H * 0.52 + (lv >= 2 ? H * 0.42 : 0) - s * 0.1, left: s * 0.1, alignItems: "center" }}>
            <View style={{ width: 3, height: s * 0.14, backgroundColor: "#4E2F16" }} />
            <View style={{ width: s * 0.22, height: s * 0.13, backgroundColor: "#7A5230", borderRadius: 4, borderWidth: 1.5, borderColor: "#4E2F16", alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: s * 0.07, height: s * 0.05, borderRadius: s * 0.025, backgroundColor: "#FDE68A" }} />
            </View>
          </View>
        </View>
      );
    }
    case "carpenter": {
      // Carpenter's Workshop — timber workshop. L1: rough wooden shop, saw
      // sign. L2: longer, stacked logs. L3: grand timber frame with glass
      // display window of finished furniture.
      const H = artH ?? s;
      const w = s * 0.92;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.1)}
          {lv >= 2 && (
            <View style={{ position: "absolute", bottom: 0, right: s * 0.02, width: s * 0.26, height: s * 0.34, alignItems: "center", justifyContent: "flex-end" }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ width: s * 0.24 - i * s * 0.02, height: s * 0.07, borderRadius: s * 0.035, backgroundColor: "#8A5A2B", borderWidth: 1.5, borderColor: "#5E3D22", marginBottom: -s * 0.015 }} />
              ))}
            </View>
          )}
          <View style={{ width: w, height: H * 0.58, backgroundColor: "#C69A63", borderWidth: 2, borderColor: "#5E3D22", borderRadius: 4 }}>
            {sideShade(w, H * 0.58, 4)}
            {[0.22, 0.5, 0.78].map((fx, i) => (
              <View key={i} style={{ position: "absolute", top: 0, bottom: 0, left: w * fx - 2, width: 4, backgroundColor: "#8A5A2B", opacity: 0.6 }} />
            ))}
            {/* gabled roof */}
            <Svg width={w} height={s * 0.22} viewBox={`0 0 100 24`} style={{ position: "absolute", top: -s * 0.2, left: -2 }}>
              <Polygon points={`0,24 50,2 100,24`} fill="#7A5230" stroke="#5E3D22" strokeWidth={2.5} />
              {lv >= 3 && <Polygon points={`20,24 50,8 80,24`} fill="#8A6D1C" opacity={0.45} />}
            </Svg>
            {/* saw blade sign */}
            <View style={{ position: "absolute", top: s * 0.05, left: s * 0.06, width: s * 0.15, height: s * 0.15, borderRadius: s * 0.075, backgroundColor: "#D1D5DB", borderWidth: 2, borderColor: "#6B7280", alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: s * 0.05, height: s * 0.05, borderRadius: s * 0.025, backgroundColor: "#6B7280" }} />
            </View>
            {/* window — furniture display at L3 */}
            <View style={{ position: "absolute", top: s * 0.2, right: s * 0.08, width: s * 0.3, height: s * 0.2, backgroundColor: lv >= 3 ? "#FDECC8" : isLit(1, 2) ? LIT : "#BEE3F8", borderRadius: 4, borderWidth: 1.5, borderColor: "#5E3D22", alignItems: "center", justifyContent: "center" }}>
              {lv >= 3 && (
                <Svg width={s * 0.22} height={s * 0.14} viewBox="0 0 30 20">
                  <Rect x={3} y={6} width={24} height={4} rx={2} fill="#8A5A2B" />
                  <Rect x={5} y={10} width={3} height={8} fill="#8A5A2B" />
                  <Rect x={22} y={10} width={3} height={8} fill="#8A5A2B" />
                </Svg>
              )}
            </View>
            <View style={{ position: "absolute", bottom: 0, left: w / 2 - s * 0.1, width: s * 0.2, height: s * 0.24, backgroundColor: "#5E3D22", borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
          </View>
        </View>
      );
    }
    case "pottery": {
      // Pottery Studio — kiln and clay. L1: hut + round kiln. L2: chimney
      // with smoke + wheel window. L3: grand studio, tall kiln, gallery row.
      const H = artH ?? s;
      const w = s * 0.92;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.1)}
          {lv >= 2 && (
            <Svg width={s * 0.3} height={s * 0.3} viewBox="0 0 30 30" style={{ position: "absolute", bottom: H * 0.52, left: s * 0.62 }}>
              <Path d="M12 28 C10 20, 16 16, 13 10 C11 6, 15 4, 15 1" fill="none" stroke="#D1D5DB" strokeWidth={3.5} strokeLinecap="round" opacity={0.9} />
              <Path d="M19 28 C17 22, 22 19, 20 14" fill="none" stroke="#E5E7EB" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
            </Svg>
          )}
          {/* kiln dome */}
          <View style={{ position: "absolute", bottom: 0, left: s * 0.04, width: s * 0.3, height: s * (lv >= 3 ? 0.42 : 0.32), backgroundColor: "#B45309", borderWidth: 2, borderColor: "#7A3606", borderTopLeftRadius: s * 0.15, borderTopRightRadius: s * 0.15 }}>
            <View style={{ position: "absolute", bottom: s * 0.05, left: s * 0.1, width: s * 0.1, height: s * 0.12, backgroundColor: "#1F2937", borderTopLeftRadius: 5, borderTopRightRadius: 5 }} />
            <View style={{ position: "absolute", bottom: s * 0.07, left: s * 0.115, width: s * 0.07, height: s * 0.08, backgroundColor: "#F97316", borderRadius: 3, opacity: 0.9 }} />
          </View>
          <View style={{ width: w * 0.78, height: H * (lv >= 3 ? 0.52 : 0.44), backgroundColor: "#E7D3A8", borderWidth: 2, borderColor: "#8A5A2B", borderRadius: 4, marginLeft: s * 0.12 }}>
            {sideShade(w * 0.78, H * 0.52, 4)}
            <View style={{ position: "absolute", top: s * 0.05, left: s * 0.06, width: s * 0.2, height: s * 0.14, backgroundColor: isLit(2, 0) ? LIT : "#BEE3F8", borderRadius: 4, borderWidth: 1.5, borderColor: "#8A5A2B", alignItems: "center", justifyContent: "center" }}>
              {lv >= 2 && (
                <Svg width={s * 0.13} height={s * 0.09} viewBox="0 0 26 18">
                  <Rect x={4} y={12} width={18} height={4} rx={2} fill="#6B7280" />
                  <Ellipse cx={13} cy={9} rx={6} ry={3} fill="#C69A63" stroke="#8A5A2B" strokeWidth={1.5} />
                </Svg>
              )}
            </View>
            {lv >= 3 && (
              <View style={{ position: "absolute", top: s * 0.05, right: s * 0.06, width: s * 0.2, height: s * 0.14, backgroundColor: "#FDECC8", borderRadius: 4, borderWidth: 1.5, borderColor: "#C9963C", flexDirection: "row", alignItems: "flex-end", justifyContent: "center", paddingBottom: 3 }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ width: s * 0.045, height: s * (0.06 + i * 0.015), borderRadius: 2, backgroundColor: ["#C97FA8", "#7FA8C9", "#D96C47"][i], marginHorizontal: 1.5, borderWidth: 1, borderColor: "rgba(0,0,0,0.15)" }} />
                ))}
              </View>
            )}
            <View style={{ position: "absolute", bottom: 0, left: s * 0.1, width: s * 0.16, height: s * 0.2, backgroundColor: "#6B4423", borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
          </View>
          {/* pots outside */}
          <View style={{ position: "absolute", bottom: 0, right: s * 0.06, flexDirection: "row", alignItems: "flex-end" }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ width: s * 0.11, height: s * (0.13 + i * 0.03), borderRadius: s * 0.045, backgroundColor: i ? "#C97FA8" : "#B45309", borderWidth: 1.5, borderColor: "#5E3D22", marginLeft: 3 }} />
            ))}
          </View>
        </View>
      );
    }
    case "music-hall": {
      // Music Hall — songs rise here. L1: brick hall, arched window, note.
      // L2: columns + marquee. L3: grand hall with gold dome and flags.
      const H = artH ?? s;
      const w = s * 0.94;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.1)}
          {lv >= 3 && (
            <Svg width={s * 0.5} height={s * 0.28} viewBox="0 0 60 34" style={{ marginBottom: -4 }}>
              <Path d="M6 32 A24 24 0 0 1 54 32 Z" fill="#C9963C" stroke="#8A6D1C" strokeWidth={2} />
              <Line x1={30} y1={2} x2={30} y2={10} stroke="#8A6D1C" strokeWidth={3} />
              <Circle cx={30} cy={1.5} r={2.5} fill="#C9963C" />
            </Svg>
          )}
          <View style={{ width: w, height: H * (lv >= 3 ? 0.5 : 0.56), backgroundColor: "#B4563F", borderWidth: 2, borderColor: "#7A3226", borderRadius: 4 }}>
            {sideShade(w, H * 0.56, 4)}
            {/* arched window with a music note */}
            <View style={{ position: "absolute", top: s * 0.06, alignSelf: "center", width: s * 0.3, height: s * 0.24, backgroundColor: isLit(3, 1) ? LIT : "#FDECC8", borderTopLeftRadius: s * 0.15, borderTopRightRadius: s * 0.15, borderWidth: 2, borderColor: "#7A3226", alignItems: "center", justifyContent: "center" }}>
              <Svg width={s * 0.16} height={s * 0.16} viewBox="0 0 24 24">
                <Path d="M9 18 V6 L20 3.5 V15.5" fill="none" stroke="#7A3226" strokeWidth={2.2} strokeLinecap="round" />
                <Ellipse cx={6.5} cy={18} rx={3.4} ry={2.6} fill="#7A3226" />
                <Ellipse cx={17.5} cy={15.5} rx={3.4} ry={2.6} fill="#7A3226" />
              </Svg>
            </View>
            {lv >= 2 && (
              <View style={{ position: "absolute", top: s * 0.32, left: s * 0.05, right: s * 0.05, height: s * 0.1, backgroundColor: "#F8FAFC", borderRadius: 3, borderWidth: 1.5, borderColor: "#7A3226", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#7A3226", fontSize: 8, fontWeight: "800", letterSpacing: 3 }}>TONIGHT</Text>
              </View>
            )}
            {lv >= 2 && [0.06, 0.94].map((fx, i) => (
              <View key={i} style={{ position: "absolute", top: s * 0.04, bottom: 0, left: w * fx - s * 0.035, width: s * 0.07, backgroundColor: "#F8FAFC", borderRadius: 3, borderWidth: 1.5, borderColor: "#D6D3D1" }} />
            ))}
            <View style={{ position: "absolute", bottom: 0, alignSelf: "center", width: s * 0.26, height: s * 0.22, backgroundColor: "#4E2418", borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 1.5, borderColor: "#2E1410" }} />
          </View>
        </View>
      );
    }
    case "tailor": {
      // Tailor — cut and sewn to measure. L1: shop with scissors sign.
      // L2: striped awning + fabric window. L3: boutique with mannequin.
      const H = artH ?? s;
      const w = s * 0.92;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.1)}
          <View style={{ width: w, height: H * 0.56, backgroundColor: "#E8D8F5", borderWidth: 2, borderColor: "#6D4C9E", borderRadius: 4 }}>
            {sideShade(w, H * 0.56, 4)}
            {lv >= 2 && (
              <View style={{ position: "absolute", top: -s * 0.02, left: -2, right: -2, height: s * 0.12, flexDirection: "row", borderTopLeftRadius: 6, borderTopRightRadius: 6, overflow: "hidden", borderWidth: 1.5, borderColor: "#6D4C9E" }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <View key={i} style={{ flex: 1, backgroundColor: i % 2 ? "#F8FAFC" : "#8B5CF6" }} />
                ))}
              </View>
            )}
            {/* scissors sign */}
            <View style={{ position: "absolute", top: s * 0.12, left: s * 0.06, width: s * 0.15, height: s * 0.15, borderRadius: s * 0.075, backgroundColor: "#F8FAFC", borderWidth: 2, borderColor: "#6D4C9E", alignItems: "center", justifyContent: "center" }}>
              <Svg width={s * 0.1} height={s * 0.1} viewBox="0 0 24 24">
                <Circle cx={7} cy={7} r={2.6} fill="none" stroke="#6D4C9E" strokeWidth={2} />
                <Circle cx={7} cy={17} r={2.6} fill="none" stroke="#6D4C9E" strokeWidth={2} />
                <Line x1={9} y1={8.5} x2={20} y2={17.5} stroke="#6D4C9E" strokeWidth={2.2} strokeLinecap="round" />
                <Line x1={9} y1={15.5} x2={20} y2={6.5} stroke="#6D4C9E" strokeWidth={2.2} strokeLinecap="round" />
              </Svg>
            </View>
            {/* fabric window */}
            <View style={{ position: "absolute", top: s * 0.1, right: s * 0.06, width: s * 0.32, height: s * 0.2, backgroundColor: isLit(4, 0) ? LIT : "#BEE3F8", borderRadius: 4, borderWidth: 1.5, borderColor: "#6D4C9E", flexDirection: "row", alignItems: "flex-end", justifyContent: "center", paddingBottom: 4 }}>
              {["#EF4444", "#F59E0B", "#10B981", "#3B82F6"].map((c, i) => (
                <View key={i} style={{ width: s * 0.055, height: s * (0.09 + (i % 2) * 0.03), backgroundColor: c, borderRadius: 2, marginHorizontal: 2, borderWidth: 1, borderColor: "rgba(0,0,0,0.15)" }} />
              ))}
            </View>
            {lv >= 3 && (
              <Svg width={s * 0.2} height={s * 0.26} viewBox="0 0 30 40" style={{ position: "absolute", bottom: 0, right: s * 0.04 }}>
                <Line x1={15} y1={26} x2={15} y2={38} stroke="#4B5563" strokeWidth={3} />
                <Line x1={8} y1={38} x2={22} y2={38} stroke="#4B5563" strokeWidth={3} />
                <Path d="M15 4 C10 4, 8 10, 9 16 L7 26 L23 26 L21 16 C22 10, 20 4, 15 4 Z" fill="#F472B6" stroke="#A21CAF" strokeWidth={1.5} />
              </Svg>
            )}
            <View style={{ position: "absolute", bottom: 0, left: w / 2 - s * 0.1, width: s * 0.2, height: s * 0.2, backgroundColor: "#4C2F75", borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
          </View>
        </View>
      );
    }
    case "observatory": {
      // Observatory — a dome under the open sky. L1: stone tower, dome, slit.
      // L2: taller, brass telescope poking through the slit. L3: grand dome
      // with gold trim, gallery platform, and star lights.
      const H = artH ?? s;
      const w = s * 0.7;
      const towerH = H * (lv >= 3 ? 0.62 : lv >= 2 ? 0.58 : 0.5);
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.3)}
          {/* dome */}
          <Svg width={w * 1.35} height={s * 0.3} viewBox="0 0 70 30" style={{ marginBottom: -s * 0.02 }}>
            <Path d="M4 28 A31 31 0 0 1 66 28 Z" fill={lv >= 3 ? "#C9963C" : "#94A3B8"} stroke="#475569" strokeWidth={2.5} />
            <Path d="M32 28 A31 31 0 0 1 38 3 L38 28 Z" fill="#1E293B" opacity={0.85} />
            {lv >= 2 && (
              <G>
                <Line x1={40} y1={14} x2={62} y2={6} stroke="#C9963C" strokeWidth={5} strokeLinecap="round" />
                <Circle cx={62} cy={6} r={4} fill="#FDE68A" stroke="#8A6D1C" strokeWidth={1.5} />
              </G>
            )}
          </Svg>
          <View style={{ width: w, height: towerH, backgroundColor: "#CBD5E1", borderWidth: 2, borderColor: "#64748B", borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}>
            {sideShade(w, towerH, 4)}
            {[0.2, 0.45, 0.7].map((fy, i) => (
              <View key={i} style={{ position: "absolute", top: towerH * fy, left: s * 0.06, width: s * 0.12, height: s * 0.1, backgroundColor: isLit(i, 3) ? LIT : "#1E293B", borderRadius: 3, borderWidth: 1, borderColor: "#475569" }} />
            ))}
            {lv >= 3 && (
              <View style={{ position: "absolute", bottom: s * 0.04, left: s * 0.05, right: s * 0.05, height: s * 0.05, flexDirection: "row", justifyContent: "space-around" }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#FDE68A", borderWidth: 1, borderColor: "#8A6D1C" }} />
                ))}
              </View>
            )}
            <View style={{ position: "absolute", bottom: 0, alignSelf: "center", width: s * 0.18, height: s * 0.2, backgroundColor: "#334155", borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
          </View>
        </View>
      );
    }
    case "bathhouse": {
      // Bathhouse — steam and warm pools. L1: tiled hall, arched door, steam.
      // L2: columns + open pool. L3: grand bathhouse with domes, waterfall.
      const H = artH ?? s;
      const w = s * 0.94;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.1)}
          {lv >= 3 && (
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: -s * 0.03 }}>
              {[0, 1].map((i) => (
                <Svg key={i} width={s * 0.24} height={s * 0.16} viewBox="0 0 30 20">
                  <Path d="M2 18 A13 13 0 0 1 28 18 Z" fill="#38BDF8" stroke="#0369A1" strokeWidth={2} />
                </Svg>
              ))}
            </View>
          )}
          <Svg width={s * 0.5} height={s * 0.18} viewBox="0 0 50 18" style={{ position: "absolute", bottom: H * 0.5, left: s * 0.1 }}>
            <Path d="M10 16 C8 12, 13 10, 11 6 C10 3, 13 2, 13 0" fill="none" stroke="#E0F2FE" strokeWidth={3} strokeLinecap="round" opacity={0.9} />
            <Path d="M24 16 C22 12, 27 10, 25 6 C24 3, 27 2, 27 0" fill="none" stroke="#F0F9FF" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
            <Path d="M38 16 C36 12, 41 10, 39 6" fill="none" stroke="#E0F2FE" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
          </Svg>
          <View style={{ width: w, height: H * 0.5, backgroundColor: "#D6EAF8", borderWidth: 2, borderColor: "#0369A1", borderRadius: 4 }}>
            {sideShade(w, H * 0.5, 4)}
            {lv >= 2 && [0.08, 0.9].map((fx, i) => (
              <View key={i} style={{ position: "absolute", top: -s * 0.06, bottom: 0, left: w * fx - s * 0.04, width: s * 0.08, backgroundColor: "#F8FAFC", borderRadius: 3, borderWidth: 1.5, borderColor: "#0369A1" }} />
            ))}
            <View style={{ position: "absolute", top: s * 0.05, alignSelf: "center", width: s * 0.4, height: s * 0.13, backgroundColor: "#38BDF8", borderRadius: s * 0.06, borderWidth: 2, borderColor: "#0369A1", overflow: "hidden" }}>
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, backgroundColor: "#BAE6FD" }} />
            </View>
            {lv >= 2 && (
              <View style={{ position: "absolute", bottom: s * 0.04, left: s * 0.06, width: s * 0.3, height: s * 0.1, backgroundColor: "#7DD3FC", borderRadius: 6, borderWidth: 1.5, borderColor: "#0369A1", opacity: 0.95 }} />
            )}
            <View style={{ position: "absolute", bottom: 0, alignSelf: "center", width: s * 0.24, height: s * 0.24, backgroundColor: "#075985", borderTopLeftRadius: s * 0.12, borderTopRightRadius: s * 0.12 }} />
          </View>
        </View>
      );
    }
    case "apothecary": {
      // Apothecary — herbs and remedies. L1: cottage with mortar sign.
      // L2: potion bottles in the window, hanging herbs. L3: grand shop with
      // a glass greenhouse dome and gold-trimmed shelves.
      const H = artH ?? s;
      const w = s * 0.92;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.1)}
          {lv >= 3 && (
            <Svg width={s * 0.5} height={s * 0.2} viewBox="0 0 60 24" style={{ marginBottom: -s * 0.02 }}>
              <Path d="M6 22 A24 24 0 0 1 54 22 Z" fill="#D9EDF5" opacity={0.6} stroke="#7FA8C9" strokeWidth={2} />
              <Line x1={12} y1={10} x2={22} y2={20} stroke="#FFFFFF" strokeWidth={2.5} opacity={0.7} strokeLinecap="round" />
              {[16, 30, 44].map((cx) => (
                <Ellipse key={cx} cx={cx} cy={17} rx={5} ry={3.5} fill="#3E8E41" />
              ))}
            </Svg>
          )}
          <View style={{ width: w, height: H * 0.56, backgroundColor: "#D9C6A5", borderWidth: 2, borderColor: "#5E3D22", borderRadius: 4 }}>
            {sideShade(w, H * 0.56, 4)}
            <Svg width={w} height={s * 0.2} viewBox={`0 0 100 22`} style={{ position: "absolute", top: -s * 0.18, left: -2 }}>
              <Polygon points={`0,22 50,0 100,22`} fill="#4C7A45" stroke="#2F5A2E" strokeWidth={2.5} />
            </Svg>
            {/* mortar & pestle sign */}
            <View style={{ position: "absolute", top: s * 0.06, left: s * 0.06, width: s * 0.15, height: s * 0.15, borderRadius: s * 0.075, backgroundColor: "#F8FAFC", borderWidth: 2, borderColor: "#5E3D22", alignItems: "center", justifyContent: "center" }}>
              <Svg width={s * 0.1} height={s * 0.1} viewBox="0 0 24 24">
                <Path d="M5 10 h14 c0 5-3 8-7 8 s-7-3-7-8 Z" fill="#8A5A2B" stroke="#5E3D22" strokeWidth={1.5} />
                <Line x1={9} y1={4} x2={17} y2={12} stroke="#5E3D22" strokeWidth={2.4} strokeLinecap="round" />
              </Svg>
            </View>
            {/* potion window */}
            <View style={{ position: "absolute", top: s * 0.06, right: s * 0.06, width: s * 0.34, height: s * 0.2, backgroundColor: isLit(0, 4) ? LIT : "#BEE3F8", borderRadius: 4, borderWidth: 1.5, borderColor: "#5E3D22", flexDirection: "row", alignItems: "flex-end", justifyContent: "center", paddingBottom: 3 }}>
              {["#C084FC", "#34D399", "#FBBF24", "#F472B6"].map((c, i) => (
                <View key={i} style={{ width: s * 0.05, height: s * (0.08 + (i % 3) * 0.03), borderRadius: 3, backgroundColor: c, marginHorizontal: 2, borderWidth: 1, borderColor: "rgba(0,0,0,0.2)" }} />
              ))}
            </View>
            {lv >= 2 && (
              <View style={{ position: "absolute", top: s * 0.3, left: s * 0.06, flexDirection: "row" }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ alignItems: "center", marginRight: 6 }}>
                    <View style={{ width: 2, height: s * 0.05, backgroundColor: "#5E3D22" }} />
                    <View style={{ width: s * 0.07, height: s * 0.09, borderRadius: s * 0.02, backgroundColor: ["#3E8E41", "#4C9A50", "#2F6B31"][i] }} />
                  </View>
                ))}
              </View>
            )}
            <View style={{ position: "absolute", bottom: 0, left: w / 2 - s * 0.1, width: s * 0.2, height: s * 0.2, backgroundColor: "#4E3421", borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
          </View>
        </View>
      );
    }
    case "town-hall": {
      // Town Hall — the civic heart. L1: hall with pediment + columns.
      // L2: clock tower rises. L3: grand tower with flag, banners, steps.
      const H = artH ?? s;
      const w = s * 0.94;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.15)}
          {lv >= 2 && (
            <View style={{ width: s * 0.26, height: H * (lv >= 3 ? 0.42 : 0.3), backgroundColor: "#E5E0D5", borderWidth: 2, borderColor: "#8A7F6A", borderBottomWidth: 0, marginBottom: -2, alignItems: "center", paddingTop: s * 0.05 }}>
              <View style={{ width: s * 0.15, height: s * 0.15, borderRadius: s * 0.075, backgroundColor: "#F8FAFC", borderWidth: 2.5, borderColor: "#8A7F6A", alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 2.5, height: s * 0.05, backgroundColor: "#3F3A32" }} />
                <View style={{ width: s * 0.035, height: 2.5, backgroundColor: "#3F3A32", marginTop: -2.5 }} />
              </View>
              {lv >= 3 && (
                <Svg width={s * 0.1} height={s * 0.12} viewBox="0 0 20 24" style={{ position: "absolute", top: -s * 0.12 }}>
                  <Line x1={2} y1={0} x2={2} y2={20} stroke="#8A7F6A" strokeWidth={2.5} />
                  <Polygon points="2,0 18,5 2,10" fill="#B91C1C" />
                </Svg>
              )}
            </View>
          )}
          <Svg width={w} height={s * 0.2} viewBox={`0 0 100 22`} style={{ marginBottom: -2 }}>
            <Polygon points={`2,22 50,2 98,22`} fill={lv >= 3 ? "#C9963C" : "#D6CDBB"} stroke="#8A7F6A" strokeWidth={2.5} />
          </Svg>
          <View style={{ width: w, height: H * 0.42, backgroundColor: "#EFE9DC", borderWidth: 2, borderColor: "#8A7F6A", borderBottomLeftRadius: 4, borderBottomRightRadius: 4, flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", paddingBottom: s * 0.04 }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ width: s * 0.09, height: H * 0.34, backgroundColor: "#F8FAFC", borderRadius: 3, borderWidth: 1.5, borderColor: "#B8AE99" }} />
            ))}
            {lv >= 3 && [0, 1].map((i) => (
              <View key={`b${i}`} style={{ position: "absolute", top: s * 0.05, left: i ? undefined : s * 0.03, right: i ? s * 0.03 : undefined, width: s * 0.07, height: s * 0.2, backgroundColor: "#1D4ED8", borderRadius: 2, borderWidth: 1, borderColor: "#1E3A8A" }} />
            ))}
          </View>
          {lv >= 3 && (
            <View style={{ flexDirection: "row", marginTop: 2 }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ width: w * (0.9 - i * 0.12), height: 5, backgroundColor: "#D6CDBB", borderRadius: 2, marginTop: 1, borderWidth: 1, borderColor: "#B8AE99" }} />
              ))}
            </View>
          )}
        </View>
      );
    }
    case "post-office": {
      // Post Office — letters and parcels. L1: small office, envelope sign,
      // mailbox outside. L2: sorting window + parcel stack. L3: grand hall,
      // flag, gold trim.
      const H = artH ?? s;
      const w = s * 0.92;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.1)}
          <View style={{ position: "absolute", bottom: 0, left: s * 0.03, alignItems: "center" }}>
            <View style={{ width: s * 0.16, height: s * 0.2, backgroundColor: "#1D4ED8", borderRadius: 5, borderWidth: 2, borderColor: "#1E3A8A", alignItems: "center", paddingTop: s * 0.03 }}>
              <View style={{ width: s * 0.1, height: s * 0.05, backgroundColor: "#F8FAFC", borderRadius: 2 }} />
              <View style={{ width: s * 0.06, height: s * 0.03, backgroundColor: "#BFDBFE", borderRadius: 2, marginTop: 3 }} />
            </View>
            <View style={{ width: 3, height: s * 0.06, backgroundColor: "#1E3A8A" }} />
          </View>
          <View style={{ width: w, height: H * 0.56, backgroundColor: "#EDE9E3", borderWidth: 2, borderColor: "#6B7280", borderRadius: 4, marginLeft: s * 0.1 }}>
            {sideShade(w, H * 0.56, 4)}
            {/* envelope sign */}
            <View style={{ position: "absolute", top: s * 0.05, alignSelf: "center", width: s * 0.2, height: s * 0.13, backgroundColor: "#F8FAFC", borderRadius: 3, borderWidth: 2, borderColor: "#1D4ED8", alignItems: "center", justifyContent: "center" }}>
              <Svg width={s * 0.13} height={s * 0.09} viewBox="0 0 26 18">
                <Rect x={1} y={1} width={24} height={16} rx={2} fill="#F8FAFC" stroke="#1D4ED8" strokeWidth={1.5} />
                <Path d="M2 3 L13 11 L24 3" fill="none" stroke="#1D4ED8" strokeWidth={1.5} />
              </Svg>
            </View>
            {lv >= 2 && (
              <View style={{ position: "absolute", top: s * 0.2, right: s * 0.05, alignItems: "center" }}>
                {[0, 1].map((i) => (
                  <View key={i} style={{ width: s * 0.16 - i * s * 0.03, height: s * 0.09, backgroundColor: "#C69A63", borderRadius: 2, borderWidth: 1.5, borderColor: "#8A5A2B", marginTop: i ? -s * 0.02 : 0 }} />
                ))}
              </View>
            )}
            {lv >= 3 && (
              <View style={{ position: "absolute", top: s * 0.2, left: s * 0.05, width: s * 0.16, height: s * 0.12, backgroundColor: isLit(5, 2) ? LIT : "#BEE3F8", borderRadius: 3, borderWidth: 1.5, borderColor: "#C9963C" }} />
            )}
            <View style={{ position: "absolute", bottom: 0, left: w / 2 - s * 0.1, width: s * 0.2, height: s * 0.22, backgroundColor: "#374151", borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
          </View>
        </View>
      );
    }
    case "grand-library": {
      // Grand Library — towering shelves of wisdom. Pseudo-3D tall block;
      // taller shelf rows with level, brass entry doors at L3.
      const H = artH ?? s;
      const rows = lv >= 3 ? 6 : lv >= 2 ? 4 : 3;
      return tallBlock({
        s, H, w: s * 0.78,
        front: "#3B4A6B", side: "#27324B", roof: "#1B2338",
        lit: isLit, LIT,
        rows, cols: 3,
        winW: s * 0.14, winH: s * 0.09, gap: s * 0.035,
        winOff: "#232D47", topPad: H * 0.05,
        extraTop: (
          <Svg width={s * 0.5} height={s * 0.16} viewBox="0 0 60 20" style={{ position: "absolute", top: -s * 0.13, alignSelf: "center" }}>
            <Path d="M8 18 L14 18 L14 6 L20 10 L26 6 L26 18 L32 18 L32 6 L38 10 L44 6 L44 18 L52 18" fill="none" stroke="#C9963C" strokeWidth={2.5} />
            <Rect x={6} y={16} width={48} height={4} rx={2} fill="#8A6D1C" />
          </Svg>
        ),
        extraBottom: lv >= 3 ? (
          <View style={{ position: "absolute", bottom: 0, flexDirection: "row", alignSelf: "center" }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ width: s * 0.11, height: s * 0.16, backgroundColor: "#8A6D1C", borderWidth: 1.5, borderColor: "#5E4A12", marginHorizontal: s * 0.02, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
            ))}
          </View>
        ) : undefined,
      });
    }
    case "opera-house": {
      // Opera House — a grand stage with a marquee and poster windows.
      // L1: hall + marquee. L2: columns + gold trim. L3: statues, tall
      // marquee, flags, glowing poster cases.
      const H = artH ?? s;
      const w = s * 0.98;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.08)}
          {lv >= 3 && (
            <View style={{ flexDirection: "row", marginBottom: -s * 0.02 }}>
              {[0, 1].map((i) => (
                <Svg key={i} width={s * 0.14} height={s * 0.22} viewBox="0 0 28 44" style={{ marginHorizontal: s * 0.14 }}>
                  <Circle cx={14} cy={10} r={6} fill="#D6CDBB" stroke="#8A7F6A" strokeWidth={1.5} />
                  <Path d="M8 16 h12 l3 22 h-18 Z" fill="#D6CDBB" stroke="#8A7F6A" strokeWidth={1.5} />
                  <Rect x={6} y={38} width={16} height={5} rx={2} fill="#8A7F6A" />
                </Svg>
              ))}
            </View>
          )}
          <View style={{ width: w, height: H * 0.62, backgroundColor: "#5B2B3A", borderWidth: 2, borderColor: "#3A1B26", borderRadius: 5 }}>
            {sideShade(w, H * 0.62, 5)}
            {/* marquee */}
            <View style={{ position: "absolute", top: s * 0.1, left: s * 0.06, right: s * 0.06, height: s * 0.13, backgroundColor: "#F8FAFC", borderRadius: 4, borderWidth: 2, borderColor: lv >= 2 ? "#C9963C" : "#3A1B26", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#5B2B3A", fontSize: 9, fontWeight: "800", letterSpacing: 4 }}>OPERA</Text>
              {lv >= 3 && (
                <View style={{ position: "absolute", top: -s * 0.045, flexDirection: "row" }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#FDE68A", marginHorizontal: 3, borderWidth: 1, borderColor: "#8A6D1C" }} />
                  ))}
                </View>
              )}
            </View>
            {/* poster cases */}
            {[0.14, 0.86].map((fx, i) => (
              <View key={i} style={{ position: "absolute", top: s * 0.28, left: w * fx - s * 0.11, width: s * 0.22, height: s * 0.2, backgroundColor: isLit(i, 6) ? LIT : "#FDECC8", borderRadius: 4, borderWidth: 2, borderColor: lv >= 2 ? "#C9963C" : "#3A1B26", alignItems: "center", justifyContent: "center" }}>
                <Svg width={s * 0.1} height={s * 0.12} viewBox="0 0 20 24">
                  <Path d="M6 22 V8 L14 4 V20" fill="none" stroke="#5B2B3A" strokeWidth={1.8} />
                  <Ellipse cx={4.5} cy={22} rx={2.8} ry={2.2} fill="#5B2B3A" />
                  <Ellipse cx={12.5} cy={20} rx={2.8} ry={2.2} fill="#5B2B3A" />
                </Svg>
              </View>
            ))}
            {lv >= 2 && [0.06, 0.94].map((fx, i) => (
              <View key={`c${i}`} style={{ position: "absolute", top: s * 0.06, bottom: 0, left: w * fx - s * 0.035, width: s * 0.07, backgroundColor: "#F1E8D8", borderRadius: 3, borderWidth: 1.5, borderColor: "#C9BBA0" }} />
            ))}
            {/* grand doors */}
            <View style={{ position: "absolute", bottom: 0, alignSelf: "center", width: s * 0.3, height: s * 0.24, backgroundColor: "#2E1410", borderTopLeftRadius: 10, borderTopRightRadius: 10, borderWidth: 2, borderColor: lv >= 2 ? "#C9963C" : "#1A0D08", flexDirection: "row" }}>
              <View style={{ flex: 1, borderRightWidth: 1.5, borderColor: lv >= 2 ? "#C9963C" : "#1A0D08" }} />
              <View style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      );
    }
    case "museum": {
      // Museum — a classical hall of exhibits. L1: pediment + columns, one
      // exhibit window. L2: wider, statue out front. L3: grand museum with
      // tall banners, glass dome, and lit exhibit halls.
      const H = artH ?? s;
      const w = s * 0.98;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.08)}
          {lv >= 3 && (
            <Svg width={s * 0.4} height={s * 0.16} viewBox="0 0 60 24" style={{ marginBottom: -s * 0.02 }}>
              <Path d="M6 22 A24 24 0 0 1 54 22 Z" fill="#D9EDF5" opacity={0.55} stroke="#7FA8C9" strokeWidth={2} />
            </Svg>
          )}
          <Svg width={w} height={s * 0.16} viewBox="0 0 100 18" style={{ marginBottom: -2 }}>
            <Polygon points="2,18 50,2 98,18" fill={lv >= 3 ? "#C9963C" : "#E5E0D5"} stroke="#8A7F6A" strokeWidth={2.5} />
          </Svg>
          <View style={{ width: w, height: H * 0.5, backgroundColor: "#EFE9DC", borderWidth: 2, borderColor: "#8A7F6A", borderBottomLeftRadius: 5, borderBottomRightRadius: 5, flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", paddingBottom: s * 0.03 }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ width: s * 0.08, height: H * 0.42, backgroundColor: "#F8FAFC", borderRadius: 3, borderWidth: 1.5, borderColor: "#B8AE99" }} />
            ))}
            {/* exhibit windows */}
            <View style={{ position: "absolute", top: s * 0.06, left: s * 0.12, width: s * 0.2, height: s * 0.14, backgroundColor: isLit(2, 7) ? LIT : "#D9EDF5", borderRadius: 3, borderWidth: 1.5, borderColor: "#7FA8C9", alignItems: "center", justifyContent: "center" }}>
              <Svg width={s * 0.1} height={s * 0.09} viewBox="0 0 20 18">
                <Rect x={4} y={6} width={12} height={9} rx={2} fill="#C9963C" stroke="#8A6D1C" strokeWidth={1.2} />
                <Circle cx={10} cy={5} r={3.5} fill="#D9EDF5" stroke="#7FA8C9" strokeWidth={1.2} />
              </Svg>
            </View>
            <View style={{ position: "absolute", top: s * 0.06, right: s * 0.12, width: s * 0.2, height: s * 0.14, backgroundColor: isLit(3, 8) ? LIT : "#D9EDF5", borderRadius: 3, borderWidth: 1.5, borderColor: "#7FA8C9", alignItems: "center", justifyContent: "center" }}>
              <Svg width={s * 0.1} height={s * 0.09} viewBox="0 0 20 18">
                <Path d="M10 2 L16 14 L4 14 Z" fill="#94A3B8" stroke="#475569" strokeWidth={1.2} />
                <Rect x={4} y={14} width={12} height={3} fill="#475569" />
              </Svg>
            </View>
            <View style={{ position: "absolute", bottom: 0, alignSelf: "center", width: s * 0.22, height: s * 0.2, backgroundColor: "#4A4238", borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
          </View>
          {lv >= 2 && (
            <View style={{ position: "absolute", bottom: 0, left: s * 0.02, alignItems: "center" }}>
              <Svg width={s * 0.16} height={s * 0.3} viewBox="0 0 32 60">
                <Circle cx={16} cy={12} r={7} fill="#D6CDBB" stroke="#8A7F6A" strokeWidth={1.5} />
                <Path d="M9 20 h14 l4 30 h-22 Z" fill="#D6CDBB" stroke="#8A7F6A" strokeWidth={1.5} />
                <Rect x={6} y={50} width={20} height={7} rx={2} fill="#8A7F6A" />
              </Svg>
            </View>
          )}
        </View>
      );
    }
    case "clock-tower": {
      // Clock Tower — the city's heartbeat. A tall stone tower with a giant
      // clock face, turning-gear hints, and a belfry. Taller with level.
      const H = artH ?? s;
      const w = s * 0.5;
      const towerH = H * (lv >= 3 ? 0.86 : lv >= 2 ? 0.78 : 0.68);
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.4)}
          {/* belfry cap */}
          <Svg width={w * 1.5} height={s * 0.2} viewBox="0 0 60 24" style={{ marginBottom: -s * 0.02 }}>
            <Polygon points="4,22 30,4 56,22" fill="#8A7F6A" stroke="#5E5646" strokeWidth={2.5} />
            {lv >= 3 && <Circle cx={30} cy={12} r={5} fill="#C9963C" stroke="#8A6D1C" strokeWidth={1.5} />}
          </Svg>
          <View style={{ width: w, height: towerH, backgroundColor: "#C9BFAE", borderWidth: 2, borderColor: "#8A7F6A", borderBottomLeftRadius: 4, borderBottomRightRadius: 4, alignItems: "center" }}>
            {sideShade(w, towerH, 4)}
            {/* giant clock face */}
            <View style={{ width: s * 0.34, height: s * 0.34, borderRadius: s * 0.17, backgroundColor: "#F8FAFC", borderWidth: 3, borderColor: lv >= 3 ? "#C9963C" : "#5E5646", marginTop: s * 0.06, alignItems: "center", justifyContent: "center" }}>
              {/* 12 / 3 / 6 / 9 markers */}
              <View style={{ position: "absolute", top: 5, width: 3, height: 9, backgroundColor: "#5E5646", borderRadius: 1.5 }} />
              <View style={{ position: "absolute", bottom: 5, width: 3, height: 9, backgroundColor: "#5E5646", borderRadius: 1.5 }} />
              <View style={{ position: "absolute", left: 5, width: 9, height: 3, backgroundColor: "#5E5646", borderRadius: 1.5 }} />
              <View style={{ position: "absolute", right: 5, width: 9, height: 3, backgroundColor: "#5E5646", borderRadius: 1.5 }} />
              <View style={{ width: 3, height: s * 0.11, backgroundColor: "#1F2937", borderRadius: 1.5, transform: [{ rotate: "200deg" }], marginBottom: -s * 0.05 }} />
              <View style={{ width: 3, height: s * 0.08, backgroundColor: "#B91C1C", borderRadius: 1.5, transform: [{ rotate: "80deg" }], marginTop: -s * 0.04 }} />
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: lv >= 3 ? "#C9963C" : "#5E5646" }} />
            </View>
            {/* gear hints below the face */}
            <Svg width={w * 0.9} height={s * 0.22} viewBox="0 0 60 26" style={{ marginTop: s * 0.04 }}>
              <Circle cx={20} cy={13} r={9} fill="none" stroke="#8A7F6A" strokeWidth={3} />
              {[0, 45, 90, 135].map((a) => (
                <Line key={a} x1={20} y1={13} x2={20 + 9 * Math.cos((a * Math.PI) / 180)} y2={13 + 9 * Math.sin((a * Math.PI) / 180)} stroke="#8A7F6A" strokeWidth={2.5} />
              ))}
              <Circle cx={42} cy={13} r={6} fill="none" stroke="#A89E8C" strokeWidth={2.5} />
              <Circle cx={20} cy={13} r={2.5} fill="#8A7F6A" />
              <Circle cx={42} cy={13} r={2} fill="#A89E8C" />
            </Svg>
            {lv >= 2 && (
              <View style={{ width: s * 0.2, height: s * 0.1, backgroundColor: isLit(1, 9) ? LIT : "#FDE68A", borderRadius: 3, borderWidth: 1.5, borderColor: "#8A7F6A", marginTop: s * 0.03 }} />
            )}
            <View style={{ position: "absolute", bottom: 0, width: s * 0.2, height: s * 0.18, backgroundColor: "#4A4238", borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
          </View>
        </View>
      );
    }
    case "embassy": {
      // Embassy — flags of many lands. Pseudo-3D block with flag poles on
      // the roof; more flags and gold trim with level.
      const H = artH ?? s;
      const flags = lv >= 3 ? 5 : lv >= 2 ? 3 : 2;
      const flagColors = ["#B91C1C", "#1D4ED8", "#16A34A", "#F59E0B", "#7C3AED"];
      return tallBlock({
        s, H, w: s * 0.72,
        front: "#E8E2D4", side: "#C9BFAE", roof: "#8A7F6A",
        lit: isLit, LIT,
        rows: lv >= 3 ? 4 : 3, cols: 3,
        winW: s * 0.11, winH: s * 0.09, gap: s * 0.035,
        winOff: "#B8AE99", topPad: H * 0.05,
        extraTop: (
          <View style={{ position: "absolute", top: -s * 0.24, left: 0, right: 0, flexDirection: "row", justifyContent: "center" }}>
            {Array.from({ length: flags }).map((_, i) => (
              <Svg key={i} width={s * 0.16} height={s * 0.26} viewBox="0 0 32 52" style={{ marginHorizontal: 2 }}>
                <Line x1={4} y1={2} x2={4} y2={50} stroke="#5E5646" strokeWidth={3} />
                <Polygon points={`4,4 ${28},${10 + i * 2} 4,${16 + i * 2}`} fill={flagColors[i % flagColors.length]} stroke="#00000033" strokeWidth={1} />
              </Svg>
            ))}
          </View>
        ),
        extraBottom: (
          <View style={{ position: "absolute", bottom: 0, alignSelf: "center", width: s * 0.24, height: s * 0.2, backgroundColor: "#4A4238", borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 1.5, borderColor: lv >= 3 ? "#C9963C" : "#2E2A24" }} />
        ),
      });
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

/** Small SVG glyph for the Villager Cottage (no emoji). */
function CottageGlyph({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={9.5} y={2.5} width={3.4} height={6} rx={1} fill="#A8A29E" />
      <Path d="M3 12.5 L12 4.5 L21 12.5 Z" fill="#C2410C" />
      <Rect x={5.5} y={12.5} width={13} height={8.5} rx={1.5} fill="#FDE68A" />
      <Rect x={8} y={14.2} width={3.6} height={3.6} rx={1} fill="#FBBF24" stroke="#92400E" strokeWidth={1} />
      <Rect x={14.6} y={15} width={4} height={6} rx={1.5} fill="#92400E" />
    </Svg>
  );
}

/** Small SVG glyph for the Community Garden (no emoji). */
function GardenGlyph({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={14} width={18} height={7} rx={2} fill="#92400E" />
      <Rect x={3} y={14} width={18} height={2.4} rx={1.2} fill="#78350F" />
      <Rect x={10.8} y={7} width={2.4} height={8} rx={1.2} fill="#16A34A" />
      <Ellipse cx={8} cy={8.5} rx={3.2} ry={2} fill="#22C55E" />
      <Ellipse cx={16} cy={7.5} rx={3.2} ry={2} fill="#4ADE80" />
      <Circle cx={12} cy={5} r={2.2} fill="#FBBF24" />
    </Svg>
  );
}

/** Small SVG glyph for the Fountain Plaza (no emoji). */
function PlazaGlyph({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Ellipse cx={12} cy={19} rx={9} ry={3} fill="#D6D3D1" />
      <Ellipse cx={12} cy={18} rx={7} ry={2.4} fill="#7DD3FC" />
      <Rect x={10.8} y={8} width={2.4} height={10} rx={1.2} fill="#A8A29E" />
      <Path d="M12 7 C 8 11, 7 14, 7 16" stroke="#7DD3FC" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Path d="M12 7 C 16 11, 17 14, 17 16" stroke="#7DD3FC" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Circle cx={12} cy={6} r={1.6} fill="#BAE6FD" />
    </Svg>
  );
}

/** Small SVG glyph for the Amphitheater (no emoji). */
function AmphitheaterGlyph({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={14} width={18} height={3.4} rx={1.7} fill="#D6D3D1" />
      <Rect x={5} y={10} width={14} height={3.4} rx={1.7} fill="#C7BFAE" />
      <Rect x={7} y={6} width={10} height={3.4} rx={1.7} fill="#A8A29E" />
      <Ellipse cx={12} cy={19} rx={5} ry={2} fill="#D97706" />
    </Svg>
  );
}

/** Spinning coin with accumulated amount underneath. kind=xp shows XP styling. */
/**
 * Material 3 collect chip: a tonal pill with a gently flipping coin icon,
 * Material label typography, subtle elevation, and a state layer on press.
 * Coins and XP keep their tonal palettes; frenzy (2x) and FULL stay readable.
 */
/** How long one flying coin takes to reach the balance. */
const COIN_FLY_MS = 650;
/** When the awarded coins "land" — balance ticks up and pulses then. */
const COIN_LAND_MS = 850;

type CoinBurstData = {
  id: string;
  sx: number;
  sy: number;
  dx: number;
  dy: number;
  kind: "coins" | "xp";
};

/** One little coin (or XP bolt) flying from a building up to the balance. */
function CoinFlyer({ sx, sy, dx, dy, delay, kind, onDone }: { sx: number; sy: number; dx: number; dy: number; delay: number; kind: "coins" | "xp"; onDone: () => void }) {
  const t = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(t, { toValue: 1, duration: COIN_FLY_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(COIN_FLY_MS * 0.72),
          Animated.timing(fade, { toValue: 0, duration: COIN_FLY_MS * 0.28, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ]),
    ]);
    anim.start(({ finished }) => { if (finished) onDone(); });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [sx - dx, 0] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [sy - dy, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: dx - 11,
        top: dy - 11,
        transform: [{ translateX }, { translateY }],
        opacity: fade,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: kind === "xp" ? "#6750A4" : "#D4AF37",
          borderWidth: 1,
          borderColor: kind === "xp" ? "#4F378B" : "#B8860B",
          alignItems: "center",
          justifyContent: "center",
          elevation: 5,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 3,
        }}
      >
        <MaterialIcons name={kind === "xp" ? "bolt" : "monetization-on"} size={13} color="#FFFFFF" />
      </View>
    </Animated.View>
  );
}

/** A small fan of coins flying together from one collect point. */
function CoinBurst({ burst, onDone }: { burst: CoinBurstData; onDone: (id: string) => void }) {
  const COUNT = 4;
  const [landed, setLanded] = useState(0);
  useEffect(() => {
    if (landed >= COUNT) onDone(burst.id);
  }, [landed, burst.id, onDone]);
  return (
    <React.Fragment>
      {Array.from({ length: COUNT }, (_, i) => (
        <CoinFlyer
          key={i}
          sx={burst.sx + (i - (COUNT - 1) / 2) * 16}
          sy={burst.sy + (i % 2) * 12}
          dx={burst.dx}
          dy={burst.dy}
          delay={i * 80}
          kind={burst.kind}
          onDone={() => setLanded((n) => n + 1)}
        />
      ))}
    </React.Fragment>
  );
}

function SpinningCoin({ amount, kind = "coins", onCollect, frenzy = false, isFull = false }: { amount: number; kind?: "coins" | "xp"; onCollect: (pageX?: number, pageY?: number) => void; frenzy?: boolean; isFull?: boolean }) {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const collectAnim = useRef(new Animated.Value(0)).current;
  const [collecting, setCollecting] = useState(false);

  useEffect(() => {
    const flip = Animated.loop(
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    flip.start();
    return () => flip.stop();
  }, []);

  useEffect(() => {
    if (!frenzy) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [frenzy]);

  const rotateY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const hasAmount = amount > 0;
  const isXP = kind === "xp";

  // Compact amount label: large pending amounts use K so the pill never grows fat.
  const amountLabel = hasAmount
    ? isXP
      ? amount >= 1000 ? `+${(amount / 1000).toFixed(1)}K XP` : `+${Math.floor(amount)} XP`
      : amount >= 1000 ? `+${(amount / 1000).toFixed(1)}K` : `+${amount.toFixed(2)}`
    : "earning";

  // Material 3 tonal palettes.
  const palette = isXP
    ? { container: "#E8DEF8", onContainer: "#1D192B", icon: "#6750A4" }
    : hasAmount
      ? { container: frenzy ? "#FDE047" : "#FFDF9E", onContainer: "#402D00", icon: "#8A6D00" }
      : { container: "#EDEBE8", onContainer: "#6B6B6B", icon: "#9A9A9A" };

  const collectScale = collectAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });
  const collectOpacity = collectAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation();
        if (collecting) return;
        setCollecting(true);
        // Morph: shrink + fade, then hand off to the real collect (coins fly).
        Animated.timing(collectAnim, { toValue: 1, duration: 220, easing: Easing.inOut(Easing.sin), useNativeDriver: true }).start(({ finished }) => {
          if (finished) onCollect(e.nativeEvent.pageX, e.nativeEvent.pageY);
        });
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={({ pressed }) => ({
        alignItems: "center",
        zIndex: 10,
        opacity: pressed ? 0.82 : 1, // pressed state layer
      })}
    >
      <Animated.View
        style={{
          transform: [
            { scale: collecting ? collectScale : 1 },
            ...(frenzy && !collecting ? [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }] : []),
          ],
          opacity: collecting ? collectOpacity : 1,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: palette.container,
          borderRadius: 999, // Material pill
          paddingHorizontal: 6,
          paddingVertical: 3,
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.06)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.22,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        {/* Coin medallion with a gentle flip */}
        <Animated.View
          style={{
            transform: [{ rotateY }],
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: isXP ? palette.icon : "#D4AF37",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 5,
          }}
        >
          <MaterialIcons name={isXP ? "bolt" : "monetization-on"} size={11} color="#FFFFFF" />
        </Animated.View>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            letterSpacing: 0.3,
            color: palette.onContainer,
          }}
        >
          {amountLabel}
        </Text>
      </Animated.View>
      {frenzy && (
        <View style={{ position: "absolute", top: -7, right: -4, backgroundColor: "#CA8A04", borderRadius: 999, paddingHorizontal: 5, paddingVertical: 1, elevation: 2 }}>
          <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 0.5, color: "#FFFFFF" }}>2x</Text>
        </View>
      )}
      {isFull && !frenzy && (
        <View style={{ position: "absolute", top: -7, right: -4, backgroundColor: "#DC2626", borderRadius: 999, paddingHorizontal: 5, paddingVertical: 1, elevation: 2 }}>
          <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 0.5, color: "#FFFFFF" }}>FULL</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function HometownScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [town, setTown] = useState<TownState>(() => emptyTownState());
  const [activeMap, setActiveMap] = useState<TownMapId>("town");
  const [unlockedMaps, setUnlockedMaps] = useState<TownMapId[]>(["town"]);
  // Fast-length gate: Hometown (and the pawn) only appear on fasts longer
  // than 40 days. Set during init from the active fast's durationDays.
  const [hometownLocked, setHometownLocked] = useState(false);
  // Day/night page theme: re-evaluate every 5 minutes so the whole
  // screen shifts with the sky.
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => getTimeOfDay());
  useEffect(() => {
    const t = setInterval(() => setTimeOfDay(getTimeOfDay()), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
  const isNight = timeOfDay === "night";
  // City celebrations: load persisted state once (which milestones fired, etc.).
  useEffect(() => {
    loadCelebrations()
      .then((s) => {
        celebrationsRef.current = s;
        setCelebrationState(s);
      })
      .catch(() => undefined);
  }, []);
  const pt = PAGE_THEMES[timeOfDay];
  // Tap frenzy: 5+ rapid taps → 2x collects for 10s (5-min cooldown)
  const [frenzyActive, setFrenzyActive] = useState(false);
  const tapTimesRef = useRef<number[]>([]);
  const frenzyUntilRef = useRef(0);
  const lastFrenzyRef = useRef(0);
  // Per-minute income rates cached at mount tick, for the live interval tick.
  const perMinuteRateRef = useRef<Record<string, { coins: number; xp: number }>>({});
  // Live villager positions (town + city), updated by TownNPCs/CityNPCs.
  // Presence-gated income: buildings only earn when villagers are nearby.
  const townNpcPositionsRef = useRef<Array<{ x: number; y: number }>>([]);
  const cityNpcPositionsRef = useRef<Array<{ x: number; y: number }>>([]);
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
  const prayedTodayRef = useRef(0);
  prayedTodayRef.current = prayedToday;
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
  // Lighthouse: tap once a day for a blessing (+coins × level, verse); upgradeable 1-3.
  // It lives in the right border now (not on the map) — tap it there.
  const [lighthouseState, setLighthouseState] = useState<LighthouseState>(() => emptyLighthouse());
  const [lighthouseModalVisible, setLighthouseModalVisible] = useState(false);
  // Fireworks: celebration volley over the map on milestones (level-up, prayer bonuses).
  const [fireworksKey, setFireworksKey] = useState(0);
  const lastLevelRef = useRef<number | null>(null);
  // City celebrations: achievement moments that make Jonathan feel special.
  // Queue of banners + particles; one shows at a time, auto-dismisses.
  const [celebrationQueue, setCelebrationQueue] = useState<CelebrationSpec[]>([]);
  const [celebrationState, setCelebrationState] = useState(() => emptyCelebrations());
  const celebrationsRef = useRef(celebrationState);
  celebrationsRef.current = celebrationState;
  const celebrationIdRef = useRef(1);
  const queueCelebration = useCallback((kind: CelebrationKind, title: string, subtitle?: string) => {
    const id = celebrationIdRef.current++;
    setCelebrationQueue((q) => [...q, { id, kind, title, subtitle }]);
    // The border lighthouse sweeps its beam on milestones.
    setMilestonePulse((p) => p + 1);
  }, []);
  const persistCelebrations = useCallback((next: ReturnType<typeof emptyCelebrations>) => {
    celebrationsRef.current = next;
    setCelebrationState(next);
    saveCelebrations(next).catch(() => undefined);
  }, []);
  const dismissCelebration = useCallback(() => {
    setCelebrationQueue((q) => q.slice(1));
  }, []);
  // Border lighthouse reward animation: bumps whenever Jonathan earns coins
  // (lamp flares brighter) and on milestones (beam sweeps + rings).
  const [rewardPulse, setRewardPulse] = useState(0);
  const [milestonePulse, setMilestonePulse] = useState(0);
  // Street performer: plays a tune for a while after being tipped.
  const [performerPlaying, setPerformerPlaying] = useState(false);
  // Gathering places: Community Garden (harvest), Amphitheater (shows),
  // Library (study), Fountain Plaza (rest) — all tappable, all upgradeable.
  const [gardenState, setGardenState] = useState<GardenState>({ plantedAt: null, plantedLevel: 1 });
  const [lastShowAt, setLastShowAt] = useState(0);
  const [lastStudyAt, setLastStudyAt] = useState(0);
  const [lastRestAt, setLastRestAt] = useState(0);
  const [lastCheckupAt, setLastCheckupAt] = useState(0);
  // Schedule sync: Jonathan's pawn mimics his schedule — meals at restaurants,
  // doctor's at the hospital, movies at the amphitheater, rest at home, ministry
  // at the church. During an event the pawn/villagers gather instead of wandering.
  const [scheduleActivity, setScheduleActivity] = useState<ScheduleActivity | null>(null);
  /** Daily town visit streak — checked in on open. */
  const [streak, setStreak] = useState<StreakState>(emptyStreak);
  /** Surprise visitors on the town map. */
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [merchantDeal, setMerchantDeal] = useState<MerchantDeal | null>(null);
  /** Collections book modal. */
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [collectBreakdownOpen, setCollectBreakdownOpen] = useState(false);
  // Coin-fly FX: bursts of coins fly from collected buildings up to the
  // header pill, which ticks up (and pulses) when they land. The header
  // pill is a single morphing pill: it rests on the balance, turns gold
  // ("Collect X.XX") while coins are waiting, and flips to a green
  // "Collected!" face while the coins are in the air.
  const { width: windowW } = useWindowDimensions();
  const [bursts, setBursts] = useState<CoinBurstData[]>([]);
  const [collectFx, setCollectFx] = useState<{ coins: number; xp: number } | null>(null);
  const collectFlip = useRef(new Animated.Value(0)).current;
  // Header pill morph: 0 = resting balance face, 1 = Collect face (coins waiting).
  const pillMorph = useRef(new Animated.Value(0)).current;
  // Which face the header pill renders — swaps at the midpoint of the morph.
  const [pillFace, setPillFace] = useState<"balance" | "collect">("balance");
  const balancePulseAnim = useRef(new Animated.Value(0)).current;
  const balanceRef = useRef<View>(null);
  const balancePosRef = useRef({ x: 0, y: 0 });
  const mapGridRef = useRef<View>(null);
  const burstIdRef = useRef(0);
  const fxTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => { fxTimeoutsRef.current.forEach(clearTimeout); }, []);

  const measureBalance = useCallback(() => {
    const el = balanceRef.current;
    if (!el) return;
    el.measure((_x, _y, w, h, px, py) => {
      if (w > 0) balancePosRef.current = { x: px + w / 2, y: py + h / 2 };
    });
  }, []);
  useEffect(() => { measureBalance(); }, [measureBalance]);

  const balanceTarget = useCallback(() => {
    const p = balancePosRef.current;
    // If the balance hasn't been measured yet (or is scrolled off the top),
    // aim at the usual top-right header spot.
    if (p.x > 0 && p.y > 10) return p;
    return { x: Math.max(60, windowW - 90), y: insets.top + 44 };
  }, [windowW, insets.top]);

  const spawnBurst = useCallback((sx: number, sy: number, kind: "coins" | "xp") => {
    const d = balanceTarget();
    const id = `burst-${burstIdRef.current++}`;
    setBursts((prev) => [...prev, { id, sx, sy, dx: d.x, dy: d.y, kind }]);
  }, [balanceTarget]);

  const removeBurst = useCallback((id: string) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const pulseBalance = useCallback(() => {
    balancePulseAnim.setValue(0);
    Animated.timing(balancePulseAnim, { toValue: 1, duration: 550, easing: Easing.inOut(Easing.sin), useNativeDriver: true }).start();
  }, [balancePulseAnim]);

  /** Measure the map grid's on-screen origin, then run cb with it. */
  const withGridOrigin = useCallback((cb: (gx: number, gy: number) => void) => {
    const el = mapGridRef.current;
    if (!el) { cb(0, 0); return; }
    el.measure((_x, _y, w, _h, px, py) => {
      if (w > 0) cb(px, py); else cb(0, 0);
    });
  }, []);
  /** Income bonus breakdown sheet (the collapsed header chips). */
  const [incomeBreakdownOpen, setIncomeBreakdownOpen] = useState(false);
  /** Streak detail sheet (tapped from the compact streak chip). */
  const [streakDetailOpen, setStreakDetailOpen] = useState(false);
  const [collectionSummary, setCollectionSummary] = useState<CollectionState | null>(null);
  /** Active limited-time heavenly events (refreshed on open + every minute). */
  const [activeEvents, setActiveEvents] = useState<HeavenlyEvent[]>([]);
  /** Tracks which haircut event already trimmed the pawn (once per event). */
  const haircutDoneForRef = useRef<string | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<ScheduleTarget | null>(null);
  // Mission Field: prayer lights sent out on missions (blessings on return)
  const [fieldMissions, setFieldMissions] = useState<FieldMission[]>(() => emptyMissions());
  // Dark Forest: pixel-art demon battles; gear is your power
  const [forest, setForest] = useState<DarkForestState>({ highestWave: 0 });
  // River of Life: riverside camp — fish by hand, sell the daily catch, upgrade
  const [river, setRiver] = useState<RiverState>(() => defaultRiverState());
  const riverRef = useRef(river);
  riverRef.current = river;
  const [forestStats, setForestStats] = useState<CombatStats>({ attack: 5, defense: 0, maxHp: 100 });
  const [forestTunic, setForestTunic] = useState("#D6C9A8");
  const [forestArmor, setForestArmor] = useState<string | null>(null);
  const [forestWeapon, setForestWeapon] = useState<string | null>(null);
  // Villager missions: lights with a "?" ask Jonathan for help (2-5/day).
  const [vmState, setVmState] = useState<VillagerMissionState | null>(null);
  const vmStateRef = useRef<VillagerMissionState | null>(null);
  const [villagerMissionModal, setVillagerMissionModal] = useState<VillagerMission | null>(null);
  // Villager work assignments — Jonathan sends lights on timed shifts.
  const [workState, setWorkState] = useState<VillagerWorkState | null>(null);
  const workStateRef = useRef<VillagerWorkState | null>(null);
  /** Last live-tick timestamp — paces farm/garden stock restocking. */
  const lastStockFlowRef = useRef<number>(Date.now());
  const [workPickerFor, setWorkPickerFor] = useState<{ id: string; name: string } | null>(null);
  const [workPickerStep, setWorkPickerStep] = useState<"kind" | "recipient">("kind");
  const [workPickerKind, setWorkPickerKind] = useState<WorkKind | null>(null);
  // Ticking clock for work countdowns (refreshed by the 30s live tick).
  const [nowMs, setNowMs] = useState(Date.now());
  const [vmCelebration, setVmCelebration] = useState<{ mission: VillagerMission } | null>(null);
  const [tier] = useState(1); // TODO: derive from active fast day

  // The active map's state (all grid logic operates on this)
  const map: MapState = town.maps[activeMap];

  // The single morphing header pill: total coins/XP waiting to be collected
  // on the active map. It sits in "Collect" mode while anything is pending
  // (or while the collect FX plays), otherwise it rests showing the balance.
  const collectibleTotal = map.buildings.reduce((s, b) => s + (b.accumulated || 0), 0);
  const pillCollectMode = collectibleTotal > 0 || !!collectFx;
  // Compact number formatting so a huge total can never shove the pill
  // off the screen (the pill also has a maxWidth cap in the header).
  const headerCoinText = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(2));
  useEffect(() => {
    Animated.timing(pillMorph, {
      toValue: pillCollectMode ? 1 : 0,
      duration: 280,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: false,
    }).start();
    const t = setTimeout(() => setPillFace(pillCollectMode ? "collect" : "balance"), 140);
    return () => clearTimeout(t);
  }, [pillCollectMode, pillMorph]);

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

  // Load villager-work state once lights are ready.
  useEffect(() => {
    if (workStateRef.current || lightInfos.length === 0) return;
    (async () => {
      const st = await loadVillagerWorkState();
      workStateRef.current = st;
      setWorkState(st);
    })().catch(() => undefined);
  }, [lightInfos]);

  /** Where a work shift happens on the town map (null = not available). */
  const findWorkTarget = useCallback(
    (kind: WorkKind): { tile: { x: number; y: number }; buildingId: string; type: string } | null => {
      const townState = townRef.current;
      const buildings = townState?.maps.town?.buildings ?? [];
      const centerOf = (b: { x: number; y: number; level?: number; type: string; id: string }) => {
        const fp = buildingFootprint(b.level || 1, b.type as BuildingType);
        return {
          tile: { x: b.x + fp.w / 2 - 0.5, y: b.y + fp.h / 2 - 0.5 },
          buildingId: b.id,
          type: b.type,
        };
      };
      switch (kind) {
        case "clean-garden": {
          const g = buildings.find((b) => b.type === "community-garden");
          return g ? centerOf(g) : null;
        }
        case "prune-flowers": {
          const farm = buildings.find((b) => b.type === "farm");
          return farm ? centerOf(farm) : null;
        }
        case "work-farm": {
          const farm = buildings.find((b) => b.type === "farm");
          return farm ? centerOf(farm) : null;
        }
        case "tend-garden": {
          const g = buildings.find((b) => b.type === "community-garden");
          return g ? centerOf(g) : null;
        }
        case "bank-shift": {
          const bank =
            buildings.find((b) => b.type === "bank") ??
            buildings.find((b) => b.type === "bank-tower");
          return bank ? centerOf(bank) : null;
        }
        case "restaurant-shift": {
          const r = buildings.find((b) => isRestaurantType(b.type));
          return r ? centerOf(r) : null;
        }
        case "deliver-meal": {
          const t =
            buildings.find((b) => b.type === "banquet-table") ??
            buildings.find((b) => isRestaurantType(b.type));
          return t ? centerOf(t) : null;
        }
      }
    },
    []
  );

  /** personId -> forced destination while a light walks to its work site. */
  const workGuides = useMemo(() => {
    const out: Record<string, { tile: { x: number; y: number }; buildingId: string; type: string }> = {};
    if (!workState) return out;
    for (const a of workState.assignments) {
      if (a.status !== "en-route") continue;
      const target = findWorkTarget(a.kind);
      if (target) out[a.personId] = target;
    }
    return out;
  }, [workState, findWorkTarget]);

  /** personId -> shift info while a light is on the job (drives the badge). */
  const workMap = useMemo(() => {
    const out: Record<string, { untilMs: number; kind: string }> = {};
    if (!workState) return out;
    for (const a of workState.assignments) {
      if (a.status === "done") continue;
      out[a.personId] = { untilMs: a.endsAt, kind: a.kind };
    }
    return out;
  }, [workState]);

  /**
   * Schedule sync guides: when Jonathan's schedule has an in-progress people
   * event (meals, movies, ministry, BBQs), every villager heads to the event
   * instead of wandering. They stay until the event ends.
   */
  const scheduleGuides = useMemo(() => {
    const out: Record<string, { tile: { x: number; y: number }; buildingId: string; type: string }> = {};
    if (!scheduleActivity || !scheduleTarget || !scheduleActivity.withVillagers) return out;
    if (activeMap !== "town") return out;
    // BBQ at the pawn house gets its own badge.
    const type = scheduleActivity.kind === "backyard" ? "__barbecue__" : scheduleTarget.type;
    for (const l of lightInfos) {
      const pid = String(l.personId);
      out[pid] = { tile: scheduleTarget.tile, buildingId: scheduleTarget.buildingId, type };
    }
    return out;
  }, [scheduleActivity, scheduleTarget, activeMap, lightInfos]);

  /** personId -> schedule-event info while a light is at the event. */
  const scheduleMap = useMemo(() => {
    const out: Record<string, { untilMs: number; kind: string }> = {};
    if (!scheduleActivity || !scheduleTarget || !scheduleActivity.withVillagers) return out;
    if (activeMap !== "town") return out;
    for (const l of lightInfos) {
      out[String(l.personId)] = { untilMs: scheduleActivity.endsAtMs, kind: scheduleActivity.kind };
    }
    return out;
  }, [scheduleActivity, scheduleTarget, activeMap, lightInfos]);

  /** A work-guided light arrived at its site — the shift is underway. */
  const handleWorkArrival = useCallback(async (personId: string) => {
    const st = workStateRef.current;
    if (!st) return;
    const next = markWorkArrived(st, personId);
    workStateRef.current = next;
    setWorkState(next);
    await saveVillagerWorkState(next);
  }, []);

  /** Advance work timers; celebrate newly finished shifts. Idempotent. */
  const runWorkTick = useCallback(async () => {
    const st = workStateRef.current;
    if (!st) return;
    const now = Date.now();
    const { state, newlyDone } = tickWorkAssignments(st, now);
    if (newlyDone.length > 0) {
      workStateRef.current = state;
      setWorkState(state);
      await saveVillagerWorkState(state);
      const first = newlyDone[0];
      const def = WORK_KINDS[first.kind];
      Alert.alert(
        "Shift complete",
        newlyDone.length === 1
          ? `${first.personName} finished: ${def.label}. Tap to collect the reward!`
          : `${newlyDone.length} shifts finished. Tap to collect the rewards!`
      );
    }
  }, []);

  /** Jonathan assigns a light a work shift. */
  const assignVillagerWork = useCallback(
    async (person: { id: string; name: string }, kind: WorkKind, recipientName?: string) => {
      const st = workStateRef.current;
      if (!st) return;
      if (getTimeOfDay() === "night") {
        Alert.alert("Everyone's asleep", "Assign work in the morning — the town is sleeping.");
        return;
      }
      if (personHasActiveWork(st.assignments, person.id)) {
        Alert.alert("Already working", `${person.name} is already on a shift.`);
        return;
      }
      const vmBusy = (vmStateRef.current?.missions ?? []).some(
        (m) => m.personId === person.id && m.status !== "done"
      );
      if (vmBusy) {
        Alert.alert("They're busy", `${person.name} has a request waiting — help them first.`);
        return;
      }
      const target = findWorkTarget(kind);
      if (!target) {
        Alert.alert(
          "Not built yet",
          `There's nowhere to do that work right now — build the right spot first.`
        );
        return;
      }
      const assignment = createWorkAssignment({
        personId: person.id,
        personName: person.name,
        kind,
        recipientName,
      });
      const next: VillagerWorkState = { assignments: [...st.assignments, assignment] };
      workStateRef.current = next;
      setWorkState(next);
      await saveVillagerWorkState(next);
      setWorkPickerFor(null);
      setWorkPickerKind(null);
      setWorkPickerStep("kind");
      const def = WORK_KINDS[kind];
      Alert.alert(
        "Work assigned",
        `${person.name} is on the way: ${def.label} (${def.durationLabel}).`
      );
    },
    [findWorkTarget]
  );

  /**
   * Schedule sync: check Jonathan's schedule for an in-progress event and
   * pin the pawn (and the villagers, for people events) to the matching
   * place. Runs on load and every 30s; clears when the event ends so
   * everyone resumes normal behavior.
   */
  const refreshScheduleVisit = useCallback(async () => {
    try {
      const activity = await getActiveScheduleActivity();
      if (!activity) {
        setScheduleActivity(null);
        setScheduleTarget(null);
        return;
      }
      const target = resolveScheduleTarget(town.maps[activeMap].buildings, activity.kind);
      // Haircut day: the pawn actually gets a trim (free — it's his real appointment).
      if (activity.kind === "barbershop" && haircutDoneForRef.current !== activity.title) {
        haircutDoneForRef.current = activity.title;
        try {
          const { loadCustomPawn, saveCustomPawn, cutHair } = await import("@/lib/pawn");
          const pawn = await loadCustomPawn();
          if (pawn) {
            await saveCustomPawn(cutHair(pawn));
          }
        } catch {}
      }
      setScheduleActivity(activity);
      setScheduleTarget(target);
    } catch {
      // Schedule is a nice-to-have — never let it break the town.
      setScheduleActivity(null);
      setScheduleTarget(null);
    }
  }, [town, activeMap]);

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
    if (delta > 0) {
      // The border lighthouse glows brighter whenever Jonathan earns.
      setRewardPulse((p) => p + 1);
    }
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

  /** Collect a finished work shift's reward by hand. */
  const collectWorkReward = useCallback(
    async (assignment: VillagerWorkAssignment) => {
      const st = workStateRef.current;
      if (!st) return;
      const { state, assignment: done } = collectWorkAssignment(st, assignment.id);
      if (!done) return;
      const def = WORK_KINDS[done.kind];
      workStateRef.current = state;
      setWorkState(state);
      await saveVillagerWorkState(state);
      addCoins(scaledCoins(def.rewardCoins));
      awardCustomXP(scaledXP(def.rewardXP), `villager-work:${done.id}`).catch(() => undefined);
    },
    [addCoins]
  );

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
    const price = mapUnlockCost(id);
    if (info.comingSoon) {
      Alert.alert(info.name, "This map is coming soon!");
      return;
    }
    if (coinsRef.current.balance < price) {
      Alert.alert("Not enough coins", `Unlocking ${info.name} costs ${price.toFixed(2)} coins. You have ${coinsRef.current.balance.toFixed(2)}.`);
      return;
    }
    Alert.alert(`Unlock ${info.name}?`, `${info.description}\n\nCost: ${price.toFixed(2)} coins.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unlock",
        onPress: () => {
          const next = [...unlockedMaps, id];
          setUnlockedMaps(next);
          AsyncStorage.setItem(MAP_UNLOCKED_KEY, JSON.stringify(next)).catch(() => undefined);
          addCoins(-price);
          switchMap(id);
          // New map unlocked: fireworks and cheering villagers. Once per map.
          // Wrapped in try/catch so a celebration hiccup can never break the unlock.
          try {
            if (!celebrationsRef.current.mapsCelebrated.includes(id)) {
              persistCelebrations({ ...celebrationsRef.current, mapsCelebrated: [...celebrationsRef.current.mapsCelebrated, id] });
              setFireworksKey((k) => k + 1);
              queueCelebration("map", `Welcome to ${info.name}!`, "Fireworks light the sky — the villagers cheer.");
            }
          } catch {}
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
        // Fast-length gating + economy scaling: Hometown unlocks on 40+ day
        // fasts; the economy scales with the active fast's length so the
        // math feels fair (fewer earning days -> smaller numbers, same pace).
        try {
          const fastLen = await loadActiveFastLength();
          if (fastLen > 0) {
            setEconomyScale(economyScaleForFastLength(fastLen));
            setHometownLocked(!hometownUnlockedForFastLength(fastLen));
          }
        } catch {}
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
        // Dark Forest progress (highest wave cleared)
        try { setForest(await loadDarkForestState()); } catch {}
        // River of Life camp state (level, daily catch, creel)
        try { setRiver(await loadRiverState()); } catch {}
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
              setFireworksKey((k) => k + 1);
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
        try { setLighthouseState(await loadLighthouse()); } catch {}
        try {
          const xp = await loadXPState();
          lastLevelRef.current = getLevelForXP(xp.totalXP);
        } catch {}
        // Gathering places: load cooldown/harvest state.
        try { setGardenState(await loadGarden()); } catch {}
        try { setLastShowAt(await loadLastShow()); } catch {}
        try { setLastStudyAt(await loadLastStudy()); } catch {}
        try { setLastRestAt(await loadLastRest()); } catch {}
        try { setLastCheckupAt(await loadLastCheckup()); } catch {}
        // Schedule sync: check for an in-progress event on open.
        refreshScheduleVisit().catch(() => undefined);
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
        // Stock (time away): stocked buildings burned stock while earning
        // during the away window; deplete by the same per-minute rate.
        const stockRecord: Record<string, number> = { ...(t.stockByBuilding ?? {}) };
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
              // Cache BASE rates (without presence). Presence is applied at
              // accrual time: time-away proxy on open, live positions in tick.
              perMinuteRateRef.current[b.id] = {
                coins: earnsCoins ? (basePerHour / 60 + churchPerMinute) * getEconomyScale() : 0,
                xp: !earnsCoins && earnsXP ? (xpIncomeFor(b.type, b.level || 1) * wMult) / 24 / 60 : 0,
              };
            }
            if (minutesElapsed > 0 && (earnsCoins || earnsXP) && mapHasPopulation(m, t)) {
              const rate = perMinuteRateRef.current[b.id];
              const perMinuteCoins = rate ? rate.coins : 0;
              const perMinuteXP = rate ? rate.xp : 0;
              // Presence gate (time away): scale by prayed count proxy.
              const presenceMult = presenceMultiplierFor(b, [], prayedCount, false);
              // Stock (time away): while it was earning, a stocked building
              // burned stock at the live per-minute rate, capped by the
              // stock on hand. Full shelves boost income up to +50%; empty
              // shelves still earn the regular amount.
              let stockMult = 1;
              if (earnsCoins && presenceMult > 0 && isStockedBuildingType(b.type)) {
                const level = b.level || 1;
                const cap = stockCapForLevel(level);
                const before = stockForBuilding(stockRecord, b.id, level);
                stockMult = stockMultiplierFor(before, cap);
                stockRecord[b.id] = Math.max(
                  0,
                  before - STOCK_DEPLETION_PER_MIN * minutesElapsed
                );
              }
              const add = earnsCoins
                ? minutesElapsed * perMinuteCoins * presenceMult * stockMult
                : minutesElapsed * perMinuteXP * presenceMult;
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
        t = { ...t, maps: newMaps, stockByBuilding: stockRecord };
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

  // Daily town visit streak — first open each calendar day checks in.
  // Surprise visitors — seeded per day.
  useEffect(() => {
    (async () => {
      try {
        const { state, isNewDay, milestone } = await checkInStreak();
        setStreak(state);
        if (isNewDay && milestone) {
          addCoins(milestone.coins);
          if (milestone.xp > 0) {
            awardCustomXP(milestone.xp, `town-streak:${state.streak}`).catch(() => undefined);
          }
          queueCelebration(
            "milestone",
            `${state.streak}-day streak!`,
            `${milestone.label} — +${milestone.coins} coins${milestone.xp > 0 ? `, +${milestone.xp} XP` : ""}${milestone.title ? `. Title earned: ${milestone.title}` : ""}.`
          );
        }
        const surprises = await getTodayVisitors();
        setVisitors(surprises.visitors.filter((v) => !v.claimed));
        setActiveEvents(getActiveEvents());
      } catch {}
    })();
    const evtTimer = setInterval(() => {
      try { setActiveEvents(getActiveEvents()); } catch {}
    }, 60000);
    return () => clearInterval(evtTimer);
  }, []);

  // Live tick: every 30s, accrue another slice of minute-by-minute income so the
  // coin badges visibly grow while watching. Uses the per-minute rates cached at
  // mount; the next full open re-syncs everything exactly via lastTick.
  useEffect(() => {
    const id = setInterval(() => {
      // Stock flow clock: whole minutes since the last interval run, used to
      // pace farm/garden restocking (time away is handled by the catch-up).
      const tickNow = Date.now();
      const stockFlowMinutes = Math.max(
        0,
        Math.floor((tickNow - lastStockFlowRef.current) / 60000),
      );
      lastStockFlowRef.current = tickNow;
      // Villager missions arrive through the day — check for newly due slots.
      runVillagerMissionSpawn().catch(() => undefined);
      // Work shifts finish on their timers — mark done, celebrate, refresh countdowns.
      runWorkTick().catch(() => undefined);
      setNowMs(Date.now());
      // Schedule sync: the pawn mimics Jonathan's day — if a schedule event
      // is happening now, the pawn (and the villagers, for people events)
      // gather at the matching place instead of wandering.
      refreshScheduleVisit().catch(() => undefined);
      // Level-up detection: fireworks when Jonathan levels up while watching town.
      loadXPState().then((xp) => {
        const level = getLevelForXP(xp.totalXP);
        if (lastLevelRef.current !== null && level > lastLevelRef.current) {
          setFireworksKey((k) => k + 1);
          queueCelebration("level-up", `Level ${level}!`, "Golden rain over the city — well done.");
        }
        lastLevelRef.current = level;
      }).catch(() => undefined);
      // Coin milestones: a street parade when lifetime earnings cross a milestone.
      // First sync is silent (no retroactive parades for old milestones).
      try {
        const celeb = celebrationsRef.current;
        const { current } = milestoneFor(coinsRef.current.lifetimeEarned);
        if (current && current.threshold > celeb.lastMilestoneThreshold) {
          if (celeb.lastMilestoneThreshold > 0) {
            setFireworksKey((k) => k + 1);
            queueCelebration("milestone", `${current.name}!`, "The city throws a parade in your honor.");
          }
          persistCelebrations({ ...celeb, lastMilestoneThreshold: current.threshold });
        }
      } catch {}
      // All daily prayers complete: the bell rings and white doves rise. Once per day.
      if (prayedTodayRef.current > 0 && celebrationsRef.current.lastPrayerCompleteDate !== todayStr()) {
        AsyncStorage.getItem("prayercircle.people.v1").then((raw) => {
          try {
            const people = raw ? JSON.parse(raw) : [];
            const total = Array.isArray(people) ? people.length : 0;
            const today = todayStr();
            if (total > 0 && prayedTodayRef.current >= total && celebrationsRef.current.lastPrayerCompleteDate !== today) {
              persistCelebrations({ ...celebrationsRef.current, lastPrayerCompleteDate: today });
              queueCelebration("prayers", "All prayers complete", "The bell rings — white doves rise over the city.");
            }
          } catch {}
        }).catch(() => undefined);
      }
      setTown((prev) => {
        const now = Date.now();
        const newMaps = { ...prev.maps };
        const nextStock: Record<string, number> = { ...(prev.stockByBuilding ?? {}) };
        let changed = false;
        let stockChanged = false;
        for (const mapId of TOWN_MAP_IDS) {
          const m = newMaps[mapId];
          if (!m) continue;
          // Live villager positions for presence-gated income.
          const positions = mapId === "city" ? cityNpcPositionsRef.current : townNpcPositionsRef.current;
          // Stock flow (live): staffed farms/gardens on this map restock
          // stocked buildings within range.
          const liveSites = workStateRef.current
            ? staffedSupplySites(workStateRef.current.assignments, m.buildings)
            : [];
          if (liveSites.length > 0 && stockFlowMinutes > 0) {
            if (restockFromSites(m.buildings, liveSites, nextStock, stockFlowMinutes)) {
              stockChanged = true;
            }
          }
          const updatedBuildings = m.buildings.map((b) => {
            const lastTick = b.lastTick ? new Date(b.lastTick).getTime() : now;
            const minutesElapsed = Math.floor((now - lastTick) / 60000);
            if (minutesElapsed <= 0) return b;
            const rate = perMinuteRateRef.current[b.id];
            const perMin = rate ? rate.coins + rate.xp : 0;
            if (!rate || perMin <= 0) {
              return b.lastTick ? b : { ...b, lastTick: new Date(now).toISOString() };
            }
            // Presence gate (live): only earn when villagers are nearby.
            const presenceMult = presenceMultiplierFor(b, positions, prayedTodayRef.current, true);
            if (presenceMult <= 0) {
              return b.lastTick ? b : { ...b, lastTick: new Date(now).toISOString() };
            }
            changed = true;
            // Stock: stocked buildings burn stock while earning; the stock
            // on hand boosts income (full = +50%, empty = regular rate).
            let stockMult = 1;
            if (isStockedBuildingType(b.type)) {
              const level = b.level || 1;
              const cap = stockCapForLevel(level);
              const before = stockForBuilding(nextStock, b.id, level);
              stockMult = stockMultiplierFor(before, cap);
              const after = Math.max(0, before - STOCK_DEPLETION_PER_MIN * minutesElapsed);
              if (after !== before) {
                nextStock[b.id] = after;
                stockChanged = true;
              }
            }
            const add = minutesElapsed * perMin * presenceMult * stockMult;
            return {
              ...b,
              accumulated: Math.round(Math.min(buildingStorageCap(b), (b.accumulated || 0) + add) * 100) / 100,
              lastTick: new Date(now).toISOString(),
            };
          });
          newMaps[mapId] = { ...m, buildings: updatedBuildings };
        }
        if (!changed && !stockChanged) return prev;
        const next = { ...prev, maps: newMaps, stockByBuilding: nextStock };
        saveTown(next);
        return next;
      });
    }, 30000);
    return () => clearInterval(id);
  }, [runVillagerMissionSpawn, runWorkTick, refreshScheduleVisit]);

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
    const price = scaledCoins(plot.cost);
    // Don't build over legacy free-placed buildings
    for (let dx = 0; dx < 2; dx++) {
      for (let dy = 0; dy < 2; dy++) {
        if (buildingAt(plot.x + dx, plot.y + dy)) {
          Alert.alert("Plot Occupied", "There's already a building on this lot. Move or sell it first.");
          return;
        }
      }
    }
    if (coinsRef.current.balance < price) {
      Alert.alert("Not enough coins", `${plot.name} costs ${price.toFixed(2)} coins. You have ${coins.balance.toFixed(2)}.`);
      return;
    }
    Alert.alert(
      `${plot.name} — FOR SALE`,
      `${def.name}\n${def.description}\n\nPurchase this downtown plot for ${price.toFixed(2)} coins?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Buy for ${price.toFixed(2)}🪙`,
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
            addCoins(-price);
            // First building in the city: the mayor ceremony — confetti, cheering villagers.
            if (map.buildings.length === 0 && !celebrationsRef.current.mayorCeremonyDone) {
              persistCelebrations({ ...celebrationsRef.current, mayorCeremonyDone: true });
              setFireworksKey((k) => k + 1);
              queueCelebration("mayor", "Mayor of the City!", "Your first downtown building rises — the city cheers.");
            }
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
    // Amphitheater: enter the theater — the show plays inside, with the villagers watching.
    if (b.type === "amphitheater") {
      enterActions.push({
        text: "Enter Theater",
        onPress: () => router.push(`/theater-interior?buildingId=${b.id}`),
      });
    }
    // City interiors: department store, hotel, office, apartments, city market.
    if (b.type === "department-store") {
      enterActions.push({
        text: "Enter Store",
        onPress: () => router.push(`/department-store-interior?buildingId=${b.id}`),
      });
    }
    if (b.type === "hotel") {
      enterActions.push({
        text: "Enter Lobby",
        onPress: () => router.push(`/hotel-interior?buildingId=${b.id}`),
      });
    }
    if (b.type === "office") {
      enterActions.push({
        text: "Enter Offices",
        onPress: () => router.push(`/office-interior?buildingId=${b.id}`),
      });
    }
    if (b.type === "apartments") {
      enterActions.push({
        text: "Enter Lobby",
        onPress: () => router.push(`/apartments-interior?buildingId=${b.id}`),
      });
    }
    if (b.type === "city-market") {
      enterActions.push({
        text: "Enter Market",
        onPress: () => router.push(`/market-interior?buildingId=${b.id}`),
      });
    }
    // City cultural district interiors: grand library, opera house, museum,
    // clock tower, embassy.
    if (b.type === "grand-library") {
      enterActions.push({
        text: "Enter Library",
        onPress: () => router.push(`/grand-library-interior?buildingId=${b.id}`),
      });
    }
    if (b.type === "opera-house") {
      enterActions.push({
        text: "Enter Opera House",
        onPress: () => router.push(`/opera-house-interior?buildingId=${b.id}`),
      });
    }
    if (b.type === "museum") {
      enterActions.push({
        text: "Enter Museum",
        onPress: () => router.push(`/museum-interior?buildingId=${b.id}`),
      });
    }
    if (b.type === "clock-tower") {
      enterActions.push({
        text: "Enter Clock Tower",
        onPress: () => router.push(`/clock-tower-interior?buildingId=${b.id}`),
      });
    }
    if (b.type === "embassy") {
      enterActions.push({
        text: "Enter Embassy",
        onPress: () => router.push(`/embassy-interior?buildingId=${b.id}`),
      });
    }
    // City eastside interiors: music studio, art gallery, flower market,
    // coffee roastery.
    if (b.type === "music-studio") {
      enterActions.push({
        text: "Enter Studio",
        onPress: () => router.push(`/music-studio-interior?buildingId=${b.id}`),
      });
    }
    if (b.type === "art-gallery") {
      enterActions.push({
        text: "Enter Gallery",
        onPress: () => router.push(`/art-gallery-interior?buildingId=${b.id}`),
      });
    }
    if (b.type === "flower-market") {
      enterActions.push({
        text: "Enter Market",
        onPress: () => router.push(`/flower-market-interior?buildingId=${b.id}`),
      });
    }
    if (b.type === "coffee-roastery") {
      enterActions.push({
        text: "Enter Roastery",
        onPress: () => router.push(`/coffee-roastery-interior?buildingId=${b.id}`),
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
    const lotPrice = scaledCoins(lot.cost);
    const buildingPrice = scaledCoins(def.cost);
    const total = lotPrice + buildingPrice;
    if (type === "pawn-house" && map.buildings.some((b) => b.type === "pawn-house")) {
      Alert.alert("Already built", "You already have a pawn house!");
      return;
    }
    if (type === "banquet-table" && map.buildings.some((b) => b.type === "banquet-table")) {
      Alert.alert("Already built", "The Marriage Supper is already prepared — one table for the whole town.");
      return;
    }
    if (coinsRef.current.balance < total) {
      Alert.alert("Not enough coins", `${def.name} on ${lot.name} costs ${total.toFixed(2)} coins (lot ${lotPrice.toFixed(2)} + building ${buildingPrice.toFixed(2)}). You have ${coins.balance.toFixed(2)}.`);
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

  /** Lighthouse: receive the daily blessing (+coins × level, verse of light). */
  const handleLighthouseBlessing = () => {
    const today = localDateStr();
    if (lighthouseState.lastBlessingDate === today) return;
    const next = { ...lighthouseState, lastBlessingDate: today };
    setLighthouseState(next);
    saveLighthouse(next).catch(() => undefined);
    const reward = LIGHTHOUSE_BLESSING_COINS * next.level;
    addCoins(reward);
    setLighthouseModalVisible(false);
    Alert.alert(
      "The Lighthouse",
      `Its beam sweeps over the water, steady and sure — guiding everyone home. +${reward.toFixed(2)} coins.\n\n"${lighthouseVerseForDate().text}"\n— ${lighthouseVerseForDate().ref}`
    );
  };

  /** Hidden coin cache: tap a sparkling spot on a city street (once per day each). */
  const handleCacheTap = (spotId: string) => {
    const celeb = celebrationsRef.current;
    if (cacheClaimedToday(celeb, spotId)) {
      Alert.alert("Coin Cache", "You've already searched this spot today — check back tomorrow.");
      return;
    }
    const reward = cacheReward();
    persistCelebrations({ ...celeb, cacheClaimed: { ...celeb.cacheClaimed, [spotId]: todayStr() } });
    addCoins(reward);
    Alert.alert("Hidden Cache!", `Tucked between the cobblestones — +${reward.toFixed(2)} coins.`);
  };

  /** Wishing fountain: toss a coin for a random blessing. Hourly. */
  const handleFountainTap = () => {
    const celeb = celebrationsRef.current;
    const remaining = fountainMsRemaining(celeb);
    if (remaining > 0) {
      Alert.alert("Wishing Fountain", `The water is still settling — try again in about ${celebrationCooldown(remaining)}.`);
      return;
    }
    if (coinsRef.current.balance < FOUNTAIN_TOSS_COST) {
      Alert.alert("Not enough coins", `Tossing a coin costs ${FOUNTAIN_TOSS_COST.toFixed(2)} coins.`);
      return;
    }
    Alert.alert("Wishing Fountain", "Toss a coin into the fountain and make a wish?", [
      { text: "Not now", style: "cancel" },
      {
        text: "Toss a coin",
        onPress: () => {
          addCoins(-FOUNTAIN_TOSS_COST);
          persistCelebrations({ ...celebrationsRef.current, fountainLastTossMs: Date.now() });
          const blessing = fountainBlessing();
          if (blessing.kind === "coins") {
            addCoins(blessing.coins);
            Alert.alert("A Blessing!", `The fountain shimmers — +${blessing.coins.toFixed(2)} coins ripple back to you.`);
          } else if (blessing.kind === "xp") {
            awardCustomXP(blessing.xp, `wishing-fountain:${Date.now()}`).catch(() => undefined);
            Alert.alert("A Blessing!", `The water glows — +${blessing.xp} XP flows into you.`);
          } else {
            Alert.alert("A Blessing!", `"${blessing.text}"\n— ${blessing.ref}`);
          }
        },
      },
    ]);
  };

  /** Street performer: tip them and they play a tune (+XP). Hourly. */
  const handlePerformerTap = () => {
    const celeb = celebrationsRef.current;
    const remaining = performerMsRemaining(celeb);
    if (remaining > 0) {
      Alert.alert("Street Performer", `They're resting their voice — back in about ${celebrationCooldown(remaining)}.`);
      return;
    }
    if (coinsRef.current.balance < PERFORMER_TIP_COST) {
      Alert.alert("Not enough coins", `A tip costs ${PERFORMER_TIP_COST.toFixed(2)} coins.`);
      return;
    }
    Alert.alert("Street Performer", "A little musician with a guitar on the corner. Tip them and they'll play a tune?", [
      { text: "Not now", style: "cancel" },
      {
        text: `Tip ${PERFORMER_TIP_COST.toFixed(2)} coins`,
        onPress: () => {
          addCoins(-PERFORMER_TIP_COST);
          persistCelebrations({ ...celebrationsRef.current, performerLastTipMs: Date.now() });
          awardCustomXP(PERFORMER_XP, `street-performer:${Date.now()}`).catch(() => undefined);
          setPerformerPlaying(true);
          setTimeout(() => setPerformerPlaying(false), 20000);
          Alert.alert("Music in the Streets", `A sweet tune drifts down the avenue. +${PERFORMER_XP} XP.`);
        },
      },
    ]);
  };

  /** Lighthouse: upgrade to the next level (taller tower, brighter beam). */
  const handleLighthouseUpgrade = () => {
    const level = lighthouseState.level;
    if (level >= LIGHTHOUSE_MAX_LEVEL) return;
    const cost = scaledCoins(LIGHTHOUSE_UPGRADE_COSTS[level] ?? 0);
    if (coins.balance < cost) {
      Alert.alert("Not enough coins", `Upgrading the lighthouse costs ${cost.toFixed(2)} coins. You have ${coins.balance.toFixed(2)}.`);
      return;
    }
    addCoins(-cost);
    const next = { ...lighthouseState, level: level + 1 };
    setLighthouseState(next);
    saveLighthouse(next).catch(() => undefined);
    setLighthouseModalVisible(false);
    setFireworksKey((k) => k + 1);
    Alert.alert(
      "Lighthouse upgraded!",
      `The tower rises higher, and its beam shines brighter over Mercy's Shore. Now level ${next.level}.`
    );
  };

  // ---- Gathering places: harvest, shows, study, rest ----

  /** Community Garden: plant crops (if empty) or harvest when ripe. */
  const handleGardenPress = (b: PlacedBuilding) => {
    const level = Math.min(Math.max(b.level || 1, 1), 3);
    const now = Date.now();
    const upgradeBtn = level < 3 ? [{
      text: `Upgrade to Lv ${level + 1} (🪙${upgradeCostFor(b.type, (level + 1) as 2 | 3).toFixed(2)})`,
      onPress: () => {
        const cost = upgradeCostFor(b.type, (level + 1) as 2 | 3);
        if (coinsRef.current.balance < cost) {
          Alert.alert("Not enough coins", `You need ${cost.toFixed(2)} coins. You have ${coinsRef.current.balance.toFixed(2)}.`);
          return;
        }
        addCoins(-cost);
        const updated = map.buildings.map(x => (x.id === b.id ? { ...x, level: (level + 1) as 2 | 3 } : x));
        saveMap({ ...map, buildings: updated });
        Alert.alert("Community Garden", `Upgraded to level ${level + 1}! ${level + 1 >= 3 ? "The greenhouse is ready — faster growth, richer harvests." : "More plots, better yields."}`);
      },
    }] : [];
    if (!gardenState.plantedAt) {
      // Plant crops — villagers will tend them.
      Alert.alert(
        "Community Garden",
        `The villagers tend ${GARDEN_PLOTS[level] ?? 4} plots together here, alongside the Garden of Remembrance — life growing beside remembrance.\n\nTap "Plant" to sow this season's crops.`,
        [
          { text: "Not yet", style: "cancel" },
          ...upgradeBtn,
          {
            text: "Plant crops",
            onPress: () => {
              const next = { plantedAt: new Date().toISOString(), plantedLevel: level };
              setGardenState(next);
              saveGarden(next).catch(() => undefined);
              const mins = GARDEN_RIPEN_MINUTES[level] ?? 120;
              Alert.alert(
                "Community Garden",
                `Planted! The villagers water and weed with care.\n\nHarvest in about ${mins >= 60 ? `${Math.round(mins / 60)} hour${mins >= 120 ? "s" : ""}` : `${mins} minutes`}.`
              );
            },
          },
        ]
      );
      return;
    }
    if (!gardenIsRipe(gardenState, level, now)) {
      const msLeft = gardenMsUntilRipe(gardenState, now);
      Alert.alert(
        "Community Garden",
        `The crops are still growing — the villagers are tending them with care.\n\nReady in about ${formatCooldown(msLeft)}.`,
        [{ text: "OK" }, ...upgradeBtn]
      );
      return;
    }
    // Harvest!
    const _rw = gardenHarvestReward(gardenState.plantedLevel);
    const reward = { coins: scaledCoins(_rw.coins), xp: scaledXP(_rw.xp) };
    Alert.alert(
      "Community Garden",
      `Baskets full and everyone smiling — harvest time!\n\n+${reward.coins.toFixed(2)} coins, +${reward.xp} XP.`,
      [
        ...upgradeBtn,
        {
          text: "Harvest",
          onPress: () => {
            const next = { plantedAt: null, plantedLevel: level };
            setGardenState(next);
            saveGarden(next).catch(() => undefined);
            addCoins(reward.coins);
            awardCustomXP(reward.xp, `garden-harvest-${Date.now()}`).catch(() => undefined);
          },
        },
      ]
    );
  };

  /** Amphitheater: attend a show (30 min cooldown). */
  /** Library: study session (1 hour cooldown). */
  const handleStudyPress = (b: PlacedBuilding) => {
    const level = Math.min(Math.max(b.level || 1, 1), 3);
    const now = Date.now();
    const remaining = studyMsRemaining(lastStudyAt, now);
    const doUpgrade = () => {
      const cost = upgradeCostFor(b.type, (level + 1) as 2 | 3);
      if (coinsRef.current.balance < cost) {
        Alert.alert("Not enough coins", `You need ${cost.toFixed(2)} coins. You have ${coinsRef.current.balance.toFixed(2)}.`);
        return;
      }
      addCoins(-cost);
      const updated = map.buildings.map(x => (x.id === b.id ? { ...x, level: (level + 1) as 2 | 3 } : x));
      saveMap({ ...map, buildings: updated });
      Alert.alert("Library", `Upgraded to level ${level + 1}! ${level + 1 >= 3 ? "A grand library — shelf upon shelf of wisdom." : "A quiet reading room grows."}`);
    };
    const upgradeBtn = level < 3 ? [{ text: `Upgrade to Lv ${level + 1} (🪙${upgradeCostFor(b.type, (level + 1) as 2 | 3).toFixed(2)})`, onPress: doUpgrade }] : [];
    if (remaining > 0) {
      Alert.alert(
        "Library",
        `Take your time — wisdom isn't hurried.\n\nYou can study again in about ${formatCooldown(remaining)}.`,
        [{ text: "OK" }, ...upgradeBtn]
      );
      return;
    }
    const xp = scaledXP(STUDY_XP[level] ?? 25);
    const levelBlurb = level >= 3
      ? "Shelf upon shelf of wisdom. You lose track of time among the pages."
      : level >= 2
        ? "A quiet reading room. The villagers study beside you."
        : "A simple shelf, well-loved books. You read until the light shifts.";
    Alert.alert(
      "Library",
      `${levelBlurb}\n\n+${xp} XP.`,
      [
        ...upgradeBtn,
        {
          text: "Study",
          onPress: () => {
            const t = Date.now();
            setLastStudyAt(t);
            saveLastStudy(t).catch(() => undefined);
            awardCustomXP(xp, `library-study-${t}`).catch(() => undefined);
          },
        },
      ]
    );
  };

  /** Fountain Plaza: rest a while (2 hour cooldown). */
  const handleRestPress = (b: PlacedBuilding) => {
    const level = Math.min(Math.max(b.level || 1, 1), 3);
    const now = Date.now();
    const remaining = restMsRemaining(lastRestAt, now);
    const doUpgrade = () => {
      const cost = upgradeCostFor(b.type, (level + 1) as 2 | 3);
      if (coinsRef.current.balance < cost) {
        Alert.alert("Not enough coins", `You need ${cost.toFixed(2)} coins. You have ${coinsRef.current.balance.toFixed(2)}.`);
        return;
      }
      addCoins(-cost);
      const updated = map.buildings.map(x => (x.id === b.id ? { ...x, level: (level + 1) as 2 | 3 } : x));
      saveMap({ ...map, buildings: updated });
      Alert.alert("Fountain Plaza", `Upgraded to level ${level + 1}! ${level + 1 >= 3 ? "A grand plaza — flowers ring the fountain." : "Benches in the shade, room to breathe."}`);
    };
    const upgradeBtn = level < 3 ? [{ text: `Upgrade to Lv ${level + 1} (🪙${upgradeCostFor(b.type, (level + 1) as 2 | 3).toFixed(2)})`, onPress: doUpgrade }] : [];
    if (remaining > 0) {
      Alert.alert(
        "Fountain Plaza",
        `The water keeps its steady song.\n\nRest again in about ${formatCooldown(remaining)}.`,
        [{ text: "OK" }, ...upgradeBtn]
      );
      return;
    }
    const coins = scaledCoins(REST_COINS[level] ?? 5);
    const xp = scaledXP(REST_XP[level] ?? 8);
    const levelBlurb = level >= 3
      ? "The grand plaza hums with quiet life. You sit by the fountain and breathe."
      : level >= 2
        ? "Benches in the shade, water sparkling. Villagers chat softly nearby."
        : "A simple fountain, cool water. You rest a while.";
    Alert.alert(
      "Fountain Plaza",
      `${levelBlurb}\n\n+${coins.toFixed(2)} coins, +${xp} XP — refreshed.`,
      [
        ...upgradeBtn,
        {
          text: "Rest a while",
          onPress: () => {
            const t = Date.now();
            setLastRestAt(t);
            saveLastRest(t).catch(() => undefined);
            addCoins(coins);
            awardCustomXP(xp, `plaza-rest-${t}`).catch(() => undefined);
          },
        },
      ]
    );
  };

  /** Tap a town lot building: open the popup (upgrade only, no move/sell). */
  const handleTownLotBuildingPress = (b: PlacedBuilding) => {
    // Enterable buildings route to their interiors first
    if (b.type === "pawn-house") {
      router.push("/pawn-house");
      return;
    } else if (b.type === "villager-cottage") {
      // Tap a cottage to see who lives there.
      const residents = cottageResidents(map.buildings, b.id, lightInfos);
      if (residents.length === 0) {
        Alert.alert("Villager Cottage", "No one lives here yet — the people you pray for today will move in.");
      } else {
        const shown = residents.slice(0, 10).map((r) => r.name).join("\n");
        Alert.alert(
          "Villager Cottage",
          `${residents.length} ${residents.length === 1 ? "villager calls" : "villagers call"} this home:\n\n${shown}${residents.length > 10 ? "\n…" : ""}`
        );
      }
      return;
    } else if (b.type === "hospital") {
      router.push(`/hospital-interior?buildingId=${b.id}`);
      return;
    // Artisans' Row — enterable artisan interiors
    } else if (b.type === "inn") {
      router.push(`/inn-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "carpenter") {
      router.push(`/carpenter-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "pottery") {
      router.push(`/pottery-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "music-hall") {
      router.push(`/music-hall-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "tailor") {
      router.push(`/tailor-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "observatory") {
      router.push(`/observatory-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "bathhouse") {
      router.push(`/bathhouse-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "apothecary") {
      router.push(`/apothecary-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "town-hall") {
      router.push(`/town-hall-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "post-office") {
      router.push(`/post-office-interior?buildingId=${b.id}`);
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
    } else if (b.type === "community-garden") {
      handleGardenPress(b);
      return;
    } else if (b.type === "fountain-plaza") {
      handleRestPress(b);
      return;
    } else if (b.type === "farm") {
      router.push(`/farm-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "bakery") {
      router.push(`/bakery-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "market" || b.type === "city-market") {
      router.push(`/market-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "shop") {
      router.push(`/shop-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "department-store") {
      router.push(`/department-store-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "food-court") {
      router.push(`/food-court-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "hotel") {
      router.push(`/hotel-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "office") {
      router.push(`/office-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "apartments") {
      router.push(`/apartments-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "bookstore") {
      router.push(`/bookstore-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "arcade") {
      router.push(`/arcade-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "cinema") {
      router.push(`/theater-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "library") {
      router.push(`/library-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "classroom") {
      router.push(`/classroom-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "chapel") {
      router.push(`/chapel-interior?buildingId=${b.id}`);
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
      // Hub landmarks: tapping travels to the linked map (or unlocks it).
      const landmark = townLandmarkAt(x, y);
      if (landmark && !existing) {
        handleMapSignSelect(landmark.targetMap);
        return;
      }
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
      } else if (existing.type === "library") {
        router.push(`/library-interior?buildingId=${existing.id}`);
        return;
      } else if (existing.type === "farm") {
        router.push(`/farm-interior?buildingId=${existing.id}`);
        return;
      } else if (existing.type === "bakery") {
        router.push(`/bakery-interior?buildingId=${existing.id}`);
        return;
      } else if (existing.type === "market") {
        router.push(`/market-interior?buildingId=${existing.id}`);
        return;
      } else if (existing.type === "shop") {
        router.push(`/shop-interior?buildingId=${existing.id}`);
        return;
      } else if (existing.type === "bookstore") {
        router.push(`/bookstore-interior?buildingId=${existing.id}`);
        return;
      } else if (existing.type === "arcade") {
        router.push(`/arcade-interior?buildingId=${existing.id}`);
        return;
      } else if (existing.type === "cinema") {
        router.push(`/theater-interior?buildingId=${existing.id}`);
        return;
      } else if (existing.type === "classroom") {
        router.push(`/classroom-interior?buildingId=${existing.id}`);
        return;
      } else if (existing.type === "chapel") {
        router.push(`/chapel-interior?buildingId=${existing.id}`);
        return;
      } else if (existing.type === "food-court") {
        router.push(`/food-court-interior?buildingId=${existing.id}`);
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
    const price = scaledCoins(def.cost);
    if (tier < def.tier) {
      Alert.alert("Locked", `Unlocks at tier ${def.tier} (day ${def.tier === 2 ? 40 : def.tier === 3 ? 100 : 250} of your fast).`);
      return;
    }
    if (coinsRef.current.balance < price) {
      Alert.alert("Not enough coins", `You need ${price.toFixed(2)} coins. You have ${coins.balance.toFixed(2)}.`);
      return;
    }
    if (type === "pawn-house" && map.buildings.some((b) => b.type === "pawn-house")) {
      Alert.alert("Already built", "You already have a pawn house!");
      return;
    }
    const building: PlacedBuilding = { id: nextId(), type, x: selectedTile.x, y: selectedTile.y, level: 1 };
    saveMap({ ...map, buildings: [...map.buildings, building] });
    addCoins(-price);
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
    const pendingBuildings = map.buildings.filter((b) => (b.accumulated || 0) > 0);
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
    // Zero the buildings NOW (map pills vanish instantly), the balance ticks
    // up when the flying coins land ~0.85s later.
    saveMap({ ...map, buildings: updatedBuildings });
    measureBalance();
    // Fan the coins from up to 8 pending buildings toward the balance.
    withGridOrigin((gx, gy) => {
      pendingBuildings.slice(0, 8).forEach((b) => {
        const fp = buildingFootprint(b.level || 1, b.type, hasFixedFootprint(b));
        spawnBurst(
          gx + (b.x + fp.w / 2) * cellSize,
          gy + (b.y + fp.h / 2) * cellSize,
          xpIncomeFor(b.type, b.level || 1) > 0 ? "xp" : "coins"
        );
      });
    });
    // The header pill turns: flips to the green "Collected!" face while the
    // coins are in the air, then turns back.
    setCollectFx({ coins: totalCoins, xp: totalXP });
    collectFlip.setValue(0);
    Animated.timing(collectFlip, { toValue: 1, duration: 320, easing: Easing.inOut(Easing.sin), useNativeDriver: false }).start();
    fxTimeoutsRef.current.push(setTimeout(() => {
      if (totalXP > 0) {
        awardCustomXP(totalXP, `collect-all-${now}`).catch(() => undefined);
      }
      if (totalCoins > 0) {
        addCoins(Math.round(totalCoins * 100) / 100);
      }
      pulseBalance();
    }, COIN_LAND_MS));
    fxTimeoutsRef.current.push(setTimeout(() => {
      Animated.timing(collectFlip, { toValue: 0, duration: 240, easing: Easing.inOut(Easing.sin), useNativeDriver: false }).start(() => setCollectFx(null));
    }, COIN_LAND_MS + 350));
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

  /** Dark Forest victory: coins + XP for the cleared wave, progress saved. */
  const handleForestVictory = useCallback((wave: number) => {
    const demon = demonForWave(wave);
    if (demon.coins > 0) addCoins(demon.coins);
    if (demon.xp > 0) {
      awardCustomXP(demon.xp, `dark-forest:${wave}:${Date.now()}`).catch(() => undefined);
    }
    // Record in the demon bestiary collection.
    recordDemonDefeat(demon.name).then(({ justCompleted }) => {
      if (justCompleted) {
        const meta = COLLECTION_SETS.demons;
        addCoins(meta.rewardCoins);
        awardCustomXP(meta.rewardXp, `collection:demons`).catch(() => undefined);
        queueCelebration("milestone", "Bestiary complete!", `Every demon catalogued. +${meta.rewardCoins} coins, +${meta.rewardXp} XP. Title earned: ${meta.rewardTitle}.`);
      }
    }).catch(() => undefined);
    setForest(prev => {
      if (wave <= prev.highestWave) return prev;
      const next = { highestWave: wave };
      saveDarkForestState(next).catch(() => undefined);
      return next;
    });
  }, [addCoins]);

  /** River of Life: a fish on the line — creel +1, daily catch +1. */
  const handleRiverCatch = useCallback((speciesId: string) => {
    // Record the species in the collection book.
    recordFishCatch(speciesId).then(({ justCompleted }) => {
      if (justCompleted) {
        const meta = COLLECTION_SETS.fish;
        addCoins(meta.rewardCoins);
        awardCustomXP(meta.rewardXp, `collection:fish`).catch(() => undefined);
        queueCelebration("milestone", "Collection complete: River Fish!", `+${meta.rewardCoins} coins, +${meta.rewardXp} XP. Title earned: ${meta.rewardTitle}.`);
      }
    }).catch(() => undefined);
    setRiver(prev => {
      const checked = newDayCheck(prev);
      const info = RIVER_LEVELS[checked.level];
      if (checked.caughtToday >= info.fishPerDay) return checked;
      const next = { ...checked, caughtToday: checked.caughtToday + 1, creel: checked.creel + 1 };
      saveRiverState(next).catch(() => undefined);
      return next;
    });
  }, []);

  /** River of Life: sell the creel for coins (manual tap only). */
  const handleRiverSell = useCallback(() => {
    const r = newDayCheck(riverRef.current);
    if (r.creel <= 0) return;
    const moonBonus = isEventActive("harvest-moon");
    const coins = r.creel * RIVER_LEVELS[r.level].coinPerFish * (moonBonus ? 2 : 1);
    addCoins(coins);
    const next = { ...r, creel: 0 };
    setRiver(next);
    saveRiverState(next).catch(() => undefined);
    setFireworksKey((k) => k + 1);
    if (moonBonus) {
      queueCelebration("milestone", "Harvest Moon blessing!", `The moon doubles your catch: +${coins.toFixed(2)} coins.`);
    }
  }, [addCoins]);

  /** River of Life: upgrade the camp to the next level. */
  const handleRiverUpgrade = useCallback(() => {
    const r = newDayCheck(riverRef.current);
    const info = RIVER_LEVELS[r.level];
    if (info.upgradeCost <= 0) return;
    if (coinsRef.current.balance < info.upgradeCost) {
      Alert.alert("Not enough coins", `Upgrading the camp costs ${info.upgradeCost.toFixed(2)} coins. You have ${coinsRef.current.balance.toFixed(2)}.`);
      return;
    }
    addCoins(-info.upgradeCost);
    const next: RiverState = { ...r, level: (r.level + 1) as RiverLevel };
    setRiver(next);
    saveRiverState(next).catch(() => undefined);
    queueCelebration("level-up", `${RIVER_LEVEL_NAMES[next.level]}!`, "The riverside camp grows — the villagers cheer.");
  }, [addCoins, queueCelebration]);

  /** Refresh combat stats (and pawn tunic) whenever the Dark Forest opens. */
  useEffect(() => {
    if (activeMap !== "forest") return;
    (async () => {
      try {
        const equipped = await loadEquipped();
        const base = combatStats(equipped);
        // Hospital: the Doctor's Blessing — a checkup's healing buff,
        // consumed when the next battle starts.
        let buff: HospitalBuff | null = null;
        try { buff = await consumeHospitalBuff(); } catch {}
        if (buff) {
          setForestStats({
            attack: Math.round(base.attack * buff.attackMult),
            defense: base.defense,
            maxHp: Math.round(base.maxHp * buff.hpMult),
          });
          queueCelebration("prayers", "Doctor's Blessing", `The hospital's care steadies you: +${Math.round((buff.hpMult - 1) * 100)}% max HP${buff.attackMult > 1 ? `, +${Math.round((buff.attackMult - 1) * 100)}% attack` : ""} for this battle.`);
        } else {
          setForestStats(base);
        }
        const clothesId = equipped.clothes;
        const item = clothesId ? GEAR_BY_ID[clothesId] : undefined;
        if (item?.visual.bodyColor) setForestTunic(item.visual.bodyColor);
        setForestArmor(equipped.armor ?? null);
        setForestWeapon(equipped.weapon ?? null);
      } catch {}
    })();
  }, [activeMap]);

  const handleCollectBuilding = (buildingId: string, pageX?: number, pageY?: number) => {
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
    const isXP = xpIncomeFor(building.type, building.level || 1) > 0;
    // Zero the building NOW (its pill has already morphed away); the award
    // lands in the balance when the coins fly in.
    const updatedBuildings = map.buildings.map(b =>
      b.id === buildingId ? { ...b, accumulated: 0, lastTick: new Date().toISOString() } : b
    );
    saveMap({ ...map, buildings: updatedBuildings });
    measureBalance();
    // Coins fly from where the pill was tapped (fall back to the tile pos).
    if (pageX != null && pageY != null) {
      spawnBurst(pageX, pageY, isXP ? "xp" : "coins");
    } else {
      const fp = buildingFootprint(building.level || 1, building.type, hasFixedFootprint(building));
      withGridOrigin((gx, gy) => {
        spawnBurst(gx + (building.x + fp.w / 2) * cellSize, gy + (building.y + fp.h / 2) * cellSize, isXP ? "xp" : "coins");
      });
    }
    fxTimeoutsRef.current.push(setTimeout(() => {
      if (isXP) {
        awardCustomXP(Math.max(1, Math.floor(amount)), `collect-${buildingId}-${Date.now()}`).catch(() => undefined);
      } else {
        addCoins(amount);
      }
      pulseBalance();
    }, COIN_LAND_MS));
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
  // The town and city grids are taller (10x14) so every district gets its
  // own street; other maps stay 10x10.
  const gridSize = mapGridSize(activeMap);
  const gridW = gridSize.w;
  const gridH = gridSize.h;
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
      const onStream = activeMap === "town" && isStreamTile(x, y);
      const onBridge = activeMap === "town" && isBridgeTile(x, y);
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
            backgroundColor: isSelected ? "#FEF3C7" : b ? "#D1FAE5" : onStream ? "#7DD3FC" : beachCells.has(`${x}-${y}`) ? "#FDE68A" : "#F3F4F6",
            borderWidth: isOrigin || !b ? 1 : 0,
            borderColor: isSelected ? "#F59E0B" : onStream ? "#38BDF8" : beachCells.has(`${x}-${y}`) ? "#FCD34D" : "#E5E7EB",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {decorationAt(x, y) && (
            <Text style={{ fontSize: 22 }}>{DECORATIONS[decorationAt(x, y)!.type].icon}</Text>
          )}
          {onStream && !onBridge && <StreamWater size={cellSize} phase={x + y} />}
          {onBridge && (
            <View style={{ position: "absolute", width: cellSize, height: cellSize }}>
              <StreamWater size={cellSize} phase={x + y} />
              <StreamBridge size={cellSize} />
            </View>
          )}
          {roadAt(x, y) && !onStream && (
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

  // Fast-length gate: Hometown only appears on fasts longer than 40 days.
  // (The entry buttons in profile are hidden too; this covers direct opens.)
  if (hometownLocked) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: pt.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, flexGrow: 1, justifyContent: "center", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", alignSelf: "stretch", marginBottom: 24 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ fontSize: 24, color: pt.text }}>←</Text>
          </Pressable>
          <Text style={{ fontSize: 22, fontWeight: "800", color: pt.text }}>Hometown</Text>
        </View>
        <Text style={{ fontSize: 48 }}>🏘️</Text>
        <Text style={{ fontSize: 20, fontWeight: "800", color: pt.text, marginTop: 16, textAlign: "center" }}>
          Hometown unlocks on longer fasts
        </Text>
        <Text style={{ fontSize: 14, color: pt.subtext, marginTop: 8, textAlign: "center", lineHeight: 20 }}>
          Your town — and your pawn — appear when your fast is longer than {HOMETOWN_MIN_FAST_DAYS} days. Start a longer fast to build together.
        </Text>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: pt.bg }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 12, minHeight: 44, justifyContent: "center" }}>
          <Text style={{ fontSize: 24, color: pt.text }}>←</Text>
        </Pressable>
        <Text numberOfLines={1} style={{ fontSize: 22, fontWeight: "800", color: pt.text, flexShrink: 1 }}>{MAP_INFO[activeMap].icon} {MAP_INFO[activeMap].name}</Text>
        <View style={{ flex: 1 }} />
        {/* ONE morphing pill (balance <=> Collect): rests cream showing the coin
            balance; when coins are waiting it turns gold into "Collect X.XX";
            tapping runs the flip + coin-fly, the balance ticks up, and it
            turns back to the balance face. The info button opens the
            per-building breakdown. */}
        <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1, marginLeft: 8 }}>
          <Animated.View
            ref={balanceRef}
            onLayout={measureBalance}
            style={{ flexShrink: 1, maxWidth: Math.round(windowW * 0.5), transform: [{ scale: balancePulseAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1.14, 1] }) }, { scale: pillMorph.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.93, 1] }) }] }}
          >
            <Pressable
              onPress={pillCollectMode && !collectFx ? handleCollectAll : undefined}
              onLongPress={() => setCollectBreakdownOpen(true)}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              style={{ borderRadius: 999 }}
            >
              <Animated.View
                style={{
                  backgroundColor: pillMorph.interpolate({ inputRange: [0, 1], outputRange: ["#FEF3C7", "#D4AF37"] }),
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  minHeight: 44,
                  elevation: 2,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.2,
                  shadowRadius: 2,
                  transform: [
                    { rotateY: collectFlip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
                    { scale: collectFlip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.88, 1] }) },
                  ],
                }}
              >
                {/* Green FX overlay: fades in as the pill flips to "Collected!". */}
                <Animated.View
                  pointerEvents="none"
                  style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#16A34A", borderRadius: 999, opacity: collectFlip }}
                />
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  {pillFace === "collect" ? (
                    collectFx ? (
                      <>
                        <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                        <Text style={{ fontWeight: "800", fontSize: 13, color: "#FFFFFF", marginLeft: 4 }}>Collected!</Text>
                      </>
                    ) : (
                      <>
                        <MaterialIcons name="monetization-on" size={18} color="#FFFFFF" />
                        <Text numberOfLines={1} style={{ fontWeight: "800", fontSize: 13, color: "#FFFFFF", marginLeft: 4 }}>Collect {headerCoinText(collectibleTotal)}</Text>
                      </>
                    )
                  ) : (
                    <>
                      <MaterialIcons name="monetization-on" size={18} color="#92400E" />
                      <Text numberOfLines={1} style={{ marginLeft: 6, fontWeight: "700" }}>{headerCoinText(coins.balance)}</Text>
                    </>
                  )}
                </View>
              </Animated.View>
            </Pressable>
          </Animated.View>
          <Pressable
            onPress={() => setCollectBreakdownOpen(true)}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            style={{ marginLeft: 4, padding: 4, minHeight: 44, minWidth: 36, alignItems: "center", justifyContent: "center" }}
          >
            <MaterialIcons name="info-outline" size={18} color="#92400E" />
          </Pressable>
        </View>
      </View>

      {/* Compact header summary — the income bonuses (milestone, prayer,
          fellowship, remembrance, garden visits) collapse into ONE chip with
          the combined bonus; tap it for the full breakdown. Streak and
          Collections share the same row so the header stays two rows max. */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {/* Income bonus summary chip */}
        {(() => {
          const combined =
            milestoneMultiplier(coins.lifetimeEarned) *
            prayerMult(prayedToday) *
            fellowshipMult(fellowship) *
            remembranceMult(remembrance.people.length) *
            gardenVisitMult(gardenVisits);
          if (combined <= 1) return null;
          return (
            <Pressable
              onPress={() => setIncomeBreakdownOpen(true)}
              style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, borderWidth: 1, borderColor: "#FDE68A" }}
            >
              <MaterialIcons name="trending-up" size={14} color="#92400E" />
              <Text style={{ marginLeft: 6, fontWeight: "700", fontSize: 12, color: "#92400E" }}>
                Income bonus +{Math.round((combined - 1) * 100)}%
              </Text>
              <MaterialIcons name="expand-more" size={14} color="#92400E" style={{ marginLeft: 2 }} />
            </Pressable>
          );
        })()}

        {/* Daily visit streak chip (compact) */}
        {streak.streak > 0 ? (
          <Pressable
            onPress={() => setStreakDetailOpen(true)}
            style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFF7ED", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, borderWidth: 1, borderColor: "#FDBA74" }}
          >
            <MaterialIcons name="local-fire-department" size={14} color="#EA580C" />
            <Text style={{ marginLeft: 6, fontWeight: "700", fontSize: 12, color: "#9A3412" }}>
              Day {streak.streak}
            </Text>
          </Pressable>
        ) : null}

        {/* Collections button (compact) */}
        <Pressable
          onPress={() => {
            loadCollections().then(setCollectionSummary).catch(() => undefined);
            setCollectionsOpen(true);
          }}
          style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#EDE9FE", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#C4B5FD" }}
        >
          <MaterialIcons name="collections-bookmark" size={14} color="#6D28D9" />
          <Text style={{ marginLeft: 6, fontWeight: "700", fontSize: 12, color: "#5B21B6" }}>
            Collections{(() => {
              if (!collectionSummary) return "";
              const total = collectionSummary.fish.length + collectionSummary.demons.length + collectionSummary.flowers.length;
              const max = 10 + 15 + 6;
              return ` ${total}/${max}`;
            })()}
          </Text>
        </Pressable>
      </View>
      {/* Limited-time heavenly events */}
      {activeEvents.map((ev) => (
        <View
          key={ev.id}
          style={{ flexDirection: "row", alignItems: "center", backgroundColor: ev.id === "weekend-festival" ? "#FDF2F8" : "#EFF6FF", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12, alignSelf: "stretch", borderWidth: 1, borderColor: ev.id === "weekend-festival" ? "#F9A8D4" : "#93C5FD" }}
        >
          <MaterialIcons name={ev.icon as any} size={18} color={ev.id === "weekend-festival" ? "#DB2777" : "#1D4ED8"} />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={{ fontWeight: "800", fontSize: 13, color: ev.id === "weekend-festival" ? "#9D174D" : "#1E40AF" }}>
              {ev.name} — ends in {formatCountdown(ev.endsAt)}
            </Text>
            <Text style={{ fontSize: 12, color: ev.id === "weekend-festival" ? "#BE185D" : "#1E40AF" }}>
              {ev.effects.join(" · ")}
            </Text>
          </View>
        </View>
      ))}


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
              : `${info.icon} ${info.name} 🔒 ${mapUnlockCost(id).toFixed(2)}🪙`;
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
        {activeMap === "city" ? "Tap a FOR SALE lot to purchase it. Upgrade towers for bigger payouts." : activeMap === "mall" ? "A quiet, sacred place. Tap a flower to remember, or the wall to read every name." : activeMap === "well" ? "A quiet place. Draw from the well once a day, and be still." : activeMap === "forest" ? "Face the darkness. Tap STRIKE — your gear is your strength." : activeMap === "river" ? "Cast a line at the riverside camp — the river provides daily." : "Tap an empty plot to build. Businesses earn coins daily while your fast streak is alive."}
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
        <SeasonalBorder variant="garden">
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
            // Record the flower kind in the collection book.
            recordFlowerPlanted(flower).then(({ justCompleted }) => {
              if (justCompleted) {
                const meta = COLLECTION_SETS.flowers;
                addCoins(meta.rewardCoins);
                awardCustomXP(meta.rewardXp, `collection:flowers`).catch(() => undefined);
                queueCelebration("milestone", "Collection complete: Garden Flowers!", `Every bloom planted. +${meta.rewardCoins} coins, +${meta.rewardXp} XP. Title earned: ${meta.rewardTitle}.`);
              }
            }).catch(() => undefined);
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
            const cost = scaledCoins(REMEMBRANCE_UPGRADE_COSTS[nextLevel]);
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
        </SeasonalBorder>
      ) : activeMap === "well" ? (
        <SeasonalBorder variant="well">
        <TheWell
          well={well}
          timeOfDay={timeOfDay}
          pt={pt}
          onDraw={handleWellDraw}
        />
        </SeasonalBorder>
      ) : activeMap === "reserve" ? (
        <SeasonalBorder variant="field">
        <View>
        <SafeBoundary fallbackTitle="The field is resting">
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
        </SafeBoundary>
        {/* Celebration overlays render on every map, including the field. */}
        <FireworksOverlay triggerKey={fireworksKey} />
        <CelebrationOverlay
          spec={celebrationQueue[0] ?? null}
          onDone={dismissCelebration}
        />
        </View>
        </SeasonalBorder>
      ) : activeMap === "forest" ? (
        <SeasonalBorder variant="forest">
        <View>
        <SafeBoundary fallbackTitle="The forest is resting">
        <DarkForest
          stats={forestStats}
          forest={forest}
          tunicColor={forestTunic}
          armorId={forestArmor}
          weaponId={forestWeapon}
          timeOfDay={timeOfDay}
          pt={pt}
          onVictory={handleForestVictory}
        />
        </SafeBoundary>
        {/* Celebration overlays render on every map, including the forest. */}
        <FireworksOverlay triggerKey={fireworksKey} />
        <CelebrationOverlay
          spec={celebrationQueue[0] ?? null}
          onDone={dismissCelebration}
        />
        </View>
        </SeasonalBorder>
      ) : activeMap === "river" ? (
        <SeasonalBorder variant="river">
        <View>
        <SafeBoundary fallbackTitle="The river is resting">
        <RiverCamp
          river={river}
          timeOfDay={timeOfDay}
          pt={pt}
          tunicColor={forestTunic}
          villagerNames={prayedPeople.map((p) => p.name.split(" ")[0])}
          onCatch={handleRiverCatch}
          onSell={handleRiverSell}
          onUpgrade={handleRiverUpgrade}
        />
        </SafeBoundary>
        {/* Celebration overlays render on every map, including the river. */}
        <FireworksOverlay triggerKey={fireworksKey} />
        <CelebrationOverlay
          spec={celebrationQueue[0] ?? null}
          onDone={dismissCelebration}
        />
        </View>
        </SeasonalBorder>
      ) : (
      <View style={{ alignItems: "center", marginBottom: 16 }}>
        <SeasonalBorder
          variant={activeMap === "city" ? "city" : activeMap === "school" ? "school" : "town"}
          lighthouse={
            activeMap === "town"
              ? {
                  level: lighthouseState.level,
                  rewardPulse,
                  milestonePulse,
                  onPress: () => setLighthouseModalVisible(true),
                }
              : undefined
          }
        >
        <View ref={mapGridRef} style={{ position: "relative" }}>
          {rows}
          {/* Holiday decorations over the town/city grid — date-driven. */}
          {(activeMap === "town" || activeMap === "city") && (
            <HolidayMapOverlay season={getHolidaySeason()} />
          )}
          {/* Four-seasons dressing — fills the gaps between holidays. */}
          {(activeMap === "town" || activeMap === "city") && (
            <SeasonMapOverlay season={getSeason()} holiday={getHolidaySeason()} />
          )}
          {/* Depth-sorted layer: buildings, villagers, cars, and the player's pawn
              all interleave by Y. A tall building's art extends above its square;
              villagers walking behind it (north, lower Y) draw first so the
              building overlaps them — true 2.5D. Tap targets stay on the grid. */}
          <View pointerEvents="box-none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
          {/* Buildings overlay - buildings don't capture touches, coins do */}
          {map.buildings.map((b) => {
            const fp = buildingFootprint(b.level || 1, b.type, hasFixedFootprint(b));
            const baseSize = Math.min(fp.w, fp.h) * cellSize * 0.85;
            // Pseudo-3D: tall buildings extend their art above their square.
            const extraPx = tallArtExtraCells(b.type, b.level || 1, b.floors || 1) * cellSize;
            return (
              <View
                key={`bldg-${b.id}`}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: b.x * cellSize,
                  top: b.y * cellSize - extraPx,
                  width: fp.w * cellSize,
                  height: fp.h * cellSize + extraPx,
                  alignItems: "center",
                  justifyContent: "center",
                  // Depth anchor: the building's feet (base of footprint).
                  zIndex: Math.round((b.y + fp.h) * cellSize),
                }}
              >
                <BuildingArt type={b.type} size={baseSize} artH={baseSize + extraPx} level={b.level || 1} floors={b.floors || 1} prayedCount={b.type === "church" ? prayedToday : 0} />
                {/* Ambient life: chimney smoke drifting from hearths */}
                {hasChimney(b.type) && (
                  <ChimneySmoke risePx={cellSize * 0.9} puffSize={Math.max(8, cellSize * 0.28)} />
                )}
                {/* Ambient life: warm window glow at night (8 PM – 6 AM) */}
                {isNight && hasLitWindows(b.type) && (
                  <NightWindowGlow
                    buildingId={b.id}
                    width={fp.w * cellSize}
                    height={fp.h * cellSize + extraPx}
                  />
                )}
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
                zIndex: Math.round((plot.y + 2) * cellSize),
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: "800", color: "#6B7280", letterSpacing: 1 }}>FOR SALE</Text>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#374151", marginTop: 2 }}>🪙{scaledCoins(plot.cost).toFixed(2)}</Text>
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
                zIndex: Math.round((lot.y + lot.h) * cellSize),
              }}
            >
              {isSmall ? (
                // 1x1 lots (40px): a glyph for cottage lots, then the price
                <View style={{ alignItems: "center", justifyContent: "center" }}>
                  {lot.allowedTypes.includes("villager-cottage") ? (
                    <CottageGlyph size={16} />
                  ) : null}
                  <Text style={{ fontSize: 10, fontWeight: "800", color: "#92400E" }}>🪙{scaledCoins(lot.cost).toFixed(2)}</Text>
                </View>
              ) : (
                <>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#B45309", letterSpacing: 1 }}>{"FOR SALE"}</Text>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#92400E", marginTop: 2 }}>🪙{scaledCoins(lot.cost).toFixed(2)}</Text>
                  <Text style={{ fontSize: 8, color: "#B45309", marginTop: 2, textAlign: "center" }} numberOfLines={1}>{lot.name}</Text>
                  {lot.presetType && !map.buildings.some((b) => b.type === lot.presetType) && (
                    lot.presetType === "banquet-table" ? (
                      <View style={{ marginTop: 2 }}><BanquetGlyph size={20} /></View>
                    ) : lot.presetType === "community-garden" ? (
                      <View style={{ marginTop: 2 }}><GardenGlyph size={20} /></View>
                    ) : lot.presetType === "fountain-plaza" ? (
                      <View style={{ marginTop: 2 }}><PlazaGlyph size={20} /></View>
                    ) : (
                      <Text style={{ fontSize: 16, marginTop: 2 }}>{BUILDINGS[lot.presetType].icon}</Text>
                    )
                  )}
                  {!lot.presetType && lot.allowedTypes.includes("villager-cottage") && (
                    <View style={{ marginTop: 2 }}><CottageGlyph size={20} /></View>
                  )}
                </>
              )}
            </View>
            );
          })}
          {/* Townsfolk — prayer lights; those out on field missions (or waiting to be welcomed home) are away.
              bare: entities render directly in the depth layer so villagers walk
              BEHIND tall buildings (zIndex by Y). */}
          <TownNPCs mapState={map} cellSize={cellSize} bare positionsRef={townNpcPositionsRef} onBankVisit={handleBankVisit} lights={lightInfos.filter((l) => !fieldMissions.some((m) => !m.collected && m.personId === l.personId))} onVillagerTap={(p) => {
            const pid = String(p.id);
            const vm = (vmState?.missions ?? []).find((x) => x.personId === pid && x.status !== "done");
            if (vm) setVillagerMissionModal(vm);
            else setPrayerVillagerInfo(p);
          }} missionWaitingIds={vmWaitingIds} missionGuides={vmGuides} onMissionArrival={handleVmArrival} workGuides={workGuides} workMap={workMap} onWorkArrival={handleWorkArrival} scheduleGuides={scheduleGuides} scheduleMap={scheduleMap} scheduleKind={scheduleActivity?.kind} />
          {/* City life: plot workers + commuters from town (depth-sorted, bare) */}
          {activeMap === "city" && (
            <>
              <CityTraffic
                bare
                cellSize={cellSize}
                carCount={Math.min(6, Math.max(0, town.maps.town.buildings.filter((b) => b.type === "house").length))}
              />
              <CityNPCs
                bare
                mapState={map}
                cellSize={cellSize}
                hometownNpcCount={countHometownNpcs(prayedToday)}
                onBankVisit={handleBankVisit}
                positionsRef={cityNpcPositionsRef}
              />
            </>
          )}
          {/* Ambient life: birds gliding across the sky in the daytime (town + city) */}
          {(activeMap === "town" || activeMap === "city") && (
            <MapBirds width={gridW * cellSize} height={gridH * cellSize} birdCount={4} />
          )}
          {/* The player's own pawn, wandering town (depth-sorted with the rest) */}
          {activeMap === "town" && <PlayerPawnWanderer cellSize={cellSize} destTile={scheduleTarget?.tile ?? null} />}
          {/* Surprise visitors — special encounters with "!" badges */}
          {activeMap === "town" && visitors.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => {
                setSelectedVisitor(v);
                if (v.type === "merchant") {
                  buildMerchantDeal().then(setMerchantDeal).catch(() => setMerchantDeal(null));
                }
              }}
              style={{
                position: "absolute",
                left: v.x * cellSize - 8,
                top: v.y * cellSize - 8,
                width: 56,
                height: 56,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: v.type === "golden" ? "#FEF3C7" : v.type === "merchant" ? "#EDE9FE" : "#DBEAFE",
                borderWidth: 2, borderColor: v.type === "golden" ? "#F59E0B" : v.type === "merchant" ? "#7C3AED" : "#3B82F6",
                alignItems: "center", justifyContent: "center",
              }}>
                <MaterialIcons
                  name={v.type === "golden" ? "wb-sunny" : v.type === "merchant" ? "store" : "person"}
                  size={24}
                  color={v.type === "golden" ? "#D97706" : v.type === "merchant" ? "#6D28D9" : "#1D4ED8"}
                />
              </View>
              <View style={{
                position: "absolute", top: -4, right: 2,
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 12 }}>!</Text>
              </View>
            </Pressable>
          ))}
          {/* City delights: hidden coin caches, the wishing fountain, the street
              performer — little rewards tucked around the city. */}
          {activeMap === "city" && (
            <>
              {COIN_CACHE_SPOTS.filter((s) => !cacheClaimedToday(celebrationState, s.id)).map((s) => (
                <CoinCacheMarker key={s.id} cellSize={cellSize} x={s.x} y={s.y} onPress={() => handleCacheTap(s.id)} />
              ))}
              <WishingFountain
                cellSize={cellSize}
                x={WISHING_FOUNTAIN_TILE.x}
                y={WISHING_FOUNTAIN_TILE.y}
                onPress={handleFountainTap}
              />
              <StreetPerformer
                cellSize={cellSize}
                x={STREET_PERFORMER_TILE.x}
                y={STREET_PERFORMER_TILE.y}
                playing={performerPlaying}
                onPress={handlePerformerTap}
              />
            </>
          )}
          </View>
          {/* Coins/XP overlay - only collectibles capture touches */}
          {map.buildings.map((b) => {
            const fp = buildingFootprint(b.level || 1, b.type, hasFixedFootprint(b));
            const earnsCoins = effectiveIncomeFor(b) > 0;
            const earnsXP = xpIncomeFor(b.type, b.level || 1) > 0;
            // Stock indicator: a quiet pill showing the stocked level of
            // food/retail buildings. Empty shelves are a gentle hint, not a
            // warning — the building still earns its regular income.
            const stockedType = isStockedBuildingType(b.type);
            const stockCap = stockedType ? stockCapForLevel(b.level || 1) : 0;
            const stockNow = stockedType
              ? stockForBuilding(town.stockByBuilding, b.id, b.level || 1)
              : 0;
            const stockPct = stockedType && stockCap > 0
              ? Math.round((stockNow / stockCap) * 100)
              : 0;
            const stockEmpty = stockedType && stockNow <= 0;
            const stockBadge = stockedType ? (
              <View
                key={`stock-${b.id}`}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: b.x * cellSize + 2,
                  top: b.y * cellSize - 12,
                  zIndex: 98,
                  elevation: 98,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: stockEmpty ? "#F3F4F6" : stockPct < 50 ? "#FEF3C7" : "#DCFCE7",
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderWidth: 1,
                    borderColor: stockEmpty ? "#E5E7EB" : stockPct < 50 ? "#FCD34D" : "#86EFAC",
                  }}
                >
                  <MaterialIcons
                    name="inventory"
                    size={11}
                    color={stockEmpty ? "#6B7280" : stockPct < 50 ? "#92400E" : "#166534"}
                  />
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "800",
                      color: stockEmpty ? "#6B7280" : stockPct < 50 ? "#92400E" : "#166534",
                      marginLeft: 2,
                    }}
                  >
                    {stockEmpty ? "restock" : `${stockPct}%`}
                  </Text>
                </View>
              </View>
            ) : null;
            if (!earnsCoins && !earnsXP) return stockBadge;
            // Presence indicator: dimmed person icon when no villagers are nearby
            // (building isn't earning). Only for income buildings with nothing banked.
            const positions = activeMap === "city" ? cityNpcPositionsRef.current : townNpcPositionsRef.current;
            const nearby = positions.filter((p) => Math.abs(p.x - b.x) <= 3 && Math.abs(p.y - b.y) <= 3).length;
            const isQuiet = nearby === 0 && !(b.accumulated && b.accumulated > 0);
            // Only show the collectible once something has accumulated
            if (!(b.accumulated && b.accumulated > 0)) {
              // Show quiet indicator for empty earning buildings
              if (!isQuiet) return stockBadge;
              return (
                <React.Fragment key={`overlay-${b.id}`}>
                  {stockBadge}
                <View
                  key={`quiet-${b.id}`}
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: b.x * cellSize + fp.w * cellSize - 28,
                    top: b.y * cellSize - 10,
                    width: 36,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 99,
                    opacity: 0.45,
                  }}
                >
                  <MaterialIcons name="person-off" size={20} color="#9CA3AF" />
                </View>
                </React.Fragment>
              );
            }
            return (
              <React.Fragment key={`overlay-${b.id}`}>
                {stockBadge}
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
                  zIndex: 100,
                  elevation: 100,
                }}
              >
                <SpinningCoin
                  amount={b.accumulated || 0}
                  kind={earnsXP ? "xp" : "coins"}
                  onCollect={(px, py) => handleCollectBuilding(b.id, px, py)}
                  frenzy={frenzyActive}
                  isFull={!earnsXP && isBuildingStorageFull(b)}
                />
              </View>
              </React.Fragment>
            );
          })}
          {/* Hub landmarks — the five gates to the other maps. Tappable via the grid cells below. */}
          {activeMap === "town" && TOWN_LANDMARKS.map((lm) => {
            const unlocked = unlockedMaps.includes(lm.targetMap);
            const info = MAP_INFO[lm.targetMap];
            return (
              <View
                key={`landmark-${lm.id}`}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: lm.x * cellSize,
                  top: lm.y * cellSize,
                  width: lm.w * cellSize,
                  height: lm.h * cellSize,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: unlocked ? 1 : 0.75,
                  zIndex: Math.round((lm.y + lm.h) * cellSize),
                }}
              >
                <LandmarkArt art={lm.art} size={lm.w * cellSize * 0.92} />
                <View style={{ position: "absolute", bottom: -2, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, flexDirection: "row", alignItems: "center" }}>
                  {!unlocked && <MaterialIcons name="lock" size={10} color="#FDE68A" style={{ marginRight: 3 }} />}
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#FFFFFF" }}>{unlocked ? lm.name : `${mapUnlockCost(lm.targetMap).toFixed(0)}`}</Text>
                </View>
                {!unlocked && (
                  <View style={{ position: "absolute", top: 2, right: 2, backgroundColor: "#1D4ED8", borderRadius: 999, width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name="lock" size={12} color="#FFFFFF" />
                  </View>
                )}
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
          {/* Celebration fireworks — pure visual joy on milestones. */}
          <FireworksOverlay triggerKey={fireworksKey} />
          {/* Achievement celebrations: banners + particles (coin rain, confetti,
              doves, cheering hearts). One at a time, auto-dismisses. */}
          <CelebrationOverlay
            spec={celebrationQueue[0] ?? null}
            onDone={dismissCelebration}
          />
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

      {selectedTile && activeMap !== "reserve" && activeMap !== "forest" && activeMap !== "city" && activeMap !== "town" && activeMap !== "mall" && activeMap !== "well" && (
        <View style={{ backgroundColor: pt.card, borderRadius: 12, padding: 12, marginTop: 8 }}>
          <Text style={{ fontWeight: "700", marginBottom: 8, color: pt.text }}>
            Build on plot ({selectedTile.x + 1}, {selectedTile.y + 1})
          </Text>
          {(buildingAt(selectedTile.x, selectedTile.y) || decorationAt(selectedTile.x, selectedTile.y) || roadAt(selectedTile.x, selectedTile.y)) && (
            <>
              {(() => {
                const b = buildingAt(selectedTile.x, selectedTile.y);
                if (b) {
                  const sellPrice = Math.floor(scaledCoins(BUILDINGS[b.type].cost * 0.5));
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
            const affordable = coins.balance >= scaledCoins(def.cost);
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
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "#B45309" }}>🪙 {scaledCoins(m.rewardCoins).toFixed(2)}</Text>
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
              {/* Work Assignments — shifts Jonathan sent lights on */}
              {(() => {
                const jobs = activeWorkAssignments(workState?.assignments ?? []);
                if (jobs.length === 0) return null;
                return (
                  <>
                    <Text style={{ fontWeight: "700", fontSize: 16, color: pt.text, marginTop: 12, marginBottom: 8 }}>
                      Work Assignments
                    </Text>
                    {jobs.map((a) => {
                      const def = WORK_KINDS[a.kind];
                      const done = a.status === "done";
                      return (
                        <View key={a.id} style={{ backgroundColor: pt.bg, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#A7F3D0" }}>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <View
                              style={{
                                width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF",
                                borderWidth: 1.5, borderColor: "#059669",
                                alignItems: "center", justifyContent: "center", marginRight: 8,
                              }}
                            >
                              <MaterialIcons name={def.badgeIcon as any} size={13} color="#059669" />
                            </View>
                            <Text style={{ fontWeight: "700", fontSize: 15, color: pt.text, flex: 1 }}>{a.personName}</Text>
                          </View>
                          <Text style={{ fontSize: 13, color: pt.subtext, marginTop: 6 }}>
                            {def.label}
                            {a.kind === "deliver-meal" && a.recipientName ? ` — for ${a.recipientName}` : ""}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                            <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                              <Text style={{ fontSize: 13, fontWeight: "700", color: "#B45309" }}>🪙 {def.rewardCoins.toFixed(2)}</Text>
                              <Text style={{ fontSize: 13, fontWeight: "700", color: "#7C3AED" }}>⚡ {def.rewardXP} XP</Text>
                            </View>
                            {done ? (
                              <Pressable
                                onPress={() => collectWorkReward(a)}
                                style={{ backgroundColor: "#059669", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}
                              >
                                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Collect</Text>
                              </Pressable>
                            ) : (
                              <Text style={{ fontSize: 12, color: pt.subtext, fontStyle: "italic" }}>
                                {a.status === "en-route" ? "On the way… " : "Working… "}
                                {workCountdownText(a.endsAt, nowMs)}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
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
              const sellPrice = Math.floor(scaledCoins(def.cost * 0.5));
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
                if (coinsRef.current.balance < scaledCoins(WORKER_HIRE_COST)) {
                  Alert.alert("Not enough coins", `Hiring costs ${scaledCoins(WORKER_HIRE_COST).toFixed(2)} coins. You have ${coins.balance.toFixed(2)}.`);
                  return;
                }
                const updated = map.buildings.map(x =>
                  x.id === b.id ? { ...x, workers: (x.workers || 0) + 1 } : x
                );
                saveMap({ ...map, buildings: updated });
                addCoins(-scaledCoins(WORKER_HIRE_COST));
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
                  {isStockedBuildingType(b.type) && (() => {
                    const cap = stockCapForLevel(level);
                    const stock = stockForBuilding(town.stockByBuilding, b.id, level);
                    const ratio = cap > 0 ? Math.min(1, stock / cap) : 0;
                    const empty = stock <= 0;
                    return (
                      <View style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                          <MaterialIcons name="inventory" size={14} color={pt.subtext} />
                          <Text style={{ fontSize: 13, color: pt.subtext, fontWeight: "600", marginLeft: 4 }}>
                            Stock: {Math.round(stock)}/{cap}
                          </Text>
                          <Text style={{ fontSize: 12, color: pt.subtext, marginLeft: 6 }}>
                            {empty
                              ? "regular income"
                              : `+${Math.round(ratio * 50)}% income while stocked`}
                          </Text>
                        </View>
                        <View style={{ height: 6, backgroundColor: pt.bg, borderRadius: 3, overflow: "hidden" }}>
                          <View
                            style={{
                              height: 6,
                              width: `${ratio * 100}%`,
                              backgroundColor: empty ? "#D1D5DB" : ratio < 0.5 ? "#F59E0B" : "#22C55E",
                              borderRadius: 3,
                            }}
                          />
                        </View>
                        <Text style={{ fontSize: 12, color: pt.subtext, marginTop: 4 }}>
                          {empty
                            ? "Shelves are empty — staff a nearby farm or garden to restock."
                            : "Staff a nearby farm or garden to keep the shelves full."}
                        </Text>
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
                        👷 Hire Worker 🪙{scaledCoins(WORKER_HIRE_COST).toFixed(2)} ({workerCount}/{MAX_WORKERS_PER_BUILDING})
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
      {/* Surprise visitor interaction */}
      <Modal
        visible={selectedVisitor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => { setSelectedVisitor(null); setMerchantDeal(null); }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }}
          onPress={() => { setSelectedVisitor(null); setMerchantDeal(null); }}
        >
          <Pressable
            style={{ backgroundColor: pt.card, borderRadius: 16, padding: 20, width: "100%", maxWidth: 340 }}
            onPress={(e) => e.stopPropagation()}
          >
            {(() => {
              const v = selectedVisitor;
              if (!v) return null;
              if (v.type === "merchant") {
                return (
                  <>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                      <MaterialIcons name="store" size={28} color="#6D28D9" />
                      <Text style={{ marginLeft: 10, fontSize: 18, fontWeight: "800", color: pt.text }}>Traveling Merchant</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: pt.subtext, marginBottom: 12 }}>
                      "Traveler! I have wares from distant lands — just for today."
                    </Text>
                    {merchantDeal ? (
                      <>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: pt.text, marginBottom: 4 }}>{merchantDeal.name}</Text>
                        <Text style={{ fontSize: 13, color: pt.subtext, marginBottom: 12 }}>{merchantDeal.description}</Text>
                        <Pressable
                          onPress={async () => {
                            if (coins.balance < merchantDeal.price) {
                              Alert.alert("Not enough coins", `This costs ${merchantDeal.price.toFixed(2)} coins. You have ${coins.balance.toFixed(2)}.`);
                              return;
                            }
                            addCoins(-merchantDeal.price);
                            if (merchantDeal.gearId) {
                              const { loadInventory, saveInventory } = await import("@/lib/gear");
                              const inv = await loadInventory();
                              if (!inv.includes(merchantDeal.gearId)) {
                                await saveInventory([...inv, merchantDeal.gearId]);
                              }
                            } else if (merchantDeal.xpReward > 0) {
                              awardCustomXP(merchantDeal.xpReward, `merchant-blessing:${Date.now()}`).catch(() => undefined);
                            }
                            await markVisitorClaimed(v.id);
                            setVisitors((prev) => prev.filter((x) => x.id !== v.id));
                            setSelectedVisitor(null);
                            setMerchantDeal(null);
                            queueCelebration("milestone", "Deal sealed!", `The merchant bows and moves on.`);
                          }}
                          style={{ backgroundColor: "#7C3AED", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginBottom: 8 }}
                        >
                          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>
                            Buy for {merchantDeal.price.toFixed(2)} coins
                          </Text>
                        </Pressable>
                      </>
                    ) : (
                      <Text style={{ fontSize: 13, color: pt.subtext, marginBottom: 12 }}>Loading wares...</Text>
                    )}
                    <Pressable
                      onPress={() => { setSelectedVisitor(null); setMerchantDeal(null); }}
                      style={{ borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
                    >
                      <Text style={{ color: pt.subtext, fontWeight: "600", fontSize: 15 }}>Maybe later</Text>
                    </Pressable>
                  </>
                );
              }
              if (v.type === "stranger") {
                return (
                  <>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                      <MaterialIcons name="person" size={28} color="#1D4ED8" />
                      <Text style={{ marginLeft: 10, fontSize: 18, fontWeight: "800", color: pt.text }}>A Stranger</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: pt.text, marginBottom: 16, lineHeight: 22 }}>{v.strangerText}</Text>
                    <Pressable
                      onPress={async () => {
                        addCoins(v.strangerCoins || 0);
                        if (v.strangerXp) {
                          awardCustomXP(v.strangerXp, `stranger-prayer:${Date.now()}`).catch(() => undefined);
                        }
                        await markVisitorClaimed(v.id);
                        setVisitors((prev) => prev.filter((x) => x.id !== v.id));
                        setSelectedVisitor(null);
                        queueCelebration("prayers", "Prayer lifted", `+${v.strangerCoins} coins, +${v.strangerXp} XP. The stranger walks on, lighter.`);
                      }}
                      style={{ backgroundColor: "#1D4ED8", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginBottom: 8 }}
                    >
                      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>
                        Pray with them (+{v.strangerCoins}c, +{v.strangerXp} XP)
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setSelectedVisitor(null)}
                      style={{ borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
                    >
                      <Text style={{ color: pt.subtext, fontWeight: "600", fontSize: 15 }}>Walk away</Text>
                    </Pressable>
                  </>
                );
              }
              // Golden light — tap fast!
              return (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                    <MaterialIcons name="wb-sunny" size={28} color="#D97706" />
                    <Text style={{ marginLeft: 10, fontSize: 18, fontWeight: "800", color: pt.text }}>Rare Golden Light</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: pt.subtext, marginBottom: 16 }}>
                    A brilliant light darts through town — catch its blessing before it fades!
                  </Text>
                  <Pressable
                    onPress={async () => {
                      addCoins(v.goldenCoins || 0);
                      if (v.goldenXp) {
                        awardCustomXP(v.goldenXp, `golden-light:${Date.now()}`).catch(() => undefined);
                      }
                      await markVisitorClaimed(v.id);
                      setVisitors((prev) => prev.filter((x) => x.id !== v.id));
                      setSelectedVisitor(null);
                      queueCelebration("milestone", "Golden blessing!", `+${v.goldenCoins} coins, +${v.goldenXp} XP.`);
                    }}
                    style={{ backgroundColor: "#D97706", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginBottom: 8 }}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>
                      Catch it! (+{v.goldenCoins}c, +{v.goldenXp} XP)
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSelectedVisitor(null)}
                    style={{ borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
                  >
                    <Text style={{ color: pt.subtext, fontWeight: "600", fontSize: 15 }}>Let it pass</Text>
                  </Pressable>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
      {/* Collections book */}
      <CollectionsBook visible={collectionsOpen} onClose={() => setCollectionsOpen(false)} pt={pt} />
      {/* Income bonus breakdown — every source behind the summary chip */}
      <Modal
        visible={incomeBreakdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIncomeBreakdownOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 }}
          onPress={() => setIncomeBreakdownOpen(false)}
        >
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, width: "100%", maxHeight: "70%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#92400E" }}>Income Bonuses</Text>
              <Pressable onPress={() => setIncomeBreakdownOpen(false)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView>
              {/* Coin milestone */}
              {(() => {
                const { current, next } = milestoneFor(coins.lifetimeEarned);
                if (!current && !next) return null;
                return (
                  <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                    <MaterialIcons name="emoji-events" size={20} color="#7C3AED" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontSize: 15, color: "#1F2937" }}>{current ? `${current.name} milestone` : "Coin milestone"}</Text>
                      {next ? <Text style={{ fontSize: 12, color: "#6B7280" }}>Next: {next.name} at {next.threshold.toLocaleString()} lifetime</Text> : null}
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#92400E" }}>
                      {current ? `+${Math.round((current.mult - 1) * 100)}%` : "—"}
                    </Text>
                  </View>
                );
              })()}
              {/* Prayer blessing */}
              {prayedToday > 0 ? (
                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                  <MaterialIcons name="volunteer-activism" size={20} color="#92400E" />
                  <Text style={{ fontSize: 15, color: "#1F2937", flex: 1, marginLeft: 10 }}>{prayedToday} prayed</Text>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#92400E" }}>
                    +{Math.round((prayerMult(prayedToday) - 1) * 100)}%
                  </Text>
                </View>
              ) : null}
              {/* Fellowship blessing */}
              {(() => {
                const fm = fellowshipMult(fellowship);
                if (fm <= 1) return null;
                return (
                  <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                    <MaterialIcons name="dinner-dining" size={20} color="#92400E" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontSize: 15, color: "#1F2937" }}>Fellowship</Text>
                      {gatheringNow ? (
                        <Text style={{ fontSize: 12, color: "#6B7280" }}>
                          {map.buildings.some((b) => b.type === "banquet-table") ? "The Marriage Supper is served!" : "Breaking bread now!"}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#92400E" }}>
                      +{((fm - 1) * 100).toFixed(1)}%
                    </Text>
                  </View>
                );
              })()}
              {/* Remembrance blessing */}
              {remembrance.people.length > 0 ? (
                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                  <MaterialIcons name="local-florist" size={20} color="#8A6D1B" />
                  <Text style={{ fontSize: 15, color: "#1F2937", flex: 1, marginLeft: 10 }}>{remembrance.people.length} remembered</Text>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#92400E" }}>
                    +{((remembranceMult(remembrance.people.length) - 1) * 100).toFixed(1)}%
                  </Text>
                </View>
              ) : null}
              {/* Garden visits blessing */}
              {(() => {
                const gv = gardenVisitMult(gardenVisits);
                if (gv <= 1) return null;
                return (
                  <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                    <MaterialIcons name="park" size={20} color="#166534" />
                    <Text style={{ fontSize: 15, color: "#1F2937", flex: 1, marginLeft: 10 }}>Garden visits</Text>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#92400E" }}>
                      +{((gv - 1) * 100).toFixed(1)}%
                    </Text>
                  </View>
                );
              })()}
              {/* Stock: staffed farms/gardens keep nearby shops stocked;
                  well-stocked shops earn more (per-building, not global). */}
              {workState && anySupplySiteStaffed(workState.assignments) ? (
                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                  <MaterialIcons name="inventory" size={20} color="#166534" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 15, color: "#1F2937" }}>Stocked shelves</Text>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>Well-stocked shops earn up to +50% — staff a farm or garden to restock</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#92400E" }}>
                    up to +50%
                  </Text>
                </View>
              ) : null}
            </ScrollView>
            {/* Combined total — the same multiplicative mix the town actually earns */}
            {(() => {
              const combined =
                milestoneMultiplier(coins.lifetimeEarned) *
                prayerMult(prayedToday) *
                fellowshipMult(fellowship) *
                remembranceMult(remembrance.people.length) *
                gardenVisitMult(gardenVisits);
              return (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTopWidth: 1, borderTopColor: "#F3F4F6", marginTop: 4 }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#92400E" }}>Combined income bonus</Text>
                  <Text style={{ fontSize: 17, fontWeight: "800", color: "#D4AF37" }}>+{Math.round((combined - 1) * 100)}%</Text>
                </View>
              );
            })()}
          </View>
        </Pressable>
      </Modal>
      {/* Streak detail — tapped from the compact streak chip */}
      <Modal
        visible={streakDetailOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStreakDetailOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 }}
          onPress={() => setStreakDetailOpen(false)}
        >
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, width: "100%", maxHeight: "70%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialIcons name="local-fire-department" size={22} color="#EA580C" />
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#9A3412", marginLeft: 8 }}>Daily Streak</Text>
              </View>
              <Pressable onPress={() => setStreakDetailOpen(false)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
              <Text style={{ fontSize: 15, color: "#1F2937", flex: 1 }}>Current streak</Text>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#9A3412" }}>Day {streak.streak}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
              <Text style={{ fontSize: 15, color: "#1F2937", flex: 1 }}>Best streak</Text>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#9A3412" }}>Day {streak.bestStreak}</Text>
            </View>
            {(() => {
              const nm = nextMilestoneFor(streak.streak);
              if (!nm) return null;
              return (
                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10 }}>
                  <Text style={{ fontSize: 15, color: "#1F2937", flex: 1 }}>Next milestone</Text>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#9A3412" }}>{nm.coins}c at day {nm.day}</Text>
                </View>
              );
            })()}
          </View>
        </Pressable>
      </Modal>
      {/* Collect breakdown — what's collectible per building */}
      <Modal
        visible={collectBreakdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCollectBreakdownOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 }}
          onPress={() => setCollectBreakdownOpen(false)}
        >
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, width: "100%", maxHeight: "70%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#92400E" }}>Ready to Collect</Text>
              <Pressable onPress={() => setCollectBreakdownOpen(false)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView>
              {town.maps[activeMap].buildings
                .filter(b => (b.accumulated || 0) > 0)
                .sort((a, b) => (b.accumulated || 0) - (a.accumulated || 0))
                .map(b => (
                  <View key={b.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                    <Text style={{ fontSize: 15, color: "#1F2937", flex: 1 }}>{BUILDINGS[b.type]?.name || b.type}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <MaterialIcons name="monetization-on" size={16} color="#D4AF37" />
                      <Text style={{ fontSize: 15, fontWeight: "700", color: "#92400E", marginLeft: 4 }}>{(b.accumulated || 0).toFixed(2)}</Text>
                    </View>
                  </View>
                ))}
            </ScrollView>
            <Pressable
              onPress={() => { setCollectBreakdownOpen(false); handleCollectAll(); }}
              style={{ backgroundColor: "#D4AF37", borderRadius: 12, paddingVertical: 12, marginTop: 16, alignItems: "center" }}
            >
              <Text style={{ fontWeight: "800", fontSize: 15, color: "#FFFFFF" }}>
                Collect {town.maps[activeMap].buildings.reduce((s, b) => s + (b.accumulated || 0), 0).toFixed(2)}
              </Text>
            </Pressable>
          </View>
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
            {(() => {
              const pid = prayerVillagerInfo ? String(prayerVillagerInfo.id) : "";
              const busy =
                !!pid &&
                (personHasActiveWork(workState?.assignments ?? [], pid) ||
                  (vmState?.missions ?? []).some((m) => m.personId === pid && m.status !== "done"));
              if (!pid || busy) return null;
              return (
                <Pressable
                  onPress={() => {
                    setPrayerVillagerInfo(null);
                    setThankedLight(false);
                    setWorkPickerStep("kind");
                    setWorkPickerKind(null);
                    setWorkPickerFor({ id: pid, name: prayerVillagerInfo?.name ?? "Friend" });
                  }}
                  style={{ marginTop: 12, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, backgroundColor: "#059669", flexDirection: "row", alignItems: "center" }}
                >
                  <MaterialIcons name="work" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Assign Work</Text>
                </Pressable>
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

      {/* Work picker — Jonathan sends a light on a timed shift */}
      <Modal
        visible={workPickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setWorkPickerFor(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }}
          onPress={() => setWorkPickerFor(null)}
        >
          <Pressable
            style={{ backgroundColor: pt.card, borderRadius: 16, padding: 20, width: "100%", maxWidth: 360 }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ color: pt.text, fontSize: 18, fontWeight: "800", textAlign: "center" }}>
              {workPickerStep === "recipient" ? "Who is the meal for?" : `Send ${workPickerFor?.name} to work`}
            </Text>
            {workPickerStep === "kind" ? (
              <View style={{ marginTop: 12 }}>
                {(Object.keys(WORK_KINDS) as WorkKind[]).map((kind) => {
                  const def = WORK_KINDS[kind];
                  const available = !!findWorkTarget(kind);
                  return (
                    <Pressable
                      key={kind}
                      disabled={!available}
                      onPress={() => {
                        if (!workPickerFor) return;
                        if (kind === "deliver-meal") {
                          setWorkPickerKind(kind);
                          setWorkPickerStep("recipient");
                        } else {
                          assignVillagerWork(workPickerFor, kind);
                        }
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: pt.bg,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: "#A7F3D0",
                        opacity: available ? 1 : 0.45,
                      }}
                    >
                      <View
                        style={{
                          width: 36, height: 36, borderRadius: 18, backgroundColor: "#ECFDF5",
                          borderWidth: 1.5, borderColor: "#059669",
                          alignItems: "center", justifyContent: "center", marginRight: 12,
                        }}
                      >
                        <MaterialIcons name={def.badgeIcon as any} size={20} color="#059669" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: pt.text, fontWeight: "700", fontSize: 15 }}>{def.label}</Text>
                        <Text style={{ color: pt.subtext, fontSize: 12, marginTop: 2 }}>{def.blurb}</Text>
                        <Text style={{ color: "#B45309", fontSize: 12, fontWeight: "700", marginTop: 4 }}>
                          {def.durationLabel}  ·  🪙{def.rewardCoins.toFixed(2)}  ·  ⚡{def.rewardXP} XP
                          {!available ? "  ·  not built yet" : ""}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => setWorkPickerFor(null)}
                  style={{ marginTop: 4, borderRadius: 12, paddingVertical: 10, alignItems: "center" }}
                >
                  <Text style={{ color: pt.subtext, fontWeight: "600", fontSize: 14 }}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ marginTop: 12, maxHeight: 320 }}>
                <ScrollView>
                  {lightInfos
                    .filter((l) => String(l.personId) !== String(workPickerFor?.id))
                    .slice(0, 40)
                    .map((l) => (
                      <Pressable
                        key={String(l.personId)}
                        onPress={() => {
                          if (workPickerFor && workPickerKind) {
                            assignVillagerWork(workPickerFor, workPickerKind, l.name);
                          }
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: pt.bg,
                          borderRadius: 12,
                          padding: 12,
                          marginBottom: 8,
                        }}
                      >
                        <View
                          style={{
                            width: 14, height: 14, borderRadius: 7, backgroundColor: "#FBBF24", marginRight: 10,
                          }}
                        />
                        <Text style={{ color: pt.text, fontWeight: "600", fontSize: 15 }}>{l.name}</Text>
                      </Pressable>
                    ))}
                </ScrollView>
                <Pressable
                  onPress={() => setWorkPickerStep("kind")}
                  style={{ marginTop: 4, borderRadius: 12, paddingVertical: 10, alignItems: "center" }}
                >
                  <Text style={{ color: pt.subtext, fontWeight: "600", fontSize: 14 }}>Back</Text>
                </Pressable>
              </View>
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

      {/* Lighthouse modal — daily blessing + upgrades */}
      <Modal
        visible={lighthouseModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLighthouseModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}
          onPress={() => setLighthouseModalVisible(false)}
        >
          <Pressable
            style={{ backgroundColor: pt.card, borderRadius: 20, padding: 24, alignItems: "center" }}
            onPress={(e) => e.stopPropagation()}
          >
            {(() => {
              const verse = lighthouseVerseForDate();
              const blessed = lighthouseState.lastBlessingDate === localDateStr();
              const level = lighthouseState.level;
              const reward = LIGHTHOUSE_BLESSING_COINS * level;
              const maxed = level >= LIGHTHOUSE_MAX_LEVEL;
              const upgradeCost = scaledCoins(LIGHTHOUSE_UPGRADE_COSTS[level] ?? 0);
              return (
                <>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: pt.text, textAlign: "center" }}>
                    The Lighthouse
                  </Text>
                  <Text style={{ fontSize: 13, color: pt.subtext, textAlign: "center", marginTop: 6, marginBottom: 4 }}>
                    Level {level}{maxed ? " — shining at full strength" : ""}
                  </Text>
                  <Text style={{ fontSize: 13, color: pt.subtext, textAlign: "center", marginBottom: 16, fontStyle: "italic" }}>
                    Its beam guides every villager safely home.
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
                    onPress={handleLighthouseBlessing}
                    disabled={blessed}
                    style={({ pressed }) => [{
                      borderRadius: 12,
                      paddingVertical: 14,
                      paddingHorizontal: 24,
                      alignItems: "center",
                      backgroundColor: blessed ? pt.border : "#1E40AF",
                      opacity: pressed && !blessed ? 0.85 : 1,
                      width: "100%",
                    }]}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16 }}>
                      {blessed ? "Blessed today — come back tomorrow" : `Receive its blessing (+${reward.toFixed(2)} coins)`}
                    </Text>
                  </Pressable>
                  {!maxed && (
                    <Pressable
                      onPress={handleLighthouseUpgrade}
                      style={({ pressed }) => [{
                        borderRadius: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 24,
                        alignItems: "center",
                        backgroundColor: "transparent",
                        borderWidth: 1.5,
                        borderColor: "#1E40AF",
                        opacity: pressed ? 0.7 : 1,
                        width: "100%",
                        marginTop: 10,
                      }]}
                    >
                      <Text style={{ color: "#1E40AF", fontWeight: "800", fontSize: 15 }}>
                        Upgrade to level {level + 1} ({upgradeCost.toFixed(2)} coins)
                      </Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => setLighthouseModalVisible(false)} style={{ marginTop: 12, padding: 8 }}>
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
                const total = scaledCoins(lot.cost + def.cost);
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
                      ) : lot.presetType === "community-garden" ? (
                        <View style={{ marginRight: 14 }}><GardenGlyph size={44} /></View>
                      ) : lot.presetType === "fountain-plaza" ? (
                        <View style={{ marginRight: 14 }}><PlazaGlyph size={44} /></View>
                      ) : (
                        <Text style={{ fontSize: 40, marginRight: 14 }}>{def.icon}</Text>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: "800", color: pt.text }}>{def.name}</Text>
                        <Text style={{ fontSize: 13, color: pt.subtext, marginTop: 2 }}>
                          {def.description}
                        </Text>
                        <Text style={{ fontSize: 12, color: pt.subtext, marginTop: 4 }}>
                          Plot 🪙{scaledCoins(lot.cost).toFixed(2)} + building 🪙{scaledCoins(def.cost).toFixed(2)}
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
                { title: "Homes", types: ["villager-cottage"] },
                { title: "Special", types: ["church", "pawn-house", "farm", "house"] },
              ];
              return (
                <>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: pt.text, textAlign: "center" }}>
                    {lot.name} — FOR SALE
                  </Text>
                  <Text style={{ fontSize: 13, color: pt.subtext, textAlign: "center", marginTop: 6, marginBottom: 12 }}>
                    Purchase this lot for {scaledCoins(lot.cost).toFixed(2)} coins and choose what to build. Lot buildings have a fixed home here — they can't be moved or sold, only upgraded.
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
                            const total = scaledCoins(lot.cost + def.cost);
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
                                {type === "villager-cottage" ? (
                                  <View style={{ marginRight: 12 }}><CottageGlyph size={28} /></View>
                                ) : (
                                  <Text style={{ fontSize: 28, marginRight: 12 }}>{def.icon}</Text>
                                )}
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 15, fontWeight: "700", color: pt.text }}>{def.name}</Text>
                                  <Text style={{ fontSize: 12, color: pt.subtext }}>
                                    {effectiveIncomeFor({ type, level: 1 } as PlacedBuilding) > 0 ? `+${effectiveIncomeFor({ type, level: 1 } as PlacedBuilding)}/day` : xpIncomeFor(type, 1) > 0 ? `+${xpIncomeFor(type, 1)} XP/day` : def.description}
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
    {/* Coin-fly overlay: coins burst from collected buildings and fly up to
        the balance in the header. Lives outside the ScrollView so the coins
        can cross into the header; never touches anything. */}
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 999, elevation: 999 }}>
      {bursts.map((b) => (
        <CoinBurst key={b.id} burst={b} onDone={removeBurst} />
      ))}
    </View>
    </View>
  );
}
