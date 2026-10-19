import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Rect } from "react-native-svg";
import {
  COINS_STORAGE_KEY,
  parseCoins,
  type HometownCoins,
  scaledCoins,
} from "@/lib/hometown";
import {
  HOUSE_ROOMS,
  TROPHY_COIN_EACH,
  computeTrophies,
  getGardenData,
  getPrayerCandles,
  loadHouseState,
  refreshHouseBonusCache,
  getCachedHouseBonuses,
  roomDef,
  roomTierPoints,
  saveHouseState,
  type CandlePerson,
  type GardenData,
  type HouseBonuses,
  type HouseRoomId,
  type HouseState,
  type RoomDef,
  type RoomTheme,
  type Trophy,
} from "@/lib/pawn-house";
import { RoomFurnitureArt, type RoomPieceId } from "@/components/room-furniture-art";
import { PawnPreview } from "@/components/pawn-preview";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import { getTimeOfDay } from "@/lib/daynight";
import { prayedTodayPeople, type PrayedPerson } from "@/lib/hometown";
import { SeatedFigure, StandingFigure, SwimmingFigure, WorkingFigure, pickPeople } from "@/components/activity-figures";
import { HolidayInteriorOverlay } from "@/components/holiday-decor";
import { SeasonInteriorOverlay } from "@/components/season-decor";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

/**
 * The player's pawn, shown using the room's furniture.
 * - Bedroom: in bed (sleeping at night, with "Z" indicator)
 * - Living: sitting on the sofa
 * - Kitchen: at the table
 * - Bathroom: at the sink
 * - Study: at the desk
 * - Prayer: kneeling in the center
 * Only shows if the relevant furniture piece is unlocked (tier > 0).
 */
function PawnInRoom({
  roomId,
  room,
  roomViewWidth,
  roomViewHeight,
}: {
  roomId: HouseRoomId;
  room: { furniture: Record<string, number> };
  roomViewWidth: number;
  roomViewHeight: number;
}) {
  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  useEffect(() => {
    loadCustomPawn().then((p) => p && setPawn(p));
  }, []);
  if (!pawn) return null;

  const isNight = getTimeOfDay() === "night";
  const size = 56;

  let pos = { x: 0.5, y: 0.65 };
  let show = false;
  let sleeping = false;

  if (roomId === "bedroom" && (room.furniture["bed"] || 0) > 0) {
    pos = { x: 0.30, y: 0.52 };
    show = true;
    sleeping = isNight;
  } else if (roomId === "living" && (room.furniture["sofa"] || 0) > 0) {
    pos = { x: 0.30, y: 0.52 };
    show = true;
  } else if (roomId === "kitchen" && (room.furniture["ktable"] || 0) > 0) {
    pos = { x: 0.38, y: 0.54 };
    show = true;
  } else if (roomId === "bathroom" && (room.furniture["sink"] || 0) > 0) {
    pos = { x: 0.60, y: 0.52 };
    show = true;
  } else if (roomId === "study" && (room.furniture["desk"] || 0) > 0) {
    pos = { x: 0.32, y: 0.52 };
    show = true;
  } else if (roomId === "prayer") {
    pos = { x: 0.5, y: 0.60 };
    show = true;
  } else if (roomId === "backyard") {
    // Out back: at the BBQ if there's a grill, otherwise by the pool.
    if ((room.furniture["bbq"] || 0) > 0) {
      pos = { x: 0.68, y: 0.48 };
      show = true;
    } else if ((room.furniture["pool"] || 0) > 0) {
      pos = { x: 0.28, y: 0.50 };
      show = true;
    } else if ((room.furniture["patio"] || 0) > 0) {
      pos = { x: 0.50, y: 0.68 };
      show = true;
    }
  }

  if (!show) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: pos.x * roomViewWidth - size / 2,
        top: pos.y * roomViewHeight - size / 2,
        alignItems: "center",
        zIndex: 5,
      }}
    >
      {sleeping && (
        <View style={{ flexDirection: "row", marginBottom: -6, marginLeft: 18, zIndex: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: "800", color: "#93C5FD" }}>Z</Text>
          <Text style={{ fontSize: 11, fontWeight: "800", color: "#93C5FD", marginLeft: 1, marginTop: -3 }}>Z</Text>
        </View>
      )}
      <View style={{ opacity: sleeping ? 0.92 : 1, transform: sleeping ? [{ rotate: "-8deg" }] : [] }}>
        <PawnPreview pawn={pawn} size={size} />
      </View>
    </View>
  );
}

/**
 * Villagers enjoying the backyard: swimming in the pool, tending the BBQ,
 * lounging on the patio. Only shows where the furniture is actually built.
 */
function VillagersInBackyard({
  visitors,
  furniture,
  roomViewWidth,
  roomViewHeight,
}: {
  visitors: PrayedPerson[];
  furniture: Record<string, number>;
  roomViewWidth: number;
  roomViewHeight: number;
}) {
  if (visitors.length === 0) return null;
  const at = (fx: number, fy: number) => ({
    position: "absolute" as const,
    left: fx * roomViewWidth - 24,
    top: fy * roomViewHeight - 24,
    zIndex: 4,
  });
  const swimmers = (furniture["pool"] || 0) > 0 ? pickPeople(visitors, "backyard-pool", 2) : [];
  const grillers = (furniture["bbq"] || 0) > 0 ? pickPeople(visitors, "backyard-bbq", 2) : [];
  const loungers = (furniture["patio"] || 0) > 0 ? pickPeople(visitors, "backyard-patio", 3) : [];
  if (swimmers.length === 0 && grillers.length === 0 && loungers.length === 0) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      {swimmers.map((p, i) => (
        <View key={p.id} style={at(0.20 + i * 0.15, 0.56)}>
          <SwimmingFigure person={p} delay={i * 400} />
        </View>
      ))}
      {grillers.slice(0, 1).map((p) => (
        <View key={p.id} style={at(0.80, 0.56)}>
          <WorkingFigure person={p} delay={200} icon="outdoor-grill" iconColor="#F59E0B" />
        </View>
      ))}
      {grillers.slice(1).map((p) => (
        <View key={p.id} style={at(0.58, 0.70)}>
          <StandingFigure person={p} delay={600} icon="restaurant" iconColor="#F59E0B" />
        </View>
      ))}
      {loungers.slice(0, 2).map((p, i) => (
        <View key={p.id} style={at(0.40 + i * 0.20, 0.82)}>
          <SeatedFigure person={p} delay={i * 300} chairColor="#92400E" chairBorder="#7C2D12" />
        </View>
      ))}
      {loungers.slice(2).map((p) => (
        <View key={p.id} style={at(0.50, 0.92)}>
          <StandingFigure person={p} delay={900} icon="local-drink" iconColor="#38BDF8" />
        </View>
      ))}
    </View>
  );
}

function FlickerFlame({ size = 14 }: { size?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <View
        style={{
          width: size * 0.55,
          height: size,
          backgroundColor: "#FFB84D",
          borderTopLeftRadius: size * 0.28,
          borderTopRightRadius: size * 0.28,
          borderBottomLeftRadius: size * 0.28,
          borderBottomRightRadius: size * 0.05,
          transform: [{ rotate: "45deg" }],
        }}
      />
    </Animated.View>
  );
}

function Candle({ lit, name, onPress }: { lit: boolean; name: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: "center", margin: 6, width: 44 }}>
      <View style={{ height: 20, alignItems: "center", justifyContent: "center" }}>
        {lit ? <FlickerFlame size={13} /> : <View style={{ width: 2, height: 8, backgroundColor: "#5A4A3A" }} />}
      </View>
      <View
        style={{
          width: 16,
          height: 34,
          borderRadius: 4,
          backgroundColor: lit ? "#F5E6C8" : "#8A7A68",
          opacity: lit ? 1 : 0.55,
          shadowColor: lit ? "#FFB84D" : "transparent",
          shadowOpacity: 0.8,
          shadowRadius: 8,
        }}
      />
      <Text numberOfLines={1} style={{ fontSize: 9, color: lit ? "#FFE9C4" : "#8A7A68", marginTop: 2, maxWidth: 44 }}>
        {name}
      </Text>
    </Pressable>
  );
}

function FlowerDot({ bloom, color }: { bloom: boolean; color: string }) {
  if (!bloom) {
    return <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "rgba(0,0,0,0.18)", margin: 4 }} />;
  }
  return (
    <View style={{ width: 22, height: 22, margin: 0, alignItems: "center", justifyContent: "center" }}>
      <Svg width={22} height={22} viewBox="0 0 22 22">
        <Rect x={10} y={10} width={2.5} height={9} fill="#3F7048" />
        <Circle cx={11} cy={4} r={2.2} fill={color} />
        <Circle cx={6.8} cy={7} r={2.2} fill={color} />
        <Circle cx={15.2} cy={7} r={2.2} fill={color} />
        <Circle cx={8.4} cy={11.6} r={2.2} fill={color} />
        <Circle cx={13.6} cy={11.6} r={2.2} fill={color} />
        <Circle cx={11} cy={8} r={2.4} fill="#FFD98A" />
      </Svg>
    </View>
  );
}

export default function PawnHouseScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const coinsRef = useRef(coins);
  const [house, setHouse] = useState<HouseState | null>(null);
  const [roomId, setRoomId] = useState<HouseRoomId>("bedroom");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [candles, setCandles] = useState<CandlePerson[]>([]);
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [garden, setGarden] = useState<GardenData>({ completed: 0, total: 0, fastName: "" });
  const [visitors, setVisitors] = useState<PrayedPerson[]>([]);
  const [bonuses, setBonuses] = useState<HouseBonuses>(getCachedHouseBonuses());

  useEffect(() => {
    coinsRef.current = coins;
  }, [coins]);

  const persistCoins = useCallback((next: HometownCoins) => {
    coinsRef.current = next;
    setCoins(next);
    AsyncStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const addCoins = useCallback(
    (delta: number) => {
      const cur = coinsRef.current;
      const next = {
        balance: cur.balance + delta,
        lifetimeEarned: cur.lifetimeEarned + Math.max(0, delta),
      };
      persistCoins(next);
      return next.balance >= 0;
    },
    [persistCoins]
  );

  const reload = useCallback(async () => {
    try {
      const [cRaw, h] = await Promise.all([
        AsyncStorage.getItem(COINS_STORAGE_KEY),
        loadHouseState(),
      ]);
      const c = parseCoins(cRaw ? JSON.parse(cRaw) : {});
      coinsRef.current = c;
      setCoins(c);
      setHouse(h);
      const b = await refreshHouseBonusCache();
      setBonuses({ ...b });
      const [cd, tr, gd] = await Promise.all([getPrayerCandles(), computeTrophies(), getGardenData()]);
      setCandles(cd);
      setTrophies(tr);
      setGarden(gd);
      // villagers who may be enjoying the backyard
      prayedTodayPeople().then((pp) => setVisitors(pp)).catch(() => undefined);
    } catch {}
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(
    async (next: HouseState) => {
      setHouse(next);
      await saveHouseState(next);
      const b = await refreshHouseBonusCache();
      setBonuses({ ...b });
    },
    []
  );

  if (!house) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FDF6E3", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#78716C" }}>Loading your home…</Text>
      </View>
    );
  }

  const def: RoomDef = roomDef(roomId);
  const room = house.rooms[roomId];
  const theme: RoomTheme = def.themes.find((t) => t.id === room.theme) ?? def.themes[0];

  const spend = (cost: number, label: string): boolean => {
    if (coinsRef.current.balance < cost) {
      Alert.alert("Not enough coins", `${label} costs ${cost.toFixed(2)} coins.`);
      return false;
    }
    addCoins(-cost);
    return true;
  };

  const handleUnlockRoom = () => {
    Alert.alert(`Unlock ${def.name}`, `Unlock the ${def.name} for ${def.unlockCost} coins?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unlock",
        onPress: () => {
          if (!spend(def.unlockCost, def.name)) return;
          const next = { ...house, rooms: { ...house.rooms, [roomId]: { ...room, unlocked: true } } };
          save(next);
        },
      },
    ]);
  };

  const handleBuyTheme = (t: RoomTheme) => {
    if (room.ownedThemes.includes(t.id)) {
      save({ ...house, rooms: { ...house.rooms, [roomId]: { ...room, theme: t.id } } });
      return;
    }
    Alert.alert(t.name, `Unlock this color theme for ${scaledCoins(t.cost).toFixed(2)} coins?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unlock",
        onPress: () => {
          if (!spend(scaledCoins(t.cost), t.name)) return;
          save({
            ...house,
            rooms: { ...house.rooms, [roomId]: { ...room, theme: t.id, ownedThemes: [...room.ownedThemes, t.id] } },
          });
        },
      },
    ]);
  };

  const handleSlotPress = (slotId: string) => {
    setSelectedSlot(slotId);
  };

  const handleBuyOrUpgrade = (slotId: string) => {
    const slot = def.slots.find((s) => s.id === slotId);
    if (!slot) return;
    const tier = room.furniture[slotId] || 0;
    if (tier >= 3) return;
    const cost = scaledCoins(slot.costs[tier]);
    const label = tier === 0 ? slot.tierNames[0] : `Upgrade to ${slot.tierNames[tier]}`;
    Alert.alert(slot.name, `${label} — ${cost.toFixed(2)} coins?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: tier === 0 ? "Buy" : "Upgrade",
        onPress: () => {
          if (!spend(cost, label)) return;
          const next = {
            ...house,
            rooms: {
              ...house.rooms,
              [roomId]: { ...room, furniture: { ...room.furniture, [slotId]: tier + 1 } },
            },
          };
          save(next);
          setSelectedSlot(null);
        },
      },
    ]);
  };

  const roomViewHeight = 300;
  const roomViewWidth = width - 32;

  const bonusLines: string[] = [];
  if (bonuses.coinMult > 0) bonusLines.push(`+${Math.round(bonuses.coinMult * 100)}% coin income`);
  if (bonuses.allXpMult > 0) bonusLines.push(`+${Math.round(bonuses.allXpMult * 100)}% all XP`);
  if (bonuses.prayerXpMult > 0) bonusLines.push(`+${Math.round(bonuses.prayerXpMult * 100)}% prayer XP`);
  if (bonuses.bibleXpMult > 0) bonusLines.push(`+${Math.round(bonuses.bibleXpMult * 100)}% Bible XP`);
  if (bonuses.fastXpMult > 0) bonusLines.push(`+${Math.round(bonuses.fastXpMult * 100)}% fast XP`);

  const renderLivingRoom = () => (
    <View style={{ width: roomViewWidth, height: roomViewHeight, borderRadius: 16, overflow: "hidden", backgroundColor: theme.wall }}>
      {/* floor */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: roomViewHeight * 0.34, backgroundColor: theme.floor }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: roomViewHeight * 0.34, height: 4, backgroundColor: "rgba(0,0,0,0.12)" }} />
      {roomId === "backyard" ? (
        /* fence along the back of the yard */
        <View style={{ position: "absolute", left: 0, right: 0, top: roomViewHeight * 0.30, height: 44 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-around", height: 44 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={i} style={{ width: 14, height: 44, backgroundColor: theme.trim, borderRadius: 3 }} />
            ))}
          </View>
          <View style={{ position: "absolute", left: 0, right: 0, top: 8, height: 6, backgroundColor: theme.trim, opacity: 0.85 }} />
          <View style={{ position: "absolute", left: 0, right: 0, top: 28, height: 6, backgroundColor: theme.trim, opacity: 0.85 }} />
        </View>
      ) : (
        /* window */
        <View style={{ position: "absolute", left: roomViewWidth * 0.42, top: 18, width: 64, height: 52, borderRadius: 8, backgroundColor: "#CFE8EF", borderWidth: 5, borderColor: theme.trim }}>
          <View style={{ position: "absolute", left: "48%", top: 0, bottom: 0, width: 3, backgroundColor: theme.trim }} />
          <View style={{ position: "absolute", top: "48%", left: 0, right: 0, height: 3, backgroundColor: theme.trim }} />
        </View>
      )}
      {def.slots.map((slot) => {
        const tier = room.furniture[slot.id] || 0;
        const left = slot.pos.x * roomViewWidth - slot.size / 2;
        const top = slot.pos.y * roomViewHeight - slot.size / 2;
        const isSelected = selectedSlot === slot.id;
        return (
          <Pressable
            key={slot.id}
            onPress={() => handleSlotPress(slot.id)}
            style={{
              position: "absolute",
              left,
              top,
              width: slot.size,
              height: slot.size,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: isSelected ? 2 : tier === 0 ? 2 : 0,
              borderColor: isSelected ? "#F59E0B" : "rgba(0,0,0,0.18)",
              borderStyle: tier === 0 && !isSelected ? "dashed" : "solid",
              borderRadius: 12,
              backgroundColor: tier === 0 ? "rgba(255,255,255,0.25)" : "transparent",
            }}
          >
            {tier > 0 ? (
              <RoomFurnitureArt piece={slot.id as RoomPieceId} tier={tier as 1 | 2 | 3} size={slot.size} fabric={theme.accent} wood={theme.trim} />
            ) : (
              <MaterialIcons name="add" size={28} color="rgba(0,0,0,0.3)" />
            )}
          </Pressable>
        );
      })}
      {/* the player's pawn, using the furniture */}
      <PawnInRoom roomId={roomId} room={room} roomViewWidth={roomViewWidth} roomViewHeight={roomViewHeight} />
      {/* villagers enjoying the backyard */}
      {roomId === "backyard" && (
        <VillagersInBackyard
          visitors={visitors}
          furniture={room.furniture}
          roomViewWidth={roomViewWidth}
          roomViewHeight={roomViewHeight}
        />
      )}
    </View>
  );

  const renderPrayerRoom = () => {
    const litCount = candles.filter((c) => c.lit).length;
    return (
      <View style={{ width: roomViewWidth, borderRadius: 16, overflow: "hidden", backgroundColor: theme.wall, padding: 16 }}>
        <Text style={{ color: "#FFE9C4", fontWeight: "700", fontSize: 15, textAlign: "center", marginBottom: 4 }}>
          {litCount} of {candles.length} candles lit
        </Text>
        <Text style={{ color: "#B8A88F", fontSize: 12, textAlign: "center", marginBottom: 12 }}>
          Pray for someone today to light their candle (+1% income each)
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
          {candles.length === 0 && (
            <Text style={{ color: "#8A7A68", padding: 16 }}>Add prayer contacts in the People tab to fill this wall.</Text>
          )}
          {candles.map((c) => (
            <Candle
              key={c.id}
              lit={c.lit}
              name={c.name}
              onPress={() => Alert.alert(c.name, c.lit ? "Prayed for today. Their candle burns bright." : "Not prayed for yet today. Their candle waits.")}
            />
          ))}
        </View>
      </View>
    );
  };

  const renderTrophyRoom = () => (
    <View style={{ width: roomViewWidth, borderRadius: 16, overflow: "hidden", backgroundColor: theme.wall, padding: 16 }}>
      <Text style={{ color: theme.trim, fontWeight: "700", fontSize: 15, textAlign: "center", marginBottom: 4 }}>
        {trophies.length} trophies (+{(trophies.length * TROPHY_COIN_EACH * 100).toFixed(1)}% income)
      </Text>
      <Text style={{ color: "#8A7A68", fontSize: 12, textAlign: "center", marginBottom: 12 }}>
        Finish fasts, hit coin milestones, raise monuments, unlock maps
      </Text>
      {trophies.length === 0 && (
        <Text style={{ color: "#8A7A68", textAlign: "center", padding: 16 }}>No trophies yet. Your achievements will shine here.</Text>
      )}
      {trophies.map((t, i) => (
        <View key={t.id}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFF7E0", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#D4A54C" }}>
              <MaterialIcons name={t.icon as any} size={24} color="#B8860B" />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontWeight: "700", color: "#3E2F22" }}>{t.name}</Text>
              <Text style={{ fontSize: 12, color: "#8A7A68" }}>{t.desc}</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#B8860B" }}>+0.5%</Text>
          </View>
          {i < trophies.length - 1 && <View style={{ height: 4, backgroundColor: theme.trim, opacity: 0.35, borderRadius: 2, marginHorizontal: 8 }} />}
        </View>
      ))}
    </View>
  );

  const renderGarden = () => {
    const displayCap = 60;
    const shown = Math.min(garden.completed, displayCap);
    const soilDots = Math.max(0, Math.min(displayCap - shown, 24));
    const flowerColors = ["#E86A92", "#F2A541", "#9C6FB5", "#E4572E", "#4E9BCE"];
    return (
      <View style={{ width: roomViewWidth, borderRadius: 16, overflow: "hidden", backgroundColor: theme.wall, padding: 16 }}>
        <Text style={{ color: "#2F4A2F", fontWeight: "700", fontSize: 15, textAlign: "center", marginBottom: 4 }}>
          {garden.completed} flowers blooming (+{(garden.completed * 0.1).toFixed(1)}% income)
        </Text>
        <Text style={{ color: "#5B7A5E", fontSize: 12, textAlign: "center", marginBottom: 12 }}>
          {garden.fastName ? `One flower per completed day of "${garden.fastName}"` : "Complete fast days to plant flowers"}
        </Text>
        <View style={{ backgroundColor: theme.floor, borderRadius: 12, padding: 10 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
            {Array.from({ length: shown }).map((_, i) => (
              <FlowerDot key={i} bloom color={flowerColors[i % flowerColors.length]} />
            ))}
            {Array.from({ length: soilDots }).map((_, i) => (
              <FlowerDot key={`s${i}`} bloom={false} color="#E86A92" />
            ))}
          </View>
          {garden.completed > displayCap && (
            <Text style={{ textAlign: "center", color: "#5B7A5E", fontSize: 12, marginTop: 6 }}>
              +{garden.completed - displayCap} more blooming
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderRoomBody = () => {
    if (!room.unlocked) {
      return (
        <View style={{ width: roomViewWidth, borderRadius: 16, backgroundColor: "#FFFFFF", padding: 32, alignItems: "center" }}>
          <MaterialIcons name="lock" size={48} color="#B8B3A8" />
          <Text style={{ fontSize: 18, fontWeight: "800", marginTop: 12 }}>{def.name}</Text>
          <Text style={{ color: "#78716C", textAlign: "center", marginTop: 6, marginBottom: 16 }}>{def.bonusText}</Text>
          <Pressable
            onPress={handleUnlockRoom}
            style={{ backgroundColor: "#F59E0B", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Unlock — {def.unlockCost} coins</Text>
          </Pressable>
        </View>
      );
    }
    if (def.kind === "prayer") return renderPrayerRoom();
    if (def.kind === "trophy") return renderTrophyRoom();
    if (def.kind === "garden") return renderGarden();
    return renderLivingRoom();
  };

  const selectedSlotDef = def.slots.find((s) => s.id === selectedSlot);
  const selectedTier = selectedSlotDef ? room.furniture[selectedSlotDef.id] || 0 : 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FDF6E3" }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <HolidayInteriorOverlay season={getHolidaySeason()} />
      <SeasonInteriorOverlay season={getSeason()} holiday={getHolidaySeason()} />
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>Pawn House</Text>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
          <MaterialIcons name="monetization-on" size={16} color="#B8860B" />
          <Text style={{ marginLeft: 6, fontWeight: "700" }}>{coins.balance.toFixed(2)}</Text>
        </View>
      </View>

      {bonusLines.length > 0 && (
        <View style={{ backgroundColor: "#EDE9FE", borderRadius: 12, padding: 10, marginBottom: 12 }}>
          <Text style={{ fontWeight: "700", color: "#5B4BC4", fontSize: 13 }}>Home bonuses</Text>
          <Text style={{ color: "#5B4BC4", fontSize: 12, marginTop: 2 }}>{bonusLines.join(" · ")}</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
        {HOUSE_ROOMS.map((r) => {
          const rs = house.rooms[r.id];
          const active = r.id === roomId;
          return (
            <Pressable
              key={r.id}
              onPress={() => { setRoomId(r.id); setSelectedSlot(null); }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: active ? "#1F2937" : "#FFFFFF",
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 8,
                opacity: rs.unlocked ? 1 : 0.65,
              }}
            >
              {!rs.unlocked && <MaterialIcons name="lock" size={14} color={active ? "#FFFFFF" : "#78716C"} />}
              <Text style={{ color: active ? "#FFFFFF" : "#1F2937", fontWeight: "700", fontSize: 13, marginLeft: rs.unlocked ? 0 : 4 }}>
                {r.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {renderRoomBody()}

      {room.unlocked && def.kind === "living" && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "700", marginBottom: 8, color: "#78716C", fontSize: 13 }}>
            {def.bonusText} · {roomTierPoints(house, roomId)} tiers placed
          </Text>
        </View>
      )}

      {room.unlocked && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "700", marginBottom: 8, color: "#78716C", fontSize: 13 }}>Room colors</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {def.themes.map((t) => {
              const owned = room.ownedThemes.includes(t.id);
              const active = room.theme === t.id;
              return (
                <Pressable key={t.id} onPress={() => handleBuyTheme(t)} style={{ alignItems: "center", width: 64 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: t.wall,
                      borderWidth: active ? 3 : 1,
                      borderColor: active ? "#F59E0B" : "#E7DCC8",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 16, backgroundColor: t.floor }} />
                    {!owned && <MaterialIcons name="lock" size={16} color="#78716C" />}
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 10, color: "#78716C", marginTop: 4 }}>
                    {owned ? t.name : `${scaledCoins(t.cost).toFixed(2)}c`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {selectedSlotDef && room.unlocked && def.kind === "living" && (
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14, marginTop: 12 }}>
          <Text style={{ fontWeight: "800", fontSize: 16 }}>{selectedSlotDef.name}</Text>
          <View style={{ flexDirection: "row", marginTop: 8, marginBottom: 4 }}>
            {[1, 2, 3].map((t) => (
              <View key={t} style={{ flex: 1, alignItems: "center" }}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: selectedTier >= t ? "#F59E0B" : "#E7DCC8",
                    marginBottom: 4,
                  }}
                />
                <Text style={{ fontSize: 10, color: "#78716C", textAlign: "center" }}>{selectedSlotDef.tierNames[t - 1]}</Text>
              </View>
            ))}
          </View>
          {selectedTier < 3 ? (
            <Pressable
              onPress={() => handleBuyOrUpgrade(selectedSlotDef.id)}
              style={{ backgroundColor: "#F59E0B", borderRadius: 10, padding: 12, alignItems: "center", marginTop: 8 }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {selectedTier === 0 ? "Buy" : "Upgrade"} — {selectedSlotDef.costs[selectedTier]} coins
              </Text>
            </Pressable>
          ) : (
            <Text style={{ textAlign: "center", color: "#78716C", marginTop: 8 }}>Max tier reached</Text>
          )}
          <Pressable onPress={() => setSelectedSlot(null)} style={{ marginTop: 8, alignItems: "center" }}>
            <Text style={{ color: "#78716C" }}>Close</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
