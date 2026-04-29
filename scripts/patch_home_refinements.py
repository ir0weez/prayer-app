from pathlib import Path

path = Path('/home/ubuntu/recreated-prayer-app/app/(tabs)/index.tsx')
text = path.read_text()

replacements = [
    (
        'import { useRouter } from "expo-router";\nimport { useEffect, useMemo, useState } from "react";',
        'import { useFocusEffect, useRouter } from "expo-router";\nimport { useCallback, useEffect, useMemo, useState } from "react";',
    ),
    (
        '  addPerson,\n  calculatePrayerStreak,\n  formatDaysSinceLastPrayer,\n  getDaysSinceLastPrayed,',
        '  addPerson,\n  formatDaysSinceLastPrayer,\n  getDailyPrayerProgress,\n  getDaysSinceLastPrayed,',
    ),
    (
        '  getLastReachedAccentColor,\n  getPrayTodayList,\n  getTodayISOString,\n  getUrgentPrayerItems,',
        '  getLastReachedAccentColor,\n  getPrayTodayList,\n  getTodayISOString,\n  getUrgentPrayerItems,\n  hasPersonCompletedPrayerToday,\n  markPersonPrayed,\n  resetDailyPrayerCompletionsIfNeeded,',
    ),
    (
        'import { PEOPLE_STORAGE_KEY } from "@/lib/prayercircle-storage";',
        'import { PEOPLE_STORAGE_KEY, PRAYER_STREAK_STORAGE_KEY } from "@/lib/prayercircle-storage";',
    ),
    (
        'type RelationshipSection = {\n  title: RelationshipType;\n  people: Person[];\n};',
        'type RelationshipSection = {\n  title: RelationshipType;\n  people: Person[];\n};\n\ntype PrayerStreakRecord = {\n  streak: number;\n  lastCompletedDate: string | null;\n};',
    ),
    (
        'function getAvatarText(person: Person) {\n  return person.avatarLabel ?? person.initials ?? person.name.substring(0, 2).toUpperCase();\n}',
        'function getAvatarText(person: Person) {\n  return person.avatarLabel ?? person.initials ?? person.name.substring(0, 2).toUpperCase();\n}\n\nfunction getYesterdayISOString(today: string) {\n  const date = new Date(`${today}T00:00:00Z`);\n  date.setUTCDate(date.getUTCDate() - 1);\n  return date.toISOString().split("T")[0];\n}\n\nfunction parseStoredStreak(value: string | null): PrayerStreakRecord {\n  if (!value) return { streak: 0, lastCompletedDate: null };\n  try {\n    const parsed = JSON.parse(value) as Partial<PrayerStreakRecord>;\n    return {\n      streak: typeof parsed.streak === "number" && parsed.streak > 0 ? parsed.streak : 0,\n      lastCompletedDate: typeof parsed.lastCompletedDate === "string" ? parsed.lastCompletedDate : null,\n    };\n  } catch {\n    return { streak: 0, lastCompletedDate: null };\n  }\n}',
    ),
    (
        '  const today = getTodayISOString();\n  const todayDayOfWeek = new Date().getDay();',
        '  const today = getTodayISOString();\n  const todayDate = new Date();\n  const todayDayOfWeek = todayDate.getDay();\n  const todayDayOfMonth = todayDate.getDate();',
    ),
    (
        '  const [activeTab, setActiveTab] = useState<AppTab>("people");\n  const [hasHydratedPeople, setHasHydratedPeople] = useState(false);',
        '  const [activeTab, setActiveTab] = useState<AppTab>("people");\n  const [hasHydratedPeople, setHasHydratedPeople] = useState(false);\n  const [streakRecord, setStreakRecord] = useState<PrayerStreakRecord>({ streak: 0, lastCompletedDate: null });',
    ),
    (
        '''  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(PEOPLE_STORAGE_KEY)
      .then((storedPeople) => {
        if (!isMounted) return;
        if (storedPeople) {
          const parsedPeople = JSON.parse(storedPeople) as Person[];
          setPeople(Array.isArray(parsedPeople) ? parsedPeople : []);
        }
      })
      .catch(() => {
        if (isMounted) setPeople(initialState.people);
      })
      .finally(() => {
        if (isMounted) setHasHydratedPeople(true);
      });

    return () => {
      isMounted = false;
    };
  }, [initialState.people]);''',
        '''  useEffect(() => {
    let isMounted = true;

    Promise.all([AsyncStorage.getItem(PEOPLE_STORAGE_KEY), AsyncStorage.getItem(PRAYER_STREAK_STORAGE_KEY)])
      .then(([storedPeople, storedStreak]) => {
        if (!isMounted) return;
        if (storedPeople) {
          const parsedPeople = JSON.parse(storedPeople) as Person[];
          setPeople(Array.isArray(parsedPeople) ? resetDailyPrayerCompletionsIfNeeded(parsedPeople, today) : []);
        } else {
          setPeople(resetDailyPrayerCompletionsIfNeeded(initialState.people, today));
        }
        setStreakRecord(parseStoredStreak(storedStreak));
      })
      .catch(() => {
        if (isMounted) setPeople(resetDailyPrayerCompletionsIfNeeded(initialState.people, today));
      })
      .finally(() => {
        if (isMounted) setHasHydratedPeople(true);
      });

    return () => {
      isMounted = false;
    };
  }, [initialState.people, today]);''',
    ),
    (
        '''  useEffect(() => {
    if (!hasHydratedPeople) return;
    AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(people)).catch(() => undefined);
  }, [hasHydratedPeople, people]);''',
        '''  useFocusEffect(
    useCallback(() => {
      if (!hasHydratedPeople) return undefined;
      let isActive = true;
      AsyncStorage.getItem(PEOPLE_STORAGE_KEY)
        .then((storedPeople) => {
          if (!isActive || !storedPeople) return;
          const parsedPeople = JSON.parse(storedPeople) as Person[];
          if (Array.isArray(parsedPeople)) setPeople(resetDailyPrayerCompletionsIfNeeded(parsedPeople, today));
        })
        .catch(() => undefined);
      return () => {
        isActive = false;
      };
    }, [hasHydratedPeople, today]),
  );

  useEffect(() => {
    if (!hasHydratedPeople) return;
    AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(people)).catch(() => undefined);
  }, [hasHydratedPeople, people]);

  useEffect(() => {
    if (!hasHydratedPeople) return;
    AsyncStorage.setItem(PRAYER_STREAK_STORAGE_KEY, JSON.stringify(streakRecord)).catch(() => undefined);
  }, [hasHydratedPeople, streakRecord]);''',
    ),
    (
        '''  const prayTodayList = useMemo(() => getPrayTodayList(people, todayDayOfWeek), [people, todayDayOfWeek]);
  const streak = useMemo(() => calculatePrayerStreak(people), [people]);
  const prayersLeftToday = prayTodayList.filter((person) => person.lastPrayedDate !== today).length;
  const prayedTodayCount = prayTodayList.length - prayersLeftToday;''',
        '''  const prayTodayList = useMemo(() => getPrayTodayList(people, todayDayOfWeek, todayDayOfMonth), [people, todayDayOfMonth, todayDayOfWeek]);
  const dailyPrayerProgress = useMemo(() => getDailyPrayerProgress(prayTodayList), [prayTodayList]);
  const streak = streakRecord.streak;
  const prayedTodayCount = dailyPrayerProgress.prayed;''',
    ),
    (
        '''  const handleAddPerson = () => {
    if (!newPersonName.trim()) return;

    const updatedPeople = addPerson(people, newPersonName, newPersonRelationship, {
      birthday: newPersonBirthday,
      prayerNote: newPersonNote,
      reminderDaysOfWeek: [],
      reminderTag: newPersonNote.split(" ").slice(0, 2).join(" "),
      photoUri: newPersonPhotoUri,
      avatarLabel: newPersonName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    });

    setPeople(updatedPeople);
    resetAddPersonForm();
    setActiveTab("people");
    setShowAddPerson(false);
  };''',
        '''  const handleAddPerson = () => {
    if (!newPersonName.trim()) return;

    const updatedPeople = addPerson(people, newPersonName, newPersonRelationship, {
      birthday: newPersonBirthday,
      prayerNote: newPersonNote,
      reminderFrequency: "none",
      reminderDaysOfWeek: [],
      reminderTag: newPersonNote.split(" ").slice(0, 2).join(" "),
      photoUri: newPersonPhotoUri,
      avatarLabel: newPersonName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    });

    setPeople(updatedPeople);
    resetAddPersonForm();
    setActiveTab("people");
    setShowAddPerson(false);
  };

  const maybeAdvanceStreak = (updatedPeople: Person[]) => {
    const updatedPrayTodayList = getPrayTodayList(updatedPeople, todayDayOfWeek, todayDayOfMonth);
    const isDayComplete = updatedPrayTodayList.length > 0 && updatedPrayTodayList.every((person) => hasPersonCompletedPrayerToday(person, today));
    if (!isDayComplete) return;

    setStreakRecord((previousRecord) => {
      if (previousRecord.lastCompletedDate === today) return previousRecord;
      const nextStreak = previousRecord.lastCompletedDate === getYesterdayISOString(today) ? previousRecord.streak + 1 : 1;
      return { streak: nextStreak, lastCompletedDate: today };
    });
  };

  const handleMarkPrayTodayPerson = (personId: string) => {
    const updatedPeople = markPersonPrayed(people, personId);
    setPeople(updatedPeople);
    maybeAdvanceStreak(updatedPeople);
  };''',
    ),
    (
        '''  const renderStoryPerson = (person: Person) => {
    const urgentItems = getUrgentPrayerItems(person);
    return (
      <Pressable key={`story-${person.id}`} onPress={() => router.push({ pathname: "/person", params: { personId: person.id } })} style={({ pressed }) => [styles.storyItem, pressed && styles.pressed]}>
        {urgentItems.length > 0 ? (
          <View style={styles.storyTag}>
            <Text numberOfLines={1} style={styles.storyTagText}>⚡ {urgentItems[0].title}</Text>
          </View>
        ) : null}
        <View style={styles.storyRing}>{renderAvatar(person, 54, true)}</View>
        <View style={styles.storyPlus}>
          <MaterialIcons name={iconName("chevron-right")} size={23} color="#FFFFFF" />
        </View>
      </Pressable>
    );
  };''',
        '''  const renderStoryPerson = (person: Person) => {
    const urgentItems = getUrgentPrayerItems(person);
    const isPrayedToday = hasPersonCompletedPrayerToday(person, today);
    return (
      <View key={`story-${person.id}`} style={styles.storyItem}>
        {urgentItems.length > 0 ? (
          <View style={styles.storyTag}>
            <Text numberOfLines={1} style={styles.storyTagText}>{urgentItems[0].title}</Text>
          </View>
        ) : null}
        <Pressable onPress={() => router.push({ pathname: "/person", params: { personId: person.id } })} style={({ pressed }) => [styles.storyAvatarButton, pressed && styles.pressed]}>
          <View style={[styles.storyRing, isPrayedToday && styles.storyRingComplete]}>{renderAvatar(person, 54, true)}</View>
        </Pressable>
        <Pressable onPress={() => handleMarkPrayTodayPerson(person.id)} style={({ pressed }) => [styles.storyPlus, isPrayedToday && styles.storyPlusDone, pressed && styles.pressed]}>
          <MaterialIcons name={iconName(isPrayedToday ? "check" : "add")} size={24} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  };''',
    ),
    (
        '''  const renderPersonCard = (person: Person) => {
    const daysSince = getDaysSinceLastPrayed(person.lastPrayedDate);
    const progressColor = getLastReachedAccentColor(person);
    const progressWidth = (daysSince === 999 ? "100%" : `${Math.min(100, Math.max(10, (daysSince / 21) * 100))}%`) as `${number}%`;
    return (
      <Pressable key={person.id} onPress={() => router.push({ pathname: "/person", params: { personId: person.id } })} style={({ pressed }) => [styles.personCard, pressed && styles.pressed]}>
        {renderAvatar(person, 52)}
        <View style={styles.personInfo}>
          <Text numberOfLines={1} style={styles.personName}>{person.name}</Text>
          <Text numberOfLines={1} style={styles.personMeta}>
            {person.relationship} • {daysSince === 999 ? "Not reached yet" : `${formatDaysSinceLastPrayer(daysSince)} since reached`}{getBirthdayText(person)}
          </Text>
          <View style={styles.reachProgressTrack}>
            <View style={[styles.reachProgressFill, { width: progressWidth, backgroundColor: progressColor }]} />
          </View>
        </View>
        <MaterialIcons name={iconName("chevron-right")} size={30} color="#8B8199" />
      </Pressable>
    );
  };''',
        '''  const renderPersonCard = (person: Person) => {
    const daysSince = getDaysSinceLastPrayed(person.lastPrayedDate);
    const reachColor = daysSince === 999 ? "#E7E0EE" : getLastReachedAccentColor(person);
    const reachText = daysSince === 999 ? "—" : formatDaysSinceLastPrayer(daysSince);
    return (
      <Pressable key={person.id} onPress={() => router.push({ pathname: "/person", params: { personId: person.id } })} style={({ pressed }) => [styles.personCard, pressed && styles.pressed]}>
        {renderAvatar(person, 52)}
        <View style={styles.personInfo}>
          <Text numberOfLines={1} style={styles.personName}>{person.name}</Text>
          <Text numberOfLines={1} style={styles.personMeta}>
            {person.relationship} • {daysSince === 999 ? "Not reached yet" : `Reached ${formatDaysSinceLastPrayer(daysSince)} ago`}{getBirthdayText(person)}
          </Text>
        </View>
        <View style={styles.personActions}>
          <View style={[styles.reachPill, { backgroundColor: reachColor }]}> 
            <Text style={[styles.reachPillText, daysSince === 999 && styles.reachPillTextMuted]}>{reachText}</Text>
          </View>
          <MaterialIcons name={iconName("edit")} size={22} color="#8B8199" />
        </View>
      </Pressable>
    );
  };''',
    ),
    (
        '          <Text style={styles.progressText}>{prayedTodayCount}/{prayTodayList.length} prayed today</Text>',
        '          <Text style={styles.progressText}>{prayedTodayCount}/{dailyPrayerProgress.total} prayed today</Text>',
    ),
    (
        '''  storyScroller: {
    paddingHorizontal: 24,
    paddingTop: 13,
    paddingBottom: 35,
  },
  storyItem: {
    width: 72,
    height: 76,
    marginRight: 13,
    alignItems: "center",
    justifyContent: "center",
  },''',
        '''  storyScroller: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 35,
  },
  storyItem: {
    width: 86,
    height: 88,
    marginRight: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  storyAvatarButton: {
    alignItems: "center",
    justifyContent: "center",
  },''',
    ),
    (
        '''  storyRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },''',
        '''  storyRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  storyRingComplete: {
    borderColor: "#31C48D",
  },''',
    ),
    (
        '''  storyTag: {
    position: "absolute",
    top: 0,
    left: 3,
    zIndex: 4,
    maxWidth: 92,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D36B72",
    backgroundColor: "#FFFFFF",
  },''',
        '''  storyTag: {
    position: "absolute",
    top: 0,
    left: 2,
    right: 2,
    zIndex: 4,
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D36B72",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },''',
    ),
    (
        '''  storyPlus: {
    position: "absolute",
    right: 3,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: SCREEN_BG,
  },''',
        '''  storyPlus: {
    position: "absolute",
    right: 3,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: SCREEN_BG,
  },
  storyPlusDone: {
    backgroundColor: "#31C48D",
  },''',
    ),
    (
        '''  reachProgressTrack: {
    marginTop: 8,
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EFEAF4",
    overflow: "hidden",
  },
  reachProgressFill: {
    height: 6,
    borderRadius: 3,
  },''',
        '''  personActions: {
    alignItems: "flex-end",
    gap: 12,
  },
  reachPill: {
    minWidth: 72,
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  reachPillText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 21,
  },
  reachPillTextMuted: {
    color: MUTED_TEXT,
  },''',
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f'Missing expected block:\n{old[:500]}')
    text = text.replace(old, new, 1)

path.write_text(text)
print('patched home refinements')
