// Apothecary interior: herbs hung to dry, remedies brewing. Villagers
// grind and bottle at the work counter, potion shelves glow amber and
// violet, and the pawn brews a remedy of their own.
// "Brew a Remedy" grants coins + XP on a 1-hour cooldown.
// L1: counter, herb bundles, small shelf. L2: brewing cauldron, more
// shelves, hanging garden. L3: grand apothecary — great cauldron,
// alchemy glassware, gold-trimmed shelves, skylight of green glass.
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
import { BrewGame } from "@/components/brew-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";

const BG = "#F1F7EC";
const TEXT_DIM = "#8A9A76";
const ACCENT = "#3F7A3A";

const BREW_COINS: Record<number, number> = { 1: 50, 2: 100, 3: 180 };
const BREW_XP: Record<number, number> = { 1: 4, 2: 8, 3: 14 };
const COOLDOWN_MS = 60 * 60 * 1000;
const BREW_KEY = "prayercircle.interior.apothecary.brew.v1";






export default function ApothecaryInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const brew = useMiniGameHost("brew", addCoins);
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);
  const [lastBrew, setLastBrew] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(BREW_KEY).catch(() => null);
      setLastBrew(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastBrew + COOLDOWN_MS - Date.now());
  const brewing = pickPeople(people, `apothecary|${building?.id ?? "apothecary"}|brew`, 3);
  const grinding = pickPeople(people, `apothecary|${building?.id ?? "apothecary"}|grind`, 1)[0];
  const cast = [
    ...brewing.map((person) => ({ person, pose: "work" as const })),
    ...(grinding ? [{ person: grinding, pose: "stand" as const }] : []),
  ];

  const levelBlurb =
    level >= 3
      ? "A grand apothecary — remedy shelves to the ceiling and herbs hanging to dry."
      : level >= 2
        ? "A thriving apothecary — full remedy shelves and herbs hanging to dry."
        : "A humble apothecary — a work counter, small shelf, and bundles of herbs.";

  const handleBrew = async () => {
    if (remaining > 0) {
      Alert.alert("The brew is steeping", `The cauldron needs time to work.\n\nBrew another remedy in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(BREW_COINS[level] ?? 5);
    const xp = scaledXP(BREW_XP[level] ?? 4);
    const t = Date.now();
    setLastBrew(t);
    await AsyncStorage.setItem(BREW_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `apothecary-brew-${t}`).catch(() => undefined);
    Alert.alert("Remedy Brewed", `You stir the green-gold brew and bottle it with care.\n\n+${formatCoins(c)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="science" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="local-pharmacy"
          iconColor={ACCENT}
          title="Apothecary"
          blurb={`Herbs hung to dry, remedies brewed with care. ${levelBlurb}`}
          accent="#DCEBD2"
        />

        <View style={{ marginHorizontal: 16 }}>
          <PaperRoomScene config={PAPER_ROOMS["apothecary"]} level={level} cast={cast} pawn={pawn} pawnPose="work" width={sceneWidth} />
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Brew a Remedy"}
          onPrimary={handleBrew}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "Remedy shelves to the ceiling and herbs hanging to dry." : "Fuller remedy shelves and herbs hanging from the beam."
            )
          }
        />
        <PlayCard
          icon="science"
          title="Play: Brew the Tonic"
          blurb="Each tonic has its recipe — add the jars in order and watch it glow."
          playsLeft={brew.playsLeft}
          cap={brew.cap}
          accent={ACCENT}
          onPlay={() => brew.setPlaying(true)}
        />
        {brew.playing && <BrewGame accent={ACCENT} onComplete={brew.handleComplete} onExit={() => brew.setPlaying(false)} />}
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Brew a remedy once an hour. Measure twice, stir once.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Grinding the herbs…</Text>}
      </ScrollView>
    </View>
  );
}
