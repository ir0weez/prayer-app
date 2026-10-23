// Bible Study Hall interior: circles of tables with open Bibles, a wall
// cross and a verse banner overhead. This is where Bible Study schedule
// events gather the hero and the villagers (the church hosts until the
// hall is built). "Join the Study" grants XP + a few coins on a 1-hour
// cooldown — study is about wisdom, so XP leads.
// L1: two study circles, a small bookcase.
// L2: more circles, a taller bookcase, cushions on the chairs.
// L3: a library wall, a lectern, and a third circle.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { pickPeople } from "@/components/activity-figures";
import { PaperRoomScene } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP,
  formatCoins,
} from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { VerseGame } from "@/components/verse-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";
import {
  getCachedSchoolPerks,
  loadSchoolPerks,
  refreshSchoolPerksCache,
  type SchoolPerks,
} from "@/lib/school-perks";

const BG = "#FAF5EA";
const TEXT_DIM = "#A08B62";
const ACCENT = "#8A6D1C";

const STUDY_COINS: Record<number, number> = { 1: 20, 2: 40, 3: 80 };
const STUDY_XP: Record<number, number> = { 1: 14, 2: 26, 3: 48 };
const COOLDOWN_MS = 60 * 60 * 1000;
const STUDY_KEY = "prayercircle.interior.biblestudy.join.v1";

export default function BibleStudyHallInteriorScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastJoin, setLastJoin] = useState(0);
  const [schoolPerks, setSchoolPerks] = useState<SchoolPerks | null>(null);

  // Complete the Verse — shared host (components/mini-game-host.ts): the
  // same daily cap and payout pipeline as the Scripture Classroom on
  // campus, including the classroom's verse multiplier (+10/25/40%).
  const verse = useMiniGameHost("verse", addCoins, {
    perkMult: () => getCachedSchoolPerks().verseMult,
  });

  useEffect(() => {
    // School Campus perks: the Scripture Classroom lifts Complete the Verse,
    // the Library deepens Join the Study (lib/school-perks.ts).
    refreshSchoolPerksCache().then(setSchoolPerks).catch(() => undefined);
  }, []);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STUDY_KEY).catch(() => null);
      setLastJoin(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastJoin + COOLDOWN_MS - Date.now());
  // The circles fill with the people you've prayed for — study is shared.
  const circlePeople = pickPeople(people, `biblestudy|${building?.id ?? "hall"}|circles`, level >= 3 ? 14 : level >= 2 ? 10 : 6);

  const levelBlurb =
    level >= 3
      ? "A full study hall — a library wall, and circles deep in the Word."
      : level >= 2
        ? "A warm hall — more circles around the tables, and a taller bookcase."
        : "A simple hall — two circles of chairs, open Bibles, and a bookcase.";

  const handleJoin = async () => {
    if (remaining > 0) {
      Alert.alert("Still studying", `The circle is mid-passage.\n\nJoin again in about ${formatCooldown(remaining)}.`);
      return;
    }
    // Library (campus): Join the Study rewards +25% while it stands.
    const perks = await loadSchoolPerks().catch(() => getCachedSchoolPerks());
    const c = Math.round(scaledCoins(STUDY_COINS[level] ?? 20) * perks.studyMult * 100) / 100;
    const xp = Math.round(scaledXP(STUDY_XP[level] ?? 14) * perks.studyMult);
    const t = Date.now();
    setLastJoin(t);
    await AsyncStorage.setItem(STUDY_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `biblestudy-join-${t}`).catch(() => undefined);
    Alert.alert("In the Word together", `You pull up a chair, open your Bible, and the discussion finds its thread.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="menu-book" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="auto-stories"
          iconColor={ACCENT}
          title="Bible Study Hall"
          blurb={`Circles of tables, open Bibles, and a verse banner overhead. ${levelBlurb}`}
          accent="#EFE3C4"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene
            config={PAPER_ROOMS["bible-study-hall"]}
            level={level}
            cast={circlePeople.map((person) => ({ person, pose: "seated" as const }))}
            pawn={pawn}
            pawnPose="seated"
            width={sceneWidth}
          />
        </View>
        {circlePeople.length === 0 && (
          <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", paddingHorizontal: 28, marginTop: 8 }}>
            The chairs are set in circles. Pray for people today and they'll gather here to study with you.
          </Text>
        )}

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Join the Study"}
          onPrimary={handleJoin}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A library wall, a lectern, and room for a third circle." : "More circles around the tables, and a taller bookcase."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Join the study once an hour. The circles are always set.
          {schoolPerks?.libraryBuilt ? "\nThe campus Library deepens every study — Join the Study rewards +25%." : ""}
        </Text>

        <PlayCard
          icon="quiz"
          title="Play: Complete the Verse"
          blurb={`A verse with one word missing — can you complete it? Eight rounds, and wisdom pays best.${schoolPerks && schoolPerks.verseMult > 1 ? ` The Scripture Classroom lifts verse rewards +${Math.round((schoolPerks.verseMult - 1) * 100)}%.` : ""}`}
          playsLeft={verse.playsLeft}
          cap={verse.cap}
          accent={ACCENT}
          onPlay={() => verse.setPlaying(true)}
          gameId="verse"
        />
        {verse.playing && (
          <VerseGame accent={ACCENT} onComplete={verse.handleComplete} onExit={() => verse.setPlaying(false)} />
        )}

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Setting out the chairs…</Text>}
      </ScrollView>
    </View>
  );
}
