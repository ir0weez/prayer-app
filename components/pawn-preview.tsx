import { View } from "react-native";
import type { CustomPawn, PawnAccessory, PawnEyeStyle, PawnMouthStyle } from "@/lib/pawn";

const INK = "#1F2937";

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

/** Renders a custom pawn as pure React Native shapes (no emoji). */
export function PawnPreview({ pawn, size = 120 }: { pawn: CustomPawn; size?: number }) {
  const s = size;
  const bodyW = s * 0.78;
  const bodyH = s * 0.88;
  return (
    <View style={{ width: s, height: s, alignItems: "center", justifyContent: "flex-end" }}>
      <View style={{ width: bodyW, height: bodyH, marginBottom: s * 0.04 }}>
        <View style={{ position: "absolute", left: (s - bodyW) / 2, top: 0, width: bodyW, height: bodyH, borderRadius: bodyW * 0.48, backgroundColor: pawn.bodyColor }}>
          <Eyes style={pawn.eyeStyle} s={bodyW} />
          <Mouth style={pawn.mouthStyle} s={bodyW} />
        </View>
        <Accessory kind={pawn.accessory} s={bodyW} />
      </View>
    </View>
  );
}
