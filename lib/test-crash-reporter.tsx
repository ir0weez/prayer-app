/**
 * TEMPORARY diagnostic for the "PrayerCircle Test" build only.
 *
 * The test build was crashing silently on startup, so instead of closing,
 * it now shows the actual error on screen (and in a native alert) so the
 * crash can be reported back and fixed. This module is completely inert in
 * production builds: every export below no-ops unless
 * EXPO_PUBLIC_APP_VARIANT === "test".
 *
 * TODO: remove this file and its wiring in app/_layout.tsx once the startup
 * crash is diagnosed and fixed.
 */
import React from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";

const variantFromEnv = process.env.EXPO_PUBLIC_APP_VARIANT === "test";
// Fallback that does not depend on env-var inlining at bundle time: the
// native app name/package are baked in from app.config.ts during prebuild,
// so the embedded manifest always reflects the test variant. (A build where
// NODE_ENV was unset caused Expo to ignore system env vars, silently
// disabling this reporter via the env check alone.)
const manifestName = Constants.expoConfig?.name ?? "";
const manifestPackage = Constants.expoConfig?.android?.package ?? "";
const variantFromManifest =
  manifestName === "PrayerCircle Test" || manifestPackage.endsWith(".test");

export const isTestVariant = variantFromEnv || variantFromManifest;

// Sentinel string so the built JS bundle can be inspected to confirm the
// reporter is actually live (grep the bundle for DIAG_REPORTER_ACTIVE_).
export const reporterSentinel = isTestVariant
  ? "DIAG_REPORTER_ACTIVE_9f3a7c2e"
  : "DIAG_REPORTER_INACTIVE_9f3a7c2e";

export type CrashInfo = {
  message: string;
  stack?: string;
};

export function toCrashInfo(error: unknown): CrashInfo {
  const err = error as { message?: unknown; stack?: unknown } | null | undefined;
  const message =
    typeof err?.message === "string" ? err.message : String(error);
  const stack = typeof err?.stack === "string" ? err.stack : undefined;
  return { message, stack };
}

// A crash that happened before React mounted (module load / entry point).
// The root component picks this up on first render.
let earlyCrash: CrashInfo | null = null;
const listeners = new Set<(info: CrashInfo) => void>();

function emitCrash(info: CrashInfo): void {
  earlyCrash = info;
  listeners.forEach((listener) => {
    try {
      listener(info);
    } catch {
      // never let the reporter itself crash
    }
  });
}

export function getEarlyCrash(): CrashInfo | null {
  return earlyCrash;
}

export function subscribeCrash(
  listener: (info: CrashInfo) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Installs a global JS error handler. Safe to call once; no-op unless this
 * is a test build. Shows a native alert with the error so it is visible even
 * if React never managed to mount, and forwards to subscribers (the crash
 * screen) when React is up.
 *
 * NOTE: intentionally does NOT rethrow / call the previous handler, so the
 * app stays alive long enough for the error to be read and screenshotted.
 */
export function installTestCrashHandler(): void {
  if (!isTestVariant) return;

  const errorUtils = (globalThis as unknown as Record<string, unknown>)[
    "ErrorUtils"
  ] as
    | {
        setGlobalHandler?: (handler: (error: unknown) => void) => void;
      }
    | undefined;

  if (!errorUtils || typeof errorUtils.setGlobalHandler !== "function") return;

  errorUtils.setGlobalHandler((error: unknown) => {
    const info = toCrashInfo(error);
    emitCrash(info);
    try {
      Alert.alert(
        "PrayerCircle Test crashed",
        `${info.message}\n\nPlease screenshot this and send it to Eva.`,
      );
    } catch {
      // Alert itself failed; the crash screen (if mounted) still shows it.
    }
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3d0a0a",
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  title: {
    color: "#ffd7d7",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#ffb3b3",
    fontSize: 14,
    marginBottom: 16,
  },
  messageBox: {
    backgroundColor: "#5c1212",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  message: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  stack: {
    color: "#e8b4b4",
    fontSize: 11,
    fontFamily: "monospace",
  },
});

export function CrashScreen({ info }: { info: CrashInfo }): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>The test app crashed on startup</Text>
      <Text style={styles.subtitle}>
        Screenshot this screen and send it to Eva so she can fix it.
      </Text>
      <View style={styles.messageBox}>
        <Text style={styles.message}>{info.message}</Text>
      </View>
      {info.stack ? (
        <ScrollView>
          <Text style={styles.stack}>{info.stack}</Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

type BoundaryProps = {
  children: React.ReactNode;
};

type BoundaryState = {
  crash: CrashInfo | null;
};

/**
 * Catches render-time crashes (including the first render) and shows the
 * crash screen. Rendered only in test builds.
 */
export class TestCrashBoundary extends React.Component<
  BoundaryProps,
  BoundaryState
> {
  state: BoundaryState = { crash: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { crash: toCrashInfo(error) };
  }

  componentDidCatch(error: unknown): void {
    emitCrash(toCrashInfo(error));
  }

  render(): React.ReactNode {
    if (this.state.crash) {
      return <CrashScreen info={this.state.crash} />;
    }
    return this.props.children;
  }
}

// Install immediately on import (this module should be the first import in
// app/_layout.tsx) so that even module-load-time crashes in other modules
// are reported. No-op unless this is a test build.
installTestCrashHandler();
