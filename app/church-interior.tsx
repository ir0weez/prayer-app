import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  CHURCH_PRAYER_COINS_PER_HOUR,
  COINS_STORAGE_KEY,
  TOWN_STORAGE_KEY,
  churchNameFor,
  parseCoins,
  parseTown,
  prayedTodayPeople,
  type HometownCoins,
  type PlacedBuilding,
  type PrayedPerson,
  formatCoins,
} from "@/lib/hometown";
import { getActiveScheduleActivity, ministryActivityForTitle, type MinistryActivityKind } from "@/lib/schedule-sync";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import { PaperChurchScene, type PaperCastEntry } from "@/components/paper-room";
import type { PaperChurchMode } from "@/lib/paper-rooms";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import { BellGame } from "@/components/bell-game";
import { PlayCard } from "@/components/mini-game-scene";
import { useMiniGameHost } from "@/components/mini-game-host";

// ---------- palette: warm community church ----------
// Bright morning light, honey wood, cream walls — a welcoming gathering place.
const BG = "#FFF9F0"; // warm cream walls
const BG_SOFT = "#FDEFD8"; // warm peach cream (cards)
const WOOD = "#C68B4E"; // honey wood
const WOOD_DARK = "#8B5E34"; // darker warm wood
const WOOD_PALE = "#E3C193"; // pale warm wood (chair seats)
const GOLD = "#C9963C";
const FLAME = "#FF9A3D";
const TEXT = "#4A3826"; // warm dark brown
const TEXT_DIM = "#8A7358"; // warm muted brown
const SKY_TOP = "#FFE9B8"; // morning light at top of window
const SKY_BOT = "#FFD18A"; // warm glow at bottom of window

type FullPerson = PrayedPerson & { prayed: boolean };

// ---------- animated candle flame ----------
function CandleFlame({ size = 14 }: { size?: number }) {
  const flick = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flick, { toValue: 1, duration: 700 + Math.random() * 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flick, { toValue: 0, duration: 700 + Math.random() * 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [flick]);
  const scale = flick.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] });
  const opacity = flick.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: size * 2.4, height: size * 2.4 }}>
      {/* halo */}
      <Animated.View
        style={{
          position: "absolute",
          width: size * 2.2,
          height: size * 2.2,
          borderRadius: size * 1.1,
          backgroundColor: FLAME,
          opacity: flick.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.38] }),
        }}
      />
      {/* flame */}
      <Animated.View
        style={{
          width: size * 0.7,
          height: size,
          borderRadius: size * 0.35,
          backgroundColor: FLAME,
          transform: [{ scale }],
          opacity,
        }}
      />
    </View>
  );
}

// ---------- single candle ----------
function Candle({ person, onPress }: { person: FullPerson; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ width: 56, alignItems: "center", paddingVertical: 6 }}
      accessibilityLabel={person.prayed ? `${person.name}'s candle (lit)` : `${person.name}'s candle (unlit)`}
    >
      <View style={{ height: 30, justifyContent: "flex-end" }}>
        {person.prayed ? (
          <CandleFlame size={13} />
        ) : (
          <View
            style={{
              width: 5,
              height: 12,
              borderRadius: 2.5,
              backgroundColor: "#B09A7A",
            }}
          />
        )}
      </View>
      {/* wax body */}
      <View
        style={{
          width: 16,
          height: 30,
          borderRadius: 4,
          backgroundColor: person.prayed ? "#FFF6E3" : "#C9B18C",
          borderWidth: 1,
          borderColor: person.prayed ? GOLD : "#A98F68",
          shadowColor: person.prayed ? FLAME : "transparent",
          shadowOpacity: person.prayed ? 0.7 : 0,
          shadowRadius: 8,
          elevation: person.prayed ? 4 : 0,
        }}
      />
      <Text
        numberOfLines={1}
        style={{ marginTop: 4, fontSize: 9, color: person.prayed ? TEXT : TEXT_DIM, maxWidth: 52 }}
      >
        {person.name.split(" ")[0]}
      </Text>
    </Pressable>
  );
}

// ---------- tiny animated sparkle (crystal twinkle, sine easing, no bounce) ----------
const MINISTRY_TITLES: Record<MinistryActivityKind, string> = {
  "bible-study": "BIBLE STUDY",
  prayer: "PRAYER MEETING",
  worship: "WORSHIP",
  "small-group": "SMALL GROUP",
  serve: "SERVE PROJECT",
  general: "GATHERED TOGETHER",
};

// ---------- main screen ----------
export default function ChurchInteriorScreen() {
  const router = useRouter();
  const { buildingId } = useLocalSearchParams<{ buildingId?: string }>();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [building, setBuilding] = useState<PlacedBuilding | null>(null);
  const [people, setPeople] = useState<FullPerson[]>([]);
  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  const [ministry, setMinistry] = useState<{ kind: MinistryActivityKind; title: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [coinsRaw, townRaw, peopleRaw] = await Promise.all([
          AsyncStorage.getItem(COINS_STORAGE_KEY),
          AsyncStorage.getItem(TOWN_STORAGE_KEY),
          AsyncStorage.getItem("prayercircle.people.v1"),
        ]);
        setCoins(parseCoins(coinsRaw ? JSON.parse(coinsRaw) : {}));
        // find building for level/name
        if (townRaw && buildingId) {
          const town = parseTown(JSON.parse(townRaw));
          outer: for (const mapId of Object.keys(town.maps) as Array<keyof typeof town.maps>) {
            const found = town.maps[mapId].buildings.find((b) => b.id === buildingId);
            if (found) {
              setBuilding(found);
              break outer;
            }
          }
        }
        // all prayer contacts, marking prayed-today
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
          now.getDate()
        ).padStart(2, "0")}`;
        let all: FullPerson[] = [];
        try {
          const arr = peopleRaw ? JSON.parse(peopleRaw) : [];
          if (Array.isArray(arr)) {
            all = arr
              .filter((p: any) => p && typeof p.name === "string" && !p.isPersonal)
              .map((p: any) => ({
                id: String(p.id ?? p.name),
                name: String(p.name),
                accentColor: typeof p.accentColor === "string" ? p.accentColor : undefined,
                prayed: p.lastPrayerCompletedDate === today,
              }));
          }
        } catch {}
        // prayed first, then the rest
        all.sort((a, b) => (a.prayed === b.prayed ? 0 : a.prayed ? -1 : 1));
        setPeople(all);
        // the player's pawn, for the altar / ministry scenes
        loadCustomPawn().then((p) => p && setPawn(p)).catch(() => undefined);
        // is a ministry event happening right now? The scene adapts to it.
        getActiveScheduleActivity()
          .then((act) => {
            if (act && act.kind === "church") {
              setMinistry({ kind: ministryActivityForTitle(act.title), title: act.title });
            }
          })
          .catch(() => undefined);
      } catch {}
      setLoaded(true);
    })();
  }, [buildingId]);

  // Coin grants for the bell game, in the same storage pattern the
  // hometown economy uses everywhere: update the shown coins and
  // persist the whole object under COINS_STORAGE_KEY.
  const addCoins = useCallback((delta: number) => {
    setCoins((prev) => {
      const next = {
        balance: Math.round((prev.balance + delta) * 100) / 100,
        lifetimeEarned: delta > 0 ? Math.round((prev.lifetimeEarned + delta) * 100) / 100 : prev.lifetimeEarned,
      };
      AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const bell = useMiniGameHost("bell", addCoins);
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(windowWidth - 16, 560);

  const level = building?.level || 1;
  const churchName = churchNameFor(level);
  const prayed = people.filter((p) => p.prayed);
  const candleBonusPerHour = prayed.length * CHURCH_PRAYER_COINS_PER_HOUR;

  // The paper sanctuary adapts to the live ministry event, exactly as
  // the drawn room did: study circles, a kneeling prayer meeting,
  // singing worship, a working serve day — and, with nothing in
  // session, the congregation kneeling at the altar rail.
  const churchMode: PaperChurchMode =
    ministry?.kind === "bible-study" || ministry?.kind === "small-group"
      ? "study"
      : ministry?.kind === "prayer"
        ? "prayer"
        : ministry?.kind === "worship"
          ? "worship"
          : ministry?.kind === "serve"
            ? "serve"
            : "prayer";
  const churchCast: PaperCastEntry[] = prayed
    .slice(0, churchMode === "study" ? 6 : churchMode === "worship" ? 11 : 8)
    .map((person) => ({ person }));
  const churchSceneTitle =
    ministry?.kind === "bible-study"
      ? "BIBLE STUDY"
      : ministry?.kind === "small-group"
        ? "SMALL GROUP"
        : ministry?.kind === "prayer"
          ? "PRAYER MEETING"
          : ministry?.kind === "worship"
            ? "WORSHIP"
            : ministry?.kind === "serve"
              ? "SERVE PROJECT"
              : "AT THE ALTAR";
  const churchSceneBlurb =
    ministry?.kind === "bible-study"
      ? "Circles of open Bibles — everyone has a seat at the Word."
      : ministry?.kind === "small-group"
        ? "Small circles, close friends, honest conversation."
        : ministry?.kind === "prayer"
          ? "Every head bowed, every heart lifted."
          : ministry?.kind === "worship"
            ? "Voices raised as one."
            : ministry?.kind === "serve"
              ? "Hands and feet, working side by side."
              : prayed.length === 0
                ? "The chairs are empty. Pray for someone today and they'll take a seat."
                : "Bowed in prayer before the cross.";

  const handleCandlePress = (person: FullPerson) => {
    if (person.prayed) {
      Alert.alert(
        `${person.name}'s candle`,
        `You prayed for ${person.name} today. Their candle burns bright — +${CHURCH_PRAYER_COINS_PER_HOUR} coins/hour.`
      );
    } else {
      Alert.alert(
        `${person.name}'s candle`,
        `Not yet prayed for today. Pray for ${person.name} in Pray Today to light their candle.`
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 48,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color={TEXT} />
        </Pressable>
        <MaterialIcons name="church" size={26} color={GOLD} style={{ marginLeft: 4 }} />
        <Text style={{ marginLeft: 8, fontSize: 20, fontWeight: "800", color: TEXT }}>{churchName}</Text>
        <View style={{ flex: 1 }} />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: BG_SOFT,
            borderRadius: 16,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderWidth: 1,
            borderColor: "#EAD9B8",
          }}
        >
          <Text style={{ fontSize: 15 }}>🪙</Text>
          <Text style={{ marginLeft: 5, fontWeight: "700", color: TEXT }}>
            {formatCoins(coins.balance)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* blessing banner */}
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 16,
            borderRadius: 16,
            backgroundColor: "#FFF3DC",
            borderWidth: 1,
            borderColor: GOLD,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 26 }}>🕯️</Text>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ color: TEXT, fontWeight: "800", fontSize: 15 }}>
              {prayed.length} {prayed.length === 1 ? "candle" : "candles"} lit
            </Text>
            <Text style={{ color: TEXT_DIM, fontSize: 12, marginTop: 2 }}>
              +{candleBonusPerHour} coins/hour flowing to your church. Pray for more people to light more candles.
            </Text>
          </View>
        </View>

        {/* sanctuary — the paper room, wrapped for holiday/season atmosphere */}
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <View style={{ position: "relative", overflow: "hidden", borderRadius: 18 }}>
            <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="church" />
            <PaperChurchScene
              level={level}
              mode={churchMode}
              cast={churchCast}
              pawn={churchMode === "serve" ? null : pawn}
              width={sceneWidth}
            />
          </View>
        </View>
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Text style={{ color: GOLD, fontWeight: "800", fontSize: 13, letterSpacing: 1.5, marginBottom: 4 }}>
            {churchSceneTitle}
          </Text>
          <Text style={{ color: TEXT_DIM, fontSize: 11, fontStyle: "italic" }}>{churchSceneBlurb}</Text>
          <Text style={{ color: TEXT_DIM, fontSize: 11, marginTop: 6, fontStyle: "italic" }}>
            "The prayer of a righteous person is powerful and effective."
          </Text>
        </View>

        {/* ministry happening now? the room adapts to it */}
        {ministry && (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              borderRadius: 16,
              backgroundColor: "#FFF3DC",
              borderWidth: 1,
              borderColor: GOLD,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <MaterialIcons name="event" size={22} color={GOLD} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ color: TEXT, fontWeight: "800", fontSize: 14 }}>{MINISTRY_TITLES[ministry.kind]} in session</Text>
              <Text style={{ color: TEXT_DIM, fontSize: 12, marginTop: 1 }}>"{ministry.title}" — the room is set for it.</Text>
            </View>
          </View>
        )}

        {/* candle wall */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <Text style={{ color: GOLD, fontWeight: "800", fontSize: 13, letterSpacing: 1.5, marginBottom: 4 }}>
            CANDLE WALL
          </Text>
          <Text style={{ color: TEXT_DIM, fontSize: 12, marginBottom: 10 }}>
            One candle for each person. Tap a lit candle to see whose it is.
          </Text>
          {people.length === 0 ? (
            <Text style={{ color: TEXT_DIM, fontSize: 13, fontStyle: "italic" }}>
              No prayer contacts yet. Add people on the People tab.
            </Text>
          ) : (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                backgroundColor: "#FFF3DC",
                borderRadius: 16,
                padding: 10,
                borderWidth: level >= 3 ? 3 : 1,
                borderColor: level >= 3 ? GOLD : "#EAD9B8",
              }}
            >
              {people.map((p) => (
                <Candle key={p.id} person={p} onPress={() => handleCandlePress(p)} />
              ))}
            </View>
          )}
        </View>

        <PlayCard
          icon="notifications"
          title="Play: Bell Peal"
          blurb="The bells chime a pattern over the town — ring it back, note for note."
          playsLeft={bell.playsLeft}
          cap={bell.cap}
          accent={GOLD}
          onPlay={() => bell.setPlaying(true)}
        />
        {bell.playing && <BellGame accent={GOLD} onComplete={bell.handleComplete} onExit={() => bell.setPlaying(false)} />}

        {!loaded && (
          <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Lighting candles…</Text>
        )}
      </ScrollView>
    </View>
  );
}
