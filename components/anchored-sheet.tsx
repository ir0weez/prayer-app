// ─────────────────────────────────────────────────────────────────────────────
// v330 Part 1 — THE END OF SLIDE-UP SHEETS: the anchored sheet.
//
// Jonathan's ruling (2026-10-28, 23:18, locked 23:20): "make the
// info boxes come out of the button and then pressing save closes
// it back into a button... Do that to ALL the slide up crap."
//
// This is Material's container transform, shared by every small /
// medium editor that used to arrive as a bottom-slide Modal: the
// editor surface GROWS out of the control that summoned it and
// COLLAPSES BACK INTO that same control on Save, on ✕, on a scrim
// tap, and on hardware back. The summoning control's on-screen
// rect is measured at press time (measureEventAnchor /
// measureRefAnchor below) and handed in as `anchor`; the resting
// card's own rect is measured on layout, and one progress value
// interpolates the card between the two boxes — translate + scale
// about the card's centre, corners carried by the scale itself.
// The editor's CONTENT fades in only over the last portion of the
// expansion (progress 0.6 → 1), M3-style, while the container is
// already taking shape; the scrim fades across the whole run.
//
// Motion rules (his, non-negotiable): NO bounce, NO springs — a
// single emphasized easing curve (M3 emphasized, cubic-bezier
// (0.2, 0, 0, 1)) both ways, and every animated property is a
// transform or an opacity, so the whole morph runs on the native
// driver.
//
// When no anchor was measured (a summon path that routes through
// a menu component without press geometry), the card grows from
// its own bottom-centre edge instead — it materializes in place
// rather than sliding up the screen. The resting layout is the
// sheet's existing container: callers pass their old overlay
// style (minus its background — the scrim is separate now) as
// containerStyle, and the card keeps its current size, seat and
// content untouched. Keyboard behaviour is the caller's existing
// handling (e.g. the fast day sheet's keyboard-height padding on
// its container), which is independent of this transform.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

/** The summoning control's on-screen box, in window coordinates. */
export interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** M3 emphasized easing — the one curve both directions run on. */
export const ANCHORED_SHEET_EASING = Easing.bezier(0.2, 0, 0, 1);
export const ANCHORED_SHEET_OPEN_MS = 340;
export const ANCHORED_SHEET_CLOSE_MS = 260;

/** The content fade starts only once the container is mostly
 *  formed — the last portion of the expansion. */
export const ANCHORED_SHEET_CONTENT_FADE_START = 0.6;

/** Measure a press event's control in window coordinates. The
 *  callback always fires (null when the target can't be measured,
 *  in which case the sheet falls back to growing in place). */
export function measureEventAnchor(
  event: unknown,
  cb: (rect: AnchorRect | null) => void,
): void {
  const target = (event as { currentTarget?: unknown } | null)?.currentTarget as
    | { measureInWindow?: (fn: (x: number, y: number, w: number, h: number) => void) => void }
    | undefined;
  if (target && typeof target.measureInWindow === "function") {
    target.measureInWindow((x, y, width, height) => cb({ x, y, width, height }));
  } else {
    cb(null);
  }
}

/** Measure a ref'd control in window coordinates. */
export function measureRefAnchor(
  ref: RefObject<View | null>,
  cb: (rect: AnchorRect | null) => void,
): void {
  const node = ref.current as
    | { measureInWindow?: (fn: (x: number, y: number, w: number, h: number) => void) => void }
    | null;
  if (node && typeof node.measureInWindow === "function") {
    node.measureInWindow((x, y, width, height) => cb({ x, y, width, height }));
  } else {
    cb(null);
  }
}

interface AnchoredSheetProps {
  visible: boolean;
  /** Request close — fired by the scrim and by hardware back.
   *  Save / ✕ paths close through the caller's own state, which
   *  flips `visible` and runs the same collapse. */
  onClose: () => void;
  /** The measured rect of the control that summoned the sheet. */
  anchor?: AnchorRect | null;
  /** The sheet's existing overlay style (flex / justifyContent /
   *  padding — WITHOUT its background: the scrim renders apart). */
  containerStyle?: StyleProp<ViewStyle>;
  /** Scrim colour — each sheet keeps the dim it had. */
  scrimColor?: string;
  /** The card fills its container (the schedule creator sheets,
   *  whose formSheet is flex:1). Threads flex:1 through both
   *  animation layers so the layout chain is unchanged. */
  fill?: boolean;
  children: ReactNode;
}

export function AnchoredSheet({
  visible,
  onClose,
  anchor,
  containerStyle,
  scrimColor = "rgba(0,0,0,0.3)",
  fill = false,
  children,
}: AnchoredSheetProps) {
  // The sheet stays mounted while the collapse runs: `visible`
  // flipping false animates progress back to the anchor and only
  // then unmounts, so Save visibly folds the editor away.
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  const cardRef = useRef<View>(null);
  const [cardRect, setCardRect] = useState<AnchorRect | null>(null);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      Animated.timing(progress, {
        toValue: 1,
        duration: ANCHORED_SHEET_OPEN_MS,
        easing: ANCHORED_SHEET_EASING,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: ANCHORED_SHEET_CLOSE_MS,
        easing: ANCHORED_SHEET_EASING,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, mounted, progress]);

  if (!mounted) return null;

  // The morph's start box: the measured anchor when there is one;
  // otherwise a sliver at the card's own bottom-centre, so the
  // surface still grows in place instead of sliding up.
  const card = cardRect;
  const start = card
    ? anchor
      ? {
          cx: anchor.x + anchor.width / 2,
          cy: anchor.y + anchor.height / 2,
          sx: Math.max(anchor.width / Math.max(card.width, 1), 0.02),
          sy: Math.max(anchor.height / Math.max(card.height, 1), 0.02),
        }
      : {
          cx: card.x + card.width / 2,
          cy: card.y + card.height,
          sx: 0.3,
          sy: 0.02,
        }
    : null;

  const frameStyle = card && start
    ? {
        opacity: progress.interpolate({
          inputRange: [0, 0.25, 1],
          outputRange: [0, 1, 1],
        }),
        transform: [
          {
            translateX: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [start.cx - (card.x + card.width / 2), 0],
            }),
          },
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [start.cy - (card.y + card.height / 2), 0],
            }),
          },
          {
            scaleX: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [start.sx, 1],
            }),
          },
          {
            scaleY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [start.sy, 1],
            }),
          },
        ],
      }
    : { opacity: 0 };

  const contentStyle = {
    opacity: progress.interpolate({
      inputRange: [ANCHORED_SHEET_CONTENT_FADE_START, 1],
      outputRange: [0, 1],
    }),
  };

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: scrimColor,
          opacity: progress,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Dismiss" />
      </Animated.View>
      <View style={[{ flex: 1 }, containerStyle]} pointerEvents="box-none">
        <Animated.View
          ref={cardRef}
          onLayout={() => {
            cardRef.current?.measureInWindow((x, y, width, height) => {
              setCardRect((prev) =>
                prev && prev.x === x && prev.y === y && prev.width === width && prev.height === height
                  ? prev
                  : { x, y, width, height },
              );
            });
          }}
          style={[fill ? { flex: 1 } : null, frameStyle]}
        >
          <Animated.View style={[fill ? { flex: 1 } : null, contentStyle]}>{children}</Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}
