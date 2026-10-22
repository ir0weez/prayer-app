// The Great Peak — crowning the town map (v168; vibe pass v169).
//
// The approved mockup (Concept 2, Jonathan 2026-10-21): one dominant
// peak over sloping shoulders along the TOP edge of the town map, the
// cave mouth centered under a plain carved stone arch, lit lanterns
// flanking the door. Drawn with the paper kit (PaperCanvas) in the
// town's own cutout language — layered ridges, the kit shadow, ink
// #2A1A33, gold #C9963C.
//
// That word was never a NAME (Jonathan's correction, 2026-10-22:
// when he said the cave should say it, he meant the vibe should
// feel safe). It is a FEELING — refuge, shelter, welcome — and it is
// rendered, never spelled: warm light spilling out of the cave mouth
// onto the ground in front of it, a hearth-like glow breathing just
// inside the entrance (the kit's PaperPulse sine, native driver),
// lanterns lit at the door, and a small flame carved into the arch —
// an image, not words. Do not re-add the word here.
//
// Day/night: by day the spill is a gentle warmth; after dark the sky
// deepens, the lanterns pool real light on the stone, and the hearth
// glow burns stronger — the same lit-glass language the town's
// windows speak (v145: the light lives in the art).

import { Text, View } from "react-native";
import { PaperCanvas, PaperGlowDisc, PaperPulse, type PaperPainter } from "@/components/paper-interior";

export const GREAT_PEAK_COLS = 100;
export const GREAT_PEAK_ROWS = 46;

const SKY_DAY = "#CFE3F5";
const SKY_NIGHT = "#241430";
const SHOULDER = "#8E7FA8";
const PEAK = "#6E5A8C";
const PEAK_FACET = "#7D689C";
const SNOW = "#FFFDF6";
const ARCH = "#9C93AC";
const ARCH_TRIM = "#6E6484";
const CARVE = "#7E7394";
const CARVE_LIGHT = "#B4ABC2";
const CAVE = "#241430";
const CAVE_INNER = "#170B22";
const LAMP = "#FFD98A";
const HEARTH = "#FFB84D";
const GRASS = "#DDECC8";
const GRASS_EDGE = "#C3D9A8";

export function GreatPeakArt({ width, night }: { width: number; night: boolean }) {
  const unit = width / GREAT_PEAK_COLS;
  const height = GREAT_PEAK_ROWS * unit;
  // the hearth light just inside the entrance — a soft disc breathing
  // on the kit's sine (PaperPulse), stronger after dark
  const hearthSize = unit * 13;
  const hearthCx = 50 * unit;
  const hearthCy = 35 * unit;
  // the spill pooled on the ground in front of the mouth — a wide,
  // flattened disc on a slower breath
  const spillSize = unit * 22;
  const spillCx = 50 * unit;
  const spillCy = 39 * unit;
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
          // the stone arch — plain carved stone, no letters: a trim
          // line etched around the band so it still reads crafted
          p.path("M 39 27.5 A 11 8.5 0 0 1 61 27.5 L 61 30 L 39 30 Z", ARCH);
          p.stroke("M 40.3 29.9 A 9.7 7.6 0 0 1 59.7 29.9", ARCH_TRIM, 0.45, 0.8);
          p.stroke("M 41.6 29.9 A 8.4 6.4 0 0 1 58.4 29.9", ARCH_TRIM, 0.3, 0.45);
          // a small flame carved into the arch — an image, not words:
          // a groove copy under a lit face, like chisel then candlelight
          p.path("M 50 26.6 C 51.4 28.2 52.1 29.2 52.1 30.1 A 2.1 1.7 0 1 1 47.9 30.1 C 47.9 29.2 48.6 28.2 50 26.6 Z", CARVE, { shadow: false });
          p.path("M 50 27.9 C 50.8 28.8 51.2 29.4 51.2 30 A 1.2 1 0 1 1 48.8 30 C 48.8 29.4 49.2 28.8 50 27.9 Z", CARVE_LIGHT, { shadow: false });
          // cave mouth
          p.path("M 42.5 38 L 42.5 30.5 A 7.5 8 0 0 1 57.5 30.5 L 57.5 38 Z", CAVE, { shadow: false });
          p.path("M 45.2 38 L 45.2 31.8 A 4.8 5.4 0 0 1 54.8 31.8 L 54.8 38 Z", CAVE_INNER, { shadow: false });
          // hearth warmth settled low inside the entrance
          p.glow(50, 36.4, 4.6, HEARTH, night ? 0.85 : 0.55);
          // lanterns flanking the door
          [45.8, 54.2].forEach((lx) => {
            p.line(lx, 29.6, lx, 30.8, "#C9963C", 0.4);
            p.rect(lx - 0.85, 30.8, 1.7, 2.3, "#3A2A18", { shadow: false, r: 0.5 });
            p.circle(lx, 31.95, 0.68, LAMP, { shadow: false });
          });
          // the ground it stands on — the town's own grass sheet
          p.rect(0, 38, 100, 8, GRASS, { shadow: false, edge: false });
          p.rect(0, 38, 100, 1.6, GRASS_EDGE, { shadow: false, edge: false });
          // warm light spilling out of the mouth, pooled on the ground
          // in front of it — someone is home in there
          p.ellipse(50, 38.9, 8.5, 1.7, LAMP, { shadow: false, edge: false, opacity: night ? 0.5 : 0.3 });
          p.glow(50, 38.7, 9, LAMP, night ? 0.5 : 0.25);
          // two paper pines keeping the gate
          [7, 93].forEach((tx) => {
            p.rect(tx - 0.5, 33.4, 1, 3.4, "#3A2A1C", { shadow: false, r: 0.3 });
            p.poly(`${tx - 3.4},34 ${tx},28.6 ${tx + 3.4},34`, "#2C4A2E");
            p.poly(`${tx - 2.6},31.4 ${tx},27 ${tx + 2.6},31.4`, "#38603A", { shadow: false });
          });
        }}
      />
      {/* the hearth inside the entrance, breathing — the shelter cue.
          One glow, one sine, nothing else moves. */}
      <PaperPulse
        duration={2600}
        min={night ? 0.72 : 0.5}
        max={1}
        style={{ position: "absolute", left: hearthCx - hearthSize / 2, top: hearthCy - hearthSize / 2 }}
      >
        <PaperGlowDisc size={hearthSize} color={HEARTH} opacity={night ? 0.8 : 0.5} />
      </PaperPulse>
      {/* the same warmth pooled on the ground outside, breathing slower */}
      <PaperPulse
        duration={3400}
        min={night ? 0.65 : 0.45}
        max={1}
        delay={700}
        style={{
          position: "absolute",
          left: spillCx - spillSize / 2,
          top: spillCy - spillSize / 2,
          transform: [{ scaleY: 0.38 }],
        }}
      >
        <PaperGlowDisc size={spillSize} color={LAMP} opacity={night ? 0.55 : 0.32} />
      </PaperPulse>
      {/* the gate label, in the town landmarks' own chip language */}
      <View style={{ position: "absolute", bottom: 4, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
        <Text style={{ fontSize: 10, fontWeight: "800", color: "#FFFFFF" }}>The Mine</Text>
      </View>
    </View>
  );
}
