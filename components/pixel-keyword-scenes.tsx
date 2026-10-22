// v183 — the 8-bit keyword scene registry. Every scene id the
// schedule can route (lib/paper-keywords.ts — the SAME routing the
// Paper skin uses, one source of truth) resolves here to a bespoke
// pixel rendition drawn with components/pixel-kit.tsx: chunky
// squares on a coarse grid, hard offset shadows, stepped motion
// only. Sopranos leads in pixel-scenes-tv.tsx (pixel-keyword flagship).
//
// The Dark Forest is NOT here and never will be: it keeps its own
// pixel rendering untouched. Hometown and the avatars are exempt.

import type { ReactNode } from "react";
import { View } from "react-native";

import { Px, PxCloud, PxSun, StepBlink, StepBob } from "@/components/pixel-kit";
import { paperSceneIdFor, type PaperSceneId } from "@/lib/paper-keywords";

import {
  PixelBBQScene,
  PixelFastScene,
  PixelWorshipScene,
  PixelBibleStudyScene,
  PixelTherapyScene,
  PixelDoctorScene,
  PixelHaircutScene,
  PixelGardeningScene,
  PixelMowLawnScene,
  PixelPruneScene,
  PixelHarvestScene,
  PixelParkScene,
  PixelPartyScene,
  PixelSchoolScene,
  PixelWaterParkScene,
  PixelBeachScene,
  PixelBabyShowerScene,
  PixelBirthdayScene,
  PixelChristmasScene,
  PixelEasterScene,
  PixelSunriseServiceScene,
  PixelThanksgivingScene,
  PixelWeddingScene,
  PixelMemorialScene,
  PixelMeetingScene,
  PixelWorkoutScene,
  PixelBasketballScene,
  PixelSoccerScene,
  PixelGameScene,
  PixelScaryMovieScene,
  PixelChristmasMovieScene,
  PixelChristmasBreakfastScene,
  PixelChristmasDinnerScene,
  PixelFullMoonScene,
  PixelPrayerScene,
  PixelOutreachScene,
  PixelConcertScene,
  PixelHotelScene,
  PixelShowerScene,
  PixelStudyScene,
  PixelGraduationScene,
  PixelVisitScene,
  PixelReachOutScene,
  PixelCleanScene,
  PixelWashCarScene,
  PixelGetGasScene,
  PixelGroceryScene,
  PixelNewYearScene,
  PixelValentinesScene,
  PixelHalloweenScene,
  PixelStPatricksScene,
} from "@/components/pixel-scenes-labels";

import {
  PixelTdTvDinnerScene,
  PixelTdBurritoScene,
  PixelTdTostadasScene,
  PixelTdTacosScene,
  PixelTdPizzaScene,
  PixelTdSandwichScene,
  PixelTdSaladScene,
  PixelTdPastaScene,
  PixelTdPancakesScene,
  PixelTdSoupScene,
  PixelTdEggsScene,
  PixelTdMexicanPizzaScene,
  PixelTdPupusasScene,
  PixelTdSteakScene,
  PixelTdRoastChickenScene,
  PixelTdMeatloafScene,
  PixelTdPotRoastScene,
  PixelTdCasseroleScene,
  PixelTdHotDogScene,
  PixelTdNachosScene,
  PixelTdQuesadillaScene,
  PixelTdHotWingsScene,
  PixelTdRamenScene,
  PixelTdStirFryScene,
  PixelTdFriedRiceScene,
  PixelTdOatmealScene,
  PixelTdCerealScene,
  PixelRestTacoScene,
  PixelRestSandwichScene,
  PixelRestPizzaScene,
  PixelRestChickenScene,
  PixelRestDonutScene,
  PixelRestCoffeeScene,
  PixelRestSushiScene,
  PixelRestChineseScene,
  PixelRestDinerScene,
  PixelRestDessertScene,
  PixelRestItalianScene,
  PixelRestSeafoodScene,
  PixelRestHealthyScene,
  PixelRestIndianScene,
} from "@/components/pixel-scenes-food";

import {
  PixelTvGenericScene,
  PixelTvDexterNewBloodScene,
  PixelTvDexterOriginalSinScene,
  PixelTvDexterResurrectionScene,
  PixelTvDexterScene,
  PixelTvWalkingDeadScene,
  PixelTvChosenScene,
  PixelTvBearScene,
  PixelTvSopranosScene,
  PixelTvSkinsScene,
  PixelTvGotScene,
  PixelTvDbzScene,
  PixelTvSoaScene,
  PixelTvReacherScene,
  PixelTvFromScene,
  PixelTvDaredevilScene,
  PixelTvPluribusScene,
  PixelTvBreakingBadScene,
  PixelTvBetterCallSaulScene,
  PixelTvFalloutScene,
  PixelTvTedLassoScene,
  PixelTvOnePieceScene,
  PixelTvStrangerThingsScene,
  PixelTvBlueyScene,
  PixelTvDuggeeScene,
  PixelTvAvatarScene,
  PixelTvYellowstoneScene,
  PixelTvBoysScene,
  PixelTvYouScene,
  PixelTvChuckyScene,
  PixelTvLostScene,
  PixelTvPrisonBreakScene,
  PixelTvItDerryScene,
  PixelTvCarrieScene,
  PixelTvHarryPotterScene,
  PixelTvWednesdayScene,
  PixelTvVampireDiariesScene,
  PixelTvOriginalsScene,
  PixelTvLegaciesScene,
} from "@/components/pixel-scenes-tv";

import {
  PixelChurchScene,
  PixelPhotoScene,
  PixelTravelScene,
  PixelBreakfastScene,
  PixelLunchScene,
  PixelDinnerScene,
  PixelBurgerScene,
  PixelParkKnottsScene,
  PixelParkSixFlagsScene,
  PixelParkDisneyScene,
  PixelParkUniversalScene,
  PixelParkLegolandScene,
  PixelParkSeaworldScene,
  PixelParkGenericScene,
  PixelMovieGenericScene,
  PixelTheaterGenericScene,
  PixelMvResidentEvilScene,
  PixelMvBuddyScene,
  PixelMvBlackPhoneScene,
  PixelMvBackroomsScene,
  PixelMvExit8Scene,
  PixelMvDeadpoolScene,
  PixelMvFnafScene,
  PixelMvIronLungScene,
  PixelMvNimrodsScene,
  PixelMvIdiotsScene,
  PixelMvNobodyScene,
  PixelMvMarioScene,
  PixelMvToyStoryScene,
  PixelMvZootopiaScene,
  PixelMvSpidermanScene,
  PixelMvAvengersDoomsdayScene,
  PixelMvShrekScene,
  PixelMvHungerGamesScene,
  PixelMvStreetFighterScene,
  PixelMvWildwoodScene,
} from "@/components/pixel-scenes-screen";

export const PIXEL_SCENE_REGISTRY: Record<PaperSceneId, () => ReactNode> = {
  "bbq": PixelBBQScene,
  "fast": PixelFastScene,
  "church": PixelChurchScene,
  "worship": PixelWorshipScene,
  "bible-study": PixelBibleStudyScene,
  "therapy": PixelTherapyScene,
  "doctor": PixelDoctorScene,
  "haircut": PixelHaircutScene,
  "gardening": PixelGardeningScene,
  "mow-lawn": PixelMowLawnScene,
  "prune": PixelPruneScene,
  "harvest": PixelHarvestScene,
  "park": PixelParkScene,
  "party": PixelPartyScene,
  "school": PixelSchoolScene,
  "water-park": PixelWaterParkScene,
  "beach": PixelBeachScene,
  "baby-shower": PixelBabyShowerScene,
  "birthday": PixelBirthdayScene,
  "christmas": PixelChristmasScene,
  "easter": PixelEasterScene,
  "sunrise-service": PixelSunriseServiceScene,
  "thanksgiving": PixelThanksgivingScene,
  "wedding": PixelWeddingScene,
  "memorial": PixelMemorialScene,
  "meeting": PixelMeetingScene,
  "workout": PixelWorkoutScene,
  "basketball": PixelBasketballScene,
  "soccer": PixelSoccerScene,
  "game": PixelGameScene,
  "photo": PixelPhotoScene,
  "scary-movie": PixelScaryMovieScene,
  "christmas-movie": PixelChristmasMovieScene,
  "christmas-breakfast": PixelChristmasBreakfastScene,
  "christmas-dinner": PixelChristmasDinnerScene,
  "full-moon": PixelFullMoonScene,
  "prayer": PixelPrayerScene,
  "outreach": PixelOutreachScene,
  "concert": PixelConcertScene,
  "travel": PixelTravelScene,
  "hotel": PixelHotelScene,
  "shower": PixelShowerScene,
  "study": PixelStudyScene,
  "graduation": PixelGraduationScene,
  "visit": PixelVisitScene,
  "reach-out": PixelReachOutScene,
  "clean": PixelCleanScene,
  "wash-car": PixelWashCarScene,
  "get-gas": PixelGetGasScene,
  "grocery": PixelGroceryScene,
  "new-year": PixelNewYearScene,
  "valentines": PixelValentinesScene,
  "halloween": PixelHalloweenScene,
  "st-patricks": PixelStPatricksScene,
  "breakfast": PixelBreakfastScene,
  "lunch": PixelLunchScene,
  "dinner": PixelDinnerScene,
  "td-tv-dinner": PixelTdTvDinnerScene,
  "td-burrito": PixelTdBurritoScene,
  "td-tostadas": PixelTdTostadasScene,
  "td-tacos": PixelTdTacosScene,
  "td-pizza": PixelTdPizzaScene,
  "td-sandwich": PixelTdSandwichScene,
  "td-salad": PixelTdSaladScene,
  "td-pasta": PixelTdPastaScene,
  "td-pancakes": PixelTdPancakesScene,
  "td-soup": PixelTdSoupScene,
  "td-eggs": PixelTdEggsScene,
  "td-mexican-pizza": PixelTdMexicanPizzaScene,
  "td-pupusas": PixelTdPupusasScene,
  "td-steak": PixelTdSteakScene,
  "td-burger": PixelBurgerScene,
  "td-roast-chicken": PixelTdRoastChickenScene,
  "td-meatloaf": PixelTdMeatloafScene,
  "td-pot-roast": PixelTdPotRoastScene,
  "td-casserole": PixelTdCasseroleScene,
  "td-hot-dog": PixelTdHotDogScene,
  "td-nachos": PixelTdNachosScene,
  "td-quesadilla": PixelTdQuesadillaScene,
  "td-hot-wings": PixelTdHotWingsScene,
  "td-ramen": PixelTdRamenScene,
  "td-stir-fry": PixelTdStirFryScene,
  "td-fried-rice": PixelTdFriedRiceScene,
  "td-oatmeal": PixelTdOatmealScene,
  "td-cereal": PixelTdCerealScene,
  "rest-taco": PixelRestTacoScene,
  "rest-sandwich": PixelRestSandwichScene,
  "rest-pizza": PixelRestPizzaScene,
  "rest-chicken": PixelRestChickenScene,
  "rest-donut": PixelRestDonutScene,
  "rest-coffee": PixelRestCoffeeScene,
  "rest-sushi": PixelRestSushiScene,
  "rest-chinese": PixelRestChineseScene,
  "rest-diner": PixelRestDinerScene,
  "rest-dessert": PixelRestDessertScene,
  "rest-italian": PixelRestItalianScene,
  "rest-seafood": PixelRestSeafoodScene,
  "rest-healthy": PixelRestHealthyScene,
  "rest-indian": PixelRestIndianScene,
  "park-knotts": PixelParkKnottsScene,
  "park-sixflags": PixelParkSixFlagsScene,
  "park-disney": PixelParkDisneyScene,
  "park-universal": PixelParkUniversalScene,
  "park-legoland": PixelParkLegolandScene,
  "park-seaworld": PixelParkSeaworldScene,
  "park-generic": PixelParkGenericScene,
  "tv-show": PixelTvGenericScene,
  "tv-dexter-new-blood": PixelTvDexterNewBloodScene,
  "tv-dexter-original-sin": PixelTvDexterOriginalSinScene,
  "tv-dexter-resurrection": PixelTvDexterResurrectionScene,
  "tv-dexter": PixelTvDexterScene,
  "tv-walking-dead": PixelTvWalkingDeadScene,
  "tv-chosen": PixelTvChosenScene,
  "tv-bear": PixelTvBearScene,
  "tv-sopranos": PixelTvSopranosScene,
  "tv-skins": PixelTvSkinsScene,
  "tv-got": PixelTvGotScene,
  "tv-dbz": PixelTvDbzScene,
  "tv-soa": PixelTvSoaScene,
  "tv-reacher": PixelTvReacherScene,
  "tv-from": PixelTvFromScene,
  "tv-daredevil": PixelTvDaredevilScene,
  "tv-pluribus": PixelTvPluribusScene,
  "tv-breaking-bad": PixelTvBreakingBadScene,
  "tv-better-call-saul": PixelTvBetterCallSaulScene,
  "tv-fallout": PixelTvFalloutScene,
  "tv-ted-lasso": PixelTvTedLassoScene,
  "tv-one-piece": PixelTvOnePieceScene,
  "tv-stranger-things": PixelTvStrangerThingsScene,
  "tv-bluey": PixelTvBlueyScene,
  "tv-duggee": PixelTvDuggeeScene,
  "tv-avatar": PixelTvAvatarScene,
  "tv-yellowstone": PixelTvYellowstoneScene,
  "tv-boys": PixelTvBoysScene,
  "tv-you": PixelTvYouScene,
  "tv-chucky": PixelTvChuckyScene,
  "tv-lost": PixelTvLostScene,
  "tv-prison-break": PixelTvPrisonBreakScene,
  "tv-it-derry": PixelTvItDerryScene,
  "tv-carrie": PixelTvCarrieScene,
  "tv-harry-potter": PixelTvHarryPotterScene,
  "tv-wednesday": PixelTvWednesdayScene,
  "tv-vampire-diaries": PixelTvVampireDiariesScene,
  "tv-originals": PixelTvOriginalsScene,
  "tv-legacies": PixelTvLegaciesScene,
  "movie": PixelMovieGenericScene,
  "theater": PixelTheaterGenericScene,
  "mv-resident-evil": PixelMvResidentEvilScene,
  "mv-buddy": PixelMvBuddyScene,
  "mv-black-phone": PixelMvBlackPhoneScene,
  "mv-backrooms": PixelMvBackroomsScene,
  "mv-exit-8": PixelMvExit8Scene,
  "mv-deadpool": PixelMvDeadpoolScene,
  "mv-fnaf": PixelMvFnafScene,
  "mv-iron-lung": PixelMvIronLungScene,
  "mv-nimrods": PixelMvNimrodsScene,
  "mv-idiots": PixelMvIdiotsScene,
  "mv-nobody": PixelMvNobodyScene,
  "mv-mario": PixelMvMarioScene,
  "mv-toy-story": PixelMvToyStoryScene,
  "mv-zootopia": PixelMvZootopiaScene,
  "mv-spiderman": PixelMvSpidermanScene,
  "mv-avengers-doomsday": PixelMvAvengersDoomsdayScene,
  "mv-shrek": PixelMvShrekScene,
  "mv-hunger-games": PixelMvHungerGamesScene,
  "mv-street-fighter": PixelMvStreetFighterScene,
  "mv-wildwood": PixelMvWildwoodScene,
};

/** The pixel rendition for a keyword, or null exactly where the
 *  classic/paper dispatch renders nothing. */
export function pixelKeywordSceneFor(
  label: string,
  title = "",
  location = "",
  notes = "",
): ReactNode | null {
  const id = paperSceneIdFor(label, title, location, notes);
  if (!id) return null;
  const Scene = PIXEL_SCENE_REGISTRY[id];
  return Scene ? <Scene /> : null;
}

/* ------------------------------------------------------------------ */
/* Rest skies: the mood follows the hour, the pieces are pixels —      */
/* the mockup's rest card is a blocky cloud and a square sun.          */
/* ------------------------------------------------------------------ */

export type PixelRestMood = "sunrise" | "midday" | "sunset" | "night";

export function PixelRestSky({ mood, bg }: { mood: PixelRestMood; bg: string }) {
  // TEXT-SAFE LAYOUT (v184, from Jonathan's phone): the card's title,
  // notes, and time all live in the left ~55% of the card — every sky
  // piece stays right of that zone. v183 put a cloud at left 6% /
  // top 10, square on the "Rest" title; the sun pieces rose on the
  // left too, over the time text. Nothing here may cross left 55%.
  if (mood === "midday") {
    return (
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <PxSun left="76%" bottom={48} size={36} color="#FFE066" core="#FFF3B0" ray="#FFC531" />
        <PxCloud left="58%" top={8} width={52} color="#FFFFFF" shade="#D8CCF2" />
        <PxCloud left="80%" top={44} width={36} color="#FFFFFF" shade="#D8CCF2" />
      </View>
    );
  }
  if (mood === "sunrise") {
    return (
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <StepBob left="64%" bottom={-16} width={56} height={56} distance={4} period={1500}>
          <Px style={{ position: "absolute", left: 0, bottom: 0, width: 56, height: 56, backgroundColor: "#FFD9A0" }} />
          <Px style={{ position: "absolute", left: 12, bottom: 12, width: 32, height: 32, backgroundColor: "#FFE8C4" }} />
        </StepBob>
        <PxCloud left="56%" top={12} width={40} color="#FFF3D0" shade="#E8B4B8" />
      </View>
    );
  }
  if (mood === "sunset") {
    return (
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <StepBob left="66%" bottom={-18} width={52} height={52} distance={4} period={1700}>
          <Px style={{ position: "absolute", left: 0, bottom: 0, width: 52, height: 52, backgroundColor: "#FF9E57" }} />
          <Px style={{ position: "absolute", left: 11, bottom: 11, width: 30, height: 30, backgroundColor: "#FFB27A" }} />
        </StepBob>
        <PxCloud left="58%" top={12} width={36} color="#FFD9A0" shade="#D97B4F" />
      </View>
    );
  }
  // night: a square moon with a square bite of sky, and hard-blinking stars.
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <View style={{ position: "absolute", left: "78%", bottom: 44, width: 36, height: 36 }}>
        <Px style={{ position: "absolute", left: 0, bottom: 0, width: 36, height: 36, backgroundColor: "#F5E6A8" }} />
        <Px style={{ position: "absolute", left: 12, bottom: 8, width: 28, height: 28, backgroundColor: bg }} />
      </View>
      {[
        { left: "46%", top: 12, size: 6, period: 1100 },
        { left: "58%", top: 26, size: 4, period: 1500 },
        { left: "64%", top: 8, size: 5, period: 1300 },
        { left: "88%", top: 14, size: 4, period: 1700 },
      ].map((s) => (
        <StepBlink
          key={`${s.left}-${s.top}`}
          period={s.period}
          style={{ position: "absolute", left: s.left as `${number}%`, top: s.top, width: s.size, height: s.size }}
        >
          <Px style={{ width: s.size, height: s.size, backgroundColor: "#FFFFFF" }} />
        </StepBlink>
      ))}
    </View>
  );
}
