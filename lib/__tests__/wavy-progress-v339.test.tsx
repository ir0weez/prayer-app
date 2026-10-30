// ─────────────────────────────────────────────────────────────────────────────
// v339 — THE WAVY PROGRESS BAR, EVERYWHERE (his Oct 29 ruling, off
// his Pixel's system-update screen: Google's wavy progress
// indicator — "This is the progress bar look I was hoping for
// everywhere" + "It's wavy animated too as it fills up").
//
// The look: the FILLED portion is a sine wave, the unfilled portion
// a plain straight track, a round dot at the tip of the fill. Every
// PrayerCircle progress bar wears it in the colour it already wore
// (derived, never a new pinned colour). Motion: when a bar's value
// changes, the fill sweeps ~600ms with the wave rippling as it
// moves, then rests STATIC — no perpetual looping anywhere.
//
// These pins: the shared component's geometry (fill fraction →
// wave path / tip position), the motion contract (one-shot sweep,
// no loop, nothing idling at rest), and per-surface adoption for
// the headline seats.
//
// v342 SUPERSESSION (Oct 29, his rulings the same afternoon):
//  · Part D — "Either animate it, or change it to a regular bar":
//    the wave now TRAVELS continuously (transform-only, native
//    driver, one wavelength per WAVY_TRAVEL_MS). The no-loop pin
//    below is REVERSED with a dated note; the sweep stays one-shot.
//  · Part C — the prayer session's per-person SEGMENTS are
//    restored (they are the person counter, not a progress bar);
//    the session's wavy conversion is reversed below.
//  · Amendments — two bars are EXEMPT as not-live and return to
//    regular straight bars: the Personal Study card's thread
//    (14:15) and the Daily Summary's day-progress bar (14:32).
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it, vi } from "vitest";

// The component module imports react-native and react-native-svg
// at module level; neither executes under this harness (the v326
// precedent). The pins below exercise the pure geometry and the
// sources — the component body is never invoked — so both modules
// are stubbed with inert stand-ins.
vi.mock("react-native", () => ({
  AccessibilityInfo: { isReduceMotionEnabled: async () => false },
  Animated: {
    Value: class {
      addListener() {
        return "0";
      }
      removeListener() {}
      setValue() {}
    },
    timing: () => ({ start: (cb?: any) => cb?.({ finished: true }) }),
    View: () => null,
  },
  Easing: { out: (f: any) => f, cubic: (t: number) => t },
  View: () => null,
}));

vi.mock("react-native-svg", () => {
  const Stub = () => null;
  return {
    __esModule: true,
    default: Stub,
    Circle: Stub,
    ClipPath: Stub,
    Defs: Stub,
    G: Stub,
    LinearGradient: Stub,
    Path: Stub,
    Rect: Stub,
    Stop: Stub,
  };
});
import {
  WAVY_SWEEP_MS,
  WAVY_TRAVEL_MS,
  wavyProgressGeometry,
  wavyWavelength,
} from "@/components/wavy-progress";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const component = read("components/wavy-progress.tsx");

/** The y values sampled into a geometry path, in order. */
function pathYs(path: string): number[] {
  return path
    .split(" L ")
    .map((seg) => Number(seg.replace(/^M /, "").split(" ")[1]));
}

describe("v339 wavy progress — geometry", () => {
  it("the fill width is the value's fraction of the measured bar; the tip rides its end", () => {
    const g = wavyProgressGeometry({ width: 200, height: 8, value: 0.25, phase: 0 });
    expect(g.fillWidth).toBe(50);
    expect(g.tipCx).toBe(50);
    expect(g.trailingWidth).toBe(0);
  });

  it("values clamp to the bar: below 0 reads empty, above 1 reads full", () => {
    expect(wavyProgressGeometry({ width: 200, height: 8, value: -0.5, phase: 0 }).fillWidth).toBe(0);
    expect(wavyProgressGeometry({ width: 200, height: 8, value: 1.4, phase: 0 }).fillWidth).toBe(200);
  });

  it("a trailing segment rides directly behind the fill and moves the tip", () => {
    const g = wavyProgressGeometry({ width: 200, height: 8, value: 0.25, trailingValue: 0.5, phase: 0 });
    expect(g.fillWidth).toBe(50);
    expect(g.trailingWidth).toBe(100);
    expect(g.tipCx).toBe(150);
    // The trailing share can never push past the bar's right edge.
    const over = wavyProgressGeometry({ width: 200, height: 8, value: 0.8, trailingValue: 0.5, phase: 0 });
    expect(over.tipCx).toBeLessThanOrEqual(200);
  });

  it("the render clamps the tip dot inside the bar's right edge", () => {
    expect(component).toContain("cx={Math.min(geo.tipCx, barWidth - geo.dotR)}");
  });

  it("the wave path is a sine: it swings to both extremes around the centreline", () => {
    const g = wavyProgressGeometry({ width: 280, height: 8, value: 1, phase: 0 });
    const ys = pathYs(g.path);
    const cy = g.canvasHeight / 2;
    const strokeWidth = Math.max(2, g.canvasHeight * 0.55);
    const amplitude = g.canvasHeight / 2 - strokeWidth / 2;
    expect(Math.min(...ys)).toBeCloseTo(cy - amplitude, 1);
    expect(Math.max(...ys)).toBeCloseTo(cy + amplitude, 1);
    expect(g.path.startsWith("M ")).toBe(true);
    expect(g.path).toContain(" L ");
  });

  it("the wave is periodic in phase: one full wavelength of travel is the rest frame", () => {
    const lambda = wavyWavelength(8);
    const rest = wavyProgressGeometry({ width: 280, height: 8, value: 0.6, phase: 0 });
    const travelled = wavyProgressGeometry({ width: 280, height: 8, value: 0.6, phase: lambda });
    expect(rest.wavelength).toBe(lambda);
    expect(travelled.path).toBe(rest.path);
    // RE-BASED (v342, Part D): the phase no longer rides the sweep
    // listener — the wave is rendered once at phase 0 into a layer
    // one wavelength wider than the bar, and the TRAVEL is a
    // transform sliding that layer 0 → −1 wavelength (seamless by
    // the periodicity proven above). The rendered geometry is
    // always the phase-0 frame.
    expect(component).toContain("phase: 0 })");
    expect(component).toContain("outputRange: [0, -wavelength]");
  });

  it("thin threads still read as a wave: the wavelength scales with height", () => {
    expect(wavyWavelength(8)).toBeGreaterThanOrEqual(20);
    expect(wavyWavelength(14)).toBeGreaterThan(wavyWavelength(8));
  });
});

describe("v339 wavy progress — the motion contract", () => {
  it("the sweep is one ~600ms one-shot timing; the travel is a native loop — no JS timers", () => {
    expect(WAVY_SWEEP_MS).toBe(600);
    expect(WAVY_TRAVEL_MS).toBe(1200);
    expect(component).toContain("duration: WAVY_SWEEP_MS");
    expect(component).toContain("Animated.timing");
    // RE-BASED (v342, Part D — his ruling: "Either animate it, or
    // change it to a regular bar" → animate it): Animated.loop is
    // now PRESENT BY RULING — it drives the wave's continuous
    // travel as a native-driver transform (translateX 0 → −1
    // wavelength, linear). What still never exists: JS timers or
    // intervals, path-d redraw loops, and any repeat on the SWEEP
    // (a value change still sweeps exactly once).
    expect(component).toContain("Animated.loop");
    expect(component).toContain("duration: WAVY_TRAVEL_MS");
    expect(component).toContain("easing: Easing.linear");
    expect(component).toContain("useNativeDriver: true");
    expect(component).not.toContain("setInterval");
    expect(component).not.toContain("setTimeout");
  });

  it("the travel stills under reduce-motion", () => {
    expect(component).toContain("if (!measured || reduceMotion)");
  });

  it("mounting never sweeps: the frame starts at the prop values", () => {
    expect(component).toContain("a mount never sweeps");
    expect(component).toContain("v: target,");
    expect(component).toContain("t: trailingTarget,");
  });

  it("at rest nothing starts, and the listener comes off when the sweep lands", () => {
    expect(component).toContain("at rest: start nothing");
    expect(component).toContain("anim.removeListener(listener)");
  });
});

describe("v339 wavy progress — adoption pins (headline seats)", () => {
  it("the fasting streak card wears it (its seed → teal gradient survives)", () => {
    const card = read("components/people-streak-card.tsx");
    expect(card).toContain("color={family.seed} colorEnd={family.queueTeal} trackColor={family.wash} height={8}");
  });

  it("the Study HEADER threads wear it; the per-book thread is straight again (v342)", () => {
    const card = read("components/bible-v205/reading-progress-card.tsx");
    expect(card).toContain("color={fillColor} trackColor={trackColor} height={8}");
    // RE-BASED in v342 (his ruling, Oct 29 14:46 — "all the lines
    // below the top ones can be straight"): BookReadingThread is
    // its pre-v341 straight form; only the header's two rows —
    // "the top ones" — keep the wave.
    expect(card).toContain("backgroundColor: palette.raspDeep, width: `${barPct}%`");
    expect(card).not.toContain("color={palette.raspDeep} trackColor={palette.raspTint} height={8}");
  });

  it("the Books book thread is straight again, in-progress share behind it (v342)", () => {
    // RE-BASED in v342 (his 14:46 ruling): the per-book written
    // thread returns to its pre-v341 straight form — rasp fill at
    // the written share, the in-progress share as an absolute
    // yellow segment directly behind it (the job the wavy's
    // trailing segment did for one build).
    const books = read("app/bible-chapters.tsx");
    expect(books).toContain("backgroundColor: palette.rasp, width: `${pct}%`");
    expect(books).toContain("backgroundColor: palette.yellowBorder, width: `${ppct}%`");
    expect(books).not.toContain("trailingValue={ppct / 100}");
  });

  it("the worship card's heard thread wears it", () => {
    const album = read("components/album-card.tsx");
    expect(album).toContain("color={colors.primary} trackColor={mix(colors.primary, colors.surface, 0.82)} height={8}");
  });

  it("the Up Next thread wears it, the pulse dot keeping the tip", () => {
    const tab = read("components/schedule-tab.tsx");
    expect(tab).toContain("color={leadColor} trackColor={mix(leadColor, colors.surface, 0.78)} height={8} hideTipDot");
  });

  it("the chapter reader's thread is straight again, shimmer restored (v342)", () => {
    // RE-BASED in v342 (his ruling, Oct 29 14:47 — the wavy line
    // on the reader "is obviously glitched out... you can keep
    // that line straight"): the ChapterProgressThread leaves the
    // wavy set entirely and returns to its pre-v341 form — a
    // straight 4px fill with the v304 shimmer sweep.
    const page = read("components/bible-v205/chapter-page.tsx");
    expect(page).toContain("progThreadFill");
    expect(page).toContain("progShimmer");
    expect(page).not.toContain("<WavyProgress value={progress}");
  });

  it("the prayer session's PERSON progress is SEGMENTS again (v342 Part C reverses the v341 conversion)", () => {
    // RE-BASED (v342 — his correction, Oct 29 14:06): the segments
    // are the PERSON COUNTER — one per person, done/remaining at a
    // glance — not a progress bar, so the wavy conversion is
    // reversed for this element only. The session's time-bonus
    // thread (a time bar) stays wavy.
    const session = read("components/prayer-session.tsx");
    expect(session).toContain("sessionPeople.map((person, idx)");
    expect(session).toContain("hexToRgba(pm.seed, 0.45)");
    expect(session).not.toContain("isFinished ? 1 : (currentIndex + 1) / totalCount");
    // The v341 gap between the progress and the person card stays.
    expect(session).toContain("PROGRESS_TO_CARD_GAP_DP");
    // The time-bonus bar stays a wavy bar.
    expect(session).toContain("getTimeBonusProgress(elapsedSeconds)");
  });

  it("the day bar is REGULAR again in both variants (v342 amendment — the summary bar doesn't wave)", () => {
    // RE-BASED (v342 — his ruling, Oct 29 14:32): the Daily
    // Summary's day-progress bar (sun face + "N of M · %" count)
    // is exempt like the Personal Study thread — it reports a
    // stored count, it isn't live. Both variants of
    // ScheduleProgressBar return to their pre-v341 straight form
    // (Paper soak / 8-bit stepped fills restored); the day cap
    // still rides the tip.
    const bar = read("components/schedule-progress-bar.tsx");
    expect(bar).not.toContain("WavyProgress");
    expect(bar).toContain('width: `${percentage}%`, backgroundColor: "#F59E0B"');
    expect(bar).toContain("usePaperFill(percentage / 100)");
    expect(bar).toContain("useBitFill(percentage / 100)");
    expect(bar).toContain("<DayCapGlyph");
    expect(bar).toContain("{completed} of {total} · {Math.round(percentage)}%");
  });

  it("the Personal Study card thread is REGULAR (v342 amendment — it isn't live)", () => {
    // RE-BASED (v342 — his ruling, Oct 29 14:15): "Personal study
    // bar should be regular, seeing as it's not live." The Daily
    // Summary study card's thread returns to its pre-v341 straight
    // bar — same seat, same colours, no wave, no travel.
    const tab = read("components/schedule-tab.tsx");
    expect(tab).toContain("width: `${Math.round(item.data.progress * 100)}%`");
    expect(tab).toContain("the Personal");
    expect(tab).toContain("Study thread is REGULAR");
  });

  it("People's queue bar and household bars wear it (shine loop retired)", () => {
    const index = read("app/(tabs)/index.tsx");
    expect(index).toContain("color={pmf.seed} colorEnd={pmf.queueTeal} trackColor={pmf.wash} height={8}");
    expect(index).toContain("color={accent} trackColor={pmf.wash} height={8}");
    expect(index).not.toContain("queueShine");
  });

  it("Profile's past-fast bars and Budget's hero bar are REGULAR (v342 exemptions)", () => {
    // RE-BASED in v342 (his principle, Oct 29 14:45 — bars that
    // aren't live go regular): the fast-history bar (a finished
    // fast's record) and the Budget hero bar (a month's money
    // record) return to their pre-v341 straight forms.
    const profile = read("app/profile.tsx");
    expect(profile).toContain("historyProgressTrack");
    expect(profile).toContain("historyProgressFill");
    expect(profile).not.toContain("WavyProgress");
    const budget = read("app/budget-tracker.tsx");
    expect(budget).toContain("width: `${Math.round(paidShare * 100)}%`");
    expect(budget).not.toContain("WavyProgress");
  });

  it("Collections, the Road, and the town stock bars wear it", () => {
    expect(read("components/collections-book.tsx")).toContain('trackColor="rgba(0,0,0,0.08)" height={8}');
    expect(read("components/road-badges.tsx")).toContain('color="#C9963C" trackColor="rgba(0,0,0,0.08)" height={8}');
    const town = read("app/hometown.tsx");
    expect(town).toContain('color={isFull ? "#DC2626" : "#F59E0B"} trackColor={pt.bg} height={8}');
    // RE-BASED (v343): the cafeteria room file was renamed with
    // its route — app/school-cafeteria-interior.tsx.
    expect(read("app/school-cafeteria-interior.tsx")).toContain('trackColor="#F3E9CF" height={9}');
  });
});

describe("v339 wavy progress — adoption pins (the long tail)", () => {
  it("the schedule cards' live-position threads wear it (all seven seats)", () => {
    const tab = read("components/schedule-tab.tsx");
    const seats = tab.split("value={liveCursor?.progress ?? 0}").length - 1;
    expect(seats).toBe(7);
    // No straight width-% live fill survives in the tab.
    expect(tab).not.toContain("liveCursor?.progress ?? 0) * 100");
  });

  it("the devotional pill's line and the full player's seek fill wear it", () => {
    const pill = read("components/devotional-pill.tsx");
    expect(pill).toContain("value={progress} color={palette.rasp} trackColor={palette.band} height={8}");
    expect(pill).not.toContain("progressFill");
    const listen = read("components/devotional-listen.tsx");
    expect(listen).toContain("value={duration > 0 ? position / duration : 0} color={palette.rasp}");
  });

  it("the old looping wavy prototype on the People page is gone", () => {
    const index = read("app/(tabs)/index.tsx");
    expect(index).not.toContain("function AnimatedWavyProgressBar");
  });
});
