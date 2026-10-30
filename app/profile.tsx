import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { TopFade, topFadeScrollHandler, useTopFadeScrollY } from "@/components/top-fade";
import { AvatarImage, AvatarPicker } from "@/components/avatar-system";
import { AnchoredSheet, measureEventAnchor, type AnchorRect } from "@/components/anchored-sheet";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSkin } from "@/hooks/use-skin";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { derivePeopleFrontDoor } from "@/lib/people-material";
import { skinText } from "@/lib/skin-themes";
import { getTodayISOString, normalizePeopleForStorage, type Person } from "@/lib/prayercircle-data";
import {
  calculateFastStreak,
  getActiveFast,
  getCurrentFastDay,
  parseStoredFasts,
  resetFocusItemsForNewDay,
  type PersonalFast,
} from "@/lib/prayercircle-fasting";
import { FASTS_STORAGE_KEY, PEOPLE_STORAGE_KEY, PROFILE_STORAGE_KEY, PRAYER_STREAK_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAvatarAura } from "@/lib/avatar-aura";
import { getCompletedBookAvatarIds } from "@/lib/book-avatars";
import { getXPProgress, loadXPState } from "@/lib/xp-engine";

type XpProgress = ReturnType<typeof getXPProgress>;
import { getSessionQuietLine } from "@/lib/life-verse";
import { normalizePrayerStreakRecord } from "@/lib/prayer-streak";

// ─── v360 — My Profile is its own page (Jonathan, Oct 30: "You put
// the profile on top of the fast page?! Shouldn't it be its own
// separate thing?!"). v354 stacked this page's identity content on
// top of the fasting tracker in one file; the tracker now lives on
// its own route (app/fasting-tracker.tsx), behaviour unchanged,
// and this page is the identity alone: the band, the two life
// cards, the town doors, and the profile editor. The fasting
// card's doors NAVIGATE to the tracker now instead of scrolling
// down this page. ───

// v354: the personal prayer items ride this same record (written
// by app/personal-prayer.tsx, whose local PrayerItem this mirrors)
// — the prayer-life card below reads their count off the record.
type PersonalPrayerItem = {
  id: string;
  title: string;
  isDone: boolean;
  isUrgent: boolean;
};

type PersonalProfile = {
  name: string;
  photoUri?: string;
  avatarAsset?: string;
  auraId?: string;
  fastingStreak: number;
  personalPrayerStreak: number;
  fastingStatus: "completed" | "skipped" | "missed" | "not-set";
  lastFastingDate?: string | null;
  lastPersonalPrayerDate?: string | null;
  personalPrayerItems?: PersonalPrayerItem[];
};

const DEFAULT_PROFILE: PersonalProfile = {
  name: "Your Profile",
  photoUri: undefined,
  avatarAsset: undefined,
  auraId: undefined,
  fastingStreak: 0,
  personalPrayerStreak: 0,
  fastingStatus: "not-set",
  lastFastingDate: null,
  lastPersonalPrayerDate: null,
};

const DEEP_TEXT = "#141326";
const MUTED_TEXT = "#7E7C88";
const PURPLE = "#8557D9";
const SOFT_PURPLE = "#F0E8FF";
const BORDER = "#DAC8F6";

const profileButtons = {
  flexDirection: 'row' as const,
  gap: 8,
  marginLeft: 'auto' as const,
};

const profileButton = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 20,
};

const profileButtonText = {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '600' as const,
};

function iconName(name: string) {
  return name as keyof typeof MaterialIcons.glyphMap;
}

function parseStoredProfile(value: string | null): PersonalProfile {
  if (!value) return DEFAULT_PROFILE;
  try {
    const parsed = JSON.parse(value) as Partial<PersonalProfile>;
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : DEFAULT_PROFILE.name,
      photoUri: typeof parsed.photoUri === "string" && parsed.photoUri.trim() ? parsed.photoUri.trim() : undefined,
      avatarAsset: typeof parsed.avatarAsset === "string" && parsed.avatarAsset.trim() ? parsed.avatarAsset.trim() : undefined,
      auraId: typeof parsed.auraId === "string" && parsed.auraId.trim() ? parsed.auraId.trim() : undefined,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const scheme = useColorScheme();
  // v276: the fasting section's Material family — derived from the
  // Settings seed (colors.primary) × the appearance, the way People
  // and the Bible derive theirs. Never pinned to a mockup instance.
  const trackerFamily = useMemo(
    () => derivePeopleFrontDoor(colors.primary, scheme === "dark" ? "dark" : "light"),
    [colors.primary, scheme],
  );
  // Paper skin (v174): the profile's cards sit on the page like sheets —
  // the kit's offset shadow joins their style arrays; null under Classic.
  const { isPaper, isSkinned, tokens: skinTokens } = useSkin();
  const today = getTodayISOString();
  const [profile, setProfile] = useState<PersonalProfile>(DEFAULT_PROFILE);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  // His own person record (the isPersonal one) — the life-verse
  // row reads its verse through the session quiet-line rule.
  const [ownPerson, setOwnPerson] = useState<Person | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileEditorAnchor, setProfileEditorAnchor] = useState<AnchorRect | null>(null);
  const [draftProfileName, setDraftProfileName] = useState("");
  const [draftProfilePhotoUri, setDraftProfilePhotoUri] = useState<string | undefined>(undefined);
  const [draftProfileAvatarAsset, setDraftProfileAvatarAsset] = useState<string | undefined>(undefined);
  const [fasts, setFasts] = useState<PersonalFast[]>([]);
  const [selectedFastId, setSelectedFastId] = useState<string | null>(null);
  const [bookStatuses, setBookStatuses] = useState<Record<string, string>>({});
  const [profileLevel, setProfileLevel] = useState(1);
  // v360 (his question, Oct 30: "how do I know how much XP I have
  // or what level I'm on?"): the band showed the level alone and
  // the XP itself appeared nowhere — the progress within the
  // level rides the same line now (lib/xp-engine getXPProgress).
  const [xpProgress, setXpProgress] = useState<XpProgress | null>(null);
  // v360: the REAL prayer streak — the prayercircle.streak.v1
  // record his prayer sessions advance (lib/prayer-streak.ts).
  // The row used to render profile.personalPrayerStreak, a
  // profile-record field tied to personal prayer items, which
  // read 0 for a man who prays every day (his words, Oct 30:
  // "a 0 day prayer streak doesn't even make sense... The last
  // time I saw it I was on streak day 53").
  const [prayerStreak, setPrayerStreak] = useState(0);
  const fadeScrollY = useTopFadeScrollY();
  const keyboardHeight = useKeyboardHeight();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      loadXPState().then((state) => {
        if (!isActive) return;
        setProfileLevel(state.level);
        setXpProgress(getXPProgress(state));
      }).catch(() => undefined);
      AsyncStorage.getItem(PRAYER_STREAK_STORAGE_KEY)
        .then((raw) => {
          if (!isActive) return;
          let parsed: unknown = null;
          try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
          setPrayerStreak(normalizePrayerStreakRecord(parsed, today).streak);
        })
        .catch(() => undefined);
      Promise.all([
        AsyncStorage.getItem(PROFILE_STORAGE_KEY),
        AsyncStorage.getItem(FASTS_STORAGE_KEY),
        AsyncStorage.getItem('bibleBookStatus'),
        AsyncStorage.getItem(PEOPLE_STORAGE_KEY),
      ])
        .then(([storedProfile, storedFasts, storedBibleStatus, storedPeople]) => {
          if (!isActive) return;
          // v326 heal-and-persist, unchanged: parse + normalize
          // the stored fasts and write a healed array back once.
          const stored = parseStoredFasts(storedFasts);
          if (stored.healedJson) {
            AsyncStorage.setItem(FASTS_STORAGE_KEY, stored.healedJson).catch(() => undefined);
          }
          const nextFasts = stored.fasts.map((fast) => ({
            ...fast,
            focusItemDailyStatuses: resetFocusItemsForNewDay(fast.focusItemDailyStatuses, today),
          }));
          setProfile(parseStoredProfile(storedProfile));
          if (storedPeople) {
            try {
              const parsedPeople = JSON.parse(storedPeople) as Person[];
              if (Array.isArray(parsedPeople)) {
                setOwnPerson(normalizePeopleForStorage(parsedPeople).find((person) => person.isPersonal) ?? null);
              }
            } catch {
              // The row falls back to the quiet-line fallback.
            }
          }
          setFasts(nextFasts);
          setSelectedFastId((current) => current ?? getActiveFast(nextFasts, today)?.id ?? nextFasts[0]?.id ?? null);

          // Book statuses still feed the avatar-unlock grid below.
          if (storedBibleStatus) {
            const statuses = JSON.parse(storedBibleStatus);
            setBookStatuses(statuses);
          }
        })
        .catch(() => undefined);
      return () => {
        isActive = false;
      };
    }, [today]),
  );

  const selectedFast = useMemo(() => fasts.find((fast) => fast.id === selectedFastId) ?? getActiveFast(fasts, today), [fasts, selectedFastId, today]);
  const selectedFastStreak = selectedFast ? calculateFastStreak(selectedFast, today) : 0;
  const profileAura = useMemo(() => getAvatarAura(profile.avatarAsset, profile.auraId), [profile.avatarAsset, profile.auraId]);
  const unlockedBookIds = useMemo(() => getCompletedBookAvatarIds(bookStatuses), [bookStatuses]);

  const handleUploadProfileAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!result.canceled && result.assets[0]?.uri) {
      // v354: while the profile editor is open, the picker feeds
      // its DRAFTS — the editor's Save is what lands them (the
      // People editor's semantics). Otherwise the pick saves at
      // once, as this handler has always done.
      if (showProfileEditor) {
        setDraftProfilePhotoUri(result.assets[0].uri);
        setDraftProfileAvatarAsset(undefined);
        setShowAvatarPicker(false);
        return;
      }
      const next = { ...profile, photoUri: result.assets[0].uri, avatarAsset: undefined, auraId: undefined };
      setProfile(next);
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
      setShowAvatarPicker(false);
    }
  };

  const handleSelectProfileAvatar = async (avatarAsset?: string) => {
    // v354: the editor-open branch feeds the drafts, same rule as
    // the upload handler above.
    if (showProfileEditor) {
      setDraftProfileAvatarAsset(avatarAsset);
      setDraftProfilePhotoUri(undefined);
      return;
    }
    const next = { ...profile, photoUri: undefined, avatarAsset, auraId: avatarAsset?.endsWith("-shiny") || avatarAsset?.startsWith("book-") ? avatarAsset : undefined };
    setProfile(next);
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
  };

  // ─── v354: the profile editor, rehomed on this page ───────────
  // The Edit Profile sheet lived orphaned in the People tab (its
  // opener lost its last caller before v283): name field, Upload
  // photo, Choose avatar, and this exact save — name required;
  // photo XOR avatar; a shiny ("-shiny") or book ("book-")
  // avatar also becomes the aura. The semantics move here
  // unchanged; the sheet itself is new (AnchoredSheet below).
  const openProfileEditor = (event: unknown) => {
    setDraftProfileName(profile.name);
    setDraftProfilePhotoUri(profile.photoUri);
    setDraftProfileAvatarAsset(profile.avatarAsset);
    measureEventAnchor(event, (rect) => {
      setProfileEditorAnchor(rect);
      setShowProfileEditor(true);
    });
  };

  const handlePickDraftPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!result.canceled && result.assets[0]?.uri) { setDraftProfilePhotoUri(result.assets[0].uri); setDraftProfileAvatarAsset(undefined); }
  };

  const handleSaveProfile = async () => {
    const name = draftProfileName.trim();
    if (!name) {
      Alert.alert("Add your name", "Enter a name before saving your profile.");
      return;
    }
    const next = { ...profile, name, photoUri: draftProfileAvatarAsset ? undefined : draftProfilePhotoUri, avatarAsset: draftProfilePhotoUri ? undefined : draftProfileAvatarAsset, auraId: draftProfileAvatarAsset?.endsWith("-shiny") || draftProfileAvatarAsset?.startsWith("book-") ? draftProfileAvatarAsset : undefined };
    setProfile(next);
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
    setShowProfileEditor(false);
  };

  // The life-verse row's door: his own person page, whose Edit
  // carries the verse pickers (the person-editor pattern).
  const openOwnPerson = () => {
    if (ownPerson) router.push({ pathname: "/person", params: { personId: ownPerson.id } });
    else router.push("/");
  };

  // v354 "Two Lives" read-models: the prayer-items count rides
  // the profile record itself; the life-verse row speaks the
  // session quiet-line rule over his own person (his verse when
  // set, Colossians 4:2 otherwise — the drawing's value).
  const personalPrayerCount = profile.personalPrayerItems?.length ?? 0;
  const ownQuietLine = getSessionQuietLine({ lifeVerse: ownPerson?.lifeVerse });
  const fastHistory = useMemo(
    () => [...fasts].sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt)),
    [fasts],
  );
  // v360: the fasting card's doors navigate — the tracker is its
  // own page now (app/fasting-tracker.tsx). Fast History lands on
  // the tracker's history section via the section param.
  const openTracker = () => router.push("/fasting-tracker");
  const openTrackerHistory = () => router.push({ pathname: "/fasting-tracker", params: { section: "history" } });

  return (
    <ScreenContainer className={skinTokens.isEightBit ? "flex-1" : "flex-1 bg-background"}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        onScroll={topFadeScrollHandler(fadeScrollY)}
        scrollEventThrottle={16}
        style={{ marginTop: -insets.top }}
      >
        {/* v347: edge-to-edge — the frame reaches the screen's
            literal top (marginTop above) so content scrolls INTO
            the tray zone and ghosts under the fade; this spacer
            returns the inset to the content, so at rest the
            header row sits exactly where it sat. */}
        <View style={{ height: insets.top }} />
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, { backgroundColor: isSkinned ? skinTokens.surface ?? colors.surface : colors.surface }, pressed && styles.pressed]}>
            <MaterialIcons name={iconName("arrow-back")} size={26} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }, skinText(skinTokens, skinTokens.type.pageTitle)]}>My Profile</Text>
          <View style={{ width: 46 }} />
        </View>

        {/* v354 (Concept 2 "Two Lives" — profile-concepts-v2,
            his pick, Oct 29): the slim identity band and the two
            life cards take the top of My Profile. The band is the
            Settings hero band's slim form in this page's tracker
            family: avatar, name, level, Edit pill — and Edit
            finally opens the profile editor (below the fade; its
            save semantics moved here from the orphaned People
            sheet). The cards run on real stores only: prayer
            items + streak ride the profile record, the life
            verse is his own person's quiet line, the fasting
            card summarises the selected fast and its doors
            navigate to the tracker page (v360 — the tracker
            is its own route now, no longer standing below). */}
        <View style={[styles.identityBand, { backgroundColor: trackerFamily.wash }]}>
          <Pressable onPress={(event) => openProfileEditor(event)} style={({ pressed }) => [styles.identityBandRow, pressed && styles.pressed]}>
            <AvatarImage id="profile" name={profile.name} avatarAsset={profile.avatarAsset} auraId={profile.auraId} auraMode="static" profileLevel={profileLevel} photoUri={profile.photoUri} size={40} fallbackColor={trackerFamily.deep} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.identityName, { color: trackerFamily.ink }]} numberOfLines={1}>{profile.name}</Text>
              <Text style={[styles.identitySub, { color: trackerFamily.inkSoft }]}>Level {profileLevel}{xpProgress ? ` · ${xpProgress.currentXP.toLocaleString("en-US")} of ${xpProgress.requiredXP.toLocaleString("en-US")} XP` : ""}</Text>
            </View>
            <View style={[styles.editPill, { backgroundColor: trackerFamily.wash2 }]}>
              <Text style={[styles.editPillText, { color: trackerFamily.ink }]}>Edit</Text>
            </View>
          </Pressable>
        </View>

        <Text style={[styles.lifeGroupLabel, { color: trackerFamily.inkSoft }]}>YOUR PRAYER LIFE</Text>
        <View style={[styles.lifeCard, { backgroundColor: trackerFamily.card }]}>
          <Pressable onPress={() => router.push("/personal-prayer")} style={({ pressed }) => [styles.lifeRow, pressed && styles.pressed]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lifeRowTitle, { color: trackerFamily.ink }]}>Personal prayer items</Text>
              <Text style={[styles.lifeRowSub, { color: trackerFamily.inkSoft }]}>{personalPrayerCount > 0 ? `${personalPrayerCount} item${personalPrayerCount === 1 ? "" : "s"}` : "Nothing added yet"}</Text>
            </View>
            <MaterialIcons name={iconName("chevron-right")} size={20} color={trackerFamily.inkSoft} />
          </Pressable>
          <View style={[styles.lifeRow, styles.lifeRowDivider, { borderTopColor: trackerFamily.line }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lifeRowTitle, { color: trackerFamily.ink }]}>Prayer streak</Text>
            </View>
            <Text style={[styles.lifeRowValue, { color: trackerFamily.inkSoft }]}>{prayerStreak} day{prayerStreak === 1 ? "" : "s"}</Text>
          </View>
          <Pressable onPress={openOwnPerson} style={({ pressed }) => [styles.lifeRow, styles.lifeRowDivider, { borderTopColor: trackerFamily.line }, pressed && styles.pressed]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lifeRowTitle, { color: trackerFamily.ink }]}>Life verse</Text>
            </View>
            <Text style={[styles.lifeRowValue, { color: trackerFamily.inkSoft }]}>{ownQuietLine.reference}</Text>
            <MaterialIcons name={iconName("chevron-right")} size={20} color={trackerFamily.inkSoft} />
          </Pressable>
        </View>

        <Text style={[styles.lifeGroupLabel, { color: trackerFamily.inkSoft }]}>YOUR FASTING LIFE</Text>
        <View style={[styles.lifeCard, { backgroundColor: trackerFamily.card }]}>
          {selectedFast ? (
            <Pressable onPress={openTracker} style={({ pressed }) => [styles.lifeRow, pressed && styles.pressed]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lifeRowTitle, { color: trackerFamily.ink }]}>{selectedFast.name}</Text>
                <Text style={[styles.lifeRowSub, { color: trackerFamily.inkSoft }]}>{`Day ${getCurrentFastDay(selectedFast)} of ${selectedFast.durationDays}`}{selectedFastStreak > 0 ? ` · ${selectedFastStreak}-day streak` : ""}</Text>
              </View>
              <View style={[styles.lifeChip, { backgroundColor: trackerFamily.wash }]}>
                <Text style={[styles.lifeChipText, { color: trackerFamily.deep }]}>Open tracker</Text>
              </View>
            </Pressable>
          ) : (
            <Pressable onPress={openTracker} style={({ pressed }) => [styles.lifeRow, pressed && styles.pressed]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lifeRowTitle, { color: trackerFamily.ink }]}>No fast yet</Text>
                <Text style={[styles.lifeRowSub, { color: trackerFamily.inkSoft }]}>Start a New Fast</Text>
              </View>
              <MaterialIcons name={iconName("chevron-right")} size={20} color={trackerFamily.inkSoft} />
            </Pressable>
          )}
          {fastHistory.length > 0 ? (
            <Pressable onPress={openTrackerHistory} style={({ pressed }) => [styles.lifeRow, styles.lifeRowDivider, { borderTopColor: trackerFamily.line }, pressed && styles.pressed]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lifeRowTitle, { color: trackerFamily.ink }]}>Fast History</Text>
              </View>
              <MaterialIcons name={iconName("chevron-right")} size={20} color={trackerFamily.inkSoft} />
            </Pressable>
          ) : null}
          {selectedFast ? (
            <Pressable onPress={openTracker} style={({ pressed }) => [styles.lifeRow, styles.lifeRowDivider, { borderTopColor: trackerFamily.line }, pressed && styles.pressed]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lifeRowTitle, { color: trackerFamily.ink }]}>Recaps</Text>
              </View>
              <MaterialIcons name={iconName("chevron-right")} size={20} color={trackerFamily.inkSoft} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.push("/fast-collection")} style={({ pressed }) => [styles.lifeRow, styles.lifeRowDivider, { borderTopColor: trackerFamily.line }, pressed && styles.pressed]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lifeRowTitle, { color: trackerFamily.ink }]}>Fast Collection</Text>
            </View>
            <MaterialIcons name={iconName("chevron-right")} size={20} color={trackerFamily.inkSoft} />
          </Pressable>
        </View>

        <Text style={[styles.lifeGroupLabel, { color: trackerFamily.inkSoft }]}>YOUR TOWN</Text>
        <View style={[styles.lifeCard, { backgroundColor: trackerFamily.card }]}>
          <Pressable onPress={() => router.push("/hometown")} style={({ pressed }) => [styles.lifeRow, pressed && styles.pressed]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lifeRowTitle, { color: trackerFamily.ink }]}>Hometown</Text>
            </View>
            <MaterialIcons name={iconName("chevron-right")} size={20} color={trackerFamily.inkSoft} />
          </Pressable>
          <Pressable onPress={() => router.push("/character")} style={({ pressed }) => [styles.lifeRow, styles.lifeRowDivider, { borderTopColor: trackerFamily.line }, pressed && styles.pressed]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lifeRowTitle, { color: trackerFamily.ink }]}>Character</Text>
            </View>
            <MaterialIcons name={iconName("chevron-right")} size={20} color={trackerFamily.inkSoft} />
          </Pressable>
        </View>

      </ScrollView>
      {/* v334: the top fade (his Oct 29 ruling, all pages) — the
          profile dissolves under its own ground at the top edge.
          The pickers and sheets after this are Modals and paint
          in their own windows, above the fade. */}
      <TopFade color={skinTokens.background ?? colors.background} scrollY={fadeScrollY} topInset={insets.top} />
      {/* v354: the profile editor — grown out of the identity
          band by the v330 container transform, in creator
          furniture (✕ left, centred title, Save top-right). Its
          Choose avatar opens the page's own AvatarPicker below,
          which feeds these drafts while the editor is open (see
          the handlers); Upload photo drafts through the same
          square-crop pick the orphaned sheet used. The name is
          the only required field — the save is the orphaned
          sheet's, verbatim in effect. */}
      <AnchoredSheet visible={showProfileEditor} onClose={() => setShowProfileEditor(false)} anchor={profileEditorAnchor} scrimColor="rgba(20,16,40,0.5)" containerStyle={{ flex: 1, justifyContent: "flex-end", paddingBottom: keyboardHeight }}>
        <View style={{ backgroundColor: trackerFamily.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28, ...(isSkinned ? skinTokens.sheetShadow ?? {} : {}) }}>
          <View style={styles.profileEditorHeader}>
            <Pressable onPress={() => setShowProfileEditor(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close editor">
              <MaterialIcons name={iconName("close")} size={24} color={trackerFamily.ink} />
            </Pressable>
            <Text style={[styles.profileEditorTitle, { color: trackerFamily.ink }]}>Edit Profile</Text>
            <Pressable onPress={() => void handleSaveProfile()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Save profile">
              <Text style={[styles.profileEditorSave, { color: trackerFamily.seed }]}>Save</Text>
            </Pressable>
          </View>
          <View style={{ alignItems: "center", marginBottom: 6 }}>
            <AvatarImage id="profile" name={draftProfileName} avatarAsset={draftProfileAvatarAsset} auraId={draftProfileAvatarAsset?.endsWith("-shiny") ? draftProfileAvatarAsset : undefined} auraMode="animated" profileLevel={profileLevel} photoUri={draftProfilePhotoUri} size={88} fallbackColor={trackerFamily.deep} />
            <Text style={[styles.profilePhotoNote, { color: trackerFamily.inkSoft }]}>{draftProfilePhotoUri ? "Uploaded photo" : draftProfileAvatarAsset ? "Pack avatar" : "Default avatar"}</Text>
          </View>
          <View style={styles.profileEditorButtons}>
            <Pressable onPress={() => void handlePickDraftPhoto()} style={({ pressed }) => [styles.profileEditorButton, { borderColor: trackerFamily.seed }, pressed && styles.pressed]}>
              <MaterialIcons name={iconName("photo-library")} size={18} color={trackerFamily.seed} />
              <Text style={[styles.profileEditorButtonText, { color: trackerFamily.seed }]}>Upload photo</Text>
            </Pressable>
            <Pressable onPress={() => setShowAvatarPicker(true)} style={({ pressed }) => [styles.profileEditorButton, { borderColor: trackerFamily.seed }, pressed && styles.pressed]}>
              <MaterialIcons name={iconName("pets")} size={18} color={trackerFamily.seed} />
              <Text style={[styles.profileEditorButtonText, { color: trackerFamily.seed }]}>Choose avatar</Text>
            </Pressable>
          </View>
          <Text style={[styles.profileFieldLabel, { color: trackerFamily.inkSoft }]}>NAME</Text>
          <TextInput value={draftProfileName} onChangeText={setDraftProfileName} placeholder="Your name" placeholderTextColor={trackerFamily.inkSoft} returnKeyType="done" style={[styles.profileNameField, { backgroundColor: trackerFamily.ground, borderBottomColor: trackerFamily.wash2, color: trackerFamily.ink }]} />
        </View>
      </AnchoredSheet>
      <AvatarPicker visible={showAvatarPicker} initialAvatarAsset={profile.avatarAsset} unlockedBookIds={unlockedBookIds} onClose={() => setShowAvatarPicker(false)} onUpload={handleUploadProfileAvatar} onSelect={handleSelectProfileAvatar} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 46,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerFastButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRightButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    color: DEEP_TEXT,
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: -0.9,
  },
  // v354 "Two Lives": the identity band (Settings hero band,
  // slim form — radius 28 tonal band, contents at the band's
  // own metrics), the two life cards (radius 24, hairline rows)
  // and the profile editor's furniture. Colours all arrive from
  // the tracker family at render; these carry shape only.
  identityBand: {
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  identityBandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  identityName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  identitySub: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  editPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editPillText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  lifeGroupLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.2,
    marginTop: 22,
    marginBottom: 9,
    marginHorizontal: 4,
  },
  lifeCard: {
    borderRadius: 24,
    overflow: "hidden",
  },
  lifeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  lifeRowDivider: {
    borderTopWidth: 1,
  },
  lifeRowTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  lifeRowSub: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 2,
    lineHeight: 18,
  },
  lifeRowValue: {
    fontSize: 12.5,
    fontWeight: "600",
    textAlign: "right",
  },
  lifeChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  lifeChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  profileEditorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  profileEditorTitle: {
    fontSize: 15.5,
    fontWeight: "800",
  },
  profileEditorSave: {
    fontSize: 14.5,
    fontWeight: "800",
  },
  profilePhotoNote: {
    fontSize: 12,
    marginTop: 6,
  },
  profileEditorButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  profileEditorButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 11,
  },
  profileEditorButtonText: {
    fontSize: 13.5,
    fontWeight: "800",
  },
  profileFieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 7,
  },
  profileNameField: {
    borderBottomWidth: 2,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: "600",
  },
  profileCard: {
    minHeight: 130,
    padding: 18,
    borderRadius: 28,
    backgroundColor: SOFT_PURPLE,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  profileCopy: {
    flex: 1,
    marginLeft: 15,
  },
  profileName: {
    color: DEEP_TEXT,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  profileSubtitle: {
    marginTop: 4,
    color: MUTED_TEXT,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  profileButtons: profileButtons,
  profileButton: profileButton,
  profileButtonText: profileButtonText,
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    marginBottom: 26,
  },
  statCard: {
    flex: 1,
    minHeight: 84,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDF2",
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    color: PURPLE,
    fontSize: 28,
    fontWeight: "900",
  },
  statValueText: {
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center" as const,
    lineHeight: 19,
  },
  previousFastCard: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDF2",
  },
  previousFastHeader: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 12,
  },
  previousFastTitle: {
    color: DEEP_TEXT,
    fontSize: 18,
    fontWeight: "900" as const,
  },
  previousFastMeta: {
    marginTop: 4,
    color: MUTED_TEXT,
    fontSize: 12,
    fontWeight: "700" as const,
  },
  previousFastPercentage: {
    fontSize: 24,
    fontWeight: "900" as const,
  },
  previousFastProgressTrack: {
    height: 8,
    marginTop: 14,
    borderRadius: 4,
    backgroundColor: "#EEE9F7",
    overflow: "hidden" as const,
  },
  previousFastProgressFill: {
    height: "100%" as const,
    borderRadius: 4,
  },
  previousFastDays: {
    marginTop: 7,
    color: MUTED_TEXT,
    fontSize: 12,
    fontWeight: "800" as const,
  },
  previousFastFocusLabel: {
    marginTop: 14,
    marginBottom: 8,
    color: MUTED_TEXT,
    fontSize: 11,
    fontWeight: "900" as const,
    letterSpacing: 1,
  },
  previousFocusChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  previousFocusChipText: {
    fontSize: 12,
    fontWeight: "900" as const,
  },
  previousFastEmpty: {
    minHeight: 58,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDF2",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 9,
  },
  previousFastEmptyText: {
    color: MUTED_TEXT,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  historyTimeline: {
    paddingBottom: 4,
  },
  timelineRow: {
    flexDirection: "row" as const,
    minHeight: 126,
  },
  timelineRail: {
    width: 22,
    alignItems: "center" as const,
  },
  // v283: the timeline + history colors moved to the call sites,
  // where the tracker family supplies them — no pinned paints are
  // left in these base styles.
  timelineDot: {
    width: 13,
    height: 13,
    marginTop: 19,
    borderRadius: 7,
    borderWidth: 3,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 3,
  },
  historyCard: {
    flex: 1,
    marginLeft: 8,
    marginBottom: 10,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
  },
  historyCardHeader: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 9,
  },
  historyTitle: {
    color: DEEP_TEXT,
    fontSize: 16,
    fontWeight: "900" as const,
  },
  historyMeta: {
    marginTop: 3,
    color: MUTED_TEXT,
    fontSize: 11,
    fontWeight: "700" as const,
  },
  historyStatusPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: "900" as const,
  },
  historyProgressTrack: {
    height: 7,
    marginTop: 12,
    borderRadius: 4,
    overflow: "hidden" as const,
  },
  historyProgressFill: {
    height: "100%" as const,
    borderRadius: 4,
  },
  historyDays: {
    marginTop: 6,
    color: MUTED_TEXT,
    fontSize: 11,
    fontWeight: "800" as const,
  },
  historyFocus: {
    marginTop: 6,
    color: DEEP_TEXT,
    fontSize: 11,
    fontWeight: "700" as const,
  },
  statLabel: {
    color: MUTED_TEXT,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    textAlign: "center" as const,
    alignSelf: "center",
    width: "100%",
  },
  // Material 3 title style for section headers (2026-10-21 restyle):
  // titleMedium metrics, sentence weight — the heavy 16/900 display
  // header is retired. Color comes from the active theme at call sites.
  sectionLabel: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  currentFastHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 10,
  },
  currentFastBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  currentFastBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
  },
  // v280: the tracker section head — a plain row on the page
  // ground (the mockup's app-bar row), no enclosing card.
  trackerSection: {
    marginTop: 4,
    marginBottom: 2,
  },
  // v283: the section head's title takes the mockup's app-bar
  // metrics (title-lg: 22/28, weight 500) — the legacy fastTitle
  // (19/900) plus the skin card-title spread read heavier than the
  // drawing on device.
  trackerTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "500",
  },
  streakChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  streakChipText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  fastCard: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDF2",
    flexDirection: "row",
    alignItems: "center",
  },
  fastIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  fastCardText: {
    flex: 1,
    marginLeft: 13,
  },
  fastTitle: {
    color: DEEP_TEXT,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 24,
  },
  fastMeta: {
    color: MUTED_TEXT,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  focusWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  focusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: SOFT_PURPLE,
    color: PURPLE,
    fontSize: 13,
    fontWeight: "900",
    overflow: "hidden",
  },
  focusChipContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SOFT_PURPLE,
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 8,
    gap: 4,
  },
  focusChipDelete: {
    padding: 4,
    borderRadius: 12,
  },
  todayActions: {
    gap: 10,
  },
  todayButton: {
    minHeight: 58,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  todayButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: PURPLE,
    fontSize: 15,
    fontWeight: "900",
  },
  // M3 destructive button: filled with the theme's error role (set at
  // the call site), full-radius, labelLarge text.
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 23,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  calendarDay: {
    width: "18%",
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayNumber: {
    color: DEEP_TEXT,
    fontSize: 15,
    fontWeight: "900",
  },
  calendarDayNumberActive: {
    color: "#FFFFFF",
  },
  calendarDayDate: {
    color: MUTED_TEXT,
    fontSize: 10,
    fontWeight: "800",
  },
  calendarDayDateActive: {
    color: "#FFFFFF",
  },
  emptyState: {
    padding: 24,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 10,
    color: DEEP_TEXT,
    fontSize: 22,
    fontWeight: "900",
  },
  emptyCopy: {
    marginTop: 6,
    color: MUTED_TEXT,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 21,
  },
  createFastButton: {
    minHeight: 54,
    alignSelf: "stretch",
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
  },
  createFastButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  fastListRow: {
    padding: 15,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDF2",
    marginBottom: 10,
  },
  fastListRowActive: {
    borderColor: PURPLE,
    backgroundColor: SOFT_PURPLE,
  },
  fastListTitle: {
    color: DEEP_TEXT,
    fontSize: 16,
    fontWeight: "900",
  },
  fastListMeta: {
    color: MUTED_TEXT,
    fontSize: 13,
    fontWeight: "700",
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,19,38,0.34)",
  },
  sheet: {
    // v216: definite height, not just a cap — same fix as the
    // shell's themeSheet. This sheet carried the identical
    // indefinite-height chain (content-measured box, flex:1
    // settle wrapper, ScrollView) and would sink the same way.
    // v219: keep the flex chain under this box — flex:1 on the
    // BitSettle wrapper and on the ScrollView. Stripping the
    // wrapper's flex (v216's first pass) left the ScrollView in
    // an auto-height parent, where it collapses and the sheet
    // renders empty. Never flex on THIS box: it would override
    // the 92% height and fill the screen.
    height: "92%",
    maxHeight: "92%",
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#FFFFFF",
  },
  sheetHeader: {
    minHeight: 44,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    color: DEEP_TEXT,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  fieldLabel: {
    marginTop: 18,
    marginBottom: 8,
    color: DEEP_TEXT,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  textInput: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D6D2DC",
    backgroundColor: "#F7F7F8",
    paddingHorizontal: 16,
    color: DEEP_TEXT,
    fontSize: 17,
    fontWeight: "800",
  },
  durationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  durationButton: {
    width: "30%",
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D6D2DC",
    backgroundColor: "#F7F7F8",
    alignItems: "center",
    justifyContent: "center",
  },
  durationButtonActive: {
    backgroundColor: "#050505",
    borderColor: "#050505",
  },
  durationText: {
    color: DEEP_TEXT,
    fontSize: 18,
    fontWeight: "900",
  },
  durationTextActive: {
    color: "#FFFFFF",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  typeButton: {
    width: "47%",
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D6D2DC",
    backgroundColor: "#F7F7F8",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  typeText: {
    color: DEEP_TEXT,
    fontSize: 15,
    fontWeight: "900",
  },
  typeTextActive: {
    color: "#FFFFFF",
  },
  focusInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  focusInput: {
    flex: 1,
  },
  addFocusButton: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCreateButton: {
    minHeight: 58,
    marginTop: 18,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCreateButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.74,
  },
});
