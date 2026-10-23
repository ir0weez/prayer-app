// Music Room interior (School Campus): a choir room that grows with level —
// L1 a piano and a music stand, L2 drums and guitars join, L3 risers full of
// singers, a banner, and speakers. "Lead a Rehearsal" grants coins + XP on a
// 1-hour cooldown, in the ministry-building pattern. While the Music Room
// stands, Rhythm of Worship payouts grow +25% (lib/school-perks.ts).
// No emojis — SVG art and MaterialIcons only.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatCooldown } from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import { scaledCoins, scaledXP,
  formatCoins,
} from "@/lib/hometown";
import {
  useInteriorData,
  InteriorHeader,
  InteriorBanner,
  InteriorActions,
} from "@/components/interior-shell";
import { pickPeople } from "@/components/activity-figures";
import { PaperRoomScene } from "@/components/paper-room";
import { PAPER_ROOMS } from "@/lib/paper-rooms";

import { RhythmGame } from "@/components/rhythm-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";
import {
  getCachedSchoolPerks,
  refreshSchoolPerksCache,
  type SchoolPerks,
} from "@/lib/school-perks";

const BG = "#F5F0FA";
const WOOD = "#8B5E34";
const WOOD_DARK = "#5E3D22";
const ACCENT = "#7C3AED";
const ACCENT_DARK = "#5B21B6";
const TEXT_DIM = "#8A7CA8";

const REHEARSAL_KEY = "prayercircle.interior.musicroom.rehearsal.v1";
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const ACTION_COINS: Record<1 | 2 | 3, number> = { 1: 12, 2: 22, 3: 38 };
const ACTION_XP: Record<1 | 2 | 3, number> = { 1: 8, 2: 14, 3: 24 };

export default function MusicRoomInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastAction, setLastAction] = useState(0);
  const [schoolPerks, setSchoolPerks] = useState<SchoolPerks | null>(null);

  // Rhythm of Worship, hosted here in the Music Room — shared host
  // (components/mini-game-host.ts): the same daily cap and payout
  // pipeline as the town Amphitheater, including this room's own +25%
  // payout perk while it stands.
  const rhythm = useMiniGameHost("rhythm", addCoins, {
    perkMult: () => getCachedSchoolPerks().rhythmMult,
  });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(REHEARSAL_KEY);
        setLastAction(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
    refreshSchoolPerksCache().then(setSchoolPerks).catch(() => undefined);
  }, []);

  const remaining = Math.max(0, lastAction + COOLDOWN_MS - Date.now());
  const actionCoins = scaledCoins(ACTION_COINS[level]);
  const actionXp = scaledXP(ACTION_XP[level]);
  const singers = pickPeople(people, `musicroom|${building?.id ?? "music"}|singers`, level >= 3 ? 6 : 3);

  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const levelBlurb =
    level >= 3
      ? "A full choir room — music stands, instruments, and voices raised."
      : level >= 2
        ? "Drums and guitars have joined the stands — the room is finding its sound."
        : "A music stand, and a fresh song to learn.";

  const handleAction = async () => {
    if (remaining > 0) {
      Alert.alert("Voices Resting", `The choir is taking a break.\n\nLead another rehearsal in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastAction(t);
    await AsyncStorage.setItem(REHEARSAL_KEY, String(t)).catch(() => undefined);
    addCoins(actionCoins);
    await awardCustomXP(actionXp, `musicroom-rehearsal-${t}`).catch(() => undefined);
    Alert.alert("A Good Rehearsal", `You run the new song twice through — by the second pass, the room is singing it like they wrote it.\n\n+${formatCoins(actionCoins)} coins, +${actionXp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="music-note" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="music-note"
          iconColor={ACCENT}
          title="Rehearsal Room"
          blurb={`Lead a rehearsal — worth +${formatCoins(actionCoins)} coins, +${actionXp} XP. ${levelBlurb}`}
          accent="#DDD6FE"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["music-room"]} level={level} cast={singers.map((person) => ({ person, pose: "sing" as const }))} pawn={pawn} pawnPose="sing" width={sceneWidth} />
        </View>

                <InteriorActions
          primaryLabel={remaining > 0 ? `Rehearsal in ${formatCooldown(remaining)}` : "Lead a Rehearsal"}
          onPrimary={handleAction}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade(level + 1 >= 3 ? "Risers for the whole choir, a song banner, and speakers." : "Drums and a guitar join the piano.")}
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          While the Music Room stands, Rhythm of Worship payouts grow +25%.
        </Text>

        <PlayCard
          icon="music-note"
          title="Play: Rhythm of Worship"
          blurb={`Golden notes drift down to a 90 BPM heartbeat. Tap each lane as its note crosses the ring — the song is the offering.${schoolPerks?.musicRoomBuilt ? " This room lifts every payout +25%." : ""}`}
          playsLeft={rhythm.playsLeft}
          cap={rhythm.cap}
          accent={ACCENT}
          onPlay={() => rhythm.setPlaying(true)}
          gameId="rhythm"
        />
        {rhythm.playing && (
          <RhythmGame accent={ACCENT} onComplete={rhythm.handleComplete} onExit={() => rhythm.setPlaying(false)} />
        )}

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Tuning the piano…</Text>}
      </ScrollView>
    </View>
  );
}
