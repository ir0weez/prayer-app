// ─── v263: the Bible section switches like a tab ─────────────────────
// Jonathan, Oct 26 08:55 (with a screen recording): "The tab switcher
// is stuttering when I hit 'study'. That's what you need to fix. It
// doesn't slide over like the rest of the tabs."
//
// The other four tabs are internal state inside the one shell screen
// (app/(tabs)/index.tsx): a press swaps the content in place and the
// shell crossfades it in — opacity 0 → 1 on `skinMotion.slide`
// (Classic 400ms M3-emphasized, Paper 460ms sine, 8-bit 300ms
// steps(6), Terminal 240ms steps(5); NO transform — the 12px rise was
// removed Oct 3, commit afc0f57, because it read as a jolt).
//
// Study was never a tab state: the shell LAUNCHED the Bible section
// with router.push, and every Bible screen is a root-stack route
// whose Stack (app/_layout.tsx) carried no animation options at all —
// so the switch ran the native-stack platform default (a horizontal
// full-screen slide) over a cold screen mount. Different motion
// character, plus hitch frames while Books mounted and reloaded.
//
// The fix, at the navigation layer: every Bible-section route wears
// the options built here — a crossfade ("fade") whose duration IS
// the active skin's own slide duration, so the switch runs on the
// same clock as the shell's tab fade and the tab pill's slide, in
// both directions (the native stack reverses the same animation on
// pop, and BibleTabBar's return trip navigates back to the shell).
// freezeOnBlur parks a covered Bible screen's rendering while a
// sibling Bible screen is on top of it, so the covered screen stops
// compositing ghost frames into the next transition. (The shell
// screen is deliberately NOT frozen — it hosts live surfaces like
// the prayer session; the fade alone carries its side of the switch.)
//
// Honest limit: a native crossfade uses the platform's own easing
// curve — the shell fade's exact per-skin easing (emphasized bezier
// / sine / steps) cannot be handed to the native stack. Duration and
// opacity character match; the curve is the platform's.

/** The root-stack routes that make up the Bible section — the Books
 * root, the book and chapter screens, the study queue, and the
 * retired tracker's redirect. All five wear the tab-switch options
 * so moving anywhere inside the section (and back out of it) keeps
 * the one crossfade character. */
export const BIBLE_STACK_ROUTES = [
  "bible-chapters",
  "bible-book",
  "bible-chapter",
  "bible-queue",
  "bible-tracker",
] as const;

export type BibleStackRoute = (typeof BIBLE_STACK_ROUTES)[number];

/**
 * The Stack.Screen options for a Bible-section route. The duration
 * is the ACTIVE SKIN's tab-slide duration (tokens.motion
 * .slideDuration, resolved by the caller from useSkin) — pass it in,
 * never hard-code a number here: when the skin changes, the switch
 * must keep the shell's tempo.
 */
export function bibleStackScreenOptions(slideDurationMs: number) {
  return {
    animation: "fade",
    animationDuration: slideDurationMs,
    freezeOnBlur: true,
  } as const;
}
