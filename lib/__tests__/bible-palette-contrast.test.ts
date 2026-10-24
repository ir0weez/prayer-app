// ─── v220 Bible palette contrast — pins ──────────────────────────────────────
// The bug these pins exist to never repeat: the Bible palette read its
// ink off `colors.text`, a key the runtime palette does not carry (its
// ink key is `foreground`). The read was undefined for every scheme,
// accent, and skin, so React Native rendered the verse text black —
// fine on light pages, a 1.13:1 smear on the dark ones (classic dark
// paper #171022). The chrome around the verses carried its own colors
// and looked fine, which is why the page read as "styled" while the
// words were gone.
//
// Two guards, per the diagnosis:
//  (a) for every skin × scheme, the palette's resolved paper and the
//      ink from its own resolution (resolveBibleInk) clear WCAG 4.5:1 —
//      Terminal in the LIGHT scheme included, where the dark panel
//      forces the dark-scheme ink substitute;
//  (b) every key useBiblePalette reads off useColors is a defined,
//      non-empty string in getThemedPalette for both schemes and all
//      accent themes — the definedness check that would have caught
//      the missing `text` key at v205.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ACCENT_THEMES, getThemedPalette, type ColorScheme } from '../color-themes';
import { getSkinTokens, hexContrast, TERM_PANEL, type SkinThemeId } from '../skin-themes';
import { BIBLE_DARK_SCHEME_INK, resolveBibleInk } from '../bible-v205/palette-ink';

// v221: 'stainedglass' leaves the matrix with the skin itself
// (removed at Jonathan's call); the remaining four skins keep their
// ≥4.5 pins, Terminal-light fallback included.
const SKINS: SkinThemeId[] = ['classic', 'paper', '8bit', 'terminal'];
const SCHEMES: ColorScheme[] = ['light', 'dark'];

/** The chapter paper exactly as useBiblePalette resolves it. */
function resolvedPaper(skin: SkinThemeId, scheme: ColorScheme): string {
  const base = getThemedPalette(scheme, 'default');
  return getSkinTokens(skin, scheme, base).surface ?? base.background;
}

describe('v220 bible palette — verse ink clears 4.5:1 on every skin × scheme', () => {
  for (const skin of SKINS) {
    for (const scheme of SCHEMES) {
      it(`${skin} / ${scheme}: resolved ink reads on the resolved paper`, () => {
        const base = getThemedPalette(scheme, 'default');
        const paper = resolvedPaper(skin, scheme);
        const ink = resolveBibleInk(base.foreground, paper);
        expect(hexContrast(ink, paper)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('terminal / light: the dark panel forces the dark-scheme ink substitute', () => {
    const base = getThemedPalette('light', 'default');
    const paper = resolvedPaper('terminal', 'light');
    // Terminal's panel is dark in BOTH schemes — that is the trap.
    expect(paper).toBe(TERM_PANEL);
    // The naked pairing (light-scheme foreground on the dark tube) is
    // the v220 failure mode and must stay impossible.
    expect(hexContrast(base.foreground, paper)).toBeLessThan(4.5);
    const ink = resolveBibleInk(base.foreground, paper);
    expect(ink).toBe(BIBLE_DARK_SCHEME_INK);
    expect(hexContrast(ink, paper)).toBeGreaterThanOrEqual(4.5);
  });

  it('classic / dark: a foreground that already reads is kept untouched', () => {
    const base = getThemedPalette('dark', 'default');
    const paper = resolvedPaper('classic', 'dark');
    expect(resolveBibleInk(base.foreground, paper)).toBe(base.foreground);
  });
});

describe('v220 bible palette — every key useBiblePalette reads is defined', () => {
  // The exact keys components/bible-v205/palette.ts reads off
  // useColors(): background (paper + isDark), surface (paper2),
  // foreground (ink), muted (inkSoft), border (line).
  const KEYS = ['background', 'surface', 'foreground', 'muted', 'border'];

  for (const scheme of SCHEMES) {
    for (const theme of ACCENT_THEMES) {
      it(`${theme.id} / ${scheme}: all five keys are non-empty strings`, () => {
        const palette = getThemedPalette(scheme, theme.id);
        for (const key of KEYS) {
          expect(typeof palette[key]).toBe('string');
          expect(palette[key].length).toBeGreaterThan(0);
        }
      });
    }
  }
});

describe('v220 bible palette — wiring pins', () => {
  it('palette.ts: ink comes from foreground via resolveBibleInk, never colors.text', () => {
    const src = readFileSync(join(process.cwd(), 'components/bible-v205/palette.ts'), 'utf8');
    expect(src).toContain('ink: resolveBibleInk(colors.foreground, paper)');
    expect(src).not.toContain('colors.text');
  });
});
