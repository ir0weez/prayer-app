// ─────────────────────────────────────────────────────────────────────────────
// v348 — THE TODO FLOURISHES' INVISIBLE BURSTS (Jonathan's device
// report, Oct 29 17:46, on v347: "The animations for the todos
// don't work. They just shake no and that's it… There's nothing
// coming out of them like the mockups showed." — especially, he
// added, for todos in a column, 2 together: the same-time pairs.)
//
// Code trace (device-matched): the mapping fired and the settle
// ran — the shake he saw IS the jolt settle, the animation's
// second half. The BURST was invisible, for four reasons:
//  1. ANCHOR — pair rectangles and full rows emitted the burst at
//     the raw fingertip (firePairFlourish's and fireRowFlourish's
//     press-position shortcut), while the kit's travel was tuned
//     to the mockup's checkbox anchor. From mid-card the burst
//     played inside the pale card, under his thumb. Only subtasks
//     measured properly.
//  2. CONTRAST — Feed's bubbles are white at 92% under a light rim
//     on pair cards painted a 0.86 tint of the todo colour — white
//     on near-white; Break's sigh-dots were plain grey at ≤ 0.5
//     opacity drifting down a pale card. The mockup played these
//     over a lavender page; the app's sheet is white.
//  3. TIMING SPLIT — every particle's opacity was 0 by ~0.55 of
//     the 900ms (bubbles by ~380ms) while the jolt starts at 0.5:
//     faint burst under the finger, then the shake alone.
//  4. WIDE KITS — Brush Teeth foam (ox 0…255) and Trash bits
//     (ox 17…228) in the kit are authored for full-width rows;
//     from a pair rectangle they scatter across the neighbouring
//     card.
//
// The fix pinned here:
//  · both fire paths drop the press-position shortcut and anchor
//    through the measured checkbox path — v338's teardown race is
//    moot because v338's own deferred write holds the row in its
//    slot for the whole flourish;
//  · Feed bubbles are ≥ 7px with a full-strength todo-colour rim;
//    Break's dots mix the todo colour in and peak at 0.85;
//  · the kit's spans are stretched (TODO_FLOURISH_SPAN_STRETCH)
//    so the last particle finishes at 0.9 of the burst — the burst
//    overlaps the settle instead of ending before it begins;
//  · pair-anchored wide kits carry an oxScale containing their
//    spread to the pair card's width; rows keep authored spreads.
// NOT touched: the keyword map, the null set, the 900ms duration,
// the deferred-write/settle mechanics, the bus/overlay shape.
//
// RE-BASED (v351, Oct 29): the ANCHOR mechanism pins in the first
// describe below are re-based. The measured anchor itself became
// the bug: on v348 the bursts STILL never appeared on his phone
// ("the tap animations still don't work on todos", 19:15) — every
// burst rode an async Fabric measureInWindow callback that can
// silently never fire (ReactFabricHostComponent invokes it only
// if the shadow node resolves; no else, no error), and the pair
// path had no fallback at all, so no callback meant no emission
// while the state-driven settle always played. v351 takes the
// live measure out of every press path: emission is synchronous
// from the press seat again, and the checkbox origin is computed
// from a layout rect cached at layout time (onLayout) plus the
// press's own locationX/Y. v348's anchor MATH (+21 / centred /
// +26), the timing stretch, the contrast lifts and the wide-kit
// squeeze are all kept — only the sourcing changed. The full
// v351 pins live in todo-flourish-v351.test.ts; the timing,
// contrast and bus pins below stand exactly as written.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  emitTodoFlourish,
  subscribeTodoFlourish,
  TODO_FLOURISH_PARTICLES,
  TODO_FLOURISH_SPAN_STRETCH,
  TODO_FLOURISH_WIDE_SPAN_PX,
  type TodoFlourishId,
} from "../todo-flourish";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const schedule = read("components/schedule-tab.tsx");
const overlay = read("components/todo-flourish-overlay.tsx");

const pairFn = schedule.slice(
  schedule.indexOf("const firePairFlourish"),
  schedule.indexOf("// v338 — flourish-held completion writes"),
);
const rowFn = schedule.slice(
  schedule.indexOf("const fireRowFlourish"),
  schedule.indexOf("const fireSubtaskFlourish"),
);

describe("the anchor: the checkbox, never the fingertip (RE-BASED in v351)", () => {
  it("the v338 press-position one-liners never came back", () => {
    // v351 restores synchronous emission from the press flow, but
    // as a computed seat (anchor ?? press) — the verbatim v338
    // shortcuts, which emitted the raw fingertip with no checkbox
    // recovery at all, stay gone.
    expect(schedule).not.toContain(
      "if (fallback) {\n      emitTodoFlourish({ flourish, color: todo.color || colors.primary, anchor: fallback });",
    );
    expect(schedule).not.toContain(
      "if (position) {\n      emitTodoFlourish({ flourish, color: pairTodo.color || colors.primary, anchor: position });",
    );
  });

  it("the pair burst anchors at its checkbox, computed from the cached rect (RE-BASED in v351)", () => {
    // RE-BASED (v351): was "measures its rectangle" through
    // measureInWindow — the callback that silently never fired.
    // The map now caches the rectangle's layout size (onLayout),
    // and the anchor keeps v348's math from the press origin:
    // padding 11 + half the 20px box, vertically centred, less
    // the half box.
    expect(pairFn).toContain("pairRowRefs.current.get(pairTodo.id)");
    expect(pairFn).not.toContain("measureInWindow");
    expect(pairFn).toContain(
      "anchor = { x: press.x - press.locationX + 21, y: press.y - press.locationY + rect.height / 2 - 10 };",
    );
  });

  it("the row burst anchors at its checkbox, computed from the cached rect (RE-BASED in v351)", () => {
    // RE-BASED (v351): was "goes through the measured checkbox
    // path" (emitFlourishAt + measureInWindow, never emitting
    // directly). The row now emits synchronously itself, walking
    // from the pressed target's origin to the checkbox through
    // the rect its wrapper cached at layout time.
    expect(rowFn).toContain("emitTodoFlourish({");
    expect(rowFn).not.toContain("measureInWindow");
    expect(rowFn).toContain("const rect = checkboxRectRef.current;");
    expect(rowFn).toContain("{ x: originX + rect.x + rect.width / 2, y: originY + rect.y + rect.height / 2 }");
  });

  it("the pair press hands its seat (page + location) to the flourish (RE-BASED in v351)", () => {
    // RE-BASED (v351): v348 pinned the press handing NOTHING over
    // (firePairFlourish(t)) because the fingertip was the wrong
    // anchor and the measure supplied the origin. With the live
    // measure gone, the press's own location is how the checkbox
    // origin is recovered synchronously — the seat is handed
    // over, the anchor is still computed to the checkbox, and the
    // raw page point remains only the no-cache fallback.
    expect(schedule).toContain("if (!t.isCompleted) firePairFlourish(t, position);");
    expect(schedule).not.toContain("firePairFlourish(t);");
  });
});

describe("v348 — the timing: the burst overlaps the settle, last piece ends at 0.9", () => {
  const ends = (id: TodoFlourishId) => TODO_FLOURISH_PARTICLES[id].map((p) => p.delay + p.span);

  it("the stretch factor is real (> 1) and exported from the kit", () => {
    expect(TODO_FLOURISH_SPAN_STRETCH).toBeGreaterThan(1);
  });

  it("every flourish is still alive when the settle starts (0.5)", () => {
    for (const id of Object.keys(TODO_FLOURISH_PARTICLES) as TodoFlourishId[]) {
      expect(Math.max(...ends(id)), id).toBeGreaterThanOrEqual(0.6);
    }
  });

  it("the kit's last particle finishes at 0.9 of the burst — and everything inside it", () => {
    const all = (Object.keys(TODO_FLOURISH_PARTICLES) as TodoFlourishId[]).flatMap(ends);
    expect(Math.max(...all)).toBeCloseTo(0.9, 6);
    expect(Math.max(...all)).toBeGreaterThanOrEqual(0.85);
    for (const end of all) expect(end).toBeLessThanOrEqual(1);
  });

  it("Break's last sigh-dot is the kit's longest piece, ending at 0.9", () => {
    expect(Math.max(...ends("break"))).toBeCloseTo(0.9, 6);
  });
});

describe("v348 — the contrast: Feed and Break read on a pale card", () => {
  it("every Feed bubble is at least 7px", () => {
    for (const p of TODO_FLOURISH_PARTICLES.feed) {
      expect(p.kind).toBe("bubble");
      expect(p.size, "feed bubble").toBeGreaterThanOrEqual(7);
    }
  });

  it("Feed's rim is the todo colour at full strength (no more light tint)", () => {
    expect(overlay).toContain('return { fill: "rgba(255,255,255,0.92)", border: todoColor };');
    expect(overlay).not.toContain('mix(todoColor, "#FFFFFF", 0.45)');
  });

  it("Break's dots wear the todo colour mixed into the sigh grey", () => {
    expect(overlay).toContain('return { fill: mix("#C9CDD6", todoColor, 0.5) };');
  });

  it("Break's dots peak at 0.85 opacity (was 0.5)", () => {
    expect(overlay).toContain("[0, 0.3, 1], [0, 0.85, 0]");
    expect(overlay).not.toContain("[0, 0.3, 1], [0, 0.5, 0]");
  });
});

describe("v348 — the wide kits: contained to the pair card, authored on rows", () => {
  it("the named span covers both wide kits' authored extent from the anchor", () => {
    for (const id of ["brush-teeth", "trash"] as TodoFlourishId[]) {
      const extent = Math.max(...TODO_FLOURISH_PARTICLES[id].map((p) => p.ox + p.size));
      expect(TODO_FLOURISH_WIDE_SPAN_PX, id).toBeGreaterThanOrEqual(extent);
    }
  });

  it("only the wide kits get an oxScale, and only from the pair path", () => {
    expect(pairFn).toContain('flourish === "brush-teeth" || flourish === "trash"');
    expect(pairFn).toContain("TODO_FLOURISH_WIDE_SPAN_PX");
    expect(pairFn).toContain("oxScale");
    expect(rowFn).not.toContain("oxScale");
  });

  it("the bus carries oxScale through to subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTodoFlourish(listener);
    emitTodoFlourish({ flourish: "trash", color: "#10B981", anchor: { x: 30, y: 200 }, oxScale: 0.6 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({ flourish: "trash", oxScale: 0.6 });
    unsubscribe();
  });

  it("the overlay squeezes each particle's ox by the burst's scale", () => {
    expect(overlay).toContain("ox: p.ox * burst.oxScale");
  });
});
