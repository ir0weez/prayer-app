// ─── v362 — the Drive "Data pill" false alarm, fixed at the source ─────────
// Jonathan, Oct 30: "I'm tired of this little 'Data' pill showing
// up every time I open the app. The folder has been connected
// since I've been able to connect folders. It pops up EVERY TIME!"
//
// The v360 mechanism: the silent launch check ran checkDriveFolder
// at every open, and checkDriveFolder treated ANY throw from the
// folder's directory read as permissionLost = true. At cold start
// the Drive provider is routinely not awake yet, so the read threw
// on a linked, healthy folder — and with no memory anywhere in the
// path, the toast fired again at every launch, forever.
//
// The fix, in two parts (the check itself, the apply/held
// behaviour, and the journal are untouched):
//  1. VERIFY BEFORE DECLARING LOSS. The directory read gets one
//     retry after a short wait (the SAF surface this module wraps
//     exposes no persisted-permission query, so the retry IS the
//     verification). Only a read that fails twice is a loss.
//  2. THE NOTICE REMEMBERS. checkDriveFolder persists whether the
//     loss notice has already been shown for the current unbroken
//     run of failed checks and reports it as
//     permissionLostNoticeDue: true only for the first verified
//     loss since the folder last checked clean. A clean check
//     re-arms it. The silent launch toast keys off the notice
//     flag; manual checks keep keying off permissionLost itself,
//     so Settings → DATA keeps its every-time alert and true
//     state.
//
// These pins drive the real checkDriveFolder against a fake SAF
// whose directory reads fail on a script.

import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  },
}));

vi.mock("react-native", () => ({ Platform: { OS: "android" } }));

const safScript = vi.hoisted(() => ({ readCalls: 0, failuresBeforeSuccess: 0, alwaysFail: false }));
vi.mock("expo-file-system/legacy", () => ({
  StorageAccessFramework: {
    readDirectoryAsync: async () => {
      safScript.readCalls += 1;
      if (safScript.alwaysFail || safScript.readCalls <= safScript.failuresBeforeSuccess) {
        throw new Error("the provider is not awake yet");
      }
      return [];
    },
    readAsStringAsync: async () => "",
    requestDirectoryPermissionsAsync: async () => ({ granted: false, directoryUri: "" }),
  },
}));

import { checkDriveFolder, DRIVE_LINK_KEY, DRIVE_NOTICE_KEY } from "../bible-v205/drive-folder";

beforeEach(() => {
  store.clear();
  store.set(DRIVE_LINK_KEY, JSON.stringify({ uri: "content://com.google.android.apps.docs.storage/tree/primary%3APrayerCircle", name: "PrayerCircle" }));
  safScript.readCalls = 0;
  safScript.failuresBeforeSuccess = 0;
  safScript.alwaysFail = false;
});

describe("v362 — a transient cold-start failure is not a lost permission", () => {
  it("first read throws, the retry succeeds: no loss, no notice, and the folder was read twice", async () => {
    safScript.failuresBeforeSuccess = 1;
    const summary = await checkDriveFolder();
    expect(safScript.readCalls).toBe(2);
    expect(summary.linked).toBe(true);
    expect(summary.permissionLost).toBe(false);
    expect(summary.permissionLostNoticeDue).toBe(false);
  }, 15000);
});

describe("v362 — a genuine loss speaks once per loss run, not at every open", () => {
  it("two consecutive failed launch checks: permissionLost both times, the notice due only the first", async () => {
    safScript.alwaysFail = true;
    const first = await checkDriveFolder();
    expect(first.permissionLost).toBe(true);
    expect(first.permissionLostNoticeDue).toBe(true);
    const second = await checkDriveFolder();
    expect(second.permissionLost).toBe(true);
    expect(second.permissionLostNoticeDue).toBe(false);
    expect(store.get(DRIVE_NOTICE_KEY)).toContain("true");
  }, 20000);

  it("a clean check re-arms the notice: the next real loss is due again", async () => {
    safScript.alwaysFail = true;
    const lost = await checkDriveFolder();
    expect(lost.permissionLostNoticeDue).toBe(true);
    safScript.alwaysFail = false;
    const clean = await checkDriveFolder();
    expect(clean.permissionLost).toBe(false);
    safScript.alwaysFail = true;
    const lostAgain = await checkDriveFolder();
    expect(lostAgain.permissionLost).toBe(true);
    expect(lostAgain.permissionLostNoticeDue).toBe(true);
  }, 20000);
});
