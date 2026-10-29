import { useColors } from "@/hooks/use-colors";
import {
  deriveNewsEmailMaterial,
  type NewsEmailMaterialFamily,
} from "@/lib/news-email-material";

// v336: the News & Email pages' hook — the active palette in, the
// seed-derived Material family out (lib/news-email-material.ts
// holds the pure derivation), mirroring hooks/use-budget-material.ts.
export function useNewsEmailMaterial(): NewsEmailMaterialFamily {
  const colors = useColors();
  return deriveNewsEmailMaterial(colors.primary, {
    background: colors.background,
    surface: colors.surface,
    foreground: colors.foreground,
    muted: colors.muted,
    border: colors.border,
  });
}
