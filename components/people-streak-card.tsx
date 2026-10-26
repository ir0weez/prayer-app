import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect as SvgRect, Stop } from "react-native-svg";

import { AvatarImage } from "@/components/avatar-system";
import type { PeopleFrontDoorFamily } from "@/lib/people-material";
import { getStreakCardModel } from "@/lib/people-streak";
import type { PersonalFast } from "@/lib/prayercircle-fasting";

// ─── v257 "The Streak Card" — streak-on-people-v3, "Same family, his
// face" ─────────────────────────────────────────────────────────────
// An ordinary member of the v256 derived front-door family: same
// surface, same r26 radius, same padding, same shadow and inks as
// the Today's prayer list card it sits directly under. Every surface
// color comes from the family the caller passes (seed × appearance
// × skin, via usePeopleFrontDoor / the pmf gate) — the mockup's
// hexes are that family's Classic-light instance at the violet
// seed, reproduced by the derivation, never pinned here.
//
// Exactly three contents, per the drawing:
//  1. His PROFILE face — the AvatarImage id="profile" rendering the
//     rest of the app uses for his self identity (the old story
//     bar's self item rendered the same face) — with a filled seed
//     flame chip carrying profile.fastingStreak.
//  2. The text column: the streak headline, the active fast's day
//     line, and a thin seed progress line spanning the FULL text
//     column with nothing over it.
//  3. A plain chevron — the whole card is a door to his profile.
// Display only: the card carries no day-marking affordance and no
// fasting-hearts row; both live on the Fasting page and his profile,
// where they have room. His queue PERSON entry is untouched by this
// card — the two selves stay separate.

export function PeopleStreakCard({
  family,
  fastingStreak,
  activeFast,
  today,
  profileName,
  profileAvatarAsset,
  profilePhotoUri,
  profileLevel,
  onPress,
}: {
  family: PeopleFrontDoorFamily;
  fastingStreak: number;
  activeFast: PersonalFast | null;
  today: string;
  profileName: string;
  profileAvatarAsset?: string;
  profilePhotoUri?: string;
  profileLevel: number;
  onPress: () => void;
}) {
  const model = getStreakCardModel({ fastingStreak, activeFast, today });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${model.headline}. ${model.subline}`}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: family.card,
          borderRadius: 26,
          padding: 16,
          marginHorizontal: 16,
          marginTop: 12,
          shadowColor: family.shadow,
          shadowOpacity: 1,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: 4,
          flexDirection: "row",
          alignItems: "center",
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      {/* Avatar column: 62 wide, the 56px profile face + the flame chip. */}
      <View style={{ width: 62, height: 58, alignItems: "center", justifyContent: "center" }}>
        <AvatarImage
          id="profile"
          name={profileName}
          avatarAsset={profileAvatarAsset}
          photoUri={profilePhotoUri}
          profileLevel={profileLevel}
          size={56}
          thumbnail
          fallbackColor={family.seed}
        />
        <View
          style={{
            position: "absolute",
            bottom: -1,
            right: 0,
            height: 20,
            borderRadius: 10,
            backgroundColor: family.seed,
            borderWidth: 2,
            borderColor: family.card,
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
            paddingLeft: 4,
            paddingRight: 6,
          }}
        >
          <MaterialIcons name="local-fire-department" size={11} color="#FFFFFF" />
          <Text style={{ fontSize: 10.5, fontWeight: "800", color: "#FFFFFF", lineHeight: 13 }}>{model.streak}</Text>
        </View>
      </View>
      {/* Text column: flexible, so a long fast name wraps the day
          line to two lines and the card grows — never squeezed. */}
      <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: "800", color: family.ink, letterSpacing: -0.15 }}>{model.headline}</Text>
        <Text style={{ fontSize: 13, fontWeight: "600", color: family.inkSoft, marginTop: 3 }}>{model.subline}</Text>
        {model.progressFraction !== null ? (
          <View style={{ height: 6, borderRadius: 3, backgroundColor: family.wash, marginTop: 9, overflow: "hidden" }}>
            <View style={{ width: `${Math.round(model.progressFraction * 100)}%`, height: "100%", borderRadius: 3, overflow: "hidden" }}>
              <Svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                <Defs>
                  <LinearGradient id="v257StreakGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={family.seed} />
                    <Stop offset="1" stopColor={family.queueTeal} />
                  </LinearGradient>
                </Defs>
                <SvgRect x="0" y="0" width="100%" height="100%" fill="url(#v257StreakGrad)" />
              </Svg>
            </View>
          </View>
        ) : null}
      </View>
      <View style={{ width: 22, marginLeft: 12, alignItems: "center", justifyContent: "center" }}>
        <MaterialIcons name="chevron-right" size={20} color={family.inkSoft} />
      </View>
    </Pressable>
  );
}
