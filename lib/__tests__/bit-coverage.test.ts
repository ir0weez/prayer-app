// v203 — the 8-bit ANIMATION pass. Jonathan, Oct 23: "8-Bit and
// Terminal still have some missing animations." The 8-bit scene art
// already ticks in frames (v184+); this pass moves the CHROME —
// rows, sheets, modals, fills, press states — in the stepped
// dialect, through one kit (components/bit-motion.tsx) mirroring
// v202's paper kit surface for surface. Every export of the kit is
// a passthrough/no-op under any other skin, and Paper's kit is
// untouched: these pins assert both halves of that contract.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const count = (src: string, needle: string) => src.split(needle).length - 1;

describe("8-bit coverage — v203 animation pass", () => {
  it("the bit motion kit exists and speaks ONLY stepped timing, transforms/opacity only", () => {
    const kit = read("components/bit-motion.tsx");
    // The dialect is explicit in the kit: a steps easing quantizes
    // the settle and the fill; the tempo comes from the tokens.
    expect(kit).toContain("Easing.steps(BIT_SETTLE_STEPS)");
    expect(kit).toContain("Easing.steps(BIT_FILL_STEPS)");
    expect(kit).toContain("tokens.motion.settleDuration");
    expect(kit).toContain("withDelay");
    expect(kit).toContain("bitSettleDelay");
    // Transforms + opacity only — never a layout property.
    expect(kit).toContain("transform: [{ translateY: translateY.value }]");
    expect(kit).toContain("transform: [{ scaleX: scale.value }]");
    expect(kit).not.toContain("maxHeight");
    expect(kit).not.toContain("useNativeDriver: false");
    // NO springs, no bounce, no continuous curves — anywhere.
    expect(kit).not.toContain("withSpring");
    expect(kit).not.toContain("springify");
    expect(kit).not.toContain("Easing.bounce");
    expect(kit).not.toContain("Easing.sin");
    expect(kit).not.toContain("Easing.bezier");
    // Every other skin gets a plain View: byte-identical layout.
    expect(kit).toContain("if (!isEightBit)");
    expect(kit).toContain("return <View style={style}>{children}</View>");
    // The snap shrinks FROM the skin's own button shadow: the
    // kit's rest string and the bit button style's shadow are one
    // string (4px hard block in BIT_SHADOW_HEX).
    expect(kit).toContain("`4px 4px 0px ${BIT_SHADOW_HEX}`");
    const themes = read("lib/skin-themes.ts");
    expect(themes).toContain("boxShadow: `4px 4px 0px ${BIT_SHADOW_HEX}`");
    expect(kit).toContain("BIT_BUTTON_SHADOW_PRESSED");
    expect(kit).toContain("bitPressedSnap");
    // The fill hook steps value changes from the left edge.
    expect(kit).toContain("useBitFill");
  });

  it("the paper kit is untouched by the bit pass", () => {
    const kit = read("components/paper-motion.tsx");
    expect(kit).toContain("PAPER_BUTTON_SHADOW_REST");
    expect(kit).not.toContain("BitSettle");
    expect(kit).not.toContain("bitPressedSnap");
    expect(kit).not.toContain("Easing.steps");
  });

  it("schedule: every row snaps in, the masthead re-snaps per day, the summary drops as one cartridge", () => {
    const schedule = read("components/schedule-tab.tsx");
    expect(schedule).toContain('import { BitSettle, bitPressedSnap } from "./bit-motion";');
    expect(schedule).toContain("<BitSettle index={info.index} settle={info.item.id !== justAddedId}>");
    expect(schedule).toContain("<BitSettle replayKey={selectedDate}>");
    // The summary Sheet (PaperSettle) nests exactly one BitSettle.
    expect(schedule).toContain("scheduleStyles.summaryContainer,");
  });

  it("schedule: menus drop in stepped frames, forms snap as cartridges, the FAB depresses", () => {
    const schedule = read("components/schedule-tab.tsx");
    // The one menu helper now carries the 8-bit branch — the
    // skin's settle config IS the stepped one under 8-bit.
    expect(schedule).toContain("skinTokens.isPaper || skinTokens.isEightBit");
    expect(schedule).toContain("FadeInUp.duration(skinMotion.settle.duration).delay(delay).easing(skinMotion.settle.easing)");
    // All six creator/library form sheets nest the bit entrance.
    expect(count(schedule, "<BitSettle style={{ flex: 1 }}>")).toBe(6);
    // The schedule FAB depresses as an arcade switch while pressed.
    expect(schedule).toContain("bitPressedSnap(skinTokens, pressed, [{ scale: 0.95 }])");
    // The quick-add picker pops in hard steps under 8-bit.
    const picker = read("components/slide-quick-add.tsx");
    expect(picker).toContain("isEightBit ? 120 : isPaper ? 300 : 150");
    expect(picker).toContain("Easing.step1");
    expect(picker).toContain("isPaper ? skinTokens.motion.settleDuration : 180");
  });

  it("schedule progress fill advances in stepped chunks — A46 sprout springs untouched", () => {
    const bar = read("components/schedule-progress-bar.tsx");
    expect(bar).toContain("useBitFill(percentage / 100)");
    expect(bar).toContain("paperFillStyle ?? bitFillStyle");
    // Paper's soak is still wired exactly as v202 left it.
    expect(bar).toContain("usePaperFill(percentage / 100)");
    // The held A46 item: the sprout's spring configs are EXACTLY
    // as they were — this pass did not touch the celebration.
    expect(bar).toContain("withSpring(1, { damping: 12, stiffness: 110 })");
    expect(bar).toContain("withSpring(1, { damping: 7, stiffness: 200 })");
  });

  it("journal: masthead, rows, separators, and the composer all snap in", () => {
    const journal = read("components/prayer-journal-tab.tsx");
    // v204: the import also brings bitPressedSnap — the morphing
    // composer's FAB face depresses like bit chrome while pressed.
    expect(journal).toContain('import { BitSettle, bitPressedSnap } from "@/components/bit-motion";');
    // Separators and Moment rows carry the indexed bit entrance.
    expect(count(journal, "<BitSettle index={index}>")).toBe(2);
    expect(count(journal, "<BitSettle>")).toBe(2);
    const sheets = read("components/journal-sheets.tsx");
    expect(sheets).toContain("<BitSettle style={{ flex: 1 }}>");
  });

  it("shell: settings cards snap in a stack, sheets drop as cartridges, the FAB depresses", () => {
    const shell = read("app/(tabs)/index.tsx");
    expect(shell).toContain('import { BitSettle, bitPressedSnap } from "@/components/bit-motion";');
    // Profile card (0) + all seven settings section cards keep
    // their cascade indices in the bit dialect too.
    expect((shell.match(/<BitSettle index=\{\d+\}>/g) ?? []).length).toBe(8);
    // The six slide-up sheets (profile editor, fast creator,
    // theme, skin, app icon + one more themeSheet) nest flex:1.
    expect(count(shell, "<BitSettle style={{ flex: 1 }}>")).toBe(6);
    // M3Dialog's card and the avatar composer card snap centered.
    expect(count(shell, "<BitSettle>")).toBe(2);
    expect(shell).toContain('<BitSettle style={{ alignItems: "center" }}>');
    // The people FAB depresses while pressed (scale rides inside).
    expect(shell).toContain("bitPressedSnap(skinTokens, pressed, [{ scale: 0.96 }])");
    expect(shell).toContain("paperPressedLift(skinTokens, pressed, [{ scale: 0.96 }])");
  });

  it("people: the person header snaps centered; their modals drop as cartridges", () => {
    const person = read("app/(tabs)/person.tsx");
    expect(person).toContain('<BitSettle style={{ alignItems: "center" }}>');
    expect(count(person, "<BitSettle>")).toBe(6);
    // Paper's modal cards are still the outer wrapper, unchanged.
    expect(count(person, "<PaperSettle style={[styles.modalCard, paperModalCard]}>")).toBe(6);
  });

  it("fasting profile: the above-fold cards snap with their cascade; its sheets drop in", () => {
    const profile = read("app/profile.tsx");
    expect(profile).toContain("<BitSettle index={0}>");
    expect(profile).toContain('<BitSettle index={1} style={{ flexDirection: "row", gap: 10, flex: 1 }}>');
    expect(profile).toContain("<BitSettle index={2}>");
    expect(profile).toContain('<BitSettle index={3} style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>');
    expect(count(profile, "<BitSettle style={{ flex: 1 }}>")).toBe(1);
  });

  it("shared forms and menus snap as cartridges under 8-bit", () => {
    const status = read("components/status-modal.tsx");
    expect(status).toContain("<BitSettle style={{ flex: 1 }}>");
    const timeOff = read("components/time-off-modal.tsx");
    expect(timeOff).toContain("<BitSettle style={{ flex: 1 }}>");
    const menu = read("components/context-menu.tsx");
    expect(menu).toContain("<BitSettle>");
    for (const file of [
      "components/event-edit-form.tsx",
      "components/ministry-edit-form.tsx",
      "components/ministry-detail-card.tsx",
    ]) {
      const src = read(file);
      expect(src, file).toContain("BitSettle");
      // Paper's own entrance strings are untouched in each.
      expect(src, file).toContain('? "fade" : "slide"');
    }
  });

  it("tappable bit chrome depresses in the shared game chrome", () => {
    const interior = read("components/interior-shell.tsx");
    expect(count(interior, "paperPressedLift(tokens, pressed), bitPressedSnap(tokens, pressed)")).toBe(2);
    const games = read("components/mini-game-scene.tsx");
    expect(count(games, "paperPressedLift(tokens, pressed), bitPressedSnap(tokens, pressed)")).toBe(2);
  });
});
