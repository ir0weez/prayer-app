// Shared chrome for the Ministry Row mini-games: a measured scene box
// (window-anchored, like the Mission Field scene — parents can report a
// width wider than the visible screen, so the scene clamps to the
// window minus the interior's 16px margins), the Play entry card used
// by the interiors, and the results panel every game ends on.

import { useState } from "react";
import { formatCoins } from "@/lib/hometown";
import type { MiniGameId } from "@/lib/mini-games";
import { useSkin } from "@/hooks/use-skin";
import { useSetProgress } from "@/hooks/use-set-progress";
import { paperPressedLift } from "./paper-motion";
import { LayoutChangeEvent, Pressable, Text, useWindowDimensions, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

/** Raw rewards a game reports; the interior scales + grants them and
 *  returns what was actually granted for the results screen. */
export type MiniGameReward = { coins: number; xp: number };

export type MiniGameProps = {
  accent: string;
  onComplete: (raw: MiniGameReward) => MiniGameReward;
  onExit: () => void;
};

const WINDOW_INSET = 32; // interior ScrollView margins: 16 each side

/** Measure the container, clamp to the window-anchored slot, and derive
 *  the scene height from the aspect ratio (height/width). */
export function useSceneBox(aspect: number) {
  const { width: windowW } = useWindowDimensions();
  const maxW =
    Number.isFinite(windowW) && windowW > WINDOW_INSET
      ? Math.floor(windowW - WINDOW_INSET)
      : Number.POSITIVE_INFINITY;
  const [rawW, setRawW] = useState(0);
  const sceneW = rawW > 0 ? Math.min(rawW, maxW) : 0;
  const sceneH = sceneW > 0 && Number.isFinite(sceneW) ? Math.round(sceneW * aspect) : 0;
  const ready = sceneW > 0 && sceneH > 0 && Number.isFinite(sceneH);
  const onLayout = (e: LayoutChangeEvent) => {
    try {
      const w = Math.round(e.nativeEvent.layout.width);
      if (w > 0 && Number.isFinite(w) && w !== rawW) setRawW(w);
    } catch {}
  };
  return { sceneW, sceneH, ready, onLayout };
}

/** The "Play" entry card inside a ministry interior. */
export function PlayCard({
  icon,
  title,
  blurb,
  playsLeft,
  cap,
  accent,
  onPlay,
  gameId,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  blurb: string;
  playsLeft: number | null;
  cap: number;
  accent: string;
  onPlay: () => void;
  /** The game's registry id (v200): set games also carry the day's
   *  set progress line — play all twelve for +10% town income. */
  gameId?: MiniGameId;
}) {
  const soldOut = playsLeft !== null && playsLeft <= 0;
  const { isSkinned, tokens } = useSkin();
  const setProgress = useSetProgress(gameId, playsLeft);
  return (
    <Pressable
      onPress={soldOut ? undefined : onPlay}
      style={({ pressed }) => [
        {
          marginHorizontal: 16,
          marginTop: 14,
          borderRadius: 16,
          backgroundColor: isSkinned ? (tokens.surface ?? "#FFFFFF") : "#FFFFFF",
          borderWidth: 1,
          borderColor: accent,
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          opacity: soldOut ? 0.55 : 1,
        },
        isSkinned ? tokens.cardShadow : null,
        // v202: under Paper the card lifts while held — it rises off
        // the stack and its offset shadow grows (paperPressedLift is
        // null under every other skin and when not pressed).
        paperPressedLift(tokens, pressed),
      ]}
    >
      <MaterialIcons name={icon} size={26} color={accent} />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ color: "#1C1917", fontWeight: "800", fontSize: 15 }}>{title}</Text>
        <Text style={{ color: "#78716C", fontSize: 12, marginTop: 2 }}>{blurb}</Text>
        <Text style={{ color: accent, fontSize: 12, fontWeight: "700", marginTop: 4 }}>
          {playsLeft === null
            ? "…"
            : soldOut
              ? "Played out for today — more tomorrow."
              : `Plays left today: ${playsLeft} of ${cap}`}
        </Text>
        {setProgress ? (
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "600", marginTop: 2 }}>
            {setProgress.complete
              ? "Today's set complete — town income +10% today"
              : `Today's set: ${setProgress.progress} of ${setProgress.total} — play all twelve for +10% town income`}
          </Text>
        ) : null}
      </View>
      <MaterialIcons name={soldOut ? "event-available" : "play-circle-filled"} size={30} color={accent} />
    </Pressable>
  );
}

/** The gentle results panel every mini-game ends on. */
export function GameResults({
  title,
  flavor,
  granted,
  accent,
  onDone,
}: {
  title: string;
  flavor: string;
  granted: MiniGameReward;
  accent: string;
  onDone: () => void;
}) {
  const { isSkinned, tokens } = useSkin();
  return (
    <View style={{ alignItems: "center", paddingVertical: 18, paddingHorizontal: 20 }}>
      <MaterialIcons name="emoji-events" size={34} color={accent} />
      <Text style={{ color: "#1C1917", fontWeight: "900", fontSize: 18, marginTop: 8, textAlign: "center" }}>
        {title}
      </Text>
      <Text style={{ color: "#78716C", fontSize: 13, marginTop: 6, textAlign: "center" }}>{flavor}</Text>
      <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
        {granted.coins > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name="monetization-on" size={17} color="#B45309" />
            <Text style={{ marginLeft: 5, fontWeight: "800", fontSize: 15, color: "#92400E" }}>
              +{formatCoins(granted.coins)}
            </Text>
          </View>
        )}
        {granted.xp > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name="auto-awesome" size={17} color="#7C3AED" />
            <Text style={{ marginLeft: 5, fontWeight: "800", fontSize: 15, color: "#6D28D9" }}>
              +{granted.xp} XP
            </Text>
          </View>
        )}
        {granted.coins <= 0 && granted.xp <= 0 && (
          <Text style={{ fontWeight: "700", fontSize: 14, color: "#78716C" }}>A quiet moment, well spent.</Text>
        )}
      </View>
      <Pressable
        onPress={onDone}
        style={({ pressed }) => [{ marginTop: 16, backgroundColor: accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 34 }, isSkinned ? (tokens.isPaper ? tokens.buttonShadow : tokens.cardShadow) : null, paperPressedLift(tokens, pressed)]}
      >
        <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>Done</Text>
      </Pressable>
    </View>
  );
}

/** Card wrapper each game renders inside its interior. */
export function GameCard({
  title,
  accent,
  children,
  onLayout,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const { isSkinned, tokens } = useSkin();
  return (
    <View
      onLayout={onLayout}
      style={[
        {
          marginHorizontal: 16,
          marginTop: 14,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: accent,
          backgroundColor: isSkinned ? (tokens.surface ?? "#FFFFFF") : "#FFFFFF",
          overflow: "hidden",
        },
        isSkinned ? tokens.cardShadow : null,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 12 }}>
        <MaterialIcons name="sports-esports" size={19} color={accent} />
        <Text style={{ marginLeft: 7, color: "#1C1917", fontWeight: "800", fontSize: 15 }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
