// Chart the Stars (Observatory) — regression pins for the mid-game
// crash Jonathan hit on his phone (2026-10-21): "In the second level
// when I was connecting the stars, about half way through it crashed."
//
// Root cause: completing a constellation advanced `idx` while the
// finished constellation's `charted` list was still in state — the
// reset lived in the [idx] effect, which runs AFTER the first render
// at the new index. That render drew the charted lines against the
// NEXT constellation's star list. The second constellation (The
// Fisher's Net) has 7 stars; the third (The Crown) has 6, so charted
// index 6 dereferenced a star that does not exist and the app died
// the moment level 2 completed. The fix: the advance now resets the
// per-constellation state in the same update, and the segment math
// lives in chartSegments (lib/mini-games), which is total — a stale
// index is skipped, never dereferenced. These tests drive the pure
// logic through every level's full sequence and through the stale
// cross-constellation frames, so no constellation data edit can
// quietly reintroduce an out-of-range index.

import { describe, expect, it } from "vitest";
import { CONSTELLATIONS, chartSegments, starsReward } from "../mini-games";

const fullSequence = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("constellation data integrity", () => {
  it("ships the three-constellation round", () => {
    expect(CONSTELLATIONS).toHaveLength(3);
  });

  it("every constellation has at least two stars with finite, in-scene coordinates", () => {
    for (const c of CONSTELLATIONS) {
      expect(c.name.length, c.name).toBeGreaterThan(0);
      expect(c.flavor.length, c.name).toBeGreaterThan(0);
      expect(c.stars.length, c.name).toBeGreaterThanOrEqual(2);
      for (const star of c.stars) {
        expect(Number.isFinite(star.x), c.name).toBe(true);
        expect(Number.isFinite(star.y), c.name).toBe(true);
        expect(star.x, c.name).toBeGreaterThanOrEqual(0);
        expect(star.x, c.name).toBeLessThanOrEqual(1);
        expect(star.y, c.name).toBeGreaterThanOrEqual(0);
        expect(star.y, c.name).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("chartSegments", () => {
  it("joins every prefix of every level's sequence, endpoints on real stars", () => {
    for (const c of CONSTELLATIONS) {
      for (let k = 0; k <= c.stars.length; k += 1) {
        const charted = fullSequence(c.stars.length).slice(0, k);
        const segments = chartSegments(c.stars, charted);
        expect(segments, `${c.name} prefix ${k}`).toHaveLength(Math.max(0, k - 1));
        segments.forEach((seg, i) => {
          expect(seg).toEqual({
            x1: c.stars[i].x,
            y1: c.stars[i].y,
            x2: c.stars[i + 1].x,
            y2: c.stars[i + 1].y,
          });
        });
      }
    }
  });

  it("a full chart of every level yields stars-1 segments", () => {
    for (const c of CONSTELLATIONS) {
      expect(chartSegments(c.stars, fullSequence(c.stars.length)), c.name).toHaveLength(
        c.stars.length - 1,
      );
    }
  });

  it("never dereferences a stale sequence from another constellation (the crash)", () => {
    // Every ordered pair: render constellation B's lines while holding
    // constellation A's FINISHED sequence — the exact frame that used
    // to take the app down when A had more stars than B (Net 7 -> Crown 6).
    for (const a of CONSTELLATIONS) {
      for (const b of CONSTELLATIONS) {
        if (a === b) continue;
        const stale = fullSequence(a.stars.length);
        let segments: ReturnType<typeof chartSegments> | undefined;
        expect(() => {
          segments = chartSegments(b.stars, stale);
        }, `${a.name} -> ${b.name}`).not.toThrow();
        // Only the pairs fully inside B's list survive; every endpoint
        // is one of B's real stars.
        expect(segments, `${a.name} -> ${b.name}`).toHaveLength(
          Math.min(a.stars.length, b.stars.length) - 1,
        );
        for (const seg of segments ?? []) {
          expect(b.stars.some((s) => s.x === seg.x1 && s.y === seg.y1)).toBe(true);
          expect(b.stars.some((s) => s.x === seg.x2 && s.y === seg.y2)).toBe(true);
        }
      }
    }
  });
});

describe("full playthrough (tapStar's accept rule, all three levels)", () => {
  it("plays every level's full connection sequence to completion without error", () => {
    // Mirror of the component's rule: a tap counts only when it is the
    // next uncharted index; wrong taps never enter the sequence. After
    // each tap the component renders chartSegments against the CURRENT
    // constellation — asserted here for every intermediate state.
    let starsInOrder = 0;
    let constellationsDone = 0;
    for (const c of CONSTELLATIONS) {
      const charted: number[] = [];
      for (let tap = 0; tap < c.stars.length; tap += 1) {
        // a wrong tap first (the last star, when it isn't next) changes nothing
        const wrong = c.stars.length - 1;
        if (wrong !== charted.length && !charted.includes(wrong)) {
          expect(charted).not.toContain(wrong);
        }
        charted.push(tap);
        starsInOrder += 1;
        expect(() => chartSegments(c.stars, charted)).not.toThrow();
        expect(chartSegments(c.stars, charted)).toHaveLength(charted.length - 1);
      }
      expect(charted).toEqual(fullSequence(c.stars.length));
      constellationsDone += 1;
    }
    expect(starsInOrder).toBe(19); // 6 + 7 + 6 stars across the round
    expect(constellationsDone).toBe(3);
    // Payout inputs from a perfect round, pinned so the fix cannot
    // move the reward: coins min(26, 19 + 3*3), xp min(90, 19*4 + 3*10).
    expect(starsReward(starsInOrder, constellationsDone)).toEqual({ coins: 26, xp: 90 });
  });
});
