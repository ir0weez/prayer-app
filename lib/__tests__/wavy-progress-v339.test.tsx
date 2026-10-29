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
    // The sweep's listener travels the phase 0 → one wavelength and
    // the finished frame settles back at phase 0.
    expect(component).toContain("phase: t * wavelength");
    expect(component).toContain("phase: 0 });");
  });

  it("thin threads still read as a wave: the wavelength scales with height", () => {
    expect(wavyWavelength(8)).toBeGreaterThanOrEqual(20);
    expect(wavyWavelength(14)).toBeGreaterThan(wavyWavelength(8));
  });
});

describe("v339 wavy progress — the motion contract", () => {
  it("the sweep is one ~600ms one-shot timing — no loop, no repeat, no timers", () => {
    expect(WAVY_SWEEP_MS).toBe(600);
    expect(component).toContain("duration: WAVY_SWEEP_MS");
    expect(component).toContain("Animated.timing");
    expect(component).not.toContain("Animated.loop");
    expect(component).not.toContain("withRepeat");
    expect(component).not.toContain("setInterval");
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

  it("the Study threads wear it (header rows + per-book thread)", () => {
    const card = read("components/bible-v205/reading-progress-card.tsx");
    expect(card).toContain("color={fillColor} trackColor={trackColor} height={8}");
    expect(card).toContain("color={palette.raspDeep} trackColor={palette.raspTint} height={8}");
  });

  it("the Books book thread wears it, in-progress share as the trailing segment", () => {
    const books = read("app/bible-chapters.tsx");
    expect(books).toContain("trailingValue={ppct / 100}");
    expect(books).toContain("trailingColor={palette.yellowBorder}");
  });

  it("the worship card's heard thread wears it", () => {
    const album = read("components/album-card.tsx");
    expect(album).toContain("color={colors.primary} trackColor={mix(colors.primary, colors.surface, 0.82)} height={8}");
  });

  it("the Up Next thread wears it, the pulse dot keeping the tip", () => {
    const tab = read("components/schedule-tab.tsx");
    expect(tab).toContain("color={leadColor} trackColor={mix(leadColor, colors.surface, 0.78)} height={8} hideTipDot");
  });

  it("the chapter reader's thread wears it (the shimmer loop retired)", () => {
    const page = read("components/bible-v205/chapter-page.tsx");
    expect(page).toContain("<WavyProgress value={progress} color={palette.rasp} trackColor={palette.raspTint} height={8} />");
    expect(page).not.toContain("progShimmer");
  });

  it("the prayer session's segments became ONE wavy bar in the same seat", () => {
    const session = read("components/prayer-session.tsx");
    expect(session).toContain("isFinished ? 1 : (currentIndex + 1) / totalCount");
    expect(session).toContain("color={pm.seed}");
    expect(session).toContain("trackColor={pm.wash2}");
    // The per-person segment colours are gone.
    expect(session).not.toContain("hexToRgba(pm.seed, 0.45)");
  });

  it("the day bar wears it in both variants, cap still riding the tip", () => {
    const bar = read("components/schedule-progress-bar.tsx");
    expect(bar).toContain('color="#F59E0B" trackColor="rgba(255,255,255,0.30)" height={14} hideTipDot');
    expect(bar).toContain("height={8}");
    expect(bar).toContain("<DayCapGlyph");
  });

  it("People's queue bar and household bars wear it (shine loop retired)", () => {
    const index = read("app/(tabs)/index.tsx");
    expect(index).toContain("color={pmf.seed} colorEnd={pmf.queueTeal} trackColor={pmf.wash} height={8}");
    expect(index).toContain("color={accent} trackColor={pmf.wash} height={8}");
    expect(index).not.toContain("queueShine");
  });

  it("Profile's past-fast bars and Budget's hero bar wear it", () => {
    const profile = read("app/profile.tsx");
    expect(profile).toContain("color={trackerFamily.seed} trackColor={trackerFamily.wash} height={8}");
    const budget = read("app/budget-tracker.tsx");
    expect(budget).toContain("color={bm.heroBarFill} trackColor={bm.heroBarTrack} height={9}");
  });

  it("Collections, the Road, and the town stock bars wear it", () => {
    expect(read("components/collections-book.tsx")).toContain('trackColor="rgba(0,0,0,0.08)" height={8}');
    expect(read("components/road-badges.tsx")).toContain('color="#C9963C" trackColor="rgba(0,0,0,0.08)" height={8}');
    const town = read("app/hometown.tsx");
    expect(town).toContain('color={isFull ? "#DC2626" : "#F59E0B"} trackColor={pt.bg} height={8}');
    expect(read("app/cafeteria-interior.tsx")).toContain('trackColor="#F3E9CF" height={9}');
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
