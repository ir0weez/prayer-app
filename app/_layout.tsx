// TEMPORARY bisection build for the "PrayerCircle Test keeps stopping"
// startup crash. This minimal root imports ONLY react + react-native core
// (plus the tiny crash reporter so JS errors still surface on screen).
// If this launches, the crash is in one of the normal startup imports
// (reanimated, gesture-handler, notifications, trpc, providers, ...).
// If this ALSO crashes, the problem is in the native shell / build config,
// not the app's JS. Restore the real layout from
// ~/workspace/prayercircle-backups/prayercircle-2026-09-20-pre-minimal-root.tar.gz
// after diagnosis.
import "@/lib/test-crash-reporter";
import { StyleSheet, Text, View } from "react-native";

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PrayerCircle Test</Text>
      <Text style={styles.subtitle}>
        Minimal root is running. The native shell and the JS engine start fine
        — the startup crash is in one of the normal app imports.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#201334",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  subtitle: {
    color: "#c9b8f5",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
