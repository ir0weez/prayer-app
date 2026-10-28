// ─── Tab bar metrics (v306) ────────────────────────────────────────
// One home for the tab bar's vertical math, so the bar itself and
// every seat derived from it (schedule FAB, journal FAB, devotional
// pill, Bible-screen clearance) can never drift apart.
//
// v306: the Classic bar honours the bottom safe-area inset. It used
// to sit at bottom: 0 with a flat 20px bottom pad — on gesture-nav
// devices the system gesture line lives inside that pad, so the
// labels crowded the screen's edge and the line ran under them
// (Jonathan, Oct 28, screenshot 10824). The pad now spends the
// inset FIRST and keeps drawn air on top of it: max(20, inset + 10).
// The bar's background still extends to the screen's foot; only
// its content rises.
export const TAB_BAR_CLASSIC_TOP_PAD = 13;
export const TAB_BAR_CLASSIC_CELL_HEIGHT = 58;
export const TAB_BAR_CLASSIC_BOTTOM_PAD = 20;
export const TAB_BAR_INSET_AIR = 10;
/** The skins' floating bar: bottom 52 + height 74 → top edge 126. */
export const TAB_BAR_FLOATING_OCCUPIED = 126;

export function classicTabBarBottomPad(insetBottom: number): number {
  return Math.max(TAB_BAR_CLASSIC_BOTTOM_PAD, insetBottom + TAB_BAR_INSET_AIR);
}

export function tabBarOccupiedHeight(isClassic: boolean, insetBottom: number): number {
  return isClassic
    ? TAB_BAR_CLASSIC_TOP_PAD + TAB_BAR_CLASSIC_CELL_HEIGHT + classicTabBarBottomPad(insetBottom)
    : TAB_BAR_FLOATING_OCCUPIED;
}
