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
    // (v215: same pointerEvents forwarding as the Paper kit —
    // optional, unset at every pre-v215 call site.)
    expect(kit).toContain("if (!isEightBit)");
    expect(kit).toContain("return <View style={style} pointerEvents={pointerEvents}>{children}</View>");
    // (v247 re-base, ruling cited in place — mirrors the Paper kit:
    // the animated branch's style now LEADS with
    // `screenRoot ? { flex: 1 } : null`, the blank Bible's second
    // gate; non-roots get null, card layout unchanged. See
    // hidden_files/blank-bible-diagnosis.md, v247 addendum.)
    expect(kit).toContain("return <Animated.View style={[screenRoot ? { flex: 1 } : null, style, animatedStyle]} pointerEvents={pointerEvents}>{children}</Animated.View>");
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

  it("schedule progress fill advances in stepped chunks — A46 ruled in v240: the sprout's springs are GONE", () => {
    const bar = read("components/schedule-progress-bar.tsx");
    // RE-BASED in v342 (Jonathan's principle, Oct 29 14:45 — bars
    // that aren't live go regular; the summary day bar named at
    // 14:32): v339's wavy conversion of this bar is reverted; the
    // 8-bit stepped fill stands again, BIT_GOLD as before.
    expect(bar).toContain("useBitFill(percentage / 100)");
    expect(bar).toContain("BIT_GOLD");
    expect(bar).not.toContain("WavyProgress");
    // RE-BASED in v240 (Jonathan ruled A46 on 2026-10-24 and picked
    // the sun/moon cap): the original pin froze the sprout's spring
    // configs while A46 was HELD; the springs are now out under
    // every skin, and the cap wears a blocky bit sun instead.
    expect(bar).not.toContain("withSpring");
    expect(bar).toContain("dayCapFaceFor");
  });

  it("journal: masthead, rows, separators, and the composer all snap in", () => {
    const journal = read("components/prayer-journal-tab.tsx");
    // v204: the import also brings bitPressedSnap — the morphing
    // composer's FAB face depresses like bit chrome while pressed.
    expect(journal).toContain('import { BitSettle, bitPressedSnap } from "@/components/bit-motion";');
    // Separators and Moment rows carry the indexed bit entrance.
    expect(count(journal, "<BitSettle index={index}>")).toBe(2);
    // v215: one of the two bare BitSettles is the composer's inner
    // wrap, which now carries pointerEvents="box-none" (its frame
    // must not eat the feed's touches — see journal-v204.test.ts).
    expect(count(journal, "<BitSettle>")).toBe(1);
    expect(count(journal, '<BitSettle pointerEvents="box-none">')).toBe(1);
    const sheets = read("components/journal-sheets.tsx");
    expect(sheets).toContain("<BitSettle style={{ flex: 1 }}>");
  });

  it("shell: settings cards snap in a stack, sheets drop as cartridges, the FAB depresses", () => {
    const shell = read("app/(tabs)/index.tsx");
    expect(shell).toContain('import { BitSettle, bitPressedSnap } from "@/components/bit-motion";');
    // v315 re-pin: the Settings rebuild's stack is hero band (0) +
    // four group cards (1–4) + the Warning door (5) — six settles,
    // still a cascade in the bit dialect too. (Was 8: the old
    // profile card + seven section cards.)
    expect((shell.match(/<BitSettle index=\{\d+\}>/g) ?? []).length).toBe(6);
    // v216 gave the six slide-up sheets (profile editor, fast
    // creator, family actions, theme, skin, app icon) definite-
    // height boxes so they rise; v219 restored the flex:1
    // BitSettle inside each — v216 had stripped it, leaving the
    // flex:1 ScrollView in an auto-height wrapper where it
    // collapsed and the sheets rose empty. Definite box above,
    // flex:1 wrapper below, flex:1 ScrollView at the bottom of
    // the chain (pinned in sheets-rise-v216.test.ts).
    expect(count(shell, "<BitSettle style={{ flex: 1 }}>")).toBe(6);
    // M3Dialog's card and the avatar composer card snap centered
    // and keep their bare settle wrappers — they are not sheets.
    expect(count(shell, "<BitSettle>")).toBe(2);
    expect(shell).toContain('<BitSettle style={{ alignItems: "center" }}>');
    // The people FAB depresses while pressed (scale rides inside).
    expect(shell).toContain("bitPressedSnap(skinTokens, pressed, [{ scale: 0.96 }])");
    expect(shell).toContain("paperPressedLift(skinTokens, pressed, [{ scale: 0.96 }])");
  });

  it("people: the person header snaps centered; their modals drop as cartridges", () => {
    const person = read("app/(tabs)/person.tsx");
    expect(person).toContain('<BitSettle style={{ alignItems: "center" }}>');
    // v258: the praise title + note form is a seventh person modal,
    // wearing the same cartridge structure as the other six.
    expect(count(person, "<BitSettle>")).toBe(7);
    // Paper's modal cards are still the outer wrapper, unchanged.
    expect(count(person, "<PaperSettle style={[styles.modalCard, paperModalCard, !isSkinned &&")).toBe(7);
  });

  it("fasting profile: the above-fold cards snap with their cascade; its sheets drop in", () => {
    // RE-BASED (v360): the fasting page is its own route now
    // (app/fasting-tracker.tsx) — the cascade and sheets below
    // are that page's, unchanged.
    const profile = read("app/fasting-tracker.tsx");
    // v283 re-base: the above-fold cascade is gone with the cards
    // it animated — Jonathan's Oct 27 ruling took the profile
    // card, the stat grid and the previous-fast card off the
    // fasting page. The tracker section head's BitSettle remains,
    // renumbered to index 0.
    expect(profile).not.toContain("<BitSettle index={1}");
    expect(profile).not.toContain("<BitSettle index={2}>");
    expect(profile).not.toContain("<BitSettle index={3}");
    expect(profile).toContain('<BitSettle index={0} style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>');
    // v219: the profile fast sheet's BitSettle carries flex:1
    // again under its definite 92% box — the one flex:1 wrapper
    // in the file (see sheets-rise-v216.test.ts).
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
      "components/ministry-detail-card.tsx",
    ]) {
      const src = read(file);
      expect(src, file).toContain("BitSettle");
      // Paper's own entrance strings are untouched in each.
      expect(src, file).toContain('? "fade" : "slide"');
    }
    // v330 Part 1: the ministry editor is an AnchoredSheet now —
    // the slide/fade string is gone with its Modal; its BitSettle
    // chain rides inside the anchored surface, unchanged.
    const ministryForm = read("components/ministry-edit-form.tsx");
    expect(ministryForm).toContain("BitSettle");
    expect(ministryForm).toContain("<AnchoredSheet");
    expect(ministryForm).not.toContain('? "fade" : "slide"');
  });

  it("tappable bit chrome depresses in the shared game chrome", () => {
    const interior = read("components/interior-shell.tsx");
    expect(count(interior, "paperPressedLift(tokens, pressed), bitPressedSnap(tokens, pressed)")).toBe(2);
    const games = read("components/mini-game-scene.tsx");
    expect(count(games, "paperPressedLift(tokens, pressed), bitPressedSnap(tokens, pressed)")).toBe(2);
  });
});
