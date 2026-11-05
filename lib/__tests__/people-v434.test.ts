/**
 * v434 — the M3 carousel peek (Jonathan's pick, Nov 4, concepts v2
 * Concept 2). His verdict on the v256 fade-and-settle, from his own
 * screen recording: the emergency card DISSOLVED — "doesn't feel
 * very Material Design" — and fade-through, shared-axis and a plain
 * crossfade (concepts v1) were all rejected after it. What ships:
 * the Material 3 carousel. No opacity animation anywhere — every
 * page renders side by side on a track in a clipped viewport, each
 * slot 88% of the width with a 12px gap so the next page's edge
 * always peeks in, and a page change slides the whole track one
 * step on the M3 emphasized curve over 450ms. The loop is the
 * standard clone wrap: a clone of the last page before page 0 and
 * a clone of page 0 after the last page, so advancing past the end
 * slides into the clone and the track jumps — unanimated — to the
 * real page. The resting state is never a clone.
 *
 * These pins hold the track math (lib/people-carousel) and the
 * shell's new shape (components/front-door-carousel). The v256
 * gates — auto-cycle, touch pause, swipe thresholds, dots, reduced
 * motion — are pinned in people-v256 and stand unamended: every
 * helper they name survives, and the two component source strings
 * they pin ("if (count <= 1) return null" in CarouselDots, the
 * shouldAutoAdvance call) are still in the shell verbatim.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CAROUSEL_PAGE_GAP_PX,
  CAROUSEL_PEEK_FRACTION,
  CAROUSEL_SLIDE_DURATION_MS,
  carouselSlotWidth,
  carouselStepPx,
  carouselTrackOffsetPx,
  isCarouselCloneIndex,
  pageIndexForTrackIndex,
  restingTrackIndex,
  trackIndexForPageIndex,
} from "../people-carousel";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

// ─── 1. The peek's constants ────────────────────────────────────────

describe("v434 carousel peek — the drawn constants", () => {
  it("slots are 88% of the width with a 12px gap; a slide is 450ms", () => {
    expect(CAROUSEL_PEEK_FRACTION).toBe(0.88);
    expect(CAROUSEL_PAGE_GAP_PX).toBe(12);
    expect(CAROUSEL_SLIDE_DURATION_MS).toBe(450);
  });
});

// ─── 2. Slot and step math — index → translateX ─────────────────────

describe("v434 track math — slot width and step (container 400px)", () => {
  it("with several pages a slot is 88% and a step is slot + gap", () => {
    expect(carouselSlotWidth(400, 3)).toBe(352);
    expect(carouselStepPx(400, 3)).toBe(364);
    expect(carouselSlotWidth(400, 2)).toBe(352);
    expect(carouselStepPx(400, 2)).toBe(364);
  });

  it("a lone page takes the full width and its step is itself — the static card exactly as drawn", () => {
    expect(carouselSlotWidth(400, 1)).toBe(400);
    expect(carouselStepPx(400, 1)).toBe(400);
    expect(carouselSlotWidth(400, 0)).toBe(400);
  });

  it("no measured width, no slots", () => {
    expect(carouselSlotWidth(0, 3)).toBe(0);
    expect(carouselTrackOffsetPx(1, 0, 3)).toBe(0);
  });

  it("the resting offset of each track index is one step per slot", () => {
    // count 3 → slots: [clone of 2, 0, 1, 2, clone of 0]
    expect(carouselTrackOffsetPx(0, 400, 3)).toBe(0);
    expect(carouselTrackOffsetPx(1, 400, 3)).toBe(-364);
    expect(carouselTrackOffsetPx(2, 400, 3)).toBe(-728);
    expect(carouselTrackOffsetPx(3, 400, 3)).toBe(-1092);
    expect(carouselTrackOffsetPx(4, 400, 3)).toBe(-1456);
  });
});

// ─── 3. The clone wrap — slots, landings, resting states ────────────

describe("v434 track math — pages rest one slot in, clones at both ends", () => {
  it("page i rests at track index i + 1; a lone page at 0", () => {
    expect(trackIndexForPageIndex(0, 3)).toBe(1);
    expect(trackIndexForPageIndex(1, 3)).toBe(2);
    expect(trackIndexForPageIndex(2, 3)).toBe(3);
    expect(trackIndexForPageIndex(0, 1)).toBe(0);
  });

  it("every track slot names the page it shows — clones answer for their page", () => {
    const pages = [0, 1, 2, 3, 4].map((slot) => pageIndexForTrackIndex(slot, 3));
    expect(pages).toEqual([2, 0, 1, 2, 0]);
    expect(pageIndexForTrackIndex(0, 2)).toBe(1);
    expect(pageIndexForTrackIndex(3, 2)).toBe(0);
    expect(pageIndexForTrackIndex(0, 1)).toBe(0);
  });

  it("only the two end slots are clones", () => {
    expect(isCarouselCloneIndex(0, 3)).toBe(true);
    expect(isCarouselCloneIndex(4, 3)).toBe(true);
    expect(isCarouselCloneIndex(1, 3)).toBe(false);
    expect(isCarouselCloneIndex(2, 3)).toBe(false);
    expect(isCarouselCloneIndex(3, 3)).toBe(false);
    expect(isCarouselCloneIndex(0, 1)).toBe(false);
  });

  it("advancing past the last page lands on page 0's clone, then rests on the REAL page 0", () => {
    const count = 3;
    const lastRest = trackIndexForPageIndex(count - 1, count); // 3
    const landing = lastRest + 1; // the slide's target: 4
    expect(isCarouselCloneIndex(landing, count)).toBe(true);
    expect(pageIndexForTrackIndex(landing, count)).toBe(0); // it SHOWS page 0
    const rest = restingTrackIndex(landing, count);
    expect(rest).toBe(trackIndexForPageIndex(0, count)); // 1 — the real page 0
    // The jump is exactly one full loop of steps, so it is invisible:
    expect(carouselTrackOffsetPx(landing, 400, count) - carouselTrackOffsetPx(rest, 400, count)).toBe(-count * carouselStepPx(400, count));
  });

  it("swiping back from page 0 is the mirror image", () => {
    const count = 3;
    const firstRest = trackIndexForPageIndex(0, count); // 1
    const landing = firstRest - 1; // 0 — the last page's clone
    expect(isCarouselCloneIndex(landing, count)).toBe(true);
    expect(pageIndexForTrackIndex(landing, count)).toBe(count - 1);
    expect(restingTrackIndex(landing, count)).toBe(trackIndexForPageIndex(count - 1, count));
  });

  it("the resting state is never a clone and never an intermediate slot", () => {
    for (let count = 2; count <= 5; count += 1) {
      for (let slot = 0; slot <= count + 1; slot += 1) {
        const rest = restingTrackIndex(slot, count);
        expect(isCarouselCloneIndex(rest, count)).toBe(false);
        expect(rest).toBeGreaterThanOrEqual(1);
        expect(rest).toBeLessThanOrEqual(count);
        // …and it rests on the slot of the very page the landing showed:
        expect(rest).toBe(trackIndexForPageIndex(pageIndexForTrackIndex(slot, count), count));
      }
    }
  });

  it("reduced motion snaps through the same resting math — a wrap lands on the real page instantly", () => {
    // The shell's reduced-motion path settles the slide target
    // through restingTrackIndex with no animation: from the last
    // page, one step forward rests on page 0 itself, never its clone.
    const count = 4;
    const target = trackIndexForPageIndex(count - 1, count) + 1;
    expect(restingTrackIndex(target, count)).toBe(trackIndexForPageIndex(0, count));
    const backTarget = trackIndexForPageIndex(0, count) - 1;
    expect(restingTrackIndex(backTarget, count)).toBe(trackIndexForPageIndex(count - 1, count));
  });
});

// ─── 4. Source pins — the shell's new shape ─────────────────────────

describe("v434 source pins — front-door-carousel.tsx is a track, not a fade", () => {
  const shell = read("components/front-door-carousel.tsx");

  it("the v256 fade is gone — no opacity progress, no interpolation, no 22px settle", () => {
    expect(shell).not.toContain("opacity: progress");
    expect(shell).not.toContain("progress.interpolate");
    expect(shell).not.toContain("new Animated.Value(1)");
    expect(shell).not.toContain("directionRef");
  });

  it("the pages ride a row track on the offset, in a clipped viewport", () => {
    expect(shell).toContain('flexDirection: "row"');
    expect(shell).toContain("transform: [{ translateX: offset }]");
    expect(shell).toContain('overflow: "hidden"');
    expect(shell).toContain("CAROUSEL_SLIDE_DURATION_MS");
    expect(shell).toContain("Easing.bezier(...PEOPLE_ENTRANCE_EASING)");
  });

  it("every page renders — the render prop is invoked per slot, clones included", () => {
    expect(shell).toContain("children(slot.pageIndex, registerTouch)");
    expect(shell).toContain('key: "clone-last"');
    expect(shell).toContain('key: "clone-first"');
    expect(shell).toContain("children(clampedIndex, registerTouch)"); // the pre-layout render
  });

  it("slots are sized by the peek math and spaced by the gap", () => {
    expect(shell).toContain("carouselSlotWidth(containerWidth, count)");
    expect(shell).toContain("CAROUSEL_PAGE_GAP_PX");
    expect(shell).toContain("carouselTrackOffsetPx(");
    expect(shell).toContain("restingTrackIndex(");
  });

  it("the v256 machinery survives verbatim: the cycle's gate, the pause, the swipe thresholds", () => {
    expect(shell).toContain("shouldAutoAdvance({ count, focused, reducedMotion })");
    expect(shell).toContain("CAROUSEL_AUTO_ADVANCE_MS");
    expect(shell).toContain("CAROUSEL_RESUME_MS");
    expect(shell).toContain("Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4");
    expect(shell).toContain("gesture.dx <= -48");
    expect(shell).toContain("gesture.dx >= 48");
    expect(shell).toContain("if (count <= 1) return null"); // CarouselDots self-hide
  });
});
