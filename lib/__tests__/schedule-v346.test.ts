// ─────────────────────────────────────────────────────────────────────────────
// v346 — THE SCHEDULE TAB STOPS WIPING ITS OWN EVENTS.
//
// The investigation (Oct 29, 2026, code-proven + simulation-verified):
// Studio imports wrote events correctly, then the events vanished.
// Device proof: his Oct 29 10:37 backup held events as literally "[]"
// with 444 todos and 32 ministries intact.
//
// THE MECHANISM: there is no Schedule route — the shell lazy-mounts
// only the active tab, so ScheduleTab unmounts and remounts on every
// Schedule-tab entry. Its save-on-change effects were UNGUARDED: on
// every mount they ran with the initial useState([]) and wrote that
// empty state to storage before / racing the async mount load. The
// events save is the FIRST effect after the load — the tightest race —
// so events lost almost every time; the todos / ministries saves are
// declared later, so the load usually won for them. That declaration
// order is why the loss was kind-selective. The worship saves in the
// same file already carried the correct pattern (a hydration flag);
// it was never applied to the schedule stores.
//
// THE FIX (smallest correct change): one isScheduleHydrated flag,
// set at the end of the mount loadData(), and the five schedule save
// effects (events / todos / ministries / bibleStudies /
// timeBlockColors) early-return until it is set — the worship
// pattern's exact mechanics. Post-hydration behaviour is unchanged:
// every save that happened before still happens, same values.
//
// These pins bind the shipped source to that shape, and a small
// logic replica models the mount-order race the guard closes.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const scheduleTab = read("components/schedule-tab.tsx");

// The block of one save effect: from its useEffect opening to the
// closing of its dependency array, located by its setItem line.
const effectBlockFor = (setItemNeedle: string) => {
  const at = scheduleTab.indexOf(setItemNeedle);
  expect(at).toBeGreaterThan(-1);
  const start = scheduleTab.lastIndexOf("useEffect(() => {", at);
  const depsEnd = scheduleTab.indexOf("]);", at);
  expect(start).toBeGreaterThan(-1);
  expect(depsEnd).toBeGreaterThan(at);
  return scheduleTab.slice(start, depsEnd + 3);
};

const FIVE_SAVES: Array<{ label: string; needle: string; state: string }> = [
  { label: "events", needle: "AsyncStorage.setItem(SCHEDULE_EVENTS_KEY, JSON.stringify(events))", state: "events" },
  { label: "todos", needle: "AsyncStorage.setItem(SCHEDULE_TODOS_KEY, JSON.stringify(todos))", state: "todos" },
  { label: "ministries", needle: "AsyncStorage.setItem(SCHEDULE_MINISTRIES_KEY, JSON.stringify(ministries))", state: "ministries" },
  { label: "bibleStudies", needle: "AsyncStorage.setItem(SCHEDULE_BIBLE_STUDIES_KEY, JSON.stringify(bibleStudies))", state: "bibleStudies" },
  { label: "timeBlockColors", needle: "AsyncStorage.setItem('SCHEDULE_TIME_BLOCK_COLORS_KEY', JSON.stringify(timeBlockColors))", state: "timeBlockColors" },
];

describe("v346 — the flag", () => {
  it("starts unhydrated", () => {
    expect(scheduleTab).toContain(
      "const [isScheduleHydrated, setIsScheduleHydrated] = useState(false);",
    );
  });

  it("is set exactly once — at the end of the mount load, beside the worship flags", () => {
    const occurrences = scheduleTab.split("setIsScheduleHydrated(true)").length - 1;
    expect(occurrences).toBe(1);
    expect(scheduleTab).not.toContain("setIsScheduleHydrated(false)");

    const loadStart = scheduleTab.indexOf("const loadData = async () => {");
    const loadEnd = scheduleTab.indexOf("loadData();", loadStart);
    expect(loadStart).toBeGreaterThan(-1);
    expect(loadEnd).toBeGreaterThan(loadStart);
    const loadSlice = scheduleTab.slice(loadStart, loadEnd);
    const finallyAt = loadSlice.indexOf("} finally {");
    expect(finallyAt).toBeGreaterThan(-1);
    const finallySlice = loadSlice.slice(finallyAt);
    expect(finallySlice).toContain("setIsScheduleHydrated(true);");
    expect(finallySlice).toContain("setIsWorshipExpansionHydrated(true);");
    expect(finallySlice).toContain("setIsWorshipTrackCompletionsHydrated(true);");
  });
});

describe("v346 — the five schedule saves are guarded", () => {
  for (const { label, needle, state } of FIVE_SAVES) {
    it(`${label}: early-returns before the write until hydrated, flag in deps`, () => {
      const block = effectBlockFor(needle);
      const guardAt = block.indexOf("if (!isScheduleHydrated) return;");
      const writeAt = block.indexOf(needle);
      expect(guardAt).toBeGreaterThan(-1);
      expect(guardAt).toBeLessThan(writeAt);
      expect(block).toContain(`}, [isScheduleHydrated, ${state}]);`);
    });
  }

  it("no other save effect in the save block carries the schedule guard (scope)", () => {
    const saveStart = scheduleTab.indexOf("// Save data");
    const saveEnd = scheduleTab.indexOf("// Derived data for selected date", saveStart);
    expect(saveStart).toBeGreaterThan(-1);
    expect(saveEnd).toBeGreaterThan(saveStart);
    const saveBlock = scheduleTab.slice(saveStart, saveEnd);
    expect(saveBlock.split("if (!isScheduleHydrated) return;").length - 1).toBe(5);
    // Out-of-scope saves stay exactly as they were.
    expect(effectBlockFor("AsyncStorage.setItem('PRAYERS_KEY', JSON.stringify(prayers))")).not.toContain(
      "isScheduleHydrated",
    );
    expect(
      effectBlockFor("AsyncStorage.setItem('WORSHIP_LIST_LINKS_KEY', JSON.stringify(worshipListLinks))"),
    ).not.toContain("isScheduleHydrated");
  });

  it("the worship guards keep their own flags (untouched pattern)", () => {
    expect(
      effectBlockFor("AsyncStorage.setItem(WORSHIP_EXPANSION_STATE_KEY, JSON.stringify(worshipExpansionByDate))"),
    ).toContain("if (!isWorshipExpansionHydrated) return;");
    expect(
      effectBlockFor("AsyncStorage.setItem(WORSHIP_TRACK_COMPLETION_STATE_KEY, JSON.stringify(worshipTrackCompletions))"),
    ).toContain("if (!isWorshipTrackCompletionsHydrated) return;");
  });
});

describe("v346 — the race, modelled", () => {
  // A logic replica of the shipped effect shape: the guard line first,
  // then the write. Mount order on every tab entry is: effects run
  // with the initial state, THEN the async load resolves.
  const runSaveEffect = (hydrated: boolean, state: unknown, storage: { value: string }) => {
    if (!hydrated) return;
    storage.value = JSON.stringify(state);
  };

  it("pre-hydration, the mount write of the initial [] cannot reach storage", () => {
    const imported = JSON.stringify([{ id: "evt-1", title: "Lunch" }]);
    const storage = { value: imported };
    // Mount: the events save fires with the initial empty state.
    runSaveEffect(false, [], storage);
    expect(storage.value).toBe(imported);
  });

  it("post-hydration, the loaded state writes exactly as before", () => {
    const storage = { value: "[]" };
    const loaded = [{ id: "evt-1", title: "Lunch" }];
    runSaveEffect(true, loaded, storage);
    expect(storage.value).toBe(JSON.stringify(loaded));
    // And later edits keep saving, unchanged.
    const edited = [...loaded, { id: "evt-2", title: "Dinner" }];
    runSaveEffect(true, edited, storage);
    expect(storage.value).toBe(JSON.stringify(edited));
  });
});
