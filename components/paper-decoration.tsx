// ---------- paper town: map decorations ----------
// The map grid's little set pieces — fountain, statue, garden bed,
// lantern — drawn in the same paper language as the buildings: flat
// layered shapes with the kit's soft offset shadow, on a 20-unit
// square canvas. (The map used to stamp these as emoji glyphs; the
// paper town draws everything instead, per Jonathan's no-emoji rule.)

import { View } from "react-native";
import { PaperCanvas, type PaperPainter } from "@/components/paper-interior";

export type MapDecorationKind = "fountain" | "statue" | "garden" | "lantern";

const ROWS = 20;

function drawFountain(p: PaperPainter) {
  p.ellipse(10, 18.6, 8.6, 1.6, "#D8D2C0", { shadow: false });
  p.ellipse(10, 18.2, 6.6, 1.2, "#BEE3F8", { shadow: false });
  p.rect(9, 10.5, 2, 7.6, "#D8D2C0", { shadow: false });
  p.ellipse(10, 10.4, 4.4, 1, "#D8D2C0", { shadow: false });
  p.ellipse(10, 10.2, 3.2, 0.7, "#BEE3F8", { shadow: false });
  p.stroke("M 10 8.6 Q 6.6 6.4 5.2 9.6", "#7FB6D9", 0.9, 0.85);
  p.stroke("M 10 8.6 Q 13.4 6.4 14.8 9.6", "#7FB6D9", 0.9, 0.85);
  p.stroke("M 10 8.2 Q 10 5.4 10 3.4", "#7FB6D9", 0.9, 0.85);
  p.circle(10, 8.8, 0.9, "#7FB6D9", { shadow: false });
}

function drawStatue(p: PaperPainter) {
  // a stone paper figure on a plinth — kept abstract (a monument, not
  // any person): stone tones all over, arms at the sides.
  p.rect(4.4, 16.6, 11.2, 2.6, "#CFC8B4", { r: 0.5 });
  p.rect(6.4, 14.4, 7.2, 2.2, "#D8D2C0", { shadow: false, r: 0.4 });
  p.rect(8.2, 8.6, 3.6, 5.8, "#D8D2C0", { shadow: false, r: 0.8 });
  p.rect(6.9, 8.9, 1.2, 3.9, "#D8D2C0", { shadow: false, r: 0.5 });
  p.rect(11.9, 8.9, 1.2, 3.9, "#D8D2C0", { shadow: false, r: 0.5 });
  p.circle(10, 6.4, 2.2, "#D8D2C0", { shadow: false });
  p.path("M 7.9 6.3 A 2.2 2.2 0 0 1 12.1 6.3 L 11.7 6.26 A 1.76 1.76 0 0 0 8.3 6.26 Z", "#CFC8B4", { shadow: false });
}

function drawGarden(p: PaperPainter) {
  p.rect(1.6, 12.6, 16.8, 5.6, "#8A5A2B", { r: 0.8 });
  const cols = ["#F472B6", "#FACC15", "#FB923C", "#F87171"];
  [0, 1, 2, 3, 4].forEach((i) => {
    const fx = 3.6 + i * 3.3;
    p.rect(fx - 0.35, 10.4, 0.7, 3, "#4C9A50", { shadow: false, r: 0.3 });
    p.circle(fx, 9.4, 1.8, cols[i % cols.length], { shadow: false });
    p.circle(fx, 9.4, 0.7, "#FFF7E6", { shadow: false });
  });
  p.rect(1.6, 14.6, 16.8, 0.9, "#6E4520", { shadow: false, r: 0.4 });
}

function drawLantern(p: PaperPainter, night: boolean) {
  p.rect(9.2, 8.4, 1.6, 9.8, "#5E3D22", { shadow: false, r: 0.5 });
  p.rect(6.4, 6.2, 7.2, 1.8, "#3A2A1C", { r: 0.5 });
  p.ellipse(10, 11.4, 3.3, 4.1, night ? "#FDE68A" : "#FFF3C4");
  p.line(10, 7.6, 10, 8.4, "#3A2A1C", 0.6);
  p.rect(7.4, 15, 5.2, 1.4, "#3A2A1C", { shadow: false, r: 0.5 });
  if (night) {
    p.circle(10, 11.4, 1.5, "#F59E0B", { shadow: false, opacity: 0.85 });
  }
}

export function PaperDecoration({
  kind,
  size,
  night = false,
}: {
  kind: MapDecorationKind;
  size: number;
  night?: boolean;
}) {
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <PaperCanvas
        cols={20}
        rows={ROWS}
        unit={size / 20}
        draw={(p) => {
          switch (kind) {
            case "fountain":
              drawFountain(p);
              break;
            case "statue":
              drawStatue(p);
              break;
            case "garden":
              drawGarden(p);
              break;
            case "lantern":
              drawLantern(p, night);
              break;
          }
        }}
      />
    </View>
  );
}
