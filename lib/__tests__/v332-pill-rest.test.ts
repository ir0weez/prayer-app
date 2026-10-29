// ─────────────────────────────────────────────────────────────────────────────
// v332 — two small fixes, both with proven root causes (Oct 29):
//
// FIX 1 — PRAY TODAY PILL SEAT (People tab). The pill's Classic
// seat was a hardcoded bottom: 103 left over from v256, when the
// Classic tab bar occupied a flat 91. v306 raised the bar's
// occupied height by the safe-area inset (~105–111 on gesture-nav
// devices) and migrated every other derived seat (schedule FAB,
// journal FAB, devotional pill) to useTabBarOccupiedHeight + 12 —
// but missed this one, so the pill sat ON TOP of the tab bar
// (Jonathan, Oct 29, screenshot 10892). The Classic branch now
// derives from the same metric; the skins' floating-bar seat
// (140) is untouched.
//
// FIX 2 — REST SQUARE HOLD-FOR-OPTIONS. Every other schedule card
// opens a context menu on hold (Edit / Delete); the Rest square's
// long-press was wired at its call site straight into the event
// editor, so holding a Rest square skipped the menu and landed in
// the editor (Jonathan, Oct 29, screenshot 10893 — "hold for
// options still doesn't work for the Rest Squares"). RestSquare
// now carries MinistrySquare's anatomy: it owns its menu state,
// the ContextMenu renders as a SIBLING of the Pressable, and the
// props are onEdit / onDelete (EventCard parity — a rest is an
// event). Tap still toggles complete; delayLongPress stays 500.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { tabBarOccupiedHeight } from "../tab-bar-metrics";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const home = read("app/(tabs)/index.tsx");
const schedule = read("components/schedule-tab.tsx");

// RestSquare's own source, from its declaration to the next function.
const restSquareStart = schedule.indexOf("function RestSquare(");
const restSquareEnd = schedule.indexOf("function MinistrySquare(", restSquareStart);
const restSquare = schedule.slice(restSquareStart, restSquareEnd);

// RestSquare's only call site.
const restCallStart = schedule.indexOf("<RestSquare");
const restCallEnd = schedule.indexOf("/>", restCallStart);
const restCall = schedule.slice(restCallStart, restCallEnd);

describe("v332 fix 1 — the Pray Today pill seat derives from the tab bar metric", () => {
  it("at inset 24 the Classic seat computes to 117 (occupied 105 + 12 clearance)", () => {
    expect(tabBarOccupiedHeight(true, 24)).toBe(105);
    expect(tabBarOccupiedHeight(true, 24) + 12).toBe(117);
  });

  it("index.tsx imports and calls useTabBarOccupiedHeight", () => {
    expect(home).toContain('import { AppTabBar, useTabBarOccupiedHeight, type AppNavTab } from "@/components/app-tab-bar";');
    expect(home).toContain("const tabBarOccupied = useTabBarOccupiedHeight();");
  });

  it("the pill's Classic branch is tabBarOccupied + 12; the skins branch stays 140", () => {
    expect(home).toContain("bottom: isClassicSkin ? tabBarOccupied + 12 : 140,");
  });

  it("the stale v256 constant is gone", () => {
    expect(home).not.toContain("isClassicSkin ? 103 : 140");
  });
});

describe("v332 fix 2 — the Rest square's hold opens its own options menu", () => {
  it("RestSquare owns the MinistrySquare menu anatomy (state + sibling ContextMenu)", () => {
    expect(restSquareStart).toBeGreaterThan(-1);
    expect(restSquare).toContain("const [contextMenuVisible, setContextMenuVisible] = useState(false);");
    expect(restSquare).toContain("const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });");
    expect(restSquare).toContain("setContextMenuPos({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });");
    expect(restSquare).toContain("<ContextMenu");
    expect(restSquare).toContain("visible={contextMenuVisible}");
    expect(restSquare).toContain("onDismiss={() => setContextMenuVisible(false)}");
    // The menu renders after the Pressable closes — a sibling, not a child.
    expect(restSquare.indexOf("</Pressable>")).toBeLessThan(restSquare.indexOf("<ContextMenu"));
  });

  it("the hold opens the menu rather than the editor", () => {
    expect(restSquare).toContain("onLongPress={handleLongPress}");
    expect(restSquare).toContain("setContextMenuVisible(true);");
    expect(restSquare).not.toContain("openEventEditor");
    expect(restSquare).not.toContain("onLongPress,");
    expect(restSquare).not.toContain("onLongPress?:");
  });

  it("the menu is Edit + Delete, and Edit routes through the onEdit prop", () => {
    expect(restSquare).toContain("onEdit?: () => void;");
    expect(restSquare).toContain("onDelete?: () => void;");
    expect(restSquare).toContain("label: 'Edit',");
    expect(restSquare).toContain("onEdit();");
    expect(restSquare).toContain("label: 'Delete', icon: 'delete', onPress: onDelete, isDestructive: true");
  });

  it("the call site passes the editor as onEdit and the event delete-Alert as onDelete", () => {
    expect(restCall).toContain("onEdit={() => openEventEditor(restEvent)}");
    expect(restCall).toContain("onDelete={() => {");
    expect(restCall).toContain("'Delete Event',");
    expect(restCall).toContain("setEvents((prev) => prev.filter(e => e.id !== restEvent.id));");
    expect(restCall).not.toContain("onLongPress");
  });

  it("tap still toggles complete and the 500ms hold delay is untouched", () => {
    expect(restSquare).toContain("onPress={(e) => onPress?.({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}");
    expect(restSquare).toContain("delayLongPress={500}");
    expect(restCall).toContain("onPress={(position) => {");
    expect(restCall).toContain("setEvents((prev) => toggleEventCompleted(prev, restEvent.id));");
  });
});
