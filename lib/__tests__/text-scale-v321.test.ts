/**
 * v321 — TEXT SIZE, PROVEN AT THE SEAM THE APP ACTUALLY READS.
 *
 * v316 shipped lib/text-scale.tsx and Jonathan's phone disproved
 * it (2026-10-28 20:18, screenshots 10867/10868): XL and Default
 * render identically, Settings' own labels included. The v316
 * test never caught it because it rendered ScaledText directly —
 * it proved the substitute works when you call it, not that any
 * screen ever reaches it — and its StyleSheet mock treated
 * registered style ids as opaque, so the app-dominant style
 * shape was never exercised either.
 *
 * This harness reproduces the device's consumption chain:
 *  - "react-native" is a public exports object whose `Text` is a
 *    GETTER returning the deep Text module's `.default` — line
 *    for line how react-native 0.81's index.js is built.
 *  - A "screen" here reads Text the way this repo's Babel output
 *    does: a property access on the require("react-native")
 *    result at render time (`_reactNative.Text`).
 *  - StyleSheet is registry-backed like the real one: create()
 *    returns numeric ids, flatten() resolves ids, arrays and
 *    objects through the registry.
 *
 * One environment note, stated plainly: under vitest, a CJS
 * require() inside a processed module bypasses the mock registry
 * (ESM imports route to the mocks; require resolves the real
 * package), so the installer's module-scope install cannot reach
 * these rig objects from inside the test runner. On device,
 * Metro's require IS the registry and returns exactly these
 * objects — that identity is Metro's definition, not something
 * a test can re-prove. So this test drives the installer's two
 * exported seam operations (patchTextModuleDefault,
 * patchPublicTextExport — the exact functions
 * installTextScalePatch runs) against the rig, and then asserts
 * the whole downstream chain: the public Text IS the substitute;
 * a Text carrying a StyleSheet-REGISTERED style (fontSize 16 /
 * lineHeight 22) renders at 19.52 / 26.84 under the XL factor;
 * and at factor 1 the original component receives the props
 * object untouched.
 */
import * as React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rig = vi.hoisted(() => {
  const ReactHoisted = require("react") as typeof React;

  // The "original" Text: renders a host span and records the
  // exact props it was called with, so the test can see what the
  // substitute handed it.
  const lastProps: { current: Record<string, unknown> | null } = { current: null };
  function FakeText(props: Record<string, unknown> & { children?: React.ReactNode }) {
    lastProps.current = props;
    return ReactHoisted.createElement(
      "span",
      { "data-kind": "fake-text", "data-style": JSON.stringify(props.style ?? null) },
      props.children as React.ReactNode,
    );
  }

  // The deep Text module, as Metro resolves
  // 'react-native/Libraries/Text/Text' — an object whose
  // `.default` is the component.
  const deepTextModule: { default: unknown } = { default: FakeText };

  // A registry-backed StyleSheet, like the real one: create()
  // registers each style and returns its numeric id; flatten()
  // resolves ids, arrays and plain objects through the registry.
  const registry = new Map<number, Record<string, unknown>>();
  let nextId = 1;
  const flatten = (style: unknown): Record<string, unknown> | undefined => {
    if (style == null) return undefined;
    if (typeof style === "number") return registry.get(style);
    if (Array.isArray(style)) {
      const out: Record<string, unknown> = {};
      for (const entry of style) Object.assign(out, flatten(entry) ?? {});
      return out;
    }
    if (typeof style === "object") return style as Record<string, unknown>;
    return undefined;
  };
  const StyleSheet = {
    create(styles: Record<string, Record<string, unknown>>): Record<string, number> {
      const out: Record<string, number> = {};
      Object.keys(styles).forEach((key) => {
        const id = nextId;
        nextId += 1;
        registry.set(id, styles[key]);
        out[key] = id;
      });
      return out;
    },
    flatten,
  };

  // The public exports object, shaped like react-native 0.81's
  // index.js: `Text` is an accessor that re-reads the deep
  // module's `.default` on every access.
  const publicExports: Record<string, unknown> = {
    Platform: { OS: "android" },
    StyleSheet,
  };
  Object.defineProperty(publicExports, "Text", {
    configurable: true,
    enumerable: true,
    get: () => deepTextModule.default,
  });

  return { FakeText, deepTextModule, StyleSheet, publicExports, lastProps };
});

vi.mock("react-native", () => rig.publicExports);
vi.mock("react-native/Libraries/Text/Text", () => rig.deepTextModule);

import {
  getTextScaleFactor,
  patchPublicTextExport,
  patchTextModuleDefault,
  ScaledText,
  setTextScaleFactor,
  TEXT_SIZE_FACTORS,
} from "../text-scale";

// The consumer's view: rig.publicExports IS the object the
// mock hands to every require("react-native") — the same object
// Metro returns to every compiled screen, whose `.Text` is read
// at element-creation time (`_reactNative.Text`). Reading `.Text`
// off it here is the public expression itself. (A bare require()
// in a test body would bypass vitest's mock registry and load
// RN's Flow-typed sources — the trap the v316 harness documented
// — so the test reads through the rig object instead.)
const RN = rig.publicExports as {
  Text: React.ComponentType<Record<string, unknown>>;
  StyleSheet: typeof rig.StyleSheet;
};

afterEach(() => {
  setTextScaleFactor(1);
  rig.lastProps.current = null;
});

describe("v321 text size — the patch lands on the objects consumers read", () => {
  it("the installer's seam operations put the substitute on BOTH real objects", () => {
    // The exact two operations installTextScalePatch() runs, in
    // its order, against the two objects Metro's require hands
    // out on device. Before them, the rig still reads stock.
    expect(rig.deepTextModule.default).toBe(rig.FakeText);
    expect(patchTextModuleDefault(rig.deepTextModule)).toBe(true);
    expect(patchPublicTextExport(rig.publicExports)).toBe(true);
    expect(rig.deepTextModule.default).toBe(ScaledText);
  });

  it("after the seams run, the public expression — exports.Text — IS the substitute", () => {
    // This is the verification v316 never ran: not "the seam
    // reported success" but the public expression itself, read
    // fresh off the object at assertion time.
    patchTextModuleDefault(rig.deepTextModule);
    patchPublicTextExport(rig.publicExports);
    expect(RN.Text).toBe(ScaledText);
  });
});

describe("v321 text size — a StyleSheet-registered style rescales end to end", () => {
  // Idempotent: every render below goes through the public
  // export, so the seams must be in place regardless of which
  // tests ran before.
  beforeEach(() => {
    patchTextModuleDefault(rig.deepTextModule);
    patchPublicTextExport(rig.publicExports);
  });

  const styles = RN.StyleSheet.create({
    label: { fontSize: 16, lineHeight: 22, color: "#111111" },
  });

  it("the fixture really is a registered id, not a plain object", () => {
    expect(typeof styles.label).toBe("number");
  });

  it("at XL the rendered host receives fontSize 19.52 and lineHeight 26.84", () => {
    setTextScaleFactor(TEXT_SIZE_FACTORS.xl);
    expect(getTextScaleFactor()).toBe(1.22);
    const html = renderToString(React.createElement(RN.Text, { style: styles.label }, "People"));
    expect(html).toContain('data-kind="fake-text"');
    const received = rig.lastProps.current?.style as Record<string, unknown>;
    expect(received.fontSize).toBe(19.52);
    expect(received.lineHeight).toBe(26.84);
    // Only the size fields move; the rest of the flattened
    // style arrives intact.
    expect(received.color).toBe("#111111");
    expect(html).toContain("People");
  });

  it("an array mixing a registered id and an inline override scales the cascade winner", () => {
    setTextScaleFactor(TEXT_SIZE_FACTORS.xl);
    renderToString(React.createElement(RN.Text, { style: [styles.label, { fontSize: 20 }] }, "Queue"));
    const received = rig.lastProps.current?.style as Record<string, unknown>;
    expect(received.fontSize).toBe(24.4);
    expect(received.lineHeight).toBe(26.84);
  });

  it("at Default (factor 1) the original component receives the props untouched — same style reference", () => {
    setTextScaleFactor(TEXT_SIZE_FACTORS.default);
    renderToString(React.createElement(RN.Text, { style: styles.label }, "People"));
    // The registered id itself, unflattened and unscaled: the
    // substitute is a true no-op at Default.
    expect(rig.lastProps.current?.style).toBe(styles.label);
  });

  it("at Small the same registered style shrinks (16 → 14.4)", () => {
    setTextScaleFactor(TEXT_SIZE_FACTORS.small);
    renderToString(React.createElement(RN.Text, { style: styles.label }, "People"));
    const received = rig.lastProps.current?.style as Record<string, unknown>;
    expect(received.fontSize).toBe(14.4);
    expect(received.lineHeight).toBe(19.8);
  });
});
