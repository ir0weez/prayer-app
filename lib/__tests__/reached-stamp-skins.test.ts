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

/** The StampArtwork body — the shared artwork every skin builds on. */
const artworkBody = src.slice(src.indexOf("function StampArtwork"), src.indexOf("function StampShapeFill"));

describe("stamp skins — every skin has an unmistakable signature", () => {
  it("linen is real cloth: a clipped weave, a stitched border, a ghost of the rings", () => {
    expect(src).toContain('skin === "linen"');
    // woven crosshatch, clipped to the stamp's own shape
    expect(src).toContain("ClipPath");
    expect(src).toContain("LINEN_WEAVE_STEP = 3");
    expect(src).toContain("LINEN_WEAVE_COORDS");
    // the weave is DENSE: one line every 3 units across the 124-unit
    // stamp, both directions — that's what reads as fabric at size
    const coords: number[] = [];
    for (let p = 9; p <= 115; p += 3) coords.push(p);
    expect(coords.length).toBeGreaterThanOrEqual(30);
    expect(src).toContain('key={`wh${p}`}'); // horizontal threads
    expect(src).toContain('key={`wv${p}`}'); // vertical threads
    // stitched inner border: short thread dashes, not the classic dash
    expect(src).toContain('"3 2.2"');
    // ink diffused on fabric: a faint offset ghost of the rings
    expect(src).toContain('transform="translate(0.6 0.5)"');
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

  it("embossed is true relief: the whole artwork struck three times, offset", () => {
    expect(src).toContain('skin === "embossed"');
    // paper-light copy up-left, shadow copy down-right, ink on top
    expect(src).toContain('transform="translate(-1.1 -1.1)"');
    expect(src).toContain('transform="translate(1.1 1.1)"');
    expect(src).toContain('ink="#FFFFFF"');
    expect(src).toContain('ink="#160A26"');
    // relief applies to ALL shapes — the old circle-only extra ring
    // that pretended to be embossing is gone
    expect(src).not.toContain("variation.radius - 10");
  });

  it("sticker keeps its white die-cut backing", () => {
    expect(src).toContain('skin === "sticker"');
    expect(src).toContain("White die-cut sticker border");
    expect(src).toContain('fill="#FFFFFF"');
  });

  it("classic is the clean reference — the shared artwork carries NO skin signatures", () => {
    expect(artworkBody.length).toBeGreaterThan(0);
    expect(artworkBody).not.toContain("ClipPath");
    expect(artworkBody).not.toContain("POSTMARK");
    expect(artworkBody).not.toContain("translate(");
    expect(artworkBody).not.toContain("LINEN_WEAVE");
    // classic's own marks are all that's in there: rings + specks + text
    expect(artworkBody).toContain("StampRings");
    expect(artworkBody).toContain("PRAYERCIRCLE");
  });

  it("every signature sits behind its own skin check", () => {
    // a signature rendered unconditionally would leak into Classic —
    // each must appear AFTER (inside) its skin's conditional block
    expect(src.indexOf("LINEN_WEAVE_COORDS.map")).toBeGreaterThan(src.indexOf('skin === "linen"'));
    expect(src.indexOf("POSTMARK_WAVE_PATHS.map")).toBeGreaterThan(src.indexOf('skin === "postmark"'));
    expect(src.indexOf('transform="translate(-1.1 -1.1)"')).toBeGreaterThan(src.indexOf('skin === "embossed" ?'));
  });
});
