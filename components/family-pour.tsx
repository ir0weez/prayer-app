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
//    one value (familyPourGeometry), so a tap mid-flight reverses
//    the whole gesture from wherever it stands, and one group's
//    toggle holds no state any other group can feel.
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
//    fold line. The schedule then derived the window, the
//    segment, the colour band and the header fill from the
//    front's position alone — see the v485 geometry. The seat, the
//    cache, the lifecycle and the chevron from v483 are
//    untouched; people-v485-one-edge.test.tsx pins the partition
//    at mid-flight frames, failing on the v484 schedule for the
//    slab reason first.
//  · v486 (device: "This still isn't right! Look at the
//    difference." — his side-by-side of the shipped build and
//    the mockup): v485's one-edge law was still a DERIVATION —
//    a front schedule read off extracted frames — and it still
//    wasn't the mockup. So this build derives nothing: it ports
//    the mockup file's own mechanism, read from its CSS
//    (group-motion-concepts-v1.html, Concept 1). In the mockup,
//    .gcard is one positioned, overflow-hidden card; .fill is a
//    single absolute layer behind the whole card whose clip-path
//    inset animates 100%→0 over .55s — a percentage of the
//    card's CURRENT height, so the fill is always the bottom q
//    of the card as it folds; .mwrap (members + Mark as
//    Complete ONLY) folds grid-rows 0fr↔1fr on the same .55s,
//    same easing, concurrently from t=0; and .ghead + .prog sit
//    ABOVE the fill (z 3 and 2) for the whole gesture — the
//    "x of y prayed today" row + wavy thread never fold and are
//    never covered, they only flip colour. The port, piece for
//    piece: familyPourGeometry is the clip-path/wrap pair read
//    off one q (window = P × (1 − q); fill = q × (H + window);
//    the face fraction is how far that fill has climbed into
//    the face block); the unit's tree is the mockup's paint
//    order (window, then the ONE fill layer, then the face);
//    the progress block moved out of the panel into the card
//    itself (the composition's renderFamilyCard — the app's
//    .gcard — exactly where .prog sits in .gcard); the clock is
//    the mockup's 550ms. The seat, the cache, the lifecycle and
//    the chevron from v483 are untouched; people-v486-pour
//    .test.tsx pins the geometry at q 0.3/0.5/0.7 and the tree
//    order, failing on the v485 law first.
//  · v487 (device, Jonathan's rulings Nov 9 22:42–22:43): the
//    motion stands, but v486's progress placement was the
//    mockup's internal layout, not his ask — "that wavy line is
//    now always there... I didn't ask for that... It can just
//    appear when the group is open" — and its height on every
//    closed card made the groups feel "huge... bigger than they
//    used to be". The progress block is back at the TOP of the
//    Classic panel (the composition's renderExpandedFamily),
//    rendered plain, folding with the window and covered by the
//    rising fill like the member rows. So the law's inputs mean
//    what they meant before v486: headerHeight is the header
//    card ALONE, panelHeight is the FULL panel, progress block
//    included — nothing in this file's geometry changes, only
//    what the composition measures into it. The panel paddingTop
//    reverts 2 → 20 with the block, and inter-group spacing was
//    measured against v480 and never changed (gap 9, panel
//    −14/10), so none is touched. people-v486-pour.test.tsx
//    re-pins the placement and the geometry at H = 62 (header
//    only), P = 360 (progress included).
//  · v489 (device, Jonathan's verdict on v487, Nov 10): the
//    motion was never the problem — the CARD was. Closed groups
//    stood as solid accent slabs with asymmetric radii stacked
//    into scallops, and the open tray read as a separate
//    flat-topped sheet that never connected to the header. The
//    composition was three stacked surfaces (a header card, a
//    panel sheet tucked −14 under it, a fill rectangle inset
//    12px with its own bottom radii), and stacked outlines are
//    what scallops and seams are. The approved drawing
//    (group-one-card-v2.html, his "Build it this way") is the
//    mockup's .gcard itself: ONE element — one background, one
//    radius (28), one shadow, clipped — holding header,
//    progress, members and button, with .fill a single
//    full-bleed layer clipped by that one outline. So the unit's
//    root becomes the card when the composition hands it a
//    cardStyle (the Classic path only): the root wears the
//    surface and clips, the fill goes full-bleed (no inset, no
//    radius of its own), the header returns its head row alone
//    (no wrapper card, no interior fill — the ONE fill paints
//    the face region directly), and the panel loses its sheet
//    (no background, radii, tuck or trailing margin). Groups
//    stand on their own with the roster's spacing — no overlap
//    anywhere (his correction, Nov 10 10:55). The geometry, the
//    clock, the seat, the cache and the lifecycle are untouched;
//    H is the header's height inside the one card, P the panel
//    content's. Skinned rows hand no cardStyle and keep the
//    v481–v488 shape byte for byte. people-v489-one-card
//    .test.tsx pins the one-surface tree, the full-bleed fill
//    and the mid-flight structure, failing on v488 first.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import ReAnimated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { WavyProgress } from "@/components/wavy-progress";

/** The pour's one clock. v481 set 500ms (his Oct 3 note on an
 * earlier close: "so fast that it's barely noticeable"); v486
 * takes the mockup's own .55s — the port does not round the
 * spec's numbers. */
export const FAMILY_POUR_DURATION_MS = 550;
const FAMILY_POUR_EASING = Easing.bezier(0.2, 0, 0, 1);

type FamilyPourContextValue = {
  /** 1 = the closed card stands full of the accent; 0 = drained open. */
  pour: SharedValue<number>;
  /** How far the fill has risen through the FACE block (the
   * header card alone since v487 — the progress block rides in
   * the panel again), 0..1 — this is the fraction of the
   * header's height the fill has climbed. */
  faceFillFrac: SharedValue<number>;
};

export const FamilyPourContext = createContext<FamilyPourContextValue | null>(null);

export type FamilyPourGeometry = {
  /** The folding window's height: the panel's own height
   * travelling (1 − q) — the mockup's .mwrap folding
   * grid-template-rows 0fr↔1fr on the same clock as the fill. */
  windowHeight: number;
  /** The ONE fill layer's height: the bottom q of the unit's
   * CURRENT height (face + window) — the mockup's .fill under a
   * clip-path percentage, which reads off the element's own
   * height as it folds. */
  fillHeight: number;
  /** How far the fill has climbed into the FACE block
   * (the header card alone since v487), 0..1. */
  faceFillFrac: number;
};

/**
 * The pour's geometry, pure — v486: the mockup's own mechanism,
 * ported, not derived. The mockup (group-motion-concepts-v1.html,
 * Concept 1) runs two CSS transitions off one state flip, on the
 * same .55s cubic-bezier(.2,0,0,1), concurrent from t=0:
 *
 *  · .mwrap folds grid-template-rows 0fr↔1fr: the wrap's height
 *    is the panel's natural height travelling (1 − q). Here:
 *    windowHeight = panelHeight × (1 − q). The window is the
 *    panel's own box folding — rows top-anchored and clipped by
 *    it — not a region a front leaves behind.
 *  · .fill is one absolute layer behind the whole card, revealed
 *    by clip-path inset(100% 0 0 0) → inset(0 0 0 0): the visible
 *    fill is the bottom q OF THE CARD'S CURRENT HEIGHT — as the
 *    wrap folds, the card shrinks, and the fill's height is read
 *    off the shrinking height. Here the unit's current height is
 *    headerHeight + windowHeight, so:
 *    fillHeight = q × (headerHeight + windowHeight).
 *    The fill layer stands over the window in paint order (the
 *    mockup's z-1 over the non-positioned .mwrap), so the rising
 *    colour covers the folding rows exactly as the mockup's does;
 *    the face block paints above it (z 2/3) and is never covered.
 *  · faceFillFrac is that same fill read against the face: the
 *    fill's top edge stands fillHeight above the unit's bottom;
 *    the face begins windowHeight above the bottom; so the fill
 *    has climbed (fillHeight − windowHeight) into the face's
 *    headerHeight. It drives the face's own interior fill (the
 *    card's FamilyPourFill) and every colour flip in the face.
 *
 * Rest states fall out of the three lines: q = 0 → window full,
 * fill 0, fraction 0 (open, drained); q = 1 → window 0, fill =
 * headerHeight, fraction 1 (closed: the unit is the face alone
 * and the fill is exactly its height). Opening is the same law
 * read backwards.
 */
export function familyPourGeometry(pour: number, headerHeight: number, panelHeight: number): FamilyPourGeometry {
  // v482: the 'worklet' directive is what lets this run inside the
  // useDerivedValue / useAnimatedStyle worklets that call it — see
  // the header note. Do not remove it.
  "worklet";
  // Fail-safe at the geometry boundary (v482, kept): no input
  // state — unmeasured (0), negative, NaN, infinite — may produce
  // a value Android's layout could choke on. Non-finite inputs
  // fall back to the measured-nothing state, whose frame is
  // exactly the static card: pour 1 stands filled, pour 0 stands
  // open, window 0.
  const safePour = typeof pour === "number" && Number.isFinite(pour) ? pour : 0;
  const safeHeader = typeof headerHeight === "number" && Number.isFinite(headerHeight) ? Math.max(0, headerHeight) : 0;
  const safePanel = typeof panelHeight === "number" && Number.isFinite(panelHeight) ? Math.max(0, panelHeight) : 0;
  const q = Math.min(1, Math.max(0, safePour));
  const windowHeight = safePanel * (1 - q);
  const fillHeight = q * (safeHeader + windowHeight);
  // With no face measured yet the fraction falls back to the pour
  // itself (the v481/v482 static-frame rule): the face fills by
  // the pour until its height lands, and the formula takes over
  // from the first measured frame.
  const faceFillFrac =
    safeHeader > 0
      ? Math.min(1, Math.max(0, (fillHeight - windowHeight) / safeHeader))
      : q;
  return { windowHeight, fillHeight, faceFillFrac };
}

/**
 * The household group unit: header card + member panel under one
 * pour. Owns the card's animated state outright (the roster's
 * expanded identity still lives with the screen — the accordion
 * and the seam rules read it — but no animated value does). The
 * header and panel arrive as elements; the panel element is cached
 * on its way in so a closing group keeps rendering its members for
 * the whole fold even though the screen has already let it go.
 *
 * v489: when the composition hands the unit a `cardStyle` (the
 * Classic path), the unit's root IS the one card of the approved
 * drawing — the surface (background, radius 28, the roster's
 * margins, the shadow) rides the root, the root clips, and the
 * fill runs full-bleed under that single outline. Without one
 * (the skinned paths) the root stays the bare relative box it
 * has been since v481 and the fill keeps its inset dress behind
 * the skinned header card.
 */
export function FamilyGroupUnit({
  expanded,
  accent,
  header,
  panel,
  cardStyle,
}: {
  expanded: boolean;
  accent: string;
  header: ReactNode;
  panel: ReactNode;
  cardStyle?: StyleProp<ViewStyle>;
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

  const geometry = useDerivedValue(() => familyPourGeometry(pour.value, headerHeight.value, panelHeight.value));
  const faceFillFrac = useDerivedValue(() => geometry.value.faceFillFrac);

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
    return { height: geometry.value.windowHeight };
  });
  // v486: the ONE fill layer's height — the bottom q of the unit's
  // current height, straight from the geometry. At rest open it is
  // 0; at rest closed it stands at the face's height behind the
  // face block, which paints above it, so the closed card's own
  // face (the card's interior fill, keyed to the same fraction)
  // is what the eye meets.
  const fillStyle = useAnimatedStyle(() => ({
    height: geometry.value.fillHeight,
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

  // v489: the one-card frames. With a cardStyle the root wears
  // the card surface itself and clips it (the single outline),
  // and the fill frame is full-bleed — left/right/bottom 0, no
  // radius of its own — so the card's outline is the only
  // outline the gesture can draw. Without one, both frames are
  // the v481–v488 shapes exactly: a bare relative root, and the
  // fill inset to the skinned header card's margins (12) with
  // its bottom corners (24).
  const oneCard = cardStyle !== undefined;
  const rootStyle: StyleProp<ViewStyle> = oneCard
    ? [cardStyle, { position: "relative", flexDirection: "column-reverse", overflow: "hidden" }]
    : { position: "relative", flexDirection: "column-reverse" };
  const fillFrame: ViewStyle = oneCard
    ? { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: accent }
    : {
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 0,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        backgroundColor: accent,
      };

  return (
    <View style={rootStyle}>
      <FamilyPourContext.Provider value={{ pour, faceFillFrac }}>
        {/* v486: the unit's tree is the mockup's paint order —
            .mwrap, then .fill, then .ghead — laid out by a
            column-reverse root: the window is the first in-flow
            child, so it displays BELOW the face block that follows
            it, while the tree order (which is RN's paint order)
            keeps the face above the fill. The window holds the
            member panel (v487: the progress block at its top,
            then the rows + Mark as Complete) — no colour ever
            lives inside it; the colour that covers the panel
            mid-flight is the fill layer standing over it. */}
        {panelHeld ? (
          <ReAnimated.View
            testID="family-pour-window"
            style={[{ overflow: "hidden" }, windowStyle]}
          >
            <View>{renderedPanel}</View>
          </ReAnimated.View>
        ) : null}
        {/* v486: the ONE fill layer — the mockup's .fill. Absolute,
            anchored to the unit's bottom edge, standing as tall as
            the geometry's fillHeight (the bottom q of the unit's
            current height). It paints ABOVE the window — the rising
            colour covers the folding rows, as the mockup's z-1
            layer covers its non-positioned .mwrap — and BELOW the
            face block, which is never covered. v489: its frame is
            fillFrame above — full-bleed in one-card mode (inset 0
            of the CARD, the way .fill is inset 0 of .gcard,
            clipped by the card's one outline); the inset dress
            (12 sides, 24 bottom corners, matching the skinned
            header card's own margins and corners) survives only
            on the skinned path. */}
        <ReAnimated.View
          testID="family-pour-fill"
          pointerEvents="none"
          style={[fillFrame, fillStyle]}
        />
        {/* The face block — the mockup's .ghead: in the app the
            one header element, the Classic head row ALONE
            (v487: the progress block rides in the panel again, so
            this measure is the header's height only; v489: the
            row itself, no card wrapper around it — the card is
            the unit's root). In flow (the column-reverse root
            sets it at the unit's top), never inside the animated
            window, so its layout report is a lawful measure of
            the face's height. */}
        <View
          testID="family-pour-face"
          onLayout={(event) => {
            headerHeight.value = event.nativeEvent.layout.height;
          }}
        >
          {header}
        </View>
        {/* v483: the measuring seat — OUT OF FLOW, invisible and
            inert. The panel's natural height is measured here,
            where no ancestor imposes a height (the seat is
            absolutely positioned at the unit's top, width-matched
            to the window), so the measurement can never be clamped
            by the window it sizes — the closed loop that kept
            v481/v482's groups shut on device (the window's height
            derives from panelHeight; measuring panelHeight from
            inside that window fixed-pointed at 0). The seat renders
            the same panel element the window shows, only while the
            group is held; content that changes while the group
            stands open re-measures through it for the next close. */}
        {panelHeld ? (
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
        ) : null}
      </FamilyPourContext.Provider>
    </View>
  );
}

/**
 * The fill inside the header card: the accent, anchored to the
 * card's bottom edge, standing exactly as tall as the pour's fill
 * has climbed into the face (faceFillFrac of the card's own
 * height — the card IS the whole face block in the app's
 * composition since v487). This is the face's
 * interior dress of the same fill whose unit-level layer covers
 * the folding panel; the two are one colour on one schedule.
 * Renders nothing outside a FamilyGroupUnit (the context is the
 * unit's to give).
 *
 * v489: RETAINED in this module but no longer composed anywhere
 * — in the one-card rebuild the unit's single fill paints the
 * face region directly (the mockup's .fill behind .ghead), so
 * an interior second fill would double-paint the same pixels.
 * It stays, like FamilyPourWave, as the standing dress if a
 * face ever needs a fill of its own again; its fraction law is
 * unchanged.
 */
export function FamilyPourFill({ color }: { color: string }) {
  const ctx = useContext(FamilyPourContext);
  const fillStyle = useAnimatedStyle(() => ({
    height: ctx ? `${ctx.faceFillFrac.value * 100}%` : "0%",
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
 * A face text that turns to the on-colour (white) as the fill
 * climbs the face behind it. Ranges keyed to faceFillFrac: the
 * header's name and meta flip across the face's reach
 * ([0.45, 1]). The "progress" variant keeps its early range
 * ([0, 0.35]) in the component's API, but since v487 no face
 * element wears it — the progress block renders plain in the
 * panel (Jonathan's ruling), so only name and meta flip now.
 * (The mockup flips by state with a .3s colour transition;
 * keying the flip to the fill's own fraction is the app's
 * standing way of wearing that flip on the pour's one value.)
 * Outside a unit it is a plain Text in its standing colour.
 */
export function FamilyPourText({
  variant,
  fromColor,
  style,
  children,
  ...textProps
}: {
  variant: "name" | "meta" | "progress";
  fromColor: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
} & Pick<TextProps, "numberOfLines" | "adjustsFontSizeToFit" | "minimumFontScale">) {
  const ctx = useContext(FamilyPourContext);
  const animatedStyle = useAnimatedStyle(() => {
    if (!ctx) return { color: fromColor };
    const range = variant === "progress" ? [0, 0.35] : [0.45, 1];
    return { color: interpolateColor(ctx.faceFillFrac.value, range, [fromColor, "#FFFFFF"]) };
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

/**
 * The progress row's wavy thread, flipping with the pour (v486):
 * the mockup's .wave path turns white as the closed state lands
 * (.pour:not(.open) .wave path { stroke: #fff }, a .3s colour
 * transition). WavyProgress takes plain colour props, so the flip
 * is worn the way the chevron wears its own — a twin in the
 * on-fill colours crossfading over the standing bar on the pour's
 * fraction (progress range, [0, 0.35]). v487: RETAINED in this
 * module but no longer composed anywhere — the panel's thread
 * renders plain through WavyProgress itself (the pre-v486 dress),
 * because the block now folds with the panel instead of standing
 * in the face. Outside a unit it is the plain bar in its
 * standing colours.
 */
export function FamilyPourWave({
  value,
  color,
  trackColor,
  height,
}: {
  value: number;
  color: string;
  trackColor: string;
  height?: number;
}) {
  const ctx = useContext(FamilyPourContext);
  const twinStyle = useAnimatedStyle(() => ({
    opacity: ctx
      ? interpolate(ctx.faceFillFrac.value, [0, 0.35], [0, 1], Extrapolation.CLAMP)
      : 0,
  }));
  if (!ctx) {
    return <WavyProgress value={value} color={color} trackColor={trackColor} height={height} />;
  }
  return (
    <View>
      <WavyProgress value={value} color={color} trackColor={trackColor} height={height} />
      <ReAnimated.View
        pointerEvents="none"
        style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }, twinStyle]}
      >
        <WavyProgress value={value} color="#FFFFFF" trackColor="rgba(255,255,255,0.35)" height={height} />
      </ReAnimated.View>
    </View>
  );
}
