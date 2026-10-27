import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Animated, Pressable, ScrollView, View } from "react-native";
import { cameraScrollFor } from "@/lib/walkable-town";

// ---------- walkable town viewport (v290) ----------
// The town as ONE continuous, scrollable surface. The world itself —
// its ground, buildings, villagers, coin piles, all of it — is the
// existing map content, rendered unchanged inside a fixed-height
// window. What this shell adds is the camera and the ground's ears:
//
//   - drag to look around: the window is a native ScrollView, so a
//     drag scrolls the town with the phone's own physics;
//   - follow: while the Hero walks a tap command, the camera eases
//     after him (scroll offsets only — no game state lives here);
//   - tap-to-walk: a full-world ground Pressable sits beneath the
//     town's own interactive pieces (villagers, coin piles, visitor
//     badges keep their own taps — they render above it). Anything
//     else that lands on the ground reports WORLD pixel coordinates
//     to the parent, which plans the walk. A long press reports too.
//
// No timers settle anything here: the follow loop only moves the
// camera while a walk is in flight and stills itself when the Hero
// stops; it never touches the save, the ledger, or the clock.

export function WalkableTownShell({
  enabled,
  worldW,
  worldH,
  viewportH,
  heroPosRef,
  followNonce,
  onTapWorld,
  onLongPressWorld,
  children,
}: {
  /** When false (every map but the town), children render untouched. */
  enabled: boolean;
  worldW: number;
  worldH: number;
  viewportH: number;
  /** The Hero's live pixel position (feet anchor), written by the pawn. */
  heroPosRef: RefObject<{ x: number; y: number }>;
  /** Increments each time a tap-to-walk command starts: follow him. */
  followNonce: number;
  onTapWorld: (px: { x: number; y: number }) => void;
  onLongPressWorld: (px: { x: number; y: number }) => void;
  children: ReactNode;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const userHoldRef = useRef(false);
  const followGenRef = useRef(0);

  /* The follow loop: while a command walk is in flight, ease the
   * scroll offset toward the Hero. Stills itself when the Hero stops
   * moving and the camera has caught up, when the user grabs the map,
   * or when the shell unmounts. Pure camera work — reads a ref and
   * scrolls a view; it settles no state. */
  useEffect(() => {
    if (!enabled || followNonce === 0) return;
    userHoldRef.current = false;
    followGenRef.current += 1;
    const gen = followGenRef.current;
    let lastHero = "";
    let stillTicks = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled || gen !== followGenRef.current || userHoldRef.current) return;
      const hero = heroPosRef.current;
      if (hero) {
        const heroKey = `${Math.round(hero.x)},${Math.round(hero.y)}`;
        const desired = cameraScrollFor(hero.y + 4, viewportH, worldH);
        const drift = Math.abs(desired - scrollYRef.current);
        if (heroKey === lastHero) stillTicks += 1;
        else {
          stillTicks = 0;
          lastHero = heroKey;
        }
        if (drift > 2) {
          scrollRef.current?.scrollTo({ y: desired, animated: true });
        } else if (stillTicks > 10) {
          return; // the Hero has stopped and the camera has caught up
        }
      }
      Animated.delay(140).start(() => tick());
    };
    // Settle the camera on the Hero right away, then keep easing.
    const hero = heroPosRef.current;
    if (hero) {
      scrollRef.current?.scrollTo({
        y: cameraScrollFor(hero.y + 4, viewportH, worldH),
        animated: true,
      });
    }
    Animated.delay(140).start(() => tick());
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, followNonce]);

  if (!enabled) return <>{children}</>;

  return (
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
      <View style={{ width: worldW, height: worldH, position: "relative" }}>
        {/* The ground's ears: everything the town itself doesn't claim
            (buildings' art is pointer-events-none; villagers, coins
            and badges render above and take their own taps). */}
        <Pressable
          style={{ position: "absolute", left: 0, top: 0, width: worldW, height: worldH }}
          onPress={(e) =>
            onTapWorld({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY })
          }
          onLongPress={(e) =>
            onLongPressWorld({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY })
          }
          delayLongPress={450}
        />
        {children}
      </View>
    </ScrollView>
  );
}
