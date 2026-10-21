// Reached-stamp skins — the REAL redesign (2026-10-21).
//
// Jonathan caught the first skin pass twice: Postmark was Classic
// with waves at 0.3 opacity, Linen was Classic plus two hair-thin
// lines at 0.2 — at the collection grid's actual size the skins were
// indistinguishable, and he said so in those words ("You gaslit me in
// believing it was completely different"). These source pins keep
// every skin's signature structurally present and unmistakable, and
// pin the old lookalike implementations GONE, so a future "redesign"
// can't quietly shrink a skin back into Classic with decoration.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const src = readSrc("components/reached-stamp-row.tsx");
const artSrc = readSrc("components/stamp-design-art.tsx");
const libSrc = readSrc("lib/reached-stamps.ts");
const passportBody = src.slice(src.indexOf("function PassportStamp"));

/** The StampArtwork body — the shared artwork every skin builds on. */
const artworkBody = src.slice(src.indexOf("function StampArtwork"), src.indexOf("function StampShapeFill"));

describe("stamp skins — every skin has an unmistakable signature", () => {
  it("linen is real cloth: chunky irregular plain-weave bundles, slubs, a stitched border, a ghost of the rings", () => {
    expect(src).toContain('skin === "linen"');
    // plain-weave bundles, clipped to the stamp's own shape
    expect(src).toContain("ClipPath");
    expect(src).toContain("LINEN_BUNDLE_WIDTHS");
    expect(src).toContain("LINEN_H_BUNDLES");
    expect(src).toContain("LINEN_V_BUNDLES");
    expect(src).toContain("buildLinenBundles");
    expect(src).toContain("LINEN_H_BUNDLES.map");
    expect(src).toContain("LINEN_V_BUNDLES.map");
    // THREAD scale: every bundle is 5–8 units wide — chunky enough to
    // read as cloth at collection size, never a fine grid pitch
    const widthsMatch = src.match(/LINEN_BUNDLE_WIDTHS = \[([^\]]+)\]/);
    expect(widthsMatch).not.toBeNull();
    const widths = (widthsMatch?.[1] ?? "").split(",").map((part) => Number(part.trim()));
    expect(widths.length).toBeGreaterThanOrEqual(12);
    for (const width of widths) {
      expect(width).toBeGreaterThanOrEqual(5);
      expect(width).toBeLessThanOrEqual(8);
    }
    // hand-loomed irregularity: at least two distinct bundle widths
    // (in practice four) and no bundle repeats its neighbour's width
    expect(new Set(widths).size).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < widths.length; i += 1) {
      expect(widths[i]).not.toBe(widths[i - 1]);
    }
    // bundle opacities vary too, and stay LOW contrast against the base
    const opacitiesMatch = src.match(/LINEN_BUNDLE_OPACITIES = \[([^\]]+)\]/);
    expect(opacitiesMatch).not.toBeNull();
    const opacities = (opacitiesMatch?.[1] ?? "").split(",").map((part) => Number(part.trim()));
    expect(new Set(opacities).size).toBeGreaterThanOrEqual(3);
    for (const opacity of opacities) {
      expect(opacity).toBeGreaterThan(0);
      expect(opacity).toBeLessThanOrEqual(0.2);
    }
    // bundles are FILLED rects with a soft 1-unit overlap (feathered
    // edges by translucency), not stroked hairlines
    expect(src).toContain("bundle.width + 1");
    // flax / cream fibre tones worked into the weave
    expect(src).toContain("LINEN_FLAX");
    expect(src).toContain("LINEN_CREAM");
    expect(src).toContain('LINEN_FLAX = "#D9C69C"');
    expect(src).toContain('LINEN_CREAM = "#EEE1C2"');
    // SLUBS: 2–4 thicker imperfect threads across the weave, each
    // wavy (Q/T curves), a different weight, visible but not shouting
    const slubStart = src.indexOf("LINEN_SLUBS = [");
    expect(slubStart).toBeGreaterThan(-1);
    const slubBlock = src.slice(slubStart, src.indexOf("] as const;", slubStart));
    const slubCount = (slubBlock.match(/\{ d: "M /g) ?? []).length;
    expect(slubCount).toBeGreaterThanOrEqual(2);
    expect(slubCount).toBeLessThanOrEqual(4);
    expect(slubBlock).toContain(" Q ");
    expect(slubBlock).toContain(" T ");
    const slubWidths = [...slubBlock.matchAll(/width: ([\d.]+)/g)].map((m) => Number(m[1]));
    expect(slubWidths.length).toBe(slubCount);
    for (const slubWidth of slubWidths) expect(slubWidth).toBeGreaterThanOrEqual(2.5);
    expect(new Set(slubWidths).size).toBeGreaterThanOrEqual(2);
    const slubOpacities = [...slubBlock.matchAll(/opacity: ([\d.]+)/g)].map((m) => Number(m[1]));
    for (const slubOpacity of slubOpacities) {
      expect(slubOpacity).toBeGreaterThanOrEqual(0.2);
      expect(slubOpacity).toBeLessThanOrEqual(0.35);
    }
    expect(src).toContain("LINEN_SLUBS.map");
    expect(src).toContain('strokeLinecap="round"');
    // stitched inner border RETAINED: short thread dashes, not classic
    expect(src).toContain('"3 2.2"');
    // soft cloth halo RETAINED
    expect(src).toContain("StampShapeHalo");
    // ink diffused on fabric: a faint offset ghost of the rings
    expect(src).toContain('transform="translate(0.6 0.5)"');
    // the OLD uniform crosshatch (v155) is GONE: no 3-unit pitch, no
    // generated uniform coordinate ladder, no 0.55 hairline strokes,
    // no wh/wv line maps — a uniform grid is graph paper, not linen
    expect(src).not.toContain("LINEN_WEAVE_STEP");
    expect(src).not.toContain("LINEN_WEAVE_COORDS");
    expect(src).not.toContain("strokeWidth={0.55}");
    expect(src).not.toContain("key={`wh${p}`}");
    expect(src).not.toContain("key={`wv${p}`}");
    // the OLD linen — two hair-thin lines at 0.2 opacity — is gone
    expect(src).not.toContain('x2="42" y2="23"');
    expect(src).not.toContain('x1="82" y1="101"');
  });

  it("postmark is a real cancellation: full-width bold waves + a large legible seal", () => {
    expect(src).toContain('skin === "postmark"');
    expect(src).toContain("POSTMARK_WAVE_PATHS");
    // at least three wave paths sweeping edge to edge (they start
    // off-canvas at x=-2 and end past the right edge)
    const waveBlock = src.slice(src.indexOf("POSTMARK_WAVE_PATHS"), src.indexOf("POSTMARK_WAVE_WIDTHS"));
    const wavePaths = waveBlock.match(/"M -2 /g) ?? [];
    expect(wavePaths.length).toBeGreaterThanOrEqual(3);
    // struck at clearly visible weight over the stamp, not whispered
    expect(src).toContain('opacity={0.55}');
    // the date seal is LARGE (r 23, overlapping the stamp's edge) and
    // its text is legible at grid size
    expect(src).toContain("r={23}");
    expect(src).toContain('fontSize="6.5"');
    // the OLD postmark — diagonal wisps at 0.3, seal at 0.42 — is gone
    expect(src).not.toContain('opacity={0.3} fill="none" stroke={ink} strokeLinecap="round"');
    expect(src).not.toContain('cx="91" cy="40"');
  });

  it("embossed is RETIRED — no renderer, no lineup entry, no relief copies left", () => {
    // Retired 2026-10-21: four relief attempts all failed Jonathan's
    // eye (stacked stamps, then coins). Coin took its unlock slot.
    expect(src).not.toContain('skin === "embossed"');
    expect(src).not.toContain('transform="translate(-1.1 -1.1)"');
    expect(src).not.toContain('transform="translate(1.1 1.1)"');
    expect(src).not.toContain('ink="#160A26"');
    expect(libSrc).not.toContain('{ id: "embossed"');
    expect(libSrc).not.toContain('"embossed" |');
    expect(libSrc).not.toContain('| "embossed"');
  });

  it("the lineup is classic, postmark, linen, sticker, coin — coin at embossed's old level 35", () => {
    expect(libSrc).toContain('{ id: "classic", name: "Classic", unlockLevel: 1 }');
    expect(libSrc).toContain('{ id: "postmark", name: "Postmark", unlockLevel: 5 }');
    expect(libSrc).toContain('{ id: "linen", name: "Linen", unlockLevel: 15 }');
    expect(libSrc).toContain('{ id: "sticker", name: "Sticker", unlockLevel: 25 }');
    expect(libSrc).toContain('{ id: "coin", name: "Coin", unlockLevel: 35 }');
  });

  it("coin is a struck gold coin: radial gold, reeded rim, relief emblem, rim legend on TextPath", () => {
    expect(src).toContain('skin === "coin"');
    expect(passportBody).toContain("CoinStampArt");
    // radial gold disc, light centre-upper falling to a dark edge
    expect(artSrc).toContain("RadialGradient");
    expect(artSrc).toContain('stopColor={COIN_GOLD_LIGHT}');
    expect(artSrc).toContain('stopColor={COIN_GOLD_MID}');
    expect(artSrc).toContain('stopColor={COIN_GOLD_EDGE}');
    expect(artSrc).toContain('COIN_GOLD_LIGHT = "#F6D67C"');
    expect(artSrc).toContain('COIN_GOLD_MID = "#D9A83E"');
    expect(artSrc).toContain('COIN_GOLD_EDGE = "#A87B1F"');
    // reeded rim: fine radial ticks in deep gold
    expect(artSrc).toContain("COIN_REEDS");
    expect(artSrc).toContain('COIN_GOLD_DEEP = "#8A6414"');
    // the face emblem struck in relief: shadow down-right, highlight
    // up-left, main strike on top — gold tones only
    expect(artSrc).toContain('transform="translate(1 1.1)"');
    expect(artSrc).toContain('transform="translate(-0.9 -0.9)"');
    expect(artSrc).toContain('COIN_GOLD_PALE = "#FBE9B7"');
    expect(artSrc).toContain('COIN_GOLD_MAIN = "#B8860B"');
    // the rim legend on circular TextPaths — name along the top,
    // REACHED · year along the bottom
    expect(artSrc).toContain("TextPath");
    expect(artSrc).toContain('href={`#${topLegendId}`}');
    expect(artSrc).toContain('href={`#${bottomLegendId}`}');
    expect(artSrc).toContain("REACHED · ${year}");
    expect(artSrc).toContain('startOffset="50%"');
  });

  it("sticker is a commemorative postage stamp — perforations and a picture, NOT a sticker with a circle on it", () => {
    expect(src).toContain('skin === "sticker"');
    expect(passportBody).toContain("PostageStampArt");
    // the old white die-cut blob behind the passport artwork is gone
    expect(src).not.toContain("White die-cut sticker border");
    expect(src).not.toContain("variation.radius + 7");
    // perforated postage body, generated scalloped outline
    expect(artSrc).toContain("postagePerforationPath(6, 6, 112, 112, 2.8, 6.2)");
    expect(artSrc).toContain('fill="#FFFFFF"');
    expect(artSrc).toContain('stroke="#D8D2C4"');
    // a framed picture panel, not the passport rings/text artwork
    expect(artSrc).toContain("StampEmblem");
    expect(artSrc).not.toContain("StampArtwork");
    // caption printed in the margin like a real stamp
    expect(artSrc).toContain("· REACHED`}");
    expect(artSrc).toContain("· PRAYERCIRCLE`}");
    // the tiny drawn cross mark in the picture's corner
    expect(artSrc).toContain('x="100.1"');
  });

  it("all eight per-person designs are drawn, and both new skins assign them per person", () => {
    for (const design of ["sunrise-cross", "ichthys", "dove", "anchor", "lighthouse", "loaves-fishes", "empty-tomb", "mustard-tree"]) {
      expect(artSrc).toContain(`case "${design}"`);
    }
    // one shared assignment, used by the postage AND the coin, so a
    // person's picture and coin face always carry the same emblem
    expect(artSrc.match(/getStampDesignId\(stamp\.personId, stamp\.personName\)/g)?.length).toBe(2);
  });

  it("classic is the clean reference — the shared artwork carries NO skin signatures", () => {
    expect(artworkBody.length).toBeGreaterThan(0);
    expect(artworkBody).not.toContain("ClipPath");
    expect(artworkBody).not.toContain("POSTMARK");
    expect(artworkBody).not.toContain("translate(");
    expect(artworkBody).not.toContain("LINEN_WEAVE");
    expect(artworkBody).not.toContain("LINEN_BUNDLE");
    expect(artworkBody).not.toContain("LINEN_SLUB");
    // classic's own marks are all that's in there: rings + specks + text
    expect(artworkBody).toContain("StampRings");
    expect(artworkBody).toContain("PRAYERCIRCLE");
  });

  it("every signature sits behind its own skin check", () => {
    // a signature rendered unconditionally would leak into Classic —
    // each must appear AFTER (inside) its skin's conditional block
    expect(src.indexOf("LINEN_H_BUNDLES.map")).toBeGreaterThan(src.indexOf('skin === "linen"'));
    expect(src.indexOf("LINEN_SLUBS.map")).toBeGreaterThan(src.indexOf('skin === "linen"'));
    expect(src.indexOf("POSTMARK_WAVE_PATHS.map")).toBeGreaterThan(src.indexOf('skin === "postmark"'));
    expect(passportBody.indexOf("CoinStampArt")).toBeGreaterThan(passportBody.indexOf('skin === "coin"'));
    expect(passportBody.indexOf("PostageStampArt")).toBeGreaterThan(passportBody.indexOf('skin === "sticker"'));
  });
});
