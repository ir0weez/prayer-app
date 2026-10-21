// Observatory interior: a dome under the open sky. A great telescope
// points through the slit, star charts cover the walls, and villagers
// stargaze from the gallery rail. The pawn charts a constellation.
// "Chart the Stars" grants XP on a 1-hour cooldown (no coins — the stars
// are their own reward).
// L1: small dome, chart table. L2: bigger telescope, planetarium globe.
// L3: grand observatory — twin telescopes, star map ceiling, brass orrery.
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
import { StarsGame } from "@/components/stars-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";

const BG = "#101828";
const TEXT_DIM = "#8A94A8";
const ACCENT = "#7FA8C9";

const CHART_XP: Record<number, number> = { 1: 10, 2: 18, 3: 30 };
const COOLDOWN_MS = 60 * 60 * 1000;
const CHART_KEY = "prayercircle.interior.observatory.chart.v1";






export default function ObservatoryInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const stars = useMiniGameHost("stars", addCoins);
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastChart, setLastChart] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(CHART_KEY).catch(() => null);
      setLastChart(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastChart + COOLDOWN_MS - Date.now());
  const stargazers = pickPeople(people, `observatory|${building?.id ?? "observatory"}|gaze`, 3);
  const charting = pickPeople(people, `observatory|${building?.id ?? "observatory"}|chart`, 1)[0];
  const cast = [
    ...stargazers.map((person) => ({ person, pose: "stand" as const })),
    ...(charting ? [{ person: charting, pose: "work" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "A grand observatory — telescopes, star charts, and a dome full of stars."
      : level >= 2
        ? "A fine observatory — a great telescope and chart tables."
        : "A humble dome — a small telescope and the whole night sky above.";

  const handleChart = async () => {
    if (remaining > 0) {
      Alert.alert("The sky is mapped", `The current charts are drying on the table.\n\nChart new stars in about ${formatCooldown(remaining)}.`);
      return;
    }
    const xp = scaledXP(CHART_XP[level] ?? 10);
    const t = Date.now();
    setLastChart(t);
    await AsyncStorage.setItem(CHART_KEY, String(t)).catch(() => undefined);
    addCoins(0);
    awardCustomXP(xp, `observatory-chart-${t}`).catch(() => undefined);
    Alert.alert("Stars Charted", `You trace a new constellation — "He counts the number of the stars; He calls them all by name."\n\n+${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="star" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="star"
          iconColor={ACCENT}
          title="Observatory"
          blurb={`A dome under the open sky. ${levelBlurb}`}
          accent="#26354D"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["observatory"]} level={level} cast={cast} pawn={pawn} pawnPose="stand" width={sceneWidth} labelColor="#E8EDF5" />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Chart the Stars"}
          onPrimary={handleChart}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "More telescopes, a star-mapped dome, and charts on every wall." : "A great telescope and wider chart tables."
            )
          }
        />
        <PlayCard
          icon="star"
          title="Play: Chart the Stars"
          blurb="Constellations light star by star — tap them in order and draw the chart."
          playsLeft={stars.playsLeft}
          cap={stars.cap}
          accent={ACCENT}
          onPlay={() => stars.setPlaying(true)}
        />
        {stars.playing && <StarsGame accent={ACCENT} onComplete={stars.handleComplete} onExit={() => stars.setPlaying(false)} />}
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Chart the stars once an hour. The heavens declare His glory — pure XP.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the dome…</Text>}
      </ScrollView>
    </View>
  );
}
