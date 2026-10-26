/**
 * v273 — "Mark as Read, Where He Is": Jonathan's Oct 26 12:11 ask,
 * with a Schedule screenshot of the Personal Study card on
 * Leviticus 22: 'Can we make the "Bible" button a "Mark as Read"
 * button? Also in the last of the "Read as Stories" page, it
 * should have a "Mark as Read" button as well…'
 *
 * What v273 does:
 *  1. The Personal Study card's expanded bottom row: the big Bible
 *     doorway becomes Mark as Read for the headline chapter — the
 *     SAME readTarget the header "Read Chapter" pill opens. It
 *     walks the one read door (markChapterRead / unmarkChapterRead
 *     from lib/bible-v205/rewards, the two-marks authority) —
 *     never the legacy unified markChapterAsRead. Read state is
 *     worn on the button ("Read", quiet dress) and the tap
 *     unmarks: the way back down. The header pill, the Back
 *     button, and the queue button are unchanged; the collapsed
 *     card gains nothing.
 *  2. The LAST slide of Read as Stories (the end screen) gains
 *     the same toggle, reusing the chapter page's own
 *     handleMarkRead / handleClearRead behind handleToggleRead —
 *     no second mark implementation — and it renders for every
 *     chapter the end screen renders for, noteless included.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const schedule = read("components/schedule-tab.tsx");
const stories = read("components/bible-v205/stories-view.tsx");
const chapterPage = read("components/bible-v205/chapter-page.tsx");

const card = schedule.slice(
  schedule.indexOf('case "personal-study-card"'),
  schedule.indexOf('case "time-off"'),
);
const markHandler = schedule.slice(
  schedule.indexOf("const handlePersonalStudyMarkRead"),
  schedule.indexOf("// Sync currentBibleBook whenever bibleState changes."),
);
const endScreen = stories.slice(
  stories.indexOf("styles.endBtns"),
  stories.indexOf("Back to chapter"),
);

describe("v273 — the study card's button is Mark as Read", () => {
  it("the card handler walks the ONE read door — rewards, never the legacy unified mark", () => {
    expect(schedule).toContain("markChapterRead, transitionChapterStatus, unmarkChapterRead");
    expect(markHandler).toContain("await loadV205StudyState()");
    expect(markHandler).toContain("v205ChapterReadDate(study, book, chapter)");
    expect(markHandler).toContain("await unmarkChapterRead(study, book, chapter)");
    expect(markHandler).toContain("await markChapterRead(study, book, chapter, undefined, imports)");
    expect(markHandler).toContain("loadStudioImports()");
    expect(markHandler).toContain("refreshStudyCard()");
    expect(markHandler).not.toContain("markChapterAsRead");
  });

  it("the button marks the headline chapter — the same readTarget the header pill opens", () => {
    expect(card).toContain("handlePersonalStudyMarkRead(item.data.readTarget.book, item.data.readTarget.chapter)");
    expect(card).toContain("item.data.readTarget ? (");
    expect(card).toContain("onPress={() => onOpenBible?.({ name: 'chapter', book: item.data.readTarget.book, chapter: item.data.readTarget.chapter })}");
  });

  it("the toggle state renders: Mark as Read unread, Read + clear-the-mark when read", () => {
    expect(card).toContain('item.data.targetRead ? "Read" : "Mark as Read"');
    expect(card).toContain("is read — tap to clear the read mark");
    expect(card).toContain("Mark ${item.data.readTarget.book} ${item.data.readTarget.chapter} as read");
  });

  it("the card's read state derives from the store's own read mark, not an assumption", () => {
    expect(schedule).toContain("const targetRead = readTarget ? v205ChapterReadDate(studySnap, readTarget.book, readTarget.chapter) !== null : false;");
    expect(schedule).toContain("readTarget, targetRead, currentBook");
  });

  it("the plain Books doorway is gone from the card; the queue button still opens Books", () => {
    expect(card.split("onOpenBible?.({ name: 'books' })")).toHaveLength(1);
    expect(card).toContain("onOpenBible?.({ name: 'books', openBookNav: true })");
    expect(card).toContain('accessibilityLabel="Choose Bible book"');
  });

  it("the header pill, Back and queue buttons are unchanged — and nothing lands on the collapsed card", () => {
    expect(card).toContain("Read Chapter");
    expect(card).toContain("accessibilityLabel={`Read Chapter — ${item.data.readTarget.book} ${item.data.readTarget.chapter}`}");
    expect(card).toContain('accessibilityLabel="Back one chapter"');
    expect(card).toContain("handlePersonalStudyBack(item.data.currentBook)");
    const bodyIdx = card.indexOf("isPersonalStudyExpanded && (item.data.preview");
    expect(bodyIdx).toBeGreaterThan(-1);
    expect(card.indexOf("handlePersonalStudyMarkRead")).toBeGreaterThan(bodyIdx);
  });
});

describe("v273 — the last Stories slide carries Mark as Read", () => {
  it("StoriesView takes the host's read mark + toggle — and implements no mark of its own", () => {
    expect(stories).toContain("readDate: string | null;");
    expect(stories).toContain("onToggleRead: (() => void) | null;");
    expect(stories).not.toContain("bible-v205/rewards");
    expect(stories).not.toContain("markChapterRead");
    expect(stories).not.toContain("unmarkChapterRead");
  });

  it("the button stands on the END screen, above Next chapter", () => {
    expect(endScreen).toContain("props.onToggleRead");
    expect(endScreen).toContain("props.readDate === null");
    expect(endScreen).toContain("Mark as Read");
    expect(endScreen).toContain("✓ Read · {formatReadDate(props.readDate)}");
    expect(endScreen.indexOf("Mark as Read")).toBeLessThan(endScreen.indexOf("Next chapter"));
  });

  it("the chapter page wires its own handlers behind the toggle — its foot controls untouched", () => {
    const toggle = chapterPage.slice(
      chapterPage.indexOf("const handleToggleRead"),
      chapterPage.indexOf("const handleCategory"),
    );
    expect(toggle).toContain("await handleClearRead()");
    expect(toggle).toContain("await handleMarkRead()");
    expect(chapterPage).toContain("readDate={readDate}");
    expect(chapterPage).toContain("onToggleRead={studyState ? handleToggleRead : null}");
    expect(chapterPage).toContain("onPress={handleMarkRead}");
    expect(chapterPage).toContain("onPress={handleClearRead}");
  });
});
