import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Animated, ScrollView, View } from "react-native";
import { cameraScrollFor } from "@/lib/walkable-town";

// ---------- walkable town viewport (v290; two-axis + camera-only from v291) ----------
// The town as ONE continuous, scrollable surface inside a fixed-size
// window. This shell is the CAMERA and nothing else:
//
//   - drag to look around: the window is native ScrollViews, so a
//     drag scrolls the town with the phone's own physics;
//   - follow: while the Hero walks a tap command, the camera eases
//     after him (scroll offsets only — no game state lives here).
//
// v291 interaction ruling (the v290 device verdict — "nothing is
// really tappable"): v290 put ONE full-world ground Pressable in
// this shell, as a sibling UNDER the whole map subtree, and routed
// every tap through it. React Native delivers a touch to the
// deepest hit view and negotiates responders up that view's
// ANCESTOR chain only — a sibling layer can never receive a tap
// that lands on the map's own views, so the ground (and every
// building, door and lot routed through it) was unreachable on
// device. The shell therefore owns NO press handling at all now:
// every interactive element — each place's doorstep, the register
// pile, each villager, and the street's own ground — is a real
// Pressable rendered INSIDE the world subtree, above the art it
// belongs to (components/wide-street, components/street-villagers),
// where the touch path actually reaches it.
//
// v291: the town became a WIDE street — wider than the screen — so
// the camera works both axes: a horizontal ScrollView carries a
// vertical one. When the world fits the viewport's width the shell
// renders a single vertical window, as in v290.
//
// No timers settle anything here: the follow loop only moves the
// camera while a walk is in flight and stills itself when the Hero
// stops; it never touches the save, the ledger, or the clock.

export function WalkableTownShell({
  enabled,
  worldW,
  worldH,
  viewportH,
  viewportW,
  heroPosRef,
  followNonce,
  children,
}: {
  /** When false (every map but the town), children render untouched. */
  enabled: boolean;
  worldW: number;
  worldH: number;
  viewportH: number;
  /** The window's width in px. Defaults to the world's width (no
   *  horizontal travel — the v290 shape). */
  viewportW?: number;
  /** The Hero's live pixel position (feet anchor), written by the pawn. */
  heroPosRef: RefObject<{ x: number; y: number }>;
  /** Increments each time a tap-to-walk command starts: follow him. */
  followNonce: number;
  children: ReactNode;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollXRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const scrollXPosRef = useRef(0);
  const userHoldRef = useRef(false);
  const followGenRef = useRef(0);

  const viewW = viewportW ?? worldW;
  const horizontal = worldW > viewW;

  /* The follow loop: while a command walk is in flight, ease the
   * scroll offsets toward the Hero. Stills itself when the Hero
   * stops moving and the camera has caught up, when the user grabs
   * the map, or when the shell unmounts. Pure camera work — reads a
   * ref and scrolls views; it settles no state. */
  useEffect(() => {
    if (!enabled || followNonce === 0) return;
    userHoldRef.current = false;
    followGenRef.current += 1;
    const gen = followGenRef.current;
    let lastHero = "";
    let stillTicks = 0;
    let cancelled = false;
    const settleCamera = (animated: boolean) => {
      const hero = heroPosRef.current;
      if (!hero) return;
      if (horizontal) {
        scrollXRef.current?.scrollTo({
          x: cameraScrollFor(hero.x, viewW, worldW),
          animated,
        });
      }
      scrollRef.current?.scrollTo({
        y: cameraScrollFor(hero.y + 4, viewportH, worldH),
        animated,
      });
    };
    const tick = () => {
      if (cancelled || gen !== followGenRef.current || userHoldRef.current) return;
      const hero = heroPosRef.current;
      if (hero) {
        const heroKey = `${Math.round(hero.x)},${Math.round(hero.y)}`;
        const desiredY = cameraScrollFor(hero.y + 4, viewportH, worldH);
        const desiredX = horizontal ? cameraScrollFor(hero.x, viewW, worldW) : 0;
        const drift = Math.max(
          Math.abs(desiredY - scrollYRef.current),
          Math.abs(desiredX - scrollXPosRef.current)
        );
        if (heroKey === lastHero) stillTicks += 1;
        else {
          stillTicks = 0;
          lastHero = heroKey;
        }
        if (drift > 2) {
          settleCamera(true);
        } else if (stillTicks > 10) {
          return; // the Hero has stopped and the camera has caught up
        }
      }
      Animated.delay(140).start(() => tick());
    };
    // Settle the camera on the Hero right away, then keep easing.
    settleCamera(true);
    Animated.delay(140).start(() => tick());
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, followNonce]);

  if (!enabled) return <>{children}</>;

  const world = (
    <View style={{ width: worldW, height: worldH, position: "relative" }}>
      {children}
    </View>
  );

  const verticalWindow = (
    <ScrollView
      ref={scrollRef}
      style={{ height: viewportH, width: worldW }}
      contentContainerStyle={{ width: worldW, height: worldH }}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={(e) => {
        scrollYRef.current = e.nativeEvent.contentOffset.y;
      }}
      onScrollBeginDrag={() => {
        // The user's own drag outranks the camera until the next walk.
        userHoldRef.current = true;
        followGenRef.current += 1;
      }}
      nestedScrollEnabled
    >
      {world}
    </ScrollView>
  );

  if (!horizontal) return verticalWindow;

  return (
    <ScrollView
      ref={scrollXRef}
      horizontal
      style={{ height: viewportH, width: viewW }}
      contentContainerStyle={{ width: worldW, height: viewportH }}
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={(e) => {
        scrollXPosRef.current = e.nativeEvent.contentOffset.x;
      }}
      onScrollBeginDrag={() => {
        userHoldRef.current = true;
        followGenRef.current += 1;
      }}
      nestedScrollEnabled
    >
      {verticalWindow}
    </ScrollView>
  );
}
