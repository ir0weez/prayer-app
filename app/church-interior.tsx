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

// ---------- palette ----------
const WOOD = "#6B4226";
const WOOD_DARK = "#4A2E1A";
const GOLD = "#D4A54C";
const FLAME = "#FFB84D";
const BG = "#17100C";
const BG_SOFT = "#241812";
const TEXT_DIM = "#B9A08A";

// Stained-glass pane colors (jewel tones)
const GLASS = ["#7C3AED", "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#EC4899"];

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
          opacity: flick.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.32] }),
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
              backgroundColor: "#5A4A3A",
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
          backgroundColor: person.prayed ? "#F5E6C8" : "#6E5B45",
          borderWidth: 1,
          borderColor: person.prayed ? GOLD : "#4A3D2E",
          shadowColor: person.prayed ? FLAME : "transparent",
          shadowOpacity: person.prayed ? 0.7 : 0,
          shadowRadius: 8,
          elevation: person.prayed ? 4 : 0,
        }}
      />
      <Text
        numberOfLines={1}
        style={{ marginTop: 4, fontSize: 9, color: person.prayed ? "#F5E6C8" : TEXT_DIM, maxWidth: 52 }}
      >
        {person.name.split(" ")[0]}
      </Text>
    </Pressable>
  );
}

// ---------- stained-glass window ----------
function StainedGlass({ index, wide = false }: { index: number; wide?: boolean }) {
  const w = wide ? 96 : 72;
  const h = wide ? 128 : 104;
  // 3x4 diamond pane grid with jewel colors
  const panes: string[] = [];
  for (let i = 0; i < 12; i++) panes.push(GLASS[(index * 3 + i) % GLASS.length]);
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
          backgroundColor: "#0D0A08",
          borderWidth: 4,
          borderColor: WOOD_DARK,
          overflow: "hidden",
          padding: 3,
        }}
      >
        <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
          {panes.map((c, i) => (
            <View
              key={i}
              style={{
                width: "33.33%",
                height: "25%",
                backgroundColor: c,
                opacity: 0.85,
                borderWidth: 0.5,
                borderColor: "#0D0A08",
              }}
            />
          ))}
        </View>
        {/* center medallion */}
        <View
          style={{
            position: "absolute",
            top: h * 0.32,
            left: w / 2 - 13,
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: GOLD,
            borderWidth: 2,
            borderColor: "#0D0A08",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="wb-sunny" size={14} color="#0D0A08" />
        </View>
      </View>
      {/* sill */}
      <View style={{ width: w + 16, height: 8, borderRadius: 4, backgroundColor: WOOD_DARK, marginTop: -2 }} />
    </View>
  );
}

// ---------- pew with seated figures ----------
function Pew({ occupants, maxSeats = 6 }: { occupants: PrayedPerson[]; maxSeats?: number }) {
  const shown = occupants.slice(0, maxSeats);
  return (
    <View style={{ marginVertical: 8, alignItems: "center" }}>
      {/* seat row */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", minHeight: 44 }}>
        {shown.map((p) => (
          <View key={p.id} style={{ alignItems: "center", marginHorizontal: 5 }}>
            {/* glow */}
            <View
              style={{
                position: "absolute",
                top: -6,
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: FLAME,
                opacity: 0.25,
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
                backgroundColor: "#3E2C1E",
                marginTop: -4,
              }}
            />
          </View>
        ))}
        {shown.length === 0 && (
          <Text style={{ color: TEXT_DIM, fontSize: 11, fontStyle: "italic" }}>empty pew</Text>
        )}
      </View>
      {/* bench */}
      <View style={{ width: "92%", height: 14, borderRadius: 7, backgroundColor: WOOD, marginTop: 2 }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", width: "86%" }}>
        <View style={{ width: 10, height: 12, backgroundColor: WOOD_DARK, borderRadius: 2 }} />
        <View style={{ width: 10, height: 12, backgroundColor: WOOD_DARK, borderRadius: 2 }} />
      </View>
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

  // distribute prayed-for contacts across 3 pews
  const pews: PrayedPerson[][] = [[], [], []];
  prayed.forEach((p, i) => pews[i % 3].push(p));

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
          <MaterialIcons name="arrow-back" size={24} color="#F5E6C8" />
        </Pressable>
        <MaterialIcons name="church" size={26} color={GOLD} style={{ marginLeft: 4 }} />
        <Text style={{ marginLeft: 8, fontSize: 20, fontWeight: "800", color: "#F5E6C8" }}>{churchName}</Text>
        <View style={{ flex: 1 }} />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: BG_SOFT,
            borderRadius: 16,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Text style={{ fontSize: 15 }}>🪙</Text>
          <Text style={{ marginLeft: 5, fontWeight: "700", color: "#F5E6C8" }}>
            {Math.floor(coins.balance)}
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
            backgroundColor: "#2A1E12",
            borderWidth: 1,
            borderColor: GOLD,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 26 }}>🕯️</Text>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ color: "#F5E6C8", fontWeight: "800", fontSize: 15 }}>
              {prayed.length} {prayed.length === 1 ? "candle" : "candles"} lit
            </Text>
            <Text style={{ color: TEXT_DIM, fontSize: 12, marginTop: 2 }}>
              +{candleBonusPerHour} coins/hour flowing to your church. Pray for more people to light more candles.
            </Text>
          </View>
        </View>

        {/* stained glass */}
        <View style={{ flexDirection: "row", justifyContent: "space-evenly", marginBottom: 8, paddingHorizontal: 12 }}>
          {Array.from({ length: numWindows }).map((_, i) => (
            <StainedGlass key={i} index={i} wide={level >= 3} />
          ))}
        </View>

        {/* altar */}
        <View style={{ alignItems: "center", marginVertical: 16 }}>
          <View style={{ alignItems: "center" }}>
            {/* cross */}
            <View style={{ alignItems: "center", marginBottom: -6, zIndex: 1 }}>
              <View style={{ width: 8, height: 44, backgroundColor: GOLD, borderRadius: 3 }} />
              <View
                style={{
                  position: "absolute",
                  top: 10,
                  width: 26,
                  height: 8,
                  backgroundColor: GOLD,
                  borderRadius: 3,
                }}
              />
            </View>
            {/* altar table */}
            <View
              style={{
                width: 150,
                height: 54,
                borderRadius: 8,
                backgroundColor: WOOD,
                borderWidth: 2,
                borderColor: WOOD_DARK,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View style={{ width: 130, height: 34, borderRadius: 6, backgroundColor: "#F5EFE0", opacity: 0.92 }} />
            </View>
            {/* altar candles */}
            <View style={{ flexDirection: "row", marginTop: 6 }}>
              <View style={{ alignItems: "center", marginHorizontal: 18 }}>
                <CandleFlame size={10} />
                <View style={{ width: 10, height: 22, borderRadius: 3, backgroundColor: "#F5E6C8", marginTop: -4 }} />
              </View>
              <View style={{ alignItems: "center", marginHorizontal: 18 }}>
                <CandleFlame size={10} />
                <View style={{ width: 10, height: 22, borderRadius: 3, backgroundColor: "#F5E6C8", marginTop: -4 }} />
              </View>
            </View>
          </View>
          <Text style={{ color: TEXT_DIM, fontSize: 11, marginTop: 8, fontStyle: "italic" }}>
            "The prayer of a righteous person is powerful and effective."
          </Text>
        </View>

        {/* pews */}
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Text style={{ color: GOLD, fontWeight: "800", fontSize: 13, letterSpacing: 1.5, marginBottom: 4 }}>
            CONGREGATION
          </Text>
          {prayed.length === 0 ? (
            <Text style={{ color: TEXT_DIM, fontSize: 13, fontStyle: "italic", marginVertical: 12 }}>
              The pews are empty. Pray for someone today and they'll take a seat.
            </Text>
          ) : (
            pews.map((occ, i) => <Pew key={i} occupants={occ} />)
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
                backgroundColor: BG_SOFT,
                borderRadius: 16,
                padding: 10,
                borderWidth: 1,
                borderColor: "#3A2A1A",
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
