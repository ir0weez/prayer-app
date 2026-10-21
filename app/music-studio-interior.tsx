// Music Studio interior: warm wood, glass booths, and tracks being laid down.
// Villagers wear headphones in the booths, play keyboards and guitars, and
// work the mixing console. The pawn records a session alongside them.
// "Record a Session" grants coins + XP on a 1-hour cooldown.
// L1: one recording booth, a keyboard and a guitar on stands.
// L2: a second booth and a mixing console with sliders.
// L3: grand studio — live room with a drum kit, gold record plaques,
// and warm stage lighting.
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
import { PaperRoomScene, type PaperCastEntry } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP,
  formatCoins,
} from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";

const BG = "#F2EFF7";
const WOOD = "#8A5A2B";
const WOOD_DARK = "#5E3D22";
const TEXT_DIM = "#97889E";
const ACCENT = "#6D28D9";
const GOLD = "#C9963C";
const RED = "#B91C1C";

const SESSION_COINS: Record<number, number> = { 1: 70, 2: 140, 3: 260 };
const SESSION_XP: Record<number, number> = { 1: 5, 2: 10, 3: 20 };
const COOLDOWN_MS = 60 * 60 * 1000;
const SESSION_KEY = "prayercircle.interior.music-studio.session.v1";

export default function MusicStudioInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastSession, setLastSession] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(SESSION_KEY).catch(() => null);
      setLastSession(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastSession + COOLDOWN_MS - Date.now());
  const performers = pickPeople(people, `musicstudio|${building?.id ?? "music-studio"}|perform`, 4);
  const engineer = pickPeople(people, `musicstudio|${building?.id ?? "music-studio"}|engineer`, 1)[0];

  const cast: PaperCastEntry[] = [
    ...performers.map((person) => ({ person, pose: "sing" as const })),
    ...(engineer ? [{ person: engineer, pose: "work" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "A grand studio — instruments along the wall and warm pendant light."
      : level >= 2
        ? "A working studio — instruments everywhere and music in the air."
        : "A humble studio — a keyboard, a guitar, and stands ready to play.";

  const handleSession = async () => {
    if (remaining > 0) {
      Alert.alert("The tape is full", `The last session is still being mixed.\n\nRecord again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(SESSION_COINS[level] ?? 7);
    const xp = scaledXP(SESSION_XP[level] ?? 5);
    const t = Date.now();
    setLastSession(t);
    await AsyncStorage.setItem(SESSION_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `musicstudio-session-${t}`).catch(() => undefined);
    Alert.alert("Session Recorded", `Headphones on, red light glowing — the take is the one.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="album" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="music-note"
          iconColor={ACCENT}
          title="Music Studio"
          blurb={`Warm wood, glass booths, and songs taking shape. ${levelBlurb}`}
          accent="#E2D9F2"
        />

        {/* music-studio scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["music-studio"]} level={level} cast={cast} pawn={pawn} pawnPose="sing" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Record a Session"}
          onPrimary={handleSession}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand studio — live room, drum kit, and gold records on the wall." : "A second booth and a mixing console with sliders."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Record a session once an hour. Every song starts with one take.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Warming up the tubes…</Text>}
      </ScrollView>
    </View>
  );
}
