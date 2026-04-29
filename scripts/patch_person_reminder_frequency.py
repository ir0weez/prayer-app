from pathlib import Path

path = Path('/home/ubuntu/recreated-prayer-app/app/(tabs)/person.tsx')
text = path.read_text()

replacements = [
    (
        '''  getLastReachedAccentColor,
  getTodayISOString,
  getUrgentPrayerItems,
  markPersonPrayed,''',
        '''  getLastReachedAccentColor,
  getReminderScheduleText,
  getTodayISOString,
  markPersonPrayed,''',
    ),
    (
        '''  updatePersonReminderWithTime,
  type Person,''',
        '''  updatePersonReminderWithTime,
  type Person,
  type ReminderFrequency,''',
    ),
    (
        'const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];',
        'const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];\nconst REMINDER_FREQUENCIES: Array<{ value: ReminderFrequency; label: string; description: string }> = [\n  { value: "daily", label: "Daily", description: "Every day" },\n  { value: "weekly", label: "Weekly", description: "Specific weekdays" },\n  { value: "monthly", label: "Monthly", description: "A day each month" },\n  { value: "none", label: "Off", description: "Do not show" },\n];',
    ),
    (
        '''async function schedulePersonReminders(person: Person, daysOfWeek: number[], reminderTime: string) {
  if (Platform.OS === "web") return;

  const parsedTime = parseReminderTime(reminderTime);
  if (!parsedTime) return;

  await cancelScheduledRemindersForPerson(person.id);
  if (daysOfWeek.length === 0) return;

  await Promise.all(
    daysOfWeek.map((day) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: `Pray for ${person.name}`,
          body: person.prayerNote ? person.prayerNote : "Take a moment to pray and reach out.",
          data: { personId: person.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          channelId: Platform.OS === "android" ? "prayer-reminders" : undefined,
          weekday: day + 1,
          hour: parsedTime.hour,
          minute: parsedTime.minute,
        },
      }),
    ),
  );
}''',
        '''async function schedulePersonReminders(
  person: Person,
  frequency: ReminderFrequency,
  daysOfWeek: number[],
  reminderDayOfMonth: number | undefined,
  reminderTime: string,
) {
  if (Platform.OS === "web") return;

  const parsedTime = parseReminderTime(reminderTime);
  if (!parsedTime) return;

  await cancelScheduledRemindersForPerson(person.id);
  if (frequency === "none") return;

  const baseContent = {
    title: `Pray for ${person.name}`,
    body: person.prayerNote ? person.prayerNote : "Take a moment to pray and reach out.",
    data: { personId: person.id },
  };
  const channelId = Platform.OS === "android" ? "prayer-reminders" : undefined;

  if (frequency === "daily") {
    await Notifications.scheduleNotificationAsync({
      content: baseContent,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId,
        hour: parsedTime.hour,
        minute: parsedTime.minute,
      },
    });
    return;
  }

  if (frequency === "monthly" && reminderDayOfMonth) {
    await Notifications.scheduleNotificationAsync({
      content: baseContent,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        channelId,
        day: reminderDayOfMonth,
        hour: parsedTime.hour,
        minute: parsedTime.minute,
      },
    });
    return;
  }

  if (frequency === "weekly") {
    await Promise.all(
      daysOfWeek.map((day) =>
        Notifications.scheduleNotificationAsync({
          content: baseContent,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            channelId,
            weekday: day + 1,
            hour: parsedTime.hour,
            minute: parsedTime.minute,
          },
        }),
      ),
    );
  }
}''',
    ),
    (
        '''  const [showReminderModal, setShowReminderModal] = useState(false);
  const [draftReminderDays, setDraftReminderDays] = useState<number[]>([]);
  const [draftReminderTime, setDraftReminderTime] = useState("08:00");''',
        '''  const [showReminderModal, setShowReminderModal] = useState(false);
  const [draftReminderFrequency, setDraftReminderFrequency] = useState<ReminderFrequency>("none");
  const [draftReminderDays, setDraftReminderDays] = useState<number[]>([]);
  const [draftReminderMonthDay, setDraftReminderMonthDay] = useState("1");
  const [draftReminderTime, setDraftReminderTime] = useState("08:00");''',
    ),
    (
        '  const urgentItems = currentPerson ? getUrgentPrayerItems(currentPerson) : [];\n  const doneCount = currentPerson?.prayerItems.filter((item) => item.isDone).length ?? 0;',
        '  const doneCount = currentPerson?.prayerItems.filter((item) => item.isDone).length ?? 0;',
    ),
    (
        '''  const openReminderModal = () => {
    if (!currentPerson) return;
    setDraftReminderDays(currentPerson.reminderDaysOfWeek);
    setDraftReminderTime(currentPerson.reminderTime ?? "08:00");
    setShowReminderModal(true);
  };''',
        '''  const openReminderModal = () => {
    if (!currentPerson) return;
    setDraftReminderFrequency(currentPerson.reminderFrequency ?? (currentPerson.reminderDaysOfWeek.length > 0 ? "weekly" : "none"));
    setDraftReminderDays(currentPerson.reminderDaysOfWeek);
    setDraftReminderMonthDay(String(currentPerson.reminderDayOfMonth ?? new Date().getDate()));
    setDraftReminderTime(currentPerson.reminderTime ?? "08:00");
    setShowReminderModal(true);
  };''',
    ),
    (
        '''  const toggleDraftReminderDay = (day: number) => {
    setDraftReminderDays((previousDays) =>
      previousDays.includes(day)
        ? previousDays.filter((candidate) => candidate !== day)
        : [...previousDays, day].sort((a, b) => a - b),
    );
  };''',
        '''  const toggleDraftReminderDay = (day: number) => {
    setDraftReminderFrequency("weekly");
    setDraftReminderDays((previousDays) =>
      previousDays.includes(day)
        ? previousDays.filter((candidate) => candidate !== day)
        : [...previousDays, day].sort((a, b) => a - b),
    );
  };''',
    ),
    (
        '''  const handleSaveReminder = async () => {
    if (!currentPerson || !personId) return;
    const parsedTime = parseReminderTime(draftReminderTime);
    if (!parsedTime) {
      Alert.alert("Check reminder time", "Use a 24-hour time such as 08:30 or 19:15.");
      return;
    }

    const permissionGranted = await requestReminderPermissions();
    if (!permissionGranted && draftReminderDays.length > 0) {
      Alert.alert("Notifications are off", "Prayer days were saved, but reminders cannot be scheduled until notifications are enabled.");
    }

    const nextPeople = updatePersonReminderWithTime(people, personId, draftReminderDays, parsedTime.normalized);
    setPeople(nextPeople);
    const updatedPerson = nextPeople.find((person) => person.id === personId) ?? currentPerson;

    if (permissionGranted) {
      await schedulePersonReminders(updatedPerson, draftReminderDays, parsedTime.normalized).catch(() => {
        Alert.alert("Reminder saved", "The reminder settings were saved, but notification scheduling could not be completed on this device.");
      });
    }

    setShowReminderModal(false);
  };''',
        '''  const handleSaveReminder = async () => {
    if (!currentPerson || !personId) return;
    const parsedTime = parseReminderTime(draftReminderTime);
    if (!parsedTime) {
      Alert.alert("Check reminder time", "Use a 24-hour time such as 08:30 or 19:15.");
      return;
    }

    const normalizedMonthDay = Number(draftReminderMonthDay);
    if (draftReminderFrequency === "weekly" && draftReminderDays.length === 0) {
      Alert.alert("Choose days", "Select at least one weekday for a weekly prayer reminder.");
      return;
    }
    if (draftReminderFrequency === "monthly" && (!Number.isInteger(normalizedMonthDay) || normalizedMonthDay < 1 || normalizedMonthDay > 31)) {
      Alert.alert("Check monthly day", "Choose a day from 1 to 31 for monthly reminders.");
      return;
    }

    const permissionGranted = await requestReminderPermissions();
    if (!permissionGranted && draftReminderFrequency !== "none") {
      Alert.alert("Notifications are off", "Prayer reminders were saved, but notification alerts cannot be scheduled until notifications are enabled.");
    }

    const nextPeople = updatePersonReminderWithTime(
      people,
      personId,
      draftReminderFrequency === "weekly" ? draftReminderDays : [],
      parsedTime.normalized,
      draftReminderFrequency,
      draftReminderFrequency === "monthly" ? normalizedMonthDay : undefined,
    );
    setPeople(nextPeople);
    const updatedPerson = nextPeople.find((person) => person.id === personId) ?? currentPerson;

    if (permissionGranted) {
      await schedulePersonReminders(
        updatedPerson,
        draftReminderFrequency,
        draftReminderFrequency === "weekly" ? draftReminderDays : [],
        draftReminderFrequency === "monthly" ? normalizedMonthDay : undefined,
        parsedTime.normalized,
      ).catch(() => {
        Alert.alert("Reminder saved", "The reminder settings were saved, but notification scheduling could not be completed on this device.");
      });
    }

    setShowReminderModal(false);
  };''',
    ),
    (
        '''            {urgentItems.length > 0 ? (
              <View style={styles.urgentBubble}>
                <Text numberOfLines={1} style={styles.urgentBubbleText}>⚡ {urgentItems[0].title}</Text>
              </View>
            ) : null}
''',
        '',
    ),
    (
        '''              {currentPerson.reminderDaysOfWeek.length > 0
                ? `${currentPerson.reminderDaysOfWeek.length} day${currentPerson.reminderDaysOfWeek.length === 1 ? "" : "s"} · ${currentPerson.reminderTime ?? "08:00"}`
                : "Set prayer reminder"}''',
        '''              {getReminderScheduleText(currentPerson)}''',
    ),
    (
        '''            <Text style={styles.modalDescription}>Choose the days and time this person should appear in Pray Today and receive reminders.</Text>
            <View style={styles.dayPickerRow}>
              {DAY_LABELS.map((label, index) => {
                const isSelected = draftReminderDays.includes(index);
                return (
                  <Pressable
                    key={`${label}-${index}`}
                    onPress={() => toggleDraftReminderDay(index)}
                    style={({ pressed }) => [styles.dayToggle, isSelected && styles.dayToggleActive, pressed && styles.pressed]}
                  >
                    <Text style={[styles.dayToggleText, isSelected && styles.dayToggleTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.modalFieldLabel}>Reminder time</Text>''',
        '''            <Text style={styles.modalDescription}>Choose when this person should appear in Pray Today and receive reminders.</Text>
            <View style={styles.frequencyGrid}>
              {REMINDER_FREQUENCIES.map((frequency) => {
                const isSelected = draftReminderFrequency === frequency.value;
                return (
                  <Pressable
                    key={frequency.value}
                    onPress={() => setDraftReminderFrequency(frequency.value)}
                    style={({ pressed }) => [styles.frequencyOption, isSelected && styles.frequencyOptionActive, pressed && styles.pressed]}
                  >
                    <Text style={[styles.frequencyOptionTitle, isSelected && styles.frequencyOptionTitleActive]}>{frequency.label}</Text>
                    <Text style={[styles.frequencyOptionDescription, isSelected && styles.frequencyOptionDescriptionActive]}>{frequency.description}</Text>
                  </Pressable>
                );
              })}
            </View>
            {draftReminderFrequency === "weekly" ? (
              <>
                <Text style={styles.modalFieldLabel}>Weekdays</Text>
                <View style={styles.dayPickerRow}>
                  {DAY_LABELS.map((label, index) => {
                    const isSelected = draftReminderDays.includes(index);
                    return (
                      <Pressable
                        key={`${label}-${index}`}
                        onPress={() => toggleDraftReminderDay(index)}
                        style={({ pressed }) => [styles.dayToggle, isSelected && styles.dayToggleActive, pressed && styles.pressed]}
                      >
                        <Text style={[styles.dayToggleText, isSelected && styles.dayToggleTextActive]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
            {draftReminderFrequency === "monthly" ? (
              <>
                <Text style={styles.modalFieldLabel}>Day of month</Text>
                <TextInput
                  value={draftReminderMonthDay}
                  onChangeText={setDraftReminderMonthDay}
                  placeholder="15"
                  placeholderTextColor={MUTED_TEXT}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  style={styles.modalInput}
                />
              </>
            ) : null}
            <Text style={styles.modalFieldLabel}>Reminder time</Text>''',
    ),
    (
        '''  urgentBubble: {
    position: "absolute",
    top: -18,
    right: -22,
    maxWidth: 140,
    borderWidth: 2,
    borderColor: "#D36B72",
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: SURFACE,
    shadowColor: DANGER,
    shadowOpacity: 0.13,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  urgentBubbleText: {
    color: "#C75265",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
  },
''',
        '',
    ),
    (
        '''  dayPickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 17,
    marginBottom: 18,
  },''',
        '''  frequencyGrid: {
    marginTop: 17,
    marginBottom: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  frequencyOption: {
    width: "48%",
    minHeight: 66,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: "#FBF8FF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
  },
  frequencyOptionActive: {
    borderColor: PURPLE,
    backgroundColor: "#EFE8FB",
  },
  frequencyOptionTitle: {
    color: DEEP_TEXT,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
  },
  frequencyOptionTitleActive: {
    color: PURPLE,
  },
  frequencyOptionDescription: {
    marginTop: 2,
    color: MUTED_TEXT,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
  frequencyOptionDescriptionActive: {
    color: "#6F48BE",
  },
  dayPickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },''',
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f'Missing expected block:\n{old[:700]}')
    text = text.replace(old, new, 1)

# Remove now-unused DANGER constant if no longer referenced.
text = text.replace('const DANGER = "#EF4444";\n', '')

path.write_text(text)
print('patched person reminder frequency')
