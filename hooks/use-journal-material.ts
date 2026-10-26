import { useColors } from "@/hooks/use-colors";
import { deriveJournalMaterial, type JournalMaterialFamily } from "@/lib/journal-material";

// v252: the Journal family's hook — the active palette in, the
// seed-derived Material family out (lib/journal-material.ts holds
// the pure derivation; this hook is its only React-bound piece).

export function useJournalMaterial(): JournalMaterialFamily {
  const colors = useColors();
  return deriveJournalMaterial(colors.primary, {
    background: colors.background,
    surface: colors.surface,
    foreground: colors.foreground,
    muted: colors.muted,
    border: colors.border,
  });
}
