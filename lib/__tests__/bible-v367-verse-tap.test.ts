// ─── v367 — the Bible verse tap is retired ───────────────────────────────
// Jonathan's Oct 30 ruling, after a screen recording showed the
// verse text doubling/garbling when tapped: a plain tap on a
// verse does nothing. The per-verse chevron is the only tap door
// for the entry; text selection starts only from a long-press.
// The selection's Bubble and Note actions remain the path into
// a verse-seated composer.
// v378 addendum (same day, his ruling): "does nothing" now has
// exactly one exception — a tap that began while a selection
// was standing clears that selection (tap-outside-to-deselect).
// v405 SUPERSESSION (Nov 1): the ruling stands, carried by the
// platform instead of the engine. His pick — native selection
// everywhere — deletes the custom engine: a plain tap does
// nothing because the native text carries no tap handler at
// all; the platform's long-press raises selection with its own
// handles and menu; dismissal is the platform's own. There is
// no tapInert flag, no 350ms timer, no registry — the pins
// below hold v367's outcomes in their v405 form.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const chapter = read("components/bible-v205/chapter-page.tsx");
const nativeSel = read("components/bible-v205/native-selectable-text.tsx");

describe("v367 — a plain verse tap changes nothing (v405 form)", () => {
  it("the verse's native text carries no tap handler and no tap-to-composer prop", () => {
    expect(chapter).toContain("<NativeSelectableText");
    expect(chapter).not.toContain("tapInert");
    expect(chapter).not.toContain("onPressText={() => openComposerForVerse(v)}");
    expect(chapter).not.toContain("onPressText");
  });

  it("the entry head itself is no longer a Pressable — the chevron is the one tap toggle", () => {
    expect(chapter).toContain("<View\n        style={[styles.entryHead, hasBubbles ? styles.entryHeadBubbled : null]}");
    expect(chapter.match(/<Pressable onPress=\{\(\) => actions\.toggleOpen\(entry\)\}/g)).toHaveLength(1);
    expect(chapter).toContain("name={props.open ? 'expand-less' : 'expand-more'}");
  });
});

describe("v367 — selection and its actions are untouched (v405 form)", () => {
  it("selection starts from the platform long-press — no custom timer or drag anywhere", () => {
    expect(nativeSel).toContain("@physiotutors/react-native-selectable-text");
    expect(nativeSel).not.toContain("delayLongPress");
    expect(nativeSel).not.toContain("onLongPress");
    expect(chapter).not.toContain("delayLongPress");
  });

  it("the selection menu still seats Bubble and Note on the verse", () => {
    // v427 amendment: the tint write routes to the entry owning
    // the verse (a folded lead verse writes to the lead entry);
    // for every verse of an unfolded entry that IS `entry`.
    expect(chapter).toContain("actions.phraseTint(leadForVerse(v) ?? entry, v, range, tint)");
    expect(chapter).toContain("onBubble={() => openComposerForVerse(v, { bubble: true })}");
    expect(chapter).toContain("onNote={() => openComposerForVerse(v)}");
  });

  it("his own lines keep their separate tap-to-edit affordance", () => {
    // v405: the tap is direct again — native selection needs
    // no standing-selection guard (the platform dismisses its
    // own selection), so the v378 wrapper block is gone and
    // the tap calls editSelfLine exactly as v367 left it.
    // v427 amendment: the handler now takes its piece (host or
    // folded lead) — same direct tap, same edit door.
    expect(chapter).not.toContain("hasActiveSelection");
    expect(chapter).toContain("editSelfLine(piece, i);");
  });
});
