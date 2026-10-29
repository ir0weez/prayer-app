/**
 * v316 — Text size, for real. The v315 Settings rebuild shipped
 * the approved drawing WITHOUT its Text size control: the builder
 * found no text-size mechanism anywhere in the app and omitted the
 * control rather than fake one. Jonathan's word on the omission:
 * "Add everything that's missing. I want it all." This module is
 * the mechanism.
 *
 * THE AUDIT (why it is built this way):
 *  - There is no shared Text component in this codebase — 220+
 *    files import Text straight from "react-native", and there are
 *    ~2,450 literal fontSize values across app/ and components/.
 *  - The skin type scales (CLASSIC_TYPE_SCALE & friends in
 *    lib/skin-themes.ts) are real, but only a dozen files consume
 *    them; threading a factor through thousands of literal style
 *    sites by hand would be unverifiable and would still miss
 *    every surface nobody touched.
 *  - The ONE seam that reaches all of it is the Text component
 *    itself. React Native 0.81's public export is a getter that
 *    re-reads `require('react-native/Libraries/Text/Text').default`
 *    on EVERY access, and no file in the app destructures Text at
 *    module scope — so substituting that one default export puts a
 *    single, tested transform in front of every <Text> the app
 *    renders, on every surface (People, Schedule, Study/Bible,
 *    Journal, Fasting, More, Settings, and every stack screen),
 *    for every skin. The transform multiplies the style's fontSize
 *    and lineHeight by the live factor; rows grow because line
 *    heights scale with the type, and nothing is pinned to a fixed
 *    height by this layer.
 *
 * The factor lives in a tiny external store. The theme provider
 * owns the persisted preference (prayercircle.app-settings.v1,
 * mirrored by the Settings screen like appearance/accent/skin)
 * and pushes factor changes into the store; ScaledText subscribes
 * via useSyncExternalStore, so flipping the setting re-renders
 * every Text in the app live, with no restart. At factor 1
 * ("Default") ScaledText renders the original component with the
 * original props object untouched — byte-identical behaviour.
 *
 * NAMED CORNERS (not reached by the substitution, honestly):
 *  - Animated.Text (16 call sites): RN's Animated module captures
 *    the original Text when IT is created, before this patch can
 *    install, so animated texts keep the size they were authored
 *    at.
 *  - TextInput: user-entered text keeps its authored size, so
 *    form geometry (which is fenced by field height, not by text)
 *    never shifts under the typist's thumbs. Labels around inputs
 *    are Text and DO scale.
 *  - The native emergency timer pill is drawn by the Kotlin
 *    module, not by React Native Text.
 *
 * The substitution is installed defensively at module scope: any
 * environment where the seam is not patchable (a frozen module
 * namespace, a test double, the web bundler's ESM interop) simply
 * keeps the stock Text — the setting then has no effect there
 * rather than the app failing to start. It can never throw.
 */
import * as React from "react";
import * as ReactNativeNamespace from "react-native";
import { StyleSheet, Text as CapturedPublicText } from "react-native";
import type { StyleProp, TextProps, TextStyle } from "react-native";

export type TextSizePreference = "small" | "default" | "large" | "xl";

/**
 * The four factors. The app's base type is already deliberately
 * large (the v190/v274 "bigger" scales), so the steps are kept
 * fence-safe: XL at 1.22 grows display lines and verse rails
 * without pushing two-digit numerals out of their rails, and
 * lineHeight scales by the same factor so rows grow instead of
 * clipping.
 */
export const TEXT_SIZE_FACTORS: Record<TextSizePreference, number> = {
  small: 0.9,
  default: 1,
  large: 1.12,
  xl: 1.22,
};

export function normalizeTextSizePreference(value: unknown): TextSizePreference {
  return value === "small" || value === "large" || value === "xl" ? value : "default";
}

export function textScaleFactor(preference: TextSizePreference): number {
  return TEXT_SIZE_FACTORS[preference] ?? 1;
}

// ─── The live factor store ──────────────────────────────────────
// Module-level on purpose: ScaledText must re-render on a factor
// change without every screen re-subscribing through context, and
// the provider pushes changes in from its effect.

let currentFactor = 1;
const factorListeners = new Set<() => void>();

export function getTextScaleFactor(): number {
  return currentFactor;
}

export function setTextScaleFactor(next: number): void {
  if (next === currentFactor) return;
  currentFactor = next;
  factorListeners.forEach((listener) => listener());
}

export function subscribeToTextScale(listener: () => void): () => void {
  factorListeners.add(listener);
  return () => {
    factorListeners.delete(listener);
  };
}

// ─── The pure style transform ───────────────────────────────────

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Multiplies a Text style's fontSize and lineHeight by the
 * factor. Registered styles and arrays are flattened first (the
 * cascade resolves to the same computed style; only the two size
 * fields change). At factor 1, or when the style carries neither
 * field, the ORIGINAL style value comes back untouched — same
 * reference — so Default is a true no-op.
 */
export function scaleTextStyle(
  style: StyleProp<TextStyle> | undefined,
  factor: number,
): StyleProp<TextStyle> | undefined {
  if (factor === 1 || style == null) return style;
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  if (!flat || (typeof flat.fontSize !== "number" && typeof flat.lineHeight !== "number")) {
    return style;
  }
  const scaled: TextStyle = { ...flat };
  if (typeof flat.fontSize === "number") scaled.fontSize = round2(flat.fontSize * factor);
  if (typeof flat.lineHeight === "number") scaled.lineHeight = round2(flat.lineHeight * factor);
  return scaled;
}

// ─── The substitute component ───────────────────────────────────
// The original Text, captured at this module's evaluation —
// BEFORE installTextScalePatch() runs below. (The compiled import
// reads the export once here; the local const can never become
// the wrapper itself, so there is no render recursion.)

const OriginalText = CapturedPublicText as unknown as React.ComponentType<TextProps>;

export function ScaledText(props: TextProps): React.ReactNode {
  const factor = React.useSyncExternalStore(
    subscribeToTextScale,
    getTextScaleFactor,
    getTextScaleFactor,
  );
  if (factor === 1) {
    return React.createElement(OriginalText, props);
  }
  return React.createElement(OriginalText, {
    ...props,
    style: scaleTextStyle(props.style, factor),
  });
}
ScaledText.displayName = "ScaledText";

// ─── The substitution ───────────────────────────────────────────

let textScalePatchInstalled = false;

/**
 * The substitution itself, as a pure operation on a Text
 * module object: replace its default export with ScaledText.
 * False when the object carries no patchable default. Split
 * out so the tests can pin the operation exactly; the module
 * RESOLUTION (which object is the app's Text module) is the
 * environment's business — Metro's registry on device, proven
 * by the getter in react-native's index.js.
 */
export function patchTextModuleDefault(textModule: unknown): boolean {
  if (!textModule || (typeof textModule !== "object" && typeof textModule !== "function")) {
    return false;
  }
  const candidate = textModule as { default?: unknown };
  if (candidate.default === (ScaledText as unknown)) return true;
  if (
    (typeof candidate.default !== "function" && typeof candidate.default !== "object") ||
    candidate.default === null
  ) {
    return false;
  }
  try {
    candidate.default = ScaledText;
  } catch {
    return false;
  }
  return candidate.default === (ScaledText as unknown);
}

/**
 * Points React Native's Text export at ScaledText. Primary seam:
 * the public getter re-reads the deep module's `.default` on
 * every access, so replacing it reaches every importer, however
 * their imports were compiled. Fallback seam: redefine the
 * property on the public namespace object itself. Idempotent;
 * returns whether the patch is in place; never throws.
 */
export function installTextScalePatch(): boolean {
  if (textScalePatchInstalled) return true;
  try {
    const textModule = require("react-native/Libraries/Text/Text") as { default?: unknown } | null;
    if (patchTextModuleDefault(textModule)) {
      textScalePatchInstalled = true;
      return true;
    }
  } catch {
    // The deep module is unreachable in this environment (test
    // doubles, exotic bundlers) — try the namespace seam below.
  }
  try {
    const namespace = ReactNativeNamespace as unknown as Record<string, unknown>;
    const descriptor = Object.getOwnPropertyDescriptor(namespace, "Text");
    if (descriptor && (descriptor.configurable || descriptor.writable)) {
      Object.defineProperty(namespace, "Text", {
        configurable: true,
        enumerable: true,
        writable: true,
        value: ScaledText,
      });
      textScalePatchInstalled = true;
      return true;
    }
  } catch {
    // A frozen namespace (pure-ESM interop) — the stock Text
    // stays, and the app runs exactly as it did before v316.
  }
  return textScalePatchInstalled;
}

// Installed at module scope: this module is imported by the theme
// provider (and by the Settings screen for the preference type),
// both of which evaluate before any screen renders.
installTextScalePatch();
