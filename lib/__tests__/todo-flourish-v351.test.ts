// ─────────────────────────────────────────────────────────────────────────────
// v351 — THE TODO FLOURISHES' DEAD BURSTS, ROUND 2 (Jonathan's
// device report on v348, Oct 29 19:15: "the tap animations still
// don't work on todos" — the shake plays, nothing comes out.)
//
// v348 routed every burst through an asynchronous Fabric
// measureInWindow callback. In the shipped RN source
// (ReactFabricHostComponent) that callback is invoked only if the
// shadow node resolves — there is no else and no error — so it can
// silently never fire. The pair path (firePairFlourish) had NO
// fallback at all: no callback → no emission → no burst, while the
// settle (plain React state) always plays. Exactly his report.
// Control proof: the +10 XP floater shares the burst overlay's
// root seat and native driver and WORKS on his phone, because it
// positions from the press's synchronous pageX/pageY.
//
// The fix pinned here: measureInWindow is OUT of every flourish
// press path (rows, subtasks, same-time pairs, and the missed-row
// path that shared the pattern). Emission is synchronous in the
// press flow, as v338 had it — and the checkbox origin v348 wanted
// is recovered WITHOUT a live measure: each row caches its layout
// rect at layout time (onLayout), and the press's own locationX/Y
// gives the pressed target's window origin (page − location), so
// the anchor is computed from the cached rect at press time. When
// no rect is cached, the raw press position carries the burst —
// the emission is never dropped.
//
// KEPT from v348, untouched (pinned in todo-flourish-v348.test.ts):
// the span stretch (last particle ends at 0.9 of the 900ms), Feed
// bubbles ≥7px with a full-strength todo-colour rim, Break sigh
// dots at 0.85 tinted, the wide-kit oxScale squeeze for pairs, the
// 900ms deferred write, the settle kinds/offsets, the keyword map
// and null set, the overlay and the bus.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const schedule = read("components/schedule-tab.tsx");
const flourishLib = read("lib/todo-flourish.ts");

const rowFn = schedule.slice(
  schedule.indexOf("const fireRowFlourish"),
  schedule.indexOf("const fireSubtaskFlourish"),
);
const subtaskFn = schedule.slice(
  schedule.indexOf("const fireSubtaskFlourish"),
  schedule.indexOf("// Determine if this todo is in its active hour"),
);
const pairFn = schedule.slice(
  schedule.indexOf("const firePairFlourish"),
  schedule.indexOf("// v338 — flourish-held completion writes"),
);
const missedFn = schedule.slice(
  schedule.indexOf("const fireMissedFlourish"),
  schedule.indexOf("const firePairFlourish"),
);

describe("v351 — no live measure anywhere in a flourish press path", () => {
  it("no fire path calls measureInWindow, and the measured-emit helper is gone", () => {
    for (const fn of [rowFn, subtaskFn, pairFn, missedFn]) {
      expect(fn).not.toContain("measureInWindow");
    }
    expect(schedule).not.toContain("emitFlourishAt");
    // the missed row's old inline measure branch is gone too
    expect(schedule).not.toContain("const rowView = missedRowRefs.current.get(todo.id);");
  });

  it("every fire path emits directly and synchronously in its own body", () => {
    expect(rowFn).toContain("emitTodoFlourish({");
    expect(subtaskFn).toContain("emitTodoFlourish({");
    expect(pairFn).toContain("emitTodoFlourish({");
    expect(missedFn).toContain("emitTodoFlourish({");
  });

  it("the press seat type carries page + location from the lib", () => {
    expect(flourishLib).toContain("export type TodoFlourishPress = {");
    expect(flourishLib).toContain('frame?: "checkbox" | "row";');
    expect(schedule).toContain("type TodoFlourishPress");
  });
});

describe("v351 — layout rects are cached at layout time (onLayout)", () => {
  it("the pair Pressable caches its size into the pair map", () => {
    expect(schedule).toContain(
      "onLayout={(e) => { pairRowRefs.current.set(t.id, { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height }); }}",
    );
  });

  it("every row checkbox wrapper caches its layout rect", () => {
    expect(schedule).toContain(
      "onLayout={(e) => { checkboxRectRef.current = e.nativeEvent.layout; }}",
    );
    // the view refs the measure used to read are gone
    expect(schedule).not.toContain("ref={checkboxAnchorRef}");
  });

  it("subtask rows cache their size by subtask id", () => {
    expect(schedule).toContain(
      "subtaskRectRefs.current.set(subtask.id, { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })",
    );
    expect(schedule).not.toContain("subtaskAnchorRefs");
  });

  it("the missed sheet caches row, actions and button rects per todo", () => {
    expect(schedule).toContain('stashMissedRect(todo.id, "row", e.nativeEvent.layout)');
    expect(schedule).toContain('stashMissedRect(todo.id, "actions", e.nativeEvent.layout)');
    expect(schedule).toContain('stashMissedRect(todo.id, "button", e.nativeEvent.layout)');
  });
});

describe("v351 — the checkbox anchor is computed from the cached rect at press time", () => {
  it("the row walks from the pressed target's origin to the checkbox, per frame", () => {
    expect(rowFn).toContain("const rect = checkboxRectRef.current;");
    expect(rowFn).toContain("press.x - press.locationX");
    expect(rowFn).toContain('press.frame === "checkbox"');
    expect(rowFn).toContain("{ x: originX + rect.width / 2, y: originY + rect.height / 2 }");
    expect(rowFn).toContain('press.frame === "row"');
    expect(rowFn).toContain("{ x: originX + rect.x + rect.width / 2, y: originY + rect.y + rect.height / 2 }");
  });

  it("the subtask anchors off its row's origin and cached height, 10px in", () => {
    expect(subtaskFn).toContain("subtaskRectRefs.current.get(subtask.id)");
    expect(subtaskFn).toContain(
      "anchor = { x: press.x - press.locationX + 10, y: press.y - press.locationY + rect.height / 2 };",
    );
  });

  it("the pair keeps v348's checkbox math (+21, centred less the half box) from its origin", () => {
    expect(pairFn).toContain("pairRowRefs.current.get(pairTodo.id)");
    expect(pairFn).toContain(
      "anchor = { x: press.x - press.locationX + 21, y: press.y - press.locationY + rect.height / 2 - 10 };",
    );
  });

  it("the missed row recovers its origin from the Complete button's press and cached offsets", () => {
    expect(missedFn).toContain("missedRowRefs.current.get(missedTodo.id)");
    expect(missedFn).toContain(
      "const rowOriginX = press.x - press.locationX - (rects.actions.x + rects.button.x) + rects.row.x;",
    );
    // v348's anchor math from the row's origin is unchanged
    expect(missedFn).toContain("anchor = { x: rowOriginX + 26, y: rowOriginY + rects.row.height / 2 };");
  });
});

describe("v351 — the press-position fallback: the emission is never dropped", () => {
  it("the row falls back through the press seat to the long-press point", () => {
    expect(rowFn).toContain("anchor: anchor ?? press ?? contextMenuPos");
    // the long-press menu's Mark Complete hands that point over as its seat
    expect(schedule).toContain("if (!todo.isCompleted) fireRowFlourish(contextMenuPos);");
  });

  it("subtask, pair and missed fall back to the raw press position", () => {
    expect(subtaskFn).toContain("const seat = anchor ?? press;");
    expect(pairFn).toContain("anchor: anchor ?? press");
    expect(missedFn).toContain("anchor: anchor ?? press");
  });

  it("the press handlers build their seats synchronously from the event", () => {
    expect(schedule).toContain("locationX: event.nativeEvent.locationX, locationY: event.nativeEvent.locationY, frame: \"checkbox\" as const");
    expect(schedule).toContain("locationX: event.nativeEvent.locationX, locationY: event.nativeEvent.locationY, frame: \"row\" as const");
    expect(schedule).toContain("locationX: e.nativeEvent.locationX, locationY: e.nativeEvent.locationY");
    expect(schedule).toContain("if (!t.isCompleted) firePairFlourish(t, position);");
    expect(schedule).toContain("fireMissedFlourish(todo, position);");
  });
});
