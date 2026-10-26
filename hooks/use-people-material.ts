import { useColors } from "@/hooks/use-colors";
import {
  derivePeopleFrontDoor,
  derivePeopleMaterial,
  type PeopleFrontDoorFamily,
  type PeopleMaterialFamily,
} from "@/lib/people-material";

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

// v255: the front door's own hook — the mockup's light language,
// seeded from the active palette's primary (lib/people-material.ts's
// derivePeopleFrontDoor). Only the People page's front door and
// roster read this family; the editor, profile, bell panel default,
// and session keep the palette family above.

export function usePeopleFrontDoor(): PeopleFrontDoorFamily {
  const colors = useColors();
  return derivePeopleFrontDoor(colors.primary);
}
