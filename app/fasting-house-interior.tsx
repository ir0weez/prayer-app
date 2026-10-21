// The Fasting House interior: a quiet room set apart for prayer and
// fasting. Prayer benches, lit candles, and one long table that stays
// bare — nothing is served here. Fasting schedule events bring the hero
// here alone. "Sit in the Quiet" grants a few coins + XP on a 1-hour
// cooldown.
// L1: two benches, a candle stand, the bare table.
// L2: a second row of benches, more candles, a rug.
// L3: a garden window, a third row, candle stands along the wall.
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
import { CandleGame } from "@/components/candle-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";

const BG = "#F2F3EC";
const TEXT_DIM = "#9AA184";
const ACCENT = "#6B7250";

const QUIET_COINS: Record<number, number> = { 1: 25, 2: 50, 3: 100 };
const QUIET_XP: Record<number, number> = { 1: 10, 2: 18, 3: 32 };
const COOLDOWN_MS = 60 * 60 * 1000;
const QUIET_KEY = "prayercircle.interior.fastinghouse.quiet.v1";

export default function FastingHouseInteriorScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastQuiet, setLastQuiet] = useState(0);

  // Keep the Candle Lit — shared host (components/mini-game-host.ts):
  // the same daily cap and payout pipeline as the campus Chapel.
  const candle = useMiniGameHost("candle", addCoins);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(QUIET_KEY).catch(() => null);
      setLastQuiet(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastQuiet + COOLDOWN_MS - Date.now());
  // A few of the prayed-for kneel here too — quietly, at the benches.
  const kneeling = pickPeople(people, `fastinghouse|${building?.id ?? "house"}|kneel`, level >= 3 ? 4 : 3);

  const levelBlurb =
    level >= 3
      ? "A house of stillness — candles along the wall, tall windows, and room to kneel."
      : level >= 2
        ? "A quiet house — more candles, and a worn rug."
        : "A small quiet house — a candle stand, and the bare table.";

  const handleQuiet = async () => {
    if (remaining > 0) {
      Alert.alert("Still quiet here", `The hush is unbroken.\n\nSit again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(QUIET_COINS[level] ?? 25);
    const xp = scaledXP(QUIET_XP[level] ?? 10);
    const t = Date.now();
    setLastQuiet(t);
    await AsyncStorage.setItem(QUIET_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `fastinghouse-quiet-${t}`).catch(() => undefined);
    Alert.alert("In the quiet", `No food, no noise — just the Lord and the stillness. You leave lighter than you came.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="self-improvement" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="spa"
          iconColor={ACCENT}
          title="The Fasting House"
          blurb={`A room set apart — benches, candles, and a table that stays bare. ${levelBlurb}`}
          accent="#E2E5D2"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene
            config={PAPER_ROOMS["fasting-house"]}
            level={level}
            cast={kneeling.map((person) => ({ person, pose: "kneel" as const }))}
            pawn={pawn}
            pawnPose="kneel"
            width={sceneWidth}
          />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Sit in the Quiet"}
          onPrimary={handleQuiet}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A garden window, a third row of benches, and candles along the wall." : "A second row of benches, more candles, and a worn rug."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Sit in the quiet once an hour. The table stays bare; the heart doesn't.
        </Text>

        <PlayCard
          icon="local-fire-department"
          title="Play: Keep the Candle Lit"
          blurb="A minute of stillness. Distraction motes drift toward the flame — brush them away and keep the light bright."
          playsLeft={candle.playsLeft}
          cap={candle.cap}
          accent={ACCENT}
          onPlay={() => candle.setPlaying(true)}
        />
        {candle.playing && (
          <CandleGame accent={ACCENT} onComplete={candle.handleComplete} onExit={() => candle.setPlaying(false)} />
        )}

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Lighting the candles…</Text>}
      </ScrollView>
    </View>
  );
}
