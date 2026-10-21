// Hero scale — Rider B (Jonathan, 2026-10-21): the paper hero rendered
// HUGE next to the villagers. He stays distinct through his hair, beard,
// outfit and name — never through size. Kit geometry (components/
// paper-interior): hero viewBox 11x17 (height = 17 x unit), villager
// 10x16 (height = width x 1.6). These pins hold every hero call site to
// villager-family scale (hero height <= ~1.1x the surface's villagers):
//   map:      hero width 13.7 -> ~21.2px tall vs town villagers 20.8px
//   mood:     unit = pawnSize / PAPER_HERO_H -> height == pawnSize
//   preview:  unit = size / PAPER_HERO_H -> height == size
//   rooms:    unit parity (no x1.06 hero multiplier)
//   house:    44 wide / ~68 tall vs house villagers 40 wide / 64 tall

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("hero scale (Rider B)", () => {
  it("map pawn renders the hero at villager width, not PAWN_SIZE scale", () => {
    const src = read("components/player-pawn.tsx");
    expect(src).toContain("MAP_HERO_FIGURE_W = 13.7");
    expect(src).not.toContain("unit={PAWN_SIZE / PAPER_HERO_W}");
  });

  it("mood scenes divide by the hero HEIGHT, not the old /9", () => {
    const src = read("components/pawn-mood-scene.tsx");
    expect(src).toContain("unit={pawnSize / PAPER_HERO_H}");
    expect(src).not.toContain("unit={pawnSize / 9}");
  });

  it("previews size the hero by height so he fits his box", () => {
    const src = read("components/pawn-preview.tsx");
    expect(src).toContain("size / PAPER_HERO_H");
    expect(src).not.toContain("size / PAPER_HERO_W");
  });

  it("paper rooms dropped the x1.06 hero multiplier", () => {
    const src = read("components/paper-room.tsx");
    expect(src).not.toContain("unit * 1.06");
  });

  it("the hero in his own house renders at villager scale", () => {
    const src = read("app/pawn-house.tsx");
    expect(src).toContain("unit={44 / 11}");
    expect(src).not.toContain("unit={size / 11}");
  });
});
