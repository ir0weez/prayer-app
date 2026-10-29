import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, Text, View } from "react-native";

import { AvatarImage } from "@/components/avatar-system";
import { WavyProgress } from "@/components/wavy-progress";
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
          /* v339: the streak line wears the wavy fill (his Oct 29
             ruling) in the seed on the card's wash track — same seat,
             same fraction. */
          <View style={{ marginTop: 9 }}>
            <WavyProgress value={model.progressFraction} color={family.seed} colorEnd={family.queueTeal} trackColor={family.wash} height={8} />
          </View>
        ) : null}
      </View>
      <View style={{ width: 22, marginLeft: 12, alignItems: "center", justifyContent: "center" }}>
        <MaterialIcons name="chevron-right" size={20} color={family.inkSoft} />
      </View>
    </Pressable>
  );
}
