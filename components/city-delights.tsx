import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";

/**
 * Hidden coin cache — a sparkling spot on a city street.
 * Twinkles gently; tap to collect (once per day).
 */
export function CoinCacheMarker({
  cellSize,
  x,
  y,
  onPress,
}: {
  cellSize: number;
  x: number;
  y: number;
  onPress: () => void;
}) {
  const twinkle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(twinkle, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [twinkle]);
  const scale = twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] });
  const opacity = twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const size = cellSize * 0.62;
  return (
    <Pressable
      onPress={onPress}
      style={{
        position: "absolute",
        left: (x + 0.5) * cellSize - size / 2,
        top: (y + 0.5) * cellSize - size / 2,
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        zIndex: Math.round((y + 1) * cellSize),
      }}
    >
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Svg width={size} height={size} viewBox="0 0 48 48">
          <Path
            d="M24 2 C26 16 32 22 46 24 C32 26 26 32 24 46 C22 32 16 26 2 24 C16 22 22 16 24 2 Z"
            fill="#FDE68A"
            stroke="#D97706"
            strokeWidth={2}
          />
          <Circle cx={24} cy={24} r={5} fill="#FBBF24" />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Wishing fountain — a small stone fountain on the city map.
 * Toss a coin (1c) for a random blessing, once an hour.
 */
export function WishingFountain({
  cellSize,
  x,
  y,
  onPress,
}: {
  cellSize: number;
  x: number;
  y: number;
  onPress: () => void;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);
  const waterOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });
  const W = cellSize * 0.95;
  const H = cellSize * 1.05;
  return (
    <Pressable
      onPress={onPress}
      style={{
        position: "absolute",
        left: (x + 0.5) * cellSize - W / 2,
        top: (y + 1) * cellSize - H,
        width: W,
        height: H,
        alignItems: "center",
        justifyContent: "flex-end",
        zIndex: Math.round((y + 1) * cellSize),
      }}
    >
      <Svg width={W} height={H} viewBox="0 0 60 66">
        {/* basin */}
        <Ellipse cx={30} cy={52} rx={26} ry={10} fill="#9CA3AF" />
        <Ellipse cx={30} cy={49} rx={22} ry={8} fill="#6B7280" />
        <Animated.View style={{ position: "absolute", opacity: 0 }} />
        <Ellipse cx={30} cy={49} rx={18} ry={6} fill="#7DD3FC" opacity={0.9} />
        {/* pedestal */}
        <Rect x={26} y={30} width={8} height={20} rx={3} fill="#9CA3AF" />
        {/* top bowl */}
        <Ellipse cx={30} cy={28} rx={12} ry={5} fill="#9CA3AF" />
        <Ellipse cx={30} cy={27} rx={9} ry={3.5} fill="#7DD3FC" opacity={0.9} />
        {/* water jet */}
        <Path d="M30 26 C30 18 28 14 30 8 C32 14 30 18 30 26 Z" fill="#BAE6FD" />
        <Path d="M24 30 C20 26 18 24 16 24 C19 27 22 29 24 31 Z" fill="#BAE6FD" opacity={0.85} />
        <Path d="M36 30 C40 26 42 24 44 24 C41 27 38 29 36 31 Z" fill="#BAE6FD" opacity={0.85} />
        {/* shimmering highlight */}
        <Circle cx={24} cy={47} r={2.4} fill="#FFFFFF" opacity={waterOpacity as any} />
        <Circle cx={36} cy={50} r={1.8} fill="#FFFFFF" opacity={0.8} />
      </Svg>
    </Pressable>
  );
}

/**
 * Street performer — a little musician on the corner.
 * Tip them (5c) and they play a tune: notes float up, +XP.
 */
export function StreetPerformer({
  cellSize,
  x,
  y,
  playing,
  onPress,
}: {
  cellSize: number;
  x: number;
  y: number;
  playing: boolean;
  onPress: () => void;
}) {
  const bob = useRef(new Animated.Value(0)).current;
  const noteRise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);
  useEffect(() => {
    if (!playing) {
      noteRise.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.timing(noteRise, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [playing, noteRise]);
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, playing ? -4 : -1.5] });
  const noteY = noteRise.interpolate({ inputRange: [0, 1], outputRange: [0, -46] });
  const noteOpacity = noteRise.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 0] });
  const W = cellSize * 0.8;
  const H = cellSize * 1.0;
  return (
    <Pressable
      onPress={onPress}
      style={{
        position: "absolute",
        left: (x + 0.5) * cellSize - W / 2,
        top: (y + 1) * cellSize - H,
        width: W,
        height: H,
        alignItems: "center",
        justifyContent: "flex-end",
        zIndex: Math.round((y + 1) * cellSize),
      }}
    >
      <Animated.View style={{ transform: [{ translateY: bobY }], alignItems: "center" }}>
        <Svg width={W} height={H} viewBox="0 0 48 60">
          {/* little stool */}
          <Rect x={18} y={46} width={12} height={8} rx={2} fill="#92400E" />
          {/* body */}
          <Rect x={19} y={28} width={10} height={18} rx={5} fill="#4F46E5" />
          {/* head */}
          <Circle cx={24} cy={20} r={8} fill="#FCD9B8" />
          {/* cap */}
          <Path d="M16 18 Q24 8 32 18 L32 20 L16 20 Z" fill="#B45309" />
          {/* guitar */}
          <Ellipse cx={32} cy={38} rx={7} ry={9} fill="#D97706" transform="rotate(-18 32 38)" />
          <Circle cx={32} cy={38} r={2.6} fill="#78350F" transform="rotate(-18 32 38)" />
          <Rect x={35} y={22} width={4} height={12} rx={2} fill="#92400E" transform="rotate(-18 37 28)" />
        </Svg>
      </Animated.View>
      {playing && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: H * 0.85,
            opacity: noteOpacity,
            transform: [{ translateY: noteY }],
            flexDirection: "row",
          }}
        >
          <MaterialIcons name="music-note" size={16} color="#A78BFA" />
          <MaterialIcons name="music-note" size={13} color="#F472B6" style={{ marginLeft: 6, marginTop: -8 }} />
        </Animated.View>
      )}
    </Pressable>
  );
}
