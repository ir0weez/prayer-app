/**
 * v316 — Text size, for real. The v315 Settings rebuild shipped
 * the approved drawing WITHOUT its Text size control: the builder
 * found no text-size mechanism anywhere in the app and omitted the
 * control rather than fake one. Jonathan's word on the omission:
 * "Add everything that's missing. I want it all." This module is
 * the mechanism.
 *
 * v321 — WHY v316 NEVER REACHED THE DEVICE (his verdict,
 * 2026-10-28 20:18, screenshots 10867/10868: XL and Default render
 * identically, Settings' own labels included). The v316 installer
 * patched the wrong objects and never checked the one expression
 * every screen evaluates:
 *  - App code compiled by this repo's Babel reads Text as a
 *    property access on the REAL exports object of
 *    `require("react-native")` at render time (`_reactNative.Text`
 *    — verified against babel.config.js). Whoever owns that
 *    object's `Text` property owns every screen.
 *  - v316's fallback seam instead ran Object.defineProperty on
 *    a namespace import of the package — which Babel compiles to
 *    `_interopRequireWildcard(require("react-native"))`, a
 *    per-module SNAPSHOT COPY of the exports. Redefining `Text`
 *    on the copy changed nothing any other module reads, yet the
 *    installer latched `textScalePatchInstalled = true` and
 *    reported success.
 *  - v316's primary seam assigned the deep Text module's
 *    `.default` on the object its own require resolved, but never
 *    verified that `require("react-native").Text` — the public
 *    getter every consumer goes through — had actually changed.
 *    On device it had not.
 * The v321 installer therefore (a) patches the deep module,
 * (b) redefines `Text` on the REAL public exports object obtained
 * by a direct require (never the wildcard copy), (c) installs
 * from the first import of the app entry (app/_layout.tsx), and
 * (d) only calls itself installed after READING
 * `require("react-native").Text` back and finding ScaledText.
 *
 * THE MECHANISM (unchanged in shape): there is no shared Text
 * component in this codebase — 220+ files import Text straight
 * from "react-native", and there are ~2,450 literal fontSize
 * values across app/ and components/, most delivered through
 * StyleSheet styles (registered ids and arrays), not inline
 * props. The skin type scales (CLASSIC_TYPE_SCALE & friends in
 * lib/skin-themes.ts) are real, but only a dozen files consume
 * them; threading a factor through thousands of literal style
 * sites by hand would be unverifiable and would still miss every
 * surface nobody touched. The ONE seam that reaches all of it is
 * the Text component itself, via the public exports object above.
 * The substitute multiplies the FLATTENED style's fontSize and
 * lineHeight by the live factor (StyleSheet.flatten resolves
 * registered ids and arrays first), so StyleSheet-delivered type
 * scales exactly like inline type.
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
 * out so the tests can pin the operation exactly.
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
 * The REAL public exports object of "react-native", obtained by
 * a direct require. This distinction is the v321 fix: an ESM
 * namespace import (`import * as RN from "react-native"`) is
 * compiled by Babel to `_interopRequireWildcard(...)`, a
 * per-module snapshot copy — redefining a property on the copy
 * (v316's fallback seam) is invisible to every other module.
 * A plain require returns the one object every consumer's
 * compiled code reads (`_reactNative.Text` at render time).
 */
function realReactNativeExports(): Record<string, unknown> | null {
  try {
    const rn = require("react-native") as Record<string, unknown> | null;
    return rn && (typeof rn === "object" || typeof rn === "function") ? rn : null;
  } catch {
    return null;
  }
}

/**
 * Redefines `Text` on the real public exports object so it
 * resolves to ScaledText. The stock export is a getter (an
 * object-literal accessor: configurable), so defineProperty can
 * replace it with a plain data property. Verified by the
 * caller through a fresh read, never assumed.
 */
export function patchPublicTextExport(rnExports: unknown): boolean {
  if (!rnExports || (typeof rnExports !== "object" && typeof rnExports !== "function")) {
    return false;
  }
  const target = rnExports as Record<string, unknown>;
  try {
    if (target.Text === (ScaledText as unknown)) return true;
  } catch {
    // A getter that throws on read (unresolvable deep module in
    // a test environment) — the defineProperty below is still
    // the right move; it replaces the getter outright.
  }
  try {
    Object.defineProperty(target, "Text", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: ScaledText,
    });
  } catch {
    return false;
  }
  try {
    return target.Text === (ScaledText as unknown);
  } catch {
    return false;
  }
}

/**
 * The live check v316 never ran: does the public expression
 * every screen evaluates — `require("react-native").Text` —
 * resolve to the substitute RIGHT NOW? Never throws.
 */
export function isTextScalePatchLive(): boolean {
  const rn = realReactNativeExports();
  if (!rn) return false;
  try {
    return rn.Text === (ScaledText as unknown);
  } catch {
    return false;
  }
}

/**
 * Points React Native's Text export at ScaledText, on BOTH real
 * seams (the deep module the public getter reads, and the public
 * exports object itself), then VERIFIES by reading the public
 * export back. Only a verified install latches the idempotent
 * flag — an environment where the patch cannot take reports
 * false and may be retried, instead of v316's false success.
 * Never throws.
 */
export function installTextScalePatch(): boolean {
  if (textScalePatchInstalled) return true;
  // Seam 1: the deep Text module (the public getter in
  // react-native's index.js re-reads its `.default`).
  try {
    const textModule = require("react-native/Libraries/Text/Text") as { default?: unknown } | null;
    patchTextModuleDefault(textModule);
  } catch {
    // The deep module is unreachable in this environment (test
    // doubles, exotic bundlers) — seam 2 is the load-bearing one.
  }
  // Seam 2: the real public exports object — the object every
  // compiled consumer reads at render time.
  const rn = realReactNativeExports();
  if (rn) patchPublicTextExport(rn);
  // Verify against the public expression, not the seams' local
  // reports. A throwing read (unresolvable getter in a test
  // environment whose patch also could not land) is a failed
  // install, reported honestly.
  if (isTextScalePatchLive()) {
    textScalePatchInstalled = true;
    return true;
  }
  return false;
}

// Installed at module scope, and this module is the FIRST import
// of the app entry (app/_layout.tsx), ahead of the theme provider
// (which also imports it) — the patch is in place before any
// screen module evaluates, let alone renders.
installTextScalePatch();
