// v186 — the Terminal keyword scene registry. Every scene id the
// schedule can route (lib/paper-keywords.ts — the SAME routing the
// Paper and 8-bit skins use, one source of truth) resolves here to a
// bespoke Pip-Boy line-art rendition drawn with
// components/terminal-kit.tsx: phosphor strokes on the tube, three
// green depths, no fills to speak of, no text glyphs anywhere.
// Sopranos leads in terminal-scenes-tv.tsx (the Terminal flagship:
// the pool, the house, the ducks — drawn, not typed).
//
// The Dark Forest is NOT here and never will be: it keeps its own
// pixel rendering untouched. Hometown and the avatars are exempt.

import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Line, Path } from "react-native-svg";

import { LDot, TERM_DIM, TERM_MID, TERM_PHOS, TERM_SOFT, TermBlink } from "@/components/terminal-kit";
import { paperSceneIdFor, type PaperSceneId } from "@/lib/paper-keywords";

import {
  TermBBQScene,
  TermFastScene,
  TermWorshipScene,
  TermBibleStudyScene,
  TermTherapyScene,
  TermDoctorScene,
  TermHaircutScene,
  TermGardeningScene,
  TermMowLawnScene,
  TermPruneScene,
  TermHarvestScene,
  TermParkScene,
  TermPartyScene,
  TermSchoolScene,
  TermWaterParkScene,
  TermBeachScene,
  TermBabyShowerScene,
  TermBirthdayScene,
  TermChristmasScene,
  TermEasterScene,
  TermSunriseServiceScene,
  TermThanksgivingScene,
  TermWeddingScene,
  TermMemorialScene,
  TermNewsScene,
  TermEmailScene,
  TermMeetingScene,
  TermWorkoutScene,
  TermBasketballScene,
  TermSoccerScene,
  TermGameScene,
  TermScaryMovieScene,
  TermChristmasMovieScene,
  TermChristmasBreakfastScene,
  TermChristmasDinnerScene,
  TermFullMoonScene,
  TermPrayerScene,
  TermOutreachScene,
  TermConcertScene,
  TermHotelScene,
  TermShowerScene,
  TermStudyScene,
  TermGraduationScene,
  TermVisitScene,
  TermReachOutScene,
  TermCleanScene,
  TermWashCarScene,
  TermGetGasScene,
  TermGroceryScene,
  TermNewYearScene,
  TermValentinesScene,
  TermHalloweenScene,
  TermStPatricksScene,
} from "@/components/terminal-scenes-labels";

import {
  TermTdTvDinnerScene,
  TermTdBurritoScene,
  TermTdTostadasScene,
  TermTdTacosScene,
  TermTdPizzaScene,
  TermTdPapaJoeScene,
  TermTdSandwichScene,
  TermTdSaladScene,
  TermTdPastaScene,
  TermTdPancakesScene,
  TermTdSoupScene,
  TermTdEggsScene,
  TermTdMexicanPizzaScene,
  TermTdPupusasScene,
  TermTdSteakScene,
  TermTdRoastChickenScene,
  TermTdShawarmaRiceBarScene,
  TermTdMeatloafScene,
  TermTdPotRoastScene,
  TermTdCasseroleScene,
  TermTdHotDogScene,
  TermTdNachosScene,
  TermTdQuesadillaScene,
  TermTdHotWingsScene,
  TermTdRamenScene,
  TermTdStirFryScene,
  TermTdFriedRiceScene,
  TermTdRisottoScene,
  TermTdOatmealScene,
  TermTdCerealScene,
  TermRestTacoScene,
  TermRestSandwichScene,
  TermRestPizzaScene,
  TermRestChickenScene,
  TermRestDonutScene,
  TermRestCoffeeScene,
  TermRestSushiScene,
  TermRestChineseScene,
  TermRestDinerScene,
  TermRestDessertScene,
  TermRestItalianScene,
  TermRestSeafoodScene,
  TermRestHealthyScene,
  TermRestIndianScene,
} from "@/components/terminal-scenes-food";

import {
  TermTvGenericScene,
  TermTvDexterNewBloodScene,
  TermTvDexterOriginalSinScene,
  TermTvDexterResurrectionScene,
  TermTvDexterScene,
  TermTvWalkingDeadScene,
  TermTvChosenScene,
  TermTvBearScene,
  TermTvSopranosScene,
  TermTvSkinsScene,
  TermTvGotScene,
  TermTvDbzScene,
  TermTvSoaScene,
  TermTvReacherScene,
  TermTvFromScene,
  TermTvDaredevilScene,
  TermTvPluribusScene,
  TermTvBreakingBadScene,
  TermTvBetterCallSaulScene,
  TermTvFalloutScene,
  TermTvTedLassoScene,
  TermTvOnePieceScene,
  TermTvStrangerThingsScene,
  TermTvBlueyScene,
  TermTvDuggeeScene,
  TermTvAvatarScene,
  TermTvYellowstoneScene,
  TermTvBoysScene,
  TermTvYouScene,
  TermTvChuckyScene,
  TermTvLostScene,
  TermTvPrisonBreakScene,
  TermTvItDerryScene,
  TermTvCarrieScene,
  TermTvHarryPotterScene,
  TermTvWednesdayScene,
  TermTvVampireDiariesScene,
  TermTvOriginalsScene,
  TermTvLegaciesScene,
} from "@/components/terminal-scenes-tv";

import {
  TermChurchScene,
  TermPhotoScene,
  TermTravelScene,
  TermBreakfastScene,
  TermLunchScene,
  TermDinnerScene,
  TermTdBurgerScene,
  TermParkKnottsScene,
  TermParkSixFlagsScene,
  TermParkDisneyScene,
  TermParkUniversalScene,
  TermParkLegolandScene,
  TermParkSeaworldScene,
  TermParkGenericScene,
  TermMovieGenericScene,
  TermTheaterGenericScene,
  TermMvResidentEvilScene,
  TermMvBuddyScene,
  TermMvBlackPhoneScene,
  TermMvBackroomsScene,
  TermMvExit8Scene,
  TermMvDeadpoolScene,
  TermMvFnafScene,
  TermMvIronLungScene,
  TermMvNimrodsScene,
  TermMvIdiotsScene,
  TermMvNobodyScene,
  TermMvMarioScene,
  TermMvToyStoryScene,
  TermMvZootopiaScene,
  TermMvSpidermanScene,
  TermMvAvengersDoomsdayScene,
  TermMvShrekScene,
  TermMvHungerGamesScene,
  TermMvStreetFighterScene,
  TermMvWildwoodScene,
} from "@/components/terminal-scenes-screen";

export const TERMINAL_SCENE_REGISTRY: Record<PaperSceneId, () => ReactNode> = {
  "news": TermNewsScene,
  "email": TermEmailScene,
  "bbq": TermBBQScene,
  "fast": TermFastScene,
  "church": TermChurchScene,
  "worship": TermWorshipScene,
  "bible-study": TermBibleStudyScene,
  "therapy": TermTherapyScene,
  "doctor": TermDoctorScene,
  "haircut": TermHaircutScene,
  "gardening": TermGardeningScene,
  "mow-lawn": TermMowLawnScene,
  "prune": TermPruneScene,
  "harvest": TermHarvestScene,
  "park": TermParkScene,
  "party": TermPartyScene,
  "school": TermSchoolScene,
  "water-park": TermWaterParkScene,
  "beach": TermBeachScene,
  "baby-shower": TermBabyShowerScene,
  "birthday": TermBirthdayScene,
  "christmas": TermChristmasScene,
  "easter": TermEasterScene,
  "sunrise-service": TermSunriseServiceScene,
  "thanksgiving": TermThanksgivingScene,
  "wedding": TermWeddingScene,
  "memorial": TermMemorialScene,
  "meeting": TermMeetingScene,
  "workout": TermWorkoutScene,
  "basketball": TermBasketballScene,
  "soccer": TermSoccerScene,
  "game": TermGameScene,
  "photo": TermPhotoScene,
  "scary-movie": TermScaryMovieScene,
  "christmas-movie": TermChristmasMovieScene,
  "christmas-breakfast": TermChristmasBreakfastScene,
  "christmas-dinner": TermChristmasDinnerScene,
  "full-moon": TermFullMoonScene,
  "prayer": TermPrayerScene,
  "outreach": TermOutreachScene,
  "concert": TermConcertScene,
  "travel": TermTravelScene,
  "hotel": TermHotelScene,
  "shower": TermShowerScene,
  "study": TermStudyScene,
  "graduation": TermGraduationScene,
  "visit": TermVisitScene,
  "reach-out": TermReachOutScene,
  "clean": TermCleanScene,
  "wash-car": TermWashCarScene,
  "get-gas": TermGetGasScene,
  "grocery": TermGroceryScene,
  "new-year": TermNewYearScene,
  "valentines": TermValentinesScene,
  "halloween": TermHalloweenScene,
  "st-patricks": TermStPatricksScene,
  "breakfast": TermBreakfastScene,
  "lunch": TermLunchScene,
  "dinner": TermDinnerScene,
  "td-tv-dinner": TermTdTvDinnerScene,
  "td-burrito": TermTdBurritoScene,
  "td-tostadas": TermTdTostadasScene,
  "td-tacos": TermTdTacosScene,
  "td-pizza": TermTdPizzaScene,
  "td-papa-joe": TermTdPapaJoeScene,
  "td-sandwich": TermTdSandwichScene,
  "td-salad": TermTdSaladScene,
  "td-pasta": TermTdPastaScene,
  "td-pancakes": TermTdPancakesScene,
  "td-soup": TermTdSoupScene,
  "td-eggs": TermTdEggsScene,
  "td-mexican-pizza": TermTdMexicanPizzaScene,
  "td-pupusas": TermTdPupusasScene,
  "td-steak": TermTdSteakScene,
  "td-burger": TermTdBurgerScene,
  "td-roast-chicken": TermTdRoastChickenScene,
  "td-shawarma-rice-bar": TermTdShawarmaRiceBarScene,
  "td-meatloaf": TermTdMeatloafScene,
  "td-pot-roast": TermTdPotRoastScene,
  "td-casserole": TermTdCasseroleScene,
  "td-hot-dog": TermTdHotDogScene,
  "td-nachos": TermTdNachosScene,
  "td-quesadilla": TermTdQuesadillaScene,
  "td-hot-wings": TermTdHotWingsScene,
  "td-ramen": TermTdRamenScene,
  "td-stir-fry": TermTdStirFryScene,
  "td-fried-rice": TermTdFriedRiceScene,
  "td-risotto": TermTdRisottoScene,
  "td-oatmeal": TermTdOatmealScene,
  "td-cereal": TermTdCerealScene,
  "rest-taco": TermRestTacoScene,
  "rest-sandwich": TermRestSandwichScene,
  "rest-pizza": TermRestPizzaScene,
  "rest-chicken": TermRestChickenScene,
  "rest-donut": TermRestDonutScene,
  "rest-coffee": TermRestCoffeeScene,
  "rest-sushi": TermRestSushiScene,
  "rest-chinese": TermRestChineseScene,
  "rest-diner": TermRestDinerScene,
  "rest-dessert": TermRestDessertScene,
  "rest-italian": TermRestItalianScene,
  "rest-seafood": TermRestSeafoodScene,
  "rest-healthy": TermRestHealthyScene,
  "rest-indian": TermRestIndianScene,
  "park-knotts": TermParkKnottsScene,
  "park-sixflags": TermParkSixFlagsScene,
  "park-disney": TermParkDisneyScene,
  "park-universal": TermParkUniversalScene,
  "park-legoland": TermParkLegolandScene,
  "park-seaworld": TermParkSeaworldScene,
  "park-generic": TermParkGenericScene,
  "tv-show": TermTvGenericScene,
  "tv-dexter-new-blood": TermTvDexterNewBloodScene,
  "tv-dexter-original-sin": TermTvDexterOriginalSinScene,
  "tv-dexter-resurrection": TermTvDexterResurrectionScene,
  "tv-dexter": TermTvDexterScene,
  "tv-walking-dead": TermTvWalkingDeadScene,
  "tv-chosen": TermTvChosenScene,
  "tv-bear": TermTvBearScene,
  "tv-sopranos": TermTvSopranosScene,
  "tv-skins": TermTvSkinsScene,
  "tv-got": TermTvGotScene,
  "tv-dbz": TermTvDbzScene,
  "tv-soa": TermTvSoaScene,
  "tv-reacher": TermTvReacherScene,
  "tv-from": TermTvFromScene,
  "tv-daredevil": TermTvDaredevilScene,
  "tv-pluribus": TermTvPluribusScene,
  "tv-breaking-bad": TermTvBreakingBadScene,
  "tv-better-call-saul": TermTvBetterCallSaulScene,
  "tv-fallout": TermTvFalloutScene,
  "tv-ted-lasso": TermTvTedLassoScene,
  "tv-one-piece": TermTvOnePieceScene,
  "tv-stranger-things": TermTvStrangerThingsScene,
  "tv-bluey": TermTvBlueyScene,
  "tv-duggee": TermTvDuggeeScene,
  "tv-avatar": TermTvAvatarScene,
  "tv-yellowstone": TermTvYellowstoneScene,
  "tv-boys": TermTvBoysScene,
  "tv-you": TermTvYouScene,
  "tv-chucky": TermTvChuckyScene,
  "tv-lost": TermTvLostScene,
  "tv-prison-break": TermTvPrisonBreakScene,
  "tv-it-derry": TermTvItDerryScene,
  "tv-carrie": TermTvCarrieScene,
  "tv-harry-potter": TermTvHarryPotterScene,
  "tv-wednesday": TermTvWednesdayScene,
  "tv-vampire-diaries": TermTvVampireDiariesScene,
  "tv-originals": TermTvOriginalsScene,
  "tv-legacies": TermTvLegaciesScene,
  "movie": TermMovieGenericScene,
  "theater": TermTheaterGenericScene,
  "mv-resident-evil": TermMvResidentEvilScene,
  "mv-buddy": TermMvBuddyScene,
  "mv-black-phone": TermMvBlackPhoneScene,
  "mv-backrooms": TermMvBackroomsScene,
  "mv-exit-8": TermMvExit8Scene,
  "mv-deadpool": TermMvDeadpoolScene,
  "mv-fnaf": TermMvFnafScene,
  "mv-iron-lung": TermMvIronLungScene,
  "mv-nimrods": TermMvNimrodsScene,
  "mv-idiots": TermMvIdiotsScene,
  "mv-nobody": TermMvNobodyScene,
  "mv-mario": TermMvMarioScene,
  "mv-toy-story": TermMvToyStoryScene,
  "mv-zootopia": TermMvZootopiaScene,
  "mv-spiderman": TermMvSpidermanScene,
  "mv-avengers-doomsday": TermMvAvengersDoomsdayScene,
  "mv-shrek": TermMvShrekScene,
  "mv-hunger-games": TermMvHungerGamesScene,
  "mv-street-fighter": TermMvStreetFighterScene,
  "mv-wildwood": TermMvWildwoodScene,
};

/** The terminal rendition for a keyword, or null exactly where the
 *  classic/paper/pixel dispatch renders nothing. */
export function terminalKeywordSceneFor(
  label: string,
  title = "",
  location = "",
  notes = "",
): ReactNode | null {
  const id = paperSceneIdFor(label, title, location, notes);
  if (!id) return null;
  const Scene = TERMINAL_SCENE_REGISTRY[id];
  return Scene ? <Scene /> : null;
}

/* ------------------------------------------------------------------ */
/* Rest skies: the mood follows the hour, drawn the Pip-Boy way —     */
/* outline sun, outline moon, line clouds, all in the right zone      */
/* (the card's text lives in the left ~55%; v184's lesson).           */
/* ------------------------------------------------------------------ */

export type TerminalRestMood = "sunrise" | "midday" | "sunset" | "night";

function TermSun({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  const rays: Array<[number, number, number, number]> = [
    [cx, cy - r - 9, cx, cy - r - 3],
    [cx, cy + r + 3, cx, cy + r + 9],
    [cx - r - 9, cy, cx - r - 3, cy],
    [cx + r + 3, cy, cx + r + 9, cy],
    [cx - r - 6, cy - r - 6, cx - r - 2, cy - r - 2],
    [cx + r + 2, cy - r - 2, cx + r + 6, cy - r - 6],
    [cx - r - 6, cy + r + 6, cx - r - 2, cy + r + 2],
    [cx + r + 2, cy + r + 2, cx + r + 6, cy + r + 6],
  ];
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth={4.6} fill="none" opacity={0.16} />
      <Circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth={2} fill="none" />
      {rays.map(([x1, y1, x2, y2], i) => (
        <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2} strokeLinecap="round" />
      ))}
    </G>
  );
}

function TermCloud({ x, y, scale = 1, color = TERM_SOFT }: { x: number; y: number; scale?: number; color?: string }) {
  return (
    <Path
      d={`M ${x} ${y + 10 * scale} a ${7 * scale} ${7 * scale} 0 0 1 ${2 * scale} ${-6 * scale} a ${9 * scale} ${9 * scale} 0 0 1 ${16 * scale} ${-3 * scale} a ${7 * scale} ${7 * scale} 0 0 1 ${8 * scale} ${9 * scale} Z`}
      stroke={color}
      strokeWidth={1.8}
      fill="none"
      strokeLinejoin="round"
    />
  );
}

export function TerminalRestSky({ mood }: { mood: TerminalRestMood }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width="100%" height="100%" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">
        {mood === "midday" && (
          <G>
            <TermSun cx={163} cy={34} r={15} color={TERM_PHOS} />
            <TermCloud x={112} y={14} scale={0.9} />
            <TermCloud x={150} y={66} scale={0.65} color={TERM_MID} />
          </G>
        )}
        {mood === "sunrise" && (
          <G>
            <Line x1={8} y1={102} x2={192} y2={102} stroke={TERM_DIM} strokeWidth={2} />
            <Path d="M 128 102 a 26 26 0 0 1 52 0" stroke={TERM_PHOS} strokeWidth={2} fill="none" />
            <Path d="M 136 102 a 18 18 0 0 1 36 0" stroke={TERM_MID} strokeWidth={1.6} fill="none" />
            <Line x1={154} y1={58} x2={154} y2={66} stroke={TERM_PHOS} strokeWidth={2} strokeLinecap="round" />
            <Line x1={128} y1={66} x2={134} y2={72} stroke={TERM_PHOS} strokeWidth={2} strokeLinecap="round" />
            <Line x1={180} y1={66} x2={174} y2={72} stroke={TERM_PHOS} strokeWidth={2} strokeLinecap="round" />
            <TermCloud x={112} y={16} scale={0.7} color={TERM_MID} />
          </G>
        )}
        {mood === "sunset" && (
          <G>
            <Line x1={8} y1={102} x2={192} y2={102} stroke={TERM_DIM} strokeWidth={2} />
            <Path d="M 130 102 a 24 24 0 0 1 48 0" stroke={TERM_SOFT} strokeWidth={2} fill="none" />
            <Line x1={118} y1={84} x2={126} y2={84} stroke={TERM_MID} strokeWidth={2} strokeLinecap="round" />
            <Line x1={182} y1={84} x2={190} y2={84} stroke={TERM_MID} strokeWidth={2} strokeLinecap="round" />
            <TermCloud x={140} y={18} scale={0.8} color={TERM_DIM} />
          </G>
        )}
        {mood === "night" && (
          <G>
            <Path d="M 168 14 a 21 21 0 1 0 12 38 a 16.5 16.5 0 1 1 -12 -38 Z" stroke={TERM_PHOS} strokeWidth={2} fill="none" strokeLinejoin="round" />
            <LDot cx={118} cy={22} r={1.7} c={TERM_SOFT} />
            <LDot cx={136} cy={44} r={1.3} c={TERM_MID} />
            <LDot cx={106} cy={58} r={1.2} c={TERM_SOFT} />
            <LDot cx={188} cy={66} r={1.4} c={TERM_MID} />
            <LDot cx={150} cy={86} r={1.2} c={TERM_DIM} />
          </G>
        )}
      </Svg>
      {mood === "night" && (
        <>
          <TermBlink period={1500} style={{ position: "absolute", left: "62%", top: 10 }}>
            <View style={{ width: 4, height: 4, backgroundColor: TERM_PHOS }} />
          </TermBlink>
          <TermBlink period={1900} style={{ position: "absolute", left: "88%", top: 30 }}>
            <View style={{ width: 3, height: 3, backgroundColor: TERM_SOFT }} />
          </TermBlink>
        </>
      )}
    </View>
  );
}
