import { useColorScheme } from "@/hooks/use-color-scheme";
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

// v256: the front door's own hook — the mockup supplies the
// structure and the Classic-light instance; the family DERIVES from
// the live Settings seed (useColors reads the theme context, so a
// palette change re-dresses the page without a restart) × the
// appearance (useColorScheme — light AND dark both derive). Only
// the People page's front door, roster, app-bar bell, and the
// Classic tab bar read this family; the editor, profile, bell panel
// default, and session keep the palette family above.

export function usePeopleFrontDoor(): PeopleFrontDoorFamily {
  const colors = useColors();
  const scheme = useColorScheme();
  return derivePeopleFrontDoor(colors.primary, scheme === "dark" ? "dark" : "light");
}
