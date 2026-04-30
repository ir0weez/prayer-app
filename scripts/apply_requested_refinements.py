from pathlib import Path

ROOT = Path('/home/ubuntu/recreated-prayer-app')


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if old not in text:
        raise SystemExit(f'Pattern not found in {path}: {old[:120]!r}')
    path.write_text(text.replace(old, new, 1))


def replace_all(path: Path, old: str, new: str) -> None:
    text = path.read_text()
    if old not in text:
        raise SystemExit(f'Pattern not found in {path}: {old[:120]!r}')
    path.write_text(text.replace(old, new))

# Shared data behavior.
data = ROOT / 'lib/prayercircle-data.ts'
replace_once(
    data,
    '  return `${day}/${month}/${year}`;\n',
    '  return `${month}-${day}-${year}`;\n',
)
replace_once(
    data,
    '          lastPrayerCompletedDate: today,\n          prayerItems: p.prayerItems.map((item) => ({ ...item, isDone: true })),\n',
    '          lastPrayerCompletedDate: today,\n          lastPrayedDate: today,\n          prayerItems: p.prayerItems.map((item) => ({ ...item, isDone: true })),\n',
)
replace_once(
    data,
    '      id: `person-${Date.now()}-${people.length}`,\n',
    '      id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${people.length}`,\n',
)

# Unit tests for changed mark-prayed behavior and date formatting.
tests = ROOT / 'lib/prayercircle-data.test.ts'
replace_once(
    tests,
    '  getLastReachedAccentColor,\n',
    '  formatIsoDateForDisplay,\n  getLastReachedAccentColor,\n',
)
replace_once(
    tests,
    '    expect(updated[0].lastPrayerCompletedDate).toBe(today);\n    expect(updated[0].lastPrayedDate).toBeNull();\n',
    '    expect(updated[0].lastPrayerCompletedDate).toBe(today);\n    expect(updated[0].lastPrayedDate).toBe(today);\n',
)
replace_once(
    tests,
    '  it("calculates days since last prayed correctly", () => {\n',
    '  it("formats ISO dates as MM-DD-YYYY for display", () => {\n    expect(formatIsoDateForDisplay("2026-04-30")).toBe("04-30-2026");\n    expect(formatIsoDateForDisplay(null)).toBe("Never");\n  });\n\n  it("calculates days since last prayed correctly", () => {\n',
)

# Home screen changes.
home = ROOT / 'app/(tabs)/index.tsx'
replace_once(
    home,
    'import MaterialIcons from "@expo/vector-icons/MaterialIcons";\n',
    'import MaterialIcons from "@expo/vector-icons/MaterialIcons";\nimport { BlurView } from "expo-blur";\n',
)
replace_once(
    home,
    'const ADD_SCREEN_BG = "#EEF8FF";\n',
    'const ADD_SCREEN_BG = "#EEF8FF";\nconst AVATAR_PALETTE = ["#F4EAFE", "#E6F3FF", "#EAF9F0", "#FFF2DC", "#FFE9EF", "#EEF0FF"];\n',
)
replace_once(
    home,
    'function getAvatarText(person: Person) {\n  return person.avatarLabel ?? person.initials ?? person.name.substring(0, 2).toUpperCase();\n}\n',
    'function getAvatarText(person: Person) {\n  return person.avatarLabel ?? person.initials ?? person.name.substring(0, 2).toUpperCase();\n}\n\nfunction getAvatarPaletteColor(person: Person) {\n  const seed = person.id || person.name;\n  const total = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);\n  return AVATAR_PALETTE[total % AVATAR_PALETTE.length];\n}\n\nfunction getReachProgressRatio(daysSince: number) {\n  if (daysSince === 999 || daysSince <= 0) return 0;\n  return Math.min(daysSince, 14) / 14;\n}\n',
)
replace_once(
    home,
    '  const prayedTodayCount = dailyPrayerProgress.prayed;\n',
    '  const prayedTodayCount = dailyPrayerProgress.prayed;\n  const remainingPrayTodayCount = dailyPrayerProgress.total - dailyPrayerProgress.prayed;\n',
)
replace_once(
    home,
    '            backgroundColor: person.avatarColor,\n            borderWidth: story ? 0 : 0,\n',
    '            backgroundColor: person.photoUri ? person.avatarColor : getAvatarPaletteColor(person),\n            borderColor: person.photoUri ? "transparent" : "rgba(255,255,255,0.88)",\n            borderWidth: person.photoUri ? 0 : Math.max(1, size * 0.04),\n',
)
replace_once(
    home,
    '          <Text style={[styles.avatarText, { fontSize: textSize, color: person.avatarColor === "#2B151C" ? "#FFFFFF" : DEEP_TEXT }]}>\n            {label}\n          </Text>\n',
    '          <Text style={[styles.avatarText, { fontSize: textSize, color: person.accentColor }]}>\n            {label}\n          </Text>\n',
)
replace_once(
    home,
    '    const reachColor = daysSince === 999 ? "#E7E0EE" : getLastReachedAccentColor(person);\n    const reachText = daysSince === 999 ? "—" : formatDaysSinceLastPrayer(daysSince);\n',
    '    const reachColor = daysSince === 999 ? "#E7E0EE" : getLastReachedAccentColor(person);\n    const reachText = daysSince === 999 ? "—" : formatDaysSinceLastPrayer(daysSince);\n    const reachProgress = getReachProgressRatio(daysSince);\n',
)
replace_once(
    home,
    '          <View style={[styles.reachPill, { backgroundColor: reachColor }]}> \n            <Text style={[styles.reachPillText, daysSince === 999 && styles.reachPillTextMuted]}>{reachText}</Text>\n          </View>\n',
    '          <View style={[styles.reachPill, daysSince === 999 && styles.reachPillEmpty]}> \n            <View style={[styles.reachPillFill, { backgroundColor: reachColor, width: `${Math.round(reachProgress * 100)}%` }]} />\n            <Text style={[styles.reachPillText, (daysSince === 999 || reachProgress < 0.42) && styles.reachPillTextMuted]}>{reachText}</Text>\n          </View>\n',
)
replace_once(
    home,
    '            <Text style={styles.statNumber}>{prayTodayList.length || people.length}</Text>\n',
    '            <Text style={styles.statNumber}>{remainingPrayTodayCount}</Text>\n',
)
replace_once(
    home,
    '      <View style={styles.bottomNav}>\n        {renderTab("people", "People", "groups")}\n        {renderTab("reminders", "Reminders", "notifications")}\n        {renderTab("journal", "Journal", "article")}\n        {renderTab("settings", "Settings", "settings")}\n      </View>\n',
    '      <BlurView intensity={76} tint="light" experimentalBlurMethod="dimezisBlurView" style={styles.bottomNav}>\n        {renderTab("people", "People", "groups")}\n        {renderTab("reminders", "Reminders", "notifications")}\n        {renderTab("journal", "Journal", "article")}\n        {renderTab("settings", "Settings", "settings")}\n      </BlurView>\n',
)
replace_once(
    home,
    '    shadowColor: "#3E226B",\n    shadowOpacity: 0.34,\n',
    '    shadowColor: "#3E226B",\n    shadowOpacity: 0.26,\n',
)
replace_once(
    home,
    '    right: 36,\n    bottom: 122,\n    width: 64,\n    height: 64,\n    borderRadius: 32,\n',
    '    right: 15,\n    bottom: 34,\n    width: 58,\n    height: 58,\n    borderRadius: 29,\n',
)
replace_once(
    home,
    '    zIndex: 10,\n',
    '    zIndex: 12,\n',
)
replace_once(
    home,
    '    left: 53,\n    right: 53,\n',
    '    left: 18,\n    right: 83,\n',
)
replace_once(
    home,
    '    borderColor: "#E3DCE8",\n    backgroundColor: "rgba(255,255,255,0.96)",\n',
    '    borderColor: "rgba(255,255,255,0.62)",\n    backgroundColor: "rgba(255,255,255,0.56)",\n    overflow: "hidden",\n',
)
replace_once(
    home,
    '    shadowOpacity: 0.08,\n',
    '    shadowOpacity: 0.12,\n',
)
replace_once(
    home,
    '    backgroundColor: PURPLE,\n',
    '    backgroundColor: "rgba(133,87,217,0.92)",\n',
)
replace_once(
    home,
    '    alignItems: "center",\n    justifyContent: "center",\n    overflow: "hidden",\n  },\n',
    '    alignItems: "center",\n    justifyContent: "center",\n    overflow: "hidden",\n    shadowColor: "#3E226B",\n    shadowOpacity: 0.08,\n    shadowRadius: 7,\n    shadowOffset: { width: 0, height: 3 },\n    elevation: 1,\n  },\n',
)
replace_once(
    home,
    '  reachPill: {\n    minWidth: 52,\n    height: 26,\n    paddingHorizontal: 10,\n    borderRadius: 13,\n    alignItems: "center",\n    justifyContent: "center",\n  },\n',
    '  reachPill: {\n    minWidth: 58,\n    height: 26,\n    paddingHorizontal: 10,\n    borderRadius: 13,\n    alignItems: "center",\n    justifyContent: "center",\n    overflow: "hidden",\n    borderWidth: 1,\n    borderColor: "#E0D8EA",\n    backgroundColor: "#F7F2FB",\n  },\n  reachPillEmpty: {\n    backgroundColor: "#FBF8FE",\n    borderStyle: "dashed",\n  },\n  reachPillFill: {\n    position: "absolute",\n    left: 0,\n    top: 0,\n    bottom: 0,\n    borderRadius: 13,\n  },\n',
)
replace_once(
    home,
    '    color: "#FFFFFF",\n',
    '    color: "#FFFFFF",\n    zIndex: 1,\n',
)

# Person screen changes.
person = ROOT / 'app/(tabs)/person.tsx'
replace_once(
    person,
    '  const daysSinceLastReached = currentPerson ? getDaysSinceLastPrayed(currentPerson.lastPrayedDate) : 999;\n',
    '  const daysSinceLastReached = currentPerson ? getDaysSinceLastPrayed(currentPerson.lastPrayedDate) : 999;\n  const hasPrayedToday = currentPerson ? currentPerson.lastPrayerCompletedDate === getTodayISOString() || currentPerson.lastPrayedDate === getTodayISOString() : false;\n',
)
replace_once(
    person,
    '        <Text style={styles.headerTitle}>Prayer List</Text>\n        <Pressable onPress={openReminderModal} style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}>\n          <MaterialIcons name={iconName("notifications")} size={25} color={PURPLE} />\n        </Pressable>\n',
    '        <Text style={styles.headerTitle}>Prayer List</Text>\n        <Pressable onPress={openReminderModal} style={({ pressed }) => [styles.headerEditButton, pressed && styles.pressed]}>\n          <Text style={styles.headerEditButtonText}>Edit</Text>\n        </Pressable>\n',
)
replace_once(
    person,
    '          style={({ pressed }) => [styles.actionButton, { backgroundColor: currentPerson.accentColor }, pressed && styles.pressed]}\n        >\n          <MaterialIcons name={iconName("waving-hand")} size={22} color="#FFFFFF" />\n          <Text style={styles.actionButtonText}>Mark Reached Today</Text>\n',
    '          style={({ pressed }) => [styles.actionButton, { backgroundColor: hasPrayedToday ? "#31C48D" : currentPerson.accentColor }, pressed && styles.pressed]}\n        >\n          <MaterialIcons name={iconName(hasPrayedToday ? "check-circle" : "volunteer-activism")} size={22} color="#FFFFFF" />\n          <Text style={styles.actionButtonText}>{hasPrayedToday ? "Prayed Today" : "Mark as Prayed"}</Text>\n',
)
replace_once(
    person,
    '  headerIconButton: {\n    width: 42,\n    height: 42,\n    borderRadius: 21,\n    alignItems: "center",\n    justifyContent: "center",\n  },\n',
    '  headerIconButton: {\n    width: 42,\n    height: 42,\n    borderRadius: 21,\n    alignItems: "center",\n    justifyContent: "center",\n  },\n  headerEditButton: {\n    minWidth: 64,\n    height: 38,\n    paddingHorizontal: 16,\n    borderRadius: 19,\n    backgroundColor: "#EFE8FB",\n    alignItems: "center",\n    justifyContent: "center",\n  },\n  headerEditButtonText: {\n    color: PURPLE,\n    fontSize: 15,\n    fontWeight: "900",\n    lineHeight: 19,\n  },\n',
)

print('Applied PrayerCircle requested refinements.')
