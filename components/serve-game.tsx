// Serve the Table — Restaurant mini-game.
// A customer settles in and orders two or three dishes (the menu
// follows this restaurant's cuisine). The order hangs above the table
// as icons; tap the matching dishes on the serving tray, in order,
// before the patience timer runs out. Right dishes earn tips; a wrong
// tap just costs a little patience — nobody yells in this kitchen.
// Five customers per shift. Coins-forward: this is tipped work.

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
import { GameCard, GameResults, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";
import { serveMenuFor, type ServeDish } from "@/lib/mini-games";

const CUSTOMERS = 5;
const ORDER_MS = 14000;
const TICK_MS = 100;

/** One dish icon, drawn small and readable. */
export function DishIcon({ icon, size = 44 }: { icon: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {icon === "pizza" && (
        <>
          <Path d="M10 8 L38 8 L24 40 Z" fill="#F5C15B" />
          <Path d="M10 8 L38 8 L35.4 13.4 L12.6 13.4 Z" fill="#D97706" />
          <Circle cx={21} cy={16} r={3} fill="#B91C1C" />
          <Circle cx={27} cy={24} r={3} fill="#B91C1C" />
          <Circle cx={22} cy={29} r={2.4} fill="#4D7C0F" />
        </>
      )}
      {icon === "burger" && (
        <>
          <Path d="M9 20 a15 9 0 0 1 30 0 Z" fill="#E8A33D" />
          <Rect x={8} y={23} width={32} height={4.4} rx={2.2} fill="#65A30D" />
          <Rect x={9} y={28.6} width={30} height={5.4} rx={2.4} fill="#92400E" />
          <Path d="M9 35.4 h30 a15 6 0 0 1 -30 0 Z" fill="#E8A33D" />
          <Circle cx={18} cy={14.4} r={1.2} fill="#FFF7E0" />
          <Circle cx={26} cy={12.4} r={1.2} fill="#FFF7E0" />
          <Circle cx={31} cy={15.4} r={1.2} fill="#FFF7E0" />
        </>
      )}
      {icon === "fries" && (
        <>
          <Rect x={15} y={8} width={5} height={20} rx={2} fill="#FBBF24" transform="rotate(-7 17 18)" />
          <Rect x={22} y={6} width={5} height={22} rx={2} fill="#F59E0B" />
          <Rect x={29} y={8} width={5} height={20} rx={2} fill="#FBBF24" transform="rotate(7 31 18)" />
          <Path d="M13 24 h22 l-3 16 a3 3 0 0 1 -3 2.4 H19 A3 3 0 0 1 16 40 Z" fill="#DC2626" />
          <Path d="M13 24 h22 l-0.8 4.4 H13.8 Z" fill="#FFFFFF" opacity={0.85} />
        </>
      )}
      {icon === "taco" && (
        <>
          <Path d="M6 34 a18 15 0 0 1 36 0 Z" fill="#F2C14E" />
          <Path d="M9 31 a15 12 0 0 1 30 0" fill="none" stroke="#65A30D" strokeWidth={3.4} />
          <Circle cx={17} cy={27} r={2.8} fill="#DC2626" />
          <Circle cx={25} cy={24.6} r={2.8} fill="#DC2626" />
          <Circle cx={32} cy={27.4} r={2.8} fill="#92400E" />
        </>
      )}
      {icon === "burrito" && (
        <>
          <Rect x={8} y={16} width={32} height={17} rx={8.5} fill="#EBCB8B" transform="rotate(-8 24 24)" />
          <Path d="M14 15.4 C20 21, 28 27, 34 32.4 M20 12.8 C26 18, 32 24, 37 29" stroke="#D9A75F" strokeWidth={2} fill="none" transform="rotate(-8 24 24)" />
          <Ellipse cx={11.4} cy={20} rx={3.4} ry={5.4} fill="#F5E3B8" transform="rotate(-8 11.4 20)" />
        </>
      )}
      {icon === "sushi" && (
        <>
          <Rect x={7} y={30} width={34} height={6} rx={3} fill="#57534E" />
          <Rect x={11} y={19} width={11} height={11} rx={3} fill="#F8FAFC" />
          <Rect x={11} y={19} width={11} height={11} rx={3} fill="none" stroke="#292524" strokeWidth={2.6} />
          <Circle cx={16.5} cy={24.5} r={2.6} fill="#DC2626" />
          <Rect x={26} y={19} width={11} height={11} rx={3} fill="#F8FAFC" />
          <Rect x={26} y={19} width={11} height={11} rx={3} fill="none" stroke="#292524" strokeWidth={2.6} />
          <Circle cx={31.5} cy={24.5} r={2.6} fill="#F59E0B" />
          <Path d="M14 12.5 C18 9.4, 24 9.4, 27 12.5 L26 16 C22 14, 17 14, 13.4 16 Z" fill="#FB923C" />
        </>
      )}
      {icon === "soup" && (
        <>
          <Path d="M8 22 h32 a16 12 0 0 1 -32 0 Z" fill="#2563EB" />
          <Ellipse cx={24} cy={22} rx={16} ry={3.6} fill="#FDBA74" />
          <Path d="M17 17.4 C18 14.6, 20 14.6, 19.4 12 M25 17.4 C26 14.6, 28 14.6, 27.4 12" stroke="#A8A29E" strokeWidth={1.8} fill="none" strokeLinecap="round" />
          <Rect x={14} y={37} width={20} height={3} rx={1.5} fill="#1D4ED8" />
        </>
      )}
      {icon === "salad" && (
        <>
          <Path d="M8 24 h32 a16 11 0 0 1 -32 0 Z" fill="#4D7C0F" />
          <Circle cx={17} cy={20} r={4.6} fill="#65A30D" />
          <Circle cx={26} cy={18} r={5} fill="#84CC16" />
          <Circle cx={33} cy={21} r={4} fill="#65A30D" />
          <Circle cx={21} cy={21.4} r={2.2} fill="#DC2626" />
          <Circle cx={30} cy={23} r={2.2} fill="#DC2626" />
        </>
      )}
      {icon === "bread" && (
        <>
          <Path d="M10 30 C6 22, 12 13, 24 13 C36 13, 42 22, 38 30 C36 34, 12 34, 10 30 Z" fill="#D97706" />
          <Path d="M17 17.4 l3.4 4 M24 16 l3.4 4 M31 17.4 l3.4 4" stroke="#FDE68A" strokeWidth={2.2} strokeLinecap="round" />
        </>
      )}
      {icon === "drink" && (
        <>
          <Path d="M15 12 h18 l-2.2 28 a3 3 0 0 1 -3 2.8 H20.2 a3 3 0 0 1 -3 -2.8 Z" fill="#BAE6FD" />
          <Path d="M15.8 20 h16.4 l-1.2 15 H17 Z" fill="#0284C7" opacity={0.75} />
          <Rect x={25.6} y={3} width={3.4} height={14} rx={1.7} fill="#DC2626" transform="rotate(9 27 10)" />
          <Circle cx={20} cy={27} r={1.8} fill="#E0F2FE" />
          <Circle cx={26} cy={32} r={1.5} fill="#E0F2FE" />
        </>
      )}
      {icon === "shake" && (
        <>
          <Path d="M16 14 h16 l-2 26 a3 3 0 0 1 -3 2.8 h-6 A3 3 0 0 1 18 40 Z" fill="#FBCFE8" />
          <Path d="M15 14 a9 6 0 0 1 18 0 Z" fill="#FDF2F8" />
          <Circle cx={24} cy={9.4} r={3.4} fill="#DC2626" />
          <Rect x={28.4} y={2.6} width={3.2} height={13} rx={1.6} fill="#DB2777" transform="rotate(11 30 9)" />
        </>
      )}
      {icon === "pie" && (
        <>
          <Path d="M8 16 L40 16 L24 38 Z" fill="#F2C14E" />
          <Path d="M8 16 L40 16 L37.6 21.4 L10.4 21.4 Z" fill="#B45309" />
          <Path d="M16 24 l4 5 M24 23 l3.4 5 M31 24 l-3 5" stroke="#B45309" strokeWidth={2} strokeLinecap="round" />
          <Circle cx={24} cy={13.4} r={2.6} fill="#DC2626" />
        </>
      )}
      {icon === "coffee" && (
        <>
          <Rect x={11} y={16} width={22} height={17} rx={3} fill="#F5F0E8" />
          <Rect x={11} y={16} width={22} height={17} rx={3} fill="none" stroke="#A8A29E" strokeWidth={1.6} />
          <Path d="M33 20 a6.4 6.4 0 1 1 0 9" fill="none" stroke="#A8A29E" strokeWidth={2.6} />
          <Rect x={13} y={20} width={18} height={6.4} fill="#92400E" opacity={0.85} />
          <Path d="M18 11.4 C19 9, 21 9, 20.4 6.6 M26 11.4 C27 9, 29 9, 28.4 6.6" stroke="#A8A29E" strokeWidth={1.8} fill="none" strokeLinecap="round" />
          <Rect x={9} y={36.4} width={26} height={2.8} rx={1.4} fill="#D6D3D1" />
        </>
      )}
      {icon === "fish" && (
        <>
          <Ellipse cx={21} cy={25} rx={13} ry={8} fill="#94A3B8" />
          <Path d="M32 25 L42 16.4 C43 22, 43 28, 42 33.6 Z" fill="#64748B" />
          <Circle cx={15.4} cy={23} r={1.9} fill="#1F2937" />
          <Path d="M12 30.4 C16 33, 22 33.4, 27 31.4" stroke="#64748B" strokeWidth={1.8} fill="none" />
          <Path d="M8 38 h34" stroke="#D6D3D1" strokeWidth={2.6} strokeLinecap="round" />
          <Path d="M17 15.4 C19 12.6, 23 12.6, 25 15" stroke="#F59E0B" strokeWidth={2} fill="none" />
        </>
      )}
      {icon === "grapes" && (
        <>
          <Path d="M24 6 C25 9, 27 10.6, 30 11" stroke="#4D7C0F" strokeWidth={2.4} fill="none" />
          <Path d="M24 6 C19 3.4, 14 5, 13.4 9.4 C18 10.6, 22 9.4, 24 6 Z" fill="#65A30D" />
          <Circle cx={17} cy={16} r={4.6} fill="#7C3AED" />
          <Circle cx={25} cy={15} r={4.6} fill="#8B5CF6" />
          <Circle cx={32} cy={17} r={4.6} fill="#7C3AED" />
          <Circle cx={20.4} cy={23.4} r={4.6} fill="#8B5CF6" />
          <Circle cx={28.4} cy={23.4} r={4.6} fill="#7C3AED" />
          <Circle cx={24} cy={31} r={4.6} fill="#8B5CF6" />
          <Circle cx={18.4} cy={13.4} r={1.4} fill="#EDE9FE" />
        </>
      )}
      {icon === "bowl" && (
        <>
          <Path d="M7 20 h34 a17 13 0 0 1 -34 0 Z" fill="#B45309" />
          <Ellipse cx={24} cy={20} rx={17} ry={3.8} fill="#FDE68A" />
          <Circle cx={18} cy={19} r={2} fill="#DC2626" />
          <Circle cx={25} cy={20.4} r={2} fill="#65A30D" />
          <Circle cx={30.4} cy={18.8} r={2} fill="#F59E0B" />
          <Rect x={15} y={36.4} width={18} height={3} rx={1.5} fill="#92400E" />
        </>
      )}
      {icon === "cake" && (
        <>
          <Rect x={11} y={22} width={26} height={15} rx={3} fill="#FBCFE8" />
          <Rect x={11} y={22} width={26} height={5} fill="#FDF2F8" />
          <Rect x={11} y={30} width={26} height={3.4} fill="#F472B6" opacity={0.6} />
          <Rect x={22.8} y={12} width={2.4} height={8} fill="#FDE68A" />
          <Circle cx={24} cy={9.6} r={2.7} fill="#FB923C" />
          <Circle cx={24} cy={9.9} r={1.3} fill="#FDE68A" />
        </>
      )}
      {icon === "egg" && (
        <>
          <Ellipse cx={24} cy={26} rx={17} ry={12} fill="#F8FAFC" />
          <Ellipse cx={24} cy={26} rx={17} ry={12} fill="none" stroke="#E7E5E4" strokeWidth={1.6} />
          <Circle cx={19} cy={25} r={5.6} fill="#F59E0B" />
          <Circle cx={29.4} cy={28} r={4.6} fill="#FBBF24" />
          <Circle cx={17.4} cy={23.2} r={1.6} fill="#FDE68A" />
        </>
      )}
      {icon === "corn" && (
        <>
          <Rect x={19} y={8} width={10} height={26} rx={5} fill="#FACC15" />
          {[13, 19, 25].map((y) => (
            <Path key={y} d={`M19.4 ${y} h9.2 M19.4 ${y + 3} h9.2`} stroke="#EAB308" strokeWidth={1.4} />
          ))}
          <Path d="M19 30 C13 32, 10 38, 10.6 43 C15 41, 18.4 36.6, 19.6 32 Z" fill="#65A30D" />
          <Path d="M29 30 C35 32, 38 38, 37.4 43 C33 41, 29.6 36.6, 28.4 32 Z" fill="#4D7C0F" />
        </>
      )}
      {icon === "skewer" && (
        <>
          <Rect x={22.8} y={3} width={2.4} height={42} rx={1.2} fill="#B45309" transform="rotate(24 24 24)" />
          <Circle cx={17.4} cy={13} r={5} fill="#B91C1C" transform="rotate(24 24 24)" />
          <Rect x={19.4} y={17.4} width={9.4} height={9.4} rx={2.6} fill="#92400E" transform="rotate(24 24 24)" />
          <Circle cx={27.4} cy={28.4} r={4.6} fill="#65A30D" transform="rotate(24 24 24)" />
          <Rect x={29.4} y={31.4} width={8.6} height={8.6} rx={2.4} fill="#B45309" transform="rotate(24 24 24)" />
        </>
      )}
    </Svg>
  );
}

type OrderState = {
  dishes: ServeDish[];
  servedCount: number;
  msLeft: number;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type ServeGameProps = MiniGameProps & {
  /** Restaurant building type — picks the cuisine's menu. */
  cuisine?: string;
};

export function ServeGame({ accent, onComplete, onExit, cuisine = "generic" }: ServeGameProps) {
  const menu = useRef(serveMenuFor(cuisine)).current;
  const [customer, setCustomer] = useState(1);
  const [order, setOrder] = useState<OrderState | null>(null);
  const [tray, setTray] = useState<ServeDish[]>([]);
  const [servedIds, setServedIds] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [tips, setTips] = useState(0);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const orderRef = useRef<OrderState | null>(null);
  const customerRef = useRef(1);
  const servedRef = useRef(0); // customers fully served
  const tipsRef = useRef(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setGranted(
      onCompleteRef.current({
        coins: Math.min(120, tipsRef.current),
        xp: Math.min(42, servedRef.current * 8 + 2),
      })
    );
  }, []);

  const newOrder = useCallback(
    (forCustomer: number) => {
      const count = Math.random() < 0.45 ? 3 : 2;
      const dishes = shuffle(menu).slice(0, count);
      // Tray: the ordered dishes + two tempting extras, shuffled.
      const extras = shuffle(menu.filter((d) => !dishes.includes(d))).slice(0, 2);
      const trayItems = shuffle([...dishes, ...extras]);
      const o: OrderState = { dishes, servedCount: 0, msLeft: ORDER_MS };
      orderRef.current = o;
      setOrder(o);
      setTray(trayItems);
      setServedIds([]);
      setCustomer(forCustomer);
    },
    [menu]
  );

  useEffect(() => {
    newOrder(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (completedRef.current) return;
      const o = orderRef.current;
      if (!o) return;
      const msLeft = o.msLeft - TICK_MS;
      if (msLeft <= 0) {
        // Patience spent — the customer waves it off kindly and leaves.
        if (customerRef.current >= CUSTOMERS) {
          orderRef.current = null;
          setOrder(null);
          finish();
        } else {
          customerRef.current += 1;
          newOrder(customerRef.current);
        }
        return;
      }
      const next = { ...o, msLeft };
      orderRef.current = next;
      setOrder(next);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [finish, newOrder]);

  const tapDish = (dish: ServeDish, trayIndex: number) => {
    if (completedRef.current) return;
    const o = orderRef.current;
    if (!o) return;
    const want = o.dishes[o.servedCount];
    if (want && dish.name === want.name) {
      const servedCount = o.servedCount + 1;
      setServedIds((prev) => [...prev, `${dish.name}-${trayIndex}`]);
      setFlash(null);
      if (servedCount >= o.dishes.length) {
        // Order complete — tip by remaining patience.
        const tip = 10 + Math.round((o.msLeft / ORDER_MS) * 10);
        tipsRef.current += tip;
        setTips(tipsRef.current);
        servedRef.current += 1;
        if (customerRef.current >= CUSTOMERS) {
          orderRef.current = null;
          setOrder(null);
          finish();
        } else {
          customerRef.current += 1;
          newOrder(customerRef.current);
        }
      } else {
        const next = { ...o, servedCount };
        orderRef.current = next;
        setOrder(next);
      }
    } else {
      // Wrong dish — a little patience slips away.
      const next = { ...o, msLeft: Math.max(0, o.msLeft - 1200) };
      orderRef.current = next;
      setOrder(next);
      setFlash(dish.name);
      setTimeout(() => setFlash(null), 350);
    }
  };

  if (granted) {
    return (
      <GameCard title="Serve the Table" accent={accent}>
        <GameResults
          title="Shift's end"
          flavor={`You served ${servedRef.current} of ${CUSTOMERS} tables in full${servedRef.current === CUSTOMERS ? " — not a plate dropped, not a guest kept waiting" : ""}. The tips jar sings a little.`}
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  const patiencePct = order ? Math.max(0, (order.msLeft / ORDER_MS) * 100) : 0;

  return (
    <GameCard title="Serve the Table" accent={accent}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Table {Math.min(customer, CUSTOMERS)} of {CUSTOMERS}
          </Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>Tips so far: {tips}c</Text>
        </View>

        {order && (
          <>
            {/* the order ticket */}
            <View style={{ marginTop: 10, borderRadius: 12, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", padding: 10 }}>
              <Text style={{ color: "#92400E", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>ORDER — IN THIS ORDER</Text>
              <View style={{ flexDirection: "row", marginTop: 6, gap: 8 }}>
                {order.dishes.map((d, i) => {
                  const done = i < order.servedCount;
                  const nextUp = i === order.servedCount;
                  return (
                    <View
                      key={`${d.name}-${i}`}
                      style={{
                        alignItems: "center",
                        padding: 5,
                        borderRadius: 10,
                        backgroundColor: done ? "#DCFCE7" : nextUp ? "#FEF3C7" : "#FFFFFF",
                        borderWidth: 1.6,
                        borderColor: done ? "#4ADE80" : nextUp ? "#F59E0B" : "#E7E5E4",
                        opacity: done ? 0.75 : 1,
                      }}
                    >
                      <DishIcon icon={d.icon} size={38} />
                      <Text style={{ fontSize: 9.5, fontWeight: "700", color: "#57534E", marginTop: 1, maxWidth: 62, textAlign: "center" }}>
                        {done ? "Served" : d.name}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {/* patience */}
              <View style={{ height: 6, borderRadius: 3, backgroundColor: "#F5E9DC", marginTop: 9, overflow: "hidden" }}>
                <View
                  style={{
                    height: 6,
                    width: `${patiencePct}%`,
                    backgroundColor: patiencePct < 30 ? "#DC2626" : "#F59E0B",
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>

            {/* the tray */}
            <Text style={{ color: "#A08B7A", fontSize: 11.5, fontWeight: "700", marginTop: 12, marginBottom: 6 }}>
              ON THE TRAY — tap the next dish
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {tray.map((d, i) => {
                const key = `${d.name}-${i}`;
                const used = servedIds.includes(key);
                const isFlash = flash === d.name && !used;
                return (
                  <Pressable
                    key={key}
                    onPress={() => !used && tapDish(d, i)}
                    style={{
                      width: "31.5%",
                      alignItems: "center",
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor: isFlash ? "#FEE2E2" : used ? "#F0FDF4" : "#FFFFFF",
                      borderWidth: 1.6,
                      borderColor: isFlash ? "#DC2626" : used ? "#4ADE80" : "#E7E5E4",
                      opacity: used ? 0.45 : 1,
                    }}
                  >
                    <DishIcon icon={d.icon} size={44} />
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#57534E", marginTop: 2, textAlign: "center" }}>{d.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
        {!order && (
          <Text style={{ color: "#A08B7A", textAlign: "center", marginTop: 24, fontSize: 13 }}>Seating the first table…</Text>
        )}
        <Pressable onPress={onExit} style={{ alignSelf: "center", marginTop: 10, paddingVertical: 6, paddingHorizontal: 14 }}>
          <Text style={{ color: "#A08B7A", fontWeight: "700", fontSize: 13 }}>End shift early</Text>
        </Pressable>
      </View>
    </GameCard>
  );
}
