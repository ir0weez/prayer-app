import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
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
} from "@/lib/hometown";

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

// ---------- simple warm window ----------
// A plain arched window with morning light streaming in and a simple cross
// mullion — warm and unadorned, not ornate stained glass.
function WarmWindow({ wide = false }: { wide?: boolean }) {
  const w = wide ? 96 : 72;
  const h = wide ? 128 : 104;
  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: w,
          height: h,
          borderTopLeftRadius: w / 2,
          borderTopRightRadius: w / 2,
          borderBottomLeftRadius: 6,
          borderBottomRightRadius: 6,
          backgroundColor: SKY_TOP,
          borderWidth: 4,
          borderColor: WOOD_DARK,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* warm glow at the bottom, like sunlight pooling */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: h * 0.45,
            backgroundColor: SKY_BOT,
            opacity: 0.75,
          }}
        />
        {/* simple cross mullion */}
        <View style={{ position: "absolute", top: 8, bottom: 8, width: 4, backgroundColor: WOOD_DARK, borderRadius: 2 }} />
        <View style={{ position: "absolute", left: 8, right: 8, top: h * 0.45, height: 4, backgroundColor: WOOD_DARK, borderRadius: 2 }} />
        {/* sun disc */}
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: "#FFF3D0",
            borderWidth: 2,
            borderColor: GOLD,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="wb-sunny" size={14} color={GOLD} />
        </View>
      </View>
      {/* sill */}
      <View style={{ width: w + 16, height: 8, borderRadius: 4, backgroundColor: WOOD, marginTop: -2 }} />
    </View>
  );
}

// ---------- simple chair with seated figure ----------
// Individual wooden chairs instead of formal pews — casual gathering.
function ChairRow({ occupants, maxSeats = 6 }: { occupants: PrayedPerson[]; maxSeats?: number }) {
  const shown = occupants.slice(0, maxSeats);
  return (
    <View style={{ marginVertical: 10, alignItems: "center" }}>
      {shown.length === 0 ? (
        <Text style={{ color: TEXT_DIM, fontSize: 11, fontStyle: "italic" }}>empty chairs</Text>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center" }}>
          {shown.map((p) => (
            <View key={p.id} style={{ alignItems: "center", marginHorizontal: 6 }}>
              {/* warm glow */}
              <View
                style={{
                  position: "absolute",
                  top: -8,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: FLAME,
                  opacity: 0.22,
                }}
              />
              {/* head */}
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: p.accentColor || "#C9A87A",
                  borderWidth: 1.5,
                  borderColor: GOLD,
                }}
              />
              {/* shoulders */}
              <View
                style={{
                  width: 30,
                  height: 16,
                  borderTopLeftRadius: 10,
                  borderTopRightRadius: 10,
                  backgroundColor: "#A9713F",
                  marginTop: -4,
                }}
              />
              {/* chair back */}
              <View
                style={{
                  position: "absolute",
                  bottom: -2,
                  width: 36,
                  height: 26,
                  borderRadius: 6,
                  backgroundColor: WOOD_PALE,
                  borderWidth: 2,
                  borderColor: WOOD_DARK,
                  zIndex: -1,
                }}
              />
            </View>
          ))}
        </View>
      )}
      {/* chair seats */}
      {shown.length > 0 && (
        <View style={{ flexDirection: "row", marginTop: 2 }}>
          {shown.map((p) => (
            <View
              key={p.id}
              style={{
                width: 34,
                height: 8,
                borderRadius: 4,
                backgroundColor: WOOD,
                marginHorizontal: 6,
                borderWidth: 1,
                borderColor: WOOD_DARK,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ---------- main screen ----------
export default function ChurchInteriorScreen() {
  const router = useRouter();
  const { buildingId } = useLocalSearchParams<{ buildingId?: string }>();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [building, setBuilding] = useState<PlacedBuilding | null>(null);
  const [people, setPeople] = useState<FullPerson[]>([]);
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
      } catch {}
      setLoaded(true);
    })();
  }, [buildingId]);

  const level = building?.level || 1;
  const churchName = churchNameFor(level);
  const prayed = people.filter((p) => p.prayed);
  const candleBonusPerHour = prayed.length * CHURCH_PRAYER_COINS_PER_HOUR;

  // distribute prayed-for contacts across 3 chair rows
  const rows: PrayedPerson[][] = [[], [], []];
  prayed.forEach((p, i) => rows[i % 3].push(p));

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

  const numWindows = level >= 2 ? 3 : 2;

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
            {coins.balance.toFixed(2)}
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

        {/* warm windows — morning light streaming in */}
        <View style={{ flexDirection: "row", justifyContent: "space-evenly", marginBottom: 8, paddingHorizontal: 12 }}>
          {Array.from({ length: numWindows }).map((_, i) => (
            <WarmWindow key={i} wide={level >= 3} />
          ))}
        </View>

        {/* front: simple wooden stage with podium + cross */}
        <View style={{ alignItems: "center", marginVertical: 16 }}>
          <View style={{ alignItems: "center" }}>
            {/* wooden cross — simple, not gold */}
            <View style={{ alignItems: "center", marginBottom: -4, zIndex: 1 }}>
              <View style={{ width: 10, height: 48, backgroundColor: WOOD_DARK, borderRadius: 4 }} />
              <View
                style={{
                  position: "absolute",
                  top: 12,
                  width: 30,
                  height: 10,
                  backgroundColor: WOOD_DARK,
                  borderRadius: 4,
                }}
              />
            </View>
            {/* stage platform */}
            <View
              style={{
                width: 190,
                height: 22,
                borderRadius: 8,
                backgroundColor: WOOD,
                borderWidth: 2,
                borderColor: WOOD_DARK,
              }}
            />
            {/* podium */}
            <View style={{ alignItems: "center", marginTop: -2 }}>
              <View
                style={{
                  width: 56,
                  height: 40,
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                  backgroundColor: WOOD_DARK,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="menu-book" size={20} color="#FFF3DC" />
              </View>
              <View style={{ width: 14, height: 26, backgroundColor: WOOD_DARK }} />
              <View style={{ width: 44, height: 8, borderRadius: 4, backgroundColor: WOOD_DARK }} />
            </View>
            {/* small plants for warmth */}
            <View style={{ flexDirection: "row", marginTop: 6 }}>
              <View style={{ alignItems: "center", marginHorizontal: 34 }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#7BA05B" }} />
                <View style={{ width: 14, height: 12, borderRadius: 3, backgroundColor: "#B0724A", marginTop: -3 }} />
              </View>
              <View style={{ alignItems: "center", marginHorizontal: 34 }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#7BA05B" }} />
                <View style={{ width: 14, height: 12, borderRadius: 3, backgroundColor: "#B0724A", marginTop: -3 }} />
              </View>
            </View>
          </View>
          <Text style={{ color: TEXT_DIM, fontSize: 11, marginTop: 10, fontStyle: "italic" }}>
            "The prayer of a righteous person is powerful and effective."
          </Text>
        </View>

        {/* gathering */}
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Text style={{ color: GOLD, fontWeight: "800", fontSize: 13, letterSpacing: 1.5, marginBottom: 4 }}>
            GATHERED TOGETHER
          </Text>
          {prayed.length === 0 ? (
            <Text style={{ color: TEXT_DIM, fontSize: 13, fontStyle: "italic", marginVertical: 12 }}>
              The chairs are empty. Pray for someone today and they'll take a seat.
            </Text>
          ) : (
            rows.map((occ, i) => <ChairRow key={i} occupants={occ} />)
          )}
        </View>

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
                borderWidth: 1,
                borderColor: "#EAD9B8",
              }}
            >
              {people.map((p) => (
                <Candle key={p.id} person={p} onPress={() => handleCandlePress(p)} />
              ))}
            </View>
          )}
        </View>

        {!loaded && (
          <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Lighting candles…</Text>
        )}
      </ScrollView>
    </View>
  );
}
