// Outreach Center interior: a food pantry and serving counter for the
// neighborhood. Shelves of cans and boxes, donation boxes by the door,
// and a counter where villagers serve whoever walks in. Outreach and
// food-drive schedule events gather here (the church hosts until the
// center is built). "Serve & Pack" grants coins + XP on a 1-hour
// cooldown.
// L1: one pantry shelf, a donation box, the counter.
// L2: a second shelf, stacked crates, more hands serving.
// L3: a full pantry wall and a serving line with trays.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { G, Path, Rect } from "react-native-svg";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { GentleBob, SeatedFigure, SoftPulse, StandingFigure, FigureName, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";
import { PackingGame } from "@/components/packing-game";
import { PlayCard, type MiniGameReward } from "@/components/mini-game-scene";
import { MINI_GAME_CAPS, playsLeftToday, recordPlay, scaleMiniGamePayout } from "@/lib/mini-games";

const BG = "#FBF4E8";
const TEAL = "#2E7D74";
const TEAL_DARK = "#1F5A54";
const WOOD = "#8A5A2B";
const WOOD_DARK = "#5E3D22";
const TEXT_DIM = "#A08B62";
const ACCENT = "#2E7D74";

const SERVE_COINS: Record<number, number> = { 1: 30, 2: 60, 3: 120 };
const SERVE_XP: Record<number, number> = { 1: 8, 2: 16, 3: 28 };
const COOLDOWN_MS = 60 * 60 * 1000;
const SERVE_KEY = "prayercircle.interior.outreach.serve.v1";

const GOODS = ["#C4493B", "#2E7D74", "#E9C767", "#7A5230", "#5B6B82", "#B86A28"];

/** A pantry shelf unit stocked with cans, jars, and boxes. */
function PantryShelf({ rows = 2, label = "Pantry shelf" }: { rows?: number; label?: string }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={118} height={rows * 32 + 10} viewBox={`0 0 118 ${rows * 32 + 10}`}>
        <Rect x={3} y={3} width={112} height={rows * 32 + 4} rx={4} fill="#C69A63" stroke={WOOD_DARK} strokeWidth={2.4} />
        {Array.from({ length: rows }).map((_, r) => (
          <G key={r}>
            <Rect x={8} y={8 + r * 32} width={102} height={24} fill="#A97C46" />
            {Array.from({ length: 7 }).map((_, i) => {
              const tall = (i + r) % 3 === 0;
              return (
                <Rect
                  key={i}
                  x={11 + i * 14.4}
                  y={13 + r * 32 + (tall ? 0 : 5)}
                  width={9}
                  height={tall ? 17 : 12}
                  rx={1.6}
                  fill={GOODS[(i + r * 2) % GOODS.length]}
                />
              );
            })}
            <Rect x={8} y={30 + r * 32} width={102} height={3.2} fill={WOOD_DARK} />
          </G>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

/** A donation box with a slot and a heart. */
function DonationBox() {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={54} height={64} viewBox="0 0 54 64">
        <Rect x={5} y={10} width={44} height={48} rx={5} fill={TEAL} stroke={TEAL_DARK} strokeWidth={2.2} />
        <Rect x={17} y={16} width={20} height={4} rx={2} fill="#123B36" />
        <Path d="M27 50 C19.4 44.8, 15.6 41, 15.6 36.4 C15.6 33.2, 18.2 31.2, 21 31.2 C23.2 31.2, 25.4 32.6, 27 34.6 C28.6 32.6, 30.8 31.2, 33 31.2 C35.8 31.2, 38.4 33.2, 38.4 36.4 C38.4 41, 34.6 44.8, 27 50 Z" fill="#F6E3C2" />
        <Rect x={11} y={4} width={32} height={7} rx={3} fill={TEAL_DARK} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Donations</Text>
    </View>
  );
}

/** Stacked supply crates. */
function CrateStack({ tall = false }: { tall?: boolean }) {
  return (
    <View style={{ alignItems: "center", marginHorizontal: 6 }}>
      <Svg width={64} height={tall ? 84 : 58} viewBox={`0 0 64 ${tall ? 84 : 58}`}>
        {tall && <Rect x={12} y={2} width={40} height={24} rx={3} fill="#B8894F" stroke={WOOD_DARK} strokeWidth={2} />}
        <Rect x={8} y={tall ? 28 : 2} width={48} height={26} rx={3} fill="#C69A63" stroke={WOOD_DARK} strokeWidth={2} />
        <Rect x={4} y={tall ? 56 : 30} width={56} height={26} rx={3} fill="#B8894F" stroke={WOOD_DARK} strokeWidth={2} />
        <Path d="M8 12 L56 12 M4 40 L60 40" stroke={WOOD_DARK} strokeWidth={1.6} opacity={0.55} />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Supplies</Text>
    </View>
  );
}

/** The serving counter — trays ready on the ledge (fuller at L3). */
function ServingCounter({ trays = 2 }: { trays?: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={230} height={46} viewBox="0 0 230 46">
        <Rect x={6} y={8} width={218} height={12} rx={4} fill={WOOD} stroke={WOOD_DARK} strokeWidth={2} />
        <Rect x={14} y={20} width={202} height={20} rx={3} fill="#A9713F" stroke={WOOD_DARK} strokeWidth={1.8} />
        {Array.from({ length: trays }).map((_, i) => (
          <G key={i}>
            <Rect x={34 + i * 62} y={2} width={40} height={8} rx={3} fill="#E5E0D5" stroke="#B8AE99" strokeWidth={1.2} />
            <Rect x={42 + i * 62} y={4} width={10} height={4} rx={2} fill="#E9C767" />
            <Rect x={56 + i * 62} y={4} width={10} height={4} rx={2} fill="#C4493B" />
          </G>
        ))}
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 1 }}>Serving counter</Text>
    </View>
  );
}

export default function OutreachCenterInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastServe, setLastServe] = useState(0);
  const [packingPlaysLeft, setPackingPlaysLeft] = useState<number | null>(null);
  const [playingPacking, setPlayingPacking] = useState(false);

  useEffect(() => {
    playsLeftToday("packing").then(setPackingPlaysLeft).catch(() => setPackingPlaysLeft(0));
  }, []);

  const handlePackingComplete = (raw: MiniGameReward): MiniGameReward => {
    const _pay = scaleMiniGamePayout(scaledCoins(raw.coins), scaledXP(raw.xp));
    const c = _pay.coins;
    const xp = _pay.xp;
    if (c > 0) addCoins(c);
    if (xp > 0) awardCustomXP(xp, `minigame-packing-${Date.now()}`).catch(() => undefined);
    recordPlay("packing").then(setPackingPlaysLeft).catch(() => undefined);
    return { coins: c, xp };
  };

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(SERVE_KEY).catch(() => null);
      setLastServe(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastServe + COOLDOWN_MS - Date.now());
  const helpers = pickPeople(people, `outreach|${building?.id ?? "center"}|help`, level >= 3 ? 4 : 3);

  const levelBlurb =
    level >= 3
      ? "A full pantry wall, a serving line with trays, and room for everyone who comes."
      : level >= 2
        ? "A growing pantry — two stocked shelves, crates of supplies, and more hands to serve."
        : "A small pantry — one shelf, a donation box, and a counter that stays open.";

  const handleServe = async () => {
    if (remaining > 0) {
      Alert.alert("The line has thinned", `The shelves need restocking.\n\nServe again in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(SERVE_COINS[level] ?? 30);
    const xp = scaledXP(SERVE_XP[level] ?? 8);
    const t = Date.now();
    setLastServe(t);
    await AsyncStorage.setItem(SERVE_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `outreach-serve-${t}`).catch(() => undefined);
    Alert.alert("Served with a smile", `You pack boxes, fill trays, and learn a few names. Nobody leaves here hungry — or unnoticed.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="volunteer-activism" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="food-bank"
          iconColor={ACCENT}
          title="Outreach Center"
          blurb={`Pantry shelves, donation boxes, and a counter for the neighborhood. ${levelBlurb}`}
          accent="#D8EAE6"
        />

        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#D8EAE6",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#FFFDF6" : "#FDFAF1",
          }}
        >
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="outreach-center" />

          {/* pantry shelves + crates + donation box */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 14 }}>
            <PantryShelf rows={level >= 3 ? 3 : 2} label={level >= 3 ? "Pantry wall" : "Pantry shelf"} />
            {level >= 2 && <PantryShelf rows={2} />}
            <View>
              <CrateStack tall={level >= 3} />
            </View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 4 }}>
            <DonationBox />
          </View>

          {/* serving counter with the hero behind it */}
          <View style={{ alignItems: "center", marginTop: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", minHeight: 66, marginBottom: -8, zIndex: 1 }}>
              {helpers[0] && <StandingFigure person={helpers[0]} delay={200} icon="volunteer-activism" iconColor={TEAL} />}
              {pawn && (
                <GentleBob delay={450}>
                  <View style={{ alignItems: "center", marginHorizontal: 6 }}>
                    <SoftPulse duration={1900}>
                      <MaterialIcons name="volunteer-activism" size={15} color={TEAL} style={{ marginBottom: 1 }} />
                    </SoftPulse>
                    <PawnPreview pawn={pawn} size={44} />
                    <FigureName name={pawn.name} color={TEAL} />
                  </View>
                </GentleBob>
              )}
              {helpers[1] && <StandingFigure person={helpers[1]} delay={700} icon="inventory-2" iconColor={TEAL} />}
            </View>
            <ServingCounter trays={level >= 3 ? 3 : 2} />
          </View>

          {/* neighbors being served / packing */}
          {(helpers[2] || helpers[3]) && (
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8, minHeight: 62 }}>
              {helpers[2] && <SeatedFigure person={helpers[2]} delay={350} chairColor="#C69A63" chairBorder={WOOD_DARK} />}
              {helpers[3] && <StandingFigure person={helpers[3]} delay={900} icon="favorite" iconColor="#C4493B" />}
            </View>
          )}

          {/* warm tile floor */}
          <View style={{ height: 22, backgroundColor: "#EFE0C2", marginTop: 10 }}>
            <View style={{ height: 3, backgroundColor: "#DEC794" }} />
            <View style={{ flexDirection: "row", marginTop: 6, marginHorizontal: 20 }}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <View key={i} style={{ flex: 1, height: 8, backgroundColor: i % 2 ? "#E7D3A8" : "#EFE0C2", borderWidth: 0.5, borderColor: "#DEC794" }} />
              ))}
            </View>
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Serve & Pack"}
          onPrimary={handleServe}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "A full pantry wall and a serving line with trays." : "A second pantry shelf and stacked crates of supplies."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Serve once an hour. The counter stays open to everyone.
        </Text>

        <PlayCard
          icon="inventory"
          title="Play: Pack the Boxes"
          blurb="The pantry rush is on — sort each item into its box before the clock runs out. Forty-five seconds."
          playsLeft={packingPlaysLeft}
          cap={MINI_GAME_CAPS.packing}
          accent={ACCENT}
          onPlay={() => setPlayingPacking(true)}
        />
        {playingPacking && (
          <PackingGame accent={ACCENT} onComplete={handlePackingComplete} onExit={() => setPlayingPacking(false)} />
        )}

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Stocking the shelves…</Text>}
      </ScrollView>
    </View>
  );
}
