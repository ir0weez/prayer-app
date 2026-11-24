/**
 * v556 — the Punch Card, rendered. The model is pinned in
 * punch-card-v556.test.ts; here the ticket itself stands up in a
 * string-host rig (the ten-stops listen rig's pattern): the badge
 * counts the week, filled slots carry the rosette seal, empty
 * slots the dashed ring, and at 7/7 the aim line is a door that
 * fires the reach-out handler — below 7/7 it is plain text and
 * there is no door at all.
 */
import React from "react";
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const rig = vi.hoisted(() => ({ reduceMotion: false }));

vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  AccessibilityInfo: {
    isReduceMotionEnabled: async () => rig.reduceMotion,
    addEventListener: () => ({ remove: () => undefined }),
  },
}));

vi.mock("react-native-svg", () => ({
  __esModule: true,
  default: "Svg",
  Path: "Path",
  Polyline: "Polyline",
}));

vi.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: { View: "View" },
  cancelAnimation: () => undefined,
  // A real linear interpolate, so the animated styles the rig
  // computes carry the values the device would settle at (a
  // stamped today's ring rests at opacity 0, its seal at 1).
  interpolate: (v: number, input: number[], output: number[]) => {
    if (v <= input[0]) return output[0];
    for (let i = 1; i < input.length; i++) {
      if (v <= input[i]) {
        const t = (v - input[i - 1]) / (input[i] - input[i - 1]);
        return output[i - 1] + t * (output[i] - output[i - 1]);
      }
    }
    return output[output.length - 1];
  },
  useAnimatedStyle: (fn: () => unknown) => fn(),
  useSharedValue: (v: number) => ({ value: v }),
  withTiming: (v: number) => v,
  Easing: { bezier: () => ({}), steps: () => ({}) },
  Extrapolation: { CLAMP: "clamp" },
}));

vi.mock("@expo/vector-icons/MaterialIcons", () => ({
  __esModule: true,
  default: "MaterialIcons",
}));

vi.mock("@/hooks/use-skin", () => ({
  useSkin: () => ({
    skin: "classic",
    isPaper: false,
    isEightBit: false,
    isTerminal: false,
    isSkinned: false,
    monoFont: undefined,
    tokens: {},
    motion: { slide: { duration: 0 }, settle: { duration: 0 }, settleDistance: 0 },
  }),
}));

import { PunchCard } from "../../components/punch-card";
import { buildPunchCardForWeek } from "../punch-card";

const MON = "2026-11-23";
const TUE = "2026-11-24";
const WED = "2026-11-25";
const SUN = "2026-11-29";
const WEEK = [MON, TUE, WED, "2026-11-26", "2026-11-27", "2026-11-28", SUN];

function render(model: ReturnType<typeof buildPunchCardForWeek>, onReachOut = vi.fn()) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <PunchCard
        accentColor="#A4133C"
        scheme="light"
        groundColor="#FAF4F6"
        model={model}
        firstName="Eva"
        onReachOut={onReachOut}
      />,
    );
  });
  return { renderer, onReachOut };
}

function texts(root: ReactTestInstance): string[] {
  return root.findAllByType("Text").map((node) => node.children.filter((c) => typeof c === "string").join(""));
}

function sealCount(root: ReactTestInstance): number {
  // The seal is the one Path drawn from the mockup's path data.
  return root.findAllByType("Path").filter((node) => typeof node.props.d === "string" && node.props.d.startsWith("M20 1 L24 5")).length;
}

function dashedRingCount(root: ReactTestInstance): number {
  return root
    .findAllByType("View")
    .filter((node) => {
      const style = node.props.style as { width?: number; borderStyle?: string } | undefined;
      if (style?.width !== 40 || style?.borderStyle !== "dashed") return false;
      // Today's ring rides an animated wrapper; once the stamp
      // lands it rests at opacity 0 — present in the tree, gone
      // on the card. Only standing rings count.
      const parentStyle = node.parent?.props.style as unknown;
      if (Array.isArray(parentStyle)) {
        const animated = parentStyle.find(
          (s): s is { opacity?: number } => !!s && typeof s === "object" && "opacity" in s,
        );
        if (animated && animated.opacity === 0) return false;
      }
      return true;
    }).length;
}

describe("v556 punch card — rendered", () => {
  it("a part-filled week: badge, aim line, seals and rings", () => {
    const model = buildPunchCardForWeek([MON, TUE, WED], null, WED);
    const { renderer } = render(model);
    const all = texts(renderer.root);
    expect(all).toContain("Punch Card");
    expect(all).toContain("3/7");
    expect(all).toContain("→ Reach out to Eva");
    expect(sealCount(renderer.root)).toBe(3);
    expect(dashedRingCount(renderer.root)).toBe(4);
    // Below 7/7 the aim line is plain text — no door anywhere.
    expect(renderer.root.findAllByType("Pressable")).toHaveLength(0);
  });

  it("an untouched week: seven rings, no seals", () => {
    const model = buildPunchCardForWeek([], null, WED);
    const { renderer } = render(model);
    expect(texts(renderer.root)).toContain("0/7");
    expect(sealCount(renderer.root)).toBe(0);
    expect(dashedRingCount(renderer.root)).toBe(7);
  });

  it("a full week: the aim line becomes the reach-out door", () => {
    const onReachOut = vi.fn();
    const model = buildPunchCardForWeek(WEEK, null, SUN);
    const { renderer } = render(model, onReachOut);
    expect(texts(renderer.root)).toContain("7/7");
    expect(sealCount(renderer.root)).toBe(7);
    expect(dashedRingCount(renderer.root)).toBe(0);
    const doors = renderer.root.findAllByType("Pressable");
    expect(doors).toHaveLength(1);
    const chevrons = renderer.root.findAllByType("MaterialIcons").filter((n) => n.props.name === "chevron-right");
    expect(chevrons).toHaveLength(1);
    const event = { nativeEvent: { pageX: 10, pageY: 20 } };
    act(() => {
      doors[0].props.onPress(event);
    });
    expect(onReachOut).toHaveBeenCalledTimes(1);
    expect(onReachOut).toHaveBeenCalledWith(event);
  });

  it("under reduce-motion the stamps simply stand", () => {
    rig.reduceMotion = true;
    try {
      const model = buildPunchCardForWeek([MON, WED], null, WED);
      const { renderer } = render(model);
      expect(texts(renderer.root)).toContain("2/7");
      expect(sealCount(renderer.root)).toBe(2);
      expect(dashedRingCount(renderer.root)).toBe(5);
    } finally {
      rig.reduceMotion = false;
    }
  });
});
