// Town Hall interior: the civic heart of town. Villagers gather in the
// grand hall for the assembly, the notice board carries the town's news,
// and the pawn takes a seat among neighbors.
// "Attend Assembly" grants XP on a 1-hour cooldown (no coins — civic duty
// is its own reward).
// L1: hall, podium, notice board. L2: banners, gallery rail, more seats.
// L3: grand civic hall — great seal, tall banners, chandelier, marble.
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
import { scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";

const BG = "#F2EEE4";
const STONE = "#D6CDBB";
const STONE_DARK = "#8A7F6A";
const TEXT_DIM = "#A0977F";
const ACCENT = "#1D4ED8";
const GOLD = "#C9963C";
const BLUE = "#1D4ED8";

const ASSEMBLY_XP: Record<number, number> = { 1: 12, 2: 22, 3: 40 };
const COOLDOWN_MS = 60 * 60 * 1000;
const ASSEMBLY_KEY = "prayercircle.interior.townhall.assembly.v1";

export default function TownHallInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastAssembly, setLastAssembly] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(ASSEMBLY_KEY).catch(() => null);
      setLastAssembly(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastAssembly + COOLDOWN_MS - Date.now());
  const seated = pickPeople(people, `townhall|${building?.id ?? "townhall"}|seated`, 4);
  const speaker = pickPeople(people, `townhall|${building?.id ?? "townhall"}|speaker`, 1)[0];
  const reading = pickPeople(people, `townhall|${building?.id ?? "townhall"}|board`, 1)[0];

  const cast: PaperCastEntry[] = [
    ...(speaker ? [{ person: speaker, pose: "stand" as const }] : []),
    ...(reading ? [{ person: reading, pose: "stand" as const }] : []),
    ...seated.map((person) => ({ person, pose: "seated" as const })),
  ];

  const levelBlurb =
    level >= 3
      ? "A grand civic hall — tall banners, rows of seats, and stone underfoot."
      : level >= 2
        ? "A proud hall — civic banners and rows of seats."
        : "A humble hall — a podium and neighbors gathering.";

  const handleAssembly = async () => {
    if (remaining > 0) {
      Alert.alert("The hall is quiet", `The assembly has adjourned for now.\n\nAttend again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const xp = scaledXP(ASSEMBLY_XP[level] ?? 12);
    const t = Date.now();
    setLastAssembly(t);
    await AsyncStorage.setItem(ASSEMBLY_KEY, String(t)).catch(() => undefined);
    addCoins(0);
    awardCustomXP(xp, `townhall-assembly-${t}`).catch(() => undefined);
    Alert.alert("Assembly Attended", `You take your seat as the town gathers — every voice heard, every neighbor seen.\n\n+${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="account-balance" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="gavel"
          iconColor={ACCENT}
          title="Town Hall"
          blurb={`The civic heart of town. ${levelBlurb}`}
          accent="#DCD4BE"
        />

        {/* town-hall scene — paper cutout */}
        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["town-hall"]} level={level} cast={cast} pawn={pawn} pawnPose="seated" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Attend Assembly"}
          onPrimary={handleAssembly}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A grand civic hall — the great seal in gold, tall banners, marble underfoot." : "Civic banners, a gallery rail, and rows of seats for the town."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Attend the assembly once an hour. Good neighbors make a good town — pure XP.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Calling the meeting to order…</Text>}
      </ScrollView>
    </View>
  );
}
