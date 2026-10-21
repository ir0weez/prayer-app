// Music Hall interior: song rises from the stage. Villagers play fiddles,
// pipes, and drums, a choir sings in rows, and the pawn listens from the
// front seats — or joins the song.
// "Join the Song" grants XP on a 1-hour cooldown (no coins — music is its
// own reward).
// L1: small stage, two players. L2: bigger stage, choir risers, curtains.
// L3: grand concert hall — full band, choir, organ pipes, chandelier.
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
import { scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { EchoGame } from "@/components/echo-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";

const BG = "#F7ECEC";
const TEXT_DIM = "#A08787";
const ACCENT = "#B4232F";

const SONG_XP: Record<number, number> = { 1: 8, 2: 14, 3: 24 };
const COOLDOWN_MS = 60 * 60 * 1000;
const SONG_KEY = "prayercircle.interior.musichall.song.v1";





export default function MusicHallInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const echo = useMiniGameHost("echo", addCoins);
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastSong, setLastSong] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(SONG_KEY).catch(() => null);
      setLastSong(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastSong + COOLDOWN_MS - Date.now());
  const players = pickPeople(people, `musichall|${building?.id ?? "musichall"}|play`, level >= 3 ? 3 : 2);
  const choir = pickPeople(people, `musichall|${building?.id ?? "musichall"}|choir`, level >= 2 ? 3 : 1);
  const seatmate = pickPeople(people, `musichall|${building?.id ?? "musichall"}|seat`, 1)[0];
  const cast = [
    ...players.map((person) => ({ person, pose: "sing" as const })),
    ...choir.map((person) => ({ person, pose: "sing" as const })),
    ...(seatmate ? [{ person: seatmate, pose: "seated" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "A grand concert hall — a curtained stage and a full band with choir."
      : level >= 2
        ? "A lively hall — a curtained stage and music in the air."
        : "A humble hall — a small stage, two players, and a song beginning.";

  const handleSong = async () => {
    if (remaining > 0) {
      Alert.alert("The song lingers", `The last hymn still echoes in the hall.\n\nJoin the next song in about ${formatCooldown(remaining)}.`);
      return;
    }
    const xp = scaledXP(SONG_XP[level] ?? 8);
    const t = Date.now();
    setLastSong(t);
    await AsyncStorage.setItem(SONG_KEY, String(t)).catch(() => undefined);
    addCoins(0);
    awardCustomXP(xp, `musichall-song-${t}`).catch(() => undefined);
    Alert.alert("You Join the Song", `Your voice rises with the villagers — harmony fills the hall.\n\n+${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="music-note" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="piano"
          iconColor={ACCENT}
          title="Music Hall"
          blurb={`Song rises from the stage. ${levelBlurb}`}
          accent="#F3D9D9"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["music-hall"]} level={level} cast={cast} pawn={pawn} pawnPose="sing" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Join the Song"}
          onPrimary={handleSong}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand concert hall — a fuller stage, a full band and choir." : "A curtained stage and room for more voices."
            )
          }
        />
        <PlayCard
          icon="piano"
          title="Play: Encore Echo"
          blurb="The hall plays a melody — echo it back on the pads, note for note."
          playsLeft={echo.playsLeft}
          cap={echo.cap}
          accent={ACCENT}
          onPlay={() => echo.setPlaying(true)}
        />
        {echo.playing && <EchoGame accent={ACCENT} onComplete={echo.handleComplete} onExit={() => echo.setPlaying(false)} />}
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Join the song once an hour. Music is its own reward — pure XP.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Tuning the instruments…</Text>}
      </ScrollView>
    </View>
  );
}
