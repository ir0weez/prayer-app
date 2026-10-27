import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Svg, { Path, Circle, Ellipse, Rect, Line, Polygon, G } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
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
  dailyIncomeForMap,
  accrueAwayIncome,
  cafeAnchorDiner,
  missedDaysIncome,
  presenceMultiplierFor,
  grantFlyers,
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
  applyCoinsDelta,
  loadCoinsRecord,
  parseTown,
  parseOwnedItems,
  parseUnlockedMaps,
  emptyTownState,
  tierForFastDay,
  effectiveIncomeFor,
  beginConstruction,
  constructionRemainingMs,
  constructionTimeLabel,
  effectiveLevel,
  formatConstructionRemaining,
  isUnderConstruction,
  settleBuilding,
  settleTownState,
  plotIncomeMult,
  xpIncomeFor,
  upgradeCostFor,
  CITY_PLOTS,
  plotAt,
  SCHOOL_PLOTS,
  schoolPlotAt,
  loadBellState,
  saveBellState,
  bellBlessingCoins,
  type SchoolPlot,
  isCityStreet,
  loadPurchasedPlots,
  savePurchasedPlots,
  TOWN_LOTS,
  TOWN_PATH,
  townLotAt,
  lotPurchaseBlocker,
  countBuildingsOfType,
  buildingCoveringRect,
  isTownLotBuilding,
  isTownPath,
  hasFixedFootprint,
  buildingStorageCap,
  isBuildingStorageFull,
  isRestaurantType,
  isStockedBuildingType,
  stockCapForLevel,
  stockMultiplierFor,
  currentStockForBuilding,
  isStockedToday,
  applyRestockBox,
  neediestStockedBuilding,
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
  cancelMission,
  emptyMissions,
  loadMissions as loadFieldMissions,
  saveMissions as saveFieldMissions,
  pruneMissions,
  rollMissionBlessing,
  MISSION_DURATIONS,
  MISSION_BLESSING_VERSION,
  MAX_ACTIVE_MISSIONS,
  missionCollectRaw,
  missionStatus,
  type FieldMission,
  type MissionDurationId,
  TOWN_LANDMARKS,
  townLandmarkAt,
  type TownLandmark,
  isStreamTile,
  isBridgeTile,
  formatCoins,
} from "@/lib/hometown";
import { refreshHouseBonusCache } from "@/lib/pawn-house";
import { isEnterableRestaurant, restaurantInteriorBonus } from "@/lib/restaurant-interior";
import { maybeGrantRestitution, RESTITUTION_MESSAGE } from "@/lib/restitution";
import { getTodayISOString, type Person } from "@/lib/prayercircle-data";
import {
  buildCafeBoard,
  CAFE_HOME_LOT_ID,
  CAFE_WEEK_LOT,
  flourishTierFor,
  hasFaithfulWeek,
  loadCafeStreetData,
  ovenStateFor,
  weekStripFor,
} from "@/lib/cafe-street";
import { CafeMapMarker, CafeWeekLot, type CafeAnchor } from "@/components/cafe-street";
import { MONUMENT_STORAGE_KEY, MONUMENT_DESIGNS, parseMonuments } from "@/lib/monuments";
import { getCachedBoosts, refreshGearBoostCache, combatStats, loadEquipped, GEAR_BY_ID, BASE_CRIT_CHANCE, type CombatStats } from "@/lib/gear";
import { MINI_GAME_CAPS, TRAINING_BONUS_MULT, SET_BONUS_RATE, loadSetCompletedDates, loadTodaySetStatus, loadTrainingBonus, playsLeftToday, recordPlay, scaleMiniGamePayout, type TodaySetStatus } from "@/lib/mini-games";
import {
  cacheSchoolPerks,
  getCachedSchoolPerks,
  loadSchoolPerks,
  perksForSchoolBuildings,
} from "@/lib/school-perks";
import { PlayCard, type MiniGameReward } from "@/components/mini-game-scene";
import { GardenGame } from "@/components/garden-game";
import { TideGame } from "@/components/tide-game";
import type { CollectionUpdate } from "@/lib/collections";
import {
  loadPrestigeLevel, loadPrestigeState, prestigeMultiplier, totalPrestigeMultiplier,
  prestigeOffer, performPrestige, cityExists, offerBossCleared, recordBossVictory,
  bossGateVisibility, emptyPrestigeState, type PrestigeOffer, type PrestigeState,
} from "@/lib/prestige";
import {
  depthBlessingBonusForLevels, depthBlessingMultiplierForLevels, loadMineState,
} from "@/lib/mountain";
import {
  BADGE_BY_ID, GILDED_INCOME_MULT, MIST_FOREST_COIN_MULT, BLOODMOON_COIN_MULT,
  bossGateFor, setCachedBadges, refreshBadgeCache, type BadgeId, type BossDef,
} from "@/lib/badges";
import type { PersonalFast } from "@/lib/prayercircle-fasting";
import { beardGrowthFor, loadCustomPawn, type CustomPawn } from "@/lib/pawn";
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
  sendWorkAssignment,
  tickWorkAssignments,
  markWorkArrived,
  advanceRestockArrival,
  collectWorkAssignment,
  activeWorkAssignments,
  personHasActiveWork,
  workCountdownText,
  anySupplySiteStaffed,
  WORK_KINDS,
  type WorkKind,
  type VillagerWorkAssignment,
  type VillagerWorkState,
} from "@/lib/villager-work";
import {
  jobCollectXP,
  loadJobCollectLedger,
  recordCollect,
  saveJobCollectLedger,
} from "@/lib/job-collect-xp";
import {
  lightsForMap,
  loadVillagerLocations,
  locatedCountOnMap,
  saveVillagerLocations,
  settleAndSaveVillagerLocations,
  settleVillagerLocations,
  villagerMapOf,
  type VillagerLocations,
} from "@/lib/villager-locations";
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
import { WorkShiftGame } from "@/components/work-shift-game";
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
import {
  buildAwayReport,
  formatWholeCoins,
  HOMETOWN_LAST_VISIT_KEY,
  phaseForTimeOfDay,
  phaseWindowsLit,
  PHASE_WASH,
  type AwayReport,
  type AwayShiftInput,
  type DayPhase,
} from "@/lib/welcoming-town";
import { TownNPCs, CityNPCs, countHometownNpcs, type LightInfo } from "@/components/town-npcs";
import { PaperBuildingArt, PaperLandmarkArt } from "@/components/paper-building-art";
import { PaperDecoration } from "@/components/paper-decoration";
import { PaperCanvas } from "@/components/paper-interior";
import { PAPER_GROUND, paperDecorationKind } from "@/lib/paper-town";
import { CityTraffic } from "@/components/city-traffic";
import { ChimneySmoke, hasChimney } from "@/components/chimney-smoke";
import { MapBirds } from "@/components/map-birds";
import {
  getActiveScheduleActivity,
  resolveScheduleTarget,
  type ScheduleActivity,
  type ScheduleTarget,
} from "@/lib/schedule-sync";
import { PlayerPawnWanderer } from "@/components/player-pawn";
import { WalkableTownShell } from "@/components/walkable-town";
import { type WalkTile } from "@/lib/walkable-town";
import { StreetWorldView } from "@/components/wide-street";
import { StreetVillagers } from "@/components/street-villagers";
import {
  defaultWideStreetState,
  deriveStreetWorld,
  loadWideStreetState,
  planStreetWalk,
  saveWideStreetState,
  settleWideStreetMigration,
  streetPlaceAt,
  streetPlaceByBuildingId,
  type StreetPlace,
  type WideStreetState,
} from "@/lib/wide-street";
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
    // Ministry Row — the converted southern lots
    case "bible-study-hall": return 0.6;
    case "fasting-house": return 0.4;
    case "gym": return 0.4;
    case "outreach-center": return 0.4;
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
        <View style={{ position: "absolute", top: 0, left: -3, width: w + 6, height: roofH, backgroundColor: roof, borderRadius: 3, zIndex: 2, borderWidth: 1.5, borderColor: side }}>
          <View style={{ height: 2, backgroundColor: "#FFFFFF", opacity: 0.35, borderRadius: 1 }} />
        </View>
        {opts.extraTop}
        <View style={{ flex: 1, flexDirection: "row", paddingTop: roofH + 2 }}>
          {/* front face — gentle outline so towers read in the storybook style */}
          <View style={{ flex: 1, backgroundColor: front, borderBottomLeftRadius: 5, overflow: "hidden", alignItems: "center", paddingTop: opts.topPad ?? H * 0.04, borderWidth: 2, borderRightWidth: 0, borderColor: side }}>
            {Array.from({ length: rows }).map((_, r) => (
              <View key={r} style={{ flexDirection: "row", marginVertical: gap / 2 }}>
                {Array.from({ length: cols }).map((_, c) => (
                  <View key={c} style={{ width: winW, height: winH, backgroundColor: lit(r, c) ? LIT : (opts.winOff ?? front), marginHorizontal: gap / 2, borderRadius: 2, opacity: lit(r, c) ? 1 : 0.55 }} />
                ))}
              </View>
            ))}
          </View>
          {/* side face — darker, suggests volume */}
          <View style={{ width: sideW, backgroundColor: side, borderBottomRightRadius: 5, borderWidth: 2, borderLeftWidth: 0, borderColor: roof }}>
            <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, backgroundColor: "#FFFFFF", opacity: 0.22 }} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Storybook building kit — THE canonical map style (Jonathan's pick):
// small front-facing storybook buildings in the manner of the church, the
// villager cottage, and Artisans' Row — warm walls with a gentle outline, a
// pitched roof, an arched door with a knob, framed windows with cross
// mullions, a hanging sign medallion, and a soft ground shadow. Dressing
// grows with level so an upgrade is visible from the street:
//   L1 modest — sign medallion, one window, plain door and roof.
//   L2 grown  — second window, plant pots by the door, door glass.
//   L3 grand  — gold trim, flower boxes + pots in bloom, banners, gilded roof.
// Every flat "blob" / glyph-plaque case in BuildingArt renders through this
// kit (or hand-composes the same pieces) so a whole map reads in ONE style.
// ---------------------------------------------------------------------------

const STORY_GOLD = "#C9963C";

function storybook(opts: {
  s: number; H: number; lv: number;
  lit: (i: number, j: number) => boolean; LIT: string;
  wall: string; outline: string; roof: string;
  w?: number; bodyH?: number;
  roofStyle?: "gable" | "flat" | "awning";
  awning?: [string, string];
  doorColor?: string; doorAt?: "center" | "right"; doorWide?: boolean;
  glass?: string; warm?: boolean;
  sign?: React.ReactNode; signBg?: string;
  display?: React.ReactNode; displayGlass?: string;
  chimney?: string;
  banner?: string;
  upperWin?: boolean;
  trim?: string;
  seed?: number;
  front?: React.ReactNode;
}) {
  const { s, H, lv } = opts;
  const w = opts.w ?? s * 0.88;
  const bodyH = opts.bodyH ?? H * 0.5;
  const roofStyle = opts.roofStyle ?? "gable";
  const trim = opts.trim ?? STORY_GOLD;
  const seed = opts.seed ?? 0;
  const bodyLeft = (s - w) / 2;
  const roofH = roofStyle === "gable" ? w * 0.22 : Math.max(6, H * 0.05);
  const glassFor = (j: number) => (opts.warm || opts.lit(seed, j) ? opts.LIT : (opts.glass ?? "#BFDBFE"));
  const doorW = s * (opts.doorWide ? 0.26 : 0.17);
  const doorH = bodyH * 0.48;
  const doorAt = opts.doorAt ?? (opts.display ? "right" : "center");
  const doorCenterBody = doorAt === "right" ? w - s * 0.06 - doorW / 2 : w / 2;
  const winW = s * 0.15;
  const winH = bodyH * 0.3;
  const winTop = bodyH * 0.3;
  const med = s * 0.19;
  const awningH = opts.awning ? s * 0.1 : 0;

  const win = (j: number, key: string) => (
    <View key={key} style={{ width: winW, height: winH, backgroundColor: glassFor(j), borderWidth: 1.6, borderColor: opts.outline, borderTopLeftRadius: winW / 2, borderTopRightRadius: winW / 2, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, overflow: "hidden" }}>
      <View style={{ position: "absolute", left: winW / 2 - 0.8, top: 0, bottom: 0, width: 1.6, backgroundColor: opts.outline, opacity: 0.55 }} />
      <View style={{ position: "absolute", top: winH / 2 - 0.8, left: 0, right: 0, height: 1.6, backgroundColor: opts.outline, opacity: 0.55 }} />
    </View>
  );
  const flowerBox = (key: string) => (
    <View key={key} style={{ width: winW + 4, height: Math.max(4, s * 0.05), backgroundColor: "#2F6B31", borderRadius: 2, borderWidth: 0.8, borderColor: "#1E4620", flexDirection: "row", justifyContent: "space-around", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: Math.max(3, s * 0.035), height: Math.max(3, s * 0.035), borderRadius: Math.max(1.5, s * 0.018), backgroundColor: i % 2 ? "#F9A8D4" : "#F472B6" }} />
      ))}
    </View>
  );
  const pot = (key: string) => (
    <View key={key} style={{ alignItems: "center" }}>
      <View style={{ width: s * 0.1, height: s * 0.055, backgroundColor: "#3E8E41", borderTopLeftRadius: s * 0.05, borderTopRightRadius: s * 0.05, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, alignItems: "center", justifyContent: "center" }}>
        {lv >= 3 && <View style={{ width: Math.max(3, s * 0.04), height: Math.max(3, s * 0.04), borderRadius: Math.max(1.5, s * 0.02), backgroundColor: "#F472B6", borderWidth: 0.8, borderColor: "#FDE68A" }} />}
      </View>
      <View style={{ width: s * 0.085, height: s * 0.06, backgroundColor: "#B45309", borderBottomLeftRadius: 3, borderBottomRightRadius: 3, borderWidth: 1, borderColor: "#7A3606", marginTop: -1 }} />
    </View>
  );

  return (
    <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
      {/* soft ground shadow */}
      <View style={{ position: "absolute", bottom: 0, width: w * 1.1, height: Math.max(5, s * 0.05), backgroundColor: "#000000", opacity: 0.13, borderRadius: 999 }} />
      {/* chimney (hearth buildings — the smoke emitter anchors at the box top) */}
      {opts.chimney && (
        <View style={{ position: "absolute", bottom: bodyH + roofH * 0.2, right: bodyLeft + w * 0.1, width: s * 0.09, height: H * 0.2, backgroundColor: opts.chimney, borderWidth: 1.5, borderColor: opts.outline, borderRadius: 2, zIndex: 0 }}>
          <View style={{ position: "absolute", top: -3, left: -2, right: -2, height: 5, backgroundColor: opts.chimney, borderWidth: 1.5, borderColor: opts.outline, borderRadius: 2 }} />
        </View>
      )}
      {/* roof */}
      {roofStyle === "gable" ? (
        <Svg width={w + 6} height={roofH} viewBox="0 0 100 22" style={{ marginBottom: -2, zIndex: 1 }}>
          <Polygon points="3,22 50,3 97,22" fill={opts.roof} stroke={opts.outline} strokeWidth={2.5} />
          {lv >= 3 && <Polygon points="25,22 50,10 75,22" fill={trim} opacity={0.45} />}
        </Svg>
      ) : (
        <View style={{ width: w + 4, height: roofH, backgroundColor: opts.roof, borderWidth: 2, borderColor: opts.outline, borderRadius: 3, marginBottom: -2, zIndex: 1 }}>
          <View style={{ height: 2, backgroundColor: "#FFFFFF", opacity: 0.3, borderRadius: 1 }} />
        </View>
      )}
      {/* body */}
      <View style={{ width: w, height: bodyH, backgroundColor: opts.wall, borderWidth: 2, borderColor: opts.outline, borderBottomLeftRadius: 5, borderBottomRightRadius: 5, zIndex: 1 }}>
        {/* side shade — a whisper of volume on the right edge */}
        <View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: Math.max(4, w * 0.11), backgroundColor: "#000000", opacity: 0.1, borderBottomRightRadius: 5 }} />
        {/* striped awning over the storefront */}
        {opts.awning && (
          <View style={{ position: "absolute", top: 0, left: -2, right: -2, height: awningH, flexDirection: "row", overflow: "hidden", borderWidth: 1.5, borderColor: opts.outline, borderTopLeftRadius: 4, borderTopRightRadius: 4, zIndex: 3 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={{ flex: 1, backgroundColor: i % 2 ? opts.awning![1] : opts.awning![0] }} />
            ))}
          </View>
        )}
        {/* L3 gold trim under the eaves */}
        {lv >= 3 && (
          <View style={{ position: "absolute", top: awningH + 3, left: 5, right: 5, height: 3, backgroundColor: trim, borderRadius: 2, opacity: 0.85 }} />
        )}
        {/* hanging sign medallion — the building's identity */}
        {opts.sign && (
          <View style={{
            position: "absolute", zIndex: 4, alignItems: "center", justifyContent: "center",
            width: med, height: med, borderRadius: med / 2,
            backgroundColor: opts.signBg ?? "#FFF8E7",
            borderWidth: 2, borderColor: lv >= 3 ? trim : opts.outline,
            ...(opts.upperWin
              ? { top: s * 0.03, left: s * 0.05 }
              : { top: -s * 0.02, left: w / 2 - med / 2 }),
          }}>
            {opts.sign}
          </View>
        )}
        {/* upper window pair (taller homes / halls) */}
        {opts.upperWin && (
          <View style={{ position: "absolute", top: bodyH * 0.1, left: 0, right: 0, flexDirection: "row", justifyContent: "center" }}>
            {[3, 4].map((j) => (
              <View key={j} style={{ marginHorizontal: s * 0.05 }}>
                {win(j, `up${j}`)}
              </View>
            ))}
          </View>
        )}
        {/* side windows — one at L1, a pair from L2 */}
        {!opts.display && (
          <>
            <View style={{ position: "absolute", left: s * 0.06, top: winTop }}>{win(0, "wl")}</View>
            {lv >= 3 && <View style={{ position: "absolute", left: s * 0.06 - 2, top: winTop + winH + 2 }}>{flowerBox("fl")}</View>}
            {lv >= 2 && (
              <>
                <View style={{ position: "absolute", right: s * 0.06, top: winTop }}>{win(1, "wr")}</View>
                {lv >= 3 && <View style={{ position: "absolute", right: s * 0.06 - 2, top: winTop + winH + 2 }}>{flowerBox("fr")}</View>}
              </>
            )}
          </>
        )}
        {/* wide storefront display window */}
        {opts.display && (
          <View style={{
            position: "absolute", top: bodyH * 0.18, height: bodyH * 0.46,
            left: doorAt === "right" ? s * 0.05 : w / 2 - (w * 0.66) / 2,
            width: doorAt === "right" ? w * 0.56 : w * 0.66,
            backgroundColor: opts.displayGlass ?? "#E8F4FA",
            borderWidth: 2, borderColor: lv >= 3 ? trim : opts.outline,
            borderRadius: 4, overflow: "hidden", alignItems: "center", justifyContent: "center",
          }}>
            <View style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1.6, marginLeft: -0.8, backgroundColor: opts.outline, opacity: 0.35 }} />
            {opts.display}
          </View>
        )}
        {/* L3 banners flanking the door */}
        {opts.banner && lv >= 3 && !opts.display && [0, 1].map((i) => (
          <View key={i} style={{
            position: "absolute", top: awningH + bodyH * 0.06, height: bodyH * 0.36, width: s * 0.055,
            left: i === 0 ? doorCenterBody - doorW / 2 - s * 0.075 : doorCenterBody + doorW / 2 + s * 0.02,
            backgroundColor: opts.banner, borderRadius: 2, borderWidth: 1, borderColor: opts.outline,
            alignItems: "center", paddingTop: 3,
          }}>
            <View style={{ width: s * 0.028, height: 2, backgroundColor: trim, marginVertical: 1.5 }} />
            <View style={{ width: s * 0.028, height: 2, backgroundColor: trim, marginVertical: 1.5 }} />
          </View>
        ))}
        {/* door — arched, with a knob and (from L2) a little glass pane */}
        <View style={{
          position: "absolute", bottom: 0, height: doorH, width: doorW,
          ...(doorAt === "right" ? { right: s * 0.06 } : { left: w / 2 - doorW / 2 }),
          backgroundColor: opts.doorColor ?? "#6B4423",
          borderTopLeftRadius: doorW / 2, borderTopRightRadius: doorW / 2,
          borderWidth: 1.6, borderBottomWidth: 0, borderColor: lv >= 3 ? trim : opts.outline,
          alignItems: "center",
        }}>
          {lv >= 2 && (
            <View style={{ marginTop: doorH * 0.12, width: doorW * 0.5, height: doorH * 0.3, backgroundColor: glassFor(9), borderTopLeftRadius: doorW * 0.25, borderTopRightRadius: doorW * 0.25, borderWidth: 1, borderColor: opts.outline }} />
          )}
          <View style={{ position: "absolute", right: 3, top: doorH * 0.55, width: 4, height: 4, borderRadius: 2, backgroundColor: "#FBBF24", borderWidth: 0.6, borderColor: "#92400E" }} />
        </View>
      </View>
      {/* L3 stone step under the door */}
      {lv >= 3 && (
        <View style={{ position: "absolute", bottom: -1, left: bodyLeft + doorCenterBody - (doorW + s * 0.08) / 2, width: doorW + s * 0.08, height: 4.5, backgroundColor: "#D6CDBB", borderWidth: 1, borderColor: opts.outline, borderRadius: 2 }} />
      )}
      {/* L2+ plant pots at the base corners */}
      {lv >= 2 && !opts.front && (
        <>
          <View style={{ position: "absolute", bottom: 0, left: bodyLeft + s * 0.01 }}>{pot("pl")}</View>
          <View style={{ position: "absolute", bottom: 0, right: bodyLeft + s * 0.01 }}>{pot("pr")}</View>
        </>
      )}
      {opts.front}
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

/** Hub landmark art — the five gates to the other maps, in paper
 * (Paper Town): PaperLandmarkArt draws the well, the garden gate, the
 * mission trailhead, the river dock and the dark-forest portal grove
 * as layered paper scenes. The forest beyond the portal stays pixel —
 * this is only the town map's gate to it. */
function LandmarkArt({ art, size }: { art: TownLandmark["art"]; size: number }) {
  return <PaperLandmarkArt art={art} size={size} />;
}

/** v285: street lamps stand on a rhythm of the lane's tiles —
 * deterministic from the tile itself, so the same lamps stand in the
 * same places on every render, and only ever on the lane. */
function lampForTile(x: number, y: number): boolean {
  return (x * 7 + y * 13) % 9 === 0;
}

/* v291: the Horizon strip that crowned the old grid retired with
 * it — the skyline now rides at the Wide Street's head, in the same
 * HORIZON_DRESS (components/street-places-art, StreetSkyline). */

function BuildingArt({ type, size, level = 1, floors = 1, prayedCount = 0, artH, blessed = false, night = false }: { type: string; size: number; level?: number; floors?: number; prayedCount?: number; artH?: number; blessed?: boolean; night?: boolean }) {
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
  // At night (8 PM – 6 AM) every window that flows through this pattern —
  // the storybook kit's glass, the tower grids, and the hand-drawn cases
  // that gate their glass on isLit — glows warm from inside. The night
  // light lives in the art itself now; there is no overlay. By day the
  // pattern is exactly what it has always been, so day art is unchanged.
  const isLit = night
    ? (_i: number, _j: number) => true
    : (i: number, j: number) => ((i * 7 + j * 13 + lv * 5) % 10) < litRatio * 10;
  const LIT = "#FDE68A";
  switch (type) {
    case "house": {
      // A home that grows with its level: Cottage → House → Townhouse →
      // Villa → Mansion, all in the storybook style (pitched roofs, framed
      // windows, hearth chimney — the smoke emitter lives on this type).
      const H = artH ?? s;
      const chimney = "#A8A29E";
      if (lv >= 5) return storybook({
        s, H, lv, lit: isLit, LIT, seed: 5,
        wall: "#FFFBEB", outline: "#92400E", roof: "#7C2D12",
        w: s * 0.98, bodyH: H * 0.6, upperWin: true, chimney, doorWide: true, doorColor: "#7C2D12",
        front: (
          <>
            {/* porch columns */}
            {[0.1, 0.32, 0.62, 0.84].map((fx, i) => (
              <View key={i} style={{ position: "absolute", bottom: 0, left: s * fx, width: s * 0.05, height: H * 0.58, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#D6A85C", borderRadius: 2 }} />
            ))}
            {/* twin fountains */}
            {[0, 1].map((i) => (
              <View key={`f${i}`} style={{ position: "absolute", bottom: 1, left: i ? undefined : s * 0.01, right: i ? s * 0.01 : undefined, width: s * 0.13, height: s * 0.07, backgroundColor: "#60A5FA", borderRadius: s * 0.035, borderWidth: 1, borderColor: "#2563EB" }} />
            ))}
          </>
        ),
      });
      if (lv >= 4) return storybook({
        s, H, lv, lit: isLit, LIT, seed: 4,
        wall: "#FED7AA", outline: "#9A3412", roof: "#9A3412",
        w: s * 0.94, bodyH: H * 0.56, upperWin: true, chimney,
        front: (
          <View style={{ position: "absolute", bottom: H * 0.3, left: s * 0.13, width: s * 0.74, alignItems: "center" }}>
            <View style={{ width: "100%", height: s * 0.045, backgroundColor: "#78350F", borderRadius: 2 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", width: "92%" }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={{ width: 2.5, height: s * 0.09, backgroundColor: "#78350F" }} />
              ))}
            </View>
          </View>
        ),
      });
      if (lv >= 3) return storybook({
        s, H, lv, lit: isLit, LIT, seed: 3,
        wall: "#FDE9C8", outline: "#991B1B", roof: "#991B1B",
        w: s * 0.9, bodyH: H * 0.56, upperWin: true, chimney,
      });
      if (lv >= 2) return storybook({
        s, H, lv, lit: isLit, LIT, seed: 2,
        wall: "#FDE9C8", outline: "#B45309", roof: "#B91C1C",
        w: s * 0.88, bodyH: H * 0.5, chimney,
      });
      return storybook({
        s, H, lv, lit: isLit, LIT, seed: 1,
        wall: "#FEF3C7", outline: "#B45309", roof: "#DC2626",
        w: s * 0.84, bodyH: H * 0.46, chimney,
      });
    }
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
      // The hero's own house — violet storybook cottage with a gold star
      // medallion and a hearth chimney (smoke emitter lives on this type).
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 6,
        wall: "#EDE9FE", outline: "#6D28D9", roof: "#7C3AED",
        bodyH: (artH ?? s) * 0.5, doorColor: "#4C1D95", chimney: "#A78BFA",
        sign: (
          <Svg width={s * 0.11} height={s * 0.11} viewBox="0 0 24 24">
            <Polygon points="12,2.5 15,9 22,9.3 16.6,13.6 18.4,21 12,16.9 5.6,21 7.4,13.6 2,9.3 9,9" fill="#FACC15" stroke="#92400E" strokeWidth={1.2} />
          </Svg>
        ),
      });
    case "farm": {
      // Storybook barn — red gable barn with white X-braced doors, a hay
      // window in the gable, crop rows out front, a silo from L2, and the
      // farmhouse chimney (the smoke emitter lives on this type).
      const H = artH ?? s;
      const w = s * 0.8;
      const bodyH = H * 0.52;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(s * 0.98)}
          {/* silo (L2+) */}
          {lv >= 2 && (
            <View style={{ position: "absolute", bottom: 0, right: s * 0.01, width: s * 0.16, height: H * 0.68, backgroundColor: "#D6D3D1", borderWidth: 2, borderColor: "#78716C", borderTopLeftRadius: s * 0.08, borderTopRightRadius: s * 0.08 }}>
              <View style={{ height: s * 0.05, backgroundColor: "#A8A29E", borderTopLeftRadius: s * 0.08, borderTopRightRadius: s * 0.08 }} />
              {[0.34, 0.6].map((f) => (
                <View key={f} style={{ position: "absolute", top: H * 0.68 * f, left: 0, right: 0, height: 2, backgroundColor: "#A8A29E" }} />
              ))}
            </View>
          )}
          {/* chimney */}
          <View style={{ position: "absolute", bottom: bodyH + w * 0.22 * 0.2, right: (s - w) / 2 + w * 0.08, width: s * 0.08, height: H * 0.18, backgroundColor: "#A8A29E", borderWidth: 1.5, borderColor: "#6E2718", borderRadius: 2, zIndex: 0 }}>
            <View style={{ position: "absolute", top: -3, left: -2, right: -2, height: 5, backgroundColor: "#A8A29E", borderWidth: 1.5, borderColor: "#6E2718", borderRadius: 2 }} />
          </View>
          {/* gabled roof */}
          <Svg width={w + 6} height={w * 0.22} viewBox="0 0 100 22" style={{ marginBottom: -2, zIndex: 1 }}>
            <Polygon points="3,22 50,3 97,22" fill="#78716C" stroke="#6E2718" strokeWidth={2.5} />
            {lv >= 3 && <Polygon points="25,22 50,10 75,22" fill="#C9963C" opacity={0.45} />}
          </Svg>
          {/* barn body */}
          <View style={{ width: w, height: bodyH, backgroundColor: "#A63D2F", borderWidth: 2, borderColor: "#6E2718", borderBottomLeftRadius: 5, borderBottomRightRadius: 5, zIndex: 1 }}>
            {sideShade(w, bodyH, 5)}
            {lv >= 3 && <View style={{ position: "absolute", top: 3, left: 5, right: 5, height: 3, backgroundColor: "#C9963C", borderRadius: 2, opacity: 0.85 }} />}
            {/* hay window in the gable */}
            <View style={{ position: "absolute", top: bodyH * 0.08, left: w / 2 - s * 0.07, width: s * 0.14, height: s * 0.12, backgroundColor: "#FDE68A", borderWidth: 1.6, borderColor: "#6E2718", borderRadius: 2, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: s * 0.09, height: 2, backgroundColor: "#B45309" }} />
              <View style={{ width: s * 0.05, height: 2, backgroundColor: "#B45309", marginTop: 2 }} />
            </View>
            {/* X-braced double doors */}
            <View style={{ position: "absolute", bottom: 0, left: w / 2 - s * 0.17, width: s * 0.34, height: bodyH * 0.52, flexDirection: "row", borderWidth: 2, borderColor: "#F5F0E6", borderBottomWidth: 0 }}>
              {[0, 1].map((i) => (
                <View key={i} style={{ flex: 1, backgroundColor: "#8C3226", overflow: "hidden", borderRightWidth: i === 0 ? 2 : 0, borderColor: "#F5F0E6" }}>
                  <View style={{ position: "absolute", top: "44%", left: -s * 0.055, width: s * 0.28, height: 3, backgroundColor: "#F5F0E6", transform: [{ rotate: "40deg" }] }} />
                  <View style={{ position: "absolute", top: "44%", left: -s * 0.055, width: s * 0.28, height: 3, backgroundColor: "#F5F0E6", transform: [{ rotate: "-40deg" }] }} />
                </View>
              ))}
            </View>
          </View>
          {/* crop rows out front */}
          <View style={{ position: "absolute", bottom: -2, left: s * 0.02, width: s * 0.62, height: s * 0.15, backgroundColor: "#4D7C0F", borderRadius: 5, borderWidth: 1.5, borderColor: "#365314", overflow: "hidden", zIndex: 2 }}>
            {[0, 1].map((r) => (
              <View key={r} style={{ flexDirection: "row", justifyContent: "space-around", marginTop: s * 0.022 }}>
                {[0, 1, 2, 3].map((c) => (
                  <View key={c} style={{ width: s * 0.045, height: s * 0.045, borderRadius: s * 0.023, backgroundColor: (r + c) % 2 ? "#65A30D" : "#84CC16" }} />
                ))}
              </View>
            ))}
          </View>
        </View>
      );
    }
    case "shop":
      // The general store — cream storybook storefront, red gable roof,
      // striped awning, coin medallion, goods in the display window.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 7,
        wall: "#FEF3C7", outline: "#92400E", roof: "#B91C1C",
        awning: ["#DC2626", "#FFFFFF"],
        sign: (
          <Svg width={s * 0.11} height={s * 0.11} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={8.5} fill="#FBBF24" stroke="#92400E" strokeWidth={1.8} />
            <Circle cx={12} cy={12} r={4.5} fill="none" stroke="#92400E" strokeWidth={1.6} />
          </Svg>
        ),
        display: (
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            {["#DC2626", "#F59E0B", "#16A34A"].map((c, i) => (
              <View key={i} style={{ width: s * 0.09, height: s * (0.07 + i * 0.02), backgroundColor: c, borderRadius: 2, marginHorizontal: 2, borderWidth: 1, borderColor: "rgba(0,0,0,0.2)" }} />
            ))}
          </View>
        ),
      });
    case "bakery":
      // The bakery — warm storybook storefront, brown gable roof, hearth
      // chimney (smoke emitter lives on this type), loaf medallion, and
      // fresh loaves glowing in the display window.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 8,
        wall: "#FDEBD0", outline: "#92400E", roof: "#92400E",
        chimney: "#A8A29E",
        awning: ["#D97706", "#FFF7ED"],
        sign: (
          <Svg width={s * 0.12} height={s * 0.12} viewBox="0 0 24 24">
            <Ellipse cx={12} cy={14} rx={8.5} ry={6} fill="#E8A84C" stroke="#92400E" strokeWidth={1.6} />
            <Line x1={8} y1={10.5} x2={10.5} y2={13.5} stroke="#92400E" strokeWidth={1.6} strokeLinecap="round" />
            <Line x1={12} y1={9.8} x2={14.5} y2={12.8} stroke="#92400E" strokeWidth={1.6} strokeLinecap="round" />
            <Line x1={16} y1={10.5} x2={18} y2={12.8} stroke="#92400E" strokeWidth={1.6} strokeLinecap="round" />
          </Svg>
        ),
        display: (
          <View style={{ alignItems: "center" }}>
            <View style={{ flexDirection: "row" }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ width: s * 0.11, height: s * 0.07, borderRadius: s * 0.035, backgroundColor: "#F3C96B", marginHorizontal: 2, borderWidth: 1, borderColor: "#B45309" }} />
              ))}
            </View>
            <View style={{ width: s * 0.42, height: 2.5, backgroundColor: "#92400E", borderRadius: 1, marginTop: 3 }} />
          </View>
        ),
      });
    case "market":
      // The market hall — wide storybook hall under a teal gable roof, an
      // open stall front full of produce, crates out front from L2.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 9,
        wall: "#E0F2FE", outline: "#0369A1", roof: "#0369A1",
        w: s * 0.96, bodyH: (artH ?? s) * 0.52,
        sign: (
          <Svg width={s * 0.11} height={s * 0.11} viewBox="0 0 24 24">
            <Circle cx={12} cy={13.5} r={7.5} fill="#DC2626" stroke="#7F1D1D" strokeWidth={1.6} />
            <Path d="M12 6 C12 4, 13.5 2.5, 16 2.5 C16 5, 14.5 6.5, 12 6 Z" fill="#16A34A" stroke="#14532D" strokeWidth={1.2} />
          </Svg>
        ),
        display: (
          <View style={{ alignItems: "center" }}>
            {[0, 1].map((r) => (
              <View key={r} style={{ flexDirection: "row", marginVertical: 1.5 }}>
                {["#DC2626", "#F59E0B", "#65A30D", "#F97316"].map((c, i) => (
                  <View key={i} style={{ width: s * 0.055, height: s * 0.055, borderRadius: s * 0.028, backgroundColor: (r + i) % 2 ? c : "#FACC15", marginHorizontal: 2 }} />
                ))}
              </View>
            ))}
            <View style={{ width: s * 0.44, height: 2.5, backgroundColor: "#0369A1", borderRadius: 1, marginTop: 2 }} />
          </View>
        ),
        front: lv >= 2 ? (
          <>
            {[0, 1].map((i) => (
              <View key={i} style={{ position: "absolute", bottom: 0, left: i ? undefined : s * 0.03, right: i ? s * 0.03 : undefined, width: s * 0.13, height: s * 0.09, backgroundColor: "#C69A63", borderRadius: 2, borderWidth: 1.5, borderColor: "#8A5A2B" }}>
                <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 1.5 }}>
                  {[0, 1, 2].map((j) => (
                    <View key={j} style={{ width: s * 0.032, height: s * 0.032, borderRadius: s * 0.016, backgroundColor: i ? "#F59E0B" : "#DC2626", marginHorizontal: 1 }} />
                  ))}
                </View>
              </View>
            ))}
          </>
        ) : undefined,
      });
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
      // The barbershop — white storybook storefront, slate roof, scissors
      // medallion, and the striped pole standing by the door.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 10,
        wall: "#F8FAFC", outline: "#64748B", roof: "#475569",
        awning: ["#3B82F6", "#FFFFFF"],
        sign: (
          <Svg width={s * 0.11} height={s * 0.11} viewBox="0 0 24 24">
            <Circle cx={7} cy={7} r={2.8} fill="none" stroke="#475569" strokeWidth={2} />
            <Circle cx={7} cy={17} r={2.8} fill="none" stroke="#475569" strokeWidth={2} />
            <Line x1={9.2} y1={8.6} x2={20} y2={17.5} stroke="#475569" strokeWidth={2.2} strokeLinecap="round" />
            <Line x1={9.2} y1={15.4} x2={20} y2={6.5} stroke="#475569" strokeWidth={2.2} strokeLinecap="round" />
          </Svg>
        ),
        display: (
          <View style={{ flexDirection: "row" }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ width: s * 0.12, height: s * 0.13, backgroundColor: "#334155", borderTopLeftRadius: s * 0.05, borderTopRightRadius: s * 0.05, marginHorizontal: 3 }}>
                <View style={{ width: s * 0.08, height: s * 0.05, backgroundColor: "#FCA5A5", borderRadius: 2, alignSelf: "center", marginTop: 2 }} />
              </View>
            ))}
          </View>
        ),
        front: (
          <View style={{ position: "absolute", bottom: s * 0.04, right: s * 0.005, width: s * 0.11, height: s * 0.4, backgroundColor: "#FFFFFF", borderRadius: s * 0.055, borderWidth: 1.5, borderColor: "#64748B", overflow: "hidden" }}>
            <View style={{ position: "absolute", top: -s * 0.03, width: "220%", height: "38%", backgroundColor: "#EF4444", transform: [{ rotate: "-24deg" }], marginLeft: "-60%" }} />
            <View style={{ position: "absolute", bottom: -s * 0.03, width: "220%", height: "38%", backgroundColor: "#3B82F6", transform: [{ rotate: "-24deg" }], marginLeft: "-60%" }} />
            <View style={{ position: "absolute", top: -s * 0.05, alignSelf: "center", width: s * 0.07, height: s * 0.05, backgroundColor: "#94A3B8", borderRadius: 2 }} />
          </View>
        ),
      });
    case "clothes-shop":
      // The clothes shop — butter-yellow storybook storefront with a shirt
      // medallion and a shirt on display in the window.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 11,
        wall: "#FEF3C7", outline: "#B45309", roof: "#D97706",
        awning: ["#F59E0B", "#FFFBEB"],
        sign: (
          <Svg width={s * 0.12} height={s * 0.12} viewBox="0 0 24 24">
            <Path d="M9 4 L4 7 L6.5 11 L9 10 L9 20 L15 20 L15 10 L17.5 11 L20 7 L15 4 C15 6, 9 6, 9 4 Z" fill="#3B82F6" stroke="#1E40AF" strokeWidth={1.4} />
          </Svg>
        ),
        display: (
          <Svg width={s * 0.3} height={s * 0.24} viewBox="0 0 24 24">
            <Path d="M9 4 L4 7 L6.5 11 L9 10 L9 20 L15 20 L15 10 L17.5 11 L20 7 L15 4 C15 6, 9 6, 9 4 Z" fill="#3B82F6" stroke="#1E40AF" strokeWidth={1.2} />
            <Line x1={12} y1={2} x2={12} y2={4.5} stroke="#92400E" strokeWidth={1.6} />
          </Svg>
        ),
      });
    case "armory":
      // The armory — a stone storybook stronghouse: grey walls, dark slate
      // parapet, a shield medallion over the door.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 12,
        wall: "#E5E7EB", outline: "#4B5563", roof: "#374151",
        roofStyle: "flat", doorColor: "#374151",
        sign: (
          <Svg width={s * 0.11} height={s * 0.12} viewBox="0 0 24 26">
            <Path d="M12 2 L20 5 V12 C20 18, 16.5 22, 12 24 C7.5 22, 4 18, 4 12 V5 Z" fill="#9CA3AF" stroke="#4B5563" strokeWidth={1.6} />
            <Circle cx={12} cy={12} r={3.4} fill="#6B7280" stroke="#374151" strokeWidth={1.2} />
          </Svg>
        ),
        banner: "#374151",
      });
    case "weaponsmith":
      // The weaponsmith — a warm forge house in the storybook style: pale
      // rose walls, deep red gable roof, crossed swords on the medallion,
      // an anvil in the display window from L2.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 13,
        wall: "#FDE8E8", outline: "#991B1B", roof: "#7F1D1D",
        doorColor: "#450A0A",
        sign: (
          <Svg width={s * 0.12} height={s * 0.12} viewBox="0 0 24 24">
            <Line x1={6} y1={4} x2={17} y2={17} stroke="#6B7280" strokeWidth={2.6} strokeLinecap="round" />
            <Line x1={18} y1={4} x2={7} y2={17} stroke="#6B7280" strokeWidth={2.6} strokeLinecap="round" />
            <Line x1={4} y1={15} x2={9} y2={20} stroke="#78350F" strokeWidth={2.4} strokeLinecap="round" />
            <Line x1={20} y1={15} x2={15} y2={20} stroke="#78350F" strokeWidth={2.4} strokeLinecap="round" />
          </Svg>
        ),
        display: lv >= 2 ? (
          <Svg width={s * 0.3} height={s * 0.2} viewBox="0 0 30 20">
            <Path d="M4 6 H17 C22 6, 26 4, 28 2 L28 8 C24 10, 20 10, 17 10 L16 14 H9 L8 10 H4 Z" fill="#374151" stroke="#111827" strokeWidth={1.2} />
            <Rect x={8} y={14} width={10} height={3.4} fill="#111827" />
          </Svg>
        ) : undefined,
      });
    case "toolshop":
      // The toolshop — a honey-toned storybook workshop with a hammer
      // medallion and tools hanging in the window.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 14,
        wall: "#FEF3C7", outline: "#92400E", roof: "#B45309",
        sign: (
          <Svg width={s * 0.12} height={s * 0.12} viewBox="0 0 24 24">
            <Rect x={4} y={4} width={13} height={6} rx={2} fill="#6B7280" stroke="#374151" strokeWidth={1.4} />
            <Line x1={13} y1={8} x2={18} y2={20} stroke="#92400E" strokeWidth={3} strokeLinecap="round" />
          </Svg>
        ),
        display: (
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ alignItems: "center", marginHorizontal: 3 }}>
                <View style={{ width: s * 0.07, height: s * 0.05, backgroundColor: "#6B7280", borderRadius: 2 }} />
                <View style={{ width: s * 0.028, height: s * 0.11, backgroundColor: "#92400E", borderRadius: 1.5 }} />
              </View>
            ))}
          </View>
        ),
      });
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
            <View style={{ position: "absolute", top: 0, left: -2, width: w + 4, height: Math.max(5, H * 0.04), backgroundColor: "#713F12", borderRadius: 3, borderWidth: 1.5, borderColor: "#451A03", zIndex: 2 }} />
            <View style={{ flex: 1, flexDirection: "row", paddingTop: Math.max(5, H * 0.04) + 2 }}>
              <View style={{ flex: 1, backgroundColor: front, borderBottomLeftRadius: 4, borderWidth: 1.5, borderColor: "#451A03", borderTopWidth: 0, borderRightWidth: 0, overflow: "hidden", alignItems: "center", paddingTop: H * 0.03 }}>
                {[0, 1, 2].map(r => (
                  <View key={r} style={{ flexDirection: "row", marginVertical: s * 0.018 }}>
                    {[0, 1].map(j => <View key={j} style={{ width: s * 0.1, height: s * 0.08, backgroundColor: isLit(r + seed, j) ? LIT : "#713F12", marginHorizontal: 2, borderRadius: 1, opacity: isLit(r + seed, j) ? 1 : 0.6 }} />)}
                  </View>
                ))}
                {bh > H * 0.8 && <View style={{ width: s * 0.11, height: s * 0.15, backgroundColor: "#451A03", borderTopLeftRadius: 3, borderTopRightRadius: 3, marginTop: s * 0.015, borderWidth: 1, borderColor: "#713F12" }} />}
              </View>
              <View style={{ width: sideW, backgroundColor: side, borderBottomRightRadius: 4, borderWidth: 1.5, borderColor: "#451A03", borderTopWidth: 0, borderLeftWidth: 0 }} />
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
            {[0, 1, 2, 3, 4].map(i => <View key={i} style={{ width: s * 0.18, height: s * 0.09, backgroundColor: i % 2 ? "#FFFFFF" : "#16A34A", borderWidth: 1, borderColor: "#0E6B32" }} />)}
          </View>
          <View style={{ width: w, height: bodyH, flexDirection: "row" }}>
            <View style={{ flex: 1, backgroundColor: "#15803D", borderBottomLeftRadius: 5, borderWidth: 1.5, borderColor: "#14532D", borderTopWidth: 0, borderRightWidth: 0, alignItems: "center", justifyContent: "center" }}>
              <View style={{ flexDirection: "row" }}>
                {[0, 1, 2].map(i => <View key={i} style={{ width: s * 0.2, height: s * 0.18, backgroundColor: isLit(0, i) ? LIT : "#14532D", marginHorizontal: 4, borderRadius: 2, opacity: isLit(0, i) ? 1 : 0.7 }} />)}
              </View>
              <View style={{ width: s * 0.18, height: s * 0.22, backgroundColor: "#052E16", borderTopLeftRadius: 4, borderTopRightRadius: 4, marginTop: s * 0.04, borderWidth: 1, borderColor: "#14532D" }} />
            </View>
            <View style={{ width: sideW, backgroundColor: "#0E6B32", borderBottomRightRadius: 5, borderWidth: 1.5, borderColor: "#14532D", borderTopWidth: 0, borderLeftWidth: 0 }} />
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
            <View style={{ flex: 1, backgroundColor: "#7C2D12", borderBottomLeftRadius: 5, borderWidth: 1.5, borderColor: "#451A03", borderTopWidth: 0, borderRightWidth: 0, alignItems: "center", justifyContent: "flex-end", paddingBottom: s * 0.05 }}>
              <View style={{ flexDirection: "row" }}>
                <View style={{ width: s * 0.28, height: bodyH * 0.55, backgroundColor: "#991B1B", borderTopLeftRadius: 4, borderTopRightRadius: 4, borderWidth: 1, borderColor: "#451A03", borderBottomWidth: 0 }} />
                <View style={{ width: s * 0.28, height: bodyH * 0.55, backgroundColor: "#991B1B", borderTopLeftRadius: 4, borderTopRightRadius: 4, marginLeft: 3, borderWidth: 1, borderColor: "#451A03", borderBottomWidth: 0 }} />
              </View>
            </View>
            <View style={{ width: sideW, backgroundColor: "#5F220D", borderBottomRightRadius: 5, borderWidth: 1.5, borderColor: "#451A03", borderTopWidth: 0, borderLeftWidth: 0 }} />
          </View>
        </View>
      );
    }
    case "food-court":
      // The food court — a wide, bright storybook hall: cream walls, orange
      // gable roof, cloche medallion, and three little stalls in the glass.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 15,
        wall: "#FFF7ED", outline: "#C2410C", roof: "#EA580C",
        w: s * 0.95, awning: ["#F97316", "#FFFFFF"],
        sign: (
          <Svg width={s * 0.12} height={s * 0.12} viewBox="0 0 24 24">
            <Path d="M4 16 A8 8 0 0 1 20 16 Z" fill="#D6D3D1" stroke="#78716C" strokeWidth={1.6} />
            <Line x1={2.5} y1={19.5} x2={21.5} y2={19.5} stroke="#78716C" strokeWidth={1.8} strokeLinecap="round" />
            <Circle cx={12} cy={6.5} r={1.8} fill="#78716C" />
          </Svg>
        ),
        display: (
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            {["#DC2626", "#16A34A", "#2563EB"].map((c, i) => (
              <View key={i} style={{ alignItems: "center", marginHorizontal: 3 }}>
                <View style={{ width: s * 0.11, height: s * 0.05, backgroundColor: c, borderTopLeftRadius: s * 0.03, borderTopRightRadius: s * 0.03 }} />
                <View style={{ width: s * 0.13, height: s * 0.07, backgroundColor: "#D6D3D1", borderRadius: 2, marginTop: 1.5 }} />
              </View>
            ))}
          </View>
        ),
      });
    case "bookstore":
      // The bookstore — a snug storybook shop: parchment walls, brown
      // gable roof, open-book medallion, book spines in the window.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 16,
        wall: "#F5E6D3", outline: "#78350F", roof: "#92400E",
        awning: ["#B45309", "#FEF3C7"],
        sign: (
          <Svg width={s * 0.12} height={s * 0.11} viewBox="0 0 30 20">
            <Path d="M15 4 C11.5 1.8, 6 1.8, 3 3.4 L3 17 C6 15.4, 11.5 15.4, 15 17.6 C18.5 15.4, 24 15.4, 27 17 L27 3.4 C24 1.8, 18.5 1.8, 15 4 Z" fill="#FFFBEB" stroke="#78350F" strokeWidth={1.8} />
            <Line x1={15} y1={4} x2={15} y2={17.6} stroke="#78350F" strokeWidth={1.4} />
          </Svg>
        ),
        display: (
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            {["#B91C1C", "#1D4ED8", "#166534", "#C9963C", "#7C2D3E"].map((c, i) => (
              <View key={i} style={{ width: s * 0.05, height: s * (0.1 + (i % 3) * 0.025), backgroundColor: c, marginHorizontal: 1.2, borderRadius: 1.5 }} />
            ))}
          </View>
        ),
      });
    case "arcade":
      // The arcade — a deep-purple storybook funhouse: flat neon-banded
      // roof, joystick medallion, and glowing cabinet screens in the glass.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 17,
        wall: "#5B21B6", outline: "#2E1065", roof: "#4C1D95",
        roofStyle: "flat", doorColor: "#1E1B4B", trim: "#F0ABFC",
        glass: "#F0ABFC",
        sign: (
          <Svg width={s * 0.11} height={s * 0.12} viewBox="0 0 24 26">
            <Line x1={12} y1={11} x2={12} y2={19} stroke="#374151" strokeWidth={2.6} strokeLinecap="round" />
            <Circle cx={12} cy={7} r={4} fill="#EF4444" stroke="#7F1D1D" strokeWidth={1.4} />
            <Path d="M5 23 L8 19 H16 L19 23 Z" fill="#374151" stroke="#111827" strokeWidth={1.2} />
          </Svg>
        ),
        signBg: "#EDE9FE",
        display: (
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            {["#F0ABFC", "#67E8F9", "#FDE68A"].map((c, i) => (
              <View key={i} style={{ width: s * 0.1, height: s * 0.14, backgroundColor: "#1E1B4B", borderRadius: 2, marginHorizontal: 2.5, alignItems: "center", paddingTop: 2.5 }}>
                <View style={{ width: s * 0.07, height: s * 0.07, backgroundColor: c, borderRadius: 1.5 }} />
                <View style={{ width: s * 0.05, height: s * 0.025, backgroundColor: c, borderRadius: 1, marginTop: 2.5, opacity: 0.8 }} />
              </View>
            ))}
          </View>
        ),
        displayGlass: "#2E1065",
      });
    case "cinema": {
      // The cinema — a storybook picture palace: dark facade with a gentle
      // outline, a bulb-lit marquee (no words needed), poster cases from
      // L2, double doors, and a red carpet at L3.
      const H = artH ?? s;
      const w = s * 0.9;
      const bodyH = H * 0.52;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.1)}
          {/* marquee */}
          <View style={{ width: w * 1.04, height: Math.max(12, H * 0.13), backgroundColor: "#FEF3C7", borderWidth: 2, borderColor: "#B45309", borderRadius: 5, alignItems: "center", justifyContent: "center", marginBottom: -3, zIndex: 2 }}>
            <View style={{ flexDirection: "row" }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={{ width: 5.5, height: 5.5, borderRadius: 3, backgroundColor: isLit(0, i) ? LIT : "#D97706", marginHorizontal: 2.5, borderWidth: 0.8, borderColor: "#92400E" }} />
              ))}
            </View>
            <View style={{ width: w * 0.5, height: 3, backgroundColor: "#DC2626", borderRadius: 2, marginTop: 3 }} />
          </View>
          {/* facade */}
          <View style={{ width: w, height: bodyH, backgroundColor: "#273244", borderWidth: 2, borderColor: "#111827", borderBottomLeftRadius: 5, borderBottomRightRadius: 5, zIndex: 1 }}>
            {sideShade(w, bodyH, 5)}
            {lv >= 3 && <View style={{ position: "absolute", top: 3, left: 5, right: 5, height: 3, backgroundColor: "#C9963C", borderRadius: 2, opacity: 0.85 }} />}
            {/* poster cases (L2+) */}
            {lv >= 2 && [0, 1].map((i) => (
              <View key={i} style={{ position: "absolute", top: bodyH * 0.16, left: i ? undefined : s * 0.06, right: i ? s * 0.06 : undefined, width: s * 0.17, height: bodyH * 0.42, backgroundColor: "#F8FAFC", borderWidth: 1.6, borderColor: "#B45309", borderRadius: 3, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: s * 0.11, height: bodyH * 0.2, backgroundColor: i ? "#7C3AED" : "#0EA5E9", borderRadius: 2 }} />
                <View style={{ width: s * 0.08, height: 2.4, backgroundColor: "#94A3B8", borderRadius: 1, marginTop: 3 }} />
              </View>
            ))}
            {/* glowing screen window (L1 focal point) */}
            {lv < 2 && (
              <View style={{ position: "absolute", top: bodyH * 0.14, left: w / 2 - s * 0.16, width: s * 0.32, height: bodyH * 0.34, backgroundColor: "#E5E7EB", borderWidth: 1.6, borderColor: "#B45309", borderRadius: 3 }} />
            )}
            {/* double doors */}
            <View style={{ position: "absolute", bottom: 0, left: w / 2 - s * 0.13, width: s * 0.26, height: bodyH * 0.44, flexDirection: "row", borderWidth: 1.6, borderColor: lv >= 3 ? "#C9963C" : "#111827", borderBottomWidth: 0, borderTopLeftRadius: s * 0.05, borderTopRightRadius: s * 0.05, overflow: "hidden" }}>
              <View style={{ flex: 1, backgroundColor: "#7F1D1D" }} />
              <View style={{ width: 2, backgroundColor: "#111827" }} />
              <View style={{ flex: 1, backgroundColor: "#991B1B" }} />
            </View>
          </View>
          {/* red carpet (L3) */}
          {lv >= 3 && (
            <View style={{ position: "absolute", bottom: -1, left: s / 2 - s * 0.11, width: s * 0.22, height: 4.5, backgroundColor: "#B91C1C", borderRadius: 2, borderWidth: 0.8, borderColor: "#7F1D1D" }} />
          )}
        </View>
      );
    }
    case "library":
      // The school library — a tall teal storybook hall: book medallion,
      // spines in the window, a quiet reading-room calm.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 18,
        wall: "#D7F0EC", outline: "#0F766E", roof: "#0F766E",
        bodyH: (artH ?? s) * 0.56, doorColor: "#134E4A",
        sign: (
          <Svg width={s * 0.12} height={s * 0.11} viewBox="0 0 30 20">
            <Path d="M15 4 C11.5 1.8, 6 1.8, 3 3.4 L3 17 C6 15.4, 11.5 15.4, 15 17.6 C18.5 15.4, 24 15.4, 27 17 L27 3.4 C24 1.8, 18.5 1.8, 15 4 Z" fill="#FFFBEB" stroke="#0F766E" strokeWidth={1.8} />
            <Line x1={15} y1={4} x2={15} y2={17.6} stroke="#0F766E" strokeWidth={1.4} />
          </Svg>
        ),
        display: (
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            {["#0F766E", "#B91C1C", "#1D4ED8", "#C9963C", "#166534", "#7C2D3E"].map((c, i) => (
              <View key={i} style={{ width: s * 0.048, height: s * (0.11 + (i % 3) * 0.02), backgroundColor: c, marginHorizontal: 1.2, borderRadius: 1.5 }} />
            ))}
          </View>
        ),
      });
    case "classroom":
      // The classroom — a green storybook schoolhouse: chalkboard
      // medallion, desks in the window, and a little flag at L3.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 19,
        wall: "#E9F7E4", outline: "#15803D", roof: "#16A34A",
        doorColor: "#14532D",
        sign: (
          <Svg width={s * 0.12} height={s * 0.11} viewBox="0 0 26 20">
            <Rect x={2} y={2} width={22} height={16} rx={2} fill="#166534" stroke="#14532D" strokeWidth={1.6} />
            <Line x1={6} y1={8} x2={13} y2={8} stroke="#F8FAFC" strokeWidth={1.8} strokeLinecap="round" />
            <Line x1={6} y1={12.5} x2={17} y2={12.5} stroke="#F8FAFC" strokeWidth={1.8} strokeLinecap="round" opacity={0.75} />
            <Polygon points="19.5,5.5 20.4,7.8 22.8,7.9 20.9,9.3 21.6,11.6 19.5,10.3 17.4,11.6 18.1,9.3 16.2,7.9 18.6,7.8" fill="#FACC15" />
          </Svg>
        ),
        display: (
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ width: s * 0.13, height: s * 0.055, backgroundColor: "#B45309", borderRadius: 2, marginHorizontal: 2.5, borderWidth: 1, borderColor: "#78350F" }}>
                <View style={{ width: s * 0.07, height: s * 0.045, backgroundColor: "#F8FAFC", borderRadius: 1, alignSelf: "center", marginTop: -s * 0.035 }} />
              </View>
            ))}
          </View>
        ),
        front: lv >= 3 ? (
          <View style={{ position: "absolute", top: s * 0.01, right: s * 0.14, alignItems: "center" }}>
            <View style={{ width: s * 0.028, height: s * 0.15, backgroundColor: "#78716C" }} />
            <View style={{ position: "absolute", top: 0, left: s * 0.028, width: s * 0.12, height: s * 0.075, backgroundColor: "#16A34A", borderTopRightRadius: 2, borderBottomRightRadius: 2 }} />
          </View>
        ) : undefined,
      });
    case "pizza-place":
      // The pizza place — a storybook party theater (matching its purple
      // animatronic interior): lavender walls, purple flat roof with a
      // red-and-white awning, pizza medallion, brick-oven chimney, and red
      // stage curtains in the window at L3.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 20,
        wall: "#EDE9FE", outline: "#6D28D9", roof: "#6D28D9",
        roofStyle: "flat", doorColor: "#4C1D95", chimney: "#B45309",
        awning: ["#DC2626", "#FFFFFF"],
        sign: (
          <Svg width={s * 0.12} height={s * 0.12} viewBox="0 0 24 24">
            <Polygon points="12,21 4,5.5 20,5.5" fill="#FDE68A" stroke="#D97706" strokeWidth={1.6} strokeLinejoin="round" />
            <Circle cx={10} cy={9.5} r={1.9} fill="#DC2626" />
            <Circle cx={14.5} cy={12.5} r={1.9} fill="#DC2626" />
            <Circle cx={9.5} cy={14.5} r={1.6} fill="#16A34A" />
          </Svg>
        ),
        display: (
          <View style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
            {lv >= 3 && (
              <>
                <View style={{ position: "absolute", top: 0, left: 0, width: s * 0.09, height: s * 0.1, backgroundColor: "#B91C1C", borderBottomRightRadius: s * 0.07 }} />
                <View style={{ position: "absolute", top: 0, right: 0, width: s * 0.09, height: s * 0.1, backgroundColor: "#B91C1C", borderBottomLeftRadius: s * 0.07 }} />
              </>
            )}
            <Svg width={s * 0.2} height={s * 0.2} viewBox="0 0 24 24">
              <Circle cx={12} cy={12} r={9} fill="#FBBF24" stroke="#D97706" strokeWidth={1.6} />
              <Circle cx={9} cy={9} r={1.8} fill="#DC2626" />
              <Circle cx={15} cy={10.5} r={1.8} fill="#DC2626" />
              <Circle cx={11} cy={15} r={1.8} fill="#DC2626" />
            </Svg>
          </View>
        ),
        displayGlass: "#F5F0FF",
      });
    case "burger-joint":
      // The burger joint — cold, clean red-and-white (matching its
      // interior): bright white walls, red trim and flat roof, red-and-
      // white awning, crossed-palms medallion, and a brick chimney out
      // back (the smoke emitter lives on this type).
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 21,
        wall: "#FFFFFF", outline: "#D22630", roof: "#D22630",
        roofStyle: "flat", doorColor: "#991B1B", chimney: "#B91C1C", trim: "#D22630",
        awning: ["#D22630", "#FFFFFF"],
        sign: (
          <Svg width={s * 0.13} height={s * 0.12} viewBox="0 0 26 24">
            <Line x1={9} y1={22} x2={11} y2={9} stroke="#92400E" strokeWidth={2} strokeLinecap="round" />
            <Line x1={17} y1={22} x2={15} y2={9} stroke="#92400E" strokeWidth={2} strokeLinecap="round" />
            <Path d="M11 9 C8 5, 4.5 4.5, 2 6 C4.5 7.5, 8 8.5, 11 9 M11 9 C10 4.5, 7 2.5, 4 2.5 C5.5 5.5, 8 8, 11 9 M11 9 C13 4, 16 2.5, 19 3.5 C17 6.5, 14 8.5, 11 9" fill="none" stroke="#16A34A" strokeWidth={1.7} strokeLinecap="round" />
            <Path d="M15 9 C15.5 4.5, 18 2, 21 1.5 C20 5, 18 8, 15 9 M15 9 C18 5.5, 21.5 5, 24 6.5 C21.5 8.5, 18 9.5, 15 9" fill="none" stroke="#16A34A" strokeWidth={1.7} strokeLinecap="round" />
          </Svg>
        ),
        signBg: "#FFFFFF",
        display: (
          <Svg width={s * 0.26} height={s * 0.2} viewBox="0 0 26 20">
            <Path d="M4 8 A9 6.5 0 0 1 22 8 Z" fill="#FBBF24" stroke="#D97706" strokeWidth={1.2} />
            <Rect x={3.5} y={9} width={19} height={2.6} rx={1.3} fill="#65A30D" />
            <Rect x={4} y={12.2} width={18} height={3} rx={1.5} fill="#78350F" />
            <Path d="M4.5 15.8 H21.5 L20 18.5 H6 Z" fill="#FBBF24" stroke="#D97706" strokeWidth={1.2} />
          </Svg>
        ),
      });
    case "taco-stand":
      // The taco stand — a retro cantina in the storybook style (matching
      // its purple/teal/pink interior): cream walls, teal gable roof with
      // a sunset-stripe band, smiling-sun medallion, taco in the window.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 22,
        wall: "#FEF3C7", outline: "#7C3AED", roof: "#14B8A6",
        doorColor: "#5B21B6", trim: "#F472B6",
        sign: (
          <Svg width={s * 0.12} height={s * 0.12} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={5.2} fill="#FBBF24" stroke="#D97706" strokeWidth={1.5} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <Line key={a} x1={12 + 7 * Math.cos((a * Math.PI) / 180)} y1={12 + 7 * Math.sin((a * Math.PI) / 180)} x2={12 + 9.4 * Math.cos((a * Math.PI) / 180)} y2={12 + 9.4 * Math.sin((a * Math.PI) / 180)} stroke="#F472B6" strokeWidth={1.8} strokeLinecap="round" />
            ))}
            <Circle cx={10.2} cy={11.2} r={0.9} fill="#92400E" />
            <Circle cx={13.8} cy={11.2} r={0.9} fill="#92400E" />
            <Path d="M9.8 14.2 A2.8 2.8 0 0 0 14.2 14.2" fill="none" stroke="#92400E" strokeWidth={1.1} strokeLinecap="round" />
          </Svg>
        ),
        display: (
          <View style={{ alignItems: "center" }}>
            <Svg width={s * 0.24} height={s * 0.16} viewBox="0 0 26 18">
              <Path d="M3 15 A10 10 0 0 1 23 15 Z" fill="#FACC15" stroke="#D97706" strokeWidth={1.4} />
              <Circle cx={8} cy={7.5} r={2} fill="#65A30D" />
              <Circle cx={13} cy={5.5} r={2} fill="#DC2626" />
              <Circle cx={18} cy={7.5} r={2} fill="#65A30D" />
            </Svg>
            <View style={{ flexDirection: "row", marginTop: 2.5 }}>
              {["#F472B6", "#FB923C", "#7C3AED"].map((c, i) => (
                <View key={i} style={{ width: s * 0.09, height: 2.6, backgroundColor: c, borderRadius: 1.3, marginHorizontal: 1.5 }} />
              ))}
            </View>
          </View>
        ),
      });
    case "sushi-bar":
      // The sushi bar — a calm storybook storefront: white walls, dark
      // slate roof, sushi medallion, pieces in the window, a navy noren
      // curtain over the door and paper lanterns at L3.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 23,
        wall: "#F8FAFC", outline: "#1F2937", roof: "#334155",
        doorColor: "#111827",
        sign: (
          <Svg width={s * 0.12} height={s * 0.12} viewBox="0 0 24 24">
            <Rect x={4} y={9} width={16} height={9} rx={3} fill="#FFFFFF" stroke="#1F2937" strokeWidth={1.6} />
            <Rect x={6.5} y={6} width={11} height={5} rx={2.4} fill="#FB7185" stroke="#9F1239" strokeWidth={1.2} />
          </Svg>
        ),
        display: (
          <View style={{ flexDirection: "row" }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ width: s * 0.15, height: s * 0.11, backgroundColor: "#FFFFFF", borderRadius: 3, marginHorizontal: 3, borderWidth: 1.2, borderColor: "#94A3B8", alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: s * 0.1, height: s * 0.045, backgroundColor: i ? "#F59E0B" : "#FB7185", borderRadius: 2 }} />
              </View>
            ))}
          </View>
        ),
        front: (
          <>
            {/* noren curtain over the door (L2+) */}
            {lv >= 2 && (
              <View style={{ position: "absolute", bottom: (artH ?? s) * 0.17, left: s / 2 - s * 0.125, flexDirection: "row", zIndex: 3 }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ width: s * 0.082, height: s * 0.09, backgroundColor: "#1E3A5F", marginHorizontal: 0.8, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ width: s * 0.035, height: s * 0.035, borderRadius: s * 0.018, backgroundColor: "#F8FAFC" }} />
                  </View>
                ))}
              </View>
            )}
            {/* paper lanterns (L3) */}
            {lv >= 3 && [0, 1].map((i) => (
              <View key={`l${i}`} style={{ position: "absolute", bottom: (artH ?? s) * 0.42, left: i ? undefined : s * 0.07, right: i ? s * 0.07 : undefined, alignItems: "center", zIndex: 3 }}>
                <View style={{ width: 2, height: s * 0.05, backgroundColor: "#1F2937" }} />
                <View style={{ width: s * 0.075, height: s * 0.09, backgroundColor: "#F87171", borderRadius: s * 0.04, borderWidth: 1.2, borderColor: "#991B1B" }} />
              </View>
            ))}
          </>
        ),
      });
    case "diner":
      // The diner — a long, low storybook diner in warm cream and orange
      // (matching its classic interior): flat banded roof, coffee-cup
      // medallion, and a long window band with counter stools inside.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 24,
        wall: "#FFF7ED", outline: "#9A3412", roof: "#F39C2C",
        roofStyle: "flat", doorColor: "#7C2D12", doorAt: "right",
        w: s * 0.96, bodyH: (artH ?? s) * 0.44, trim: "#DC2626",
        sign: (
          <Svg width={s * 0.12} height={s * 0.12} viewBox="0 0 24 24">
            <Path d="M5 10 H17 V15 A5 5 0 0 1 12 20 H10 A5 5 0 0 1 5 15 Z" fill="#FFFFFF" stroke="#9A3412" strokeWidth={1.6} />
            <Path d="M17 11.5 C19.5 11.5, 19.5 15, 16.8 15" fill="none" stroke="#9A3412" strokeWidth={1.6} />
            <Path d="M8.5 3.5 C7.5 5, 9.5 6, 8.5 7.5 M12.5 3.5 C11.5 5, 13.5 6, 12.5 7.5" fill="none" stroke="#F39C2C" strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
        ),
        display: (
          <View style={{ alignItems: "center" }}>
            <View style={{ flexDirection: "row" }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={{ alignItems: "center", marginHorizontal: 2.5 }}>
                  <View style={{ width: s * 0.075, height: s * 0.075, borderRadius: s * 0.038, backgroundColor: "#DC2626", borderWidth: 1, borderColor: "#7F1D1D" }} />
                  <View style={{ width: 2.4, height: s * 0.05, backgroundColor: "#78716C" }} />
                </View>
              ))}
            </View>
            <View style={{ width: s * 0.42, height: 2.6, backgroundColor: "#9A3412", borderRadius: 1.3, marginTop: 1 }} />
          </View>
        ),
      });
    case "upper-room":
      // The Upper Room — a warm storybook dining hall: cream walls, amber
      // windows that always glow, a candle medallion, and string lights
      // over the door at L3.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 25,
        wall: "#FDE9C8", outline: "#92400E", roof: "#B45309",
        warm: true, doorColor: "#78350F", banner: "#7C2D3E",
        sign: (
          <Svg width={s * 0.1} height={s * 0.12} viewBox="0 0 16 24">
            <Rect x={6} y={10} width={4} height={11} rx={1.6} fill="#FFF7ED" stroke="#B45309" strokeWidth={1.2} />
            <Path d="M8 1.5 C10 4.5, 10 7, 8 9.5 C6 7, 6 4.5, 8 1.5 Z" fill="#F59E0B" />
            <Ellipse cx={8} cy={7.6} rx={1.1} ry={1.9} fill="#FEF3C7" />
          </Svg>
        ),
        front: lv >= 3 ? (
          <View style={{ position: "absolute", bottom: (artH ?? s) * 0.52, left: 0, right: 0, flexDirection: "row", justifyContent: "center", zIndex: 3 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FDE68A", marginHorizontal: s * 0.045, borderWidth: 0.8, borderColor: "#F59E0B" }} />
            ))}
          </View>
        ) : undefined,
      });
    case "manna-house":
      // Manna House — a golden storybook bread house: warm walls, amber
      // roof, wheat medallion, and shelves of loaves in the window.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 26,
        wall: "#FEF3C7", outline: "#B45309", roof: "#D97706",
        warm: true, doorColor: "#92400E",
        sign: (
          <Svg width={s * 0.11} height={s * 0.12} viewBox="0 0 20 24">
            <Line x1={10} y1={22} x2={10} y2={7} stroke="#B45309" strokeWidth={1.8} strokeLinecap="round" />
            {[0, 1, 2].map((i) => (
              <React.Fragment key={i}>
                <Ellipse cx={6.4} cy={6 + i * 4.6} rx={2.6} ry={3.6} fill="#E8A84C" stroke="#B45309" strokeWidth={0.9} transform={`rotate(-24 6.4 ${6 + i * 4.6})`} />
                <Ellipse cx={13.6} cy={6 + i * 4.6} rx={2.6} ry={3.6} fill="#E8A84C" stroke="#B45309" strokeWidth={0.9} transform={`rotate(24 13.6 ${6 + i * 4.6})`} />
              </React.Fragment>
            ))}
          </Svg>
        ),
        display: (
          <View style={{ alignItems: "center" }}>
            {[0, 1].map((r) => (
              <View key={r} style={{ alignItems: "center", marginVertical: 1.5 }}>
                <View style={{ flexDirection: "row" }}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={{ width: s * 0.1, height: s * 0.06, borderRadius: s * 0.03, backgroundColor: "#FDE68A", marginHorizontal: 2, borderWidth: 1, borderColor: "#D97706" }} />
                  ))}
                </View>
                <View style={{ width: s * 0.4, height: 2.2, backgroundColor: "#92400E", borderRadius: 1, marginTop: 2 }} />
              </View>
            ))}
          </View>
        ),
      });
    case "feast-hall":
      // The Feast Hall — the grandest storybook hall: wide cream facade,
      // deep red roof, warm glowing windows, a goblet medallion, double
      // doors, and columns along the front from L2.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 27,
        wall: "#F3E3BC", outline: "#7C2D12", roof: "#7C2D12",
        w: s * 0.96, bodyH: (artH ?? s) * 0.56, warm: true,
        doorColor: "#451A03", doorWide: true, banner: "#7C2D12",
        sign: (
          <Svg width={s * 0.11} height={s * 0.12} viewBox="0 0 20 24">
            <Path d="M4 3 H16 C16 8, 13.8 11, 10 11 C6.2 11, 4 8, 4 3 Z" fill="#E9C767" stroke="#8A6D1C" strokeWidth={1.3} />
            <Line x1={10} y1={11} x2={10} y2={17} stroke="#8A6D1C" strokeWidth={1.8} />
            <Line x1={5.5} y1={20} x2={14.5} y2={20} stroke="#8A6D1C" strokeWidth={2} strokeLinecap="round" />
          </Svg>
        ),
        front: lv >= 2 ? (
          <View style={{ position: "absolute", bottom: 0, left: s * 0.05, right: s * 0.05, flexDirection: "row", justifyContent: "space-between", zIndex: 2 }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ width: s * 0.055, height: (artH ?? s) * 0.5, backgroundColor: "#FFFBEB", borderWidth: 1.4, borderColor: "#B8A888", borderRadius: 2 }} />
            ))}
          </View>
        ) : undefined,
      });
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
    case "bible-study-hall": {
      // Bible Study Hall — warm stone hall for circle gatherings.
      // L1: gabled hall, arched windows, open-book sign, cross finial.
      // L2: taller facade, second row of windows, verse banner.
      // L3: library wing with a tall shelf window, gold trim, steps.
      const H = artH ?? s;
      const w = s * 0.94;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.15)}
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            <View style={{ alignItems: "center" }}>
              {/* cross finial */}
              <Svg width={s * 0.12} height={s * 0.2} viewBox="0 0 12 20">
                <Rect x={5} y={0} width={2.4} height={20} fill={lv >= 3 ? "#C9963C" : "#8A7F6A"} />
                <Rect x={1.5} y={5} width={9.4} height={2.4} fill={lv >= 3 ? "#C9963C" : "#8A7F6A"} />
              </Svg>
              {/* gabled roof */}
              <Svg width={w * 0.78} height={s * 0.2} viewBox="0 0 100 22" style={{ marginBottom: -2 }}>
                <Polygon points="2,22 50,2 98,22" fill="#5B6B82" stroke="#42506A" strokeWidth={2.5} />
                {lv >= 3 && <Polygon points="22,22 50,9 78,22" fill="#C9963C" opacity={0.5} />}
              </Svg>
              {/* facade */}
              <View style={{ width: w * 0.78, height: H * (lv >= 2 ? 0.52 : 0.42), backgroundColor: "#F1E8D8", borderWidth: 2, borderColor: "#A2937A", borderBottomLeftRadius: 4, borderBottomRightRadius: 4, alignItems: "center" }}>
                {/* open-book sign */}
                <Svg width={s * 0.3} height={s * 0.17} viewBox="0 0 30 17" style={{ marginTop: s * 0.04 }}>
                  <Path d="M15 3 C11 0.8, 5 0.8, 2 2.4 L2 14 C5 12.4, 11 12.4, 15 14.6 C19 12.4, 25 12.4, 28 14 L28 2.4 C25 0.8, 19 0.8, 15 3 Z" fill="#FFF8E7" stroke="#C9963C" strokeWidth={1.8} />
                  <Line x1={15} y1={3} x2={15} y2={14.6} stroke="#C9963C" strokeWidth={1.4} />
                  <Line x1={5} y1={5.4} x2={12} y2={4.4} stroke="#B8AE99" strokeWidth={1.2} />
                  <Line x1={5} y1={8.8} x2={12} y2={7.8} stroke="#B8AE99" strokeWidth={1.2} />
                  <Line x1={18} y1={4.4} x2={25} y2={5.4} stroke="#B8AE99" strokeWidth={1.2} />
                  <Line x1={18} y1={7.8} x2={25} y2={8.8} stroke="#B8AE99" strokeWidth={1.2} />
                </Svg>
                {/* arched windows */}
                <View style={{ flexDirection: "row", marginTop: s * 0.03 }}>
                  {[0, 1].map((i) => (
                    <View key={i} style={{ width: s * 0.12, height: s * 0.17, backgroundColor: isLit(i, 3) ? LIT : "#CBD8EA", borderTopLeftRadius: s * 0.06, borderTopRightRadius: s * 0.06, borderWidth: 1.5, borderColor: "#8A7F6A", marginHorizontal: s * 0.05 }} />
                  ))}
                </View>
                {lv >= 2 && (
                  <View style={{ flexDirection: "row", marginTop: s * 0.03 }}>
                    {[0, 1, 2].map((i) => (
                      <View key={i} style={{ width: s * 0.09, height: s * 0.11, backgroundColor: isLit(i + 2, 1) ? LIT : "#CBD8EA", borderTopLeftRadius: s * 0.045, borderTopRightRadius: s * 0.045, borderWidth: 1.5, borderColor: "#8A7F6A", marginHorizontal: s * 0.035 }} />
                    ))}
                  </View>
                )}
                {/* door */}
                <View style={{ position: "absolute", bottom: 0, width: s * 0.17, height: s * 0.2, backgroundColor: "#6B4423", borderTopLeftRadius: s * 0.085, borderTopRightRadius: s * 0.085, borderWidth: 1.5, borderColor: "#4E2F16" }} />
                {/* verse banner (L2+) */}
                {lv >= 2 && (
                  <View style={{ position: "absolute", top: s * 0.05, right: s * 0.04, width: s * 0.06, height: s * 0.2, backgroundColor: "#7C2D3E", borderRadius: 2, borderWidth: 1, borderColor: "#5E1F2D", alignItems: "center", paddingTop: 2 }}>
                    <View style={{ width: s * 0.03, height: 2, backgroundColor: "#F4D47C", marginVertical: 1.5 }} />
                    <View style={{ width: s * 0.03, height: 2, backgroundColor: "#F4D47C", marginVertical: 1.5 }} />
                    <View style={{ width: s * 0.03, height: 2, backgroundColor: "#F4D47C", marginVertical: 1.5 }} />
                  </View>
                )}
              </View>
            </View>
            {/* library wing (L3) */}
            {lv >= 3 && (
              <View style={{ width: w * 0.24, height: H * 0.4, backgroundColor: "#E7DCC4", borderWidth: 2, borderColor: "#A2937A", borderBottomRightRadius: 4, marginLeft: -2, alignItems: "center", paddingTop: s * 0.04 }}>
                <View style={{ width: s * 0.15, height: s * 0.22, backgroundColor: "#FFF3D6", borderRadius: 3, borderWidth: 1.5, borderColor: "#8A6D1C", flexDirection: "row", alignItems: "flex-end", justifyContent: "center", paddingBottom: 2 }}>
                  {["#B91C1C", "#1D4ED8", "#166534", "#C9963C", "#7C2D3E"].map((c, i) => (
                    <View key={i} style={{ width: 3, height: s * (0.1 + (i % 3) * 0.03), backgroundColor: c, marginHorizontal: 0.8 }} />
                  ))}
                </View>
                <View style={{ width: s * 0.1, height: s * 0.13, backgroundColor: "#6B4423", borderTopLeftRadius: 5, borderTopRightRadius: 5, marginTop: s * 0.05 }} />
              </View>
            )}
          </View>
          {lv >= 3 && (
            <View style={{ width: w * 0.5, height: 4, backgroundColor: "#D6CDBB", borderRadius: 2, marginTop: 2, borderWidth: 1, borderColor: "#B8AE99" }} />
          )}
        </View>
      );
    }
    case "fasting-house": {
      // The Fasting House — a quiet cottage set apart for prayer.
      // L1: sage cottage, candle-glow window, small cross over the door.
      // L2: porch with a prayer bench, lantern, second glowing window.
      // L3: glass garden window with plants, second bench, stone path.
      const H = artH ?? s;
      const w = s * 0.9;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.1)}
          {/* chimney */}
          <View style={{ position: "absolute", bottom: H * 0.52, right: s * 0.16, width: s * 0.09, height: s * 0.16, backgroundColor: "#8A8B7A", borderWidth: 1.5, borderColor: "#6B6C5C" }} />
          <Svg width={w} height={s * 0.18} viewBox="0 0 100 20" style={{ marginBottom: -2 }}>
            <Polygon points="2,20 50,2 98,20" fill="#A05244" stroke="#7E3B30" strokeWidth={2.5} />
          </Svg>
          <View style={{ width: w, height: H * 0.46, backgroundColor: "#E9EBDD", borderWidth: 2, borderColor: "#7A7C66", borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}>
            {sideShade(w, H * 0.46, 4)}
            {/* candle-glow windows — always warm, even by day */}
            <View style={{ position: "absolute", top: s * 0.07, left: s * 0.07, width: s * 0.15, height: s * 0.16, backgroundColor: "#FDE68A", borderRadius: 3, borderWidth: 1.5, borderColor: "#7A7C66", alignItems: "center", justifyContent: "center" }}>
              <Svg width={s * 0.07} height={s * 0.1} viewBox="0 0 8 12">
                <Rect x={3} y={5} width={2.4} height={6} fill="#F8FAFC" />
                <Path d="M4.2 0.6 C5.4 2.4, 5.4 3.8, 4.2 5 C3 3.8, 3 2.4, 4.2 0.6 Z" fill="#F59E0B" />
              </Svg>
            </View>
            {lv >= 2 && (
              <View style={{ position: "absolute", top: s * 0.07, right: s * 0.07, width: s * 0.15, height: s * 0.16, backgroundColor: "#FDE68A", borderRadius: 3, borderWidth: 1.5, borderColor: "#7A7C66", alignItems: "center", justifyContent: "center" }}>
                <Svg width={s * 0.07} height={s * 0.1} viewBox="0 0 8 12">
                  <Rect x={3} y={5} width={2.4} height={6} fill="#F8FAFC" />
                  <Path d="M4.2 0.6 C5.4 2.4, 5.4 3.8, 4.2 5 C3 3.8, 3 2.4, 4.2 0.6 Z" fill="#F59E0B" />
                </Svg>
              </View>
            )}
            {/* door with a small cross */}
            <View style={{ position: "absolute", bottom: 0, left: w / 2 - s * 0.085, width: s * 0.17, height: s * 0.24, backgroundColor: "#5E4A33", borderTopLeftRadius: 7, borderTopRightRadius: 7, borderWidth: 1.5, borderColor: "#42331F", alignItems: "center", paddingTop: s * 0.03 }}>
              <Svg width={s * 0.06} height={s * 0.09} viewBox="0 0 8 12">
                <Rect x={3.2} y={0} width={1.8} height={12} fill="#E9C767" />
                <Rect x={0.8} y={3.4} width={6.6} height={1.8} fill="#E9C767" />
              </Svg>
            </View>
            {/* garden window (L3) — plants behind arched glass */}
            {lv >= 3 && (
              <View style={{ position: "absolute", bottom: s * 0.02, left: s * 0.05, width: s * 0.2, height: s * 0.24, backgroundColor: "#DDEBD2", borderTopLeftRadius: s * 0.1, borderTopRightRadius: s * 0.1, borderWidth: 1.5, borderColor: "#5F7355", overflow: "hidden", alignItems: "center", justifyContent: "flex-end" }}>
                <Svg width={s * 0.17} height={s * 0.16} viewBox="0 0 20 18">
                  <Path d="M10 17 L10 8 M10 11 C7 10, 5.4 8, 5 5 C8 5.4, 10 7, 10 11 M10 9 C13 8.4, 14.6 6.6, 15 3.6 C12 4, 10 5.8, 10 9" stroke="#3E7C43" strokeWidth={1.8} fill="none" strokeLinecap="round" />
                  <Rect x={6.5} y={15} width={7} height={3} fill="#A05244" />
                </Svg>
              </View>
            )}
          </View>
          {/* porch bench + lantern (L2+) */}
          {lv >= 2 && (
            <View style={{ position: "absolute", bottom: 0, right: s * 0.04, alignItems: "center" }}>
              <View style={{ width: s * 0.07, height: s * 0.1, backgroundColor: "#FDE68A", borderRadius: 3, borderWidth: 1.5, borderColor: "#42331F", marginBottom: 2 }} />
              <View style={{ width: s * 0.2, height: s * 0.05, backgroundColor: "#8A5A2B", borderRadius: 2, borderWidth: 1, borderColor: "#5E3D22" }} />
              <View style={{ flexDirection: "row" }}>
                <View style={{ width: 3, height: s * 0.06, backgroundColor: "#5E3D22", marginHorizontal: s * 0.03 }} />
                <View style={{ width: 3, height: s * 0.06, backgroundColor: "#5E3D22", marginHorizontal: s * 0.03 }} />
              </View>
            </View>
          )}
          {lv >= 3 && (
            <View style={{ flexDirection: "row", marginTop: 2 }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ width: s * 0.09, height: 4, backgroundColor: "#C9C4B4", borderRadius: 2, marginHorizontal: 2, borderWidth: 0.8, borderColor: "#A8A28E" }} />
              ))}
            </View>
          )}
        </View>
      );
    }
    case "gym": {
      // The Gym — sturdy brick hall for training the body.
      // L1: brick hall, wide glass front, kettlebell sign.
      // L2: window band with dumbbell silhouettes, outdoor mat.
      // L3: glass curtain front, trophy shelf in the window, track stripe.
      const H = artH ?? s;
      const w = s * 0.94;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.1)}
          <View style={{ width: w, height: H * (lv >= 3 ? 0.58 : 0.5), backgroundColor: "#A5553F", borderWidth: 2, borderColor: "#71382A", borderRadius: 4 }}>
            {sideShade(w, H * 0.58, 4)}
            {/* parapet band */}
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: s * 0.09, backgroundColor: "#8C4630", borderTopLeftRadius: 3, borderTopRightRadius: 3, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              {/* barbell mark */}
              <Svg width={s * 0.3} height={s * 0.07} viewBox="0 0 30 7">
                <Line x1={3} y1={3.5} x2={27} y2={3.5} stroke="#F3E3BC" strokeWidth={1.8} />
                <Rect x={5} y={0.5} width={3} height={6} rx={1} fill="#F3E3BC" />
                <Rect x={9.5} y={1.5} width={2.4} height={4} rx={1} fill="#F3E3BC" />
                <Rect x={18.1} y={1.5} width={2.4} height={4} rx={1} fill="#F3E3BC" />
                <Rect x={22} y={0.5} width={3} height={6} rx={1} fill="#F3E3BC" />
              </Svg>
            </View>
            {/* glass front */}
            <View style={{ position: "absolute", top: s * 0.13, left: s * 0.06, right: s * 0.06, height: s * (lv >= 3 ? 0.3 : 0.2), backgroundColor: lv >= 3 ? "#BFE0EA" : "#9FC6D4", borderRadius: 4, borderWidth: 1.5, borderColor: "#71382A", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", paddingBottom: 3, overflow: "hidden" }}>
              {/* dumbbell silhouettes */}
              {[0, 1, 2].map((i) => (
                <Svg key={i} width={s * 0.13} height={s * 0.08} viewBox="0 0 16 9">
                  <Line x1={2} y1={4.5} x2={14} y2={4.5} stroke="#5E3D22" strokeWidth={1.6} />
                  <Rect x={2.5} y={1.5} width={2.6} height={6} rx={1} fill="#374151" />
                  <Rect x={10.9} y={1.5} width={2.6} height={6} rx={1} fill="#374151" />
                </Svg>
              ))}
              {/* trophy shelf (L3) */}
              {lv >= 3 && [0, 1].map((i) => (
                <Svg key={`t${i}`} width={s * 0.09} height={s * 0.11} viewBox="0 0 10 12">
                  <Path d="M2 1 h6 v3.4 c0 2-1.3 3.1-3 3.1 S2 6.4, 2 4.4 Z" fill="#E9C767" stroke="#8A6D1C" strokeWidth={0.9} />
                  <Path d="M2 2 C0.6 2, 0.2 3.4, 1 4.4 M8 2 C9.4 2, 9.8 3.4, 9 4.4" stroke="#8A6D1C" strokeWidth={0.9} fill="none" />
                  <Rect x={4.2} y={7.6} width={1.6} height={1.8} fill="#8A6D1C" />
                  <Rect x={2.6} y={9.4} width={4.8} height={1.6} fill="#8A6D1C" />
                </Svg>
              ))}
            </View>
            {/* kettlebell sign */}
            <View style={{ position: "absolute", bottom: s * 0.03, left: s * 0.06, width: s * 0.13, height: s * 0.15, alignItems: "center" }}>
              <Svg width={s * 0.13} height={s * 0.15} viewBox="0 0 13 15">
                <Path d="M3.4 6.4 C3.4 2.6, 9.6 2.6, 9.6 6.4" fill="none" stroke="#374151" strokeWidth={1.8} />
                <Circle cx={6.5} cy={10} r={4.4} fill="#374151" />
                <Circle cx={5.2} cy={8.6} r={1.2} fill="#6B7280" />
              </Svg>
            </View>
            {/* door */}
            <View style={{ position: "absolute", bottom: 0, right: s * 0.07, width: s * 0.16, height: s * 0.2, backgroundColor: "#4A2E28", borderTopLeftRadius: 6, borderTopRightRadius: 6, borderWidth: 1.5, borderColor: "#2E1B16" }} />
            {/* track stripe (L3) */}
            {lv >= 3 && <View style={{ position: "absolute", bottom: s * 0.02, left: s * 0.26, right: s * 0.26, height: 3, backgroundColor: "#E4572E", borderRadius: 2 }} />}
          </View>
          {/* outdoor mat (L2+) */}
          {lv >= 2 && (
            <View style={{ width: w * 0.6, height: 5, backgroundColor: "#3E6B8C", borderRadius: 2.5, marginTop: 2, borderWidth: 1, borderColor: "#2C4E66" }} />
          )}
        </View>
      );
    }
    case "outreach-center": {
      // Outreach Center — warm storefront with a serving awning.
      // L1: awning, heart sign, crates by the door.
      // L2: donation box, pantry shelf visible in the window.
      // L3: wide awning + banner, crate tower, serving counter at the front.
      const H = artH ?? s;
      const w = s * 0.92;
      return (
        <View style={{ width: s, height: H, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(w * 1.1)}
          {/* crates beside the door */}
          <View style={{ position: "absolute", bottom: 0, left: s * 0.02, alignItems: "center" }}>
            <View style={{ width: s * 0.15, height: s * 0.1, backgroundColor: "#C69A63", borderRadius: 2, borderWidth: 1.5, borderColor: "#8A5A2B" }} />
            <View style={{ width: s * 0.17, height: s * 0.11, backgroundColor: "#B8894F", borderRadius: 2, borderWidth: 1.5, borderColor: "#8A5A2B", marginTop: -1 }} />
            {lv >= 3 && <View style={{ width: s * 0.12, height: s * 0.09, backgroundColor: "#C69A63", borderRadius: 2, borderWidth: 1.5, borderColor: "#8A5A2B", marginTop: -1 }} />}
          </View>
          <View style={{ width: w, height: H * 0.54, backgroundColor: "#F6E3C2", borderWidth: 2, borderColor: "#9A6A35", borderRadius: 4, marginLeft: s * 0.08 }}>
            {sideShade(w, H * 0.54, 4)}
            {/* serving awning */}
            <View style={{ position: "absolute", top: -s * 0.02, left: -s * 0.02, right: -s * 0.02, height: s * 0.09, backgroundColor: "#2E7D74", borderRadius: 3, borderWidth: 1.5, borderColor: "#1F5A54", flexDirection: "row", overflow: "hidden" }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={{ flex: 1, backgroundColor: i % 2 ? "#2E7D74" : "#F6E3C2" }} />
              ))}
            </View>
            {/* heart sign */}
            <View style={{ position: "absolute", top: s * 0.1, alignSelf: "center", width: s * 0.16, height: s * 0.16, borderRadius: s * 0.08, backgroundColor: "#FFF8E7", borderWidth: 2, borderColor: "#B3543F", alignItems: "center", justifyContent: "center" }}>
              <Svg width={s * 0.1} height={s * 0.09} viewBox="0 0 20 18">
                <Path d="M10 16.4 C4 12.4, 1.6 9.2, 1.6 5.8 C1.6 3, 3.8 1.2, 6.2 1.2 C7.9 1.2, 9.3 2.1, 10 3.4 C10.7 2.1, 12.1 1.2, 13.8 1.2 C16.2 1.2, 18.4 3, 18.4 5.8 C18.4 9.2, 16 12.4, 10 16.4 Z" fill="#C4493B" />
              </Svg>
            </View>
            {/* pantry window (L2+) — cans and boxes on a shelf */}
            {lv >= 2 && (
              <View style={{ position: "absolute", top: s * 0.12, left: s * 0.05, width: s * 0.26, height: s * 0.17, backgroundColor: "#FFF3D6", borderRadius: 3, borderWidth: 1.5, borderColor: "#9A6A35", flexDirection: "row", alignItems: "flex-end", justifyContent: "center", paddingBottom: 2 }}>
                {["#C4493B", "#2E7D74", "#E9C767", "#7A5230"].map((c, i) => (
                  <View key={i} style={{ width: s * 0.045, height: s * (0.07 + (i % 2) * 0.03), backgroundColor: c, borderRadius: 1.5, marginHorizontal: 1.2 }} />
                ))}
                <View style={{ position: "absolute", bottom: s * 0.09, left: 2, right: 2, height: 2, backgroundColor: "#9A6A35" }} />
              </View>
            )}
            {/* donation box (L2+) */}
            {lv >= 2 && (
              <View style={{ position: "absolute", bottom: s * 0.02, right: s * 0.04, width: s * 0.11, height: s * 0.13, backgroundColor: "#2E7D74", borderRadius: 3, borderWidth: 1.5, borderColor: "#1F5A54", alignItems: "center", paddingTop: 2 }}>
                <View style={{ width: s * 0.06, height: 2.4, backgroundColor: "#123B36", borderRadius: 1.2 }} />
              </View>
            )}
            {/* serving counter (L3) — open front with a counter ledge */}
            {lv >= 3 && (
              <View style={{ position: "absolute", bottom: 0, left: s * 0.08, width: s * 0.3, height: s * 0.1, backgroundColor: "#8A5A2B", borderTopLeftRadius: 3, borderTopRightRadius: 3, borderWidth: 1.5, borderColor: "#5E3D22", flexDirection: "row", justifyContent: "space-around", alignItems: "flex-start", paddingTop: 2 }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ width: s * 0.05, height: s * 0.04, backgroundColor: "#E9C767", borderRadius: 2 }} />
                ))}
              </View>
            )}
            {/* door */}
            <View style={{ position: "absolute", bottom: 0, left: w / 2 - s * 0.02, width: s * 0.17, height: s * 0.21, backgroundColor: "#7A5230", borderTopLeftRadius: 7, borderTopRightRadius: 7, borderWidth: 1.5, borderColor: "#4E2F16" }} />
            {/* welcome banner (L3) */}
            {lv >= 3 && (
              <View style={{ position: "absolute", top: s * 0.11, right: s * 0.04, width: s * 0.06, height: s * 0.19, backgroundColor: "#C4493B", borderRadius: 2, borderWidth: 1, borderColor: "#8E2F24", alignItems: "center", paddingTop: 2 }}>
                <Svg width={s * 0.04} height={s * 0.04} viewBox="0 0 20 18">
                  <Path d="M10 16.4 C4 12.4, 1.6 9.2, 1.6 5.8 C1.6 3, 3.8 1.2, 6.2 1.2 C7.9 1.2, 9.3 2.1, 10 3.4 C10.7 2.1, 12.1 1.2, 13.8 1.2 C16.2 1.2, 18.4 3, 18.4 5.8 C18.4 9.2, 16 12.4, 10 16.4 Z" fill="#F6E3C2" />
                </Svg>
              </View>
            )}
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
    // ---- School Campus buildings (preset quad plots) ----
    case "music-room":
      // The Music Room — a lavender storybook hall on the quad: purple
      // gable roof, a golden note medallion, song in the air.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 28,
        wall: "#EDE9FE", outline: "#6D28D9", roof: "#7C3AED",
        doorColor: "#4C1D95",
        sign: (
          <Svg width={s * 0.11} height={s * 0.12} viewBox="0 0 24 26">
            <Path d="M9 19.5 V7 L21 4 V17" fill="none" stroke="#B45309" strokeWidth={2.2} strokeLinecap="round" />
            <Ellipse cx={6.2} cy={19.5} rx={3.4} ry={2.7} fill="#B45309" />
            <Ellipse cx={18.2} cy={17} rx={3.4} ry={2.7} fill="#B45309" />
          </Svg>
        ),
        banner: "#7C3AED",
      });
    case "science-lab":
      // The Science Lab — a bright storybook lab: mint walls, teal trim,
      // flask medallion, bottles in the window, and a glass greenhouse
      // dome on the roof at L3.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 29,
        wall: "#ECFDF5", outline: "#0F766E", roof: "#0F766E",
        roofStyle: "flat", doorColor: "#134E4A",
        sign: (
          <Svg width={s * 0.11} height={s * 0.12} viewBox="0 0 20 24">
            <Path d="M8.5 3 H11.5 V9 L15.5 17.5 A2.4 2.4 0 0 1 13.4 21 H6.6 A2.4 2.4 0 0 1 4.5 17.5 L8.5 9 Z" fill="#CCFBF1" stroke="#0F766E" strokeWidth={1.5} />
            <Path d="M6.2 14.5 H13.8 L15.5 17.5 A2.4 2.4 0 0 1 13.4 21 H6.6 A2.4 2.4 0 0 1 4.5 17.5 Z" fill="#2DD4BF" />
            <Circle cx={10} cy={17.6} r={1.1} fill="#ECFDF5" />
          </Svg>
        ),
        display: (
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            {["#C084FC", "#34D399", "#FBBF24"].map((c, i) => (
              <View key={i} style={{ width: s * 0.07, height: s * (0.09 + i * 0.025), borderRadius: 3, backgroundColor: c, marginHorizontal: 2.5, borderWidth: 1, borderColor: "rgba(0,0,0,0.2)" }} />
            ))}
          </View>
        ),
        front: lv >= 3 ? (
          <View style={{ position: "absolute", bottom: (artH ?? s) * 0.53, alignSelf: "center", width: s * 0.34, height: s * 0.15, borderTopLeftRadius: s * 0.17, borderTopRightRadius: s * 0.17, backgroundColor: "#99F6E4", opacity: 0.85, borderWidth: 2, borderColor: "#0F766E", zIndex: 0 }} />
        ) : undefined,
      });
    case "art-studio":
      // The Art Studio — a rosy storybook studio: blush walls, wine-red
      // gable roof, palette medallion, and framed pictures in the window.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 30,
        wall: "#FFF1F2", outline: "#BE3455", roof: "#9F1239",
        doorColor: "#881337",
        sign: (
          <Svg width={s * 0.12} height={s * 0.12} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={9} fill="#D9A96B" stroke="#8A5A2B" strokeWidth={1.5} />
            <Circle cx={8.6} cy={8.6} r={1.9} fill="#DC2626" />
            <Circle cx={14.8} cy={7.8} r={1.9} fill="#2563EB" />
            <Circle cx={16.8} cy={13.4} r={1.9} fill="#FACC15" />
            <Circle cx={9.4} cy={15.6} r={1.9} fill="#059669" />
          </Svg>
        ),
        display: (
          <View style={{ flexDirection: "row" }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ width: s * 0.16, height: s * 0.13, backgroundColor: "#FFFBEB", borderWidth: 2, borderColor: "#8A5A2B", marginHorizontal: 3, alignItems: "center", justifyContent: "center" }}>
                <Svg width={s * 0.12} height={s * 0.09} viewBox="0 0 20 14">
                  <Polygon points={i ? "2,12 8,5 12,9 15,6 18,12" : "2,12 7,4 11,10 14,7 18,12"} fill={i ? "#7FA8C9" : "#4C9A50"} />
                  <Circle cx={i ? 5 : 15.5} cy={3.6} r={1.8} fill="#FBBF24" />
                </Svg>
              </View>
            ))}
          </View>
        ),
      });
    case "gymnasium":
      // The Gymnasium — a sturdy storybook sports hall: warm brick-toned
      // walls, a parapet band, basketball medallion, and the hoop framed
      // in the big glass front.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 31,
        wall: "#FDEBD0", outline: "#92400E", roof: "#92400E",
        roofStyle: "flat", doorColor: "#451A03",
        w: s * 0.96, bodyH: (artH ?? s) * 0.56,
        sign: (
          <Svg width={s * 0.12} height={s * 0.12} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={9} fill="#F97316" stroke="#9A3412" strokeWidth={1.6} />
            <Path d="M3.5 9.5 H20.5 M3.5 14.5 H20.5 M12 3 C8.5 7.5, 8.5 16.5, 12 21 C15.5 16.5, 15.5 7.5, 12 3" fill="none" stroke="#9A3412" strokeWidth={1.3} />
          </Svg>
        ),
        signBg: "#FFF7ED",
        display: (
          <View style={{ width: s * 0.3, height: s * 0.22, backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#C2410C", borderRadius: 2, alignItems: "center", justifyContent: "flex-end" }}>
            <View style={{ width: s * 0.15, height: s * 0.16, borderWidth: 1.6, borderColor: "#C2410C", borderRadius: 1 }} />
            <View style={{ width: s * 0.17, height: s * 0.045, backgroundColor: "#EA580C", borderRadius: 2, marginBottom: -s * 0.02 }} />
          </View>
        ),
        displayGlass: "#FFF7ED",
      });
    case "cafeteria":
      // The Cafeteria — a cheerful storybook lunch hall: cream walls,
      // amber gable roof with the striped serving awning, tray medallion,
      // and lunch waiting in the window.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 32,
        wall: "#FEF3C7", outline: "#B45309", roof: "#B45309",
        awning: ["#D97706", "#FFFFFF"],
        sign: (
          <Svg width={s * 0.12} height={s * 0.11} viewBox="0 0 26 20">
            <Rect x={3} y={8} width={20} height={9} rx={2.5} fill="#94A3B8" stroke="#64748B" strokeWidth={1.5} />
            <Circle cx={9} cy={12.5} r={2.2} fill="#FDE68A" />
            <Circle cx={14.5} cy={12.5} r={2.2} fill="#65A30D" />
            <Circle cx={19.5} cy={12.5} r={2.2} fill="#DC2626" />
          </Svg>
        ),
        display: (
          <View style={{ flexDirection: "row" }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ width: s * 0.1, height: s * 0.1, borderRadius: s * 0.05, backgroundColor: ["#FDE68A", "#FCA5A5", "#BBF7D0"][i], marginHorizontal: 2.5, borderWidth: 1.2, borderColor: "#B45309" }} />
            ))}
          </View>
        ),
      });
    case "school-workshop":
      // The School Workshop — a timber storybook workshop: honey wood
      // walls, dark gable roof, saw-blade medallion, and a log pile by
      // the wall from L2.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 33,
        wall: "#E3C08D", outline: "#6B4A2F", roof: "#6B4A2F",
        doorColor: "#4E3421", doorWide: true,
        sign: (
          <Svg width={s * 0.12} height={s * 0.12} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={8.6} fill="#CBD5E1" stroke="#78716C" strokeWidth={1.8} />
            <Circle cx={12} cy={12} r={2.6} fill="#78716C" />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <Circle key={a} cx={12 + 5.6 * Math.cos((a * Math.PI) / 180)} cy={12 + 5.6 * Math.sin((a * Math.PI) / 180)} r={1} fill="#78716C" />
            ))}
          </Svg>
        ),
        front: lv >= 2 ? (
          <View style={{ position: "absolute", bottom: 0, right: s * 0.02, alignItems: "center", justifyContent: "flex-end" }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ width: s * (0.2 - i * 0.03), height: s * 0.06, borderRadius: s * 0.03, backgroundColor: "#8A5A2B", borderWidth: 1.4, borderColor: "#5E3D22", marginTop: -s * 0.012 }} />
            ))}
          </View>
        ) : undefined,
      });
    case "main-office":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          {groundShadow(s * 0.9)}
          {lv >= 3 && (
            <View style={{ position: "absolute", top: s * 0.02, right: s * 0.16, alignItems: "center" }}>
              <View style={{ width: s * 0.03, height: s * 0.16, backgroundColor: "#78716C" }} />
              <View style={{ position: "absolute", top: 0, left: s * 0.03, width: s * 0.13, height: s * 0.08, backgroundColor: "#B45309", borderTopRightRadius: 2, borderBottomRightRadius: 2 }} />
            </View>
          )}
          {/* roof band */}
          <View style={{ width: s * 0.92, height: s * 0.11, backgroundColor: "#334155", borderTopLeftRadius: 5, borderTopRightRadius: 5 }} />
          <View style={{ width: s * 0.88, height: s * 0.56, backgroundColor: "#F5F0E6", borderWidth: 2, borderColor: "#78716C", borderTopWidth: 0, alignItems: "center" }}>
            {/* sign board */}
            <View style={{ marginTop: s * 0.05, width: s * 0.52, height: s * 0.11, borderRadius: 3, backgroundColor: lv >= 3 ? "#B45309" : "#475569", alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: s * 0.36, height: s * 0.035, borderRadius: 2, backgroundColor: "#FDE68A" }} />
            </View>
            {/* windows + door */}
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: s * 0.07 }}>
              <View style={{ width: s * 0.15, height: s * 0.19, backgroundColor: "#BFDBFE", borderWidth: 1.6, borderColor: "#78716C", borderRadius: 2 }} />
              <View style={{ width: s * 0.17, height: s * 0.3, backgroundColor: "#44403C", borderTopLeftRadius: s * 0.08, borderTopRightRadius: s * 0.08, marginHorizontal: s * 0.06 }} />
              <View style={{ width: s * 0.15, height: s * 0.19, backgroundColor: "#BFDBFE", borderWidth: 1.6, borderColor: "#78716C", borderRadius: 2 }} />
            </View>
            {lv >= 2 && (
              <View style={{ flexDirection: "row", position: "absolute", top: s * 0.2 }}>
                <View style={{ width: s * 0.09, height: s * 0.09, backgroundColor: "#FDE68A", borderWidth: 1.4, borderColor: "#78716C", borderRadius: 2, marginHorizontal: s * 0.19 }} />
                <View style={{ width: s * 0.09, height: s * 0.09, backgroundColor: "#FDE68A", borderWidth: 1.4, borderColor: "#78716C", borderRadius: 2, marginHorizontal: s * 0.19 }} />
              </View>
            )}
          </View>
          <View style={{ width: s * 0.94, height: s * 0.08, backgroundColor: "#57534E", borderRadius: 3, marginTop: 2 }} />
        </View>
      );
    case "bell-tower": {
      // The quad landmark. The bell is bronze at rest and gold on the day
      // it has rung (blessed) — with a warm halo behind it.
      const bellColor = blessed ? "#FACC15" : "#B45309";
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
          {blessed && (
            <View style={{ position: "absolute", bottom: s * 0.3, width: s * 0.95, height: s * 0.95, borderRadius: s * 0.48, backgroundColor: "#FDE68A", opacity: 0.35 }} />
          )}
          {groundShadow(s * 0.55)}
          {/* spire */}
          <View style={{
            width: 0, height: 0,
            borderLeftWidth: s * 0.13, borderRightWidth: s * 0.13,
            borderBottomWidth: s * 0.2,
            borderLeftColor: "transparent", borderRightColor: "transparent",
            borderBottomColor: "#475569",
          }} />
          <View style={{ width: s * 0.05, height: s * 0.07, backgroundColor: "#B45309", marginTop: -s * 0.19 }} />
          {/* tower body */}
          <View style={{ width: s * 0.4, height: lv >= 2 ? s * 0.58 : s * 0.5, backgroundColor: "#E7E5E4", borderWidth: 2, borderColor: "#A8A29E", borderRadius: 3, alignItems: "center" }}>
            {/* bell in its arch */}
            <View style={{ marginTop: s * 0.05, width: s * 0.26, height: s * 0.24, backgroundColor: "#292524", borderTopLeftRadius: s * 0.13, borderTopRightRadius: s * 0.13, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: s * 0.15, height: s * 0.15, borderTopLeftRadius: s * 0.075, borderTopRightRadius: s * 0.075, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05, backgroundColor: bellColor }} />
              <View style={{ width: s * 0.045, height: s * 0.045, borderRadius: s * 0.023, backgroundColor: bellColor, marginTop: 1 }} />
            </View>
            {lv >= 2 && (
              <View style={{ marginTop: s * 0.05, width: s * 0.17, height: s * 0.17, borderRadius: s * 0.085, backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#78716C", alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 2, height: s * 0.055, backgroundColor: "#292524", position: "absolute", top: s * 0.018 }} />
                <View style={{ width: s * 0.05, height: 2, backgroundColor: "#292524", position: "absolute", right: s * 0.02 }} />
              </View>
            )}
            {lv >= 3 && <View style={{ marginTop: s * 0.04, width: s * 0.12, height: s * 0.14, backgroundColor: "#BFDBFE", borderTopLeftRadius: s * 0.06, borderTopRightRadius: s * 0.06 }} />}
          </View>
          <View style={{ width: s * 0.5, height: s * 0.06, backgroundColor: "#78716C", borderRadius: 2 }} />
        </View>
      );
    }
    case "art-gallery":
      // The Art Gallery — a quiet stone storybook gallery downtown: flat
      // roof with a skylight, and framed landscapes lining the glass.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 35,
        wall: "#FAF5EF", outline: "#78716C", roof: "#57534E",
        roofStyle: "flat", doorColor: "#44403C",
        sign: (
          <View style={{ width: s * 0.15, height: s * 0.11, backgroundColor: "#FFFBEB", borderWidth: 2, borderColor: "#8A5A2B", alignItems: "center", justifyContent: "center" }}>
            <Svg width={s * 0.11} height={s * 0.07} viewBox="0 0 20 14">
              <Polygon points="2,12 7,4 11,10 14,7 18,12" fill="#4C9A50" />
              <Circle cx={15.5} cy={3.6} r={1.8} fill="#FBBF24" />
            </Svg>
          </View>
        ),
        display: (
          <View style={{ flexDirection: "row" }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ width: s * 0.115, height: s * 0.13, backgroundColor: "#FFFBEB", borderWidth: 1.8, borderColor: "#8A5A2B", marginHorizontal: 2, alignItems: "center", justifyContent: "center" }}>
                <Svg width={s * 0.09} height={s * 0.1} viewBox="0 0 16 16">
                  <Polygon points={i === 1 ? "2,13 6,5 9,9 11.5,6.5 14,13" : "2,13 5.5,6 9,10 11,8 14,13"} fill={["#7FA8C9", "#4C9A50", "#E8A84C"][i]} />
                </Svg>
              </View>
            ))}
          </View>
        ),
        front: (
          <View style={{ position: "absolute", bottom: (artH ?? s) * 0.55, left: s / 2 - s * 0.11, width: s * 0.22, height: s * 0.045, backgroundColor: "#BAE6FD", borderWidth: 1.6, borderColor: "#78716C", borderRadius: 2, zIndex: 2 }} />
        ),
      });
    case "coffee-roastery":
      // The Coffee Roastery — a warm stone storybook works downtown:
      // brown gable roof with a little roaster chimney, a bean medallion,
      // and bean sacks in the window from L2.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 37,
        wall: "#EFEBE4", outline: "#5E3D22", roof: "#6B4423",
        doorColor: "#3E2723", chimney: "#78716C",
        sign: (
          <Svg width={s * 0.11} height={s * 0.12} viewBox="0 0 20 24">
            <Ellipse cx={10} cy={12} rx={6.8} ry={9} fill="#8A5A2B" stroke="#5E3D22" strokeWidth={1.5} />
            <Path d="M10 3.5 C6.8 8, 13.2 16, 10 20.5" fill="none" stroke="#5E3D22" strokeWidth={1.6} strokeLinecap="round" />
          </Svg>
        ),
        display: lv >= 2 ? (
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            {[0, 1].map((i) => (
              <View key={i} style={{ width: s * 0.15, height: s * 0.12, backgroundColor: "#C69A63", borderTopLeftRadius: s * 0.06, borderTopRightRadius: s * 0.06, borderRadius: 3, marginHorizontal: 3, borderWidth: 1.4, borderColor: "#8A5A2B", alignItems: "center", paddingTop: 2 }}>
                <Svg width={s * 0.07} height={s * 0.08} viewBox="0 0 20 24">
                  <Ellipse cx={10} cy={12} rx={6.8} ry={9} fill="#8A5A2B" stroke="#5E3D22" strokeWidth={1.5} />
                  <Path d="M10 3.5 C6.8 8, 13.2 16, 10 20.5" fill="none" stroke="#5E3D22" strokeWidth={1.6} strokeLinecap="round" />
                </Svg>
              </View>
            ))}
          </View>
        ) : undefined,
      });
    case "flower-market":
      // The Flower Market — an open storybook stall downtown: cream walls
      // under the striped awning, a medallion bloom, and rows of flowers
      // spilling across the whole front.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 36,
        wall: "#FFFBEB", outline: "#B45309", roof: "#B45309",
        awning: ["#EC4899", "#FFFFFF"],
        w: s * 0.95, bodyH: (artH ?? s) * 0.5,
        sign: (
          <Svg width={s * 0.12} height={s * 0.12} viewBox="0 0 24 24">
            {[0, 72, 144, 216, 288].map((a) => (
              <Circle key={a} cx={12 + 4.4 * Math.cos((a * Math.PI) / 180)} cy={12 + 4.4 * Math.sin((a * Math.PI) / 180)} r={3.1} fill="#F9A8D4" stroke="#BE185D" strokeWidth={0.8} />
            ))}
            <Circle cx={12} cy={12} r={2.8} fill="#FBBF24" stroke="#D97706" strokeWidth={1} />
          </Svg>
        ),
        display: (
          <View style={{ alignItems: "center" }}>
            {[0, 1].map((r) => (
              <View key={r} style={{ flexDirection: "row", marginVertical: 1.2 }}>
                {["#F472B6", "#FACC15", "#FB923C", "#A78BFA", "#F87171"].map((c, i) => (
                  <View key={i} style={{ alignItems: "center", marginHorizontal: 2.6 }}>
                    <View style={{ width: s * 0.05, height: s * 0.05, borderRadius: s * 0.025, backgroundColor: (r + i) % 2 ? c : "#F9A8D4" }} />
                    <View style={{ width: 1.8, height: s * 0.04, backgroundColor: "#16A34A" }} />
                  </View>
                ))}
              </View>
            ))}
          </View>
        ),
      });
    case "music-studio":
      // The Music Studio — an indigo storybook studio downtown: flat
      // banded roof, sound-wave medallion, and neon equalizer bars
      // glowing in the dark glass front.
      return storybook({
        s, H: artH ?? s, lv, lit: isLit, LIT, seed: 34,
        wall: "#E0E7FF", outline: "#4338CA", roof: "#3730A3",
        roofStyle: "flat", doorColor: "#1E1B4B", trim: "#818CF8",
        sign: (
          <Svg width={s * 0.12} height={s * 0.12} viewBox="0 0 24 24">
            <Rect x={4} y={9} width={3.4} height={6} rx={1.6} fill="#4338CA" />
            <Rect x={10.3} y={5} width={3.4} height={14} rx={1.6} fill="#4338CA" />
            <Rect x={16.6} y={8} width={3.4} height={8} rx={1.6} fill="#4338CA" />
          </Svg>
        ),
        display: (
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            {[0.5, 0.95, 0.65, 1.15, 0.45, 0.8].map((f, i) => (
              <View key={i} style={{ width: s * 0.05, height: s * 0.11 * f, backgroundColor: ["#818CF8", "#F0ABFC", "#67E8F9"][i % 3], borderRadius: 2, marginHorizontal: 2 }} />
            ))}
          </View>
        ),
        displayGlass: "#1E1B4B",
      });
    default:
      return <View style={{ width: s * 0.7, height: s * 0.7, backgroundColor: "#9CA3AF", borderRadius: 8 }} />;
  }
}

/**
 * BuildingArt's props are all primitives, so a memoized wrapper lets the
 * ~40 heavy SVG building trees skip re-rendering whenever the screen
 * re-renders for unrelated reasons (ticks, modals, collect FX, clocks).
 */
const MemoBuildingArt = React.memo(BuildingArt);

type BuildingArtProps = { type: string; size: number; level?: number; floors?: number; prayedCount?: number; artH?: number; blessed?: boolean; night?: boolean };

/**
 * Upgrade transformation: when a building's level (or floor count) rises,
 * the map art crossfades old → new over ~600ms of sine ease with a soft
 * golden glow pulse and a gentle scale settle (transform/opacity only,
 * native driver). Only the upgraded building animates — every other
 * building renders the plain memoized art with zero wrapper overhead, and
 * idle renders of the upgraded building go back to plain art the moment
 * the pulse finishes.
 */
const BuildingArtFX = React.memo(function BuildingArtFX(props: BuildingArtProps) {
  const [fx, setFx] = useState<{ prev: BuildingArtProps } | null>(null);
  const lastRef = useRef(props);
  const anim = useRef(new Animated.Value(0)).current;

  // Runs after every render: an increase in level/floors since the last
  // rendered props means this building just upgraded — capture the old
  // props so the old art can fade out underneath the new.
  useEffect(() => {
    const prev = lastRef.current;
    const leveled =
      (props.level || 1) > (prev.level || 1) || (props.floors || 1) > (prev.floors || 1);
    if (leveled && prev.type === props.type) setFx({ prev });
    lastRef.current = props;
  });

  useEffect(() => {
    if (!fx) return;
    anim.setValue(0);
    const a = Animated.timing(anim, {
      toValue: 1,
      duration: 620,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    });
    a.start(({ finished }) => {
      if (finished) setFx(null);
    });
    return () => a.stop();
  }, [fx, anim]);

  if (!fx) return <PaperBuildingArt {...props} />;

  const w = props.size;
  const h = props.artH ?? props.size;
  const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.045, 1] });
  const glowOpacity = anim.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.55, 0] });
  const oldOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  return (
    <Animated.View style={{ width: w, height: h, transform: [{ scale }] }}>
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", left: 0, top: 0, width: w, height: h, borderRadius: 18, backgroundColor: "#FDE68A", opacity: glowOpacity }}
      />
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, opacity: oldOpacity }}>
        <PaperBuildingArt {...fx.prev} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={{ opacity: anim }}>
        <PaperBuildingArt {...props} />
      </Animated.View>
    </Animated.View>
  );
});

/**
 * Construction site cover (Jonathan's design, 2026-10-21): while a
 * building is being built or upgraded, the map shows THIS instead of the
 * building — a striped tarp draped over the footprint inside a wooden
 * scaffold, a crane hook swaying gently overhead (sine, native driver),
 * and a bobbing warning sign. Drawn with plain Views in the storybook
 * palette — no emojis, no per-frame JS work.
 */
const ConstructionSiteArt = React.memo(function ConstructionSiteArt({ width, height }: { width: number; height: number }) {
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sway]);
  const hookDx = sway.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.035, width * 0.035] });
  const signDy = sway.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });
  const w = width;
  const h = height;
  const poleW = Math.max(4, w * 0.045);
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      {/* Paper Town: the whole site is one paper canvas — a striped
          paper tarp over the footprint, a paper-plank scaffold, the
          crane jib; the hook and the sign stay live Animated overlays
          (sine sway/bob only), now carrying little paper glyphs. */}
      <PaperCanvas cols={100} rows={Math.max(24, Math.round((100 * h) / Math.max(w, 1)))} unit={w / 100} draw={(p) => {
          const rows = Math.max(24, Math.round((100 * h) / Math.max(w, 1)));
          const ground = rows - 1.5;
          p.ellipse(50, ground + 0.6, 47, 1.7, "#000000", { shadow: false, opacity: 0.16 });
          // striped paper tarp draped over the footprint
          const tarpW = 84;
          const tarpH = rows * 0.58;
          const tarpX = 8;
          const tarpY = ground - tarpH;
          for (let i = 0; i < 6; i++) {
            p.rect(tarpX, tarpY + (tarpH / 6) * i, tarpW, tarpH / 6 - 0.5, i % 2 ? "#FEF3C7" : "#F59E0B", { shadow: false, r: 0.9 });
          }
          p.line(50, tarpY + 0.5, 50, ground - 0.5, "#92400E", 0.55);
          p.rect(tarpX, ground - tarpH * 0.07, tarpW, tarpH * 0.07, "#D97706", { shadow: false, r: 0.7, opacity: 0.55 });
          // scaffold frame: two paper-plank poles, top + mid bars, brace
          const plank = 4.6;
          p.rect(2, ground - rows * 0.84, plank, rows * 0.84, "#92400E", { r: 0.8 });
          p.rect(100 - 2 - plank, ground - rows * 0.84, plank, rows * 0.84, "#92400E", { r: 0.8 });
          p.rect(0.5, ground - rows * 0.87, 99, plank * 0.9, "#92400E", { r: 0.8 });
          p.rect(0.5, ground - rows * 0.56, 99, plank * 0.62, "#B45309", { shadow: false, r: 0.7, opacity: 0.9 });
          p.rect(28, ground - rows * 0.68, 52, plank * 0.55, "#B45309", { shadow: false, r: 0.6, opacity: 0.75, rot: { deg: 24, cx: 54, cy: ground - rows * 0.68 } });
          // crane jib reaching in from the top-right
          p.rect(58, ground - rows * 0.985, 42, plank, "#78350F", { r: 0.8 });
          // a paper crate waiting on the ground
          p.rect(79, ground - rows * 0.1, 12, rows * 0.1, "#B45309", { r: 0.7 });
          p.line(79, ground - rows * 0.05, 91, ground - rows * 0.05, "#92400E", 0.5);
        }} />
      <Animated.View style={{ position: "absolute", top: h * 0.045, right: w * 0.1, alignItems: "center", transform: [{ translateX: hookDx }] }}>
        <View style={{ width: 2, height: h * 0.2, backgroundColor: "#57534E" }} />
        <View style={{ width: Math.max(8, w * 0.09), height: Math.max(6, h * 0.055), backgroundColor: "#78716C", borderRadius: 2 }} />
        <View style={{ width: Math.max(13, w * 0.15), height: Math.max(10, h * 0.09), backgroundColor: "#B45309", borderRadius: 2, borderWidth: 1.5, borderColor: "#92400E" }} />
      </Animated.View>
      {/* bobbing warning sign at the foot of the scaffold */}
      <Animated.View style={{ position: "absolute", bottom: h * 0.05, left: w * 0.1, transform: [{ translateY: signDy }] }}>
        <View style={{ width: Math.max(16, w * 0.17), height: Math.max(12, h * 0.11), backgroundColor: "#FBBF24", borderRadius: 3, borderWidth: 2, borderColor: "#92400E", alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: "62%", height: 2.5, backgroundColor: "#78350F", borderRadius: 1, marginBottom: 2 }} />
          <View style={{ width: "42%", height: 2.5, backgroundColor: "#78350F", borderRadius: 1 }} />
        </View>
      </Animated.View>
    </View>
  );
});

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
/** Header pill offers Collect All only once more than this many coins wait. */
const COLLECT_ALL_MIN = 100;

type CoinBurstData = {
  id: string;
  sx: number;
  sy: number;
  dx: number;
  dy: number;
  kind: "coins" | "xp";
  /** Flyers in this burst's fan. The overlay grants fewer than the
   *  classic 4 when the global flyer budget (lib grantFlyers) runs low. */
  count?: number;
};

/**
 * One little coin (or XP bolt) flying from a building up to the balance.
 * PURE decoration: it starts on mount, reports to nobody, and the parent
 * removes the burst on a plain timer. Coins are awarded synchronously in
 * the collect handlers — a flying coin is never waited on.
 */
function CoinFlyer({ sx, sy, dx, dy, delay, kind }: { sx: number; sy: number; dx: number; dy: number; delay: number; kind: "coins" | "xp" }) {
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
    anim.start();
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

/** A small fan of coins flying together from one collect point. Stateless:
 *  removal is the overlay's job (a plain safety timer in CoinFlyOverlay). */
function CoinBurst({ burst }: { burst: CoinBurstData }) {
  const COUNT = burst.count ?? 4;
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
        />
      ))}
    </React.Fragment>
  );
}

export interface CoinFlyOverlayHandle {
  spawn: (sx: number, sy: number, dx: number, dy: number, kind: "coins" | "xp") => void;
}

/**
 * The coin-fly layer, isolated from the town tree (v164). The bursts used
 * to be state of the giant screen component itself, so every spawn and
 * every timer-retire re-rendered the whole town — a Collect All over 8
 * buildings meant ~8 spawn renders + 8 retire renders of one of the
 * heaviest trees in the app, which is what made the flight crawl. Now
 * the burst state lives HERE, behind React.memo with an imperative
 * spawn handle: the screen calls spawn() and nothing above this layer
 * re-renders. A global budget (lib grantFlyers, MAX_LIVE_FLYERS = 12)
 * caps simultaneous sprites; bursts past the budget are skipped
 * invisibly — the payout never waits on a coin. Removal stays a plain
 * timer, as before.
 */
const CoinFlyOverlay = React.memo(
  React.forwardRef<CoinFlyOverlayHandle, object>(function CoinFlyOverlay(_props, ref) {
    const [overlayBursts, setOverlayBursts] = useState<CoinBurstData[]>([]);
    const liveFlyersRef = useRef(0);
    const overlayBurstIdRef = useRef(0);
    const overlayTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => () => {
      overlayTimersRef.current.forEach(clearTimeout);
      overlayTimersRef.current = [];
    }, []);

    const spawn = useCallback((sx: number, sy: number, dx: number, dy: number, kind: "coins" | "xp") => {
      if (!Number.isFinite(sx) || !Number.isFinite(sy)) return;
      const count = grantFlyers(liveFlyersRef.current, 4);
      if (count <= 0) return; // budget spent — skip the sparkle, the collect already landed
      liveFlyersRef.current += count;
      const id = `burst-${overlayBurstIdRef.current++}`;
      setOverlayBursts((prev) => [...prev, { id, sx, sy, dx, dy, kind, count }]);
      // Bursts are retired on a plain timer — the flyers report to
      // nobody, so an interrupted flight can never strand a burst.
      overlayTimersRef.current.push(setTimeout(() => {
        liveFlyersRef.current -= count;
        setOverlayBursts((prev) => prev.filter((b) => b.id !== id));
      }, COIN_FLY_MS + 4 * 80 + 400));
    }, []);

    useImperativeHandle(ref, () => ({ spawn }), [spawn]);

    return (
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 999, elevation: 999 }}>
        {overlayBursts.map((b) => (
          <CoinBurst key={b.id} burst={b} />
        ))}
      </View>
    );
  })
);

/**
 * Floating "+X.XX" receipt that drifts up from the header pill and fades.
 * The real balance already updated before this mounts — it is just the
 * receipt. Plays once on mount; the parent unmounts it on a timer.
 */
function CollectDeltaBubble({ label }: { label: string }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(t, { toValue: 1, duration: 1400, easing: Easing.out(Easing.sin), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [t]);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, -26] });
  const opacity = t.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", top: -20, right: 6, transform: [{ translateY }], opacity, zIndex: 50 }}
    >
      <Text style={{ fontSize: 13, fontWeight: "800", color: "#16A34A", textShadowColor: "rgba(255,255,255,0.9)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
        {label}
      </Text>
    </Animated.View>
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

  // Safety net for the shrink: a successful collect zeroes the building
  // and this pill unmounts a frame later, but if a collect ever no-ops,
  // restore the pill instead of leaving it shrunk/faded and untappable.
  useEffect(() => {
    if (!collecting) return;
    const t = setTimeout(() => {
      setCollecting(false);
      collectAnim.setValue(0);
    }, 600);
    return () => clearTimeout(t);
  }, [collecting, collectAnim]);

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
      : `+${formatCoins(amount)}`
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
        const px = e.nativeEvent.pageX;
        const py = e.nativeEvent.pageY;
        setCollecting(true);
        // Decorative shrink — fire-and-forget, no completion callback.
        // The collect itself happens NOW, synchronously, on the next line:
        // it used to run inside this animation's completion callback, so
        // an interrupted animation swallowed the tap (and the award).
        Animated.timing(collectAnim, { toValue: 1, duration: 220, easing: Easing.inOut(Easing.sin), useNativeDriver: true }).start();
        onCollect(px, py);
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
          flexShrink: 0,
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
            flexShrink: 0,
            marginRight: 5,
          }}
        >
          <MaterialIcons name={isXP ? "bolt" : "monetization-on"} size={11} color="#FFFFFF" />
        </Animated.View>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 11,
            fontWeight: "600",
            letterSpacing: 0.3,
            flexShrink: 0,
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
  // School Campus perks cache: kept in step with the town state so the
  // synchronous grant sites (collections, garden) always read fresh perks.
  useEffect(() => {
    cacheSchoolPerks(perksForSchoolBuildings(town.maps.school.buildings));
  }, [town]);
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
  // Ambient life (chimney smoke, night window glow, city traffic, birds)
  // mounts a beat AFTER first paint. Those are dozens of looping animated
  // subtrees; keeping them off the first frame lets the map, buildings,
  // and badges land noticeably sooner. Nothing interactive waits on them.
  const [ambientReady, setAmbientReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAmbientReady(true), 400);
    return () => clearTimeout(t);
  }, []);
  const isNight = timeOfDay === "night";
  // The Welcoming Town, Stage 1 (v271): the day in four phases — dawn /
  // day / dusk / night — derived from the same timeOfDay state (settled
  // on open, re-evaluated on the existing 5-minute theme clock; no new
  // timers, no per-frame state).
  const dayPhase = phaseForTimeOfDay(timeOfDay);
  const phaseWash = PHASE_WASH[dayPhase];
  // v285: at dusk every building throws a long shadow east — the scene
  // has one light, and it rakes +x like every drawn shadow in it. The
  // strips render in the buildings layer, under each building's art.
  const longShadow = activeMap === "town" && dayPhase === "dusk";
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
  // Work shifts — rapid-tap mini-game on shops. The game itself (countdown,
  // tap counter, timer) lives in components/work-shift-game.tsx so its
  // fast re-renders never touch this screen.
  const [workShiftBuilding, setWorkShiftBuilding] = useState<PlacedBuilding | null>(null);
  const [workShifts, setWorkShifts] = useState<Record<string, number>>({});
  // Lot purchase modal — replaces Alert (Android Alert caps at ~3 buttons, hiding restaurants)
  const [purchaseLot, setPurchaseLot] = useState<TownLot | null>(null);
  const [monumentCount, setMonumentCount] = useState(0);
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [prayedToday, setPrayedToday] = useState(0);
  const prayedTodayRef = useRef(0);
  prayedTodayRef.current = prayedToday;
  const [prayedPeople, setPrayedPeople] = useState<PrayedPerson[]>([]);
  const prayedIdsRef = useRef<string[]>([]);
  prayedIdsRef.current = prayedPeople.map((p) => String(p.id));
  const activeMapRef = useRef(activeMap);
  activeMapRef.current = activeMap;
  // Villager single-location: the one map each villager is on
  // (lib/villager-locations). Settled from timestamps on load/render —
  // workers are pinned to their shift's map, everyone else drifts
  // casually, and no villager is ever drawn on two maps at once.
  const [villagerLocations, setVillagerLocations] = useState<VillagerLocations>({});
  const villagerLocationsRef = useRef<VillagerLocations>({});
  villagerLocationsRef.current = villagerLocations;
  const [prayerVillagerInfo, setPrayerVillagerInfo] = useState<{ id: string; name: string } | null>(null);
  const [missionsVisible, setMissionsVisible] = useState(false);
  const [purchasedPlots, setPurchasedPlots] = useState<string[]>([]);
  /** Bell Tower: the local date the campus bell last rang (null = never). */
  const [bellRungDate, setBellRungDate] = useState<string | null>(null);
  /** The Welcoming Town (v271): the while-you-were-gone report card,
   *  built once at mount from the away accrual's own numbers. */
  const [awayReport, setAwayReport] = useState<AwayReport | null>(null);
  /** The Street & The Café (v279): the café's inputs, read from the
   *  app's own stores on open and refreshed on focus (the same settle-
   *  on-open pattern as the coin chip) — the full people record, the
   *  active fast, the settled week-lot count, and the day they were
   *  read for. All café dress derives from these; nothing here is
   *  written back except the week-lot settle inside the loader. */
  const [cafePeople, setCafePeople] = useState<Person[]>([]);
  const [cafeFast, setCafeFast] = useState<PersonalFast | null>(null);
  const [cafeWeekLots, setCafeWeekLots] = useState(0);
  // v291 (the Wide Street): the retirement migration's stored state —
  // its flag, and any swept coins still waiting for a diner to land
  // on (they wait at the café as its register pile; lib/wide-street).
  const [wideStreetState, setWideStreetState] = useState<WideStreetState>(() =>
    defaultWideStreetState()
  );
  const wideStreetStateRef = useRef(wideStreetState);
  wideStreetStateRef.current = wideStreetState;
  const [cafeDay, setCafeDay] = useState<string>(() => getTodayISOString());
  /** The Welcoming Town (v271): the entry greeting — set once per
   *  Hometown entry (this screen mounting); the villagers nearest the
   *  hero's arrival tile wave for a few seconds. Never re-armed while
   *  the screen lives, so map switches don't repeat it. */
  const greetRef = useRef<{ untilMs: number; tile: { x: number; y: number } } | null>(null);
  if (greetRef.current === null) {
    greetRef.current = { untilMs: Date.now() + 6000, tile: { x: 5, y: 5 } };
  }
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
  // Mini-games hosted on the town screen itself (the Community Garden and
  // Mercy's Shore have no interior screens): Garden Tending + Tide Pools.
  const [gardenPlaysLeft, setGardenPlaysLeft] = useState<number | null>(null);
  const [playingGarden, setPlayingGarden] = useState(false);
  const [tidePlaysLeft, setTidePlaysLeft] = useState<number | null>(null);
  const [playingTide, setPlayingTide] = useState(false);

  useEffect(() => {
    playsLeftToday("garden").then(setGardenPlaysLeft).catch(() => setGardenPlaysLeft(0));
    playsLeftToday("tide").then(setTidePlaysLeft).catch(() => setTidePlaysLeft(0));
  }, []);
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
  // Coin-fly FX — PURELY DECORATIVE. Collecting awards coins/XP
  // synchronously in the tap handler (buildings zeroed + persisted,
  // balance updated, XP granted) BEFORE any of this is touched. Bursts,
  // the balance pulse, and the pill's collected-face crossfade only
  // read state afterwards: no animation completion callback gates the
  // money, no phase flags gate the money, and an interrupted or
  // unmounted animation can break nothing.
  //
  // The header pill (v160 correction, Jonathan, 2026-10-21): the
  // coin-fly animation STAYS — on Collect All, coins burst from the
  // pending buildings, fly to the counter, and the balance pulses,
  // exactly as they did before v159. What stays REMOVED is the pill's
  // own janky stack: no 360° spin, no JS-driven face morph, no
  // count-up or rolling digits. The label change is a SIMPLE
  // two-state opacity crossfade (stacked faces, sine ease, ~240ms,
  // native driver): "Collect X" fades out as the collected amount
  // ("+X") fades in on a green face, holds briefly, then crossfades
  // back — and the pill settles to whatever its normal derived face
  // dictates (the new balance, since the pending total just zeroed).
  const { width: windowW, height: windowH } = useWindowDimensions();
  // Coin-fly bursts live in the isolated CoinFlyOverlay (v164) — this
  // screen only holds a handle to spawn them, never burst state, so a
  // flight can't re-render the town.
  const flyOverlayRef = useRef<CoinFlyOverlayHandle | null>(null);
  // Floating "+X.XX" receipt by the pill after a single-building collect.
  const [collectDelta, setCollectDelta] = useState<{ id: number; label: string } | null>(null);
  // Pill label crossfade: 0 = normal face, 1 = collected-amount face.
  // Opacity only, native driver — the two faces are stacked and fade
  // through each other; nothing scales, spins, or rolls.
  const collectFade = useRef(new Animated.Value(0)).current;
  // The collected-amount face shown briefly after a Collect All lands.
  const [collectedFace, setCollectedFace] = useState<{ id: number; label: string } | null>(null);
  const collectedIdRef = useRef(0);
  const collectedTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const balancePulseAnim = useRef(new Animated.Value(0)).current;
  const balanceRef = useRef<View>(null);
  const balancePosRef = useRef({ x: 0, y: 0 });
  const mapGridRef = useRef<View>(null);
  const deltaIdRef = useRef(0);
  // Timers that exist ONLY to tidy up decoration (clear the receipt,
  // settle the collected face). They never move money. (Burst retire
  // timers moved into CoinFlyOverlay with the burst state, v164.)
  const deltaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; }, []);
  useEffect(() => () => {
    mountedRef.current = false;
    if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
    collectedTimersRef.current.forEach(clearTimeout);
    collectedTimersRef.current = [];
  }, []);

  const measureBalance = useCallback(() => {
    const el = balanceRef.current as unknown as View | null;
    if (!el || typeof el.measure !== "function") return;
    try {
      el.measure((_x, _y, w, h, px, py) => {
        if (mountedRef.current && Number.isFinite(w) && w > 0 && Number.isFinite(px) && Number.isFinite(py)) {
          balancePosRef.current = { x: px + w / 2, y: py + h / 2 };
        }
      });
    } catch {
      // Measuring is best-effort — balanceTarget() has a fallback position.
    }
  }, []);
  useEffect(() => { measureBalance(); }, [measureBalance]);

  const balanceTarget = useCallback(() => {
    const p = balancePosRef.current;
    // If the balance hasn't been measured yet (or is scrolled off the top),
    // aim at the usual top-right header spot.
    if (p.x > 0 && p.y > 10) return p;
    return { x: Math.max(60, windowW - 90), y: insets.top + 44 };
  }, [windowW, insets.top]);

  /** Forward a burst to the isolated fly overlay, aimed at the balance.
   *  No state changes hands in this component — spawning a flight never
   *  re-renders the town (v164). */
  const spawnBurst = useCallback((sx: number, sy: number, kind: "coins" | "xp") => {
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return;
    const d = balanceTarget();
    flyOverlayRef.current?.spawn(sx, sy, d.x, d.y, kind);
  }, [balanceTarget]);

  const pulseBalance = useCallback(() => {
    if (!mountedRef.current) return;
    balancePulseAnim.setValue(0);
    Animated.timing(balancePulseAnim, { toValue: 1, duration: 550, easing: Easing.inOut(Easing.sin), useNativeDriver: true }).start();
  }, [balancePulseAnim]);

  /**
   * Decorative receipt for a single-building collect that has ALREADY
   * landed: a floating "+X" by the pill. A plain timer tidies it up;
   * nothing depends on it. (Collect All has its own receipt — the
   * pill's collected-amount crossfade below.)
   */
  const showCollectReceipt = useCallback((label: string) => {
    const id = ++deltaIdRef.current;
    setCollectDelta({ id, label });
    if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
    deltaTimerRef.current = setTimeout(() => {
      if (!mountedRef.current || deltaIdRef.current !== id) return;
      setCollectDelta(null);
    }, 1500);
  }, []);

  /**
   * The Collect All pill's label morph — fire-and-forget decoration
   * for a collect that has ALREADY landed: crossfade the pill from
   * its "Collect X" face to the collected amount, hold briefly, then
   * crossfade back so the pill settles to its normal derived face.
   * Two opacity timings (sine ease, native driver) and plain timers;
   * nothing rolls, spins, or counts, and nothing depends on it.
   */
  const showCollectedFace = useCallback((label: string) => {
    const id = ++collectedIdRef.current;
    setCollectedFace({ id, label });
    collectFade.setValue(0);
    Animated.timing(collectFade, { toValue: 1, duration: 240, easing: Easing.inOut(Easing.sin), useNativeDriver: true }).start();
    collectedTimersRef.current.forEach(clearTimeout);
    collectedTimersRef.current = [
      setTimeout(() => {
        if (!mountedRef.current || collectedIdRef.current !== id) return;
        Animated.timing(collectFade, { toValue: 0, duration: 240, easing: Easing.inOut(Easing.sin), useNativeDriver: true }).start();
      }, 1250),
      setTimeout(() => {
        if (!mountedRef.current || collectedIdRef.current !== id) return;
        setCollectedFace(null);
      }, 1550),
    ];
  }, [collectFade]);

  /** Measure the map grid's on-screen origin, then run cb with it. */
  const withGridOrigin = useCallback((cb: (gx: number, gy: number) => void) => {
    const el = mapGridRef.current;
    if (!el || typeof el.measure !== "function") { cb(0, 0); return; }
    try {
      el.measure((_x, _y, w, _h, px, py) => {
        if (!mountedRef.current) return;
        if (w > 0 && Number.isFinite(px) && Number.isFinite(py)) cb(px, py); else cb(0, 0);
      });
    } catch {
      cb(0, 0);
    }
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
  // Prestige ("Begin Again"): Crowns and devotion from fasts. The offer is
  // the tier of the longest fast started since the last prestige.
  const [prestigeLevel, setPrestigeLevel] = useState(0);
  const [prestigeDevotion, setPrestigeDevotion] = useState(0);
  /** The mine's Depth Blessing (v175): levels opened beneath the
   *  mountain — every one blesses all town income by a quarter
   *  percent (lib/mountain), folded into the accrual chain at mount. */
  const [mineDepthLevels, setMineDepthLevels] = useState(0);
  /** The day's game set (v200): today's progress toward all twelve
   *  games — a completed set blesses town income by +10% for the
   *  day (lib/mini-games), loaded beside the mine state at mount and
   *  refreshed when the map's own two games complete. */
  const [setToday, setSetToday] = useState<TodaySetStatus>({ progress: 0, total: 12, complete: false });
  const [prestigeOfferState, setPrestigeOfferState] = useState<PrestigeOffer | null>(null);
  const fastsRef = useRef<PersonalFast[]>([]);
  /** Last-loaded full prestige state — feeds the Boss Gate visibility
   *  predicate (lib/prestige bossGateVisibility) at render time. */
  const prestigeStateRef = useRef<PrestigeState>(emptyPrestigeState());
  const [beginAgainOpen, setBeginAgainOpen] = useState(false);
  // Boss badges (permanent) + the Boss Gate state for the current offer.
  const [ownedBadges, setOwnedBadges] = useState<BadgeId[]>([]);
  const [bossClearedFastId, setBossClearedFastId] = useState<string | null>(null);
  const [throneVictories, setThroneVictories] = useState(0);
  const badgesRef = useRef<BadgeId[]>([]);
  badgesRef.current = ownedBadges;
  const [forestStats, setForestStats] = useState<CombatStats>({ attack: 5, defense: 0, maxHp: 100, critChance: BASE_CRIT_CHANCE });
  /** Gym Training Reps bonus active for this forest visit, and its size
   *  in percent (+10 base; +20 while the campus Gymnasium stands). */
  const [forestTraining, setForestTraining] = useState(false);
  const [forestTrainingPct, setForestTrainingPct] = useState(10);
  const [forestTunic, setForestTunic] = useState("#D6C9A8");
  const [forestArmor, setForestArmor] = useState<string | null>(null);
  const [forestWeapon, setForestWeapon] = useState<string | null>(null);
  // The pawn itself — the Dark Forest hero wears this appearance.
  const [forestPawn, setForestPawn] = useState<CustomPawn | null>(null);
  // Villager missions: lights with a "?" ask Jonathan for help (2-5/day).
  const [vmState, setVmState] = useState<VillagerMissionState | null>(null);
  const vmStateRef = useRef<VillagerMissionState | null>(null);
  const [villagerMissionModal, setVillagerMissionModal] = useState<VillagerMission | null>(null);
  // Villager work assignments — Jonathan sends lights on timed shifts.
  const [workState, setWorkState] = useState<VillagerWorkState | null>(null);
  const workStateRef = useRef<VillagerWorkState | null>(null);
  /** Last live-tick timestamp — paces the daily stock drain. */
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
  // on the active map. It sits in "Collect" mode while more than
  // COLLECT_ALL_MIN coins are pending, otherwise it rests showing the
  // balance.
  const collectibleTotal = map.buildings.reduce((s, b) => s + (b.accumulated || 0), 0);
  // Coins only — XP buildings accumulate XP, not coins, so they don't count
  // toward the Collect All threshold.
  const collectibleCoins = map.buildings.reduce(
    (s, b) => s + (xpIncomeFor(b.type, b.level || 1) > 0 ? 0 : b.accumulated || 0),
    0
  );
  const pillCollectMode = collectibleCoins > COLLECT_ALL_MIN;
  // Compact number formatting so a huge total can never shove the pill
  // off the screen (the pill also has a maxWidth cap in the header).
  // Coin amounts render WHOLE everywhere (Jonathan, 2026-10-21) — the
  // pill included: full numbers with separators, no K shorthand, no cents.
  const headerCoinText = (n: number) => formatCoins(n);
  // The pill's resting face is DERIVED from state: pillCollectMode
  // picks Collect vs balance. The only animation layered on top is
  // the collected-amount crossfade after a Collect All (collectFade,
  // opacity only) and the native balance pulse on the outer view.

  // The Street & The Café (v279): the board, the ovens, and the
  // per-person flourishing record — all derived from the café inputs
  // settled on open/focus. The board is the People page's own pray-
  // today derivation wearing tickets; the ovens read the active
  // fast's real day states.
  const cafeBoard = useMemo(
    () => (cafePeople.length > 0 ? buildCafeBoard(cafePeople, cafeDay) : null),
    [cafePeople, cafeDay],
  );
  const cafeOven = useMemo(() => ovenStateFor(cafeFast, cafeDay), [cafeFast, cafeDay]);
  const cafePersonById = useMemo(
    () => new Map(cafePeople.map((p) => [String(p.id), p])),
    [cafePeople],
  );
  /** The faithful-week stars: people whose record proves prayer on
   *  4+ of the last 7 days (the v279 forward log earns this over
   *  time; it is never claimed from thinner air). */
  const faithfulIds = useMemo(
    () => new Set(cafePeople.filter((p) => hasFaithfulWeek(p, cafeDay)).map((p) => String(p.id))),
    [cafePeople, cafeDay],
  );

  // Prayer lights: everyone prayed for today appears as a golden light.
  // Gone by midnight — each day brings a new set.
  const lightInfos = useMemo<LightInfo[]>(() => {
    return prayedPeople.map((p) => ({
      personId: String(p.id),
      name: p.name,
      accentColor: p.accentColor,
      star: faithfulIds.has(String(p.id)) || undefined,
    }));
  }, [prayedPeople, faithfulIds]);

  // Lights actually out walking (field-mission lights are away). Memoized
  // + a stable tap handler so the memoized TownNPCs can skip re-renders
  // when the screen re-renders for unrelated reasons.
  const visibleLights = useMemo(
    () => lightInfos.filter((l) => !fieldMissions.some((m) => !m.collected && m.personId === l.personId)),
    [lightInfos, fieldMissions]
  );
  const handleVillagerTap = useCallback((p: { id: string; name: string }) => {
    const pid = String(p.id);
    const vm = (vmState?.missions ?? []).find((x) => x.personId === pid && x.status !== "done");
    if (vm) setVillagerMissionModal(vm);
    else setPrayerVillagerInfo(p);
  }, [vmState]);

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
    // Villager requests are a town-life system (their targets are town
    // buildings, the community garden, the well): only villagers actually
    // in town can ask. A villager located elsewhere isn't there to raise a
    // hand — before locations load, everyone counts as being in town.
    return lightInfosRef.current.filter(
      (l) =>
        !away.has(l.personId) &&
        villagerMapOf(villagerLocationsRef.current, l.personId) === "town"
    );
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
      church: buildings.some((b) => b.type === "church" && !isUnderConstruction(b, nowMs)),
      barbershop: buildings.some((b) => b.type === "barbershop" && !isUnderConstruction(b, nowMs)),
      restaurant: buildings.some((b) => isRestaurantType(b.type) && !isUnderConstruction(b, nowMs)),
      garden: unlocked.includes("mall"),
      bank: buildings.some((b) => (b.type === "bank" || b.type === "bank-tower") && !isUnderConstruction(b, nowMs)),
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

  // Villager single-location settle: re-derive where everyone is whenever
  // the inputs change (prayer list, work ledger, field missions, a live
  // schedule scene, unlocked maps). Timestamp-based, no timers — the same
  // settle-on-load pattern as construction. While a schedule event with
  // villagers is live, its cast is summoned to the event (town) for the
  // event's span, so no other map draws them meanwhile.
  useEffect(() => {
    if (lightInfos.length === 0) return;
    let cancelled = false;
    (async () => {
      const settled = await settleAndSaveVillagerLocations({
        people: lightInfos,
        assignments: workStateRef.current?.assignments ?? [],
        fieldMissions: fieldMissionsRef.current,
        scenePersonIds: scheduleActivity?.withVillagers
          ? lightInfos.map((l) => l.personId)
          : null,
        sceneEndsAtMs: scheduleActivity?.withVillagers
          ? scheduleActivity.endsAtMs
          : undefined,
        unlockedMaps,
        nowMs: Date.now(),
        isNight: getTimeOfDay() === "night",
      }).catch(() => null);
      if (!cancelled && settled) {
        villagerLocationsRef.current = settled.locations;
        setVillagerLocations(settled.locations);
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [lightInfos, workState, fieldMissions, scheduleActivity, unlockedMaps]);

  /** Where a work shift happens on the town map (null = not available). */
  const findWorkTarget = useCallback(
    (kind: WorkKind): { tile: { x: number; y: number }; buildingId: string; type: string } | null => {
      const townState = townRef.current;
      // Closed-for-construction buildings host no shifts.
      const buildings = (townState?.maps.town?.buildings ?? []).filter((b) => !isUnderConstruction(b));
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
        case "restock": {
          // The restock route starts at the church — boxes come from there.
          // (Town map only: the church route doesn't reach the city, so
          // city shelves drain without a way to refill them yet.)
          const church = buildings.find((b) => b.type === "church");
          return church ? centerOf(church) : null;
        }
      }
    },
    []
  );

  /** Guide destination for a specific building id on the town map. */
  const guideForBuildingId = useCallback(
    (buildingId: string): { tile: { x: number; y: number }; buildingId: string; type: string } | null => {
      const buildings = townRef.current?.maps.town?.buildings ?? [];
      const b = buildings.find((x) => x.id === buildingId);
      if (!b) return null;
      const fp = buildingFootprint(b.level || 1, b.type as BuildingType);
      return {
        tile: { x: b.x + fp.w / 2 - 0.5, y: b.y + fp.h / 2 - 0.5 },
        buildingId: b.id,
        type: b.type,
      };
    },
    []
  );

  /**
   * The current guide for a restock worker: the route is dynamic — church
   * to pick up a box, then out to the neediest stocked building, then back
   * to the church. The leg lives on the assignment (advanceRestockArrival
   * flips it on each arrival); this just resolves the leg to a destination.
   */
  const restockGuideFor = useCallback(
    (a: VillagerWorkAssignment): { tile: { x: number; y: number }; buildingId: string; type: string } | null => {
      if ((a.restockLeg ?? "to-church") === "to-deliver" && a.restockTargetId) {
        const target = guideForBuildingId(a.restockTargetId);
        if (target) return target;
        // Target sold/demolished mid-route — fall through to the church.
      }
      return findWorkTarget("restock");
    },
    [findWorkTarget, guideForBuildingId]
  );

  /**
   * personId -> forced destination for a light on a work shift. Covers
   * BOTH "en-route" and "working": a clocked-in light must be steered
   * back to the site whenever they aren't on it — villagers respawn at
   * home on every app open and get sent home at nightfall, so guiding
   * only "en-route" lights left "working" shifts standing empty at the
   * farm while the worker wandered town with a badge.
   */
  const workGuides = useMemo(() => {
    const out: Record<string, { tile: { x: number; y: number }; buildingId: string; type: string }> = {};
    if (!workState) return out;
    for (const a of workState.assignments) {
      if (a.status === "done") continue;
      const target = a.kind === "restock" ? restockGuideFor(a) : findWorkTarget(a.kind);
      if (target) out[a.personId] = target;
    }
    return out;
  }, [workState, findWorkTarget, restockGuideFor]);

  /** personId -> shift info while a light is on the job (drives the badge). */
  const workMap = useMemo(() => {
    const out: Record<string, { untilMs: number; kind: string; carrying?: boolean }> = {};
    if (!workState) return out;
    for (const a of workState.assignments) {
      if (a.status === "done") continue;
      out[a.personId] = {
        untilMs: a.endsAt,
        kind: a.kind,
        // Restock workers carry a box on the church -> shop leg only.
        carrying: a.kind === "restock" && (a.restockLeg ?? "to-church") === "to-deliver",
      };
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
  const handleWorkArrival = useCallback(async (personId: string, buildingId?: string) => {
    const st = workStateRef.current;
    if (!st) return;
    const assignment = st.assignments.find(
      (a) => a.personId === personId && a.status !== "done"
    );
    if (assignment?.kind === "restock") {
      // Restock route arrivals advance the delivery loop (see
      // advanceRestockArrival): church pickup -> shop delivery -> church...
      const buildings = townRef.current?.maps.town?.buildings ?? [];
      const church = buildings.find((b) => b.type === "church");
      if (!church) return;
      // Target demolished mid-route: abandon the leg and treat this as a
      // fresh church arrival, so the worker never waits on a ghost.
      if (
        (assignment.restockLeg ?? "to-church") === "to-deliver" &&
        assignment.restockTargetId &&
        !buildings.some((b) => b.id === assignment.restockTargetId)
      ) {
        const reset: VillagerWorkState = {
          assignments: st.assignments.map((a) =>
            a.id === assignment.id
              ? { ...a, restockLeg: "to-church" as const, restockTargetId: undefined }
              : a
          ),
        };
        workStateRef.current = reset;
        setWorkState(reset);
        await saveVillagerWorkState(reset);
        return;
      }
      const leg = assignment.restockLeg ?? "to-church";
      // Which building did they just reach? TownNPCs reports it; fall back
      // to the leg's expected destination.
      const arrivedId =
        buildingId ??
        (leg === "to-deliver" ? assignment.restockTargetId : church.id);
      // A box is picked up for the neediest shelf in town right now —
      // judged by live (anchor-drained) levels, not last-persisted ones.
      let nextTargetId: string | null = null;
      if (leg === "to-church" && arrivedId === church.id) {
        const townNow = townRef.current;
        const liveStock: Record<string, number> = {};
        for (const sb of buildings) {
          if (!isStockedBuildingType(sb.type)) continue;
          liveStock[sb.id] = currentStockForBuilding(
            townNow?.stockByBuilding,
            townNow?.stockAnchorsByBuilding,
            sb.id,
            sb.level || 1,
            Date.now()
          );
        }
        const target = neediestStockedBuilding(
          buildings,
          liveStock,
          { x: church.x, y: church.y }
        );
        nextTargetId = target?.id ?? null;
      }
      const { state: next, event } = advanceRestockArrival(st, {
        personId,
        arrivedBuildingId: arrivedId,
        churchBuildingId: church.id,
        nextTargetId,
      });
      if (event === "delivered" && assignment.restockTargetId) {
        // The box lands: that building's stock grows by one box (20% of
        // cap) from its live level, and the drain re-anchors at the new
        // level — it still empties at tonight's midnight. Reaching 100%
        // flips the building's stocked switch on for the day.
        const targetId = assignment.restockTargetId;
        setTown((prev) => {
          const b = prev.maps.town.buildings.find((x) => x.id === targetId);
          if (!b) return prev;
          // The target closed for construction mid-route: the box waits —
          // no stock lands in a building that isn't open.
          if (isUnderConstruction(b)) return prev;
          const level = b.level || 1;
          const cap = stockCapForLevel(level);
          const nowMs = Date.now();
          const record = { ...(prev.stockByBuilding ?? {}) };
          const anchors = { ...(prev.stockAnchorsByBuilding ?? {}) };
          const stockedDates = { ...(prev.stockedDateByBuilding ?? {}) };
          const newStock = applyRestockBox(
            currentStockForBuilding(record, anchors, targetId, level, nowMs),
            cap
          );
          record[targetId] = newStock;
          anchors[targetId] = { stock: newStock, atMs: nowMs };
          if (newStock >= cap) stockedDates[targetId] = localDateStr(new Date(nowMs));
          const nextTown = {
            ...prev,
            stockByBuilding: record,
            stockAnchorsByBuilding: anchors,
            stockedDateByBuilding: stockedDates,
          };
          saveTown(nextTown);
          return nextTown;
        });
      }
      if (next !== st) {
        workStateRef.current = next;
        setWorkState(next);
        await saveVillagerWorkState(next);
      }
      return;
    }
    // TownNPCs re-fires this while a worker sits at their site; only the
    // en-route -> working transition is real work (state + save).
    if (!st.assignments.some((a) => a.personId === personId && a.status === "en-route")) return;
    const next = markWorkArrived(st, personId);
    workStateRef.current = next;
    setWorkState(next);
    await saveVillagerWorkState(next);
    // saveTown is declared later in the component; it's a stable useCallback
    // and this handler only runs after render, so the closure is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Advance work timers; celebrate newly finished shifts. Idempotent. */
  const runWorkTick = useCallback(async () => {
    // Storage is the shared ledger: the Main Office roster writes the same
    // assignments from inside the office, so re-read before ticking to
    // fold its changes in (every mutation here saves immediately, so a
    // fresh read never loses map-side work).
    const stored = await loadVillagerWorkState().catch(() => null);
    const st = stored ?? workStateRef.current;
    if (!st) return;
    if (stored && stored !== workStateRef.current) {
      workStateRef.current = stored;
      setWorkState(stored);
    }
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
      // Fresh read: the Main Office roster may have assigned this light a
      // shift a moment ago — the guards below must see it.
      const st = (await loadVillagerWorkState().catch(() => null)) ?? workStateRef.current;
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
      // sendWorkAssignment (v173): appends the shift AND remembers it
      // as the villager's last job for the office resend — and spreads
      // the loaded state, so a lastJobs memory recorded at the office
      // desk is never dropped by a send from the map.
      const next: VillagerWorkState = sendWorkAssignment(st, assignment);
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
      const target = resolveScheduleTarget(town.maps[activeMap].buildings, activity.kind, activity.title);
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

  // Single-location render list: this map draws ONLY the villagers whose
  // one location is this map (TownNPCs' wandering, visits, chats and
  // cottages then all happen per-map automatically). Exception: this
  // hour's Garden visitors are drawn by the Garden scene itself, so no
  // other map draws them meanwhile (their stored location is untouched —
  // the Garden visit is an hourly rotation inside the town visit system).
  const lightsForActiveMap = useMemo(() => {
    const onMap = lightsForMap(visibleLights, villagerLocations, activeMap);
    if (activeMap === "mall") return onMap;
    const visiting = new Set(gardenVisitors.map((v) => v.personId));
    if (visiting.size === 0) return onMap;
    return onMap.filter((l) => !visiting.has(l.personId));
  }, [visibleLights, villagerLocations, activeMap, gardenVisitors]);

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
      setCoins(await loadCoinsRecord());
    } catch {}
  }, []);

  // This screen stays mounted underneath every interior (the Main
  // Office included), and interiors transact against the same record.
  // Re-read the balance whenever the map comes back into focus, so the
  // chip can never show a stale copy after another screen earned or
  // spent — the display half of the v167 vanishing-coins fix.
  /** The Street & The Café (v279): re-read the café's inputs — prayers
   *  prayed and fast days marked since this screen opened must be on
   *  the board when he comes back to the map. Same focus-refresh
   *  pattern as the coin chip above; the loader settles the week-lot
   *  milestone as it reads. */
  const refreshCafeStreet = useCallback(async () => {
    try {
      const data = await loadCafeStreetData();
      setCafePeople(data.people);
      setCafeFast(data.fast);
      setCafeWeekLots(data.weekLots);
      setCafeDay(data.today);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshCoins();
      void refreshCafeStreet();
    }, [refreshCoins, refreshCafeStreet])
  );

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

  // (v167: the old whole-record save-coins writer is gone — it let this
  // screen's mount-time snapshot overwrite fresher balances. Every coin
  // change now goes through applyCoinsDelta; see lib/hometown.ts.)

  // Ref mirror of coins for fresh reads inside event handlers (avoids stale closures).
  const coinsRef = useRef(coins);
  useEffect(() => {
    coinsRef.current = coins;
  }, [coins]);

  // Transactional coin delta (v167): applied to the FRESHEST stored
  // record via the canonical ledger (lib applyCoinsDelta), never to this
  // screen's in-memory copy. This screen stays mounted underneath every
  // interior, so its copy can be hours stale — the old functional-setState
  // version wrote that stale copy back as the whole record and erased
  // whatever the interiors had earned (the vanishing office collect).
  const addCoins = useCallback((rawDelta: number) => {
    // The Bloodmoon Badge (boss 5) blesses every positive hometown coin
    // grant with +10%. This is the one ledger every grant flows through.
    const delta = rawDelta > 0 && badgesRef.current.includes("bloodmoon")
      ? rawDelta * BLOODMOON_COIN_MULT
      : rawDelta;
    if (delta > 0) {
      // The border lighthouse glows brighter whenever Jonathan earns.
      setRewardPulse((p) => p + 1);
    }
    void applyCoinsDelta(delta, "dime").then((next) => setCoins(next));
  }, []);

  const switchMap = useCallback((id: TownMapId) => {
    setActiveMap(id);
    setSelectedTile(null);
    setMovingBuilding(null);
  }, []);

  /** Collect a finished work shift's reward by hand. */
  const collectWorkReward = useCallback(
    async (assignment: VillagerWorkAssignment) => {
      // Fresh read: the shift may already have been collected at the Main
      // Office — collectWorkAssignment then finds nothing to pay, exactly
      // as a double-tap on the map behaves.
      const st = (await loadVillagerWorkState().catch(() => null)) ?? workStateRef.current;
      if (!st) return;
      const { state, assignment: done } = collectWorkAssignment(st, assignment.id);
      if (!done) return;
      const def = WORK_KINDS[done.kind];
      workStateRef.current = state;
      setWorkState(state);
      await saveVillagerWorkState(state);
      // Restock shifts also pay the per-box bonus banked along the route.
      addCoins(scaledCoins(def.rewardCoins + (done.bonusCoins ?? 0)));
      // Rider I: job-collect XP pays by duration band with a daily taper
      // (lib/job-collect-xp) — coins above are unchanged.
      const collectLedger = await loadJobCollectLedger();
      awardCustomXP(scaledXP(jobCollectXP(done.kind, collectLedger.count)), `villager-work:${done.id}`).catch(() => undefined);
      void saveJobCollectLedger(recordCollect(collectLedger));
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
    // The City does not exist before the first Crown — no exceptions.
    if (id === "city" && !cityExists(prestigeLevel)) {
      Alert.alert("The City", "The city appears after your first Crown. Begin again after a fast of 365 days or more to earn one.");
      return;
    }
    const info = MAP_INFO[id];
    const price = mapUnlockCost(id);
    if (info.comingSoon) {
      Alert.alert(info.name, "This map is coming soon!");
      return;
    }
    if (coinsRef.current.balance < price) {
      Alert.alert("Not enough coins", `Unlocking ${info.name} costs ${formatCoins(price)} coins. You have ${formatCoins(coinsRef.current.balance)}.`);
      return;
    }
    Alert.alert(`Unlock ${info.name}?`, `${info.description}\n\nCost: ${formatCoins(price)} coins.`, [
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
  }, [unlockedMaps, addCoins, switchMap, prestigeLevel]);

  /** "Begin Again" — prestige: reset the run, claim the fast's reward. */
  const handlePrestige = useCallback(async () => {
    try {
      const res = await performPrestige(fastsRef.current);
      if (!res) {
        setBeginAgainOpen(false);
        return;
      }
      setPrestigeLevel(res.crowns);
      setPrestigeDevotion(res.devotionBonus);
      setPrestigeOfferState(null);
      try { prestigeStateRef.current = await loadPrestigeState(); } catch {}
      // Badges stay (permanent); the Boss Gate re-shuts for the next offer.
      setBossClearedFastId(null);
      setTown(res.town);
      setCoins(res.coins);
      setPurchasedPlots([]);
      setUnlockedMaps(res.unlockedMaps);
      setActiveMap("town");
      setSelectedTile(null);
      perMinuteRateRef.current = {};
      // The gear reset too — the forest hero starts bare-handed again.
      setForestArmor(null);
      setForestWeapon(null);
      setForestTunic("#D6C9A8");
      setBeginAgainOpen(false);
      if (res.kind === "crown") {
        queueCelebration(
          "milestone",
          `Crown ${res.crowns}!`,
          `You began again — every coin the town earns is now x${totalPrestigeMultiplier(res.crowns, res.devotionBonus)}. The City awaits: 50,000 coins to unlock.`
        );
      } else {
        queueCelebration(
          "milestone",
          "You began again!",
          `Your ${res.durationDays}-day fast leaves a permanent devotion bonus of +${Math.round(res.devotionBonus * 100)}% on every coin your town earns.`
        );
      }
    } catch {}
  }, [queueCelebration]);

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
        // fastsRaw is parsed by three blocks below — parse it at most once.
        // A parse failure is cached and rethrown, so each block's own
        // try/catch behaves exactly as if it had parsed (and failed) itself.
        let fastsParsedCache: { ok: true; value: any } | { ok: false; error: unknown } | null = null;
        const parseFastsRaw = (): any => {
          if (fastsParsedCache) {
            if (!fastsParsedCache.ok) throw fastsParsedCache.error;
            return fastsParsedCache.value;
          }
          try {
            const value = fastsRaw ? JSON.parse(fastsRaw) : [];
            fastsParsedCache = { ok: true, value };
            return value;
          } catch (e) {
            fastsParsedCache = { ok: false, error: e };
            throw e;
          }
        };
        // One-time backfill: 1 coin per completed fast day before coins existed
        let effectiveCoinsRaw = coinsRaw;
        if (!backfillRaw) {
          try {
            const fasts = parseFastsRaw();
            let completedCount = 0;
            for (const f of fasts) {
              const statuses = f.dayStatuses || {};
              for (const d of Object.values(statuses)) {
                if (d === "completed") completedCount++;
              }
            }
            if (completedCount > 0) {
              const backfilled = await applyCoinsDelta(completedCount, "none");
              effectiveCoinsRaw = JSON.stringify(backfilled);
            }
          } catch {}
          await AsyncStorage.setItem("prayercircle.hometown.coin-backfill.v1", "1");
        }
        let c = parseCoins(effectiveCoinsRaw ? JSON.parse(effectiveCoinsRaw) : {});
        let t = parseTown(townRaw ? JSON.parse(townRaw) : {});
        // Fast-length gating, prestige, and the two one-time migration
        // flags are independent of each other — one parallel round
        // instead of five serial waits (v164). The block bodies are
        // unchanged; only the scheduling is. The migration flag VALUES
        // are consumed by the migration blocks right below, in their
        // original order.
        let pMult = 1;
        let depthMult = 1;
        const [, prestigeMultOut, mallRefundFlag, houseRefundFlag, depthMultOut, setOut] = await Promise.all([
          (async () => {
            // Fast-length gating + economy scaling: Hometown unlocks on
            // 40+ day fasts; the economy scales with the active fast's
            // length so the math feels fair (fewer earning days ->
            // smaller numbers, same pace).
            try {
              const fastLen = await loadActiveFastLength();
              if (fastLen > 0) {
                setEconomyScale(economyScaleForFastLength(fastLen));
                setHometownLocked(!hometownUnlockedForFastLength(fastLen));
              }
            } catch {}
          })(),
          (async () => {
            // Prestige: load the Crown level + devotion bonus, and the
            // current offer (the longest fast started since the last
            // prestige). The combined multiplier joins the accrual
            // chain below.
            try {
              const pLevel = await loadPrestigeLevel();
              setPrestigeLevel(pLevel);
              const pState = await loadPrestigeState();
              prestigeStateRef.current = pState;
              setPrestigeDevotion(pState.devotionBonus);
              // Boss badges: permanent perks. The Gilded Badge joins
              // the accrual chain here — this one pMult feeds BOTH the
              // live per-minute accrual and the missed-days daily
              // income below.
              setOwnedBadges(pState.badges);
              setBossClearedFastId(pState.bossClearedFastId);
              setThroneVictories(pState.throneVictories);
              setCachedBadges(pState.badges);
              const gildedMult = pState.badges.includes("gilded") ? GILDED_INCOME_MULT : 1;
              const mult = totalPrestigeMultiplier(pLevel, pState.devotionBonus) * gildedMult;
              const fastsArr = parseFastsRaw();
              if (Array.isArray(fastsArr)) {
                fastsRef.current = fastsArr as PersonalFast[];
                setPrestigeOfferState(prestigeOffer(fastsRef.current, pState));
              }
              return mult;
            } catch {}
            return 1;
          })(),
          AsyncStorage.getItem(REMEMBRANCE_MALL_REFUND_KEY).catch(() => null),
          AsyncStorage.getItem(HOUSE_REMOVAL_REFUND_KEY).catch(() => null),
          (async () => {
            // The mine's Depth Blessing (v175): the deeper Jonathan
            // has opened beneath the mountain, the more the whole
            // town earns. Reads lib/mountain's one record; the
            // multiplier joins the accrual chain below, and the
            // level count feeds the income breakdown sheet.
            try {
              const mine = await loadMineState();
              setMineDepthLevels(mine.deepestLevel);
              return depthBlessingMultiplierForLevels(mine.deepestLevel);
            } catch {}
            return 1;
          })(),
          (async () => {
            // The day's game set (v200): today's progress rides the
            // breakdown sheet, a completed set joins the accrual's
            // blessing slot below, and the completion history prices
            // each finished day's bonus in the missed-days award.
            try {
              const [status, dates] = await Promise.all([
                loadTodaySetStatus(),
                loadSetCompletedDates(),
              ]);
              setSetToday(status);
              return { status, dates };
            } catch {}
            return { status: { progress: 0, total: 12, complete: false } as TodaySetStatus, dates: new Set<string>() };
          })(),
        ]);
        pMult = prestigeMultOut;
        depthMult = depthMultOut;
        // The set bonus joins the Depth Blessing in the accrual's one
        // blessing slot, ADDED on the same base (1 + depth + set) so
        // the two blessings never compound (v200).
        const setMultToday = setOut.status.complete ? SET_BONUS_RATE : 0;
        // One-time Mall → Garden of Remembrance migration: refund retired mall
        // buildings at FULL price (base cost + upgrades paid), then clear the map.
        try {
          const refundDone = mallRefundFlag;
          const mallBuildings = t.maps.mall?.buildings || [];
          if (!refundDone && mallBuildings.length > 0) {
            const refund = mallBuildings.reduce((sum, b) => sum + remembranceRefundFor(b), 0);
            if (refund > 0) {
              c = await applyCoinsDelta(refund, "none");
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
          const houseRefundDone = houseRefundFlag;
          const townBuildings = t.maps.town?.buildings || [];
          const houses = townBuildings.filter((b) => b.type === "house");
          if (!houseRefundDone && houses.length > 0) {
            const refund = houses.reduce((sum, b) => sum + remembranceRefundFor(b), 0);
            if (refund > 0) {
              c = await applyCoinsDelta(refund, "cent");
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
        // One-time restitution: the v140 Bible Study Hall purchase bug took
        // 5,500 coins without placing the hall. The purchase fix heals saves
        // holding a building trace; this covers saves with no trace left —
        // no hall owned, established save, once ever (lib/restitution.ts).
        try {
          const restored = await maybeGrantRestitution(c, t);
          if (restored) {
            c = restored;
            Alert.alert("Good news", RESTITUTION_MESSAGE);
          }
        } catch {}
        // ── CRITICAL FAN-OUT (v164) ─────────────────────────────────
        // Everything the away-accrual math or the first paint reads,
        // loaded in ONE parallel round instead of the old serial parade
        // (~25 one-after-another awaits). Each loader keeps the exact
        // fallback the serial chain gave it: a failed load applies
        // nothing, exactly as its try/catch did. What is NOT here —
        // the Well, Dark Forest, River, gathering-place cooldowns, the
        // XP level ref, daily missions — paints no number the first
        // frame shows, so it hydrates after the commit in the DEFERRED
        // HYDRATION batch at the end of this effect.
        type Attempt<T> = { ok: true; value: T } | { ok: false };
        const attempt = async <T,>(fn: () => Promise<T>): Promise<Attempt<T>> => {
          try { return { ok: true, value: await fn() }; } catch { return { ok: false }; }
        };
        let remembranceState = emptyRemembrance();
        let fieldMissionsLoaded: FieldMission[] | null = null;
        let prayedCount = 0;
        let prayedIdSet = new Set<string>();
        let prayedList: { id: string | number; name: string }[] = [];
        let fellowshipState: FellowshipState | null = null;
        let gardenVisitState = emptyGardenVisits();
        let houseCoinMultPre = 0;
        // The Street & The Café (v279): the away report below tells the
        // café's day too, so the café inputs ride this same fan-out and
        // land in locals the report block can read.
        let cafePeopleLocal: Person[] = [];
        let cafeFastLocal: PersonalFast | null = null;
        const [
          remembranceR, fieldMissionsR, plotsR, bellR, frenzyR, tapsR, shiftsR,
          bankR, restR, statR, prayedR, houseR, fellowshipR, lighthouseR, gardenVisitsR,
          cafeR,
        ] = await Promise.all([
          attempt(() => loadRemembrance()),
          attempt(() => loadFieldMissions()),
          attempt(() => loadPurchasedPlots()),
          attempt(() => loadBellState()),
          attempt(() => AsyncStorage.getItem(FRENZY_STORAGE_KEY)),
          attempt(() => AsyncStorage.getItem(LIGHT_TAP_KEY)),
          attempt(() => AsyncStorage.getItem(WORK_SHIFT_KEY)),
          // Preload bank interior bonuses for bank/bank-tower buildings.
          // ATM & vault bonuses drip as collectible coins INSIDE the bank
          // (tapped in the interior), so they are not part of the auto
          // hourly add.
          attempt(async () => {
            const record: Record<string, Awaited<ReturnType<typeof bankInteriorBonus>>> = {};
            const bankIds: string[] = [];
            for (const id of TOWN_MAP_IDS) {
              for (const b of t.maps[id].buildings) {
                if (b.type === "bank" || b.type === "bank-tower") bankIds.push(b.id);
              }
            }
            const bonuses = await Promise.all(bankIds.map((bid) => bankInteriorBonus(bid)));
            bankIds.forEach((bid, i) => { record[bid] = bonuses[i]; });
            return record;
          }),
          // Preload restaurant interior furniture bonuses for enterable
          // restaurants across all maps. Furniture tiers add % income
          // multipliers.
          attempt(async () => {
            const record: Record<string, number> = {};
            const restIds: string[] = [];
            for (const id of TOWN_MAP_IDS) {
              for (const b of t.maps[id].buildings) {
                if (isEnterableRestaurant(b.type)) restIds.push(b.id);
              }
            }
            const restBonuses = await Promise.all(restIds.map((bid) => restaurantInteriorBonus(bid)));
            restIds.forEach((bid, i) => { record[bid] = restBonuses[i].mult; });
            return record;
          }),
          attempt(() => refreshStatBoostCache()),
          attempt(() => prayedTodayPeople()),
          attempt(() => refreshHouseBonusCache()),
          attempt(() => loadFellowship()),
          attempt(() => loadLighthouse()),
          attempt(() => loadGardenVisits()),
          // The Street & The Café (v279): people + fasts + the settled
          // week-lot state, for the board/ovens and the report's café line.
          attempt(() => loadCafeStreetData()),
        ]);
        // Apply the fan-out, in the old chain's order. Fallbacks match
        // the old try/catch behavior one for one.
        // Garden of Remembrance state (loved ones + garden level)
        if (remembranceR.ok) {
          remembranceState = remembranceR.value;
          setRemembrance(remembranceState);
        }
        // Mission Field state (field missions, pruned of old collected ones)
        if (fieldMissionsR.ok) {
          const fm = fieldMissionsR.value;
          const pruned = pruneMissions(fm);
          fieldMissionsLoaded = pruned;
          setFieldMissions(pruned);
          if (pruned.length !== fm.length) saveFieldMissions(pruned).catch(() => undefined);
        }
        setUnlockedMaps(parseUnlockedMaps(unlockedRaw ? JSON.parse(unlockedRaw) : null));
        if (plotsR.ok) setPurchasedPlots(plotsR.value);
        // Bell Tower: whether today's campus blessing has already rung.
        if (bellR.ok) setBellRungDate(bellR.value.lastRungDate);
        // v167: adopt the FRESHEST stored record for the display, not
        // the mount-start snapshot — everything this mount granted was
        // already persisted above, and another screen's earnings during
        // the mount must survive into the chip too.
        c = await loadCoinsRecord();
        setCoins(c);
        if (frenzyR.ok) {
          const lastFrenzy = frenzyR.value;
          lastFrenzyRef.current = lastFrenzy ? parseInt(lastFrenzy, 10) || 0 : 0;
        }
        try { setMonumentCount(Object.keys(parseMonuments(monumentsRaw ? JSON.parse(monumentsRaw) : {})).length); } catch {}
        try { setOwnedItems(parseOwnedItems(ownedRaw ? JSON.parse(ownedRaw) : [])); } catch {}
        // Gratitude coins + work shifts
        if (tapsR.ok) {
          try { setLightTaps(parseLightTaps(tapsR.value ? JSON.parse(tapsR.value) : {})); } catch {}
        }
        if (shiftsR.ok) {
          try { setWorkShifts(parseWorkShifts(shiftsR.value ? JSON.parse(shiftsR.value) : {})); } catch {}
        }
        if (lighthouseR.ok) setLighthouseState(lighthouseR.value);
        // Hourly accumulation inputs: bank + restaurant interior bonuses.
        const interiorBonuses: Record<string, Awaited<ReturnType<typeof bankInteriorBonus>>> = bankR.ok ? bankR.value : {};
        const restInteriorMult: Record<string, number> = restR.ok ? restR.value : {};
        // Generosity stat boosts coin earnings
        let generosityMult = 0;
        if (statR.ok) generosityMult = statR.value.coinMult;
        const msMult = milestoneMultiplier(c.lifetimeEarned);
        // Prayer contacts prayed for today boost church income (+2/hr each)
        // and send blessed villagers into town (+3% income each).
        if (prayedR.ok) {
          const people = prayedR.value;
          setPrayedPeople(people.slice(0, PRAYER_VILLAGER_CAP));
          prayedCount = people.length;
          prayedIdSet = new Set(people.map((p) => String(p.id)));
          prayedList = people.map((p) => ({ id: p.id, name: p.name }));
        }
        // The Street & The Café (v279): the café inputs land — states
        // for the map dress, locals for the away report below.
        if (cafeR.ok) {
          cafePeopleLocal = cafeR.value.people;
          cafeFastLocal = cafeR.value.fast;
          setCafePeople(cafeR.value.people);
          setCafeFast(cafeR.value.fast);
          setCafeWeekLots(cafeR.value.weekLots);
          setCafeDay(cafeR.value.today);
        }
        setPrayedToday(prayedCount);
        if (houseR.ok) houseCoinMultPre = houseR.value.coinMult;
        if (fellowshipR.ok) fellowshipState = fellowshipR.value;
        if (gardenVisitsR.ok) gardenVisitState = gardenVisitsR.value;
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
              // Award via the canonical ledger (v167): a serialized
              // delta against the freshest stored record.
              const next = await applyCoinsDelta(bonusCoins, "dime");
              setCoins(next);
              setFireworksKey((k) => k + 1);
              Alert.alert(
                "🙏 Prayer Bonus!",
                `You prayed for ${prayedCount} people today! +${formatCoins(bonusCoins)} coins.`
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
          const fasts = parseFastsRaw();
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
            const next = await applyCoinsDelta(reward, "dime");
            setCoins(next);
          }
        } catch {}
        const prMult = prayerMult(prayedCount);
        // Pawn house rooms + desirables boost coin income (loaded in
        // the critical fan-out above; refreshHouseBonusCache ran there).
        const houseCoinMult = houseCoinMultPre;
        // Fellowship: if the gathering is happening now (Mon/Wed/Fri 6-8pm),
        // breaking bread together sets a 24h income blessing. (The stored
        // state loaded in the critical fan-out above.)
        const gathering = isGatheringTime();
        setGatheringNow(gathering);
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
        // (Lighthouse state applied in the fan-out; the XP level ref and
        // the gathering-place cooldowns hydrate in the DEFERRED batch —
        // they paint nothing the first frame shows.)
        // Schedule sync: check for an in-progress event on open.
        refreshScheduleVisit().catch(() => undefined);
        // Garden visits: from time to time, prayer lights visit the Garden
        // of Remembrance to pay their respects (1-2 per hour, daytime only).
        // Each visit blesses the town: +0.1% income for 24h. (The stored
        // state loaded in the critical fan-out above.)
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
        // Villager single-location: settle where everyone is BEFORE the
        // time-away accrual, so the presence proxy counts, per map, only
        // the villagers actually located on that map (a building's nearby
        // villagers are its own map's). Falls back to the global prayed
        // count if the settle can't run.
        const awayNow = Date.now();
        // The Welcoming Town (v271): how long was he gone? Read the
        // last-visit stamp BEFORE this visit overwrites it (the write
        // happens after the return report is built, below). First-ever
        // visit reads null and never reports.
        let lastVisitMs: number | null = null;
        try {
          const rawVisit = await AsyncStorage.getItem(HOMETOWN_LAST_VISIT_KEY);
          const parsedVisit = rawVisit ? Number(rawVisit) : NaN;
          lastVisitMs = Number.isFinite(parsedVisit) && parsedVisit > 0 ? parsedVisit : null;
        } catch {}
        // v291 (the Wide Street): the retirement migration's state,
        // read before the accrual commit so the sweep can ride the
        // same atomic write (see settleWideStreetMigration below).
        let wideStreetOnLoad = defaultWideStreetState();
        try {
          wideStreetOnLoad = await loadWideStreetState();
        } catch {}
        // The town as the accrual left it, before the sweep — the
        // return report below reads THIS, so the one-time sweep is
        // never told as earnings (the sweep moves waiting coins; it
        // earns nothing).
        let preMigrationTown: TownState | null = null;
        let awayPresenceCounts: Record<string, number> | null = null;
        try {
          const [storedLocations, workNow, missionsNow] = await Promise.all([
            loadVillagerLocations(),
            loadVillagerWorkState(),
            // Reuse the missions loaded (and pruned) earlier in this same
            // mount instead of reading storage a second time — the pruned
            // list is what a fresh read returns once the prune save above
            // lands. Falls back to a fresh load if that block failed.
            fieldMissionsLoaded
              ? Promise.resolve(fieldMissionsLoaded)
              : loadFieldMissions().catch(() => [] as FieldMission[]),
          ]);
          const settledAway = settleVillagerLocations(storedLocations, {
            people: [...prayedIdSet].map((personId) => ({ personId })),
            assignments: workNow.assignments,
            fieldMissions: missionsNow,
            unlockedMaps: parseUnlockedMaps(unlockedRaw ? JSON.parse(unlockedRaw) : null),
            nowMs: awayNow,
            isNight: getTimeOfDay() === "night",
          });
          awayPresenceCounts = {};
          for (const mid of TOWN_MAP_IDS) {
            awayPresenceCounts[mid] = locatedCountOnMap(settledAway.locations, prayedIdSet, mid);
          }
          villagerLocationsRef.current = settledAway.locations;
          setVillagerLocations(settledAway.locations);
          if (settledAway.changed) {
            await saveVillagerLocations(settledAway.locations);
          }
        } catch {}

        // ── ACCRUAL + ATOMIC COMMIT (v164) ──────────────────────────
        // The time-away accrual (lib accrueAwayIncome — the old inline
        // loop, arithmetic untouched) runs HERE, in the critical path,
        // and its result is persisted in ONE awaited write of the town
        // record — accrued amounts, advanced lastTick anchors, and the
        // folded lastIncomeDate — BEFORE the town first paints. The
        // state that paints IS the persisted state. Exit before this
        // write and nothing was applied: the accrual replays next entry
        // at the correct total. Exit after it and the window can never
        // accrue twice (the anchors already advanced). This replaces
        // v161's paint-first arrangement, whose deferred save let a
        // quick back-out strand the accrual ("nothing to collect —
        // back out — re-enter — 1,000+ coins").
        // The Welcoming Town (v271): snapshot every building's
        // uncollected pile BEFORE the accrual, so the return report can
        // tell — per building, from the accrual's own arithmetic — what
        // the town earned while he was gone. Read-only: the accrual
        // below is untouched, and nothing here moves a coin.
        const preAccrualPiles = new Map<string, number>();
        for (const mid of TOWN_MAP_IDS) {
          for (const b of t.maps[mid]?.buildings ?? []) {
            preAccrualPiles.set(b.id, b.accumulated || 0);
          }
        }
        const accrual = accrueAwayIncome(t, {
          gearCoinMult,
          generosityMult,
          houseCoinMult,
          milestoneMult: msMult,
          prestigeMult: pMult,
          // The blessings slot: Depth Blessing + today's set bonus,
          // added on the same base (v200) — see setMultToday above.
          depthBlessingMult: depthMult + setMultToday,
          prayerMultValue: prMult,
          prayedCount,
          fellowshipBonus,
          remembranceBonus,
          gardenVisitBonus,
          interiorBonuses,
          restInteriorMult,
          presenceCounts: awayPresenceCounts,
          economyScale: getEconomyScale(),
          nowMs: awayNow,
          nowIso: now,
        });
        for (const [buildingId, rate] of Object.entries(accrual.rates)) {
          perMinuteRateRef.current[buildingId] = rate;
        }
        t = accrual.town;
        // Missed-days business income, priced on the accrued town
        // exactly as the old chain priced it on its post-loop town.
        const lastDate = t.lastIncomeDate;
        const missed = missedDaysIncome(t, {
          today,
          milestoneMult: msMult,
          houseCoinMult,
          fellowshipBonus,
          prayedCount,
          remembranceBonus,
          gardenVisitBonus,
          prestigeMult: pMult,
          depthBlessingMult: depthMult,
          // The day's-set bonus (v200): past days price their own
          // completions per date inside the award — today's set rides
          // the accrual slot above, never this one, so no day is
          // bonused twice by the same channel.
          setBonusDates: setOut.dates,
          setBonusRate: SET_BONUS_RATE,
          nowMs: awayNow,
        });
        // The old chain folded lastIncomeDate to today UNCONDITIONALLY
        // at this point (whether or not an award fired — including a
        // fresh town's null anchor). Same fold here, inside the commit.
        t = { ...t, lastIncomeDate: today };
        // v291 (the Wide Street): the retirement sweep — every coin
        // still waiting on a retired town building lands on the
        // café's register pile (the anchor diner's accumulated). It
        // rides THIS commit: one write, so the sweep can never land
        // twice or strand half-moved. Idempotent — after the first
        // sweep the sources stand at zero (lib/wide-street).
        preMigrationTown = t;
        const mig = settleWideStreetMigration(t, wideStreetOnLoad);
        t = mig.town;
        try {
          await AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(t));
        } catch {}
        setTown(t);
        if (mig.changed) {
          saveWideStreetState(mig.state).catch(() => undefined);
        }
        setWideStreetState(mig.state);
        // The missed-days award lands right after the commit — the
        // same position relative to the town paint the old chain gave
        // it. The day count itself can never double-award:
        // lastIncomeDate already advanced inside the committed record
        // above. v167: the award is a DELTA against the freshest
        // stored record — the old code built a whole record from the
        // mount-start snapshot `c` and wrote it here, erasing anything
        // earned after this mount began (the vanishing-coins bug).
        if (missed) {
          const { earnedCoins, earnedXP } = missed;
          if (earnedCoins > 0) {
            const nextCoins = await applyCoinsDelta(earnedCoins, "dime");
            setCoins(nextCoins);
          }
          if (earnedXP > 0) {
            await awardCustomXP(earnedXP, `town-missed-${lastDate}-to-${today}`).catch(() => undefined);
          }
        }
        // The Welcoming Town (v271): the return report — what the town
        // did while he was gone, told through its people. Built from
        // the accrual's own numbers (the per-building pile diff against
        // the pre-accrual snapshot), the work shifts that ended during
        // the absence, and the missed-days award above. When the card
        // shows, it carries the missed-days news too, so the plain
        // "Town Income" alert only remains as the fallback for returns
        // the card doesn't cover. Nothing here moves money — the
        // accrual and the award already landed; the coins sit in the
        // buildings, waiting for his tap, exactly as before.
        {
          const awayDeltas: { buildingId: string; name: string; coins: number }[] = [];
          let awayWaiting = 0;
          for (const mid of TOWN_MAP_IDS) {
            // v291: read the PRE-sweep town (when there was a sweep)
            // so the migration is never reported as earnings; the
            // total waiting is the same either way — the sweep
            // conserves it, it only moves where it waits.
            for (const b of (preMigrationTown ?? t).maps[mid]?.buildings ?? []) {
              awayWaiting += b.accumulated || 0;
              const delta = (b.accumulated || 0) - (preAccrualPiles.get(b.id) ?? 0);
              if (delta > 0) {
                awayDeltas.push({
                  buildingId: b.id,
                  name: BUILDINGS[b.type]?.name ?? b.type,
                  coins: Math.floor(delta),
                });
              }
            }
          }
          const awayShifts: AwayShiftInput[] = [];
          if (lastVisitMs !== null) {
            for (const a of workStateRef.current?.assignments ?? []) {
              if (a.endsAt > lastVisitMs && a.endsAt <= awayNow) {
                awayShifts.push({ personName: a.personName, kind: a.kind, endsAt: a.endsAt });
              }
            }
          }
          // The Street & The Café (v279): the report gains the café's
          // day — how many of today's orders were served / still wait —
          // from the real prayer record, and ONLY when the town is
          // unlocked by his fast and today actually has orders.
          const cafeOrders = (() => {
            if (!cafeFastLocal || !hometownUnlockedForFastLength(cafeFastLocal.durationDays)) return undefined;
            if (cafePeopleLocal.length === 0) return undefined;
            const board = buildCafeBoard(cafePeopleLocal, today, new Date());
            return board.ordersTotal > 0
              ? { served: board.ordersServed, waiting: board.ordersWaiting }
              : undefined;
          })();
          const report = buildAwayReport({
            absenceMs: lastVisitMs === null ? null : awayNow - lastVisitMs,
            deltas: awayDeltas,
            shiftsDone: awayShifts,
            missedCoins: missed?.earnedCoins ?? 0,
            missedXP: missed?.earnedXP ?? 0,
            totalWaiting: awayWaiting,
            orders: cafeOrders,
          });
          if (report) {
            setAwayReport(report);
          } else if (missed && missed.earnedCoins > 0) {
            Alert.alert("Town Income", `Your towns earned ${missed.earnedCoins} coins${missed.earnedXP > 0 ? ` and ${missed.earnedXP} XP` : ""} while you were away!`);
          }
          try {
            await AsyncStorage.setItem(HOMETOWN_LAST_VISIT_KEY, String(awayNow));
          } catch {}
        }
        // Accrue ATM/vault drips onto interior furniture (collectible
        // inside) — after the commit, as they landed after the accrual
        // loop in the old chain; they never touch the town record.
        try {
          await Promise.all(accrual.dripOps.map((op) => accrueBankDrips(op.buildingId, op.minutes, op.basePerHour)));
        } catch {}

        // ── DEFERRED HYDRATION (v164) ───────────────────────────────
        // Everything that paints no number the first frame shows, in
        // one parallel round AFTER the commit: the Well, Dark Forest
        // and River panels, the XP level ref (level-up detection), the
        // gathering-place cooldowns, and today's missions. Each
        // applies as it lands, with the same per-loader fallback the
        // old serial chain had (a failed load applies nothing).
        // Fire-and-forget — the town is already on screen.
        void (async () => {
          await Promise.all([
            attempt(async () => { setWell(await loadWell()); }),
            attempt(async () => { setForest(await loadDarkForestState()); }),
            attempt(async () => { setRiver(await loadRiverState()); }),
            attempt(async () => {
              const xp = await loadXPState();
              lastLevelRef.current = getLevelForXP(xp.totalXP);
            }),
            // Gathering places: load cooldown/harvest state.
            attempt(async () => { setGardenState(await loadGarden()); }),
            attempt(async () => { setLastShowAt(await loadLastShow()); }),
            attempt(async () => { setLastStudyAt(await loadLastStudy()); }),
            attempt(async () => { setLastRestAt(await loadLastRest()); }),
            attempt(async () => { setLastCheckupAt(await loadLastCheckup()); }),
            // Generate today's missions
            attempt(async () => { setMissions(await generateDailyMissions()); }),
          ]);
        })();
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
      // Stock drain clock: whole minutes since the last interval run, used
      // to pace the daily stock drain (time away is handled by the catch-up).
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
        const nextAnchors: Record<string, { stock: number; atMs: number }> = { ...(prev.stockAnchorsByBuilding ?? {}) };
        const nextStockedDates: Record<string, string> = { ...(prev.stockedDateByBuilding ?? {}) };
        const todayKey = localDateStr(new Date(now));
        let changed = false;
        let stockChanged = false;
        // Daily stock drain (live): every stocked building's anchor runs
        // its level linearly to zero at the midnight ending the anchor's
        // day — filled at 09:00 or at 20:00, the shelves stand empty at
        // 24:00. Materialize the live level + a fresh anchor (the same
        // line to midnight, so re-anchoring changes nothing). The only
        // way back up is a Restock villager carrying boxes from the
        // church. NOTE: city stocked buildings drain too, but the church
        // route runs on the town map, so city shelves can't be restocked
        // yet (no city depot).
        if (stockFlowMinutes > 0) {
          for (const mapId of TOWN_MAP_IDS) {
            const m = prev.maps[mapId];
            if (!m) continue;
            for (const b of m.buildings) {
              if (!isStockedBuildingType(b.type)) continue;
              // Closed for construction: shelves freeze while it builds.
              if (isUnderConstruction(b, now)) continue;
              const level = b.level || 1;
              const cur = currentStockForBuilding(nextStock, nextAnchors, b.id, level, now);
              const stored = nextStock[b.id];
              const anchor = nextAnchors[b.id];
              if (stored !== cur || !anchor || anchor.stock !== cur) {
                nextStock[b.id] = cur;
                nextAnchors[b.id] = { stock: cur, atMs: now };
                stockChanged = true;
              }
              if (cur >= stockCapForLevel(level)) {
                if (nextStockedDates[b.id] !== todayKey) {
                  nextStockedDates[b.id] = todayKey;
                  stockChanged = true;
                }
              } else if (nextStockedDates[b.id] && nextStockedDates[b.id] !== todayKey) {
                delete nextStockedDates[b.id];
                stockChanged = true;
              }
            }
          }
        }
        // v291 (the Wide Street): on the town map, presence for the
        // café — the town's only earner now — is measured where the
        // café stands on the street (its doorstep tile) against the
        // street villagers' positions, in the street's own
        // coordinates. The same engine function, the same reach.
        const tickStreet = deriveStreetWorld(prev.maps.town);
        const tickCafeDoor =
          tickStreet.cafe && tickStreet.cafeBuildingId
            ? { id: tickStreet.cafeBuildingId, x: tickStreet.cafe.door.x, y: tickStreet.cafe.door.y }
            : null;
        for (const mapId of TOWN_MAP_IDS) {
          const m = newMaps[mapId];
          if (!m) continue;
          // Live villager positions for presence-gated income.
          const positions = mapId === "city" ? cityNpcPositionsRef.current : townNpcPositionsRef.current;
          const updatedBuildings = m.buildings.map((rawB) => {
            // Settle finished construction first: the level flips and
            // the stamps clear (persisted below via `changed`).
            const b = settleBuilding(rawB, now);
            if (b !== rawB) changed = true;
            const lastTick = b.lastTick ? new Date(b.lastTick).getTime() : now;
            const minutesElapsed = Math.floor((now - lastTick) / 60000);
            if (minutesElapsed <= 0) return b;
            // Under construction: closed — no accrual; advance lastTick
            // (persisted) so building time never converts into income.
            if (isUnderConstruction(b, now)) {
              changed = true;
              return { ...b, lastTick: new Date(now).toISOString() };
            }
            const rate = perMinuteRateRef.current[b.id];
            const perMin = rate ? rate.coins + rate.xp : 0;
            if (!rate || perMin <= 0) {
              return b.lastTick ? b : { ...b, lastTick: new Date(now).toISOString() };
            }
            // Presence gate (live): only earn when villagers are nearby.
            // The map being viewed uses its real positions (its NPC layer
            // now renders only villagers located there). Every other map
            // uses the away proxy — but counting only the villagers
            // located on THAT map, so a crowd in town no longer feeds
            // presence on the school or city maps (single-location truth).
            // v291: the café's presence is measured at its street
            // doorstep (above); every other building keeps its own
            // record coordinates.
            const presenceBuilding =
              mapId === "town" && tickCafeDoor && b.id === tickCafeDoor.id
                ? { x: tickCafeDoor.x, y: tickCafeDoor.y }
                : b;
            const presenceMult =
              mapId === activeMapRef.current
                ? presenceMultiplierFor(presenceBuilding, positions, prayedTodayRef.current, true)
                : presenceMultiplierFor(
                    presenceBuilding,
                    [],
                    locatedCountOnMap(
                      villagerLocationsRef.current,
                      prayedIdsRef.current,
                      mapId
                    ),
                    false
                  );
            if (presenceMult <= 0) {
              return b.lastTick ? b : { ...b, lastTick: new Date(now).toISOString() };
            }
            changed = true;
            // Stock: the stocked switch boosts income — once a building
            // has hit full shelves today it earns ×1.5 until midnight,
            // whatever the (drained) level on hand; otherwise regular.
            let stockMult = 1;
            if (isStockedBuildingType(b.type)) {
              stockMult = stockMultiplierFor(isStockedToday(nextStockedDates, b.id, now));
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
        const next = { ...prev, maps: newMaps, stockByBuilding: nextStock, stockAnchorsByBuilding: nextAnchors, stockedDateByBuilding: nextStockedDates };
        saveTown(next);
        return next;
      });
    }, 30000);
    return () => clearInterval(id);
  }, [runVillagerMissionSpawn, runWorkTick, refreshScheduleVisit]);

  // Construction countdown: the 30s live tick left the site chip's
  // seconds frozen between steps, so a building site looked stuck
  // (Jonathan's report). While any building on the VISIBLE map is
  // under construction, a screen-local 1-second tick refreshes nowMs
  // — the chip re-derives its remaining time from constructionEndsAt,
  // still the single source of truth — and settles any finished site
  // through the same settle path the load pass and the 30s tick use
  // (settleTownState → settleBuilding, persisted via saveTown), so
  // the finished building appears the moment its timer passes,
  // crossfade and all. The interval exists only while a site is on
  // screen and clears the moment none is: screen-local only, no
  // background work, per the house rule.
  const visibleMapHasConstruction = map.buildings.some((b) => isUnderConstruction(b, nowMs));
  useEffect(() => {
    if (!visibleMapHasConstruction) return;
    const id = setInterval(() => {
      setNowMs(Date.now());
      setTown((prev) => {
        const next = settleTownState(prev, Date.now());
        if (next === prev) return prev;
        saveTown(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [visibleMapHasConstruction, saveTown]);

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
      Alert.alert("Not enough coins", `${plot.name} costs ${formatCoins(price)} coins. You have ${formatCoins(coins.balance)}.`);
      return;
    }
    Alert.alert(
      `${plot.name} — FOR SALE`,
      `${def.name}\n${def.description}\n\nPurchase this downtown plot for ${formatCoins(price)} coins?\n\nBuilds in 1 min — the site opens when construction finishes.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Buy for ${formatCoins(price)}🪙`,
          onPress: () => {
            // Confirm-time re-check against the exact array appended to:
            // a purchase must never deduct without placing.
            if (buildingCoveringRect(map.buildings, plot.x, plot.y, 2, 2)) {
              Alert.alert("Plot Occupied", "There's already a building on this lot. Move or sell it first.");
              return;
            }
            const now = new Date().toISOString();
            const building: PlacedBuilding = beginConstruction({
              id: `plot-${plot.id}-${Date.now()}`,
              type: plot.buildingType,
              x: plot.x,
              y: plot.y,
              level: 1,
              plotId: plot.id,
              lastTick: now,
              accumulated: 0,
            }, 1, Date.now(), true);
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

  /** Purchase a campus plot (creates the L1 building). Mirrors the city
   *  plot flow: one price covers the plot and the building on it. */
  const handlePurchaseCampusPlot = (plot: SchoolPlot) => {
    const def = BUILDINGS[plot.buildingType];
    const price = scaledCoins(plot.cost);
    // Don't build over legacy free-placed buildings
    for (let dx = 0; dx < 2; dx++) {
      for (let dy = 0; dy < 2; dy++) {
        if (buildingAt(plot.x + dx, plot.y + dy)) {
          Alert.alert("Plot Occupied", "There's already a building on this plot. Move or sell it first.");
          return;
        }
      }
    }
    if (coinsRef.current.balance < price) {
      Alert.alert("Not enough coins", `${plot.name} costs ${formatCoins(price)} coins. You have ${formatCoins(coins.balance)}.`);
      return;
    }
    Alert.alert(
      `${plot.name} — FOR SALE`,
      `${def.name}\n${def.description}\n\nPurchase this campus plot for ${formatCoins(price)} coins?\n\nBuilds in 1 min — the site opens when construction finishes.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Buy for ${formatCoins(price)}`,
          onPress: () => {
            // Confirm-time re-check against the exact array appended to:
            // a purchase must never deduct without placing.
            if (buildingCoveringRect(map.buildings, plot.x, plot.y, 2, 2)) {
              Alert.alert("Plot Occupied", "There's already a building on this plot. Move or sell it first.");
              return;
            }
            const now = new Date().toISOString();
            const building: PlacedBuilding = beginConstruction({
              id: `campus-${plot.id}-${Date.now()}`,
              type: plot.buildingType,
              x: plot.x,
              y: plot.y,
              level: 1,
              campusPlotId: plot.id,
              lastTick: now,
              accumulated: 0,
            }, 1, Date.now(), true);
            saveMap({ ...map, buildings: [...map.buildings, building] });
            addCoins(-price);
          },
        },
      ]
    );
  };

  /** Tap a campus building: enter its interior (upgrades live inside, like
   *  the school trio always has). The Bell Tower rings instead. */
  const handleCampusBuildingPress = (b: PlacedBuilding) => {
    if (b.type === "bell-tower") {
      handleBellTowerPress();
      return;
    }
    const routes: Partial<Record<BuildingType, string>> = {
      "classroom": "/classroom-interior",
      "library": "/library-interior",
      "chapel": "/chapel-interior",
      "music-room": "/music-room-interior",
      "science-lab": "/science-lab-interior",
      "art-studio": "/art-studio-interior",
      "gymnasium": "/gymnasium-interior",
      "cafeteria": "/cafeteria-interior",
      "school-workshop": "/workshop-interior",
      "main-office": "/main-office-interior",
    };
    const route = routes[b.type];
    if (route) {
      router.push(`${route}?buildingId=${b.id}`);
      return;
    }
    setPopupBuilding(b);
  };

  /** Bell Tower: one ring a day grants a small blessing to the whole
   *  campus — 10% of the campus's daily coin income (floor of 10). */
  const handleBellTowerPress = () => {
    const today = localDateStr();
    if (bellRungDate === today) {
      Alert.alert(
        "The Bell Tower",
        "The bell has already rung over the campus today — its blessing is still settling across the quad. Come back tomorrow."
      );
      return;
    }
    const campusDaily = dailyIncomeForMap(town.maps.school, town);
    const blessing = bellBlessingCoins(campusDaily);
    Alert.alert(
      "The Bell Tower",
      `Ring the campus bell? Its voice carries over the whole quad.\n\nBlessing: +${formatCoins(blessing)} coins (10% of the campus's daily income).`,
      [
        { text: "Not yet", style: "cancel" },
        {
          text: "Ring the Bell",
          onPress: () => {
            setBellRungDate(today);
            saveBellState({ lastRungDate: today }).catch(() => undefined);
            addCoins(blessing);
            Alert.alert(
              "The Bell Rings",
              `The bell rolls out over the quad, and the whole campus seems to stand a little taller.\n\n+${formatCoins(blessing)} coins.`
            );
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
      `${def.description}\n\nCurrently earns ${incomeLabelFor(b)}.\n${upgradeBlurb}${capacityBlurb}\n\n${constructionTimeLabel(nextLevel, false)} — the building closes while it builds and reopens at Lv ${nextLevel}.\n\nPlots can't be moved or sold.`,
      [
        { text: "Cancel", style: "cancel" },
        ...enterActions,
        {
          text: `Upgrade 🪙${cost}`,
          onPress: () => {
            if (coinsRef.current.balance < cost) {
              Alert.alert("Not enough coins", `You need ${cost} coins. You have ${formatCoins(coins.balance)}.`);
              return;
            }
            const updated = map.buildings.map(x => (x.id === b.id ? beginConstruction(x, nextLevel, Date.now()) : x));
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

  /** Guards the async lot purchase against double-taps double-charging. */
  const purchaseInFlightRef = useRef(false);

  /** Actually build on a purchased town lot. Lot + building paid together. */
  const purchaseOnLot = async (lot: TownLot, type: BuildingType) => {
    const def = BUILDINGS[type];
    // Atomicity (the Bible Study Hall incident): a lot purchase must
    // never deduct without placing. Two failure shapes made that happen:
    // (1) this path appended blindly — city and campus purchases checked
    // occupancy first, the town path didn't, so a legacy building standing
    // on the lot swallowed the new one (stacked underneath, unreachable);
    // (2) the new map was built from the component's in-memory `map`,
    // which can be stale (e.g. the mount load still settling), while the
    // coin ledger writes independently — coins gone, placement lost.
    // So: re-read the town fresh from storage (the pattern the interiors
    // use), run every guard against THAT, append to THAT, save the whole
    // town, and only then deduct.
    if (purchaseInFlightRef.current) return;
    purchaseInFlightRef.current = true;
    try {
      const raw = await AsyncStorage.getItem(TOWN_STORAGE_KEY).catch(() => null);
      const fresh = parseTown(raw ? JSON.parse(raw) : {});
      const freshMap = fresh.maps.town;
      const blocker = lotPurchaseBlocker(freshMap.buildings, lot, type);
      if (blocker) {
        Alert.alert("Can't build here", blocker);
        setPurchaseLot(null);
        return;
      }
      if (type === "pawn-house" && freshMap.buildings.some((b) => b.type === "pawn-house")) {
        Alert.alert("Already built", "You already have a Hero's house!");
        return;
      }
      if (type === "banquet-table" && freshMap.buildings.some((b) => b.type === "banquet-table")) {
        Alert.alert("Already built", "The Marriage Supper is already prepared — one table for the whole town.");
        return;
      }
      const lotPrice = scaledCoins(lot.cost);
      const buildingPrice = scaledCoins(def.cost);
      const total = lotPrice + buildingPrice;
      if (coinsRef.current.balance < total) {
        Alert.alert("Not enough coins", `${def.name} on ${lot.name} costs ${formatCoins(total)} coins (lot ${formatCoins(lotPrice)} + building ${formatCoins(buildingPrice)}). You have ${formatCoins(coins.balance)}.`);
        return;
      }
      const now = new Date().toISOString();
      const building: PlacedBuilding = beginConstruction({
        id: `townlot-${lot.id}-${Date.now()}`,
        type,
        x: lot.x,
        y: lot.y,
        level: 1,
        townLotId: lot.id,
        lastTick: now,
        accumulated: 0,
      }, 1, Date.now(), true);
      saveTown({
        ...fresh,
        maps: {
          ...fresh.maps,
          town: { ...freshMap, buildings: [...freshMap.buildings, building] },
        },
      });
      addCoins(-total);
      setPurchaseLot(null);
    } catch {
      Alert.alert("Purchase failed", "Something went wrong reading your town — no coins were charged.");
    } finally {
      purchaseInFlightRef.current = false;
    }
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
      `Its beam sweeps over the water, steady and sure — guiding everyone home. +${formatCoins(reward)} coins.\n\n"${lighthouseVerseForDate().text}"\n— ${lighthouseVerseForDate().ref}`
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
    Alert.alert("Hidden Cache!", `Tucked between the cobblestones — +${formatCoins(reward)} coins.`);
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
      Alert.alert("Not enough coins", `Tossing a coin costs ${formatCoins(FOUNTAIN_TOSS_COST)} coins.`);
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
            Alert.alert("A Blessing!", `The fountain shimmers — +${formatCoins(blessing.coins)} coins ripple back to you.`);
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
      Alert.alert("Not enough coins", `A tip costs ${formatCoins(PERFORMER_TIP_COST)} coins.`);
      return;
    }
    Alert.alert("Street Performer", "A little musician with a guitar on the corner. Tip them and they'll play a tune?", [
      { text: "Not now", style: "cancel" },
      {
        text: `Tip ${formatCoins(PERFORMER_TIP_COST)} coins`,
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
      Alert.alert("Not enough coins", `Upgrading the lighthouse costs ${formatCoins(cost)} coins. You have ${formatCoins(coins.balance)}.`);
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
      text: `Upgrade to Lv ${level + 1} (🪙${formatCoins(upgradeCostFor(b.type, (level + 1) as 2 | 3))}) · ${constructionTimeLabel(level + 1, false)}`,
      onPress: () => {
        const cost = upgradeCostFor(b.type, (level + 1) as 2 | 3);
        if (coinsRef.current.balance < cost) {
          Alert.alert("Not enough coins", `You need ${formatCoins(cost)} coins. You have ${formatCoins(coinsRef.current.balance)}.`);
          return;
        }
        addCoins(-cost);
        const updated = map.buildings.map(x => (x.id === b.id ? beginConstruction(x, (level + 1) as 2 | 3, Date.now()) : x));
        saveMap({ ...map, buildings: updated });
        Alert.alert("Community Garden", `Upgrade underway! The garden closes while the builders work — it reopens at level ${level + 1} in ${level + 1 === 2 ? "30 minutes" : "1 hour"}. ${level + 1 >= 3 ? "The greenhouse is coming — faster growth, richer harvests." : "More plots, better yields."}`);
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
      `Baskets full and everyone smiling — harvest time!\n\n+${formatCoins(reward.coins)} coins, +${reward.xp} XP.`,
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

  /** Flower kinds bloomed in the current Garden Tending session (the
   *  Science Lab's extra-bloom perk reads the run when it completes). */
  const gardenBloomKindsRef = useRef<number[]>([]);

  /** Art Studio (School Campus): collections completion payouts grow +25%
   *  while it stands. Applied at every completion grant site below. */
  const collectionPayout = (meta: { rewardCoins: number; rewardXp: number }) => {
    const m = getCachedSchoolPerks().collectionsMult;
    return {
      coins: Math.round(meta.rewardCoins * m * 100) / 100,
      xp: Math.round(meta.rewardXp * m),
    };
  };

  /** Garden Tending: a bloom opened — record its kind in the book. */
  const handleGardenBloom = useCallback((kind: number) => {
    gardenBloomKindsRef.current.push(kind);
    recordFlowerPlanted(kind).then(({ justCompleted }) => {
      if (justCompleted) {
        const meta = COLLECTION_SETS.flowers;
        const pay = collectionPayout(meta);
        addCoins(pay.coins);
        awardCustomXP(pay.xp, `collection:flowers`).catch(() => undefined);
        queueCelebration("milestone", "Collection complete: Garden Flowers!", `+${formatCoins(pay.coins)} coins, +${pay.xp} XP. Title earned: ${meta.rewardTitle}.`);
      }
    }).catch(() => undefined);
  }, [addCoins, queueCelebration]);

  const handleGardenGameComplete = useCallback((raw: MiniGameReward): MiniGameReward => {
    const _pay = scaleMiniGamePayout(scaledCoins(raw.coins), scaledXP(raw.xp));
    const c = _pay.coins;
    const xp = _pay.xp;
    if (c > 0) addCoins(c);
    if (xp > 0) awardCustomXP(xp, `minigame-garden-${Date.now()}`).catch(() => undefined);
    recordPlay("garden").then(setGardenPlaysLeft).catch(() => undefined);
    loadTodaySetStatus().then(setSetToday).catch(() => undefined);
    // Science Lab (School Campus): a completed tending session that opened
    // at least one bloom records ONE extra flower in the book — the lab's
    // greenhouse notes follow the garden home.
    const bloomedKinds = gardenBloomKindsRef.current;
    gardenBloomKindsRef.current = [];
    if (bloomedKinds.length > 0 && getCachedSchoolPerks().gardenExtraBloom) {
      const extraKind = bloomedKinds[bloomedKinds.length - 1];
      recordFlowerPlanted(extraKind).then(({ justCompleted }) => {
        if (justCompleted) {
          const meta = COLLECTION_SETS.flowers;
          const pay = collectionPayout(meta);
          addCoins(pay.coins);
          awardCustomXP(pay.xp, `collection:flowers`).catch(() => undefined);
          queueCelebration("milestone", "Collection complete: Garden Flowers!", `+${formatCoins(pay.coins)} coins, +${pay.xp} XP. Title earned: ${meta.rewardTitle}.`);
        }
      }).catch(() => undefined);
    }
    return { coins: c, xp };
  }, [addCoins, queueCelebration]);

  /** Tide Pools: a shell was gathered — pay the set reward on completion. */
  const handleTideShellUpdate = useCallback((update: CollectionUpdate) => {
    if (update.justCompleted) {
      const meta = COLLECTION_SETS.shells;
      const pay = collectionPayout(meta);
      addCoins(pay.coins);
      awardCustomXP(pay.xp, `collection:shells`).catch(() => undefined);
      queueCelebration("milestone", "Collection complete: Shore Shells!", `+${formatCoins(pay.coins)} coins, +${pay.xp} XP. Title earned: ${meta.rewardTitle}.`);
    }
  }, [addCoins, queueCelebration]);

  const handleTideGameComplete = useCallback((raw: MiniGameReward): MiniGameReward => {
    const _pay = scaleMiniGamePayout(scaledCoins(raw.coins), scaledXP(raw.xp));
    const c = _pay.coins;
    const xp = _pay.xp;
    if (c > 0) addCoins(c);
    if (xp > 0) awardCustomXP(xp, `minigame-tide-${Date.now()}`).catch(() => undefined);
    recordPlay("tide").then(setTidePlaysLeft).catch(() => undefined);
    loadTodaySetStatus().then(setSetToday).catch(() => undefined);
    return { coins: c, xp };
  }, [addCoins]);

  /** Amphitheater: attend a show (30 min cooldown). */
  /** Library: study session (1 hour cooldown). */
  const handleStudyPress = (b: PlacedBuilding) => {
    const level = Math.min(Math.max(b.level || 1, 1), 3);
    const now = Date.now();
    const remaining = studyMsRemaining(lastStudyAt, now);
    const doUpgrade = () => {
      const cost = upgradeCostFor(b.type, (level + 1) as 2 | 3);
      if (coinsRef.current.balance < cost) {
        Alert.alert("Not enough coins", `You need ${formatCoins(cost)} coins. You have ${formatCoins(coinsRef.current.balance)}.`);
        return;
      }
      addCoins(-cost);
      const updated = map.buildings.map(x => (x.id === b.id ? beginConstruction(x, (level + 1) as 2 | 3, Date.now()) : x));
      saveMap({ ...map, buildings: updated });
      Alert.alert("Library", `Upgrade underway! The library closes while the builders work — it reopens at level ${level + 1} in ${level + 1 === 2 ? "30 minutes" : "1 hour"}. ${level + 1 >= 3 ? "A grand library is coming — shelf upon shelf of wisdom." : "A quiet reading room grows."}`);
    };
    const upgradeBtn = level < 3 ? [{ text: `Upgrade to Lv ${level + 1} (🪙${formatCoins(upgradeCostFor(b.type, (level + 1) as 2 | 3))}) · ${constructionTimeLabel(level + 1, false)}`, onPress: doUpgrade }] : [];
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
        Alert.alert("Not enough coins", `You need ${formatCoins(cost)} coins. You have ${formatCoins(coinsRef.current.balance)}.`);
        return;
      }
      addCoins(-cost);
      const updated = map.buildings.map(x => (x.id === b.id ? beginConstruction(x, (level + 1) as 2 | 3, Date.now()) : x));
      saveMap({ ...map, buildings: updated });
      Alert.alert("Fountain Plaza", `Upgrade underway! The plaza closes while the builders work — it reopens at level ${level + 1} in ${level + 1 === 2 ? "30 minutes" : "1 hour"}. ${level + 1 >= 3 ? "A grand plaza is coming — flowers will ring the fountain." : "Benches in the shade, room to breathe."}`);
    };
    const upgradeBtn = level < 3 ? [{ text: `Upgrade to Lv ${level + 1} (🪙${formatCoins(upgradeCostFor(b.type, (level + 1) as 2 | 3))}) · ${constructionTimeLabel(level + 1, false)}`, onPress: doUpgrade }] : [];
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
      `${levelBlurb}\n\n+${formatCoins(coins)} coins, +${xp} XP — refreshed.`,
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
    // Ministry Row — enterable ministry interiors
    } else if (b.type === "bible-study-hall") {
      router.push(`/bible-study-hall-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "fasting-house") {
      router.push(`/fasting-house-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "gym") {
      router.push(`/gym-interior?buildingId=${b.id}`);
      return;
    } else if (b.type === "outreach-center") {
      router.push(`/outreach-center-interior?buildingId=${b.id}`);
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
    } else if (b.type === "diner") {
      // The Café (v287): the diner's tap opens the café street scene —
      // the place the approved drawings drew. Its restaurant interior
      // (furniture, coffee) lives on one step inside, through the
      // scene's own door; every other restaurant keeps the interior.
      router.push(`/cafe-street-scene?buildingId=${b.id}`);
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

  /** Tap a building under construction: it's a closed site — show what's
   *  being built and how long is left instead of entering. */
  const showConstructionStatus = (b: PlacedBuilding) => {
    const def = BUILDINGS[b.type];
    const target = b.constructionToLevel ?? 1;
    const remaining = formatConstructionRemaining(constructionRemainingMs(b, Date.now()));
    Alert.alert(
      target <= 1 ? `${def.name} — Under Construction` : `${def.name} — Upgrading to Lv ${target}`,
      target <= 1
        ? `The builders are at work — scaffolding up, tarp down. ${def.name} opens in ${remaining}.`
        : `${def.name} is closed while the builders work. It reopens at Lv ${target} in ${remaining}.`,
      [{ text: "OK" }]
    );
  };

  const handleTilePress = (x: number, y: number) => {
    // Construction sites are closed on every map: any tap on a building
    // that's still being built/upgraded shows its status, nothing else.
    const tappedBuilding = buildingAt(x, y);
    if (tappedBuilding && isUnderConstruction(tappedBuilding, Date.now())) {
      showConstructionStatus(tappedBuilding);
      return;
    }
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
    // School map: campus plots only — no free placement
    if (activeMap === "school") {
      const existing = buildingAt(x, y);
      // Campus buildings: fixed to their plots (enter interior / ring bell)
      if (existing?.campusPlotId) {
        handleCampusBuildingPress(existing);
        return;
      }
      if (!existing) {
        const plot = schoolPlotAt(x, y);
        if (plot) {
          const b = map.buildings.find(bb => bb.campusPlotId === plot.id);
          if (b) { handleCampusBuildingPress(b); return; }
          handlePurchaseCampusPlot(plot);
          return;
        }
        // Tapped outside any plot — ignore (campus is plots-only)
        return;
      }
      // else: legacy free-placed building tapped — fall through to normal handling below
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

  /* ── v290: the walkable town ──────────────────────────────────────
     Tap-to-walk on the town map. A ground tap plans a path over
     walkable tiles (lib/walkable-town), the Hero walks it, and only
     then does the tap's action run — through the EXISTING handlers,
     unchanged. Whenever walking isn't possible (night, the pawn not
     on the map yet, a building being moved, no route, already there)
     the action runs immediately, exactly as taps always have: a walk
     must never swallow a tap. */
  const heroPosRef = useRef<{ x: number; y: number }>({ x: 5.5 * 40, y: 5.5 * 40 - 4 });
  const heroReadyRef = useRef(false);
  const [walkCmd, setWalkCmd] = useState<{ tiles: WalkTile[]; seq: number } | null>(null);
  const [walkNonce, setWalkNonce] = useState(0);
  const walkSeqRef = useRef(0);
  const pendingWalkRef = useRef<{ seq: number; run: () => void } | null>(null);
  const walkWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingWalk = () => {
    pendingWalkRef.current = null;
    if (walkWatchdogRef.current) {
      clearTimeout(walkWatchdogRef.current);
      walkWatchdogRef.current = null;
    }
  };

  /** Run a pending walk's action exactly once (arrival or watchdog). */
  const firePendingWalk = (seq: number) => {
    const pending = pendingWalkRef.current;
    if (!pending || pending.seq !== seq) return;
    clearPendingWalk();
    pending.run();
  };

  const handleCommandArrive = useCallback((seq: number) => {
    firePendingWalk(seq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Walk the Hero to a tile, then run `action` (a null action is a
   *  pure stroll — the tap just moves him).
   *
   *  v291 (the Wide Street): the plan is the street's own BFS
   *  (planStreetWalk — never crosses a footprint). The never-swallow
   *  contract is unchanged and now pinned: when walking isn't
   *  possible (night, the pawn not on the map yet, a building being
   *  moved, no street, no route, already there) the action runs
   *  IMMEDIATELY; when a walk starts, arrival runs it — and if
   *  arrival never reports, the watchdog runs it anyway, on a
   *  budget sized to the pawn's real pace (~0.87s a tile at
   *  46px/s, plus grace) — never the v290 budget that could leave
   *  a tap hanging for the better part of a minute. */
  const dispatchWalkTo = (target: WalkTile, action: (() => void) | null) => {
    const sw = streetWorldRef.current;
    if (!action) {
      if (isNight || !heroReadyRef.current || !sw) return;
      const from = {
        x: Math.floor(heroPosRef.current.x / cellSize),
        y: Math.floor(heroPosRef.current.y / cellSize),
      };
      const plan = planStreetWalk(sw, from, target);
      if (!plan || plan.tiles.length <= 1) return;
      const seq = ++walkSeqRef.current;
      setWalkCmd({ tiles: plan.tiles, seq });
      setWalkNonce(seq);
      return;
    }
    if (activeMap !== "town" || isNight || !heroReadyRef.current || movingBuilding || !sw) {
      action();
      return;
    }
    const from = {
      x: Math.floor(heroPosRef.current.x / cellSize),
      y: Math.floor(heroPosRef.current.y / cellSize),
    };
    const plan = planStreetWalk(sw, from, target);
    if (!plan || plan.tiles.length <= 1) {
      action();
      return;
    }
    clearPendingWalk();
    const seq = ++walkSeqRef.current;
    pendingWalkRef.current = { seq, run: action };
    // Watchdog: if arrival never reports (night falls mid-walk, the
    // pawn unmounts, a walk segment is interrupted), the tap's
    // action still lands — sized to the walk itself, not a minute.
    walkWatchdogRef.current = setTimeout(
      () => firePendingWalk(seq),
      plan.tiles.length * 1050 + 2500
    );
    setWalkCmd({ tiles: plan.tiles, seq });
    setWalkNonce(seq);
  };

  const tileFromWorldPx = (px: { x: number; y: number }): WalkTile => {
    const sw = streetWorldRef.current;
    const w = sw ? sw.w : gridW;
    const h = sw ? sw.h : gridH;
    return {
      x: Math.max(0, Math.min(w - 1, Math.floor(px.x / cellSize))),
      y: Math.max(0, Math.min(h - 1, Math.floor(px.y / cellSize))),
    };
  };

  /** Collect the migration's waiting sum in person: coins that were
   *  swept before any diner stood land in the balance only here, at
   *  the café, by his own tap — never silently, never automatically. */
  const collectPendingRegister = () => {
    const amount = wideStreetStateRef.current.pendingRegister || 0;
    if (amount <= 0) return;
    const next: WideStreetState = { migrated: true, pendingRegister: 0 };
    wideStreetStateRef.current = next;
    setWideStreetState(next);
    saveWideStreetState(next).catch(() => undefined);
    addCoins(amount);
    try {
      pulseBalance();
      showCollectReceipt(`+${formatCoins(amount)}`);
    } catch {}
  };

  /** What arriving at a street place does — the SAME handlers the
   *  town has always run, reached through the street's doors. The
   *  café collects what waits at its register first (the existing
   *  collect flow), then opens the café scene, exactly as its door
   *  always has. */
  const runStreetPlace = (place: StreetPlace) => {
    const townMapNow = townRef.current?.maps.town;
    switch (place.kind) {
      case "cafe": {
        const anchor = townMapNow ? cafeAnchorDiner(townMapNow) : null;
        if (anchor && (anchor.accumulated || 0) > 0 && !isUnderConstruction(anchor, Date.now())) {
          handleCollectBuilding(anchor.id);
        }
        if ((wideStreetStateRef.current.pendingRegister || 0) > 0) {
          collectPendingRegister();
        }
        if (anchor) handleTownLotBuildingPress(anchor);
        else router.push("/cafe-street-scene");
        break;
      }
      case "mine":
        router.push("/mine-mouth");
        break;
      case "forest":
        handleMapSignSelect("forest");
        break;
      case "gate":
        if (place.landmark) handleMapSignSelect(place.landmark.targetMap);
        break;
      case "house":
        router.push("/pawn-house");
        break;
      case "home": {
        const b = place.buildingId
          ? townMapNow?.buildings.find((bb) => bb.id === place.buildingId)
          : undefined;
        if (b) handleTownLotBuildingPress(b);
        break;
      }
    }
  };

  /** A tap on a place's own doorstep Pressable (components/
   *  wide-street renders one per place, above its art): the walk
   *  starts on THIS tap, synchronously, and the place opens on
   *  arrival — or at once when he's already at the door, or via the
   *  watchdog if arrival never reports. A tap is never swallowed. */
  const handleStreetPlacePress = (place: StreetPlace) => {
    dispatchWalkTo(place.door, () => runStreetPlace(place));
  };

  /** A tap on the register pile itself: collect in person, at once —
   *  the pile's only mover, never gated behind a walk. */
  const handleCollectPilePress = () => {
    const anchor = cafeAnchorDiner(town.maps.town);
    if (anchor && (anchor.accumulated || 0) > 0 && !isUnderConstruction(anchor, Date.now())) {
      handleCollectBuilding(anchor.id);
    }
    if ((wideStreetStateRef.current.pendingRegister || 0) > 0) {
      collectPendingRegister();
    }
  };

  /** A tap on the street's ground (world pixel coordinates, from
   *  the street's own ground Pressable inside its subtree). Open
   *  ground just walks him there; a place under the tap — its art
   *  is pointer-events-none, so a tap can land here even inside a
   *  footprint's margin — walks him to its door and opens it. */
  const handleWalkTapWorld = (px: { x: number; y: number }) => {
    const sw = streetWorldRef.current;
    if (!sw) return;
    const { x, y } = tileFromWorldPx(px);
    const place = streetPlaceAt(sw, x, y);
    if (!place || place.kind === "empty-lot") {
      dispatchWalkTo({ x, y }, null);
      return;
    }
    dispatchWalkTo(place.door, () => runStreetPlace(place));
  };

  const handleWalkLongPressWorld = (px: { x: number; y: number }) => {
    const sw = streetWorldRef.current;
    if (!sw) return;
    const { x, y } = tileFromWorldPx(px);
    const place = streetPlaceAt(sw, x, y);
    if (place?.buildingId) {
      const b = town.maps.town.buildings.find((bb) => bb.id === place.buildingId);
      if (b) setPopupBuilding(b);
    }
  };

  /** On the street, tapping a villager sends the Hero to them
   *  first; their sheet opens when he arrives. */
  const handleVillagerTapWalk = (p: { id: string; name: string; tile?: { x: number; y: number } }) => {
    if (activeMap !== "town" || !p.tile) {
      handleVillagerTap(p);
      return;
    }
    dispatchWalkTo(p.tile, () => handleVillagerTap(p));
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
      Alert.alert("Not enough coins", `You need ${formatCoins(price)} coins. You have ${formatCoins(coins.balance)}.`);
      return;
    }
    if (type === "pawn-house" && map.buildings.some((b) => b.type === "pawn-house")) {
      Alert.alert("Already built", "You already have a Hero's house!");
      return;
    }
    const building: PlacedBuilding = beginConstruction({ id: nextId(), type, x: selectedTile.x, y: selectedTile.y, level: 1 }, 1, Date.now(), true);
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
    const coinsAward = Math.round(totalCoins * 100) / 100;
    // ── STATE FIRST ─────────────────────────────────────────────────────
    // The award is synchronous and final: buildings zeroed + persisted,
    // XP granted, balance updated — all before any animation is even
    // mentioned. Nothing below this line can affect the money, so the
    // collect cannot be broken (or lost) by the FX layer.
    saveMap({ ...map, buildings: updatedBuildings });
    if (totalXP > 0) {
      awardCustomXP(totalXP, `collect-all-${now}`).catch(() => undefined);
    }
    if (coinsAward > 0) {
      addCoins(coinsAward);
    }
    // ── DECORATION ONLY ─────────────────────────────────────────────────
    // Fire-and-forget visuals (restored in v160 — the coin collection
    // animation STAYS): coins burst from up to 8 pending buildings and
    // fly to the counter, the balance pulses, and the pill label
    // crossfades "Collect X" → the collected amount. No spin, no
    // count-up. They read state; they never gate, trigger, or
    // complete any of it. Wrapped so even a throw here costs only
    // the sparkle.
    try {
      pulseBalance();
      showCollectedFace(coinsAward > 0 ? `+${formatCoins(coinsAward)}` : `+${totalXP} XP`);
      measureBalance();
      withGridOrigin((gx, gy) => {
        if (!mountedRef.current) return;
        pendingBuildings.slice(0, 8).forEach((b) => {
          const fp = buildingFootprint(b.level || 1, b.type, hasFixedFootprint(b));
          spawnBurst(
            gx + (b.x + fp.w / 2) * cellSize,
            gy + (b.y + fp.h / 2) * cellSize,
            xpIncomeFor(b.type, b.level || 1) > 0 ? "xp" : "coins"
          );
        });
      });
    } catch {
      // Decoration failed — the collect already landed. Nothing to do.
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
        // v171: stamp the pay-formula version — the collect pays this
        // blessing through scaledCoins (job-anchored bands). Missions
        // already out carry no stamp and stay locked at their old pay.
        blessingV: MISSION_BLESSING_VERSION,
        xp: blessing.xp,
        verse: blessing.verse,
        collected: false,
      };
      const next = [...prev, mission];
      saveFieldMissions(next).catch(() => undefined);
      return next;
    });
  }, [lightInfos]);

  /** Recall a light who is still out (v173): the record is dropped and
   *  NOTHING is granted — the blessing pays only on completion. Every
   *  "away" view (the map's light list, the roster, locations) reads
   *  this same list, so the light is simply back. A mission that has
   *  already returned can't be cancelled — cancelMission refuses it. */
  const handleCancelMission = useCallback((mission: FieldMission) => {
    setFieldMissions(prev => {
      const { missions: next, cancelled } = cancelMission(prev, mission.id);
      if (!cancelled) return prev;
      saveFieldMissions(next).catch(() => undefined);
      return next;
    });
  }, []);

  /** Welcome a returned light home: award their blessing. */
  const handleCollectMission = useCallback((mission: FieldMission) => {
    if (mission.collected || missionStatus(mission) !== "returned") return;
    // v171: v2 blessings are pre-scale raws — grant them through
    // scaledCoins like a job payout (missionCollectRaw); pre-v171
    // missions pay their locked stored coins. addCoins applies the
    // Bloodmoon blessing to the delta, same as every hometown grant.
    if (mission.coins > 0) addCoins(missionCollectRaw(mission));
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
    // The Mist Badge (boss 2) blesses Dark Forest coin rewards +15%.
    const coins = badgesRef.current.includes("mist")
      ? Math.round(demon.coins * MIST_FOREST_COIN_MULT * 100) / 100
      : demon.coins;
    if (coins > 0) addCoins(coins);
    if (demon.xp > 0) {
      awardCustomXP(demon.xp, `dark-forest:${wave}:${Date.now()}`).catch(() => undefined);
    }
    // Record in the demon bestiary collection.
    recordDemonDefeat(demon.name).then(({ justCompleted }) => {
      if (justCompleted) {
        const meta = COLLECTION_SETS.demons;
        const pay = collectionPayout(meta);
        addCoins(pay.coins);
        awardCustomXP(pay.xp, `collection:demons`).catch(() => undefined);
        queueCelebration("milestone", "Bestiary complete!", `Every demon catalogued. +${formatCoins(pay.coins)} coins, +${pay.xp} XP. Title earned: ${meta.rewardTitle}.`);
      }
    }).catch(() => undefined);
    setForest(prev => {
      if (wave <= prev.highestWave) return prev;
      const next = { highestWave: wave };
      saveDarkForestState(next).catch(() => undefined);
      return next;
    });
  }, [addCoins]);

  /**
   * Boss victory: the badge is earned (permanent), the Boss Gate for the
   * current offer is cleared, and the boss's purse is paid. A boss fight
   * never advances the wave ladder.
   */
  const handleBossVictory = useCallback((boss: BossDef) => {
    const coins = badgesRef.current.includes("mist")
      ? Math.round(boss.coins * MIST_FOREST_COIN_MULT * 100) / 100
      : boss.coins;
    if (coins > 0) addCoins(coins);
    if (boss.xp > 0) {
      awardCustomXP(boss.xp, `dark-forest-boss:${boss.badgeId}:${Date.now()}`).catch(() => undefined);
    }
    recordBossVictory(fastsRef.current, boss.badgeId).then((next) => {
      prestigeStateRef.current = next;
      setOwnedBadges(next.badges);
      setBossClearedFastId(next.bossClearedFastId);
      setThroneVictories(next.throneVictories);
      setCachedBadges(next.badges);
      const badge = BADGE_BY_ID[boss.badgeId as BadgeId];
      const firstTime = !badgesRef.current.includes(boss.badgeId as BadgeId);
      queueCelebration(
        "milestone",
        firstTime ? `${badge.name} earned!` : `${boss.name} falls again!`,
        firstTime
          ? `${badge.perk} — yours forever. The Boss Gate stands open: Begin Again awaits.`
          : `Deepened and defeated once more. The Boss Gate stands open: Begin Again awaits.`
      );
    }).catch(() => undefined);
  }, [addCoins, queueCelebration]);

  /** River of Life: a fish on the line — creel +1, daily catch +1. */
  const handleRiverCatch = useCallback((speciesId: string) => {
    // Record the species in the collection book.
    recordFishCatch(speciesId).then(({ justCompleted }) => {
      if (justCompleted) {
        const meta = COLLECTION_SETS.fish;
        const pay = collectionPayout(meta);
        addCoins(pay.coins);
        awardCustomXP(pay.xp, `collection:fish`).catch(() => undefined);
        queueCelebration("milestone", "Collection complete: River Fish!", `+${formatCoins(pay.coins)} coins, +${pay.xp} XP. Title earned: ${meta.rewardTitle}.`);
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
      queueCelebration("milestone", "Harvest Moon blessing!", `The moon doubles your catch: +${formatCoins(coins)} coins.`);
    }
  }, [addCoins]);

  /** River of Life: upgrade the camp to the next level. */
  const handleRiverUpgrade = useCallback(() => {
    const r = newDayCheck(riverRef.current);
    const info = RIVER_LEVELS[r.level];
    if (info.upgradeCost <= 0) return;
    if (coinsRef.current.balance < info.upgradeCost) {
      Alert.alert("Not enough coins", `Upgrading the camp costs ${formatCoins(info.upgradeCost)} coins. You have ${formatCoins(coinsRef.current.balance)}.`);
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
        // Badge perks (Gloaming/Ember/Frost/Fen/Throne) shape combat stats.
        try { await refreshBadgeCache(); } catch {}
        // Character combat stats (Valor/Resolve/Vigor/Zeal) feed the
        // same combatStats composition — refresh their cache too.
        try { await refreshStatBoostCache(); } catch {}
        // Keep the Boss Gate fresh: offer + cleared flag from storage.
        try {
          const pState = await loadPrestigeState();
          prestigeStateRef.current = pState;
          setOwnedBadges(pState.badges);
          setBossClearedFastId(pState.bossClearedFastId);
          setThroneVictories(pState.throneVictories);
          setPrestigeOfferState(prestigeOffer(fastsRef.current, pState));
        } catch {}
        const equipped = await loadEquipped();
        const base = combatStats(equipped);
        // Hospital: the Doctor's Blessing — a checkup's healing buff,
        // consumed when the next battle starts.
        let buff: HospitalBuff | null = null;
        try { buff = await consumeHospitalBuff(); } catch {}
        let finalStats: CombatStats = base;
        if (buff) {
          finalStats = {
            attack: Math.round(base.attack * buff.attackMult),
            defense: base.defense,
            maxHp: Math.round(base.maxHp * buff.hpMult),
            critChance: base.critChance,
          };
          queueCelebration("prayers", "Doctor's Blessing", `The hospital's care steadies you: +${Math.round((buff.hpMult - 1) * 100)}% max HP${buff.attackMult > 1 ? `, +${Math.round((buff.attackMult - 1) * 100)}% attack` : ""} for this battle.`);
        }
        // Gym: the Training Reps bonus — attack & defense until midnight
        // (non-stacking; stored as an expiry in lib/mini-games). The campus
        // Gymnasium strengthens it: +20% instead of +10% while it stands.
        let trainingActive = false;
        let trainingMult = TRAINING_BONUS_MULT;
        try { trainingActive = (await loadTrainingBonus()).active; } catch {}
        if (trainingActive) {
          try { trainingMult = (await loadSchoolPerks()).trainingMult; } catch {}
          finalStats = {
            ...finalStats,
            attack: Math.round(finalStats.attack * trainingMult),
            defense: Math.round(finalStats.defense * trainingMult),
          };
        }
        setForestTraining(trainingActive);
        setForestTrainingPct(Math.round((trainingMult - 1) * 100));
        setForestStats(finalStats);
        const clothesId = equipped.clothes;
        const item = clothesId ? GEAR_BY_ID[clothesId] : undefined;
        if (item?.visual.bodyColor) setForestTunic(item.visual.bodyColor);
        setForestArmor(equipped.armor ?? null);
        setForestWeapon(equipped.weapon ?? null);
        // The hero IS the pawn: hair, beard, and face sync from the
        // pawn's saved appearance (the single source of truth).
        try {
          const pawn = await loadCustomPawn();
          if (pawn) setForestPawn(pawn);
        } catch {}
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
    // ── STATE FIRST ── zero the building, persist, and award — all
    // synchronously. (The award used to wait ~0.85s for the flying coins
    // to "land"; leaving the screen mid-flight lost coins that had
    // already been zeroed off the building.)
    const updatedBuildings = map.buildings.map(b =>
      b.id === buildingId ? { ...b, accumulated: 0, lastTick: new Date().toISOString() } : b
    );
    saveMap({ ...map, buildings: updatedBuildings });
    if (isXP) {
      awardCustomXP(Math.max(1, Math.floor(amount)), `collect-${buildingId}-${Date.now()}`).catch(() => undefined);
    } else {
      addCoins(amount);
    }
    // ── DECORATION ONLY ── coins fly from where the pill was tapped
    // (fall back to the tile pos), the balance pulses, receipt floats.
    try {
      pulseBalance();
      showCollectReceipt(isXP ? `+${Math.max(1, Math.floor(amount))} XP` : `+${formatCoins(amount)}`);
      measureBalance();
      if (pageX != null && pageY != null) {
        spawnBurst(pageX, pageY, isXP ? "xp" : "coins");
      } else {
        const fp = buildingFootprint(building.level || 1, building.type, hasFixedFootprint(building));
        withGridOrigin((gx, gy) => {
          spawnBurst(gx + (building.x + fp.w / 2) * cellSize, gy + (building.y + fp.h / 2) * cellSize, isXP ? "xp" : "coins");
        });
      }
    } catch {
      // Decoration failed — the collect already landed. Nothing to do.
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

  // Boss Gate timing (Jonathan's rule): the gate panel shows only on
  // the offer fast's last day, and while its offer stands pending after
  // the fast ends. Mid-fast it hides; the forest shows one quiet line
  // with the date it opens instead (bossGateOpensOn).
  const bossGateVis = bossGateVisibility(fastsRef.current, prestigeStateRef.current, getTodayISOString());
  const cellSize = 40;
  // v290: the walkable town's window — one screenful of town at a
  // time; the rest is explored by walking and by dragging the map.
  const TOWN_VIEWPORT_H = Math.round(Math.min(640, Math.max(460, windowH * 0.66)));
  // The town and city grids are taller (10x14) so every district gets its
  // own street; other maps stay 10x10.
  const gridSize = mapGridSize(activeMap);
  const gridW = gridSize.w;
  const gridH = gridSize.h;
  // The Street & The Café (v279): where the café frontage stands on the
  // town map. The café IS the diner, re-dressed — the layer follows the
  // first diner standing on the town map (north-most, then west-most);
  // until a diner is built, the order board alone anchors at the
  // diner's home lot (Chapel Shops, the preset diner lot at the head
  // of the neighborhood), so the loop is visible from the first day.
  const cafeAnchor = useMemo<CafeAnchor | null>(() => {
    if (activeMap !== "town" || hometownLocked) return null;
    const diner = town.maps.town.buildings
      .filter((b) => b.type === "diner")
      .sort((a, b) => a.y - b.y || a.x - b.x)[0];
    if (diner) {
      const fp = buildingFootprint(diner.level || 1, diner.type, hasFixedFootprint(diner));
      return {
        left: diner.x * cellSize,
        top: diner.y * cellSize,
        width: fp.w * cellSize,
        height: fp.h * cellSize,
        hasBuilding: true,
      };
    }
    const lot = TOWN_LOTS.find((l) => l.id === CAFE_HOME_LOT_ID);
    if (!lot) return null;
    return {
      left: lot.x * cellSize,
      top: lot.y * cellSize,
      width: lot.w * cellSize,
      height: lot.h * cellSize,
      hasBuilding: false,
    };
  }, [activeMap, hometownLocked, town, cellSize]);
  // v291 (the Wide Street): the town map's street derivation — the
  // record stays canonical; the street is derived from it (plus the
  // migration's waiting sum), deterministically, every render. The
  // walk handlers read it through the ref so a tap always plans
  // against the street as it stands NOW.
  const streetWorld = useMemo(
    () =>
      activeMap === "town" && !hometownLocked
        ? deriveStreetWorld(town.maps.town, {
            pendingRegister: wideStreetState.pendingRegister,
            weekLots: cafeWeekLots,
          })
        : null,
    [activeMap, hometownLocked, town, wideStreetState, cafeWeekLots]
  );
  const streetWorldRef = useRef(streetWorld);
  streetWorldRef.current = streetWorld;
  /** The street's roads under the pawn's feet (his stroll network). */
  const streetMapState = useMemo(
    () =>
      streetWorld
        ? {
            ...town.maps.town,
            roads: streetWorld.roads.map((t) => ({ id: `street-road-${t.x}-${t.y}`, x: t.x, y: t.y })),
          }
        : town.maps.town,
    [streetWorld, town]
  );
  /** Where the schedule asks the Hero to be, in street coordinates:
   *  the doorstep of the place that building became. Buildings with
   *  no street place retire from the schedule's map life — he just
   *  strolls the street. */
  const streetDestTile = useMemo(() => {
    if (!streetWorld || !scheduleTarget?.buildingId) return null;
    return streetPlaceByBuildingId(streetWorld, scheduleTarget.buildingId)?.door ?? null;
  }, [streetWorld, scheduleTarget]);
  /** Homes whose dealt residents include someone prayed for today —
   *  their warm dress on the street. */
  const awakeHomeIds = useMemo(() => {
    const out = new Set<string>();
    if (activeMap !== "town") return out;
    for (const b of town.maps.town.buildings) {
      if (b.type !== "villager-cottage" && b.type !== "house") continue;
      if (cottageResidents(town.maps.town.buildings, b.id, lightInfos).length > 0) out.add(b.id);
    }
    return out;
  }, [activeMap, town, lightInfos]);
  /** personId → the doorstep of the home the record deals them. */
  const streetHomeDoors = useMemo(() => {
    const out = new Map<string, WalkTile>();
    if (!streetWorld) return out;
    for (const b of town.maps.town.buildings) {
      if (b.type !== "villager-cottage") continue;
      const place = streetPlaceByBuildingId(streetWorld, b.id);
      if (!place) continue;
      for (const r of cottageResidents(town.maps.town.buildings, b.id, lightInfos)) {
        out.set(String(r.personId), place.door);
      }
    }
    return out;
  }, [streetWorld, town, lightInfos]);
  // The base grid (340 tappable cells on the town map) is memoized: it
  // depends only on the map data + selection, so unrelated state changes
  // (modals, clocks, collect FX) no longer rebuild hundreds of Pressables
  // on every render. Cell presses route through tilePressRef so the
  // memoized cells always invoke the LATEST handleTilePress (it reads
  // plenty of state that is deliberately NOT a memo dep).
  const tilePressRef = useRef(handleTilePress);
  tilePressRef.current = handleTilePress;
  const rows = useMemo(() => {
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
    const out: React.ReactNode[] = [];
    for (let y = 0; y < gridH; y++) {
      const cells: React.ReactNode[] = [];
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
          onPress={() => tilePressRef.current(x, y)}
          onLongPress={() => {
            const b = buildingAt(x, y);
            if (b) setPopupBuilding(b);
          }}
          style={{
            width: cellSize,
            height: cellSize,
            backgroundColor: isSelected ? PAPER_GROUND.selected : b ? PAPER_GROUND.plot : onStream ? PAPER_GROUND.stream : beachCells.has(`${x}-${y}`) ? PAPER_GROUND.sand : PAPER_GROUND.grass,
            borderWidth: isOrigin || !b ? 1 : 0,
            borderColor: isSelected ? "#F59E0B" : onStream ? "#38BDF8" : beachCells.has(`${x}-${y}`) ? PAPER_GROUND.sandEdge : PAPER_GROUND.grassEdge,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {decorationAt(x, y) && paperDecorationKind(decorationAt(x, y)!.type) && (
            <PaperDecoration
              kind={paperDecorationKind(decorationAt(x, y)!.type)!}
              size={Math.round(cellSize * 0.72)}
              night={isNight}
            />
          )}
          {onStream && !onBridge && <StreamWater size={cellSize} phase={x + y} />}
          {onBridge && (
            <View style={{ position: "absolute", width: cellSize, height: cellSize }}>
              <StreamWater size={cellSize} phase={x + y} />
              <StreamBridge size={cellSize} />
            </View>
          )}
          {roadAt(x, y) && !onStream && (
            <View style={{ position: "absolute", width: cellSize, height: cellSize, backgroundColor: PAPER_GROUND.road, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: cellSize * 0.7, height: 8, backgroundColor: PAPER_GROUND.roadLine, borderRadius: 4 }} />
            </View>
          )}
          {null}
        </Pressable>
        );
      }
      out.push(
        <View key={y} style={{ flexDirection: "row" }}>
          {cells}
        </View>
      );
    }
    return out;
    // buildingAt/decorationAt/roadAt read `map` (a dep) from the render
    // closure, so the memoized cells always match the current map data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMap, map, selectedTile, gridW, gridH, cellSize, isNight]);

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
        {/* ONE pill: it rests cream showing the coin balance; when coins
            are waiting it is gold "Collect X". A Collect All tap lands
            the money, coins fly to the counter, the balance pulses,
            and the label crossfades to the collected amount ("+X") on
            a green face before settling back to the balance face —
            opacity only, no spin, no count-up. The info button opens
            the per-building breakdown. */}
        <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1, marginLeft: 8 }}>
          <Animated.View
            ref={balanceRef}
            onLayout={measureBalance}
            style={{ flexShrink: 1, maxWidth: Math.round(windowW * 0.5), transform: [{ scale: balancePulseAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1.14, 1] }) }] }}
          >
            <Pressable
              onPress={pillCollectMode ? handleCollectAll : undefined}
              onLongPress={() => setCollectBreakdownOpen(true)}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              style={{ borderRadius: 999 }}
            >
              <View
                style={{
                  backgroundColor: pillCollectMode ? "#D4AF37" : "#FEF3C7",
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  minHeight: 44,
                  elevation: 2,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.2,
                  shadowRadius: 2,
                }}
              >
                <Animated.View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", opacity: collectFade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
                  {pillCollectMode ? (
                    <>
                      <MaterialIcons name="monetization-on" size={18} color="#FFFFFF" />
                      <Text numberOfLines={1} style={{ fontWeight: "800", fontSize: 13, color: "#FFFFFF", marginLeft: 4 }}>Collect {headerCoinText(collectibleTotal)}</Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="monetization-on" size={18} color="#92400E" />
                      <Text numberOfLines={1} style={{ marginLeft: 6, fontWeight: "700" }}>{headerCoinText(coins.balance)}</Text>
                    </>
                  )}
                </Animated.View>
                {/* Collected-amount face: crossfades in over the normal
                    face after a Collect All, then back out (collectFade). */}
                {collectedFace && (
                  <Animated.View
                    key={collectedFace.id}
                    pointerEvents="none"
                    style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#16A34A", borderRadius: 999, opacity: collectFade, flexDirection: "row", alignItems: "center", justifyContent: "center" }}
                  >
                    <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                    <Text numberOfLines={1} style={{ fontWeight: "800", fontSize: 13, color: "#FFFFFF", marginLeft: 4 }}>{collectedFace.label}</Text>
                  </Animated.View>
                )}
              </View>
            </Pressable>
            {/* Floating "+X" receipt — the balance above already updated;
                this is decoration only. */}
            {collectDelta && <CollectDeltaBubble key={collectDelta.id} label={collectDelta.label} />}
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
            gardenVisitMult(gardenVisits) *
            totalPrestigeMultiplier(prestigeLevel, prestigeDevotion) *
            (depthBlessingMultiplierForLevels(mineDepthLevels) + (setToday.complete ? SET_BONUS_RATE : 0)) *
            (ownedBadges.includes("gilded") ? GILDED_INCOME_MULT : 1);
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
              const max = COLLECTION_SETS.fish.total + COLLECTION_SETS.demons.total + COLLECTION_SETS.flowers.total;
              return ` ${total}/${max}`;
            })()}
          </Text>
        </Pressable>
        {/* Begin Again (prestige) chip */}
        <Pressable
          onPress={() => setBeginAgainOpen(true)}
          style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFBEB", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 8, borderWidth: 1, borderColor: "#D4AF37" }}
        >
          <MaterialIcons name="workspace-premium" size={14} color="#B8912C" />
          <Text style={{ marginLeft: 6, fontWeight: "700", fontSize: 12, color: "#92400E" }}>
            {prestigeOfferState
              ? prestigeOfferState.kind === "crown"
                ? "Begin Again — a Crown awaits"
                : `Begin Again — +${Math.round(prestigeOfferState.bonus * 100)}% awaits`
              : prestigeLevel > 0
                ? `Crown ${prestigeLevel} · Begin Again`
                : prestigeDevotion > 0
                  ? `Devotion +${Math.round(prestigeDevotion * 100)}% · Begin Again`
                  : "Begin Again"}
          </Text>
        </Pressable>
        {/* Boss badges — permanent, earned at the Boss Gate */}
        {ownedBadges.length > 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#1C1917", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 8, borderWidth: 1, borderColor: "#57534E" }}>
            <MaterialIcons name="military-tech" size={14} color="#FCD34D" />
            <Text style={{ marginLeft: 6, fontWeight: "700", fontSize: 12, color: "#FDE68A" }}>
              {ownedBadges.length}/10 Badges
            </Text>
          </View>
        ) : null}
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
          // The City does not exist at prestige 0 — no exceptions.
          if (id === "city" && !cityExists(prestigeLevel)) return null;
          const info = MAP_INFO[id];
          const unlocked = unlockedMaps.includes(id);
          const isActive = activeMap === id;
          const label = info.comingSoon
            ? `${info.icon} ${info.name}`
            : unlocked
              ? `${info.icon} ${info.name}`
              : `${info.icon} ${info.name} 🔒 ${formatCoins(mapUnlockCost(id))}🪙`;
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
          <Text style={{ fontSize: 12, color: pt.subtext }}>Monuments, decorations, hero skins</Text>
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
                const pay = collectionPayout(meta);
                addCoins(pay.coins);
                awardCustomXP(pay.xp, `collection:flowers`).catch(() => undefined);
                queueCelebration("milestone", "Collection complete: Garden Flowers!", `Every bloom planted. +${formatCoins(pay.coins)} coins, +${pay.xp} XP. Title earned: ${meta.rewardTitle}.`);
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
              Alert.alert("Not enough coins", `Lighting a candle costs ${formatCoins(MEMORY_CANDLE_COST)} coins.`);
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
          bloodmoonHeld={ownedBadges.includes("bloodmoon")}
          onSend={handleSendMission}
          onCollect={handleCollectMission}
          onCancel={handleCancelMission}
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
          trainingBonus={forestTraining}
          trainingBonusPct={forestTrainingPct}
          forest={forest}
          tunicColor={forestTunic}
          armorId={forestArmor}
          weaponId={forestWeapon}
          hairStyle={forestPawn?.hairStyle}
          hairColor={forestPawn?.hairColor}
          beardStyle={forestPawn?.beardStyle}
          bodyStyle={forestPawn?.bodyStyle}
          beardLength={forestPawn ? beardGrowthFor(forestPawn) : 0}
          timeOfDay={timeOfDay}
          pt={pt}
          onVictory={handleForestVictory}
          bossGate={bossGateVis.visible && prestigeOfferState ? {
            boss: bossGateFor(ownedBadges as string[], throneVictories),
            cleared: bossClearedFastId === prestigeOfferState.fastId,
          } : null}
          bossGateOpensOn={!bossGateVis.visible ? bossGateVis.opensOn : null}
          onBossVictory={handleBossVictory}
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
          villagerPeople={prayedPeople.map((p) => ({ id: String(p.id), name: p.name, accentColor: p.accentColor }))}
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
        {/* v291 (the Wide Street): the Great Peak banner and the
            horizon strip that crowned the old grid are gone — the
            Mine is a place ON the street now (its rock face at the
            east end, its own doorstep Pressable), and the skyline
            rides at the street's head in the same horizon dress
            (components/street-places-art). */}
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
        <WalkableTownShell
          enabled={activeMap === "town"}
          worldW={activeMap === "town" && streetWorld ? streetWorld.w * cellSize : gridW * cellSize}
          worldH={activeMap === "town" && streetWorld ? streetWorld.h * cellSize : gridH * cellSize}
          viewportH={activeMap === "town" && streetWorld ? streetWorld.h * cellSize : TOWN_VIEWPORT_H}
          viewportW={gridW * cellSize}
          heroPosRef={heroPosRef}
          followNonce={walkNonce}
        >
        {activeMap === "town" && streetWorld ? (
          <View ref={mapGridRef} style={{ position: "relative", width: streetWorld.w * cellSize, height: streetWorld.h * cellSize }}>
            {/* v291: the Wide Street itself — its places, its people,
                its ground, all carrying their own Pressables inside
                this subtree (the v290 lesson: a tap must land on a
                real Pressable in the same tree as the art). */}
            <StreetWorldView
              world={streetWorld}
              cellSize={cellSize}
              phase={dayPhase}
              ovenLit={cafeOven === "lit"}
              cafeAlert={!!cafeBoard?.tickets.some((t) => t.kind === "emergency")}
              awakeHomeIds={awakeHomeIds}
              onGroundPress={handleWalkTapWorld}
              onGroundLongPress={handleWalkLongPressWorld}
              onPlacePress={handleStreetPlacePress}
              onCollectPile={handleCollectPilePress}
              villagers={
                <StreetVillagers
                  world={streetWorld}
                  cellSize={cellSize}
                  lights={lightsForActiveMap}
                  homeDoorByPerson={streetHomeDoors}
                  positionsRef={townNpcPositionsRef}
                  missionWaitingIds={vmWaitingIds}
                  onVillagerTap={handleVillagerTapWalk}
                />
              }
            >
              <PlayerPawnWanderer
                cellSize={cellSize}
                destTile={streetDestTile}
                mapState={streetMapState}
                commandPath={walkCmd}
                onCommandArrive={handleCommandArrive}
                positionRef={heroPosRef}
                onReady={() => { heroReadyRef.current = true; }}
              />
            </StreetWorldView>
          </View>
        ) : (
          <View ref={mapGridRef} style={{ position: "relative" }}>
          <View>{rows}</View>
          {/* Street lamps (v285): a post stands IN the lane's edge on
              its rhythm tiles; at dusk and through the night the lamp
              lights and pools its glow on the paper street. */}
          {activeMap === "town" && (
            <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
              {TOWN_PATH.filter((t) => lampForTile(t.x, t.y)).map((t) => {
                const lit = dayPhase === "dusk" || dayPhase === "night";
                return (
                  <View key={`lamp-${t.x}-${t.y}`} style={{ position: "absolute", left: t.x * cellSize, top: t.y * cellSize, width: cellSize, height: cellSize }}>
                    {lit && (
                      <>
                        <View style={{ position: "absolute", left: cellSize * 0.36, top: cellSize * 0.02, width: cellSize * 0.68, height: cellSize * 0.68, borderRadius: cellSize * 0.34, backgroundColor: "rgba(252, 211, 77, 0.26)" }} />
                        <View style={{ position: "absolute", left: cellSize * 0.52, top: cellSize * 0.14, width: cellSize * 0.36, height: cellSize * 0.36, borderRadius: cellSize * 0.18, backgroundColor: "rgba(253, 230, 138, 0.38)" }} />
                      </>
                    )}
                    <View style={{ position: "absolute", left: cellSize * 0.68, top: cellSize * 0.3, width: Math.max(2, cellSize * 0.06), height: cellSize * 0.42, backgroundColor: "#5E5646", borderRadius: 2 }} />
                    <View style={{ position: "absolute", left: cellSize * 0.605, top: cellSize * 0.2, width: cellSize * 0.21, height: cellSize * 0.17, backgroundColor: lit ? "#FDE68A" : "#FFF7E0", borderRadius: 3 }} />
                  </View>
                );
              })}
            </View>
          )}
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
            // Construction: the site cover replaces the building's art
            // until the timer completes; the level shown is the EFFECTIVE
            // one (current while building, target the moment it's done).
            const building = isUnderConstruction(b, nowMs);
            const lvl = effectiveLevel(b, nowMs);
            const fp = buildingFootprint(lvl, b.type, hasFixedFootprint(b));
            const baseSize = Math.min(fp.w, fp.h) * cellSize * 0.85;
            // Pseudo-3D: tall buildings extend their art above their square.
            const extraPx = tallArtExtraCells(b.type, lvl, b.floors || 1) * cellSize;
            // The Welcoming Town (v271): wake-by-prayer for the cottages.
            // A cottage is AWAKE when at least one of today's prayer
            // lights lives there (the same cottageResidents the cottage
            // tap uses); with nobody home it reads ASLEEP — gently: a
            // dimmed house and a small "z", never a warning. Null for
            // every non-cottage building.
            const cottageResidentsHere =
              b.type === "villager-cottage"
                ? cottageResidents(map.buildings, b.id, lightInfos)
                : null;
            // Kept in the v271 shape verbatim (its source pin reads
            // this exact expression): the wake state derives from the
            // same residents call, never from a second source.
            const cottageAwake =
              b.type === "villager-cottage"
                ? cottageResidents(map.buildings, b.id, lightInfos).length > 0
                : null;
            // The Street & The Café (v279): a cottage BLOOMS when one of
            // its residents is flourishing — prayed for today, the full
            // warm tier of their real record (lib/cafe-street). The
            // v271 wake dress stays exactly as it was underneath: glow
            // for awake, veil + "z" for asleep; the bloom is the extra
            // truth the record adds on top.
            const cottageBloom =
              cottageAwake === true &&
              (cottageResidentsHere ?? []).some((r) => {
                const resident = cafePersonById.get(String(r.personId));
                return !!resident && flourishTierFor(resident, cafeDay) === "flourishing";
              });
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
                {/* v285: the dusk long shadow rakes east from the
                    building's base, under its art (one light, +x). */}
                {longShadow && (
                  <View pointerEvents="none" style={{ position: "absolute", bottom: 2, left: "52%", width: fp.w * cellSize * 0.95, height: Math.max(4, cellSize * 0.2), backgroundColor: "rgba(146, 90, 32, 0.22)", borderRadius: 999, transform: [{ skewX: "-24deg" }] }} />
                )}
                {building ? (
                  <>
                    <ConstructionSiteArt width={fp.w * cellSize * 0.96} height={fp.h * cellSize + extraPx} />
                    <View style={{ position: "absolute", bottom: 0, alignSelf: "center", flexDirection: "row", alignItems: "center", backgroundColor: "rgba(28,25,23,0.88)", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2.5 }}>
                      <MaterialIcons name="construction" size={11} color="#FBBF24" />
                      <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "800", marginLeft: 3 }}>
                        Ready in {formatConstructionRemaining(constructionRemainingMs(b, nowMs))}
                      </Text>
                    </View>
                  </>
                ) : (
                <>
                <BuildingArtFX type={b.type} size={baseSize} artH={baseSize + extraPx} level={lvl} floors={b.floors || 1} prayedCount={b.type === "church" ? prayedToday : 0} blessed={b.type === "bell-tower" && bellRungDate === localDateStr()} night={isNight || (activeMap === "town" && phaseWindowsLit(dayPhase))} />
                {/* Ambient life: chimney smoke drifting from hearths
                    (deferred past first paint — see ambientReady).
                    The Welcoming Town (v271): a cottage only smokes when
                    somebody's home — an asleep cottage's hearth is cold. */}
                {ambientReady && hasChimney(b.type) && cottageAwake !== false && (
                  <ChimneySmoke risePx={cellSize * 0.9} puffSize={Math.max(8, cellSize * 0.28)} />
                )}
                {/* The Welcoming Town (v271): cottage wake dress — an
                    awake cottage sits in a warm pool of light (the same
                    under-glow the L3 towers and the Gathering use); an
                    asleep one dims under a soft veil with a drawn "z"
                    at the roofline, the NPC sleep language. */}
                {cottageAwake === true && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      bottom: 2,
                      width: fp.w * cellSize * 0.8,
                      height: 12,
                      backgroundColor: "#FDE68A",
                      opacity: 0.4,
                      borderRadius: 6,
                    }}
                  />
                )}
                {/* The Street & The Café (v279): the flourishing bloom —
                    a row of cut-paper flowers along the cottage's base
                    when a resident's record is in the full warm tier. */}
                {cottageBloom && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      bottom: 1,
                      alignSelf: "center",
                      flexDirection: "row",
                      gap: 2.5,
                    }}
                  >
                    {["#F472B6", "#F9A8D4", "#FB7185", "#F9A8D4", "#F472B6"].map((c, i) => (
                      <View key={i} style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: c }} />
                    ))}
                  </View>
                )}
                {cottageAwake === false && (
                  <>
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "#1E293B",
                        opacity: 0.16,
                        borderRadius: 8,
                      }}
                    />
                    <Text
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        top: extraPx + 1,
                        right: fp.w * cellSize * 0.16,
                        fontSize: 12,
                        fontWeight: "800",
                        color: "#7DD3FC",
                      }}
                    >
                      z
                    </Text>
                  </>
                )}
                {/* L3 city towers glow with activity */}
                {lvl >= 3 && !!b.plotId && (
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
                {lvl > 1 && (
                  <Text style={{ fontSize: 10, color: "#F59E0B", fontWeight: "700" }}>
                    {"★".repeat(lvl)}
                  </Text>
                )}
                </>
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
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#374151", marginTop: 2 }}>🪙{formatCoins(scaledCoins(plot.cost))}</Text>
              <Text style={{ fontSize: 8, color: "#9CA3AF", marginTop: 2 }}>{BUILDINGS[plot.buildingType].name}</Text>
            </View>
          ))}
          {/* School Campus plots: FOR SALE lots (unpurchased) */}
          {activeMap === "school" && SCHOOL_PLOTS.filter(p => !map.buildings.some(b => b.campusPlotId === p.id)).map((plot) => (
            <View
              key={`campusplot-${plot.id}`}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: plot.x * cellSize,
                top: plot.y * cellSize,
                width: 2 * cellSize,
                height: 2 * cellSize,
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: "#0F766E",
                borderRadius: 8,
                backgroundColor: "rgba(15, 118, 110, 0.08)",
                alignItems: "center",
                justifyContent: "center",
                zIndex: Math.round((plot.y + 2) * cellSize),
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: "800", color: "#115E59", letterSpacing: 1 }}>FOR SALE</Text>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#134E4A", marginTop: 2 }}>{formatCoins(scaledCoins(plot.cost))}</Text>
              <Text style={{ fontSize: 8, color: "#0F766E", marginTop: 2 }}>{BUILDINGS[plot.buildingType].name}</Text>
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
                  <Text style={{ fontSize: 10, fontWeight: "800", color: "#92400E" }}>🪙{formatCoins(scaledCoins(lot.cost))}</Text>
                </View>
              ) : (
                <>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#B45309", letterSpacing: 1 }}>{"FOR SALE"}</Text>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#92400E", marginTop: 2 }}>🪙{formatCoins(scaledCoins(lot.cost))}</Text>
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
          <TownNPCs mapState={map} cellSize={cellSize} bare positionsRef={townNpcPositionsRef} onBankVisit={handleBankVisit} lights={lightsForActiveMap} onVillagerTap={handleVillagerTapWalk} missionWaitingIds={vmWaitingIds} missionGuides={vmGuides} onMissionArrival={handleVmArrival} workGuides={workGuides} workMap={workMap} onWorkArrival={handleWorkArrival} scheduleGuides={scheduleGuides} scheduleMap={scheduleMap} scheduleKind={scheduleActivity?.kind} greet={activeMap === "town" ? greetRef.current : null} />
          {/* The Street & The Café: the café's marker on the town map —
              the awning and ovens seated on the diner itself, and a
              small board glyph standing at its front (v287: the scene
              itself is a place now, entered from the diner's tap; the
              v279 overlay popup that floated here is retired). Pure
              dress over settled state (pointer-events none), town map
              only, and only while the town is unlocked. */}
          {activeMap === "town" && cafeAnchor && cafeBoard && (
            <CafeMapMarker anchor={cafeAnchor} oven={cafeOven} night={isNight} alert={cafeBoard.tickets.some((t) => t.kind === "emergency")} />
          )}
          {/* The fast-week lot: roped ground at the street's end once a
              kept week inside the current fast has opened it. */}
          {activeMap === "town" && !hometownLocked && cafeWeekLots >= 1 && (
            <CafeWeekLot
              left={CAFE_WEEK_LOT.x * cellSize}
              top={CAFE_WEEK_LOT.y * cellSize}
              size={CAFE_WEEK_LOT.w * cellSize}
              weeks={cafeWeekLots}
            />
          )}
          {/* City life: commuters from town (depth-sorted, bare). The
              traffic layer is ambient — it mounts after first paint. */}
          {activeMap === "city" && ambientReady && (
            <CityTraffic
              bare
              cellSize={cellSize}
              carCount={Math.min(6, Math.max(0, town.maps.town.buildings.filter((b) => b.type === "house").length))}
            />
          )}
          {activeMap === "city" && (
            <CityNPCs
              bare
              mapState={map}
              cellSize={cellSize}
              hometownNpcCount={countHometownNpcs(prayedToday)}
              onBankVisit={handleBankVisit}
              positionsRef={cityNpcPositionsRef}
            />
          )}
          {/* Ambient life: birds gliding across the sky in the daytime (town + city) */}
          {ambientReady && (activeMap === "town" || activeMap === "city") && (
            <MapBirds width={gridW * cellSize} height={gridH * cellSize} birdCount={4} />
          )}
          {/* The player's own pawn, wandering town (depth-sorted with the rest) */}
          {activeMap === "town" && <PlayerPawnWanderer cellSize={cellSize} destTile={scheduleTarget?.tile ?? null} mapState={map} commandPath={walkCmd} onCommandArrive={handleCommandArrive} positionRef={heroPosRef} onReady={() => { heroReadyRef.current = true; }} />}
          {/* The Welcoming Town (v271): the phase light wash over the
              town map — dawn gold, dusk amber, a faint night cool (the
              night light itself lives in the building art). Day wears
              none. Pure dress: pointer-events none, above the depth
              layer, below every sheet and modal. Town map only. */}
          {activeMap === "town" && phaseWash && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: gridW * cellSize,
                height: gridH * cellSize,
                backgroundColor: phaseWash.color,
                opacity: phaseWash.opacity,
                zIndex: 1500000,
              }}
            />
          )}
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
            // food/retail buildings (the live, anchor-drained level).
            // Empty shelves are a gentle hint, not a warning — the
            // building still earns its regular income. A building that
            // reached full shelves today keeps its ×1.5 "stocked" bonus
            // until midnight even as the level drains — the pill says so.
            const stockedType = isStockedBuildingType(b.type);
            const stockCap = stockedType ? stockCapForLevel(b.level || 1) : 0;
            const stockNow = stockedType
              ? currentStockForBuilding(town.stockByBuilding, town.stockAnchorsByBuilding, b.id, b.level || 1, Date.now())
              : 0;
            const stockPct = stockedType && stockCap > 0
              ? Math.round((stockNow / stockCap) * 100)
              : 0;
            const stockEmpty = stockedType && stockNow <= 0;
            const stockedToday = stockedType && isStockedToday(town.stockedDateByBuilding, b.id, Date.now());
            const stockBadge = stockedType ? (
              <View
                key={`stock-${b.id}`}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: b.x * cellSize + 2,
                  top: b.y * cellSize - 12,
                  zIndex: 1990,
                  elevation: 1990,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: stockedToday ? "#DCFCE7" : stockEmpty ? "#F3F4F6" : stockPct < 50 ? "#FEF3C7" : "#DCFCE7",
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderWidth: 1,
                    borderColor: stockedToday ? "#22C55E" : stockEmpty ? "#E5E7EB" : stockPct < 50 ? "#FCD34D" : "#86EFAC",
                  }}
                >
                  <MaterialIcons
                    name="inventory"
                    size={11}
                    color={stockEmpty && !stockedToday ? "#6B7280" : stockPct < 50 && !stockedToday ? "#92400E" : "#166534"}
                  />
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "800",
                      color: stockEmpty && !stockedToday ? "#6B7280" : stockPct < 50 && !stockedToday ? "#92400E" : "#166534",
                      marginLeft: 2,
                    }}
                  >
                    {stockedToday ? `stocked ${stockPct}%` : stockEmpty ? "restock" : `${stockPct}%`}
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
                    zIndex: 1991,
                    elevation: 1991,
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
                  // Wide slot anchored on the building's top-right corner.
                  // The old 60dp box was narrower than the pill itself, so
                  // Yoga capped the pill and its amount wrapped to two
                  // lines. 104dp always fits icon + "+132.10" + markers.
                  left: (b.x + fp.w) * cellSize - 44,
                  top: b.y * cellSize - 14,
                  width: 104,
                  height: 60,
                  alignItems: "center",
                  justifyContent: "center",
                  // Above ALL building art: depth-sorted buildings carry
                  // zIndex up to ~gridH*cellSize inside their layer, so the
                  // badge layer must sit higher still.
                  zIndex: 2000,
                  elevation: 2000,
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
        )}
        </WalkableTownShell>
        </SeasonalBorder>
        {/* The Welcoming Town (v271): the while-you-were-gone report —
            the town telling him, through its people, what it did while
            he was away. The coins it names are already sitting in the
            buildings' piles, waiting for his tap; the card collects
            nothing. It stays until he closes it. */}
        {activeMap === "town" && awayReport && (
          <View
            style={{
              position: "absolute",
              top: insets.top + 64,
              left: 16,
              right: 16,
              zIndex: 2000000,
              backgroundColor: pt.card,
              borderColor: pt.border,
              borderWidth: 1,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
              shadowColor: "#000000",
              shadowOpacity: 0.18,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: pt.text }}>Welcome back</Text>
              <Pressable
                onPress={() => setAwayReport(null)}
                hitSlop={8}
                accessibilityLabel="Close the welcome-back report"
                style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: pt.bg }}
              >
                <MaterialIcons name="close" size={15} color={pt.subtext} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: pt.subtext, marginTop: 2 }}>While you were gone</Text>
            <View style={{ marginTop: 8, gap: 3 }}>
              {awayReport.lines.map((line, i) => (
                <Text key={i} style={{ fontSize: 13.5, lineHeight: 19, color: pt.text }}>
                  {line}
                </Text>
              ))}
            </View>
            {awayReport.totalWaiting > 0 && (
              <Text style={{ fontSize: 13.5, fontWeight: "800", color: "#B45309", marginTop: 9 }}>
                {formatWholeCoins(awayReport.totalWaiting)} coins are waiting for you
              </Text>
            )}
          </View>
        )}
        {activeMap === "town" && (
          <MapSigns
            activeMap={activeMap}
            unlockedMaps={unlockedMaps}
            onSelectMap={handleMapSignSelect}
            hideCity={!cityExists(prestigeLevel)}
          />
        )}
      </View>
      )}

      {/* Town mini-games: the Community Garden and Mercy's Shore live on
          the map itself, so their Play entries sit right below it. */}
      {activeMap === "town" && (
        <>
          <PlayCard
            icon="local-florist"
            title="Play: Garden Tending"
            blurb="At the Community Garden — water the thirsty, pull the weeds, and coax every plot into bloom. Blooms are gathered into the collections book."
            playsLeft={gardenPlaysLeft}
            cap={MINI_GAME_CAPS.garden}
            accent="#65A30D"
            onPlay={() => { gardenBloomKindsRef.current = []; setPlayingGarden(true); }}
            gameId="garden"
          />
          {playingGarden && (
            <GardenGame accent="#65A30D" onComplete={handleGardenGameComplete} onExit={() => setPlayingGarden(false)} onBloom={handleGardenBloom} />
          )}
          <PlayCard
            icon="waves"
            title="Play: Tide Pools"
            blurb="At Mercy's Shore — shells and starfish surface in the pools at low tide. Gather them for the collections book, and mind the crabs."
            playsLeft={tidePlaysLeft}
            cap={MINI_GAME_CAPS.tide}
            accent="#0284C7"
            onPlay={() => setPlayingTide(true)}
            gameId="tide"
          />
          {playingTide && (
            <TideGame accent="#0284C7" onComplete={handleTideGameComplete} onExit={() => setPlayingTide(false)} onShellUpdate={handleTideShellUpdate} />
          )}
        </>
      )}

      {selectedTile && activeMap !== "reserve" && activeMap !== "forest" && activeMap !== "city" && activeMap !== "town" && activeMap !== "mall" && activeMap !== "well" && activeMap !== "school" && (
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
                <PaperBuildingArt type={type} size={32} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={{ fontWeight: "600", color: pt.text }}>{def.name}</Text>
                  <Text style={{ fontSize: 12, color: pt.subtext }}>{def.description}</Text>
                  <Text style={{ fontSize: 11, color: pt.subtext }}>Builds in 1 min</Text>
                </View>
                <Text style={{ fontWeight: "700", color: pt.text }}>🪙{formatCoins(def.cost)}</Text>
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
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "#B45309" }}>🪙 {formatCoins(scaledCoins(m.rewardCoins))}</Text>
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
                            {a.kind === "restock" ? ` — ${(a.boxesDelivered ?? 0)} ${(a.boxesDelivered ?? 0) === 1 ? "box" : "boxes"} delivered` : ""}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                            <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                              <Text style={{ fontSize: 13, fontWeight: "700", color: "#B45309" }}>🪙 {formatCoins(def.rewardCoins + (a.bonusCoins ?? 0))}</Text>
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
                  Alert.alert("Not enough coins", `You need ${upgradeCost} coins. You have ${formatCoins(coins.balance)}.`);
                  return;
                }
                const updated = map.buildings.map(x => x.id === b.id ? beginConstruction(x, nextLevel, Date.now()) : x);
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
                  Alert.alert("Not enough coins", `Hiring costs ${formatCoins(scaledCoins(WORKER_HIRE_COST))} coins. You have ${formatCoins(coins.balance)}.`);
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
                            Storage: {formatCoins(stored)}/{formatCoins(cap)}
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
                    const sheetNow = Date.now();
                    const stock = currentStockForBuilding(town.stockByBuilding, town.stockAnchorsByBuilding, b.id, level, sheetNow);
                    const ratio = cap > 0 ? Math.min(1, stock / cap) : 0;
                    const empty = stock <= 0;
                    const stockedToday = isStockedToday(town.stockedDateByBuilding, b.id, sheetNow);
                    return (
                      <View style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                          <MaterialIcons name="inventory" size={14} color={pt.subtext} />
                          <Text style={{ fontSize: 13, color: pt.subtext, fontWeight: "600", marginLeft: 4 }}>
                            Stock: {Math.round(stock)}/{cap}
                          </Text>
                          <Text style={{ fontSize: 12, color: pt.subtext, marginLeft: 6 }}>
                            {stockedToday
                              ? "Stocked today — +50% income until midnight"
                              : empty
                                ? "regular income"
                                : "fill to 100% to earn the +50% bonus"}
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
                          {stockedToday
                            ? "Stocked for today — the +50% bonus holds until midnight, even as the shelves empty."
                            : empty
                              ? "Shelves are empty — assign a villager to Restock and they'll bring boxes from the church."
                              : "Assign a villager to Restock to top the shelves up to 100% — they carry boxes from the church."}
                        </Text>
                      </View>
                    );
                  })()}
                  {b.type === "church" ? (
                    <Text style={{ fontSize: 14, color: pt.subtext, marginBottom: 16 }}>
                      🙏 {prayedToday} prayed for today (+{formatCoins((prayedToday * CHURCH_PRAYER_COINS_PER_HOUR))} coins/hour){!isMax ? ` — upgrade to ${churchNameFor(nextLevel)}` : " — a warm Community Church, full of light!"}
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
                        ⬆️ Upgrade to {b.type === "house" ? houseNameFor(nextLevel) : b.type === "church" ? churchNameFor(nextLevel) : `Lv ${nextLevel}`} 🪙{formatCoins(upgradeCost)}
                      </Text>
                      <Text style={{ color: "#E9E4FF", fontSize: 12, marginTop: 2 }}>
                        {incomeLabelFor(preview)} · {constructionTimeLabel(nextLevel, false)} — closes while building
                      </Text>
                    </Pressable>
                  )}
                  {b.type !== "house" && (
                    <Pressable
                      onPress={doHireWorker}
                      style={{ backgroundColor: pt.bg, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 10 }}
                    >
                      <Text style={{ color: pt.text, fontWeight: "700", fontSize: 16 }}>
                        👷 Hire Worker 🪙{formatCoins(scaledCoins(WORKER_HIRE_COST))} ({workerCount}/{MAX_WORKERS_PER_BUILDING})
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
                              Alert.alert("Not enough coins", `This costs ${formatCoins(merchantDeal.price)} coins. You have ${formatCoins(coins.balance)}.`);
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
                            Buy for {formatCoins(merchantDeal.price)} coins
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
              {/* Prestige — the Crown multiplier */}
              {prestigeLevel > 0 ? (
                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                  <MaterialIcons name="workspace-premium" size={20} color="#B8912C" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 15, color: "#1F2937" }}>Prestige — Crown {prestigeLevel}</Text>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>Earned by beginning again after a fast of 365 days or more</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#92400E" }}>
                    x{prestigeMultiplier(prestigeLevel)}
                  </Text>
                </View>
              ) : null}
              {/* Devotion bonus — permanent % from sub-Crown prestiges */}
              {prestigeDevotion > 0 ? (
                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                  <MaterialIcons name="favorite" size={20} color="#B8912C" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 15, color: "#1F2937" }}>Devotion bonus</Text>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>Earned by beginning again after shorter fasts — it never fades</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#92400E" }}>
                    +{Math.round(prestigeDevotion * 100)}%
                  </Text>
                </View>
              ) : null}
              {/* Gilded Badge — the Gilded Regent's permanent income blessing */}
              {ownedBadges.includes("gilded") ? (
                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                  <MaterialIcons name="monetization-on" size={20} color="#B45309" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 15, color: "#1F2937" }}>Gilded Badge</Text>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>Won from the Gilded Regent in the Dark Forest — building income, forever</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#92400E" }}>
                    +{Math.round((GILDED_INCOME_MULT - 1) * 100)}%
                  </Text>
                </View>
              ) : null}
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
              {/* Depth Blessing — the mine's depth blesses the town (v175) */}
              {mineDepthLevels > 1 ? (
                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                  <MaterialIcons name="terrain" size={20} color="#92400E" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 15, color: "#1F2937" }}>Depth Blessing</Text>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>{mineDepthLevels} levels opened beneath the mountain — a quarter percent each, up to +20%</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#92400E" }}>
                    +{Math.round(depthBlessingBonusForLevels(mineDepthLevels) * 10000) / 100}%
                  </Text>
                </View>
              ) : null}
              {/* Game set — all twelve of today's games played blesses
                  the town +10% for the day (v200) */}
              {setToday.progress > 0 ? (
                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                  <MaterialIcons name="sports-esports" size={20} color="#92400E" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 15, color: "#1F2937" }}>Game Set</Text>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>
                      {setToday.complete
                        ? "All twelve of today's games played — the town earns +10% today"
                        : `${setToday.progress} of ${setToday.total} of today's games played — finish the set for +10%`}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#92400E" }}>
                    {setToday.complete ? "+10%" : `${setToday.progress}/${setToday.total}`}
                  </Text>
                </View>
              ) : null}
              {/* Stock: Restock villagers carry boxes from the church;
                  a shop whose shelves reach 100% is stocked for the day
                  and earns +50% until midnight (per-building, not global). */}
              {workState && (anySupplySiteStaffed(workState.assignments) || workState.assignments.some((a) => a.kind === "restock" && a.status !== "done") || TOWN_MAP_IDS.some((mid) => (town.maps[mid]?.buildings ?? []).some((sb) => isStockedBuildingType(sb.type) && isStockedToday(town.stockedDateByBuilding, sb.id, Date.now())))) ? (
                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                  <MaterialIcons name="inventory" size={20} color="#166534" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 15, color: "#1F2937" }}>Stocked shelves</Text>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>Fill a shop to 100% and it earns +50% until midnight — assign a villager to Restock; they bring boxes from the church</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#92400E" }}>
                    +50%
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
                gardenVisitMult(gardenVisits) *
                totalPrestigeMultiplier(prestigeLevel, prestigeDevotion) *
                (depthBlessingMultiplierForLevels(mineDepthLevels) + (setToday.complete ? SET_BONUS_RATE : 0)) *
                (ownedBadges.includes("gilded") ? GILDED_INCOME_MULT : 1);
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
      {/* Begin Again — prestige confirmation (never one-tap) */}
      <Modal
        visible={beginAgainOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBeginAgainOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 }}
          onPress={() => setBeginAgainOpen(false)}
        >
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, width: "100%", maxHeight: "80%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialIcons name="workspace-premium" size={22} color="#B8912C" />
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#92400E", marginLeft: 8 }}>Begin Again</Text>
              </View>
              <Pressable onPress={() => setBeginAgainOpen(false)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView>
              {prestigeOfferState ? (
                <>
                  {prestigeOfferState.kind === "crown" ? (
                    <Text style={{ fontSize: 15, color: "#1F2937", lineHeight: 21 }}>
                      Your {prestigeOfferState.durationDays}-day fast has earned a{" "}
                      <Text style={{ fontWeight: "800" }}>Crown</Text>. Begin again as{" "}
                      <Text style={{ fontWeight: "800" }}>Crown {prestigeLevel + 1}</Text> — every coin your town earns is multiplied{" "}
                      <Text style={{ fontWeight: "800" }}>x{totalPrestigeMultiplier(prestigeLevel + 1, prestigeDevotion)}</Text>, forever.
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 15, color: "#1F2937", lineHeight: 21 }}>
                      Your {prestigeOfferState.durationDays}-day fast earns a permanent{" "}
                      <Text style={{ fontWeight: "800" }}>+{Math.round(prestigeOfferState.bonus * 100)}% income bonus</Text> — your devotion
                      bonus would become{" "}
                      <Text style={{ fontWeight: "800" }}>+{Math.round((prestigeDevotion + prestigeOfferState.bonus) * 100)}%</Text> on every coin
                      your town earns, forever.
                    </Text>
                  )}
                  {prestigeOfferState.kind === "crown" && prestigeLevel === 0 ? (
                    <Text style={{ fontSize: 15, color: "#1F2937", lineHeight: 21, marginTop: 10 }}>
                      And the City appears — an endgame of 15,000–40,000 coin plots and upgrades in the hundreds of thousands. Unlocking it costs 50,000 coins.
                    </Text>
                  ) : null}
                  {(() => {
                    const gateBoss = bossGateFor(ownedBadges as string[], throneVictories);
                    const gateBadge = BADGE_BY_ID[gateBoss.badgeId];
                    const cleared = bossClearedFastId === prestigeOfferState.fastId;
                    return cleared ? (
                      <View style={{ backgroundColor: "#F0FDF4", borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: "#4ADE80", flexDirection: "row", alignItems: "center" }}>
                        <MaterialIcons name="check-circle" size={20} color="#166534" />
                        <Text style={{ fontSize: 13.5, color: "#14532D", flex: 1, marginLeft: 8, lineHeight: 19 }}>
                          <Text style={{ fontWeight: "800" }}>Boss Gate cleared.</Text> {gateBoss.name} is defeated and the {gateBadge.name} is yours — the way to begin again stands open.
                        </Text>
                      </View>
                    ) : (
                      <View style={{ backgroundColor: "#FEF2F2", borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: "#F87171" }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <MaterialIcons name="lock" size={18} color="#991B1B" />
                          <Text style={{ fontSize: 13, fontWeight: "900", color: "#991B1B", marginLeft: 6, letterSpacing: 0.6 }}>THE BOSS GATE</Text>
                        </View>
                        <Text style={{ fontSize: 13.5, color: "#7F1D1D", lineHeight: 19, marginTop: 6 }}>
                          Before you can begin again, <Text style={{ fontWeight: "800" }}>{gateBoss.displayName}, {gateBadge.bossTitle}</Text> must fall in the Dark Forest. Enter the forest, face the boss at the gate, and victory earns the <Text style={{ fontWeight: "800" }}>{gateBadge.name}</Text> ({gateBadge.perk}) — yours forever.
                        </Text>
                      </View>
                    );
                  })()}
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#991B1B", marginTop: 14, letterSpacing: 0.4 }}>WHAT RESETS</Text>
                  {[
                    "Every building in town and the city — plots return to the start",
                    "Building levels and all shop stock",
                    "Your spendable coin balance (back to 0)",
                    "All owned gear — weapons, armor and clothing return to the shops",
                    "The City unlock — it must be bought again for 50,000 coins",
                  ].map((line) => (
                    <View key={line} style={{ flexDirection: "row", marginTop: 6 }}>
                      <MaterialIcons name="remove-circle-outline" size={16} color="#991B1B" />
                      <Text style={{ fontSize: 14, color: "#374151", flex: 1, marginLeft: 8, lineHeight: 19 }}>{line}</Text>
                    </View>
                  ))}
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#166534", marginTop: 14, letterSpacing: 0.4 }}>WHAT YOU KEEP</Text>
                  {[
                    "Your Crowns and devotion bonus — and the income they carry",
                    "Your prayer streak, XP and level",
                    "Your collections book",
                    "The Garden of Remembrance, just as you left it",
                    "Your prayer villagers and everything they carry",
                    "Your boss badges — prestige can never take them",
                    "Your barbershop styles — including Crown hairstyles and beards",
                    "The Well, Garden, Mission Field, Dark Forest and River of Life",
                    "Your fasts",
                  ].map((line) => (
                    <View key={line} style={{ flexDirection: "row", marginTop: 6 }}>
                      <MaterialIcons name="check-circle" size={16} color="#166534" />
                      <Text style={{ fontSize: 14, color: "#374151", flex: 1, marginLeft: 8, lineHeight: 19 }}>{line}</Text>
                    </View>
                  ))}
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 15, color: "#1F2937", lineHeight: 21 }}>
                    Begin again when a fast ends — or during one — and the fast's length sets your reward. Each fast can grant its reward once.
                  </Text>
                  {[
                    { label: "Fast under 40 days", value: "+5% income, forever" },
                    { label: "Fast of 40–364 days", value: "+25% income, forever" },
                    { label: "Fast of 365 days or more", value: "A Crown — income x2, and the City" },
                  ].map((row) => (
                    <View key={row.label} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                      <MaterialIcons name="workspace-premium" size={18} color="#B8912C" />
                      <Text style={{ fontSize: 14, color: "#1F2937", flex: 1, marginLeft: 10 }}>{row.label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#92400E" }}>{row.value}</Text>
                    </View>
                  ))}
                  {(prestigeLevel > 0 || prestigeDevotion > 0) ? (
                    <Text style={{ fontSize: 14, color: "#6B7280", lineHeight: 20, marginTop: 10 }}>
                      You carry {prestigeLevel > 0 ? `${prestigeLevel} Crown${prestigeLevel === 1 ? "" : "s"}` : "no Crowns yet"}
                      {prestigeDevotion > 0 ? ` and a +${Math.round(prestigeDevotion * 100)}% devotion bonus` : ""} — start another fast to begin again.
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 14, color: "#6B7280", lineHeight: 20, marginTop: 10 }}>
                      Start a fast, and Begin Again will be waiting here — and offered to you when the fast ends.
                    </Text>
                  )}
                  {prestigeLevel === 0 ? (
                    <Text style={{ fontSize: 14, color: "#6B7280", lineHeight: 20, marginTop: 10 }}>
                      The City does not exist yet. It appears after your first Crown — the endgame, priced for those who began again.
                    </Text>
                  ) : null}
                </>
              )}
            </ScrollView>
            {prestigeOfferState ? (() => {
              const gateBoss = bossGateFor(ownedBadges as string[], throneVictories);
              const cleared = bossClearedFastId === prestigeOfferState.fastId;
              return (
                <Pressable
                  onPress={cleared ? handlePrestige : undefined}
                  style={{ backgroundColor: cleared ? "#B8912C" : "#9CA3AF", borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 16, flexDirection: "row", justifyContent: "center" }}
                >
                  <MaterialIcons name={cleared ? "workspace-premium" : "lock"} size={18} color="#FFFFFF" />
                  <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15, marginLeft: 6 }}>
                    {cleared
                      ? prestigeOfferState.kind === "crown"
                        ? `Begin Again — Crown ${prestigeLevel + 1}`
                        : `Begin Again — +${Math.round(prestigeOfferState.bonus * 100)}% forever`
                      : `Defeat ${gateBoss.name} to Begin Again`}
                  </Text>
                </Pressable>
              );
            })() : null}
            <Pressable
              onPress={() => setBeginAgainOpen(false)}
              style={{ borderRadius: 12, paddingVertical: 11, alignItems: "center", marginTop: 8 }}
            >
              <Text style={{ color: "#6B7280", fontWeight: "700", fontSize: 14 }}>{prestigeOfferState ? "Not yet" : "Close"}</Text>
            </Pressable>
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
                      <Text style={{ fontSize: 15, fontWeight: "700", color: "#92400E", marginLeft: 4 }}>{formatCoins((b.accumulated || 0))}</Text>
                    </View>
                  </View>
                ))}
            </ScrollView>
            {/* Collect All only appears once enough coins are waiting —
                smaller amounts are still collectible per building. */}
            {town.maps[activeMap].buildings.reduce(
              (s, b) => s + (xpIncomeFor(b.type, b.level || 1) > 0 ? 0 : b.accumulated || 0),
              0
            ) > COLLECT_ALL_MIN && (
              <Pressable
                onPress={() => { setCollectBreakdownOpen(false); handleCollectAll(); }}
                style={{ backgroundColor: "#D4AF37", borderRadius: 12, paddingVertical: 12, marginTop: 16, alignItems: "center" }}
              >
                <Text style={{ fontWeight: "800", fontSize: 15, color: "#FFFFFF" }}>
                  Collect {formatCoins(town.maps[activeMap].buildings.reduce((s, b) => s + (b.accumulated || 0), 0))}
                </Text>
              </Pressable>
            )}
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
            {/* The Street & The Café (v279): his real week with this
                person, dotted — the sheet's Step 6. Only what the
                record proves is filled (the prayed-dates log + the
                last completion date); before the log grows, the strip
                honestly shows the one day it can prove. */}
            {(() => {
              const person = prayerVillagerInfo ? cafePersonById.get(String(prayerVillagerInfo.id)) : undefined;
              if (!person) return null;
              const strip = weekStripFor(person, cafeDay);
              return (
                <View style={{ marginTop: 14, alignItems: "center" }}>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {strip.days.map((day) => (
                      <View
                        key={day.date}
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: day.prayed ? "#31C48D" : "transparent",
                          borderWidth: 1.5,
                          borderColor: day.prayed ? "#31C48D" : pt.subtext,
                        }}
                      />
                    ))}
                  </View>
                  <Text style={{ color: pt.subtext, fontSize: 12, marginTop: 6 }}>
                    Prayed {strip.count} of the last 7 days
                  </Text>
                </View>
              );
            })()}
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
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>💛 Say Thanks (+{formatCoins(LIGHT_TAP_COINS)} coins)</Text>
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
                          {def.durationLabel}  ·  🪙{formatCoins(def.rewardCoins)}  ·  ⚡{def.rewardXP} XP
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

      {/* Work shift mini-game — tap fast for 10 seconds to earn coins.
          Self-contained (components/work-shift-game.tsx): its countdown
          and tap counter re-render only the game card, never the town,
          and the reward is granted once via onComplete. */}
      <WorkShiftGame
        visible={workShiftBuilding !== null}
        cardColor={pt.card}
        textColor={pt.text}
        subtextColor={pt.subtext}
        trackColor={pt.bg}
        onComplete={(earned) => {
          if (earned > 0 && workShiftBuilding) {
            addCoins(earned);
            const updated = { ...workShifts, [workShiftBuilding.id]: Date.now() };
            setWorkShifts(updated);
            AsyncStorage.setItem(WORK_SHIFT_KEY, JSON.stringify(updated)).catch(() => undefined);
          }
        }}
        onClose={() => setWorkShiftBuilding(null)}
      />

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
                      {blessed ? "Blessed today — come back tomorrow" : `Receive its blessing (+${formatCoins(reward)} coins)`}
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
                        Upgrade to level {level + 1} ({formatCoins(upgradeCost)} coins)
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
                      Unlock this plot and open the {def.name}. Lot buildings have a fixed home here — they can't be moved or sold, only upgraded. Builds in 1 min once purchased.
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, marginBottom: 12, backgroundColor: pt.bg, borderWidth: 1, borderColor: pt.border }}>
                      {lot.presetType === "banquet-table" ? (
                        <View style={{ marginRight: 14 }}><BanquetGlyph size={44} /></View>
                      ) : lot.presetType === "community-garden" ? (
                        <View style={{ marginRight: 14 }}><GardenGlyph size={44} /></View>
                      ) : lot.presetType === "fountain-plaza" ? (
                        <View style={{ marginRight: 14 }}><PlazaGlyph size={44} /></View>
                      ) : (
                        <View style={{ width: 48, height: 48, marginRight: 14, alignItems: "center", justifyContent: "flex-end" }}>
                          <BuildingArt type={lot.presetType} size={48} level={1} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: "800", color: pt.text }}>{def.name}</Text>
                        <Text style={{ fontSize: 13, color: pt.subtext, marginTop: 2 }}>
                          {def.description}
                        </Text>
                        <Text style={{ fontSize: 12, color: pt.subtext, marginTop: 4 }}>
                          Plot 🪙{formatCoins(scaledCoins(lot.cost))} + building 🪙{formatCoins(scaledCoins(def.cost))}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => purchaseOnLot(lot, lot.presetType!)}
                      style={({ pressed }) => [{ borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: affordable ? "#D4AF37" : pt.border, opacity: pressed ? 0.85 : 1 }]}
                    >
                      <Text style={{ color: affordable ? "#FFFFFF" : pt.subtext, fontWeight: "800", fontSize: 16 }}>
                        Unlock for 🪙{formatCoins(total)}
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
                { title: "Shops", types: ["shop", "market", "bookstore"] },
                { title: "Services", types: ["bank", "barbershop"] },
                { title: "Crafts", types: ["carpenter", "pottery", "tailor", "apothecary"] },
                { title: "Community", types: ["music-hall", "observatory"] },
                { title: "Homes", types: ["villager-cottage"] },
                { title: "Special", types: ["church", "pawn-house", "farm", "house"] },
              ];
              // Any available type the fixed groups don't know (the Ministry
              // Row buildings above all) still gets a row — without this, a
              // converted lot whose preset is already owned rendered an
              // empty modal with nothing to tap.
              const groupedTypes = new Set(groups.flatMap((g) => g.types));
              const ungrouped = available.filter((t) => !groupedTypes.has(t));
              if (ungrouped.length > 0) groups.push({ title: "More", types: ungrouped });
              return (
                <>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: pt.text, textAlign: "center" }}>
                    {lot.name} — FOR SALE
                  </Text>
                  <Text style={{ fontSize: 13, color: pt.subtext, textAlign: "center", marginTop: 6, marginBottom: 12 }}>
                    Purchase this lot for {formatCoins(scaledCoins(lot.cost))} coins and choose what to build. Lot buildings have a fixed home here — they can't be moved or sold, only upgraded. New buildings take 1 min to build.
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
                            // Duplicates stay buyable — the badge just says
                            // how many already stand, counted live from the
                            // town state on every render of this sheet.
                            const ownedCount = countBuildingsOfType(map.buildings, type);
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
                                <View style={{ width: 40, height: 40, marginRight: 12, alignItems: "center", justifyContent: "flex-end" }}>
                                  <BuildingArt type={type} size={40} level={1} />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                                    <Text style={{ fontSize: 15, fontWeight: "700", color: pt.text }}>{def.name}</Text>
                                    {ownedCount > 0 ? (
                                      <View style={{ marginLeft: 8, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: pt.border }}>
                                        <Text style={{ fontSize: 10, fontWeight: "700", color: pt.subtext }}>In your town ×{ownedCount}</Text>
                                      </View>
                                    ) : null}
                                  </View>
                                  <Text style={{ fontSize: 12, color: pt.subtext }}>
                                    {effectiveIncomeFor({ type, level: 1 } as PlacedBuilding) > 0 ? `+${effectiveIncomeFor({ type, level: 1 } as PlacedBuilding)}/day` : xpIncomeFor(type, 1) > 0 ? `+${xpIncomeFor(type, 1)} XP/day` : def.description}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 15, fontWeight: "800", color: affordable ? "#B8860B" : "#EF4444" }}>
                                  🪙{formatCoins(total)}
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
        can cross into the header; isolated in its own memoized component
        (v164) so flights never re-render the town; never touches money. */}
    <CoinFlyOverlay ref={flyOverlayRef} />
    </View>
  );
}
