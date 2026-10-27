import { useColors } from "@/hooks/use-colors";
import { deriveBudgetMaterial, type BudgetMaterialFamily } from "@/lib/budget-material";

// v286: the Budget family's hook — the active palette in, the
// seed-derived Material family out (lib/budget-material.ts holds
// the pure derivation; this hook is its only React-bound piece),
// mirroring hooks/use-journal-material.ts.

export function useBudgetMaterial(): BudgetMaterialFamily {
  const colors = useColors();
  return deriveBudgetMaterial(colors.primary, {
    background: colors.background,
    surface: colors.surface,
    foreground: colors.foreground,
    muted: colors.muted,
    border: colors.border,
  });
}
