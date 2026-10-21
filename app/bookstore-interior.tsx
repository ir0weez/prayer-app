// Bookstore interior: a cozy bookshop — tall wooden shelves, a reading
// nook, and villagers browsing and reading. L1: two plain shelves. L2: four
// shelves, reading chairs, and a warm lamp. L3: a beautiful bookshop —
// shelves to the ceiling, a glowing storefront display window, a staff-picks
// feature table, wall sconces, a crackling fireplace nook, a rolling ladder,
// a chandelier, and a warm rug. "Find a Good Book" grants XP on
// a 1-hour cooldown. No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import { ShelveGame } from "@/components/shelve-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import { pickPeople } from "@/components/activity-figures";
import { PaperRoomScene } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";

const BG = "#F5EFE3"; // warm paper
const ACCENT = "#92400E";
const TEXT_DIM = "#8A7358";

const BROWSE_KEY = "prayercircle.interior.bookstore.browse.v1";
const BROWSE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const BROWSE_XP: Record<1 | 2 | 3, number> = { 1: 10, 2: 18, 3: 30 };










export default function BookstoreInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const shelve = useMiniGameHost("shelve", addCoins);
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastBrowse, setLastBrowse] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(BROWSE_KEY);
        setLastBrowse(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
  }, []);

  const remaining = Math.max(0, lastBrowse + BROWSE_COOLDOWN_MS - Date.now());
  const browseXp = BROWSE_XP[level];
  const browsers = pickPeople(people, `bookstore|${building?.id ?? "book"}`, level >= 3 ? 3 : 2);
  const readers = pickPeople(people, `bookstore-readers|${building?.id ?? "book"}`, level >= 3 ? 3 : 2);
  const cast = [
    ...browsers.map((person) => ({ person, pose: "stand" as const })),
    ...readers.map((person) => ({ person, pose: "seated" as const })),
  ];

  const levelBlurb =
    level >= 3
      ? "A beautiful bookshop — shelves to the ceiling and a warm reading nook."
      : level >= 2
        ? "A growing shop — reading chairs, a warm lamp, more shelves."
        : "A small shop — a couple of shelves and a quiet corner.";

  const handleBrowse = async () => {
    if (remaining > 0) {
      Alert.alert("Keep Reading", `The shelves will hold their secrets a little longer.\n\nCome back in about ${formatCooldown(remaining)} for another good book.`);
      return;
    }
    const t = Date.now();
    setLastBrowse(t);
    await AsyncStorage.setItem(BROWSE_KEY, String(t)).catch(() => undefined);
    await awardCustomXP(browseXp, `bookstore-browse-${t}`).catch(() => undefined);
    Alert.alert("A Good Book", `You settle into the nook with a great find.\n\n+${browseXp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="menu-book" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="menu-book"
          iconColor={ACCENT}
          title="The Reading Nook"
          blurb={`Quiet shelves, warm light. Find a good book — worth +${browseXp} XP. ${levelBlurb}`}
          accent="#EAD9BE"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["bookstore"]} level={level} cast={cast} pawn={pawn} pawnPose="stand" width={sceneWidth} />
          {browsers.length === 0 && !pawn && (
            <Text style={{ color: TEXT_DIM, fontSize: 12, fontStyle: "italic" }}>
              The shelves are quiet today.
            </Text>
          )}
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Next book in ${formatCooldown(remaining)}` : "Find a Good Book"}
          onPrimary={handleBrowse}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade("More shelves, a warmer nook, better finds.")}
        />
        <PlayCard
          icon="menu-book"
          title="Play: Shelve the Stories"
          blurb="Returned books carry their section mark — shelve each one where it belongs."
          playsLeft={shelve.playsLeft}
          cap={shelve.cap}
          accent={ACCENT}
          onPlay={() => shelve.setPlaying(true)}
        />
        {shelve.playing && <ShelveGame accent={ACCENT} onComplete={shelve.handleComplete} onExit={() => shelve.setPlaying(false)} />}

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the shop…</Text>}
      </ScrollView>
    </View>
  );
}
