// ─── v367 — the Bible verse tap is retired ───────────────────────────────
// Jonathan's Oct 30 ruling, after a screen recording showed the
// verse text doubling/garbling when tapped: a plain tap on a
// verse does nothing. The per-verse chevron is the only tap door
// for the entry; text selection starts only from the 350ms
// long-press and its drag. The selection bar's own Bubble and
// Note actions remain the path into a verse-seated composer.

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

  it("the tap-inert return happens before any selection clear or caller tap action", () => {
    const press = selectable.slice(selectable.indexOf("onPress={() => {"), selectable.indexOf("onPress={() => {") + 260);
    expect(press.indexOf("if (props.tapInert) return;")).toBeLessThan(press.indexOf("clearSelection();"));
    expect(press.indexOf("if (props.tapInert) return;")).toBeLessThan(press.indexOf("props.onPressText?.();"));
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
    expect(chapter).toContain("onPress={() => editSelfLine(i)}");
    expect(chapter).toContain("onPressText={() => editSelfLine(i)}");
  });
});
