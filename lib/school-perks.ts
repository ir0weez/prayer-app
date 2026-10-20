// School Campus perks: each campus building blesses a system elsewhere in
// the game while it stands. Perks are read from the campus buildings at
// grant time — never snapshotted into the other systems — through this
// small helper, following the badge-cache pattern (lib/badges.ts): an async
// loader for handlers that can await, and a sync cache for the ones that
// can't (mini-game completion callbacks are synchronous).

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  TOWN_STORAGE_KEY,
  parseTown,
  type PlacedBuilding,
} from "./hometown";

export type SchoolPerks = {
  /** Scripture Classroom level (0 = unbuilt). */
  classroomLevel: number;
  libraryBuilt: boolean;
  musicRoomBuilt: boolean;
  scienceLabBuilt: boolean;
  artStudioBuilt: boolean;
  gymnasiumBuilt: boolean;
  /** Complete the Verse reward multiplier (Scripture Classroom, by level). */
  verseMult: number;
  /** Bible Study Hall "Join the Study" multiplier (Library). */
  studyMult: number;
  /** Rhythm of Worship payout multiplier (Music Room). */
  rhythmMult: number;
  /** Collections completion payout multiplier (Art Studio). */
  collectionsMult: number;
  /** Garden Tending records an extra flower per completed session (Science Lab). */
  gardenExtraBloom: boolean;
  /** Training Reps forest buff multiplier (Gymnasium: 1.2; otherwise 1.1). */
  trainingMult: number;
};

/** Complete the Verse boost by Scripture Classroom level: +10% / +25% / +40%. */
export const VERSE_MULT_BY_CLASSROOM_LEVEL: Record<number, number> = {
  0: 1,
  1: 1.1,
  2: 1.25,
  3: 1.4,
};
export const STUDY_MULT = 1.25;
export const RHYTHM_MULT = 1.25;
export const COLLECTIONS_MULT = 1.25;
export const TRAINING_MULT_BASE = 1.1;
export const TRAINING_MULT_GYMNASIUM = 1.2;

/** Pure: derive the campus perks from a list of school-map buildings. */
export function perksForSchoolBuildings(buildings: PlacedBuilding[]): SchoolPerks {
  const find = (type: string) => buildings.find((b) => b.type === type);
  const classroom = find("classroom");
  const classroomLevel = classroom
    ? Math.min(Math.max(classroom.level || 1, 1), 3)
    : 0;
  const libraryBuilt = !!find("library");
  const musicRoomBuilt = !!find("music-room");
  const scienceLabBuilt = !!find("science-lab");
  const artStudioBuilt = !!find("art-studio");
  const gymnasiumBuilt = !!find("gymnasium");
  return {
    classroomLevel,
    libraryBuilt,
    musicRoomBuilt,
    scienceLabBuilt,
    artStudioBuilt,
    gymnasiumBuilt,
    verseMult: VERSE_MULT_BY_CLASSROOM_LEVEL[classroomLevel] ?? 1,
    studyMult: libraryBuilt ? STUDY_MULT : 1,
    rhythmMult: musicRoomBuilt ? RHYTHM_MULT : 1,
    collectionsMult: artStudioBuilt ? COLLECTIONS_MULT : 1,
    gardenExtraBloom: scienceLabBuilt,
    trainingMult: gymnasiumBuilt ? TRAINING_MULT_GYMNASIUM : TRAINING_MULT_BASE,
  };
}

/** Load the campus perks fresh from town storage. */
export async function loadSchoolPerks(): Promise<SchoolPerks> {
  try {
    const raw = await AsyncStorage.getItem(TOWN_STORAGE_KEY);
    if (!raw) return perksForSchoolBuildings([]);
    const town = parseTown(JSON.parse(raw));
    return perksForSchoolBuildings(town.maps.school.buildings);
  } catch {
    return perksForSchoolBuildings([]);
  }
}

// ---- Sync cache (badge pattern): refreshed on hometown load/map changes
// and whenever an interior that grants a perk mounts. ----

let cachedPerks: SchoolPerks = perksForSchoolBuildings([]);

export function getCachedSchoolPerks(): SchoolPerks {
  return cachedPerks;
}

export function cacheSchoolPerks(perks: SchoolPerks): void {
  cachedPerks = perks;
}

export async function refreshSchoolPerksCache(): Promise<SchoolPerks> {
  const perks = await loadSchoolPerks();
  cachedPerks = perks;
  return perks;
}
