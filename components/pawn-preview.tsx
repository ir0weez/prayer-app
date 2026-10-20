import { View } from "react-native";
import type { CustomPawn, PawnAccessory, PawnBeardStyle, PawnEyeStyle, PawnGender, PawnHairStyle, PawnMouthStyle } from "@/lib/pawn";
import { beardGrowthFor, hairGrowthFor } from "@/lib/pawn";
import type { GearItem } from "@/lib/gear";

const INK = "#1F2937";
const HAIR = "#111827";

function Eyes({ style, s }: { style: PawnEyeStyle; s: number }) {
  const eyeY = s * 0.32;
  const eyeDX = s * 0.17;
  const w = s * 0.11;
  switch (style) {
    case "round":
      return (
        <>
          <View style={{ position: "absolute", top: eyeY, left: s * 0.5 - eyeDX - w / 2, width: w, height: w * 1.35, borderRadius: w / 2, backgroundColor: INK }} />
          <View style={{ position: "absolute", top: eyeY, left: s * 0.5 + eyeDX - w / 2, width: w, height: w * 1.35, borderRadius: w / 2, backgroundColor: INK }} />
          <View style={{ position: "absolute", top: eyeY + w * 0.25, left: s * 0.5 - eyeDX - w / 2 + w * 0.2, width: w * 0.32, height: w * 0.32, borderRadius: w * 0.16, backgroundColor: "#FFFFFF" }} />
          <View style={{ position: "absolute", top: eyeY + w * 0.25, left: s * 0.5 + eyeDX - w / 2 + w * 0.2, width: w * 0.32, height: w * 0.32, borderRadius: w * 0.16, backgroundColor: "#FFFFFF" }} />
        </>
      );
    case "happy":
      return (
        <>
          <View style={{ position: "absolute", top: eyeY, left: s * 0.5 - eyeDX - w / 2, width: w, height: w * 0.7, borderBottomWidth: s * 0.035, borderBottomColor: INK, borderRadius: w / 2 }} />
          <View style={{ position: "absolute", top: eyeY, left: s * 0.5 + eyeDX - w / 2, width: w, height: w * 0.7, borderBottomWidth: s * 0.035, borderBottomColor: INK, borderRadius: w / 2 }} />
        </>
      );
    case "sleepy":
      return (
        <>
          <View style={{ position: "absolute", top: eyeY + w * 0.3, left: s * 0.5 - eyeDX - w / 2, width: w, height: s * 0.03, borderRadius: s * 0.015, backgroundColor: INK }} />
          <View style={{ position: "absolute", top: eyeY + w * 0.3, left: s * 0.5 + eyeDX - w / 2, width: w, height: s * 0.03, borderRadius: s * 0.015, backgroundColor: INK }} />
        </>
      );
    case "determined": {
      const browW = w * 1.3;
      const browH = s * 0.035;
      return (
        <>
          <View style={{ position: "absolute", top: eyeY - s * 0.06, left: s * 0.5 - eyeDX - browW / 2, width: browW, height: browH, borderRadius: browH / 2, backgroundColor: INK, transform: [{ rotate: "-18deg" }] }} />
          <View style={{ position: "absolute", top: eyeY - s * 0.06, left: s * 0.5 + eyeDX - browW / 2, width: browW, height: browH, borderRadius: browH / 2, backgroundColor: INK, transform: [{ rotate: "18deg" }] }} />
          <View style={{ position: "absolute", top: eyeY + w * 0.15, left: s * 0.5 - eyeDX - w * 0.3, width: w * 0.6, height: w * 0.6, borderRadius: w * 0.3, backgroundColor: INK }} />
          <View style={{ position: "absolute", top: eyeY + w * 0.15, left: s * 0.5 + eyeDX - w * 0.3, width: w * 0.6, height: w * 0.6, borderRadius: w * 0.3, backgroundColor: INK }} />
        </>
      );
    }
    case "starry": {
      const star = (left: number) => (
        <View key={left} style={{ position: "absolute", top: eyeY, left, width: w, height: w }}>
          <View style={{ position: "absolute", left: w * 0.32, top: 0, width: w * 0.36, height: w, borderRadius: w * 0.18, backgroundColor: "#FBBF24" }} />
          <View style={{ position: "absolute", top: w * 0.32, left: 0, width: w, height: w * 0.36, borderRadius: w * 0.18, backgroundColor: "#FBBF24" }} />
        </View>
      );
      return (
        <>
          {star(s * 0.5 - eyeDX - w / 2)}
          {star(s * 0.5 + eyeDX - w / 2)}
        </>
      );
    }
  }
}

function Mouth({ style, s }: { style: PawnMouthStyle; s: number }) {
  const mouthY = s * 0.58;
  const cx = s * 0.5;
  switch (style) {
    case "smile": {
      const w = s * 0.26;
      return <View style={{ position: "absolute", top: mouthY, left: cx - w / 2, width: w, height: w * 0.55, borderBottomWidth: s * 0.035, borderBottomColor: INK, borderLeftWidth: s * 0.02, borderRightWidth: s * 0.02, borderLeftColor: "transparent", borderRightColor: "transparent", borderRadius: w / 2 }} />;
    }
    case "open": {
      const w = s * 0.2;
      return <View style={{ position: "absolute", top: mouthY, left: cx - w / 2, width: w, height: w * 1.1, borderRadius: w / 2, backgroundColor: INK }} />;
    }
    case "flat": {
      const w = s * 0.22;
      return <View style={{ position: "absolute", top: mouthY + w * 0.2, left: cx - w / 2, width: w, height: s * 0.03, borderRadius: s * 0.015, backgroundColor: INK }} />;
    }
    case "smirk": {
      const w = s * 0.22;
      return <View style={{ position: "absolute", top: mouthY, left: cx - w * 0.15, width: w, height: w * 0.5, borderBottomWidth: s * 0.035, borderBottomColor: INK, borderRadius: w / 2, transform: [{ rotate: "-8deg" }] }} />;
    }
  }
}

/** Flat, minimal hair (Notion-style). s = head width. */
function Hair({ style, s, length = 0, color = HAIR }: { style: PawnHairStyle; s: number; length?: number; color?: string }) {
  // length 0-100: dramatic growth. At 0, just the cap. At 100, long flowing hair.
  // sideScale goes from 0.2 (barely there) to 1.6 (very long)
  const sideScale = 0.2 + (length / 100) * 1.4;
  switch (style) {
    case "bald":
      return null;
    case "short":
      return (
        <View style={{ position: "absolute", top: -s * 0.03, left: s * 0.07, width: s * 0.86, height: s * (0.18 + (length / 100) * 0.22), backgroundColor: color, borderTopLeftRadius: s * 0.16, borderTopRightRadius: s * 0.16, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05 }} />
      );
    case "medium":
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.03, left: s * 0.07, width: s * 0.86, height: s * 0.24, backgroundColor: color, borderTopLeftRadius: s * 0.16, borderTopRightRadius: s * 0.16, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05 }} />
          <View style={{ position: "absolute", top: s * 0.14, left: s * 0.05, width: s * 0.1, height: s * 0.24 * sideScale, backgroundColor: color, borderRadius: s * 0.05 }} />
          <View style={{ position: "absolute", top: s * 0.14, right: s * 0.05, width: s * 0.1, height: s * 0.24 * sideScale, backgroundColor: color, borderRadius: s * 0.05 }} />
        </>
      );
    case "long":
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.03, left: s * 0.07, width: s * 0.86, height: s * 0.24, backgroundColor: color, borderTopLeftRadius: s * 0.16, borderTopRightRadius: s * 0.16, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05 }} />
          <View style={{ position: "absolute", top: s * 0.12, left: s * 0.02, width: s * 0.14, height: s * 0.62 * sideScale, backgroundColor: color, borderRadius: s * 0.07 }} />
          <View style={{ position: "absolute", top: s * 0.12, right: s * 0.02, width: s * 0.14, height: s * 0.62 * sideScale, backgroundColor: color, borderRadius: s * 0.07 }} />
        </>
      );
    case "mohawk":
      return (
        <View style={{ position: "absolute", top: -s * 0.1, left: s * 0.43, width: s * 0.14, height: s * 0.3, backgroundColor: color, borderTopLeftRadius: s * 0.07, borderTopRightRadius: s * 0.07, borderBottomLeftRadius: s * 0.04, borderBottomRightRadius: s * 0.04 }} />
      );
    case "bun":
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.22, left: s * 0.5 - s * 0.11, width: s * 0.22, height: s * 0.22, borderRadius: s * 0.11, backgroundColor: color }} />
          <View style={{ position: "absolute", top: -s * 0.03, left: s * 0.07, width: s * 0.86, height: s * 0.22, backgroundColor: color, borderTopLeftRadius: s * 0.16, borderTopRightRadius: s * 0.16, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05 }} />
        </>
      );
    case "bob":
      // Chin-length bob: rounded cap with a straight bottom edge
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.03, left: s * 0.05, width: s * 0.9, height: s * (0.3 + (length / 100) * 0.18), backgroundColor: color, borderTopLeftRadius: s * 0.18, borderTopRightRadius: s * 0.18, borderBottomLeftRadius: s * 0.04, borderBottomRightRadius: s * 0.04 }} />
          <View style={{ position: "absolute", top: s * 0.2, left: s * 0.03, width: s * 0.12, height: s * 0.3 * sideScale, backgroundColor: color, borderRadius: s * 0.06 }} />
          <View style={{ position: "absolute", top: s * 0.2, right: s * 0.03, width: s * 0.12, height: s * 0.3 * sideScale, backgroundColor: color, borderRadius: s * 0.06 }} />
        </>
      );
    case "ponytail":
      // Cap plus a tail sweeping down on the right side
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.03, left: s * 0.07, width: s * 0.86, height: s * 0.24, backgroundColor: color, borderTopLeftRadius: s * 0.16, borderTopRightRadius: s * 0.16, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05 }} />
          <View style={{ position: "absolute", top: s * 0.02, right: s * 0.06, width: s * 0.11, height: s * 0.11, borderRadius: s * 0.055, backgroundColor: color }} />
          <View style={{ position: "absolute", top: s * 0.12, right: s * 0.02, width: s * 0.13, height: s * (0.3 + (length / 100) * 0.45), backgroundColor: color, borderRadius: s * 0.065 }} />
        </>
      );
    case "braid":
      // Cap plus a braided tail: stacked segments of alternating width
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.03, left: s * 0.07, width: s * 0.86, height: s * 0.24, backgroundColor: color, borderTopLeftRadius: s * 0.16, borderTopRightRadius: s * 0.16, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05 }} />
          <View style={{ position: "absolute", top: s * 0.1, left: s * 0.5 - s * 0.075, width: s * 0.15, height: s * (0.35 + (length / 100) * 0.5), backgroundColor: color, borderRadius: s * 0.06 }}>
            <View style={{ position: "absolute", top: s * 0.08, left: -s * 0.02, width: s * 0.19, height: s * 0.05, backgroundColor: "rgba(0,0,0,0.18)", borderRadius: s * 0.025 }} />
            <View style={{ position: "absolute", top: s * 0.2, left: -s * 0.02, width: s * 0.19, height: s * 0.05, backgroundColor: "rgba(0,0,0,0.18)", borderRadius: s * 0.025 }} />
            <View style={{ position: "absolute", top: s * 0.32, left: -s * 0.02, width: s * 0.19, height: s * 0.05, backgroundColor: "rgba(0,0,0,0.18)", borderRadius: s * 0.025 }} />
          </View>
        </>
      );
    case "pixie":
      // Short textured crop: low cap with spiky tufts on top
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.02, left: s * 0.09, width: s * 0.82, height: s * 0.2, backgroundColor: color, borderTopLeftRadius: s * 0.15, borderTopRightRadius: s * 0.15, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05 }} />
          <View style={{ position: "absolute", top: -s * 0.12, left: s * 0.3, width: s * 0.1, height: s * 0.14, backgroundColor: color, borderRadius: s * 0.03, transform: [{ rotate: "-18deg" }] }} />
          <View style={{ position: "absolute", top: -s * 0.13, left: s * 0.48, width: s * 0.1, height: s * 0.15, backgroundColor: color, borderRadius: s * 0.03 }} />
          <View style={{ position: "absolute", top: -s * 0.12, left: s * 0.64, width: s * 0.1, height: s * 0.14, backgroundColor: color, borderRadius: s * 0.03, transform: [{ rotate: "18deg" }] }} />
        </>
      );
    case "fade":
      // Fade: short sides, textured longer top
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.02, left: s * 0.09, width: s * 0.82, height: s * 0.2, backgroundColor: color, borderTopLeftRadius: s * 0.14, borderTopRightRadius: s * 0.14, borderBottomLeftRadius: s * 0.04, borderBottomRightRadius: s * 0.04 }} />
          <View style={{ position: "absolute", top: -s * 0.08, left: s * 0.28, width: s * 0.44, height: s * 0.12, backgroundColor: color, borderTopLeftRadius: s * 0.06, borderTopRightRadius: s * 0.06, borderBottomLeftRadius: s * 0.02, borderBottomRightRadius: s * 0.02 }} />
        </>
      );
    case "buzz":
      // Buzz cut: very short cap hugging the head
      return (
        <View style={{ position: "absolute", top: -s * 0.01, left: s * 0.1, width: s * 0.8, height: s * 0.14, backgroundColor: color, borderTopLeftRadius: s * 0.12, borderTopRightRadius: s * 0.12, borderBottomLeftRadius: s * 0.04, borderBottomRightRadius: s * 0.04 }} />
      );
    case "curly":
      // Curly: cluster of round curls on top
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.03, left: s * 0.07, width: s * 0.86, height: s * 0.2, backgroundColor: color, borderTopLeftRadius: s * 0.16, borderTopRightRadius: s * 0.16, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05 }} />
          <View style={{ position: "absolute", top: -s * 0.14, left: s * 0.2, width: s * 0.18, height: s * 0.18, borderRadius: s * 0.09, backgroundColor: color }} />
          <View style={{ position: "absolute", top: -s * 0.15, left: s * 0.4, width: s * 0.2, height: s * 0.2, borderRadius: s * 0.1, backgroundColor: color }} />
          <View style={{ position: "absolute", top: -s * 0.14, left: s * 0.62, width: s * 0.18, height: s * 0.18, borderRadius: s * 0.09, backgroundColor: color }} />
        </>
      );
    case "dreads":
      // Dreadlocks: cap with hanging locks on the sides
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.03, left: s * 0.07, width: s * 0.86, height: s * 0.22, backgroundColor: color, borderTopLeftRadius: s * 0.16, borderTopRightRadius: s * 0.16, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05 }} />
          <View style={{ position: "absolute", top: s * 0.12, left: s * 0.05, width: s * 0.1, height: s * 0.5, backgroundColor: color, borderRadius: s * 0.05 }} />
          <View style={{ position: "absolute", top: s * 0.12, left: s * 0.19, width: s * 0.1, height: s * 0.42, backgroundColor: color, borderRadius: s * 0.05 }} />
          <View style={{ position: "absolute", top: s * 0.12, right: s * 0.19, width: s * 0.1, height: s * 0.42, backgroundColor: color, borderRadius: s * 0.05 }} />
          <View style={{ position: "absolute", top: s * 0.12, right: s * 0.05, width: s * 0.1, height: s * 0.5, backgroundColor: color, borderRadius: s * 0.05 }} />
        </>
      );
    case "pompadour":
      // Pompadour: big quiff swept up in front
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.02, left: s * 0.08, width: s * 0.84, height: s * 0.18, backgroundColor: color, borderTopLeftRadius: s * 0.14, borderTopRightRadius: s * 0.14, borderBottomLeftRadius: s * 0.04, borderBottomRightRadius: s * 0.04 }} />
          <View style={{ position: "absolute", top: -s * 0.2, left: s * 0.3, width: s * 0.42, height: s * 0.24, backgroundColor: color, borderTopLeftRadius: s * 0.12, borderTopRightRadius: s * 0.12, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05, transform: [{ rotate: "-8deg" }] }} />
        </>
      );
    case "sidepart":
      // Side part: cap with a diagonal fringe swept across the forehead
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.03, left: s * 0.07, width: s * 0.86, height: s * 0.2, backgroundColor: color, borderTopLeftRadius: s * 0.16, borderTopRightRadius: s * 0.16, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05 }} />
          <View style={{ position: "absolute", top: s * 0.1, left: s * 0.12, width: s * 0.62, height: s * 0.12, backgroundColor: color, borderRadius: s * 0.06, transform: [{ rotate: "-10deg" }] }} />
        </>
      );
    case "pigtails":
      // Pigtails: two tied puffs with hanging tails
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.03, left: s * 0.07, width: s * 0.86, height: s * 0.22, backgroundColor: color, borderTopLeftRadius: s * 0.16, borderTopRightRadius: s * 0.16, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05 }} />
          <View style={{ position: "absolute", top: s * 0.02, left: -s * 0.02, width: s * 0.13, height: s * 0.13, borderRadius: s * 0.065, backgroundColor: color }} />
          <View style={{ position: "absolute", top: s * 0.12, left: -s * 0.04, width: s * 0.12, height: s * 0.4, backgroundColor: color, borderRadius: s * 0.06 }} />
          <View style={{ position: "absolute", top: s * 0.02, right: -s * 0.02, width: s * 0.13, height: s * 0.13, borderRadius: s * 0.065, backgroundColor: color }} />
          <View style={{ position: "absolute", top: s * 0.12, right: -s * 0.04, width: s * 0.12, height: s * 0.4, backgroundColor: color, borderRadius: s * 0.06 }} />
        </>
      );
    case "highbun":
      // High bun: bun piled high on top of the head
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.3, left: s * 0.5 - s * 0.12, width: s * 0.24, height: s * 0.24, borderRadius: s * 0.12, backgroundColor: color }} />
          <View style={{ position: "absolute", top: -s * 0.03, left: s * 0.07, width: s * 0.86, height: s * 0.22, backgroundColor: color, borderTopLeftRadius: s * 0.16, borderTopRightRadius: s * 0.16, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05 }} />
        </>
      );
    case "wavy":
      // Wavy: shoulder-length waves from stacked rounded segments
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.03, left: s * 0.05, width: s * 0.9, height: s * 0.24, backgroundColor: color, borderTopLeftRadius: s * 0.17, borderTopRightRadius: s * 0.17, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05 }} />
          <View style={{ position: "absolute", top: s * 0.16, left: s * 0.0, width: s * 0.16, height: s * 0.2, borderRadius: s * 0.08, backgroundColor: color }} />
          <View style={{ position: "absolute", top: s * 0.32, left: s * 0.02, width: s * 0.16, height: s * 0.2, borderRadius: s * 0.08, backgroundColor: color }} />
          <View style={{ position: "absolute", top: s * 0.16, right: s * 0.0, width: s * 0.16, height: s * 0.2, borderRadius: s * 0.08, backgroundColor: color }} />
          <View style={{ position: "absolute", top: s * 0.32, right: s * 0.02, width: s * 0.16, height: s * 0.2, borderRadius: s * 0.08, backgroundColor: color }} />
        </>
      );
    case "lob":
      // Lob: long bob, straight and shoulder-length
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.03, left: s * 0.05, width: s * 0.9, height: s * 0.3, backgroundColor: color, borderTopLeftRadius: s * 0.18, borderTopRightRadius: s * 0.18, borderBottomLeftRadius: s * 0.04, borderBottomRightRadius: s * 0.04 }} />
          <View style={{ position: "absolute", top: s * 0.22, left: s * 0.02, width: s * 0.13, height: s * 0.4, backgroundColor: color, borderRadius: s * 0.06 }} />
          <View style={{ position: "absolute", top: s * 0.22, right: s * 0.02, width: s * 0.13, height: s * 0.4, backgroundColor: color, borderRadius: s * 0.06 }} />
        </>
      );
    case "laurel":
      // Prestige (Crown 1): neat cap crowned with a golden laurel wreath.
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.03, left: s * 0.07, width: s * 0.86, height: s * (0.18 + (length / 100) * 0.22), backgroundColor: color, borderTopLeftRadius: s * 0.16, borderTopRightRadius: s * 0.16, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05 }} />
          {[0.16, 0.3, 0.44, 0.58, 0.72].map((fx, i) => (
            <View key={i} style={{ position: "absolute", top: -s * 0.09 + Math.abs(i - 2) * s * 0.018, left: s * fx, width: s * 0.11, height: s * 0.07, borderRadius: s * 0.035, backgroundColor: i % 2 ? "#D4AF37" : "#F6C453", transform: [{ rotate: `${(i - 2) * 18}deg` }] }} />
          ))}
          <View style={{ position: "absolute", top: s * 0.02, left: s * 0.1, width: s * 0.8, height: s * 0.028, backgroundColor: "#B8912C", borderRadius: s * 0.014 }} />
        </>
      );
    case "coronet":
      // Prestige (Crown 2): radiant coronet — gold band, bright points, glow gems.
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.03, left: s * 0.07, width: s * 0.86, height: s * (0.18 + (length / 100) * 0.22), backgroundColor: color, borderTopLeftRadius: s * 0.16, borderTopRightRadius: s * 0.16, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05 }} />
          <View style={{ position: "absolute", top: -s * 0.05, left: s * 0.12, width: s * 0.76, height: s * 0.07, backgroundColor: "#F6C453", borderRadius: s * 0.02 }} />
          {[0.2, 0.42, 0.64].map((fx, i) => (
            <View key={i} style={{ position: "absolute", top: -s * 0.16, left: s * fx, width: s * 0.09, height: s * 0.12, backgroundColor: "#FDE68A", borderTopLeftRadius: s * 0.045, borderTopRightRadius: s * 0.045 }} />
          ))}
          {[0.245, 0.465, 0.685].map((fx, i) => (
            <View key={`g${i}`} style={{ position: "absolute", top: -s * 0.035, left: s * fx, width: s * 0.045, height: s * 0.045, borderRadius: s * 0.023, backgroundColor: "#FFFFFF" }} />
          ))}
        </>
      );
    case "glorymane":
      // Prestige (Crown 3): a flowing mane, streaked with light.
      return (
        <>
          <View style={{ position: "absolute", top: -s * 0.03, left: s * 0.07, width: s * 0.86, height: s * 0.24, backgroundColor: color, borderTopLeftRadius: s * 0.16, borderTopRightRadius: s * 0.16, borderBottomLeftRadius: s * 0.05, borderBottomRightRadius: s * 0.05 }} />
          <View style={{ position: "absolute", top: s * 0.12, left: s * 0.02, width: s * 0.14, height: s * 0.72 * sideScale, backgroundColor: color, borderRadius: s * 0.07 }} />
          <View style={{ position: "absolute", top: s * 0.12, right: s * 0.02, width: s * 0.14, height: s * 0.72 * sideScale, backgroundColor: color, borderRadius: s * 0.07 }} />
          <View style={{ position: "absolute", top: s * 0.14, left: s * 0.045, width: s * 0.035, height: s * 0.6 * sideScale, backgroundColor: "#FDE68A", borderRadius: s * 0.018, opacity: 0.85 }} />
          <View style={{ position: "absolute", top: s * 0.14, right: s * 0.045, width: s * 0.035, height: s * 0.6 * sideScale, backgroundColor: "#FDE68A", borderRadius: s * 0.018, opacity: 0.85 }} />
          <View style={{ position: "absolute", top: -s * 0.02, left: s * 0.3, width: s * 0.04, height: s * 0.2, backgroundColor: "#FFFFFF", borderRadius: s * 0.02, opacity: 0.7 }} />
          <View style={{ position: "absolute", top: -s * 0.02, left: s * 0.62, width: s * 0.04, height: s * 0.2, backgroundColor: "#FFFFFF", borderRadius: s * 0.02, opacity: 0.7 }} />
        </>
      );
    default:
      return null;
  }
}

/** Beard that grows with time (male pawns only). length 0-100. */
function Beard({ length, s, style = "full" }: { length: number; s: number; style?: PawnBeardStyle }) {
  if (length <= 0 || style === "none") return null;
  if (length <= 33) {
    // stubble: subtle 5-o'clock shadow on the jaw (not dots)
    const shadowW = style === "mustache" ? { left: s * 0.32, right: s * 0.32 } : style === "goatee" ? { left: s * 0.38, right: s * 0.38 } : { left: s * 0.22, right: s * 0.22 };
    return (
      <View style={{ position: "absolute", ...shadowW, top: s * 0.58, height: s * 0.24, backgroundColor: HAIR, opacity: 0.18, borderBottomLeftRadius: s * 0.12, borderBottomRightRadius: s * 0.12 }} />
    );
  }
  if (style === "mustache") {
    // mustache only: sits above the mouth
    const w = s * 0.34;
    const h = s * (length <= 66 ? 0.07 : 0.1);
    return (
      <View style={{ position: "absolute", top: s * 0.52, left: s * 0.5 - w / 2, width: w, height: h, backgroundColor: HAIR, borderRadius: s * 0.035 }} />
    );
  }
  if (style === "goatee") {
    // goatee: chin patch only
    const w = s * 0.3;
    const h = s * (length <= 66 ? 0.22 : 0.36);
    return (
      <View style={{ position: "absolute", top: s * 0.6, left: s * 0.5 - w / 2, width: w, height: h, backgroundColor: HAIR, borderBottomLeftRadius: s * 0.1, borderBottomRightRadius: s * 0.1, borderTopLeftRadius: s * 0.04, borderTopRightRadius: s * 0.04 }} />
    );
  }
  if (style === "gilded" || style === "radiant" || style === "heavenly") {
    // Prestige beards: full beards with tier regalia — a gold band
    // (gilded), bright light-edged strands (radiant), or long white
    // glory (heavenly).
    const w = s * 0.8;
    const h = s * (style === "heavenly" ? 0.72 : length <= 66 ? 0.38 : 0.58);
    const fill = style === "heavenly" ? "#E8E4DA" : HAIR;
    return (
      <View style={{ position: "absolute", top: s * 0.44, left: s * 0.5 - w / 2, width: w, height: h, backgroundColor: fill, borderBottomLeftRadius: s * 0.26, borderBottomRightRadius: s * 0.26, borderTopLeftRadius: s * 0.1, borderTopRightRadius: s * 0.1 }}>
        {style === "gilded" && (
          <View style={{ position: "absolute", bottom: s * 0.07, left: s * 0.12, right: s * 0.12, height: s * 0.045, backgroundColor: "#D4AF37", borderRadius: s * 0.022 }} />
        )}
        {style === "radiant" && (
          <>
            <View style={{ position: "absolute", top: s * 0.06, left: s * 0.14, width: s * 0.045, height: h - s * 0.14, backgroundColor: "#FDE68A", borderRadius: s * 0.022, opacity: 0.9 }} />
            <View style={{ position: "absolute", top: s * 0.06, right: s * 0.14, width: s * 0.045, height: h - s * 0.14, backgroundColor: "#FDE68A", borderRadius: s * 0.022, opacity: 0.9 }} />
          </>
        )}
        {style === "heavenly" && (
          <>
            <View style={{ position: "absolute", top: s * 0.05, left: s * 0.3, width: s * 0.05, height: h - s * 0.1, backgroundColor: "#FFFFFF", borderRadius: s * 0.025, opacity: 0.75 }} />
            <View style={{ position: "absolute", bottom: s * 0.05, left: s * 0.2, right: s * 0.2, height: s * 0.04, backgroundColor: "#D4AF37", borderRadius: s * 0.02, opacity: 0.8 }} />
          </>
        )}
      </View>
    );
  }
  if (length <= 66) {
    // short full beard: covers the full lower face — cheeks, jaw, chin, framing the mouth
    const w = s * 0.78;
    return (
      <View style={{ position: "absolute", top: s * 0.44, left: s * 0.5 - w / 2, width: w, height: s * 0.36, backgroundColor: HAIR, borderBottomLeftRadius: s * 0.18, borderBottomRightRadius: s * 0.18, borderTopLeftRadius: s * 0.1, borderTopRightRadius: s * 0.1 }} />
    );
  }
  // long full beard: full lower-face coverage, extends below the chin
  const w = s * 0.8;
  return (
    <View style={{ position: "absolute", top: s * 0.44, left: s * 0.5 - w / 2, width: w, height: s * 0.56, backgroundColor: HAIR, borderBottomLeftRadius: s * 0.24, borderBottomRightRadius: s * 0.24, borderTopLeftRadius: s * 0.1, borderTopRightRadius: s * 0.1 }} />
  );
}

function Accessory({ kind, s }: { kind: PawnAccessory; s: number }) {
  const cx = s * 0.5;
  switch (kind) {
    case "none":
      return null;
    case "tophat": {
      const w = s * 0.42;
      const h = s * 0.34;
      const top = -s * 0.16;
      return (
        <View style={{ position: "absolute", top, left: 0, right: 0, alignItems: "center", height: h + s * 0.05 }}>
          <View style={{ width: w, height: h, borderRadius: s * 0.03, backgroundColor: "#111827" }}>
            <View style={{ position: "absolute", top: h * 0.62, left: 0, right: 0, height: s * 0.05, backgroundColor: "#DC2626" }} />
          </View>
          <View style={{ width: w * 1.5, height: s * 0.05, borderRadius: s * 0.025, backgroundColor: "#111827", marginTop: -s * 0.02 }} />
        </View>
      );
    }
    case "crown": {
      const w = s * 0.46;
      const h = s * 0.2;
      return (
        <View style={{ position: "absolute", top: -s * 0.1, left: cx - w / 2, width: w, height: h, flexDirection: "row", alignItems: "flex-end", justifyContent: "center" }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: w / 3.4, height: h * (i === 1 ? 1 : 0.72), backgroundColor: "#FBBF24", borderTopLeftRadius: s * 0.02, borderTopRightRadius: s * 0.02, marginHorizontal: 1, alignItems: "center" }}>
              <View style={{ width: s * 0.035, height: s * 0.035, borderRadius: s * 0.018, backgroundColor: "#EF4444", marginTop: 2 }} />
            </View>
          ))}
        </View>
      );
    }
    case "halo": {
      const w = s * 0.5;
      return <View style={{ position: "absolute", top: -s * 0.14, left: cx - w / 2, width: w, height: w * 0.32, borderRadius: w / 2, borderWidth: s * 0.045, borderColor: "#FDE68A" }} />;
    }
    case "cap": {
      const w = s * 0.52;
      const top = -s * 0.1;
      return (
        <View style={{ position: "absolute", top, left: 0, right: 0, alignItems: "center" }}>
          <View style={{ width: w, height: w * 0.52, backgroundColor: "#DC2626", borderTopLeftRadius: w / 2, borderTopRightRadius: w / 2 }} />
          <View style={{ width: w * 0.5, height: s * 0.045, borderRadius: s * 0.022, backgroundColor: "#991B1B", marginTop: -s * 0.01, marginLeft: w * 0.3 }} />
        </View>
      );
    }
  }
}

/** Renders a custom pawn as a chess-pawn silhouette: round head + cylindrical body. */
export function PawnPreview({ pawn, size = 120, equippedGear }: { pawn: CustomPawn; size?: number; equippedGear?: GearItem | null }) {
  const s = size;
  const bodyStyle = pawn.bodyStyle || 'pebble';
  // Head is constant; body proportions vary by style
  const headD = s * 0.52;
  let bodyW: number, bodyH: number, baseW: number;
  switch (bodyStyle) {
    case 'round':
      bodyW = s * 0.5; bodyH = s * 0.3; baseW = s * 0.62;
      break;
    case 'tall':
      bodyW = s * 0.38; bodyH = s * 0.42; baseW = s * 0.52;
      break;
    case 'stocky':
      bodyW = s * 0.56; bodyH = s * 0.26; baseW = s * 0.68;
      break;
    case 'pebble':
    default:
      bodyW = s * 0.44; bodyH = s * 0.34; baseW = s * 0.58;
      break;
  }
  const beardLength = pawn.gender === "male" ? beardGrowthFor(pawn) : 0;
  const hairLength = hairGrowthFor(pawn);
  const headR = headD / 2;
  // Clothes gear overrides the body/base/collar color; head keeps the pawn's color.
  const gear = equippedGear && equippedGear.type === "clothes" ? equippedGear : null;
  const clothColor = gear?.visual.bodyColor || pawn.bodyColor;
  const pattern = gear?.visual.pattern;
  return (
    <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
      <View style={{ alignItems: "center", marginBottom: s * 0.02 }}>
        {/* Head */}
        <View style={{ width: headD, height: headD, borderRadius: headR, backgroundColor: pawn.bodyColor }}>
          <Hair style={pawn.hairStyle} s={headD} length={hairLength} color={pawn.hairColor || HAIR} />
          <Eyes style={pawn.eyeStyle} s={headD} />
          <Mouth style={pawn.mouthStyle} s={headD} />
          <Beard length={beardLength} s={headD} style={pawn.beardStyle} />
        </View>
        {/* Accessories sit on the head */}
        <View style={{ position: "absolute", top: -headD * 0.28, width: headD, height: headD * 0.5 }}>
          <Accessory kind={pawn.accessory} s={headD} />
        </View>
        {/* Collar */}
        <View style={{ width: bodyW * 1.15, height: s * 0.06, borderRadius: s * 0.03, backgroundColor: clothColor, marginTop: -s * 0.02, opacity: pattern === "collar" ? 1 : 0.85, borderWidth: pattern === "collar" ? 2 : 0, borderColor: "#FBBF24" }} />
        {/* Cylindrical body */}
        <View style={{ width: bodyW, height: bodyH, backgroundColor: clothColor, borderBottomLeftRadius: bodyW * 0.18, borderBottomRightRadius: bodyW * 0.18, overflow: "hidden" }}>
          {pattern === "stripes" && (
            <>
              <View style={{ position: "absolute", top: bodyH * 0.25, left: 0, right: 0, height: bodyH * 0.12, backgroundColor: "rgba(255,255,255,0.35)" }} />
              <View style={{ position: "absolute", top: bodyH * 0.55, left: 0, right: 0, height: bodyH * 0.12, backgroundColor: "rgba(255,255,255,0.35)" }} />
            </>
          )}
          {pattern === "dots" && (
            <>
              <View style={{ position: "absolute", top: bodyH * 0.2, left: bodyW * 0.25, width: bodyW * 0.12, height: bodyW * 0.12, borderRadius: bodyW * 0.06, backgroundColor: "rgba(255,255,255,0.4)" }} />
              <View style={{ position: "absolute", top: bodyH * 0.45, left: bodyW * 0.55, width: bodyW * 0.12, height: bodyW * 0.12, borderRadius: bodyW * 0.06, backgroundColor: "rgba(255,255,255,0.4)" }} />
              <View style={{ position: "absolute", top: bodyH * 0.65, left: bodyW * 0.3, width: bodyW * 0.12, height: bodyW * 0.12, borderRadius: bodyW * 0.06, backgroundColor: "rgba(255,255,255,0.4)" }} />
            </>
          )}
          {pattern === "belt" && (
            <View style={{ position: "absolute", bottom: bodyH * 0.15, left: 0, right: 0, height: bodyH * 0.18, backgroundColor: "#92400E" }} />
          )}
        </View>
        {/* Base */}
        <View style={{ width: baseW, height: s * 0.09, borderRadius: s * 0.045, backgroundColor: clothColor, marginTop: -s * 0.01 }} />
      </View>
    </View>
  );
}
