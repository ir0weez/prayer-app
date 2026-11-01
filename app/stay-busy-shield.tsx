/**
 * v401 — the Stay Busy Shield settings page (Jonathan's idea,
 * Oct 31; concept stay-busy-shield-concept-v1.html screen 3).
 *
 * He picks the apps that pull at him; the watcher (native,
 * modules/expo-stay-busy-shield) lays the "Like to stay busy?"
 * prompt over them when they open. This page is where the picks
 * live: the master toggle, the three permission states — honest,
 * each with the button that opens the right system Settings
 * screen — and the installed-apps list with a toggle per app.
 *
 * The shield is inert until the grants exist, and this page says
 * so. It also prints the promise the feature is built under: the
 * shield keeps no history. No record of what he opened, or what
 * he chose — the settings (toggle + list) are the only thing
 * stored, here and natively.
 */
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useKeepMeOccupiedMaterial } from "@/hooks/use-keep-me-occupied-material";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import {
  loadShieldSettings,
  saveShieldSettings,
  shieldWatcherState,
  type ShieldGrants,
  type ShieldSettings,
} from "@/lib/stay-busy-shield";
import {
  getShieldAppIcon,
  getShieldInstalledApps,
  hasShieldBatteryExemption,
  hasShieldOverlayPermission,
  hasShieldUsageAccess,
  isShieldWatcherRunning,
  openShieldBatterySettings,
  openShieldOverlaySettings,
  openShieldUsageAccessSettings,
  syncShield,
  type ShieldInstalledApp,
} from "@/modules/expo-stay-busy-shield/src/index";

export default function StayBusyShieldScreen() {
  const router = useRouter();
  const m = useKeepMeOccupiedMaterial();
  const [settings, setSettings] = useState<ShieldSettings | null>(null);
  const [grants, setGrants] = useState<ShieldGrants>({ usageAccess: false, overlay: false, batteryExemption: false });
  const [running, setRunning] = useState(false);
  const [apps, setApps] = useState<ShieldInstalledApp[]>([]);
  const [icons, setIcons] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const iconRunRef = useRef(0);

  const refresh = useCallback(async () => {
    const loaded = await loadShieldSettings();
    setSettings(loaded);
    setGrants({
      usageAccess: hasShieldUsageAccess(),
      overlay: hasShieldOverlayPermission(),
      batteryExemption: hasShieldBatteryExemption(),
    });
    // A stalled watcher (Android slept it, a reboot passed) starts
    // again just from this page opening — the sync is idempotent.
    syncShield(loaded.shielded, loaded.masterEnabled);
    setRunning(isShieldWatcherRunning());
    const installed = await getShieldInstalledApps();
    setApps(installed);
    // Icons arrive per row, a few at a time; the monogram holds
    // the seat until its icon lands.
    const run = ++iconRunRef.current;
    for (let i = 0; i < installed.length; i += 8) {
      if (iconRunRef.current !== run) return;
      const chunk = installed.slice(i, i + 8);
      const loadedIcons = await Promise.all(
        chunk.map(async (app) => [app.packageName, await getShieldAppIcon(app.packageName)] as const),
      );
      if (iconRunRef.current !== run) return;
      setIcons((current) => {
        const next = { ...current };
        for (const [pkg, b64] of loadedIcons) if (b64) next[pkg] = b64;
        return next;
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const apply = useCallback((next: ShieldSettings) => {
    setSettings(next);
    void saveShieldSettings(next).then(() => setRunning(isShieldWatcherRunning()));
  }, []);

  const toggleMaster = useCallback(() => {
    if (!settings) return;
    apply({ ...settings, masterEnabled: !settings.masterEnabled });
  }, [apply, settings]);

  const toggleApp = useCallback(
    (packageName: string) => {
      if (!settings) return;
      const shielded = settings.shielded.includes(packageName)
        ? settings.shielded.filter((p) => p !== packageName)
        : [...settings.shielded, packageName].sort();
      apply({ ...settings, shielded });
    },
    [apply, settings],
  );

  const visibleApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter((a) => a.label.toLowerCase().includes(q) || a.packageName.toLowerCase().includes(q));
  }, [apps, query]);

  const watcher = settings ? shieldWatcherState(settings, grants, running) : null;

  return (
    <ScreenContainer className="p-0">
      <ScrollView style={{ backgroundColor: m.ground }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={[styles.backButton, { backgroundColor: m.tonal }]}
          >
            <MaterialIcons name="chevron-left" size={22} color={m.tonalInk} />
          </Pressable>
          <Text style={[styles.title, { color: m.ink }]}>Stay Busy Shield</Text>
        </View>

        <View style={[styles.card, { backgroundColor: m.card, borderColor: m.line }]}>
          <View style={styles.masterRow}>
            <View style={[styles.shieldMark, { backgroundColor: m.redWashDeep }]}>
              <Text style={styles.shieldMarkText}>🌊</Text>
            </View>
            <View style={styles.masterText}>
              <Text style={[styles.masterLabel, { color: m.ink }]}>Shield</Text>
              <Text style={[styles.masterSub, { color: m.inkSoft }]}>
                {watcher ? watcher.line : "Reading the shield…"}
              </Text>
            </View>
            <ShieldToggle m={m} on={settings?.masterEnabled ?? false} onPress={toggleMaster} label="Shield master toggle" />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: m.inkSoft }]}>PERMISSIONS</Text>
        <PermissionRow
          m={m}
          granted={grants.usageAccess}
          label="Usage access"
          sub="So the shield can see a listed app open"
          onOpen={openShieldUsageAccessSettings}
        />
        <PermissionRow
          m={m}
          granted={grants.overlay}
          label="Draw over other apps"
          sub="What lays the prompt over the app you opened"
          onOpen={openShieldOverlaySettings}
        />
        <PermissionRow
          m={m}
          granted={grants.batteryExemption}
          label="Battery exemption"
          sub="Keeps Android from putting the watcher to sleep"
          onOpen={openShieldBatterySettings}
        />

        <Text style={[styles.sectionLabel, { color: m.inkSoft }]}>SHIELDED APPS</Text>
        <View style={[styles.searchBox, { backgroundColor: m.card, borderColor: m.line }]}>
          <MaterialIcons name="search" size={18} color={m.inkSoft} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your apps"
            placeholderTextColor={m.inkSoft}
            style={[styles.searchInput, { color: m.ink }]}
            accessibilityLabel="Search your apps"
          />
        </View>

        {apps.length === 0 ? (
          <Text style={[styles.empty, { color: m.inkSoft }]}>Reading the apps on this phone…</Text>
        ) : visibleApps.length === 0 ? (
          <Text style={[styles.empty, { color: m.inkSoft }]}>No app matches that search.</Text>
        ) : (
          visibleApps.map((app) => {
            const on = settings?.shielded.includes(app.packageName) ?? false;
            const icon = icons[app.packageName];
            return (
              <View key={app.packageName} style={[styles.appRow, { borderColor: m.line }]}>
                {icon ? (
                  <Image source={{ uri: `data:image/png;base64,${icon}` }} style={styles.appIcon} />
                ) : (
                  <View style={[styles.appIcon, styles.monogram, { backgroundColor: m.tonal }]}>
                    <Text style={[styles.monogramText, { color: m.tonalInk }]}>{app.label.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.appText}>
                  <Text style={[styles.appLabel, { color: m.ink }]}>{app.label}</Text>
                  <Text style={[styles.appSub, { color: m.inkSoft }]}>{on ? "Shielded" : "Not shielded"}</Text>
                </View>
                <ShieldToggle m={m} on={on} onPress={() => toggleApp(app.packageName)} label={`Shield ${app.label}`} />
              </View>
            );
          })
        )}

        <Text style={[styles.noLog, { color: m.inkSoft }]}>
          The shield keeps no history.{"\n"}No record of what you opened, or what you chose.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function PermissionRow({
  m,
  granted,
  label,
  sub,
  onOpen,
}: {
  m: KeepMeOccupiedMaterialFamily;
  granted: boolean;
  label: string;
  sub: string;
  onOpen: () => void;
}) {
  return (
    <View style={[styles.permRow, { backgroundColor: m.card, borderColor: m.line }]}>
      <View style={[styles.permDot, { backgroundColor: granted ? "#57D38C" : m.redFill }]} />
      <View style={styles.appText}>
        <Text style={[styles.appLabel, { color: m.ink }]}>{label}</Text>
        <Text style={[styles.appSub, { color: m.inkSoft }]}>{granted ? sub : `${sub} — not yet granted`}</Text>
      </View>
      {granted ? (
        <Text style={[styles.grantedText, { color: m.inkSoft }]}>Granted</Text>
      ) : (
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`Open settings for ${label}`}
          style={({ pressed }) => [styles.grantButton, { backgroundColor: m.seed }, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.grantButtonText}>Grant</Text>
        </Pressable>
      )}
    </View>
  );
}

function ShieldToggle({
  m,
  on,
  onPress,
  label,
}: {
  m: KeepMeOccupiedMaterialFamily;
  on: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={[styles.toggle, { backgroundColor: on ? m.seed : m.tonal }]}
    >
      <View style={[styles.toggleKnob, on ? styles.toggleKnobOn : styles.toggleKnobOff, { backgroundColor: on ? "#FFFFFF" : m.inkSoft }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 34 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  backButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "900" },
  card: { marginTop: 16, borderWidth: 1, borderRadius: 22, padding: 16 },
  masterRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  shieldMark: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  shieldMarkText: { fontSize: 21 },
  masterText: { flex: 1, minWidth: 0 },
  masterLabel: { fontSize: 16, fontWeight: "800" },
  masterSub: { fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.6, marginTop: 22, marginBottom: 9 },
  permRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
  },
  permDot: { width: 10, height: 10, borderRadius: 5 },
  grantedText: { fontSize: 12.5, fontWeight: "700" },
  grantButton: { borderRadius: 999, paddingHorizontal: 15, paddingVertical: 8 },
  grantButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 6,
  },
  searchInput: { flex: 1, fontSize: 14.5, padding: 0 },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  appIcon: { width: 40, height: 40, borderRadius: 12 },
  monogram: { alignItems: "center", justifyContent: "center" },
  monogramText: { fontSize: 16, fontWeight: "800" },
  appText: { flex: 1, minWidth: 0 },
  appLabel: { fontSize: 14.5, fontWeight: "700" },
  appSub: { fontSize: 12, marginTop: 1 },
  empty: { fontSize: 13, marginTop: 14 },
  toggle: { width: 46, height: 27, borderRadius: 99, justifyContent: "center" },
  toggleKnob: { width: 21, height: 21, borderRadius: 11 },
  toggleKnobOff: { marginLeft: 3 },
  toggleKnobOn: { marginLeft: 22 },
  noLog: { fontSize: 12, textAlign: "center", marginTop: 22, lineHeight: 17 },
});
