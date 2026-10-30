// ─────────────────────────────────────────────────────────────────────────────
// v337 — KEYWORD TODO CHECK-OFF FLOURISHES (Jonathan's pick, Oct 29).
// Checking off a keyword todo plays its own one-shot flourish
// (todo-keyword-animations-v1.html); unchecking plays nothing.
//
// Pins held here:
//  · the keyword → flourish mapping, from his mined real todos —
//    including coffee == energy drink (one flourish, his ruling) and
//    the word-boundary guards ("Breakfast" is not Break, "Feedback"
//    is not Feed);
//  · the QUIET list — Pray, Internal Permission, External
//    Permission, Sleep, Stitch Journal never flourish;
//  · the settle map (Break sinks; Trash crumples; Photo bursts
//    only — and since v364 every other flourish bursts only too:
//    the jolt settle is gone, at Jonathan's word, Oct 30);
//  · the performance contract: one burst < 1s, ≤ a dozen particles
//    per flourish from the one shared kit, every particle's motion
//    finishing inside the burst; the overlay animates ONLY on the
//    native driver, subscribes to the toggle-event bus, and holds
//    no interval or loop.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  emitTodoFlourish,
  isQuietTodoTitle,
  subscribeTodoFlourish,
  TODO_FLOURISH_DURATION_MS,
  TODO_FLOURISH_PARTICLES,
  TODO_FLOURISH_SETTLE,
  todoFlourishForTitle,
  type TodoFlourishId,
} from "../todo-flourish";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("v337 — the keyword → flourish mapping (his real todos)", () => {
  it("Feed titles fizz", () => {
    expect(todoFlourishForTitle("Feed Aaron")).toBe("feed");
    expect(todoFlourishForTitle("Feed (Aaron)")).toBe("feed");
    expect(todoFlourishForTitle("Feed")).toBe("feed");
    expect(todoFlourishForTitle("feed the baby")).toBe("feed");
  });

  it("Duolingo bursts letters", () => {
    expect(todoFlourishForTitle("Duolingo")).toBe("duolingo");
    expect(todoFlourishForTitle("duolingo practice")).toBe("duolingo");
  });

  it("Coffee and Energy Drink share ONE flourish — his explicit ruling", () => {
    expect(todoFlourishForTitle("Coffee")).toBe("caffeine");
    expect(todoFlourishForTitle("Energy Drink")).toBe("caffeine");
    expect(todoFlourishForTitle("coffee")).toBe(todoFlourishForTitle("energy drink"));
  });

  it("Brush Teeth foams", () => {
    expect(todoFlourishForTitle("Brush Teeth")).toBe("brush-teeth");
    expect(todoFlourishForTitle("brush teeth")).toBe("brush-teeth");
  });

  it("Photo todos flash", () => {
    expect(todoFlourishForTitle("Photo (Melody)")).toBe("photo");
    expect(todoFlourishForTitle("Photo (Novalee)")).toBe("photo");
    expect(todoFlourishForTitle("Take Picture")).toBe("photo");
  });

  it("App Update rockets, either word order", () => {
    expect(todoFlourishForTitle("App Update")).toBe("app-update");
    expect(todoFlourishForTitle("Update App")).toBe("app-update");
  });

  it("Trash crumples, either phrasing", () => {
    expect(todoFlourishForTitle("Trash")).toBe("trash");
    expect(todoFlourishForTitle("Take Out Trash")).toBe("trash");
  });

  it("Break sighs — on a word boundary, so Breakfast never fires it", () => {
    expect(todoFlourishForTitle("Break")).toBe("break");
    expect(todoFlourishForTitle("Take a break")).toBe("break");
    expect(todoFlourishForTitle("Breakfast")).toBeNull();
    expect(todoFlourishForTitle("Breakfast Break")).toBe("break");
  });

  it("Feedback is not Feed", () => {
    expect(todoFlourishForTitle("Feedback")).toBeNull();
  });

  it("unmatched todos keep today's plain behaviour (null)", () => {
    // v338: "Read" moved OUT of this set — it has its own flourish
    // now (page-corner sparks). Plan, Ukulele, Ten Chapters stay null.
    for (const title of ["Plan", "Plan Day", "Ukulele", "Gardening", "Answer Question", "Ten Chapters", "Deodorant", "Ring"]) {
      expect(todoFlourishForTitle(title), title).toBeNull();
    }
    expect(todoFlourishForTitle("")).toBeNull();
  });
});

describe("v337 — the quiet list: devotional / therapy / medication todos never flourish", () => {
  it("names every quiet pattern", () => {
    for (const title of ["Pray", "Prayer", "Morning prayer", "Internal Permission", "External Permission", "Sleep", "Stitch Journal"]) {
      expect(isQuietTodoTitle(title), title).toBe(true);
      expect(todoFlourishForTitle(title), title).toBeNull();
    }
  });

  it("quiet wins even over a flourish word in the same title", () => {
    expect(todoFlourishForTitle("Prayer Breakfast")).toBeNull();
    expect(todoFlourishForTitle("Sleep — no coffee after 2pm")).toBeNull();
  });
});

describe("v337 — the settle map", () => {
  it("Break sinks (never jolts), Trash crumples, Photo bursts only", () => {
    expect(TODO_FLOURISH_SETTLE.break).toBe("sink");
    expect(TODO_FLOURISH_SETTLE.trash).toBe("crumple");
    expect(TODO_FLOURISH_SETTLE.photo).toBe("none");
  });

  it("everything else bursts only (v364: the jolt is gone)", () => {
    // v364 amendment (Oct 30): was "everything else jolts" — the
    // six ids below used to settle with the little side-to-side
    // "no" shake (read had joined that family in v338) until
    // Jonathan asked for the shake to be taken away. They are all
    // "none" now: the burst is the whole performance.
    const burstOnly: TodoFlourishId[] = ["feed", "duolingo", "caffeine", "brush-teeth", "app-update", "read"];
    for (const id of burstOnly) expect(TODO_FLOURISH_SETTLE[id], id).toBe("none");
  });

  it("no flourish id maps to the jolt anymore, while sink and crumple stand (v364)", () => {
    for (const id of Object.keys(TODO_FLOURISH_SETTLE) as TodoFlourishId[]) {
      expect(TODO_FLOURISH_SETTLE[id], id).not.toBe("jolt");
    }
    expect(TODO_FLOURISH_SETTLE.break).toBe("sink");
    expect(TODO_FLOURISH_SETTLE.trash).toBe("crumple");
  });

  it("coffee's settle rides the caffeine round (burst only since v364)", () => {
    // v364 amendment (Oct 30): was "coffee's settle is the caffeine
    // round's Jolt" (caffeine settled "jolt"); with the jolt
    // removed, coffee — the caffeine round — settles "none".
    expect(TODO_FLOURISH_SETTLE.caffeine).toBe("none");
  });
});

describe("v337 — the performance contract, in the kit itself", () => {
  it("one burst is a single readable performance", () => {
    expect(TODO_FLOURISH_DURATION_MS).toBeGreaterThan(0);
    // RE-BASED (v360): v337's under-a-second contract was the
    // drawing's; on device the bursts blinked past ("so freaking
    // quick" — Jonathan, Oct 30), and the duration rose to 2400ms
    // at his word.
    // RE-BASED (v368): at 2400ms the completed row hung around
    // too long after the burst ("feels like forever" — Jonathan,
    // Oct 30); the duration is now 1500ms, inside his "a second
    // or two". The contract that survives: one burst, one
    // timing, over in a single short performance.
    expect(TODO_FLOURISH_DURATION_MS).toBe(1500);
    expect(TODO_FLOURISH_DURATION_MS).toBeLessThan(3000);
  });

  it("every flourish is built from ≤ a dozen pieces", () => {
    for (const [id, particles] of Object.entries(TODO_FLOURISH_PARTICLES)) {
      expect(particles.length, id).toBeGreaterThan(0);
      expect(particles.length, id).toBeLessThanOrEqual(12);
    }
  });

  it("every particle finishes inside the burst (delay + span ≤ 1)", () => {
    for (const [id, particles] of Object.entries(TODO_FLOURISH_PARTICLES)) {
      for (const p of particles) {
        expect(p.delay, `${id}/${p.kind}`).toBeGreaterThanOrEqual(0);
        expect(p.delay + p.span, `${id}/${p.kind}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("coffee and feed share the fizz geometry family (bubble counts match)", () => {
    expect(TODO_FLOURISH_PARTICLES.caffeine.every((p) => p.kind === "bubble")).toBe(true);
    expect(TODO_FLOURISH_PARTICLES.feed.every((p) => p.kind === "bubble")).toBe(true);
    expect(TODO_FLOURISH_PARTICLES.caffeine).toHaveLength(TODO_FLOURISH_PARTICLES.feed.length);
  });
});

describe("v337 — the toggle-event bus", () => {
  it("delivers emissions to subscribers and stops after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTodoFlourish(listener);
    emitTodoFlourish({ flourish: "feed", color: "#EF4444", anchor: { x: 40, y: 120 } });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({ flourish: "feed", color: "#EF4444", anchor: { x: 40, y: 120 } });
    unsubscribe();
    emitTodoFlourish({ flourish: "trash", color: "#EF4444", anchor: { x: 1, y: 2 } });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("every emission carries a unique id (bursts are keyed to events, not rows)", () => {
    const ids = new Set<string>();
    const unsubscribe = subscribeTodoFlourish((event) => ids.add(event.id));
    emitTodoFlourish({ flourish: "photo", color: "#EF4444", anchor: { x: 0, y: 0 } });
    emitTodoFlourish({ flourish: "photo", color: "#EF4444", anchor: { x: 0, y: 0 } });
    unsubscribe();
    expect(ids.size).toBe(2);
  });
});

describe("v337 — source pins: one-shot, native driver, wired to the toggles", () => {
  const overlay = read("components/todo-flourish-overlay.tsx");
  const schedule = read("components/schedule-tab.tsx");
  const layout = read("app/_layout.tsx");

  it("the overlay animates ONLY on the native driver", () => {
    expect(overlay).toContain("useNativeDriver: true");
    expect(overlay).not.toContain("useNativeDriver: false");
  });

  it("the overlay is one-shot: no interval, no repeat, no loop", () => {
    expect(overlay).not.toContain("setInterval");
    expect(overlay).not.toContain("withRepeat");
    expect(overlay).not.toContain("Animated.loop");
  });

  it("the overlay subscribes to the bus and unmounts bursts on completion", () => {
    expect(overlay).toContain("subscribeTodoFlourish");
    expect(overlay).toContain("TODO_FLOURISH_DURATION_MS");
    expect(overlay).toContain("current.filter((burst) => burst.id !== event.id)");
  });

  it("the overlay never takes touches", () => {
    expect(overlay).toContain('pointerEvents="none"');
  });

  it("the overlay is mounted once at the app root, beside the XP floater", () => {
    expect(layout).toContain("TodoFlourishOverlay");
  });

  it("the schedule fires flourishes from its toggle paths, guarded to completing only", () => {
    expect(schedule).toContain("todoFlourishForTitle(todo.title)");
    expect(schedule).toContain("if (!todo.isCompleted) fireRowFlourish(position)");
    expect(schedule).toContain("if (!subtask.isCompleted) fireSubtaskFlourish(subtask, position)");
    // RE-BASED (v348, Oct 29): the pair press no longer hands its
    // position to the flourish — v348 anchors the burst at the
    // pair's measured checkbox (the fingertip anchor buried the
    // burst mid-card; see todo-flourish-v348.test.ts). The press
    // position still goes to the XP award at the same seat.
    // RE-BASED (v351, Oct 29): the press hands its SEAT over
    // again — page position plus locationX/Y — because the live
    // measure it replaced could silently never call back (see
    // todo-flourish-v351.test.ts). The anchor is computed to the
    // pair's checkbox from the rectangle's cached layout size;
    // the raw page point is only the no-cache fallback, and it
    // still goes to the XP award at the same seat.
    expect(schedule).toContain("firePairFlourish(t, position);");
    expect(schedule).toContain("emitTodoFlourish");
  });

  it("the settle wrapper exists for the row transforms (sink / crumple)", () => {
    expect(overlay).toContain("FlourishSettleView");
    // v364 amendment (Oct 30): this pin used to require '"jolt"'
    // in the overlay source; the jolt branch was removed at
    // Jonathan's word, so the pin now requires its absence.
    expect(overlay).not.toContain('"jolt"');
    expect(overlay).toContain('"sink"');
    expect(overlay).toContain('"crumple"');
    expect(schedule).toContain("FlourishSettleView");
  });
});
