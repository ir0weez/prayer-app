// Theater / amphitheater interior: the villagers and the pawn watching a show.
// The stage animation themes itself to the movie event's title + notes:
// scary movie night -> haunted house, moon, bats, flickering light.
// Generic movie animation when no theme keyword matches.
// No emojis — SVG art and MaterialIcons only. Gentle fades, no bounce.

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from "react-native-svg";
import {
  BUILDINGS,
  COINS_STORAGE_KEY,
  TOWN_STORAGE_KEY,
  parseCoins,
  applyCoinsDelta,
  parseTown,
  prayedTodayPeople,
  scaledCoins,
  scaledXP,
  beginConstruction,
  constructionTimeLabel,
  upgradeCostFor,
  type HometownCoins,
  type PlacedBuilding,
  type PrayedPerson,
  formatCoins,
} from "@/lib/hometown";
import {
  SHOW_COINS,
  SHOW_XP,
  formatCooldown,
  saveLastShow,
  showMsRemaining,
} from "@/lib/gathering-places";
import { awardCustomXP } from "@/lib/xp-engine";
import { isEventActive } from "@/lib/heavenly-events";
import { getActiveScheduleActivity, movieThemeForTitle, type MovieThemeKind } from "@/lib/schedule-sync";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import { pickPeople } from "@/components/activity-figures";
import { PaperTheaterScene } from "@/components/paper-room";
import type { PaperTheaterGenre } from "@/lib/paper-rooms";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { PopcornGame } from "@/components/popcorn-game";
import { RhythmGame } from "@/components/rhythm-game";
import { PlayCard, type MiniGameReward } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";
import { MINI_GAME_CAPS, playsLeftToday, recordPlay, scaleMiniGamePayout } from "@/lib/mini-games";
import {
  getCachedSchoolPerks,
  refreshSchoolPerksCache,
  type SchoolPerks,
} from "@/lib/school-perks";

const BG = "#141021"; // night theater
const CARD = "#221B36";
const GOLD = "#E0A63F";
const FLAME = "#FF9A3D";
const TEXT = "#F2EAD8";
const TEXT_DIM = "#A99BC4";

const THEME_LABELS: Record<MovieThemeKind, string> = {
  horror: "Scary movie night",
  comedy: "Comedy night",
  action: "Action night",
  romance: "Romance night",
  christmas: "Christmas movie night",
  western: "Western night",
  scifi: "Sci-fi night",
  musical: "Musical night",
  kids: "Family movie night",
  drama: "Drama night",
  generic: "Movie night",
};

// ---------- main screen ----------

export default function TheaterInteriorScreen() {
  const router = useRouter();
  const { buildingId } = useLocalSearchParams<{ buildingId?: string }>();
  const { width } = useWindowDimensions();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [building, setBuilding] = useState<PlacedBuilding | null>(null);
  const [people, setPeople] = useState<PrayedPerson[]>([]);
  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  const [activity, setActivity] = useState<{ title: string; notes?: string } | null>(null);
  const [lastShow, setLastShow] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [popcornPlaysLeft, setPopcornPlaysLeft] = useState<number | null>(null);
  const [playingPopcorn, setPlayingPopcorn] = useState(false);
  const [schoolPerks, setSchoolPerks] = useState<SchoolPerks | null>(null);

  useEffect(() => {
    playsLeftToday("popcorn").then(setPopcornPlaysLeft).catch(() => setPopcornPlaysLeft(0));
    // School Campus perk: the Music Room lifts Rhythm of Worship payouts.
    refreshSchoolPerksCache().then(setSchoolPerks).catch(() => undefined);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [coinsRaw, townRaw] = await Promise.all([
          AsyncStorage.getItem(COINS_STORAGE_KEY),
          AsyncStorage.getItem(TOWN_STORAGE_KEY),
        ]);
        setCoins(parseCoins(coinsRaw ? JSON.parse(coinsRaw) : {}));
        if (townRaw && buildingId) {
          const town = parseTown(JSON.parse(townRaw));
          outer: for (const mapId of Object.keys(town.maps) as Array<keyof typeof town.maps>) {
            const found = town.maps[mapId].buildings.find((b) => b.id === buildingId);
            if (found) { setBuilding(found); break outer; }
          }
        }
        setPeople(await prayedTodayPeople());
        const p = await loadCustomPawn().catch(() => null);
        if (p) setPawn(p);
        const act = await getActiveScheduleActivity().catch(() => null);
        if (act && act.kind === "amphitheater") setActivity({ title: act.title, notes: act.notes });
        const raw = await AsyncStorage.getItem("prayercircle.hometown.amphitheater-show.v1").catch(() => null);
        setLastShow(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
      setLoaded(true);
    })();
  }, [buildingId]);

  const coinsRef = useRef(coins);
  useEffect(() => { coinsRef.current = coins; }, [coins]);

  // Canonical ledger (v167): delta applied to the freshest stored
  // record via lib applyCoinsDelta — never this screen's snapshot.
  const addCoins = useCallback((delta: number) => {
    void applyCoinsDelta(delta, "cent").then((next) => setCoins(next));
  }, []);

  const handlePopcornComplete = (raw: MiniGameReward): MiniGameReward => {
    const _pay = scaleMiniGamePayout(scaledCoins(raw.coins), scaledXP(raw.xp));
    const c = _pay.coins;
    const xp = _pay.xp;
    if (c > 0) addCoins(c);
    if (xp > 0) awardCustomXP(xp, `minigame-popcorn-${Date.now()}`).catch(() => undefined);
    recordPlay("popcorn").then(setPopcornPlaysLeft).catch(() => undefined);
    return { coins: c, xp };
  };

  // Rhythm of Worship — shared host (components/mini-game-host.ts): the
  // same daily cap and payout pipeline as the campus Music Room,
  // including the Music Room's +25% payout perk while it stands.
  const rhythm = useMiniGameHost("rhythm", addCoins, {
    perkMult: () => getCachedSchoolPerks().rhythmMult,
  });

  const theme: MovieThemeKind = movieThemeForTitle(activity?.title ?? "", activity?.notes);
  const level = Math.min(Math.max(building?.level || 1, 1), 3);
  const def = building ? BUILDINGS[building.type as keyof typeof BUILDINGS] : null;
  const name = def?.name ?? "Amphitheater";

  // audience: up to 15 villagers in the paper theater's seat rows,
  // the hero among them (the scene seats them from behind)
  const audience = pickPeople(people, `theater|${buildingId ?? "amp"}`, 15);
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 32, 560);

  const remaining = showMsRemaining(lastShow);

  const handleAttend = () => {
    if (remaining > 0) {
      Alert.alert("Next show", `The villagers are rehearsing — music drifts across the city.\n\nNext show in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(SHOW_COINS[level] ?? 10);
    const xp = scaledXP(SHOW_XP[level] ?? 15);
    const festival = isEventActive("weekend-festival");
    const fc = festival ? c * 2 : c;
    const fxp = festival ? xp * 2 : xp;
    const t = Date.now();
    setLastShow(t);
    saveLastShow(t).catch(() => undefined);
    addCoins(fc);
    awardCustomXP(fxp, `amphitheater-show-${t}`).catch(() => undefined);
    Alert.alert(THEME_LABELS[theme], `The lights dim, the crowd settles in…\n\n+${formatCoins(fc)} coins, +${fxp} XP${festival ? " (Festival double!)" : ""}.`);
  };

  const handleUpgrade = () => {
    if (level >= 3 || !buildingId) return;
    const nextLevel = (level + 1) as 2 | 3;
    const cost = upgradeCostFor(building?.type as any, nextLevel);
    if (coinsRef.current.balance < cost) {
      Alert.alert("Not enough coins", `You need ${formatCoins(cost)} coins. You have ${formatCoins(coinsRef.current.balance)}.`);
      return;
    }
    // Construction timers: the time is named before he commits; the
    // theater then closes under scaffolding and reopens at the new level.
    Alert.alert(
      `Upgrade to level ${nextLevel}?`,
      `${formatCoins(cost)} coins. ${constructionTimeLabel(nextLevel, false)} — the theater closes while it builds and reopens at level ${nextLevel}.\n\n${nextLevel >= 3 ? "The grand stage glows — braziers lit, banners flying." : "A bigger stage, more voices."}`,
      [
        { text: "Not yet", style: "cancel" },
        {
          text: "Start upgrade",
          onPress: () => {
            addCoins(-cost);
            (async () => {
              try {
                const townRaw = await AsyncStorage.getItem(TOWN_STORAGE_KEY);
                if (!townRaw) return;
                const town = parseTown(JSON.parse(townRaw));
                for (const mapId of Object.keys(town.maps) as Array<keyof typeof town.maps>) {
                  const idx = town.maps[mapId].buildings.findIndex((x) => x.id === buildingId);
                  if (idx >= 0) {
                    town.maps[mapId].buildings[idx] = beginConstruction(town.maps[mapId].buildings[idx], nextLevel, Date.now());
                    break;
                  }
                }
                await AsyncStorage.setItem(TOWN_STORAGE_KEY, JSON.stringify(town));
                setBuilding((prev) => (prev ? beginConstruction(prev, nextLevel, Date.now()) : prev));
                Alert.alert(name, `Upgrade underway! The builders move in — the theater reopens at level ${nextLevel} in ${nextLevel === 2 ? "30 minutes" : "1 hour"}.`, [{ text: "Back to the map", onPress: () => router.back() }]);
              } catch {}
            })();
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={TEXT} />
        </Pressable>
        <MaterialIcons name="theater-comedy" size={26} color={GOLD} style={{ marginLeft: 4 }} />
        <Text style={{ marginLeft: 8, fontSize: 20, fontWeight: "800", color: TEXT }}>{name}</Text>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: CARD, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#3A2E55" }}>
          <MaterialIcons name="monetization-on" size={15} color={GOLD} />
          <Text style={{ marginLeft: 5, fontWeight: "700", color: TEXT }}>{formatCoins(coins.balance)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* theme banner */}
        <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 16, backgroundColor: CARD, borderWidth: 1, borderColor: GOLD, padding: 12, flexDirection: "row", alignItems: "center" }}>
          <MaterialIcons name="movie" size={24} color={GOLD} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={{ color: TEXT, fontWeight: "800", fontSize: 15 }}>{THEME_LABELS[theme]}</Text>
            <Text style={{ color: TEXT_DIM, fontSize: 12, marginTop: 2 }}>
              {activity ? `"${activity.title}"${activity.notes ? ` — ${activity.notes}` : ""}` : "The marquee glows — tonight's show is about to begin."}
            </Text>
          </View>
        </View>

        {/* the screen + audience — the paper theater: the picture on
            the screen keys off tonight's genre exactly as the drawn
            stage did ('scary' in the title/notes haunts the house;
            a plain "Movie" shows the curtained star screen), and the
            audience sits in seat rows seen from behind, each head in
            its own hair and shirt colors, the hero among them. */}
        <View style={{ marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#3A2E55", overflow: "hidden", backgroundColor: "#0B0817", alignItems: "center" }}>
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="theater" />
          <PaperTheaterScene level={level} genre={theme as PaperTheaterGenre} audience={audience} pawn={pawn} width={sceneWidth} />
          {isEventActive("weekend-festival") && (
            <Text style={{ color: GOLD, fontSize: 12, fontWeight: "700", paddingVertical: 8 }}>Weekend Festival — the bunting is up and every seat is warm.</Text>
          )}
          {audience.length === 0 && !pawn && (
            <Text style={{ color: TEXT_DIM, fontSize: 13, fontStyle: "italic", textAlign: "center", paddingVertical: 12 }}>
              The seats are empty. Pray for someone today and they'll take a seat.
            </Text>
          )}
        </View>

        {/* actions */}
        <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 16 }}>
          <Pressable
            onPress={handleAttend}
            style={{ flex: 1, backgroundColor: GOLD, borderRadius: 14, paddingVertical: 13, alignItems: "center", marginRight: 8 }}
          >
            <Text style={{ color: "#241811", fontWeight: "800", fontSize: 15 }}>
              {remaining > 0 ? `Next show in ${formatCooldown(remaining)}` : "Attend the Show"}
            </Text>
          </Pressable>
          {level < 3 && (
            <Pressable onPress={handleUpgrade} style={{ backgroundColor: CARD, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, alignItems: "center", borderWidth: 1, borderColor: GOLD }}>
              <Text style={{ color: GOLD, fontWeight: "800", fontSize: 14 }}>Upgrade</Text>
            </Pressable>
          )}
        </View>
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          {level >= 3 ? "The grand stage glows — music, stories, and light fill the night air."
            : level >= 2 ? "A bigger stage, more voices — the whole city seems to lean in."
            : "A simple stage, honest music. The villagers gather close."}
        </Text>

        {building?.type === "amphitheater" ? (
          <>
            <PlayCard
              icon="music-note"
              title="Play: Rhythm of Worship"
              blurb={`Golden notes drift down to a 90 BPM heartbeat. Tap each lane as its note crosses the ring — the song is the offering.${schoolPerks?.musicRoomBuilt ? " The campus Music Room lifts every payout +25%." : ""}`}
              playsLeft={rhythm.playsLeft}
              cap={rhythm.cap}
              accent={GOLD}
              onPlay={() => rhythm.setPlaying(true)}
              gameId="rhythm"
            />
            {rhythm.playing && (
              <RhythmGame accent={GOLD} onComplete={rhythm.handleComplete} onExit={() => rhythm.setPlaying(false)} />
            )}
          </>
        ) : (
          <>
            <PlayCard
              icon="local-movies"
              title="Play: Popcorn Catch"
              blurb="Kernels rain for 45 seconds — slide the bucket and catch the golden ones. The black ones are burnt; let them fall."
              playsLeft={popcornPlaysLeft}
              cap={MINI_GAME_CAPS.popcorn}
              accent={GOLD}
              onPlay={() => setPlayingPopcorn(true)}
              gameId="popcorn"
            />
            {playingPopcorn && (
              <PopcornGame accent={GOLD} onComplete={handlePopcornComplete} onExit={() => setPlayingPopcorn(false)} />
            )}
          </>
        )}

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Dimming the lights…</Text>}
      </ScrollView>
    </View>
  );
}
