// ─── v367 — the Bible verse tap is retired ───────────────────────────────
// Jonathan's Oct 30 ruling, after a screen recording showed the
// verse text doubling/garbling when tapped: a plain tap on a
// verse does nothing. The per-verse chevron is the only tap door
// for the entry; text selection starts only from the 350ms
// long-press and its drag. The selection bar's own Bubble and
// Note actions remain the path into a verse-seated composer.
// v378 addendum (same day, his ruling): "does nothing" now has
// exactly one exception — a tap that began while a selection
// was standing clears that selection (tap-outside-to-deselect).
// It still opens nothing; see bible-v378-selection-fixes.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const chapter = read("components/bible-v205/chapter-page.tsx");
const selectable = read("components/bible-v205/selectable-text.tsx");

describe("v367 — a plain verse tap changes nothing", () => {
  it("the verse's SelectableText is explicitly tap-inert and has no tap-to-composer prop", () => {
    expect(chapter).toContain("tapInert");
    expect(chapter).not.toContain("onPressText={() => openComposerForVerse(v)}");
    expect(selectable).toContain("tapInert?: boolean;");
    expect(selectable).toContain("if (props.tapInert) return;");
  });

  it("the tap-inert return still bars every caller tap action — a tap opens nothing", () => {
    // AMENDED (v378, dated note): v367's original pin also held
    // that the inert return preceded ANY selection clear — i.e.
    // a verse tap could not disturb a standing selection. That
    // half is superseded by Jonathan's explicit v378 ruling
    // ("why can't I tap outside of it to deselect?!"): a tap
    // that began while a selection was standing now clears it,
    // in the stamp-guarded branch, and does nothing else. What
    // STANDS from v367, and is pinned here: the inert return
    // still precedes the caller's tap action, so a verse tap
    // can never reach the composer path.
    const press = selectable.slice(selectable.indexOf("onPress={() => {"), selectable.indexOf("onPress={() => {") + 1400);
    expect(press.indexOf("if (props.tapInert) return;")).toBeGreaterThan(-1);
    expect(press.indexOf("if (props.tapInert) return;")).toBeLessThan(press.indexOf("props.onPressText?.();"));
    // The only clear a verse tap can perform is the
    // standing-selection clear, guarded by the touch stamp.
    expect(press).toContain("if (touchStampRef.current) {");
  });

  it("the entry head itself is no longer a Pressable — the chevron is the one tap toggle", () => {
    expect(chapter).toContain("<View\n        style={[styles.entryHead, hasBubbles ? styles.entryHeadBubbled : null]}");
    expect(chapter.match(/<Pressable onPress=\{props\.onToggleOpen\}/g)).toHaveLength(1);
    expect(chapter).toContain("name={props.open ? 'expand-less' : 'expand-more'}");
  });
});

describe("v367 — selection and its actions are untouched", () => {
  it("selection still starts only from the 350ms long-press", () => {
    expect(selectable).toContain("delayLongPress={350}");
    expect(selectable).toContain("onLongPress={() => begin(i)}");
    expect(selectable).toContain("onTouchMove={onTouchMove}");
  });

  it("the selection bar still seats Bubble and Note on the verse", () => {
    expect(chapter).toContain("onApplyTint={(range, tint) => props.onPhraseTint(v, range, tint)}");
    expect(chapter).toContain("onBubble={() => openComposerForVerse(v, { bubble: true })}");
    expect(chapter).toContain("onNote={() => openComposerForVerse(v)}");
  });

  it("his own lines keep their separate tap-to-edit affordance", () => {
    // AMENDED (v378, dated note): the wrapper's one-line
    // onPress literal became a guarded block — while a
    // selection stands, the tap clears it instead of editing
    // (his v378 ruling); with nothing standing it calls
    // editSelfLine exactly as before, pinned here in its new
    // shape. The words' own tap-to-edit prop is untouched.
    expect(chapter).toContain("if (hasActiveSelection()) {");
    expect(chapter).toContain("editSelfLine(i);");
    expect(chapter).toContain("onPressText={() => editSelfLine(i)}");
  });
});
