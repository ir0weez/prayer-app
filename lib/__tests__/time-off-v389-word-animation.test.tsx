// ─────────────────────────────────────────────────────────────────────────────
// v389 — the flight board's destination word LEARNS TO MOVE
// (his pick, Oct 31, from the live mockups
// time-off-word-animation-v1…v4 — the blend, then the
// underline cursor, then the steady level: "I LOVE it!
// Let's do it!").
//
// The treatment, exactly as approved:
// - the NOW BOARDING hero's word TYPES — letter by letter
//   (~75ms), a ~1600ms rest, a fast erase (~35ms a letter),
//   a brief gap, the next word — under an UNDERLINE cursor
//   that sits under the next letter slot at a FIXED level,
//   blinking, sliding sideways only. NO LAYOUT SHIFT, EVER
//   (his explicit condition): every letter of the current
//   word renders in its own slot from the first frame and
//   is revealed/hidden by opacity only, so the word line's
//   height and the card's size never change.
// - the panel rows' words CASCADE — the old word fades out,
//   the new word's letters settle in staggered (~45ms
//   apart, a slight rise + fade, ease-out, no bounce), on
//   the rows' existing cadence and phase offsets.
// - the ordinary whites' "add an ___" words keep the plain
//   whole-word swap (standing rule) — CyclingWord's default
//   variant is that swap, untouched.
//
// The render pins below mount the components under
// react-native-web (the v241 harness) and hold the mount
// frame: the hero's reserved shape and cursor, the rows'
// whole standing word. The phase machines are pinned at
// source, the suite's dominant style for timed motion.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => {
  const rnw = await import("react-native-web");
  return {
    ...rnw,
    Platform: { OS: "android", select: (o: any) => o.android ?? o.default },
  };
});

import {
  CyclingWord,
  WORD_CYCLE_MS,
  TYPEWRITER_TYPE_MS,
  TYPEWRITER_REST_MS,
  TYPEWRITER_ERASE_MS,
  TYPEWRITER_GAP_MS,
  CURSOR_BLINK_MS,
  CASCADE_FADE_MS,
  CASCADE_STAGGER_MS,
  CASCADE_LETTER_MS,
} from "../../components/cycling-word";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const cyclingWord = read("components/cycling-word.tsx");
const timeOffTravel = read("components/time-off-travel.tsx");
const timeBlockIndicator = read("components/time-block-indicator.tsx");

const heroStyle = {
  fontSize: 28,
  lineHeight: 32,
  fontWeight: "800" as const,
  letterSpacing: 2,
  color: "#FFFFFF",
  textTransform: "uppercase" as const,
};
const stripTags = (html: string) => html.replace(/<[^>]*>/g, "");
const textDivs = (html: string) => html.match(/dir="auto"/g)?.length ?? 0;

describe("v389 hero — the typewriter", () => {
  it("the timings are the mockup's own", () => {
    expect(TYPEWRITER_TYPE_MS).toBe(75);
    expect(TYPEWRITER_REST_MS).toBe(1600);
    expect(TYPEWRITER_ERASE_MS).toBe(35);
    expect(TYPEWRITER_GAP_MS).toBe(260);
    expect(CURSOR_BLINK_MS).toBe(530);
  });

  it("mount frame: EVERY letter of the word already has its slot, unrevealed — the shape is reserved", () => {
    const html = renderToString(<CyclingWord words={["Travel", "Stay"]} startIndex={0} style={heroStyle} variant="typewriter" />);
    // The word + the trailing cursor seat, and nothing else.
    expect(stripTags(html)).toBe("Travel ");
    // Six letter slots + the trailing slot — each its own
    // element; the word is never one text run.
    expect(textDivs(html)).toBe(7);
    expect(html).not.toContain(">Travel<");
    // Nothing revealed yet: every slot rides opacity 0 — the
    // reveal is opacity only, so the line's height and the
    // card's size cannot change as letters come and go.
    expect(html.match(/opacity:0/g)?.length).toBe(7);
  });

  it("mount frame: the underline cursor is already on screen, at its fixed level", () => {
    const html = renderToString(<CyclingWord words={["Travel", "Stay"]} startIndex={0} style={heroStyle} variant="typewriter" />);
    // Absolutely positioned, seated at the first slot (left 0
    // until the slot layouts land), level fixed at bottom 1,
    // in the word's own colour.
    expect(html).toContain("position:absolute");
    expect(html).toContain("left:0px");
    expect(html).toContain("bottom:1px");
  });

  it("the machine phases type → rest → erase → gap, letters by opacity only, cursor level fixed by construction", () => {
    // The phase chain runs on the exported timings.
    expect(cyclingWord).toContain("TYPEWRITER_TYPE_MS");
    expect(cyclingWord).toContain("TYPEWRITER_REST_MS");
    expect(cyclingWord).toContain("TYPEWRITER_ERASE_MS");
    expect(cyclingWord).toContain("TYPEWRITER_GAP_MS");
    // Reveal/hide is an opacity flip on a standing slot.
    expect(cyclingWord).toContain("opacity: i < shown ? 1 : 0");
    // The cursor's left comes from the NEXT slot's measured
    // layout; its level (bottom) is a constant — it can only
    // ever slide sideways.
    expect(cyclingWord).toContain("layoutRef.current[Math.min(shown, letters.length)]");
    expect(cyclingWord).toContain("left: cursorSlot?.x ?? 0");
    expect(cyclingWord).toContain("bottom: 1");
    // Blink on its own interval; every timer cleans up.
    expect(cyclingWord).toContain("CURSOR_BLINK_MS");
    expect(cyclingWord).toContain("return () => clearTimeout(timer);");
    expect(cyclingWord).toContain("return () => clearInterval(blink);");
    // No springs, no bounce — plain timings only.
    expect(cyclingWord).not.toContain("Animated.spring");
    expect(cyclingWord).not.toContain("Easing.bounce");
  });

  it("the hero seat rides the typewriter — both the solo hero and the split-out hero (one renderHero)", () => {
    expect(timeOffTravel).toContain('<FlightDestination startIndex={startIndex} color="#FFFFFF" fontSize={28} variant="typewriter" />');
    expect(timeOffTravel).toContain('variant: "typewriter" | "cascade"');
    expect(timeOffTravel).toContain("variant={variant}");
  });
});

describe("v389 rows — the cascade", () => {
  it("the timings are the mockup's own", () => {
    expect(CASCADE_FADE_MS).toBe(180);
    expect(CASCADE_STAGGER_MS).toBe(45);
    expect(CASCADE_LETTER_MS).toBe(180);
  });

  it("mount frame: the row's word stands whole, letter slots at rest — the cascade belongs to the change", () => {
    const html = renderToString(
      <CyclingWord words={["Travel", "Stay"]} startIndex={1} style={{ ...heroStyle, fontSize: 11.5, lineHeight: 15.5 }} variant="cascade" />,
    );
    expect(stripTags(html)).toBe("Stay");
    expect(textDivs(html)).toBe(4);
    // Every letter at full opacity, no rise offset.
    expect(html.match(/opacity:1/g)?.length).toBeGreaterThanOrEqual(4);
    expect(html).not.toContain("opacity:0");
  });

  it("on the shared cadence: the old word fades, the new word's letters settle in staggered", () => {
    expect(WORD_CYCLE_MS).toBe(2800);
    // Fade-out whole, on the whites' own cycle interval.
    expect(cyclingWord).toContain("duration: CASCADE_FADE_MS, easing: Easing.in(Easing.quad), useNativeDriver: true");
    // Staggered letter settle, ease-out, native driver.
    expect(cyclingWord).toContain("Animated.stagger(");
    expect(cyclingWord).toContain("CASCADE_STAGGER_MS");
    expect(cyclingWord).toContain("duration: CASCADE_LETTER_MS, easing: Easing.out(Easing.quad), useNativeDriver: true");
    // A rise into place, interpolated from the letter's own
    // value — never a height change.
    expect(cyclingWord).toContain("outputRange: [rise, 0]");
    // Cleanup stops the interval and any running animation.
    expect(cyclingWord).toContain("clearInterval(wordTimer);");
    expect(cyclingWord).toContain("current?.stop();");
  });

  it("the row seat rides the cascade, phases kept by the seat's own startIndex", () => {
    expect(timeOffTravel).toContain('<FlightDestination startIndex={index} color={palette.print} fontSize={11.5} variant="cascade" />');
  });
});

describe("v389 scope — the whites keep the plain whole-word swap", () => {
  it("CyclingWord's default variant IS the swap, and the swap's motion is verbatim", () => {
    expect(cyclingWord).toContain('variant = "swap"');
    expect(cyclingWord).toContain("return <SwapWord words={words} startIndex={startIndex} style={style} />;");
    expect(cyclingWord).toContain("duration: 200, easing: Easing.inOut(Easing.quad), useNativeDriver: true");
    expect(cyclingWord).toContain("duration: 240, easing: Easing.inOut(Easing.quad), useNativeDriver: true");
    // The swap still renders the word as ONE whole text.
    const html = renderToString(<CyclingWord words={["event", "todo"]} startIndex={0} style={heroStyle} />);
    expect(stripTags(html)).toBe("event");
    expect(textDivs(html)).toBe(1);
  });

  it("the white blocks pass no variant — their rotator behaviour is byte-for-byte what it was", () => {
    expect(timeBlockIndicator).toContain("<CyclingWord words={ADD_WORDS}");
    expect(timeBlockIndicator).not.toContain("variant");
    expect(timeBlockIndicator).not.toContain("ITINERARY_KIND_WORDS");
  });
});
