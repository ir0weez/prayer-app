import { useColors } from "@/hooks/use-colors";
import { deriveKeepMeOccupiedMaterial, type KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";

// v395: the Keep Me Occupied family's hook — the active palette in,
// the seed-derived Material family out (lib/keep-me-occupied-
// material.ts holds the pure derivation), mirroring
// hooks/use-budget-material.ts.

export function useKeepMeOccupiedMaterial(): KeepMeOccupiedMaterialFamily {
  const colors = useColors();
  return deriveKeepMeOccupiedMaterial(colors.primary, {
    background: colors.background,
    surface: colors.surface,
    foreground: colors.foreground,
    muted: colors.muted,
    border: colors.border,
  });
}
