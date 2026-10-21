// Workshop interior (School Campus): the campus's steady earner — a
// woodworking shop that grows with level: L1 one bench and a few tools, L2
// a pegboard tool wall and a second bench, L3 a lumber rack, a finished-
// furniture shelf, and a big window. "Finish a Project" grants coins + XP
// on a 1-hour cooldown, in the ministry-building pattern.
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


const BG = "#FAF6F0";
const WOOD = "#A9743F";
const WOOD_DARK = "#6B4A2F";
const ACCENT = "#92600F";
const ACCENT_DARK = "#713F12";
const TEXT_DIM = "#A08B6D";

const PROJECT_KEY = "prayercircle.interior.workshop.project.v1";
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const ACTION_COINS: Record<1 | 2 | 3, number> = { 1: 16, 2: 30, 3: 52 };
const ACTION_XP: Record<1 | 2 | 3, number> = { 1: 8, 2: 14, 3: 22 };

export default function WorkshopInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastAction, setLastAction] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROJECT_KEY);
        setLastAction(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    })();
  }, []);

  const remaining = Math.max(0, lastAction + COOLDOWN_MS - Date.now());
  const actionCoins = scaledCoins(ACTION_COINS[level]);
  const actionXp = scaledXP(ACTION_XP[level]);
  const workers = pickPeople(people, `workshop|${building?.id ?? "shop"}|workers`, level >= 3 ? 3 : 2);

  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const levelBlurb =
    level >= 3
      ? "A master's shop — benches in a row, and finished pieces selling as fast as they're made."
      : level >= 2
        ? "More benches and tools on every top — orders are picking up."
        : "Benches, a handsaw, and honest work.";

  const handleAction = async () => {
    if (remaining > 0) {
      Alert.alert("Glue Drying", `The current project needs to set.\n\nFinish the next one in about ${formatCooldown(remaining)}.`);
      return;
    }
    const t = Date.now();
    setLastAction(t);
    await AsyncStorage.setItem(PROJECT_KEY, String(t)).catch(() => undefined);
    addCoins(actionCoins);
    await awardCustomXP(actionXp, `workshop-project-${t}`).catch(() => undefined);
    Alert.alert("Project Finished", `Last screw in, edges sanded smooth — a piece built to be handed down.\n\n+${formatCoins(actionCoins)} coins, +${actionXp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="handyman" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="handyman"
          iconColor={ACCENT}
          title="The Workshop"
          blurb={`Finish a project — worth +${formatCoins(actionCoins)} coins, +${actionXp} XP. ${levelBlurb}`}
          accent="#E7D8BE"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["workshop"]} level={level} cast={workers.map((person) => ({ person, pose: "work" as const }))} pawn={pawn} pawnPose="work" width={sceneWidth} />
        </View>

                <InteriorActions
          primaryLabel={remaining > 0 ? `Next project in ${formatCooldown(remaining)}` : "Finish a Project"}
          onPrimary={handleAction}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() => handleUpgrade(level + 1 >= 3 ? "A lumber rack and a shelf of finished pieces." : "A pegboard tool wall and a second bench.")}
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          The Workshop is the campus's steady earner — no frills, just honest daily coins.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Sweeping up the sawdust…</Text>}
      </ScrollView>
    </View>
  );
}
