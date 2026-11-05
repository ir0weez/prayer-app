// ─── v437 — the app's JS entry (package.json "main") ────────────────────────
// This file exists because of how the Android widget library wakes
// the app. react-native-android-widget's native provider starts a
// WorkManager worker (RNWidgetBackgroundTaskWorker) that boots the
// React host and invokes the headless task "RNWidgetBackgroundTask".
// A headless wake evaluates ONLY what the bundle's entry module
// evaluates: expo-router/entry by itself merely REGISTERS the root
// component — the route tree (app/_layout.tsx included) is required
// lazily when ExpoRoot renders, and a headless context never
// renders. In v436 the widget task handler was imported only by
// app/_layout.tsx, so on a cold headless wake registerHeadlessTask
// never ran, the OS render call died silently, and every widget
// stayed on its transparent initialLayout (@layout/rn_widget) —
// blank in the picker and blank on the home screen.
//
// The fix is evaluation order, nothing else: the widget task
// handler registers FIRST, at entry scope, in every JS context the
// OS can start (foreground or headless); then the router entry
// evaluates exactly as before. app/_layout.tsx keeps its own import
// as a second belt — module evaluation is cached, so the handler
// registers once per context either way.
import "./lib/widget-task-handler";
import "expo-router/entry";
