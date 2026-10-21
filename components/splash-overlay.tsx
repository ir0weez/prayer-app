import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { getAppIconDef, loadSelectedAppIconId } from "@/lib/app-icons";
import {
  SPLASH_BREATHE_MS,
  SPLASH_EMBLEM_SIZE,
  SPLASH_FADE_MS,
  shouldStartSplashFade,
  splashBackgroundForIcon,
} from "@/lib/splash";

/**
 * Animated in-app splash (v166).
 *
 * The native splash (static, configured in app.config.ts) shows the app
 * icon's own art on the icon's field color; the moment the root layout
 * mounts, this overlay takes over with a pixel-matched twin — same
 * background, same emblem at the same 200dp — so the handoff is
 * seamless, and the emblem breathes (a slow sine scale + glow, native
 * driver, no bounce) while the app finishes loading.
 *
 * It never delays the app: it fades on opacity as soon as the root
 * layout reports ready (with a ~600ms minimum so it doesn't flash, and
 * a ~2.5s hard maximum so a slow load can't trap anyone here), unlocks
 * touches the moment the fade starts, and removes itself from the tree
 * when the fade completes.
 *
 * If the user has picked a different launcher icon, its art and field
 * color replace the default's as soon as the stored selection loads —
 * the native splash can't know the selection (Android constraint), so
 * it always shows the default; the swap lands within the first frames,
 * while the scene is otherwise identical.
 */
export function SplashOverlay({ ready }: { ready: boolean }) {
  const [iconId, setIconId] = useState<string>("original");
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  const mountedAtRef = useRef<number | null>(null);
  if (mountedAtRef.current === null) mountedAtRef.current = Date.now();

  const opacity = useSharedValue(1);
  const breathe = useSharedValue(0);

  // Slow sine breathing: emblem scale + a soft halo behind it. Two
  // moving elements, both transforms/opacity on the native driver.
  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, {
        duration: SPLASH_BREATHE_MS,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [breathe]);

  useEffect(() => {
    let live = true;
    loadSelectedAppIconId()
      .then((id) => {
        if (live) setIconId(id);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  // Fade scheduling: poll the pure display rule — fade when ready past
  // the minimum, or at the hard maximum regardless of readiness.
  useEffect(() => {
    if (fading) return;
    const tick = () => {
      const elapsed = Date.now() - (mountedAtRef.current ?? Date.now());
      if (shouldStartSplashFade(elapsed, ready)) {
        setFading(true);
        return true;
      }
      return false;
    };
    if (tick()) return;
    const interval = setInterval(() => {
      if (tick()) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [ready, fading]);

  useEffect(() => {
    if (!fading) return;
    opacity.value = withTiming(
      0,
      { duration: SPLASH_FADE_MS, easing: Easing.out(Easing.ease) },
      (finished) => {
        if (finished) runOnJS(setGone)(true);
      },
    );
  }, [fading, opacity]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const emblemStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.045 }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.16 + breathe.value * 0.2,
    transform: [{ scale: 1 + breathe.value * 0.1 }],
  }));

  if (gone) return null;

  const iconDef = getAppIconDef(iconId);

  return (
    <Animated.View
      pointerEvents={fading ? "none" : "auto"}
      style={[
        styles.container,
        { backgroundColor: splashBackgroundForIcon(iconId) },
        containerStyle,
      ]}
    >
      <View style={styles.center}>
        <Animated.View style={[styles.glow, glowStyle]} />
        <Animated.View style={emblemStyle}>
          <Image
            source={iconDef.file}
            style={{ width: SPLASH_EMBLEM_SIZE, height: SPLASH_EMBLEM_SIZE }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: SPLASH_EMBLEM_SIZE * 1.45,
    height: SPLASH_EMBLEM_SIZE * 1.45,
    borderRadius: (SPLASH_EMBLEM_SIZE * 1.45) / 2,
    backgroundColor: "#E8B44C",
  },
});
