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
//    so no measurement can clamp it.

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
/** Both household panels (Classic and skinned) trail a marginBottom
 * of 10 in their FamilyPanel outerStyle; the pour's fill segment
 * ends at the panel surface's bottom edge, above that margin. */
const FAMILY_PANEL_TRAILING_MARGIN = 10;

type FamilyPourContextValue = {
  /** 1 = the closed card stands full of the accent; 0 = drained open. */
  pour: SharedValue<number>;
  /** How far the fill has risen through the HEADER card, 0..1. */
  headerFillFrac: SharedValue<number>;
};

export const FamilyPourContext = createContext<FamilyPourContextValue | null>(null);

export type FamilyPourFront = {
  /** The panel window's height right now (content clipped to it). */
  panelWindowHeight: number;
  /** The fill's height inside the panel segment, from its bottom. */
  panelFillHeight: number;
  /** The fill's rise through the header card, 0..1. */
  headerFillFrac: number;
};

/**
 * The pour's geometry, pure. One front of colour travels the whole
 * unit — panel segment first, then the header card — at one speed,
 * while the panel window folds away over the same travel: at any
 * pour value the front has climbed `pour` of the unit's full height
 * (header + panel) measured from the unit's bottom edge. The panel
 * window still standing is the part of the panel the front has not
 * reached as FOLD — the window's own shrink and the front's rise
 * are the same motion read from two edges, which is why the rows
 * read as folding INTO the colour rather than sliding away from it.
 */
export function familyPourFront(pour: number, headerHeight: number, panelHeight: number): FamilyPourFront {
  const clamped = Math.min(1, Math.max(0, pour));
  const total = headerHeight + panelHeight;
  const front = clamped * total;
  const panelWindowHeight = (1 - clamped) * panelHeight;
  const panelFillHeight = Math.min(Math.max(front, 0), panelWindowHeight);
  const headerFillPx = Math.min(Math.max(front - panelWindowHeight, 0), headerHeight);
  const headerFillFrac = headerHeight > 0 ? headerFillPx / headerHeight : clamped;
  return { panelWindowHeight, panelFillHeight, headerFillFrac };
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
  if (panel) heldPanelRef.current = panel;
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  useEffect(() => {
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
  // fresh from the layout reports below.
  const windowStyle = useAnimatedStyle(() => {
    if (pour.value === 0) return { height: undefined };
    return { height: front.value.panelWindowHeight };
  });
  const panelFillStyle = useAnimatedStyle(() => ({
    height: Math.max(0, front.value.panelFillHeight - FAMILY_PANEL_TRAILING_MARGIN),
  }));

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
          <ReAnimated.View style={[{ overflow: "hidden" }, windowStyle]}>
            <View
              onLayout={(event) => {
                panelHeight.value = event.nativeEvent.layout.height;
              }}
            >
              {heldPanelRef.current}
            </View>
            <ReAnimated.View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  left: 12,
                  right: 12,
                  bottom: FAMILY_PANEL_TRAILING_MARGIN,
                  backgroundColor: accent,
                  borderBottomLeftRadius: 24,
                  borderBottomRightRadius: 24,
                },
                panelFillStyle,
              ]}
            />
          </ReAnimated.View>
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
