// ─── Devotionals registry (v230 — "Listen: Genesis 1" pilot) ────────────────
//
// Jonathan records short chapter devotionals in his own voice. A devotional
// exists for a chapter ONLY because a registry entry exists here: the file
// ships inside the app bundle and one entry wires it to its chapter. Adding
// a future chapter is exactly: drop the .m4a in assets/audio/ + add an entry.
//
// The Listen button on the chapter page is purely registry-driven
// (getDevotional) — no registry entry, no button, no dead UI.

export interface Devotional {
  book: string;
  chapter: number;
  title: string;
  /** Bundled audio asset filename in assets/audio/ (the require() itself
   * lives in lib/devotional-audio.ts so this module stays import-pure). */
  audioFile: string;
  /** Fallback duration (seconds) until the player reports the real one. */
  durationSec: number;
  /** The spoken script, paragraph by paragraph, verbatim. */
  paragraphs: string[];
}

export function devotionalKey(book: string, chapter: number): string {
  return `${book}|${chapter}`;
}

const REGISTRY: Devotional[] = [
  {
    book: 'Genesis',
    chapter: 1,
    title: 'Devotional — Genesis 1',
    // Jonathan's own recording (Oct 24, 2026): 83.7s, 2.7 MB.
    audioFile: 'devotional-genesis-1.m4a',
    durationSec: 84,
    paragraphs: [
      "This is the brief on the Genesis chapter 1 devotional. We're unpacking the Bible's first chapter, not as some dry historicalist, but as a profound blueprint showing how timeless creator purposefully designed the universe, specifically for you. First, let's look at God's relationship with time. In the beginning, refers to our beginning, not God's, because He invented time for us. You might wonder, well, if God created everything who created God, but if He was created by something else, He wouldn't be God. He's like an author, totally unbound by the timeline of the characters He creates. Because of that, He systematically built an ordered universe step by step.",
      "Second, notice the intentional order and authority. God built a self-sustaining world. It's wild, but on day one He made light without a source, waiting until day four to actually place the sun and moon in the sky. Creation also has strict boundaries, reproducing only after their kind. You literally can't cross-breed a banana with a potato to get a potato, so if this environment was built so carefully, who was the ultimate guest of honor?",
      'Finally, the true purpose of creation. The universe was structured with one focus, mankind. This guy is for birds, the water is for fish, but the entire setup was prepared for humans to reflect God\'s image, just like the moon reflects the sun. Was this all just some divine science experiment to see how life grows? No way. It was a perfectly prepared home, built entirely with us in mind.',
      "Genesis chapter one isn't just a basic timeline of what God made when, it is the ultimate proof of a timeless creator intentionally designing a perfect habitat, specifically for us.",
    ],
  },
];

/** The chapter's devotional, or null — drives the Listen button's existence. */
export function getDevotional(book: string, chapter: number): Devotional | null {
  return REGISTRY.find((d) => d.book === book && d.chapter === chapter) ?? null;
}

export function devotionalRegistry(): readonly Devotional[] {
  return REGISTRY;
}

// ─── Paragraph window math ──────────────────────────────────────────────────
//
// HONESTY: the words follow playback by PROPORTION, not word-sync. Each
// paragraph owns a slice of the total duration weighted by its character
// length (longer paragraphs are spoken longer); the active paragraph is the
// one whose slice contains the elapsed position. No timing data exists in
// the recording, so nothing finer is claimed anywhere in the UI or code.

export function activeParagraphIndex(
  positionSec: number,
  durationSec: number,
  paragraphs: readonly string[],
): number {
  if (paragraphs.length === 0) return -1;
  if (!(durationSec > 0) || !(positionSec > 0)) return 0;
  if (positionSec >= durationSec) return paragraphs.length - 1;
  const totalChars = paragraphs.reduce((sum, p) => sum + Math.max(1, p.length), 0);
  const target = (positionSec / durationSec) * totalChars;
  let acc = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    acc += Math.max(1, paragraphs[i].length);
    if (target < acc) return i;
  }
  return paragraphs.length - 1;
}

/** "1:24" clock label for a seconds value. */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
