/**
 * v232 — "Strip, Removed". Jonathan, Oct 24, 12:26 PDT: the v226 bell
 * header strip (Now/Next line + due faces + bell with badge) mounted
 * above the tabs — "Remove the whole strip." His explicit pick.
 *
 * These pins hold the removal: the tab layout is back to its pre-v226
 * shape (Tabs returned directly, no wrapper, no mount), while the
 * bell math and component stay in the repo, dead but kept, so the
 * strip can return if he ever asks. The due-math pins themselves
 * live in bell-header-v226.test.ts and stay untouched.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("v232 — the bell strip no longer rides the tabs", () => {
  it("the (tabs) layout never imports or renders BellHeader", () => {
    const layout = read("app/(tabs)/_layout.tsx");
    expect(layout).not.toContain("BellHeader");
    expect(layout).not.toContain("components/bell-header");
  });

  it("the layout returns the Tabs navigator directly (pre-v226 shape)", () => {
    const layout = read("app/(tabs)/_layout.tsx");
    expect(layout).not.toContain('from "react-native"');
    expect(layout).toContain('backBehavior="history"');
    expect(layout).toContain('name="index"');
    expect(layout).toContain('name="person"');
  });

  it("the bell math and component are kept in the repo, just unmounted", () => {
    expect(existsSync(join(process.cwd(), "lib/bell-header.ts"))).toBe(true);
    expect(existsSync(join(process.cwd(), "components/bell-header.tsx"))).toBe(true);
    expect(read("components/bell-header.tsx")).toContain("export function BellHeader()");
  });
});
