/**
 * v416 — the Drive permission-lost copy names steps that exist.
 *
 * The v223-era alert told Jonathan to "Tap the Drive row and
 * choose Reconnect" — but the Drive row's menu has never offered
 * a Reconnect option (only Check now / Unlink / Cancel), so the
 * instruction sent him hunting for a button that does not exist
 * (his report, Nov 2, after unlinking, relinking, and checking
 * into exactly that alert). The alert and the v362 silent-loss
 * toast now name the real recovery: unlink the folder, then tap
 * the Drive row and pick the folder again (a fresh pick is also
 * what restores the grant and export writing). The toast's
 * once-per-loss-run policy (lib, v362) is untouched — only its
 * words changed.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const index = readFileSync(join(root, "app/(tabs)/index.tsx"), "utf8");

describe("v416 drive alert copy", () => {
  it("the permission-lost alert names the real steps", () => {
    expect(index).toContain(
      "PrayerCircle lost access to the linked folder. Unlink it in Settings → DATA, then tap the Drive row and pick the folder again.",
    );
  });

  it("the silent-loss toast names the same real action", () => {
    expect(index).toContain(
      "Drive: folder access lost — unlink and pick it again in Settings → DATA",
    );
  });

  it("no copy sends him to a Reconnect button that does not exist", () => {
    expect(index).not.toContain("choose Reconnect");
    expect(index).not.toContain("reconnect in Settings");
  });
});
