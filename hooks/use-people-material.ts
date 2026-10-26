import { useColors } from "@/hooks/use-colors";
import { derivePeopleMaterial, type PeopleMaterialFamily } from "@/lib/people-material";

// v254: the People family's hook — the active palette in, the
// seed-derived Material family out (lib/people-material.ts holds the
// pure derivation; this hook is its only React-bound piece).

export function usePeopleMaterial(): PeopleMaterialFamily {
  const colors = useColors();
  return derivePeopleMaterial(colors.primary, {
    background: colors.background,
    surface: colors.surface,
    foreground: colors.foreground,
    muted: colors.muted,
    border: colors.border,
  });
}
