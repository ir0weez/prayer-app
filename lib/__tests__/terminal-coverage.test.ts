// v186 — Terminal's widened footprint (Jonathan, mid-build:
// "Into every part of it please"). The Pip-Boy line-art dialect is
// not just the 167 keyword scenes: anywhere the app shows artwork
// the other skins theme, Terminal renders phosphor-green line art —
// the schedule AND its summary, the sliding tray, creator forms, the
// fasting profile, the Journal, People/Family art, empty states,
// celebration art. These pins hold the surfaces converted in v186
// and the standing exemptions: the Dark Forest (pixel), the
// Hometown world, and the avatars keep their own art under every
// skin, Terminal included. (The FastBoard game board was a fourth
// exemption until v280 deleted the board layer outright.)

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("the CRT layer: one static tube behind everything", () => {
  it("ScreenContainer mounts the terminal background under Terminal only", () => {
    const container = read("components/screen-container.tsx");
    expect(container).toContain("isTerminal ? <TerminalBackground />");
    expect(container).toContain("isEightBit ? <BitBackground />");
  });

  it("the background is ONE static SVG: tube gradient, 3px scanline pattern, vignette — no animation", () => {
    const bg = read("components/terminal-background.tsx");
    expect(bg).toContain('id="termTube"');
    expect(bg).toContain('id="termScan"');
    expect(bg).toContain('id="termVignette"');
    expect(bg).toContain("#0B2A12");
    expect(bg).toContain("#041207");
    expect(bg).toContain("#020A04");
    // Static means static: no animated values, no timers, no loops.
    expect(bg).not.toContain("Animated");
    expect(bg).not.toContain("setInterval");
    expect(bg).not.toContain("requestAnimationFrame");
    // The modal variant carries scanlines + vignette only.
    expect(bg).toContain("TermScanlineOverlay");
  });

  it("the status modal wears the scanline overlay under Terminal, mirroring 8-bit's dither", () => {
    const modal = read("components/status-modal.tsx");
    expect(modal).toContain("isTerminal ? <TermScanlineOverlay />");
    expect(modal).toContain("isEightBit ? <BitDitherOverlay />");
  });
});

describe("chrome surfaces converted to the terminal dialect", () => {
  it("the tab bar is the mockup's text menu: panel bar, phosphor pill, inverted bracketed labels", () => {
    const index = read("app/(tabs)/index.tsx");
    // v259: the tab bar lives in components/app-tab-bar.tsx.
    const tabBar = read("components/app-tab-bar.tsx");
    expect(tabBar).toContain("skinTokens.isTerminal ? TERM_PANEL");
    expect(tabBar).toContain("skinTokens.isTerminal ? TERM_PHOS : skinTokens.isEightBit ? BIT_PURPLE : colors.primary");
    expect(tabBar).toContain("label.toUpperCase()");
    // The skin picker's swatch ring for Terminal is phosphor bright.
    expect(index).toContain('theme.id === "terminal" && { borderWidth: 1, borderColor: "#3DFF6E" }');
    // The tabs shell lets the CRT show through instead of painting over it.
    // v187: the same gate now also lets the 8-bit dusk show through —
    // Terminal's transparency is preserved inside the combined branch.
    expect(index).toContain('backgroundColor: (skinTokens.isEightBit || skinTokens.isTerminal) ? "transparent" : colors.background');
  });

  it("white blocks become > prompt rows with bracketed duration pills", () => {
    const blocks = read("components/time-block-indicator.tsx");
    expect(blocks).toContain("TermPromptLabel");
    expect(blocks).toContain("TERM_PANEL");
    expect(blocks).toContain("[ ${label} ]");
  });

  it("the summary zone speaks phosphor: summary card inks, progress bar + outline day cap, NOW pill", () => {
    const summary = read("components/daily-summary-card.tsx");
    expect(summary).toContain("skinTokens.isTerminal ? TERM_SOFT");
    expect(summary).toContain("skinTokens.isTerminal ? TERM_MID");
    const bar = read("components/schedule-progress-bar.tsx");
    expect(bar).toContain("isTerminal ? TERM_PHOS");
    expect(bar).toContain("isTerminal ? TERM_DIM");
    // RE-BASED in v240 (Jonathan ruled the held A46 item on
    // 2026-10-24 and picked the sun/moon cap): the sprout and its
    // spring are gone under every skin; Terminal's cap is a
    // phosphor-outline sun/moon on the panel knob.
    expect(bar).not.toContain("withSpring");
    expect(bar).toContain("TERM_PANEL");
    const now = read("components/now-indicator.tsx");
    expect(now).toContain("skinTokens.isTerminal ? TERM_PHOS");
    expect(now).toContain("Easing.steps(1)");
  });

  it("the Journal floats on the tube with phosphor header, empty state and FAB", () => {
    const journal = read("components/prayer-journal-tab.tsx");
    expect(journal).toContain("(skinTokens.isEightBit || skinTokens.isTerminal) ? \"transparent\"");
    expect(journal).toContain("skinTokens.isTerminal ? TERM_PANEL");
    expect(journal).toContain("skinTokens.isTerminal ? TERM_PHOS");
  });

  it("ministry art goes phosphor at the palette: every ministry type illustration converts at once", () => {
    const schedule = read("components/schedule-tab.tsx");
    expect(schedule).toContain("accent: TERM_MID, line: TERM_DIM, ink: TERM_PHOS");
    // The Rest card's sky is line art under Terminal, text-safe like
    // the other skins' skies.
    expect(schedule).toContain("<TerminalRestSky mood={mood} />");
  });

  it("the fasting profile's sheet stack steps to tube greens under Terminal", () => {
    const profile = read("app/profile.tsx");
    // v283 re-base: the stack this pin guarded belonged to the
    // profile card, and Jonathan's Oct 27 ruling removed that
    // card from the fasting page entirely (never-approved profile
    // dressing). The tube-green stack steps left with it — the
    // strings survive nowhere in the file, import included.
    expect(profile).not.toContain("TERM_DEEP");
    expect(profile).not.toContain("TERM_PANEL_2");
    expect(profile).not.toContain("#E6DCC2");
  });

  it("creator forms ride the shared kit: the event form's surfaces come from the skin tokens", () => {
    const form = read("components/event-edit-form.tsx");
    expect(form).toContain("isSkinned ? skinTokens.surface");
    expect(form).toContain("isSkinned ? skinTokens.background");
  });
});

describe("exemptions hold under Terminal", () => {
  it("the Dark Forest and the Hometown world carry no terminal wiring at all", () => {
    for (const file of ["components/dark-forest.tsx", "app/hometown.tsx"]) {
      const src = read(file);
      expect(src).not.toContain("TerminalBackground");
      expect(src).not.toContain("terminal-keyword-scenes");
      expect(src).not.toContain("TermSceneRoot");
    }
  });

  it("the energy flames keep their own art (shared with the exempt worlds)", () => {
    // v280: the FastBoard half of this pin retired — the board
    // file was deleted with the board layer, so there is no board
    // art left to exempt. The flames half stands.
    const flames = read("components/energy-flames.tsx");
    expect(flames).not.toContain("TERM_PHOS");
    expect(flames).not.toContain("isTerminal");
  });

  it("the interior shell follows the established contract: header chrome only, room art unswitched", () => {
    const shell = read("components/interior-shell.tsx");
    expect(shell).not.toContain("terminal-keyword-scenes");
    expect(shell).not.toContain("TerminalBackground");
  });
});
