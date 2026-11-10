// ─── v481 — "The Pour": the household group's open/close motion ───────
// Jonathan's own design, twice over: he drew it on Oct 2 (the accent
// pours up from the card's bottom as the group folds closed, "as if
// the contacts folding closed are filling the group card"; drains
// back down on open — shipped then as 2e75713 on the old full-accent
// card), and on Nov 9 he picked it again, "1. 100%", from the motion
// mockups (group-motion-concepts-v1.html, Concept 1) for today's
// white Classic card, whose groups have mounted and unmounted
// instantly since v367.
//
// Why this shape, given the graveyard behind it:
//  · v362's window travelled on the JS thread (RN Animated height)
//    and read "slow and laggy" on his phone; v367 retired travel
//    altogether for plain mount/unmount.
//  · v275's window stacked gates (animated height + opacity gate +
//    hardware texture + exiting animation + a settle handoff) —
//    any one of them could leave members laid out but invisible
//    (v282's diagnosis), so NONE of that stack returns here: the
//    members are fully opaque at every height, there is no texture,
//    no exiting animation, and no opacity gate anywhere in the pour.
//  · The motion is ONE shared value per card — pour, owned by
//    FamilyGroupUnit below, never by the screen — driven by
//    Reanimated on the UI thread. The panel window's height, the
//    fill's rise through the panel segment and the header card,
//    and the header texts' flip to white are ALL derived from that
//    one value (familyPourFront), so a tap mid-flight reverses the
//    whole gesture from wherever it stands, and one group's toggle
//    holds no state any other group can feel.
//  · The panel stays mounted while its window travels and unmounts
//    only when a close completes. That handoff is the one callback
//    in the design, and it is safe to lose: the window's height is
//    a pure function of pour + the measured content height, so a
//    panel left mounted at height 0 is invisible, clipped, and
//    re-driven correctly by the next open — visibility never
//    depends on the callback landing.
//  · The panel's content measures itself from inside the window
//    (the v262 queue tray's seat): it is never height-constrained,
//    so no measurement can clamp it. (v483: this was WRONG — see
//    the last bullet. The tray's window never derived its height
//    from the in-window measure; this seat did, and the loop it
//    closed is what kept the groups shut.)
//  · v482 HOTFIX (launch crash): familyPourFront carries the
//    'worklet' directive, and that directive is LOAD-BEARING.
//    Without it the worklets plugin left the function a plain JS
//    closure capture inside the useDerivedValue worklet below —
//    and a plain function cannot run on the UI thread, so the
//    derived front could never be produced, every household row
//    faulted on its first frame, and the app died on launch
//    (the People tab is the opening tab). The v482 tests pin the
//    directive, the geometry's finite-input guards, and the rule
//    that no ref is written during render in the unit.
//  · v483 (device: groups did not open; closes folded empty):
//    the window's height is a pure function of panelHeight, so
//    measuring panelHeight from inside the window closed a loop —
//    on the panel's first frame the window stands at height 0,
//    the in-window measure reports the constrained box, and no
//    natural height ever enters the system; the group can never
//    open. The measure now lives in an OUT-OF-FLOW seat beside
//    the window (absolutely positioned, width-matched, invisible),
//    whose ancestors impose no height at all. Second bug, same
//    seat: the composition passes `false` for a collapsed panel
//    and the render's `??` never fell back for a falsy panel, so
//    a closing group lost its members in the render the fold
//    began. The rendered panel now falls back to the cached copy
//    whenever the current panel is falsy. Both failures are
//    pinned behaviourally in people-v483-pour-seat.test.tsx,
//    which failed on the v482 seat for exactly these reasons.
//  · v485 (device: "This is not the look we agreed to..." — his
//    screen recording of the shipped motion, then of the mockup
//    itself, "look how smooth you made it!"): the seats were
//    right but the SCHEDULE was two edges, not one. The window
//    folded (1 − pour) × panelHeight across the whole travel
//    while a colour slab inside that same window grew on the
//    front's schedule and saturated at the window's full height
//    for most of the travel — mid-flight the panel stood as one
//    tall solid-violet block, members hidden behind it, a row
//    peeking squished at the slab's bottom seam; and the header
//    began filling at pour ≈ P/(H + 2P), long before the front
//    had crossed the panel. The mockup's motion (and his Oct 2
//    design) has exactly ONE edge: the front's surface is the
//    fold line. The schedule below now derives the window, the
//    segment, the colour band and the header fill from the
//    front's position alone — see familyPourFront. The seat, the
//    cache, the lifecycle and the chevron from v483 are
//    untouched; people-v485-one-edge.test.tsx pins the partition
//    at mid-flight frames, failing on the v484 schedule for the
//    slab reason first.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Text, View, type StyleProp, type TextProps, type TextStyle } from "react-native";
import ReAnimated, {
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

/** v481: the pour's one clock — long enough to watch the colour
 * travel (his Oct 3 note on an earlier close: "so fast that it's
 * barely noticeable"), short enough to start feeling instant. */
export const FAMILY_POUR_DURATION_MS = 500;
const FAMILY_POUR_EASING = Easing.bezier(0.2, 0, 0, 1);

type FamilyPourContextValue = {
  /** 1 = the closed card stands full of the accent; 0 = drained open. */
  pour: SharedValue<number>;
  /** How far the fill has risen through the HEADER card, 0..1. */
  headerFillFrac: SharedValue<number>;
};

export const FamilyPourContext = createContext<FamilyPourContextValue | null>(null);

export type FamilyPourFront = {
  /** The still-visible member region (rowsVisible): the window's
   * height — the part of the panel above the front's edge. */
  panelWindowHeight: number;
  /** The colour band's height in the panel segment: the folded
   * part itself, standing below the window. */
  panelFillHeight: number;
  /** The panel segment's total height right now: rows region +
   * colour band, exactly, at every frame. */
  segmentHeight: number;
  /** The fill's rise through the header card, 0..1. */
  headerFillFrac: number;
};

/**
 * The pour's geometry, pure — ONE EDGE (v485). One front of colour
 * travels the whole unit from its bottom edge: at any pour value
 * the front has climbed `pour` of the unit's full height
 * (header + panel). Everything in the panel segment is read off
 * the front's position alone, so the colour's surface IS the fold
 * line — there is no second schedule for it to disagree with:
 *
 *  · rowsVisible = clamp(panel − front, 0, panel): the window is
 *    exactly the member region the front has not reached, rows
 *    top-anchored and clipped at the edge; they sink into the
 *    rising edge in place.
 *  · Phase A (front ≤ panel): the segment stands at its full
 *    height — the card does not collapse while the edge crosses
 *    the members (the mockup's mid-close frame: full height,
 *    front halfway through the panel, rows crisp above it,
 *    solid colour below).
 *  · Phase B (front > panel): no rows remain; the all-colour
 *    segment collapses panel → 0 linearly across the header's
 *    own fill (segmentHeight = panel × (total − front) / header),
 *    so the segment finishes folding exactly as the header
 *    finishes filling.
 *  · The colour band is the folded part itself:
 *    colourBand = segmentHeight − rowsVisible, standing below
 *    the window in flow — never inside it, never over the rows.
 *  · The header fill starts only when the front has crossed the
 *    whole panel: headerFillPx = clamp(front − panel, 0, header).
 *
 * Opening is the same law read backwards: the header drains
 * while the colour segment unfolds back to full height, then the
 * level drops through the panel and the rows emerge from the
 * dropping edge.
 */
export function familyPourFront(pour: number, headerHeight: number, panelHeight: number): FamilyPourFront {
  // v482: the 'worklet' directive is what lets this run inside the
  // useDerivedValue / useAnimatedStyle worklets that call it — see
  // the header note. Do not remove it.
  "worklet";
  // Fail-safe at the geometry boundary: no input state — unmeasured
  // (0), negative, NaN, infinite — may produce a value Android's
  // layout could choke on. Non-finite inputs fall back to the
  // measured-nothing state, whose frame is exactly the static card:
  // pour 1 stands filled, pour 0 stands open, window 0.
  const safePour = typeof pour === "number" && Number.isFinite(pour) ? pour : 0;
  const safeHeader = typeof headerHeight === "number" && Number.isFinite(headerHeight) ? Math.max(0, headerHeight) : 0;
  const safePanel = typeof panelHeight === "number" && Number.isFinite(panelHeight) ? Math.max(0, panelHeight) : 0;
  const clamped = Math.min(1, Math.max(0, safePour));
  const total = safeHeader + safePanel;
  const front = clamped * total;
  const frontInPanel = Math.min(front, safePanel);
  const panelWindowHeight = safePanel - frontInPanel;
  const segmentHeight =
    front <= safePanel
      ? safePanel
      : safeHeader > 0
        ? (safePanel * (total - front)) / safeHeader
        : 0;
  const panelFillHeight = Math.max(0, segmentHeight - panelWindowHeight);
  const headerFillPx = Math.min(Math.max(front - safePanel, 0), safeHeader);
  const headerFillFrac = safeHeader > 0 ? headerFillPx / safeHeader : clamped;
  return { panelWindowHeight, panelFillHeight, segmentHeight, headerFillFrac };
}

/**
 * The household group unit: header card + member panel under one
 * pour. Owns the card's animated state outright (the roster's
 * expanded identity still lives with the screen — the accordion
 * and the seam rules read it — but no animated value does). The
 * header and panel arrive as elements; the panel element is cached
 * on its way in so a closing group keeps rendering its members for
 * the whole fold even though the screen has already let it go.
 */
export function FamilyGroupUnit({
  expanded,
  accent,
  header,
  panel,
}: {
  expanded: boolean;
  accent: string;
  header: ReactNode;
  panel: ReactNode;
}) {
  const pour = useSharedValue(expanded ? 0 : 1);
  const headerHeight = useSharedValue(0);
  const panelHeight = useSharedValue(0);
  const [panelHeld, setPanelHeld] = useState(expanded);
  const heldPanelRef = useRef<ReactNode>(null);
  const expandedRef = useRef(expanded);

  // v482: no ref is written during render. The panel cache is a
  // one-render bridge kept in an effect: the render below always
  // prefers the CURRENT panel element and falls back to the last
  // committed one only while a close is folding (when the screen
  // has already stopped passing it).
  useEffect(() => {
    if (panel) heldPanelRef.current = panel;
  }, [panel]);

  useEffect(() => {
    expandedRef.current = expanded;
    if (expanded) {
      setPanelHeld(true);
      pour.value = withTiming(0, { duration: FAMILY_POUR_DURATION_MS, easing: FAMILY_POUR_EASING });
    } else {
      pour.value = withTiming(
        1,
        { duration: FAMILY_POUR_DURATION_MS, easing: FAMILY_POUR_EASING },
        (finished) => {
          if (finished && !expandedRef.current) runOnJS(setPanelHeld)(false);
        },
      );
    }
  }, [expanded, pour]);

  const front = useDerivedValue(() => familyPourFront(pour.value, headerHeight.value, panelHeight.value));
  const headerFillFrac = useDerivedValue(() => front.value.headerFillFrac);

  // At rest open the window unlocks back to auto height (the tray's
  // discipline): content that changes while the group stands open
  // flows at its natural height, and the next close measures it
  // fresh from the measuring seat's layout reports (v483: the seat
  // beside the window below — never from inside the window).
  const windowStyle = useAnimatedStyle(() => {
    // v482: at rest open the height key is ABSENT (an empty style),
    // never an undefined height value — Reanimated 4 must not be
    // handed one to apply on the UI thread.
    if (pour.value === 0) return {};
    return { height: front.value.panelWindowHeight };
  });
  // v485: the segment and the colour band ride the same values.
  // The segment unlocks to auto height at rest open, exactly as
  // the window does (its rows stand at their natural height and
  // the band is 0 there); mid-flight it takes the front's
  // segmentHeight. The band's height is the folded part itself —
  // the geometry already guarantees it finite and non-negative.
  const segmentStyle = useAnimatedStyle(() => {
    if (pour.value === 0) return {};
    return { height: front.value.segmentHeight };
  });
  const bandStyle = useAnimatedStyle(() => ({
    height: front.value.panelFillHeight,
  }));

  // v483: the panel this unit actually renders. The screen passes
  // `false` (not null) once a group collapses, and the fold needs
  // the members for its whole travel — so the fallback is FALSY,
  // not nullish: whenever the current panel is false/null/absent,
  // the cached copy from the last open render stands in, until
  // panelHeld drops at the close's completion and both unmount.
  // (v481/v482 rendered `{panel ?? heldPanelRef.current}` — `false`
  // is not nullish, so the cache never engaged and closing folded
  // an empty window.)
  const renderedPanel = panel ? panel : heldPanelRef.current;

  return (
    <View>
      <FamilyPourContext.Provider value={{ pour, headerFillFrac }}>
        <View
          onLayout={(event) => {
            headerHeight.value = event.nativeEvent.layout.height;
          }}
        >
          {header}
        </View>
        {panelHeld ? (
          <View>
            {/* v485: the panel segment — ONE edge. Its height is
                the front's schedule (full height while the edge
                crosses the members, then collapsing across the
                header's fill); inside it, the window — the
                still-visible rows, clipped at the edge — and
                below it the colour band — the folded part itself
                — partition the segment exactly: rows + colour =
                segment at every frame. The band stands IN FLOW
                below the window; there is no fill inside the
                window any more (v484's absolute slab painted over
                the rows and read on device as a solid block). The
                band's inset and bottom corners match the panel
                surface's own (marginHorizontal 12, radius 24 in
                FamilyPanel's outerStyle), flush with the card's
                edges, so the colour reads as the panel's own
                substance continuing below the edge. */}
            <ReAnimated.View
              testID="family-pour-segment"
              style={[{ overflow: "hidden" }, segmentStyle]}
            >
              <ReAnimated.View
                testID="family-pour-window"
                style={[{ overflow: "hidden" }, windowStyle]}
              >
                <View>{renderedPanel}</View>
              </ReAnimated.View>
              <ReAnimated.View
                testID="family-pour-band"
                pointerEvents="none"
                style={[
                  {
                    marginHorizontal: 12,
                    borderBottomLeftRadius: 24,
                    borderBottomRightRadius: 24,
                    backgroundColor: accent,
                  },
                  bandStyle,
                ]}
              />
            </ReAnimated.View>
            {/* v483: the measuring seat — OUT OF FLOW, beside the
                window, invisible and inert. The panel's natural
                height is measured here, where no ancestor imposes
                a height (the seat is absolutely positioned inside
                the segment, width-matched to the window), so the
                measurement can never be clamped by the window it
                sizes — the closed loop that kept v481/v482's
                groups shut on device (the window's height derives
                from panelHeight; measuring panelHeight from
                inside that window fixed-pointed at 0). The seat
                renders the same panel element the window shows,
                only while the group is held; content that changes
                while the group stands open re-measures through it
                for the next close. */}
            <View
              testID="family-pour-measure-seat"
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{ position: "absolute", left: 0, right: 0, top: 0, opacity: 0 }}
            >
              <View
                onLayout={(event) => {
                  panelHeight.value = event.nativeEvent.layout.height;
                }}
              >
                {renderedPanel}
              </View>
            </View>
          </View>
        ) : null}
      </FamilyPourContext.Provider>
    </View>
  );
}

/**
 * The fill inside the header card: the accent, anchored to the
 * card's bottom edge, standing exactly as tall as the pour's front
 * has climbed into the card. Renders nothing outside a
 * FamilyGroupUnit (the context is the unit's to give).
 */
export function FamilyPourFill({ color }: { color: string }) {
  const ctx = useContext(FamilyPourContext);
  const fillStyle = useAnimatedStyle(() => ({
    height: ctx ? `${ctx.headerFillFrac.value * 100}%` : "0%",
  }));
  if (!ctx) return null;
  return (
    <ReAnimated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: color }, fillStyle]}
    />
  );
}

/**
 * A header text that turns to the on-colour (white) as the fill
 * covers it: the meta line sits lower in the card, so the rising
 * front reaches it first; the family name flips later, as the fill
 * nears the top. Outside a unit it is a plain Text in its standing
 * colour.
 */
export function FamilyPourText({
  variant,
  fromColor,
  style,
  children,
  ...textProps
}: {
  variant: "name" | "meta";
  fromColor: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
} & Pick<TextProps, "numberOfLines" | "adjustsFontSizeToFit" | "minimumFontScale">) {
  const ctx = useContext(FamilyPourContext);
  const animatedStyle = useAnimatedStyle(() => {
    if (!ctx) return { color: fromColor };
    const range = variant === "name" ? [0.6, 0.92] : [0.34, 0.66];
    return { color: interpolateColor(ctx.headerFillFrac.value, range, [fromColor, "#FFFFFF"]) };
  });
  if (!ctx) {
    return (
      <Text style={style} {...textProps}>
        {children}
      </Text>
    );
  }
  return (
    <ReAnimated.Text style={[style, animatedStyle]} {...textProps}>
      {children}
    </ReAnimated.Text>
  );
}
