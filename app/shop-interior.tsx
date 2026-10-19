// Shop interior: a cozy general store. Villagers browse wooden shelves,
// one villager waits at the counter, and the pawn helps stock.
// "Help Stock Shelves" grants coins + XP on a 1-hour cooldown.
// L1: sparse shelves, plain counter. L2: full shelves, rug, hanging lamp.
// L3: packed shelves, glass display case, chandelier, polished floor.
// No emojis — SVG art and MaterialIcons only. Gentle sine-ease motion.

import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Ellipse, Line, Rect } from "react-native-svg";
import {
  InteriorActions,
  InteriorBanner,
  InteriorHeader,
  useInteriorData,
} from "@/components/interior-shell";
import { FigureName, GentleBob, SoftPulse, StandingFigure, WorkingFigure, pickPeople } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { formatCooldown } from "@/lib/gathering-places";
import { scaledCoins, scaledXP } from "@/lib/hometown";
import { awardCustomXP } from "@/lib/xp-engine";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

const BG = "#F7F1E3";
const CARD = "#FFFFFF";
const BROWN = "#A9713F";
const BROWN_DARK = "#7A5230";
const TEXT = "#3F2D1C";
const TEXT_DIM = "#8A715A";
const ACCENT = "#B45309";

const STOCK_COINS: Record<number, number> = { 1: 4, 2: 8, 3: 14 };
const STOCK_XP: Record<number, number> = { 1: 3, 2: 6, 3: 10 };
const COOLDOWN_MS = 60 * 60 * 1000;
const STOCK_KEY = "prayercircle.interior.shop.stock.v1";

const GOOD_COLORS = ["#E8B44C", "#7FB069", "#D96C47", "#7FA8C9", "#C97FA8", "#A8D5E2", "#F2D38B", "#9BC53D"];

/** One wooden shelf with rows of goods. `full` = number of goods to show (max 10). */
function StoreShelf({ full, label }: { full: number; label: string }) {
  const goods: { color: string; tall: boolean }[] = [];
  for (let i = 0; i < full; i++) goods.push({ color: GOOD_COLORS[i % GOOD_COLORS.length], tall: i % 3 === 0 });
  const rows = [goods.slice(0, Math.ceil(full / 2)), goods.slice(Math.ceil(full / 2))];
  return (
    <View style={{ alignItems: "center", marginHorizontal: 4 }}>
      <View
        style={{
          width: 118,
          borderRadius: 6,
          backgroundColor: BROWN_DARK,
          borderWidth: 2,
          borderColor: "#5E3D22",
          paddingHorizontal: 6,
          paddingVertical: 5,
        }}
      >
        {rows.map((row, ri) => (
          <View key={ri}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", minHeight: 26, justifyContent: "center" }}>
              {row.map((g, i) => (
                <View
                  key={i}
                  style={{
                    width: 13,
                    height: g.tall ? 24 : 17,
                    borderRadius: 3,
                    backgroundColor: g.color,
                    marginHorizontal: 2,
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.12)",
                  }}
                />
              ))}
              {row.length === 0 && <View style={{ height: 24 }} />}
            </View>
            <View style={{ height: 4, backgroundColor: "#5E3D22", borderRadius: 2, marginTop: 3, marginBottom: ri === 0 ? 4 : 0 }} />
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 3 }}>{label}</Text>
    </View>
  );
}

/** Store counter: plain wood at L1, nicer with a register at L2+. */
function Counter({ level }: { level: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={150} height={64} viewBox="0 0 150 64">
        <Rect x={6} y={26} width={138} height={34} rx={4} fill={level >= 2 ? "#B9834F" : BROWN} stroke="#5E3D22" strokeWidth={2} />
        {level >= 2 && <Rect x={6} y={26} width={138} height={8} rx={4} fill="#C9963C" opacity={0.55} />}
        <Line x1={6} y1={42} x2={144} y2={42} stroke="#5E3D22" strokeWidth={1.5} />
        {/* register at L2+ */}
        {level >= 2 && (
          <>
            <Rect x={108} y={4} width={28} height={20} rx={3} fill="#4B5563" />
            <Rect x={114} y={8} width={16} height={6} rx={1.5} fill="#A7F3D0" />
            <Rect x={104} y={24} width={36} height={4} fill="#6B7280" />
          </>
        )}
        {/* a little bell */}
        <Circle cx={28} cy={18} r={6} fill="#E8B44C" stroke="#8A6D1C" strokeWidth={1.5} />
        <Rect x={26} y={8} width={4} height={5} rx={2} fill="#8A6D1C" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Counter</Text>
    </View>
  );
}

/** Glass display case — L3 only. */
function DisplayCase() {
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={120} height={76} viewBox="0 0 120 76">
        <Rect x={8} y={52} width={104} height={20} rx={4} fill="#6B4A2F" />
        {/* glass */}
        <Rect x={8} y={6} width={104} height={48} rx={6} fill="#D9EDF5" opacity={0.55} stroke="#9FB3C8" strokeWidth={2.5} />
        {/* treasures inside */}
        <Rect x={24} y={34} width={16} height={18} rx={3} fill="#E8B44C" stroke="#8A6D1C" strokeWidth={1.5} />
        <Circle cx={62} cy={42} r={9} fill="#7FA8C9" stroke="#3D5A76" strokeWidth={1.5} />
        <Rect x={82} y={36} width={14} height={16} rx={7} fill="#C97FA8" stroke="#7A3B5C" strokeWidth={1.5} />
        {/* glass highlight */}
        <Line x1={20} y1={12} x2={44} y2={48} stroke="#FFFFFF" strokeWidth={4} opacity={0.5} strokeLinecap="round" />
      </Svg>
      <Text style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>Display case</Text>
    </View>
  );
}

/** Hanging lamp (L2) / chandelier (L3). */
function CeilingLight({ level }: { level: number }) {
  if (level < 2) return null;
  if (level >= 3) {
    return (
      <SoftPulse duration={2600}>
        <Svg width={90} height={66} viewBox="0 0 90 66">
          <Line x1={45} y1={0} x2={45} y2={14} stroke="#5E3D22" strokeWidth={3} />
          <Ellipse cx={45} cy={30} rx={28} ry={8} fill="#8A6D1C" />
          <Ellipse cx={45} cy={28} rx={28} ry={6} fill="#C9963C" />
          {[22, 36, 50, 64].map((cx) => (
            <g key={cx}>
              <Rect x={cx - 2.5} y={12} width={5} height={14} rx={2} fill="#FDECC8" />
              <Circle cx={cx} cy={10} r={4} fill="#FFF7D6" />
            </g>
          ))}
          <Circle cx={45} cy={38} r={5} fill="#E8B44C" />
        </Svg>
      </SoftPulse>
    );
  }
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={46} height={52} viewBox="0 0 46 52">
        <Line x1={23} y1={0} x2={23} y2={12} stroke="#5E3D22" strokeWidth={3} />
        <Path0 />
      </Svg>
    </View>
  );
}

/** Small helper because inline Path would need props; renders the L2 lamp shade. */
function Path0() {
  return (
    <>
      <Rect x={12} y={12} width={22} height={22} rx={4} fill="#F2D38B" opacity={0.92} stroke="#8A6D1C" strokeWidth={1.5} />
      <Circle cx={23} cy={30} r={5} fill="#FFF7D6" />
    </>
  );
}

export default function ShopInteriorScreen() {
  const { coins, building, people, pawn, loaded, level, buildingName, addCoins, handleUpgrade } = useInteriorData();
  const [lastStock, setLastStock] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STOCK_KEY).catch(() => null);
      setLastStock(raw ? parseInt(raw, 10) || 0 : 0);
    })();
  }, []);

  const remaining = Math.max(0, lastStock + COOLDOWN_MS - Date.now());
  const browsing = pickPeople(people, `shop|${building?.id ?? "shop"}|browse`, 3);
  const atCounter = pickPeople(people, `shop|${building?.id ?? "shop"}|counter`, 1)[0];

  const levelBlurb =
    level >= 3
      ? "A thriving general store — packed shelves, a gleaming case, warm light."
      : level >= 2
        ? "A friendly neighborhood shop — full shelves and a warm lamp."
        : "A humble little shop — shelves are sparse but the door is open.";

  const handleStock = async () => {
    if (remaining > 0) {
      Alert.alert("Shelves are full", `The villagers are restocking.\n\nCome back in about ${formatCooldown(remaining)}.`);
      return;
    }
    const c = scaledCoins(STOCK_COINS[level] ?? 4);
    const xp = scaledXP(STOCK_XP[level] ?? 3);
    const t = Date.now();
    setLastStock(t);
    await AsyncStorage.setItem(STOCK_KEY, String(t)).catch(() => undefined);
    addCoins(c);
    awardCustomXP(xp, `shop-stock-${t}`).catch(() => undefined);
    Alert.alert("Shelves Stocked", `You line the shelves with goods. The villagers smile.\n\n+${c.toFixed(2)} coins, +${xp} XP.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="storefront" iconColor={ACCENT} title={buildingName} coins={coins} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <InteriorBanner
          icon="inventory"
          iconColor={ACCENT}
          title="General Store"
          blurb={`Villagers browse the aisles for daily needs. ${levelBlurb}`}
          accent="#EAD9BE"
        />

        {/* store scene */}
        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#EAD9BE",
            overflow: "hidden",
            backgroundColor: level >= 3 ? "#FBF4E4" : "#F6EEDC",
          }}
        >
          <CeilingLight level={level} />
          <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="shop" />
          {/* window */}
          <View style={{ alignItems: "flex-end", paddingRight: 18 }}>
            <Svg width={76} height={64} viewBox="0 0 76 64">
              <Rect x={4} y={4} width={68} height={56} rx={6} fill={level >= 2 ? "#BEE3F8" : "#CFE9FA"} stroke="#5E3D22" strokeWidth={4} />
              <Circle cx={54} cy={20} r={10} fill="#FFF7D6" />
              <Line x1={38} y1={4} x2={38} y2={60} stroke="#5E3D22" strokeWidth={3} />
              <Line x1={4} y1={32} x2={72} y2={32} stroke="#5E3D22" strokeWidth={3} />
            </Svg>
          </View>

          {/* shelves */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 4 }}>
            <StoreShelf full={level >= 3 ? 10 : level >= 2 ? 8 : 4} label="Dry goods" />
            {level >= 2 && <StoreShelf full={level >= 3 ? 10 : 8} label="Pantry" />}
            {level >= 3 && <StoreShelf full={9} label="Household" />}
          </View>

          {/* villagers browsing */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 6, minHeight: 78 }}>
            {browsing[0] && (
              <GentleBob delay={150}>
                <StandingFigure person={browsing[0]} delay={150} icon="shopping-cart" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {pawn && (
              <GentleBob delay={400}>
                <View style={{ alignItems: "center", marginHorizontal: 6 }}>
                  <SoftPulse duration={1800}>
                    <MaterialIcons name="inventory" size={15} color={ACCENT} style={{ marginBottom: 1 }} />
                  </SoftPulse>
                  <PawnPreview pawn={pawn} size={44} />
                  <FigureName name={pawn.name} color="#B45309" />
                </View>
              </GentleBob>
            )}
            {browsing[1] && (
              <GentleBob delay={650}>
                <StandingFigure person={browsing[1]} delay={650} icon="shopping-basket" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
            {level >= 3 && browsing[2] && (
              <GentleBob delay={900}>
                <StandingFigure person={browsing[2]} delay={900} icon="shopping-cart" iconColor={ACCENT} showLabel />
              </GentleBob>
            )}
          </View>

          {/* counter row */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginTop: 8 }}>
            <Counter level={level} />
            {level >= 3 && (
              <View style={{ marginLeft: 10 }}>
                <DisplayCase />
              </View>
            )}
            {atCounter && (
              <View style={{ marginLeft: 10, marginBottom: 6 }}>
                <WorkingFigure person={atCounter} delay={300} icon="payments" iconColor={ACCENT} showLabel />
              </View>
            )}
          </View>

          {/* rug at L2+, polished floor at L3 */}
          <View style={{ alignItems: "center", marginTop: 8, marginBottom: 4 }}>
            {level >= 2 && (
              <View style={{ width: 240, height: 34, borderRadius: 17, backgroundColor: level >= 3 ? "#C0392B" : "#B45309", opacity: 0.85, borderWidth: 2, borderColor: level >= 3 ? "#922B21" : "#8A3D06", alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 208, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: "#F5DEB3", opacity: 0.9 }} />
              </View>
            )}
          </View>
          <View style={{ height: 26, backgroundColor: level >= 3 ? "#D9A865" : "#C89B62" }}>
            <View style={{ height: 3, backgroundColor: level >= 3 ? "#C4935A" : "#B08A54" }} />
            {level >= 3 && <View style={{ height: 6, backgroundColor: "#E7BC7F", opacity: 0.7, marginTop: 4, marginHorizontal: 30, borderRadius: 3 }} />}
          </View>
        </View>

        <InteriorActions
          primaryLabel={remaining > 0 ? `Ready in ${formatCooldown(remaining)}` : "Help Stock Shelves"}
          onPrimary={handleStock}
          primaryColor={ACCENT}
          level={level}
          onUpgrade={() =>
            handleUpgrade(
              level + 1 >= 3 ? "Packed shelves, a glass display case, and a chandelier." : "Fuller shelves, a warm lamp, and a shop rug."
            )
          }
        />
        <Text style={{ color: TEXT_DIM, fontSize: 12, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
          Stock the shelves once an hour. Rarer goods appear as the store grows.
        </Text>

        {!loaded && <Text style={{ color: TEXT_DIM, textAlign: "center", marginTop: 20 }}>Opening the shop…</Text>}
      </ScrollView>
    </View>
  );
}
