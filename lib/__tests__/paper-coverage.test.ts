// v179 "Paper Everywhere" — coverage pins. Jonathan's verdict on
// v176 (2026-10-22): whole areas still had NO paper theme — the
// Journal's glossy slabs, the schedule header/day/study cards, the
// list sheet, the Fast Check-In square's gray frame, plus every
// secondary screen and creator form. These source pins assert each
// named surface consumes the skin (useSkin / skinTokens) so a future
// refactor can't silently un-paper a screen again.
//
// Exempt by his rulings, also pinned: the Hometown world files and
// the Dark Forest consume no skin in the schedule sense (the forest
// stays pixel; hometown is out of the paper pass entirely).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("v179 paper coverage — every named surface consumes the skin", () => {
  it("the Journal renders on paper: paper page, paper entry cards, paper sheets", () => {
    // v194 (Journal, Zeitgeist): the Journal is a component family
    // now — the tab shell plus the post renderer; the paper contract
    // is checked across both.
    const journal = [read("components/prayer-journal-tab.tsx"), read("components/journal-post.tsx")].join("\n");
    expect(journal).toContain("useSkin");
    // Entry rows take the paper surface when they carry no color.
    // (v194: the post prop is named `entry` now, was `item`.)
    // v195 (Journal, Actually Zeitgeist): the entry color no longer
    // paints the row at all — v194's full-bleed fill read on his
    // phone as a giant colored block, nothing like the mockup's
    // flat rows. The color survives only as the post's thin left
    // accent rule (colorRule); the row's surface is the surface.
    expect(journal).toContain("styles.colorRule");
    expect(journal).not.toContain("entry.color ?? paperSurface");
    // Sheets sit on the paper page background.
    expect(journal).toContain("skinTokens.background");
    // v196: the v195 forced white Moments surface under Classic is
    // reversed (his ruling: the mockup's layout, his app's surface)
    // — the mockup's light literals are gone from the journal
    // family and the skin's own tokens rule again.
    expect(journal).not.toContain('"#9A92B5"');
    expect(journal).not.toContain('"#ECE9F4"');
    expect(journal).not.toContain("classicLight");
    // v196: the composer rides the real keyboard height — the old
    // KeyboardAvoidingView avoided on iOS only, and on Android the
    // keyboard covered the composer whole ("I can't see what I'm
    // typing…"). The screen pads by the keyboard's height instead.
    expect(journal).toContain("useKeyboardHeight");
    expect(journal).toContain("paddingBottom: keyboardHeight");
    expect(journal).not.toContain('behavior={Platform.OS === "ios" ? "padding" : undefined}');
  });

  it("the schedule chrome is paper: summary zone, header pill, day card, study card, list sheet", () => {
    const schedule = read("components/schedule-tab.tsx");
    // Summary zone paints the paper page, not the palette background.
    expect(schedule).toContain("summaryContainer");
    expect(schedule).toContain("skinTokens.background ?? colors.background");
    // The sliding tray's rows and footer ride on the paper surface.
    expect(schedule).toContain("skinTokens.surface ?? colors.surface");
    // Creator sheets (event/todo/ministry add + edit) are paper sheets.
    expect(schedule).toContain("skinTokens.sheetShadow");
  });

  it("the Fast Check-In square and ministry cards use OPAQUE tinted paper stock (no gray frame)", () => {
    const schedule = read("components/schedule-tab.tsx");
    // paperStockFor is an opaque HSL tint of the accent (v182 — the
    // v179 RGB mix into the cream surface still washed out to gray on
    // his phone), never the translucent wash whose shadow read as a
    // frame.
    expect(schedule).toContain("function paperStockFor");
    expect(schedule).toContain("paperStockFor(accent, skinTokens.surface)");
    expect(schedule).toContain("paperStockFor(ministry.color");
    expect(schedule).not.toContain('accent + "30"');
  });

  it("completed schedule bars are tinted stock under Paper, not the gray-beige wash (v182)", () => {
    const schedule = read("components/schedule-tab.tsx");
    // Both completed bars (event + ministry) branch to the tinted
    // stock treatment; the translucent wash remains only as the
    // Classic branch.
    expect(schedule).toContain("paperCompletedTint(completedColor, skinTokens.surface)");
    expect(schedule).toContain("paperStockEdge(completedColor)");
  });

  it("creator forms and shared dialogs consume the skin", () => {
    for (const file of [
      "components/event-edit-form.tsx",
      "components/event-detail-card.tsx",
      "components/context-menu.tsx",
      "components/date-time-picker.tsx",
      "components/slide-quick-add.tsx",
      "components/album-card.tsx",
      "components/bible-chapter-viewer.tsx",
    ]) {
      expect(read(file), file).toContain("useSkin");
    }
  });

  it("the calendar views consume the skin", () => {
    expect(read("components/weekly-calendar-view.tsx")).toContain("useSkin");
    expect(read("components/monthly-calendar-view.tsx")).toContain("useSkin");
  });

  it("the secondary screens consume the skin", () => {
    for (const file of [
      "app/(tabs)/family.tsx",
      "app/(tabs)/person.tsx",
      "app/personal-prayer.tsx",
      "app/budget-tracker.tsx",
      "app/fast-collection.tsx",
      "app/bible-tracker.tsx",
      "app/bible-chapters.tsx",
      "app/profile.tsx",
    ]) {
      expect(read(file), file).toContain("useSkin");
    }
  });

  it("the fasting profile's leftover chrome (note modal, note button, chips) is paper too", () => {
    const profile = read("app/profile.tsx");
    expect(profile).toContain("skinTokens.sheetShadow");
    expect(profile).toContain("paperSurfaceStyle");
  });

  it("flat paper only: the grain component renders nothing, anywhere", () => {
    const grain = read("components/paper-grain.tsx");
    expect(grain).toContain("return null");
    expect(grain).not.toContain("react-native-svg");
    const tokens = read("lib/skin-themes.ts");
    expect(tokens).toContain("grainOpacity: 0");
  });

  it("exempt worlds stay exempt: hometown and the Dark Forest take no schedule-skin conversion", () => {
    expect(read("app/hometown.tsx")).not.toContain("useSkin");
    expect(read("components/dark-forest.tsx")).not.toContain("useSkin");
  });
});

describe("v183 8-bit coverage — every surface that wears Paper wears 8-bit", () => {
  // The surface kit gates on isSkinned (Paper OR 8-bit) so the dusk
  // tokens — cream stock, chunky ink borders, the hard block shadow —
  // flow to exactly the surfaces v179 papered. A surface that only
  // branches on strict isPaper would silently stay Classic under
  // 8-bit; these pins keep the gate shared.
  it("the named surfaces gate their kit on isSkinned, not Paper alone", () => {
    for (const file of [
      "components/schedule-tab.tsx",
      "components/prayer-journal-tab.tsx",
      "components/screen-container.tsx",
      "components/status-modal.tsx",
      "components/interior-shell.tsx",
      "components/mini-game-scene.tsx",
      "components/time-block-indicator.tsx",
      "components/monthly-calendar-view.tsx",
      "components/weekly-calendar-view.tsx",
      "components/event-edit-form.tsx",
      "components/event-detail-card.tsx",
      "app/(tabs)/family.tsx",
      "app/(tabs)/person.tsx",
      "app/profile.tsx",
      "app/bible-tracker.tsx",
      "app/budget-tracker.tsx",
      "app/fast-collection.tsx",
      "app/personal-prayer.tsx",
      "app/mine-mouth.tsx",
      "app/mine-interior.tsx",
    ]) {
      expect(read(file), file).toContain("isSkinned");
    }
  });

  it("the 8-bit texture is the dither: one static pattern in the shared chrome only", () => {
    const dither = read("components/bit-dither.tsx");
    expect(dither).toContain("<Pattern");
    expect(dither).toContain("width={16}");
    // v184: the shared chrome mounts the full dusk background (the
    // mockup's gradient + this same dither pattern) under 8-bit; the
    // standalone dither overlay remains for token-painted roots and
    // the status modal's backdrop.
    expect(read("components/bit-background.tsx")).toContain("width={16}");
    expect(read("components/screen-container.tsx")).toContain("isEightBit ? <BitBackground /> : null");
    // The Dark Forest keeps its own rendering — no dither, no skin.
    expect(read("components/dark-forest.tsx")).not.toContain("BitDitherOverlay");
    expect(read("components/dark-forest.tsx")).not.toContain("BitBackground");
  });
});

// v202 — the Paper ANIMATION pass. Jonathan, Oct 23: "There needs to
// be a lot more paper animations in the paper theme." The scene art
// already settled (v176/v179); this pass moves the CHROME — rows,
// sheets, modals, fills, press states — in the paper dialect, through
// one kit (components/paper-motion.tsx) whose every export is a
// passthrough/no-op under any other skin.
describe("Paper coverage — v202 animation pass", () => {
  const count = (src: string, needle: string) => src.split(needle).length - 1;

  it("the paper motion kit exists and speaks ONLY timing + sine, transforms/opacity only", () => {
    const kit = read("components/paper-motion.tsx");
    // The settle is driven by the skin's own motion config (Paper's
    // is the sine bezier, pinned in skin-themes.test.ts).
    expect(kit).toContain("withTiming(1, motion.settle)");
    expect(kit).toContain("withDelay");
    expect(kit).toContain("paperSettleDelay");
    // Transforms + opacity only — never a layout property.
    expect(kit).toContain("transform: [{ translateY: translateY.value }]");
    expect(kit).toContain("transform: [{ scaleX: scale.value }]");
    expect(kit).not.toContain("maxHeight");
    expect(kit).not.toContain("useNativeDriver: false");
    // NO springs, no bounce — anywhere in the kit.
    expect(kit).not.toContain("withSpring");
    expect(kit).not.toContain("springify");
    expect(kit).not.toContain("Easing.bounce");
    // Every other skin gets a plain View: byte-identical layout.
    // (v215: the passthrough forwards the optional pointerEvents
    // prop — unset at every pre-v215 call site, so the default hit
    // behavior is byte-identical there too.)
    expect(kit).toContain("if (!isPaper)");
    expect(kit).toContain("return <View style={style} pointerEvents={pointerEvents}>{children}</View>");
    // (v247 re-base, ruling cited in place: the animated branch's
    // style now LEADS with `screenRoot ? { flex: 1 } : null` — the
    // second gate of the blank Bible: a screenRoot wrapper must
    // size itself for its bare flex:1 child, or Yoga collapses it
    // to height 0. Non-roots get null, so card layout is unchanged.
    // See hidden_files/blank-bible-diagnosis.md, v247 addendum.)
    expect(kit).toContain("return <Animated.View style={[screenRoot ? { flex: 1 } : null, style, animatedStyle]} pointerEvents={pointerEvents}>{children}</Animated.View>");
    // The lift grows FROM the skin's own button shadow: the kit's
    // rest string and the Paper token's buttonShadow are one string
    // (the token composes it with PAPER_SHADOW_ALPHA = 0.28).
    const rest = "3px 3px 0px rgba(24,8,44,0.12), 7px 8px 0px rgba(24,8,44,0.28)";
    expect(kit).toContain(rest);
    const themes = read("lib/skin-themes.ts");
    expect(themes).toContain("`3px 3px 0px rgba(24,8,44,0.12), 7px 8px 0px rgba(24,8,44,${PAPER_SHADOW_ALPHA})`");
    expect(themes).toContain("PAPER_SHADOW_ALPHA = 0.28");
    expect(kit).toContain("PAPER_BUTTON_SHADOW_LIFT");
    expect(kit).toContain("paperPressedLift");
    // The fill hook animates value changes on the settle timing.
    expect(kit).toContain("usePaperFill");
    expect(kit).toContain("withTiming(clamped, motion.settle)");
  });

  it("schedule: every row settles as a sheet, the masthead re-settles per day", () => {
    const schedule = read("components/schedule-tab.tsx");
    expect(schedule).toContain('import { PaperSettle, paperPressedLift } from "./paper-motion";');
    // The sheet wrapper every row rides in on (events, todos, white
    // blocks, study + scene cards) is PaperSettle now.
    expect(schedule).toContain("<PaperSettle index={info.index} settle={info.item.id !== justAddedId}");
    // The date masthead is a sheet laid at the head of the slide,
    // re-laid when the day changes.
    expect(schedule).toContain("<PaperSettle replayKey={selectedDate}");
    // The summary behind the slide is one settled sheet.
    expect(schedule).toContain("<PaperSettle style={[scheduleStyles.summaryContainer,");
  });

  it("schedule: menus settle as paper, forms are pages laid down, the FAB lifts", () => {
    const schedule = read("components/schedule-tab.tsx");
    // FAB + white-block menu entrances route through one helper whose
    // Paper branch is the skin's settle (FadeInUp + settle tokens);
    // no menu keeps the bare 180ms entering any more.
    expect(schedule).toContain("menuEntering");
    expect(schedule).toContain("FadeInUp.duration(skinMotion.settle.duration).delay(delay).easing(skinMotion.settle.easing)");
    expect(schedule).not.toContain("entering={FadeIn.duration(180)");
    expect(schedule).toContain("menuEntering(0)");
    expect(schedule).toContain("menuEntering(150)");
    // All six slide-over forms (event/todo/ministry/bible-study/
    // worship/album library) fade under Paper and their sheets are
    // PaperSettle sheets.
    expect(count(schedule, 'animationType={skinTokens.isPaper ? "fade" : "slide"}')).toBe(6);
    expect(schedule).toContain("<PaperSettle style={[scheduleStyles.formSheet,");
    // The schedule FAB lifts as paper while pressed.
    expect(schedule).toContain("paperPressedLift(skinTokens, pressed, [{ scale: 0.95 }])");
  });

  it("schedule progress fill soaks across the sheet — A46 ruled in v240: the sprout's springs are GONE", () => {
    const bar = read("components/schedule-progress-bar.tsx");
    expect(bar).toContain("usePaperFill(percentage / 100)");
    expect(bar).toContain('transformOrigin: "left center"');
    // RE-BASED in v240 (Jonathan ruled A46 on 2026-10-24: "I'm
    // really not a fan of that plant animation" — his pick was the
    // sun/moon cap). The original pin froze the sprout's spring
    // configs because A46 was HELD for his ruling; the ruling
    // landed, the springs are out, and the still day cap rides
    // the fill instead. The fill's soak is exactly as v202 left it.
    expect(bar).not.toContain("withSpring");
    expect(bar).toContain("dayCapFaceFor");
  });

  it("the quick-add picker rises as a sheet under Paper", () => {
    const picker = read("components/slide-quick-add.tsx");
    expect(picker).toContain("isPaper ? skinTokens.motion.settleDuration : 180");
    expect(picker).toContain("Easing.inOut(Easing.sin)");
  });

  it("journal: masthead + day pill, rows, and the composer all settle", () => {
    const journal = read("components/prayer-journal-tab.tsx");
    // v204: the import also brings paperPressedLift — the morphing
    // composer's FAB face lifts like tappable paper while pressed.
    expect(journal).toContain('import { PaperSettle, paperPressedLift } from "@/components/paper-motion";');
    // Rows and separators settle on first mount (index-staggered).
    expect(journal).toContain("<PaperSettle index={index} style={styles.separator}>");
    expect(journal).toContain("<PaperSettle index={index}>");
    // The composer rises as a sheet.
    expect(journal).toContain("<PaperSettle style={[styles.composerWrap,");
    // The sheets (day/person/tag/calendar) share one shell: fade +
    // settle under Paper.
    const sheets = read("components/journal-sheets.tsx");
    expect(sheets).toContain('animationType={skinTokens.isPaper ? "fade" : "slide"}');
    expect(sheets).toContain("<PaperSettle style={[styles.sheet,");
  });

  it("shell: settings cards settle in a stack, sheets are laid down, the FAB lifts", () => {
    const shell = read("app/(tabs)/index.tsx");
    expect(shell).toContain('import { PaperSettle, paperPressedLift } from "@/components/paper-motion";');
    // Profile card + all seven settings section cards.
    expect(shell).toContain("<PaperSettle index={0} style={[styles.profileSettingsCard,");
    expect((shell.match(/<PaperSettle index=\{\d+\} style=\{\[styles\.settingsCard,/g) ?? []).length).toBe(7);
    // The five slide-up sheets fade under Paper.
    expect(count(shell, 'animationType={skinTokens.isPaper ? "fade" : "slide"}')).toBe(5);
    expect(shell).toContain("<PaperSettle style={styles.themeSheet}>");
    expect(shell).toContain("<PaperSettle style={styles.avatarComposerCard}>");
    // The people FAB lifts as paper while pressed (its own scale
    // rides along inside the lift's transform).
    expect(shell).toContain("paperPressedLift(skinTokens, pressed, [{ scale: 0.96 }])");
  });

  // v254: the hero and the six modal cards carry an added Classic-only
  // Material dress entry in their style arrays; the PaperSettle outer
  // wrappers and the counts this pin guards are unchanged.
  it("people: the person header settles; their modals are pages laid down", () => {
    const person = read("app/(tabs)/person.tsx");
    expect(person).toContain("<PaperSettle style={[styles.profileSection, !isSkinned &&");
    // v258: the praise form modal joins the family (6 sheets, 7 modal cards).
    expect(count(person, 'animationType={skinTokens.isPaper ? "fade" : "slide"}')).toBe(6);
    expect(count(person, "<PaperSettle style={[styles.modalCard, paperModalCard, !isSkinned &&")).toBe(7);
  });

  it("fasting profile: the above-fold sheets settle; its two modals fade as pages", () => {
    const profile = read("app/profile.tsx");
    expect(profile).toContain("<PaperSettle index={0} style={{ position: 'relative' }}>");
    expect(profile).toContain("<PaperSettle index={1} style={styles.statsGrid}>");
    expect(profile).toContain("<PaperSettle index={2} style={[styles.previousFastCard,");
    expect(profile).toContain("<PaperSettle index={3} style={[styles.fastCard,");
    expect(count(profile, 'animationType={isPaper ? "fade" : "slide"}')).toBe(2);
    expect(profile).toContain("<PaperSettle style={styles.sheet}>");
  });

  it("shared forms and menus settle as pages under Paper", () => {
    const status = read("components/status-modal.tsx");
    expect(status).toContain('animationType={isPaper ? "fade" : "slide"}');
    expect(status).toContain("<PaperSettle style={[styles.container,");
    const menu = read("components/context-menu.tsx");
    expect(menu).toContain("<PaperSettle");
    expect(menu).toContain("styles.menu,");
    const timeOff = read("components/time-off-modal.tsx");
    expect(timeOff).toContain('animationType={isPaper ? "fade" : "slide"}');
    expect(timeOff).toContain("<PaperSettle style={{ flex: 1 }}>");
    for (const file of [
      "components/event-edit-form.tsx",
      "components/ministry-edit-form.tsx",
      "components/ministry-detail-card.tsx",
    ]) {
      const src = read(file);
      expect(src, file).toContain("PaperSettle");
      expect(src, file).toContain('? "fade" : "slide"');
    }
  });

  it("tappable paper lifts in the shared game chrome", () => {
    const interior = read("components/interior-shell.tsx");
    expect(count(interior, "paperPressedLift(tokens, pressed)")).toBe(2);
    const games = read("components/mini-game-scene.tsx");
    expect(count(games, "paperPressedLift(tokens, pressed)")).toBe(2);
  });
});
