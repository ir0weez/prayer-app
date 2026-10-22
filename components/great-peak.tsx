// The Great Peak — "Safety" — crowning the town map (v168).
//
// The approved mockup (Concept 2, Jonathan 2026-10-21): one dominant
// peak over sloping shoulders along the TOP edge of the town map, the
// cave mouth centered under a stone arch with SAFETY etched into it,
// lit lanterns flanking the door. Drawn with the paper kit
// (PaperCanvas) in the town's own cutout language — layered ridges,
// the kit shadow, ink #2A1A33, gold #C9963C. The etched name rides in
// an SVG text layer over the arch (the painter has no letterforms).
//
// Day/night: by day the lanterns are a faint warmth; after dark they
// pool real light on the stone and the sky deepens — the same
// lit-glass language the town's windows speak (v145: the light lives
// in the art, never in a floating overlay).

import { Text, View } from "react-native";
import Svg, { Text as SvgText } from "react-native-svg";
import { PaperCanvas, type PaperPainter } from "@/components/paper-interior";

export const GREAT_PEAK_COLS = 100;
export const GREAT_PEAK_ROWS = 46;

const SKY_DAY = "#CFE3F5";
const SKY_NIGHT = "#241430";
const SHOULDER = "#8E7FA8";
const PEAK = "#6E5A8C";
const PEAK_FACET = "#7D689C";
const SNOW = "#FFFDF6";
const ARCH = "#9C93AC";
const CAVE = "#241430";
const CAVE_INNER = "#170B22";
const LAMP = "#FFD98A";
const GRASS = "#DDECC8";
const GRASS_EDGE = "#C3D9A8";

export function GreatPeakArt({ width, night }: { width: number; night: boolean }) {
  const unit = width / GREAT_PEAK_COLS;
  const height = GREAT_PEAK_ROWS * unit;
  return (
    <View style={{ width, height }} pointerEvents="none">
      <PaperCanvas
        cols={GREAT_PEAK_COLS}
        rows={GREAT_PEAK_ROWS}
        unit={unit}
        draw={(p: PaperPainter) => {
          // sky
          p.rect(0, 0, 100, 46, night ? SKY_NIGHT : SKY_DAY, { shadow: false, edge: false });
          if (night) {
            // moon + a small field of stars
            p.circle(88, 7, 3.4, "#F7F0DE", { shadow: false });
            p.circle(86.8, 6.2, 3, night ? SKY_NIGHT : SKY_DAY, { shadow: false, edge: false });
            [[14, 5], [26, 9], [38, 4], [63, 6], [74, 10], [8, 12], [55, 3]].forEach(([sx, sy]) =>
              p.circle(sx, sy, 0.55, "#F7F0DE", { shadow: false, opacity: 0.85 })
            );
          } else {
            p.circle(11, 7, 4, "#FBBF24");
            p.ellipse(78, 6.5, 7, 1.9, "#FFFDF6", { shadow: false, opacity: 0.9 });
            p.ellipse(30, 4.5, 5, 1.4, "#FFFDF6", { shadow: false, opacity: 0.75 });
          }
          // shoulders rolling away on both sides
          p.poly("0,34 13,26 27,31 40,27 40,46 0,46", SHOULDER);
          p.poly("100,33 87,25 73,30 60,27 60,46 100,46", SHOULDER);
          // the peak, with its lit facet
          p.poly("50,5 62,18 68,26 71,38 29,38 33,25 40,17", PEAK);
          p.poly("50,5 62,18 68,26 71,38 57,38 54,21 52,12", PEAK_FACET, { shadow: false });
          // snowcap
          p.poly("50,5 55.5,11 52,9.3 49.8,13.5 47,9.3 44.5,11", SNOW, { shadow: false });
          p.poly("40,17 42.5,20 40.8,19 39,21.5 38,18.8", SNOW, { shadow: false, opacity: 0.85 });
          // lantern light pooled on the stone (stronger after dark)
          p.glow(50, 31.5, 12, LAMP, night ? 0.6 : 0.3);
          // the stone arch carrying the name
          p.path("M 39 27.5 A 11 8.5 0 0 1 61 27.5 L 61 30 L 39 30 Z", ARCH);
          // cave mouth
          p.path("M 42.5 38 L 42.5 30.5 A 7.5 8 0 0 1 57.5 30.5 L 57.5 38 Z", CAVE, { shadow: false });
          p.path("M 45.2 38 L 45.2 31.8 A 4.8 5.4 0 0 1 54.8 31.8 L 54.8 38 Z", CAVE_INNER, { shadow: false });
          // lanterns flanking the door
          [45.8, 54.2].forEach((lx) => {
            p.line(lx, 29.6, lx, 30.8, "#C9963C", 0.4);
            p.rect(lx - 0.85, 30.8, 1.7, 2.3, "#3A2A18", { shadow: false, r: 0.5 });
            p.circle(lx, 31.95, 0.68, LAMP, { shadow: false });
          });
          // the ground it stands on — the town's own grass sheet
          p.rect(0, 38, 100, 8, GRASS, { shadow: false, edge: false });
          p.rect(0, 38, 100, 1.6, GRASS_EDGE, { shadow: false, edge: false });
          // two paper pines keeping the gate
          [7, 93].forEach((tx) => {
            p.rect(tx - 0.5, 33.4, 1, 3.4, "#3A2A1C", { shadow: false, r: 0.3 });
            p.poly(`${tx - 3.4},34 ${tx},28.6 ${tx + 3.4},34`, "#2C4A2E");
            p.poly(`${tx - 2.6},31.4 ${tx},27 ${tx + 2.6},31.4`, "#38603A", { shadow: false });
          });
        }}
      />
      {/* SAFETY, etched: a dark groove copy under the lit face. */}
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${GREAT_PEAK_COLS} ${GREAT_PEAK_ROWS}`}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <SvgText
          x={50}
          y={26.9}
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontWeight="bold"
          fontSize={3.9}
          letterSpacing={1.1}
          fill="#241430"
          opacity={0.3}
        >
          SAFETY
        </SvgText>
        <SvgText
          x={50}
          y={26.55}
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontWeight="bold"
          fontSize={3.9}
          letterSpacing={1.1}
          fill="#EFE9DA"
        >
          SAFETY
        </SvgText>
      </Svg>
      {/* the gate label, in the town landmarks' own chip language */}
      <View style={{ position: "absolute", bottom: 4, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
        <Text style={{ fontSize: 10, fontWeight: "800", color: "#FFFFFF" }}>Safety · Enter the Mine</Text>
      </View>
    </View>
  );
}
