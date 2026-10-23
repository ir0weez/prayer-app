// v201 — the Stained Glass keyword scene registry. Every scene id
// the schedule can route (lib/paper-keywords.ts — the SAME routing
// the Paper, 8-bit and Terminal skins use, one source of truth)
// resolves here to a bespoke leaded-glass rendition drawn with
// components/glass-kit.tsx: jewel-tone panes in dark lead, a cream
// label pane under the card's words, light shimmering across the
// glass. Sopranos leads in glass-scenes-tv.tsx (the flagship: the
// house, the sapphire pool, the ducks — in panes, not paint).
//
// The Dark Forest is NOT here and never will be: it keeps its own
// pixel rendering untouched. Hometown and the avatars are exempt.

import type { ReactNode } from "react";

import {
  GC,
  GDot,
  GLine,
  GP,
  GPoly,
  GlassSceneRoot,
  GLASS_AMBER,
  GLASS_AMBER_LT,
  GLASS_AMBER_PALE,
  GLASS_CREAM,
  GLASS_RUBY,
  GLASS_SAPPHIRE_LT,
  GLASS_VIOLET_LT,
} from "@/components/glass-kit";
import { paperSceneIdFor, type PaperSceneId } from "@/lib/paper-keywords";

import {
  GlassBBQScene,
  GlassFastScene,
  GlassWorshipScene,
  GlassBibleStudyScene,
  GlassTherapyScene,
  GlassDoctorScene,
  GlassHaircutScene,
  GlassGardeningScene,
  GlassMowLawnScene,
  GlassPruneScene,
  GlassHarvestScene,
  GlassParkScene,
  GlassPartyScene,
  GlassSchoolScene,
  GlassWaterParkScene,
  GlassBeachScene,
  GlassBabyShowerScene,
  GlassBirthdayScene,
  GlassChristmasScene,
  GlassEasterScene,
  GlassSunriseServiceScene,
  GlassThanksgivingScene,
  GlassWeddingScene,
  GlassMemorialScene,
  GlassMeetingScene,
  GlassWorkoutScene,
  GlassBasketballScene,
  GlassSoccerScene,
  GlassGameScene,
  GlassScaryMovieScene,
  GlassChristmasMovieScene,
  GlassChristmasBreakfastScene,
  GlassChristmasDinnerScene,
  GlassFullMoonScene,
  GlassPrayerScene,
  GlassOutreachScene,
  GlassConcertScene,
  GlassHotelScene,
  GlassShowerScene,
  GlassStudyScene,
  GlassGraduationScene,
  GlassVisitScene,
  GlassReachOutScene,
  GlassCleanScene,
  GlassWashCarScene,
  GlassGetGasScene,
  GlassGroceryScene,
  GlassNewYearScene,
  GlassValentinesScene,
  GlassHalloweenScene,
  GlassStPatricksScene,
} from "@/components/glass-scenes-labels";

import {
  GlassTdTvDinnerScene,
  GlassTdBurritoScene,
  GlassTdTostadasScene,
  GlassTdTacosScene,
  GlassTdPizzaScene,
  GlassTdSandwichScene,
  GlassTdSaladScene,
  GlassTdPastaScene,
  GlassTdPancakesScene,
  GlassTdSoupScene,
  GlassTdEggsScene,
  GlassTdMexicanPizzaScene,
  GlassTdPupusasScene,
  GlassTdSteakScene,
  GlassTdRoastChickenScene,
  GlassTdMeatloafScene,
  GlassTdPotRoastScene,
  GlassTdCasseroleScene,
  GlassTdHotDogScene,
  GlassTdNachosScene,
  GlassTdQuesadillaScene,
  GlassTdHotWingsScene,
  GlassTdRamenScene,
  GlassTdStirFryScene,
  GlassTdFriedRiceScene,
  GlassTdOatmealScene,
  GlassTdCerealScene,
  GlassRestTacoScene,
  GlassRestSandwichScene,
  GlassRestPizzaScene,
  GlassRestChickenScene,
  GlassRestDonutScene,
  GlassRestCoffeeScene,
  GlassRestSushiScene,
  GlassRestChineseScene,
  GlassRestDinerScene,
  GlassRestDessertScene,
  GlassRestItalianScene,
  GlassRestSeafoodScene,
  GlassRestHealthyScene,
  GlassRestIndianScene,
} from "@/components/glass-scenes-food";

import {
  GlassTvGenericScene,
  GlassTvDexterNewBloodScene,
  GlassTvDexterOriginalSinScene,
  GlassTvDexterResurrectionScene,
  GlassTvDexterScene,
  GlassTvWalkingDeadScene,
  GlassTvChosenScene,
  GlassTvBearScene,
  GlassTvSopranosScene,
  GlassTvSkinsScene,
  GlassTvGotScene,
  GlassTvDbzScene,
  GlassTvSoaScene,
  GlassTvReacherScene,
  GlassTvFromScene,
  GlassTvDaredevilScene,
  GlassTvPluribusScene,
  GlassTvBreakingBadScene,
  GlassTvBetterCallSaulScene,
  GlassTvFalloutScene,
  GlassTvTedLassoScene,
  GlassTvOnePieceScene,
  GlassTvStrangerThingsScene,
  GlassTvBlueyScene,
  GlassTvDuggeeScene,
  GlassTvAvatarScene,
  GlassTvYellowstoneScene,
  GlassTvBoysScene,
  GlassTvYouScene,
  GlassTvChuckyScene,
  GlassTvLostScene,
  GlassTvPrisonBreakScene,
  GlassTvItDerryScene,
  GlassTvCarrieScene,
  GlassTvHarryPotterScene,
  GlassTvWednesdayScene,
  GlassTvVampireDiariesScene,
  GlassTvOriginalsScene,
  GlassTvLegaciesScene,
} from "@/components/glass-scenes-tv";

import {
  GlassChurchScene,
  GlassPhotoScene,
  GlassTravelScene,
  GlassBreakfastScene,
  GlassLunchScene,
  GlassDinnerScene,
  GlassTdBurgerScene,
  GlassParkKnottsScene,
  GlassParkSixFlagsScene,
  GlassParkDisneyScene,
  GlassParkUniversalScene,
  GlassParkLegolandScene,
  GlassParkSeaworldScene,
  GlassParkGenericScene,
  GlassMovieGenericScene,
  GlassTheaterGenericScene,
  GlassMvResidentEvilScene,
  GlassMvBuddyScene,
  GlassMvBlackPhoneScene,
  GlassMvBackroomsScene,
  GlassMvExit8Scene,
  GlassMvDeadpoolScene,
  GlassMvFnafScene,
  GlassMvIronLungScene,
  GlassMvNimrodsScene,
  GlassMvIdiotsScene,
  GlassMvNobodyScene,
  GlassMvMarioScene,
  GlassMvToyStoryScene,
  GlassMvZootopiaScene,
  GlassMvSpidermanScene,
  GlassMvAvengersDoomsdayScene,
  GlassMvShrekScene,
  GlassMvHungerGamesScene,
  GlassMvStreetFighterScene,
  GlassMvWildwoodScene,
} from "@/components/glass-scenes-screen";

export const GLASS_SCENE_REGISTRY: Record<PaperSceneId, () => ReactNode> = {
  "bbq": GlassBBQScene,
  "fast": GlassFastScene,
  "church": GlassChurchScene,
  "worship": GlassWorshipScene,
  "bible-study": GlassBibleStudyScene,
  "therapy": GlassTherapyScene,
  "doctor": GlassDoctorScene,
  "haircut": GlassHaircutScene,
  "gardening": GlassGardeningScene,
  "mow-lawn": GlassMowLawnScene,
  "prune": GlassPruneScene,
  "harvest": GlassHarvestScene,
  "park": GlassParkScene,
  "party": GlassPartyScene,
  "school": GlassSchoolScene,
  "water-park": GlassWaterParkScene,
  "beach": GlassBeachScene,
  "baby-shower": GlassBabyShowerScene,
  "birthday": GlassBirthdayScene,
  "christmas": GlassChristmasScene,
  "easter": GlassEasterScene,
  "sunrise-service": GlassSunriseServiceScene,
  "thanksgiving": GlassThanksgivingScene,
  "wedding": GlassWeddingScene,
  "memorial": GlassMemorialScene,
  "meeting": GlassMeetingScene,
  "workout": GlassWorkoutScene,
  "basketball": GlassBasketballScene,
  "soccer": GlassSoccerScene,
  "game": GlassGameScene,
  "photo": GlassPhotoScene,
  "scary-movie": GlassScaryMovieScene,
  "christmas-movie": GlassChristmasMovieScene,
  "christmas-breakfast": GlassChristmasBreakfastScene,
  "christmas-dinner": GlassChristmasDinnerScene,
  "full-moon": GlassFullMoonScene,
  "prayer": GlassPrayerScene,
  "outreach": GlassOutreachScene,
  "concert": GlassConcertScene,
  "travel": GlassTravelScene,
  "hotel": GlassHotelScene,
  "shower": GlassShowerScene,
  "study": GlassStudyScene,
  "graduation": GlassGraduationScene,
  "visit": GlassVisitScene,
  "reach-out": GlassReachOutScene,
  "clean": GlassCleanScene,
  "wash-car": GlassWashCarScene,
  "get-gas": GlassGetGasScene,
  "grocery": GlassGroceryScene,
  "new-year": GlassNewYearScene,
  "valentines": GlassValentinesScene,
  "halloween": GlassHalloweenScene,
  "st-patricks": GlassStPatricksScene,
  "breakfast": GlassBreakfastScene,
  "lunch": GlassLunchScene,
  "dinner": GlassDinnerScene,
  "td-tv-dinner": GlassTdTvDinnerScene,
  "td-burrito": GlassTdBurritoScene,
  "td-tostadas": GlassTdTostadasScene,
  "td-tacos": GlassTdTacosScene,
  "td-pizza": GlassTdPizzaScene,
  "td-sandwich": GlassTdSandwichScene,
  "td-salad": GlassTdSaladScene,
  "td-pasta": GlassTdPastaScene,
  "td-pancakes": GlassTdPancakesScene,
  "td-soup": GlassTdSoupScene,
  "td-eggs": GlassTdEggsScene,
  "td-mexican-pizza": GlassTdMexicanPizzaScene,
  "td-pupusas": GlassTdPupusasScene,
  "td-steak": GlassTdSteakScene,
  "td-burger": GlassTdBurgerScene,
  "td-roast-chicken": GlassTdRoastChickenScene,
  "td-meatloaf": GlassTdMeatloafScene,
  "td-pot-roast": GlassTdPotRoastScene,
  "td-casserole": GlassTdCasseroleScene,
  "td-hot-dog": GlassTdHotDogScene,
  "td-nachos": GlassTdNachosScene,
  "td-quesadilla": GlassTdQuesadillaScene,
  "td-hot-wings": GlassTdHotWingsScene,
  "td-ramen": GlassTdRamenScene,
  "td-stir-fry": GlassTdStirFryScene,
  "td-fried-rice": GlassTdFriedRiceScene,
  "td-oatmeal": GlassTdOatmealScene,
  "td-cereal": GlassTdCerealScene,
  "rest-taco": GlassRestTacoScene,
  "rest-sandwich": GlassRestSandwichScene,
  "rest-pizza": GlassRestPizzaScene,
  "rest-chicken": GlassRestChickenScene,
  "rest-donut": GlassRestDonutScene,
  "rest-coffee": GlassRestCoffeeScene,
  "rest-sushi": GlassRestSushiScene,
  "rest-chinese": GlassRestChineseScene,
  "rest-diner": GlassRestDinerScene,
  "rest-dessert": GlassRestDessertScene,
  "rest-italian": GlassRestItalianScene,
  "rest-seafood": GlassRestSeafoodScene,
  "rest-healthy": GlassRestHealthyScene,
  "rest-indian": GlassRestIndianScene,
  "park-knotts": GlassParkKnottsScene,
  "park-sixflags": GlassParkSixFlagsScene,
  "park-disney": GlassParkDisneyScene,
  "park-universal": GlassParkUniversalScene,
  "park-legoland": GlassParkLegolandScene,
  "park-seaworld": GlassParkSeaworldScene,
  "park-generic": GlassParkGenericScene,
  "tv-show": GlassTvGenericScene,
  "tv-dexter-new-blood": GlassTvDexterNewBloodScene,
  "tv-dexter-original-sin": GlassTvDexterOriginalSinScene,
  "tv-dexter-resurrection": GlassTvDexterResurrectionScene,
  "tv-dexter": GlassTvDexterScene,
  "tv-walking-dead": GlassTvWalkingDeadScene,
  "tv-chosen": GlassTvChosenScene,
  "tv-bear": GlassTvBearScene,
  "tv-sopranos": GlassTvSopranosScene,
  "tv-skins": GlassTvSkinsScene,
  "tv-got": GlassTvGotScene,
  "tv-dbz": GlassTvDbzScene,
  "tv-soa": GlassTvSoaScene,
  "tv-reacher": GlassTvReacherScene,
  "tv-from": GlassTvFromScene,
  "tv-daredevil": GlassTvDaredevilScene,
  "tv-pluribus": GlassTvPluribusScene,
  "tv-breaking-bad": GlassTvBreakingBadScene,
  "tv-better-call-saul": GlassTvBetterCallSaulScene,
  "tv-fallout": GlassTvFalloutScene,
  "tv-ted-lasso": GlassTvTedLassoScene,
  "tv-one-piece": GlassTvOnePieceScene,
  "tv-stranger-things": GlassTvStrangerThingsScene,
  "tv-bluey": GlassTvBlueyScene,
  "tv-duggee": GlassTvDuggeeScene,
  "tv-avatar": GlassTvAvatarScene,
  "tv-yellowstone": GlassTvYellowstoneScene,
  "tv-boys": GlassTvBoysScene,
  "tv-you": GlassTvYouScene,
  "tv-chucky": GlassTvChuckyScene,
  "tv-lost": GlassTvLostScene,
  "tv-prison-break": GlassTvPrisonBreakScene,
  "tv-it-derry": GlassTvItDerryScene,
  "tv-carrie": GlassTvCarrieScene,
  "tv-harry-potter": GlassTvHarryPotterScene,
  "tv-wednesday": GlassTvWednesdayScene,
  "tv-vampire-diaries": GlassTvVampireDiariesScene,
  "tv-originals": GlassTvOriginalsScene,
  "tv-legacies": GlassTvLegaciesScene,
  "movie": GlassMovieGenericScene,
  "theater": GlassTheaterGenericScene,
  "mv-resident-evil": GlassMvResidentEvilScene,
  "mv-buddy": GlassMvBuddyScene,
  "mv-black-phone": GlassMvBlackPhoneScene,
  "mv-backrooms": GlassMvBackroomsScene,
  "mv-exit-8": GlassMvExit8Scene,
  "mv-deadpool": GlassMvDeadpoolScene,
  "mv-fnaf": GlassMvFnafScene,
  "mv-iron-lung": GlassMvIronLungScene,
  "mv-nimrods": GlassMvNimrodsScene,
  "mv-idiots": GlassMvIdiotsScene,
  "mv-nobody": GlassMvNobodyScene,
  "mv-mario": GlassMvMarioScene,
  "mv-toy-story": GlassMvToyStoryScene,
  "mv-zootopia": GlassMvZootopiaScene,
  "mv-spiderman": GlassMvSpidermanScene,
  "mv-avengers-doomsday": GlassMvAvengersDoomsdayScene,
  "mv-shrek": GlassMvShrekScene,
  "mv-hunger-games": GlassMvHungerGamesScene,
  "mv-street-fighter": GlassMvStreetFighterScene,
  "mv-wildwood": GlassMvWildwoodScene,
};

/** The stained-glass rendition for a keyword, or null exactly where
 *  the classic/paper/pixel/terminal dispatch renders nothing. */
export function glassKeywordSceneFor(
  label: string,
  title = "",
  location = "",
  notes = "",
): ReactNode | null {
  const id = paperSceneIdFor(label, title, location, notes);
  if (!id) return null;
  const Scene = GLASS_SCENE_REGISTRY[id];
  return Scene ? <Scene /> : null;
}

/* ------------------------------------------------------------------ */
/* Rest skies: the mood follows the hour, drawn as a window — an     */
/* amber sun pane with lead rays, a cream moon pane, clouds as       */
/* cream panes — all in the right zone (the card's words rest on     */
/* the root's cream label pane, like every glass scene).             */
/* ------------------------------------------------------------------ */

export type GlassRestMood = "sunrise" | "midday" | "sunset" | "night";

function GlassSunRays({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const rays: Array<[number, number, number, number]> = [
    [cx - 2.5, cy - r - 11, 5, 8],
    [cx - 2.5, cy + r + 3, 5, 8],
    [cx - r - 11, cy - 2.5, 8, 5],
    [cx + r + 3, cy - 2.5, 8, 5],
    [cx - r - 8, cy - r - 8, 6, 6],
    [cx + r + 2, cy - r - 8, 6, 6],
    [cx - r - 8, cy + r + 2, 6, 6],
    [cx + r + 2, cy + r + 2, 6, 6],
  ];
  return (
    <>
      {rays.map(([x, y, w, h], i) => (
        <GPoly
          key={i}
          points={`${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`}
          fill={fill}
          w={1.8}
        />
      ))}
    </>
  );
}

function GlassCloud({ x, y, s = 1, fill = GLASS_CREAM }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <GP
      d={`M ${x} ${y + 10 * s} a ${7 * s} ${7 * s} 0 0 1 ${2 * s} ${-6 * s} a ${9 * s} ${9 * s} 0 0 1 ${16 * s} ${-3 * s} a ${7 * s} ${7 * s} 0 0 1 ${8 * s} ${9 * s} Z`}
      fill={fill}
      w={2}
    />
  );
}

export function GlassRestSky({ mood, pane = true }: { mood: GlassRestMood; pane?: boolean }) {
  if (mood === "midday") {
    return (
      <GlassSceneRoot bg="#1D2A4A" pane={pane}>
        <GC cx={163} cy={34} r={15} fill={GLASS_AMBER} />
        <GC cx={163} cy={34} r={8.5} fill={GLASS_AMBER_PALE} w={1.8} />
        <GlassSunRays cx={163} cy={34} r={15} fill={GLASS_AMBER_LT} />
        <GlassCloud x={112} y={16} s={0.9} />
        <GlassCloud x={152} y={70} s={0.6} fill={GLASS_SAPPHIRE_LT} />
      </GlassSceneRoot>
    );
  }
  if (mood === "sunrise") {
    return (
      <GlassSceneRoot bg="#2A1E3E" pane={pane}>
        <GLine x1={104} y1={102} x2={196} y2={102} c={GLASS_AMBER_LT} w={2.2} />
        <GP d="M 130 102 a 24 24 0 0 1 48 0 Z" fill={GLASS_AMBER} />
        <GP d="M 138 102 a 16 16 0 0 1 32 0 Z" fill={GLASS_AMBER_PALE} w={1.8} />
        <GlassCloud x={112} y={14} s={0.7} fill={GLASS_VIOLET_LT} />
        <GDot cx={122} cy={52} r={1.8} fill={GLASS_AMBER_LT} />
        <GDot cx={186} cy={44} r={1.6} fill={GLASS_AMBER_PALE} />
      </GlassSceneRoot>
    );
  }
  if (mood === "sunset") {
    return (
      <GlassSceneRoot bg="#33161D" pane={pane}>
        <GLine x1={104} y1={102} x2={196} y2={102} c={GLASS_RUBY} w={2.2} />
        <GP d="M 132 102 a 22 22 0 0 1 44 0 Z" fill={GLASS_RUBY} />
        <GP d="M 140 102 a 14 14 0 0 1 28 0 Z" fill={GLASS_AMBER} w={1.8} />
        <GlassCloud x={136} y={16} s={0.8} fill={GLASS_VIOLET_LT} />
      </GlassSceneRoot>
    );
  }
  return (
    <GlassSceneRoot bg="#141B33" pane={pane}>
      <GC cx={168} cy={32} r={14} fill={GLASS_CREAM} />
      <GC cx={174} cy={27} r={11} fill="#141B33" lead="#141B33" w={0} />
      <GDot cx={120} cy={20} r={1.8} fill={GLASS_CREAM} />
      <GDot cx={138} cy={46} r={1.4} fill={GLASS_AMBER_LT} />
      <GDot cx={112} cy={64} r={1.3} fill={GLASS_CREAM} />
      <GDot cx={188} cy={68} r={1.5} fill={GLASS_AMBER_PALE} />
      <GDot cx={150} cy={88} r={1.3} fill={GLASS_CREAM} />
    </GlassSceneRoot>
  );
}
