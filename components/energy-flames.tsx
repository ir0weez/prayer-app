import { memo, useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";

/* ------------------------------------------------------------------ */
/* Energy flames — one living flame per energy point, drawn as SVG    */
/* art (never emoji). Shared by the Dark Forest (where they were       */
/* born) and the Mine (v177, which spends the same pool). Lit flames   */
/* flicker on staggered sine loops; spent ones are a dark wick under   */
/* a faint smoke curl; the flame a spend just took plays a snuff       */
/* animation — it shrinks out while a smoke wisp rises and fades.     */
/* When max energy outgrows the row cap, the row shows capped slots    */
/* proportionally plus a "×N" count.                                  */
/*                                                                    */
/* `bonusTint` (the Mine's ask): flames ABOVE the max — diner coffee, */
/* the Tinderbox — render as extra flames in a pale gold tint,        */
/* after the base row, so bonus strength is visible at a glance.      */
/* The forest passes nothing and renders exactly as it always has.    */
/* ------------------------------------------------------------------ */

export type SnuffState = { from: number; to: number; key: number; long: boolean };

function energySlots(max: number, cap: number): number {
  return Math.max(1, Math.min(Math.max(1, max), cap));
}

function litForEnergy(energy: number, max: number, cap: number): number {
  const slots = energySlots(max, cap);
  if (max <= cap) return Math.max(0, Math.min(slots, Math.floor(energy)));
  if (max <= 0) return 0;
  return Math.round((Math.max(0, Math.min(max, energy)) / max) * slots);
}

/**
 * Bonus flames currently in hand: the part of the pool above the max
 * (the base store never exceeds the cap on its own, so everything
 * above it is bonus — coffee, Tinderbox). Spent first in effect: the
 * moment the total drops to the max, no bonus flames remain.
 */
function bonusForEnergy(energy: number, max: number): number {
  return Math.max(0, Math.floor(energy) - Math.max(0, max));
}

/** The flame itself: three nested teardrops (outer, mid, core).
 *  The bonus tint burns pale gold — gift flames, not earned ones. */
function FlameArt({ bonus = false }: { bonus?: boolean }) {
  const [outer, mid, core] = bonus
    ? ["#FACC15", "#FEF08A", "#FFFFFF"]
    : ["#F97316", "#FB923C", "#FDE047"];
  return (
    <G>
      <Path d="M12 1.5 C13.9 6.6 19.5 10.2 19.5 16.6 C19.5 21.6 16.2 25.2 12 25.2 C7.8 25.2 4.5 21.6 4.5 16.6 C4.5 10.2 10.1 6.6 12 1.5 Z" fill={outer} />
      <Path d="M12 7.5 C13.4 11 16.8 13.4 16.8 17.8 C16.8 21 14.7 23.4 12 23.4 C9.3 23.4 7.2 21 7.2 17.8 C7.2 13.4 10.6 11 12 7.5 Z" fill={mid} />
      <Path d="M12 13.5 C13 16 15 17.6 15 19.8 C15 21.6 13.7 22.8 12 22.8 C10.3 22.8 9 21.6 9 19.8 C9 17.6 11 16 12 13.5 Z" fill={core} />
    </G>
  );
}

const FlickerFlame = memo(function FlickerFlame({ index, size, bonus = false }: { index: number; size: number; bonus?: boolean }) {
  const flick = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const dur = 620 + (index % 5) * 110;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flick, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flick, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), (index % 7) * 120);
    return () => { clearTimeout(t); loop.stop(); };
  }, [flick, index]);
  const scale = flick.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.1] });
  const opacity = flick.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });
  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Svg width={size} height={(size * 28) / 24} viewBox="0 0 24 28">
        <FlameArt bonus={bonus} />
      </Svg>
    </Animated.View>
  );
});

/** A spent flame: nothing left but the wick and yesterday's smoke. */
function SpentFlame({ size }: { size: number }) {
  return (
    <Svg width={size} height={(size * 28) / 24} viewBox="0 0 24 28">
      <Path d="M12 19 C9.5 15.8 14.8 14.2 12.6 11 C10.9 8.6 12.2 6 14.2 4.4" stroke="#A8A29E" strokeWidth={1.5} strokeLinecap="round" fill="none" opacity={0.4} />
      <Path d="M11.1 20.5 L12.9 20.5 L12.5 25.5 L11.5 25.5 Z" fill="#44403C" />
      <Circle cx={12} cy={26} r={1.1} fill="#292524" />
    </Svg>
  );
}

/**
 * The flame a spend just took, caught mid-snuff: the flame shrinks
 * away while a smoke wisp climbs and thins. `long` stretches the
 * trail — used when the spend emptied the store.
 */
function SnuffingFlame({ size, long, onDone, bonus = false }: { size: number; long: boolean; onDone: () => void; bonus?: boolean }) {
  const flameAnim = useRef(new Animated.Value(0)).current;
  const smokeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const smokeDur = long ? 1500 : 850;
    const flame = Animated.timing(flameAnim, { toValue: 1, duration: 300, easing: Easing.in(Easing.sin), useNativeDriver: true });
    const smoke = Animated.timing(smokeAnim, { toValue: 1, duration: smokeDur, easing: Easing.out(Easing.sin), useNativeDriver: true });
    Animated.parallel([flame, smoke]).start();
    const fallback = setTimeout(onDone, smokeDur + 60);
    return () => { flame.stop(); smoke.stop(); clearTimeout(fallback); };
  }, [flameAnim, smokeAnim, long, onDone]);
  const flameScale = flameAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.08] });
  const flameOpacity = flameAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const smokeOpacity = smokeAnim.interpolate({ inputRange: [0, 0.22, 1], outputRange: [0, 0.85, 0] });
  const smokeY = smokeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, long ? -22 : -13] });
  const h = (size * 28) / 24;
  return (
    <View style={{ width: size, height: h }}>
      <View style={{ position: "absolute", left: 0, top: 0 }}>
        <Svg width={size} height={h} viewBox="0 0 24 28">
          <Path d="M11.1 20.5 L12.9 20.5 L12.5 25.5 L11.5 25.5 Z" fill="#44403C" />
        </Svg>
      </View>
      <Animated.View style={{ position: "absolute", left: 0, top: 0, transform: [{ translateY: smokeY }], opacity: smokeOpacity }}>
        <Svg width={size} height={h} viewBox="0 0 24 28">
          <Path d="M12 24 C8.5 19.5 16 17.5 12.8 12.8 C10.4 9.4 12.4 5.8 15.5 3.6" stroke="#D6D3D1" strokeWidth={2} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>
      <Animated.View style={{ position: "absolute", left: 0, top: 0, transform: [{ scale: flameScale }], opacity: flameOpacity }}>
        <Svg width={size} height={h} viewBox="0 0 24 28">
          <FlameArt bonus={bonus} />
        </Svg>
      </Animated.View>
    </View>
  );
}

type EnergyFlamesProps = {
  energy: number;
  max: number;
  /** Max flame slots before the row switches to proportional + "×N". */
  cap: number;
  size: number;
  snuff: SnuffState | null;
  onSnuffDone: () => void;
  /**
   * Render the above-max (bonus) flames as extra pale-gold flames
   * after the base row, snuff included. Off by default — the Dark
   * Forest's row is unchanged.
   */
  bonusTint?: boolean;
};

export const EnergyFlames = memo(function EnergyFlames({ energy, max, cap, size, snuff, onSnuffDone, bonusTint = false }: EnergyFlamesProps) {
  const slots = energySlots(max, cap);
  const lit = litForEnergy(energy, max, cap);
  const snuffIndex =
    snuff && litForEnergy(snuff.to, max, cap) < litForEnergy(snuff.from, max, cap)
      ? litForEnergy(snuff.to, max, cap)
      : null;
  // Bonus flames (only when the caller asks for the tint): the spend
  // that took one plays its snuff in the bonus run instead.
  const bonusNow = bonusTint ? bonusForEnergy(energy, max) : 0;
  const bonusSnuffIndex =
    bonusTint &&
    snuff &&
    snuffIndex === null &&
    bonusForEnergy(snuff.to, max) < bonusForEnergy(snuff.from, max)
      ? bonusForEnergy(snuff.to, max)
      : null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3, alignItems: "flex-end", justifyContent: "center" }}>
      {Array.from({ length: slots }, (_, i) => {
        if (snuff && snuffIndex === i) {
          return <SnuffingFlame key={`snuff-${snuff.key}`} size={size} long={snuff.long} onDone={onSnuffDone} />;
        }
        if (i < lit) return <FlickerFlame key={i} index={i} size={size} />;
        return <SpentFlame key={i} size={size} />;
      })}
      {bonusTint &&
        Array.from({ length: bonusNow }, (_, j) => {
          if (snuff && bonusSnuffIndex === j) {
            return <SnuffingFlame key={`bsnuff-${snuff.key}`} size={size} long={snuff.long} onDone={onSnuffDone} bonus />;
          }
          return <FlickerFlame key={`bonus-${j}`} index={slots + j} size={size} bonus />;
        })}
      {max > cap && (
        <Text style={{ color: "#FDBA74", fontWeight: "900", fontSize: Math.round(size * 0.82), marginLeft: 3 }}>×{max}</Text>
      )}
    </View>
  );
});
