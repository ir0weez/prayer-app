/**
 * v513 — the Journal FAB's menu (Concept 1, "Spring Stack";
 * Jonathan's pick + build word, Nov 12, from
 * journal-fab-concepts-v1.html).
 *
 * The six entry kinds as the shared FAB's spring menu reads
 * them: listed TOP-TO-BOTTOM as they stand over the button —
 * Verse farthest, Entry nearest the FAB (the shared menu's
 * stagger leads with the nearest item, so Entry springs first).
 *
 * The dress is the drawing's own, in the Journal family's roles:
 * Entry — the kind he writes most — wears the full seed with a
 * white pen; the other five wear the family's tonal fill with
 * seed-deep icons (the mockup's tonal circles, derived — never
 * the drawing's sampled hexes). The icons are the drawing's
 * glyphs in MaterialIcons names: pen, flame, heart outline,
 * circled check, star, open book.
 */

import type { FabMenuItem } from "@/components/schedule-fab";
import { DESK_POST_KIND_LABELS, type DeskPostKind } from "@/lib/journal-desk";
import type { JournalMaterialFamily } from "@/lib/journal-material";

/** The drawing's glyph per kind (MaterialIcons names). */
export const JOURNAL_FAB_KIND_ICONS: Record<DeskPostKind, string> = {
  entry: "edit",
  fast: "whatshot",
  prayer: "favorite-border",
  answered: "check-circle",
  gratitude: "star",
  verse: "menu-book",
};

export function journalFabItems(
  jm: JournalMaterialFamily,
  onPick: (kind: DeskPostKind) => void,
): FabMenuItem[] {
  const tonal = (kind: DeskPostKind): FabMenuItem => ({
    key: kind,
    label: DESK_POST_KIND_LABELS[kind],
    icon: JOURNAL_FAB_KIND_ICONS[kind],
    color: jm.tonal,
    iconColor: jm.deep,
    onPress: () => onPick(kind),
  });
  return [
    tonal("verse"),
    tonal("gratitude"),
    tonal("answered"),
    tonal("prayer"),
    tonal("fast"),
    {
      key: "entry",
      label: DESK_POST_KIND_LABELS.entry,
      icon: JOURNAL_FAB_KIND_ICONS.entry,
      color: jm.seed,
      onPress: () => onPick("entry"),
    },
  ];
}
