/**
 * v354 — My Profile, Concept 2 "Two Lives" (profile-concepts-v2,
 * Jonathan's pick, Oct 29). The page gains, at its very top:
 * the slim identity band (Settings hero band form, this page's
 * tracker family), the YOUR PRAYER LIFE and YOUR FASTING LIFE
 * group cards, and the YOUR TOWN doors — and the profile editor
 * comes home: the Edit Profile sheet orphaned in the People tab
 * (its opener had lost its last caller) is rehomed here behind
 * the band's Edit, with its save semantics verbatim and the
 * page's own AvatarPicker wired at last (before this build,
 * nothing on the page ever called setShowAvatarPicker(true)).
 *
 * The tracker below stands byte-for-byte in behaviour — these
 * pins hold the new top of the page and the seams around it:
 * the cards run on real stores (profile record, his own
 * person's quiet line, the selected fast), the fasting card's
 * doors only scroll, and every new surface takes its colours
 * from the tracker family (derive, never pin).
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe("v354 — the identity band and the rehomed editor", () => {
  const profile = read("app/profile.tsx");

  it("the slim band stands at the top in the tracker family: avatar, name, level, Edit pill", () => {
    expect(profile).toContain("styles.identityBand, { backgroundColor: trackerFamily.wash }");
    expect(profile).toContain("size={40}");
    expect(profile).toContain("Level {profileLevel}");
    expect(profile).toContain(">Edit<");
    expect(profile).toContain("styles.editPill, { backgroundColor: trackerFamily.wash2 }");
    // The band stands above the two life cards and the tracker.
    expect(profile.indexOf("styles.identityBand")).toBeLessThan(profile.indexOf("YOUR PRAYER LIFE"));
    expect(profile.indexOf("YOUR PRAYER LIFE")).toBeLessThan(profile.indexOf("<FastWhyCard"));
  });

  it("the band's Edit opens the editor through the v330 anchor measurement", () => {
    expect(profile).toContain("onPress={(event) => openProfileEditor(event)}");
    expect(profile).toContain("measureEventAnchor(event, (rect) => {");
    expect(profile).toContain("setProfileEditorAnchor(rect);");
    expect(profile).toContain("<AnchoredSheet visible={showProfileEditor}");
    expect(profile).toContain("anchor={profileEditorAnchor}");
  });

  it("the editor wears creator furniture and the orphaned sheet's fields", () => {
    expect(profile).toContain(">Edit Profile<");
    expect(profile).toContain(">Save<");
    expect(profile).toContain("Upload photo");
    expect(profile).toContain("Choose avatar");
    expect(profile).toContain(">NAME<");
    expect(profile).toContain('placeholder="Your name"');
    // The photo-state line speaks the sheet's three states.
    expect(profile).toContain('draftProfilePhotoUri ? "Uploaded photo" : draftProfileAvatarAsset ? "Pack avatar" : "Default avatar"');
  });

  it("the page's AvatarPicker finally has an opener — the editor's Choose avatar — and feeds drafts while the editor is open", () => {
    expect(profile).toContain("onPress={() => setShowAvatarPicker(true)}");
    // Upload + select both branch into the drafts under the editor.
    expect(count(profile, "if (showProfileEditor) {")).toBe(2);
    expect(profile).toContain("setDraftProfilePhotoUri(result.assets[0].uri);");
    expect(profile).toContain("setDraftProfileAvatarAsset(avatarAsset);");
  });

  it("the save is the orphaned sheet's, verbatim in effect: name required, photo XOR avatar, shiny/book avatars set the aura", () => {
    expect(profile).toContain('Alert.alert("Add your name", "Enter a name before saving your profile.")');
    expect(profile).toContain("photoUri: draftProfileAvatarAsset ? undefined : draftProfilePhotoUri");
    expect(profile).toContain("avatarAsset: draftProfilePhotoUri ? undefined : draftProfileAvatarAsset");
    expect(profile).toContain('auraId: draftProfileAvatarAsset?.endsWith("-shiny") || draftProfileAvatarAsset?.startsWith("book-") ? draftProfileAvatarAsset : undefined');
    // And it persists to the shared profile record.
    expect(profile).toContain("await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);");
  });
});

describe("v354 — the two life cards run on real stores", () => {
  const profile = read("app/profile.tsx");

  it("prayer life: items count off the profile record, the door to /personal-prayer, the streak off the record", () => {
    expect(profile).toContain("YOUR PRAYER LIFE");
    expect(profile).toContain("Personal prayer items");
    expect(profile).toContain("profile.personalPrayerItems?.length ?? 0");
    expect(profile).toContain('router.push("/personal-prayer")');
    expect(profile).toContain("Prayer streak");
    expect(profile).toContain("profile.personalPrayerStreak");
  });

  it("the life verse row speaks his own person's quiet line and opens his person page (whose Edit carries the pickers)", () => {
    expect(profile).toContain("Life verse");
    expect(profile).toContain("getSessionQuietLine({ lifeVerse: ownPerson?.lifeVerse })");
    expect(profile).toContain("ownQuietLine.reference");
    expect(profile).toContain("person.isPersonal");
    expect(profile).toContain('router.push({ pathname: "/person", params: { personId: ownPerson.id } })');
  });

  it("fasting life: the selected fast summarised by the live counter, Open tracker + history doors only scroll, collection keeps its route", () => {
    expect(profile).toContain("YOUR FASTING LIFE");
    expect(profile).toContain("Day ${getCurrentFastDay(selectedFast)} of ${selectedFast.durationDays}");
    expect(profile).toContain("Open tracker");
    expect(profile).toContain("onPress={scrollToTracker}");
    expect(profile).toContain("onPress={scrollToHistory}");
    expect(profile).toContain("trackerAnchorY.current = event.nativeEvent.layout.y;");
    expect(profile).toContain("historyAnchorY.current = event.nativeEvent.layout.y;");
    expect(profile).toContain('router.push("/fast-collection")');
  });

  it("the town doors stand as quiet rows with their routes", () => {
    expect(profile).toContain("YOUR TOWN");
    expect(profile).toContain('router.push("/hometown")');
    expect(profile).toContain('router.push("/character")');
  });

  it("every new surface derives from the tracker family — the three life cards share its card tone", () => {
    expect(count(profile, "styles.lifeCard, { backgroundColor: trackerFamily.card }")).toBe(3);
    expect(profile).toContain("styles.lifeRowDivider, { borderTopColor: trackerFamily.line }");
  });
});

describe("v354 — the tracker below stands untouched", () => {
  const profile = read("app/profile.tsx");

  it("the tracker surfaces keep their order and their engine calls", () => {
    const why = profile.indexOf("<FastWhyCard");
    const todayHero = profile.indexOf("<FastTodayHero");
    const record = profile.indexOf("<FastRecordCard");
    const recaps = profile.indexOf("<FastRecapsCard");
    expect(why).toBeGreaterThan(0);
    expect(why).toBeLessThan(todayHero);
    expect(todayHero).toBeLessThan(record);
    expect(record).toBeLessThan(recaps);
    expect(profile).toContain("onSave={(status, note) => saveDaySheet(sheetDate, status, note)}");
    expect(profile).toContain("onMark={(status, position) => setFastStatus(today, status, position)}");
  });

  it("Fast History still stands below, in the tracker family", () => {
    expect(profile.indexOf("FAST HISTORY")).toBeGreaterThan(profile.indexOf("<FastRecapsCard"));
    expect(profile).toContain("onPress={() => setSelectedFastId(fast.id)}");
  });
});
