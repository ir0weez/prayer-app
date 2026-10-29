// ─────────────────────────────────────────────────────────────────────────────
// v338 — TODO FLOURISH SEQUENCING + THE READ FLOURISH (Jonathan's
// device report, Oct 29 10:49; code-traced root cause).
//
// In v337 the flourish and the completion write fired back-to-back
// in the same tick: the row dropped to the completed section in the
// SAME commit (~0ms) while the row settle doesn't begin until
// ~450ms into the 900ms flourish — the settle played on the
// already-dropped row, and the burst's emit raced teardown through
// an async measureInWindow callback. The animation never got its
// moment.
//
// The fix pinned here:
//  · a flourish-MAPPED todo's completion write is held for
//    TODO_FLOURISH_DURATION_MS in ScheduleTab (pending set + timers
//    beside the toggles, never inside a row); the row stays in its
//    flow slot wearing the completing dress until the write lands;
//  · the burst emits SYNCHRONOUSLY from the press's pageX/pageY;
//  · pending presses are ignored, the long-press menu's Mark
//    Complete flushes a held write, a day switch flushes all held
//    writes, and uncheck / quiet / unmatched todos write instantly;
//  · the grouped completed branch wears the same settle wrapper;
//  · Read gains its own flourish — page-corner sparks — moving it
//    out of the v337 null set (Plan, Ukulele, Ten Chapters stay).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  todoCompletionShouldDefer,
  TODO_FLOURISH_DURATION_MS,
  TODO_FLOURISH_PARTICLES,
  todoFlourishForTitle,
} from "../todo-flourish";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("v338 — the Read flourish (page-corner sparks)", () => {
  it("Read titles map to the read flourish, on a word boundary", () => {
    expect(todoFlourishForTitle("Read")).toBe("read");
    expect(todoFlourishForTitle("read")).toBe("read");
    expect(todoFlourishForTitle("Read Bible")).toBe("read");
    // The boundary guards: none of these contain the word "read".
    expect(todoFlourishForTitle("Ready")).toBeNull();
    expect(todoFlourishForTitle("Reading")).toBeNull();
    expect(todoFlourishForTitle("Bread")).toBeNull();
  });

  it("the read burst is one page-corner plus spark bits off it", () => {
    const particles = TODO_FLOURISH_PARTICLES.read;
    expect(particles[0].kind).toBe("page-corner");
    expect(particles.filter((p) => p.kind === "spark").length).toBeGreaterThanOrEqual(3);
    expect(particles.length).toBeLessThanOrEqual(12);
    for (const p of particles) {
      expect(p.delay + p.span, `${p.kind}`).toBeLessThanOrEqual(1);
    }
  });

  it("the overlay renders the page-corner as a flipping page (rotateY)", () => {
    const overlay = read("components/todo-flourish-overlay.tsx");
    expect(overlay).toContain('"page-corner"');
    expect(overlay).toContain("rotateY");
  });
});

describe("v338 — the defer decision (pure, pinned)", () => {
  it("a mapped todo being completed defers its write", () => {
    for (const title of ["Coffee", "Feed Aaron", "Duolingo", "Read", "Trash", "Break"]) {
      expect(todoCompletionShouldDefer({ title, isCompleted: false }), title).toBe(true);
    }
  });

  it("unchecking NEVER defers, even for a mapped title", () => {
    for (const title of ["Coffee", "Feed Aaron", "Read"]) {
      expect(todoCompletionShouldDefer({ title, isCompleted: true }), title).toBe(false);
    }
  });

  it("quiet and unmatched todos write instantly", () => {
    for (const title of ["Pray", "Sleep", "Internal Permission", "Stitch Journal", "Plan", "Ukulele", "Ten Chapters"]) {
      expect(todoCompletionShouldDefer({ title, isCompleted: false }), title).toBe(false);
    }
  });
});

describe("v338 — source pins: the hold lives in ScheduleTab, beside the toggles", () => {
  const schedule = read("components/schedule-tab.tsx");

  it("the write is held for exactly the flourish duration", () => {
    expect(schedule).toContain("setTimeout(() => flushPendingTodoWrite(todo.id), TODO_FLOURISH_DURATION_MS)");
    expect(TODO_FLOURISH_DURATION_MS).toBe(900);
  });

  it("the deferral is gated on the pure decision (uncheck / quiet / unmatched stay instant)", () => {
    expect(schedule).toContain("if (!todoCompletionShouldDefer(todo))");
    expect(schedule).toContain("pendingTodoWrites.current.has(todo.id)"); // pending press guard in the holder
  });

  it("both day-page todo surfaces route their toggles through the hold", () => {
    expect(schedule).toContain("requestTodoToggle(item.data, () => {");
    expect(schedule).toContain("requestTodoToggle(t, () => {");
    expect(schedule).toContain("completionPending={pendingTodoIds.has(item.data.id)}");
    expect(schedule).toContain("pendingTodoIds.has(t.id)");
  });

  it("presses on a pending row are ignored in the row and the pair", () => {
    expect(schedule).toContain("if (completionPending) return;");
    expect(schedule).toContain("if (pendingTodoIds.has(t.id)) return;");
  });

  it("the long-press menu's Mark Complete flushes a held write", () => {
    expect(schedule).toContain("onFlushCompletion?.()");
    expect(schedule).toContain("onFlushCompletion={() => flushPendingTodoWrite(item.data.id)}");
  });

  it("a day switch flushes every held write", () => {
    expect(schedule).toContain("for (const todoId of [...pendingTodoWrites.current.keys()]) flushPendingTodoWrite(todoId);");
  });

  it("a pending row renders as completing WITHOUT isCompleted flipping (visual state is separate)", () => {
    expect(schedule).toContain("const visuallyCompleted = todo.isCompleted || completionPending;");
    expect(schedule).toContain("const pairDone = t.isCompleted || pendingTodoIds.has(t.id);");
  });

  it("the burst emits synchronously from the press position, not via measureInWindow", () => {
    expect(schedule).toContain("if (fallback) {\n      emitTodoFlourish({ flourish, color: todo.color || colors.primary, anchor: fallback });");
    expect(schedule).toContain("if (position) {\n      emitTodoFlourish({ flourish, color: pairTodo.color || colors.primary, anchor: position });");
  });

  it("the grouped completed branch wears the settle wrapper like its twin", () => {
    const completedGroup = schedule.indexOf("isGroupedTodo && todo.isCompleted ? (");
    expect(completedGroup).toBeGreaterThan(-1);
    const after = schedule.slice(completedGroup, completedGroup + 400);
    expect(after).toContain("FlourishSettleView");
  });

  it("deleting a todo cancels its held write", () => {
    expect(schedule).toContain("cancelPendingTodoWrite(item.data.id);");
  });
});
