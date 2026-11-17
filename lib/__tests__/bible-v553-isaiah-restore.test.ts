// ─── v553 Isaiah restore — pins ──────────────────────────────────────────────
// v551 cleaned four verses that had Jonathan's note prose fused into them
// (1 Cor 7:14, Isa 6:3, 19:10, 21:12) and fixed the parser so the prose
// lands in note blocks. Three of the passages — all Isaiah — existed in the
// shipped seed ONLY inside the fused verses, so truncating the verses left
// those entries with no blocks at all on device. Jonathan directed the
// restore: the notes go under their proper verses, where they would have
// been anyway. v553 places the fixed parser's own yielded blocks into
// lib/bible-v205/data/isaiah.ts at the entries the parser assigns them to,
// in the parser's order — no regeneration (the Notion merge stages would
// balloon the diff), nothing retyped: each block below is byte-identical
// to the parser's output over his canonical Isaiah txt and to the prose
// tail of the pre-v551 fused verse.
//
//  - Isa 6 entry 3-3 gains the Revelation 4:8 scripture block, FIRST.
//  - Isa 19 entry 8-10 (empty since v551) gains the fishing-story para.
//  - Isa 21 entry 12-12 gains the "morning" para, FIRST.
// Isaiah's verses stay byte-identical to v551, and 1 Corinthians 7 — whose
// prose already stood as proper blocks — is untouched.

import { describe, expect, it } from 'vitest';

import { COMMENTARY_DATA } from '../bible-v205/data/index';

const isaiah = COMMENTARY_DATA['Isaiah'];

function entryOf(chapter: number, start: number, end: number) {
  return isaiah.chapters[chapter].sections
    .flatMap((s) => s.entries)
    .find((e) => e.start === start && e.end === end);
}

describe('v553 — the three Isaiah passages are back as note blocks', () => {
  it('Isaiah 6 entry 3-3: the Revelation 4:8 scripture block stands first, verbatim', () => {
    const entry = entryOf(6, 3, 3);
    expect(entry).toBeDefined();
    expect(entry?.blocks).toHaveLength(2);
    expect(entry?.blocks[0]).toEqual({
      kind: 'scripture',
      text: "And the four beasts had each of them six wings about him; and they were full of eyes within: and they rest not day and night, saying, Holy, holy, holy, Lord God Almighty, which was, and is, and is to come.",
      ref: 'Revelation 4:8',
    });
    // His own paragraph that always stood here still follows it.
    expect(entry?.blocks[1].kind).toBe('para');
    expect(entry?.blocks[1].text).toContain('This is their function every time we see them.');
  });

  it('Isaiah 19 entry 8-10: the fishing story stands as its para block, verbatim', () => {
    const entry = entryOf(19, 8, 10);
    expect(entry).toBeDefined();
    expect(entry?.blocks).toEqual([{ kind: 'para', text: "I don’t know if you’ve ever gone fishing before, but when you leave to go fishing, you usually want to prepare yourself with the necessities: a rod, a reel, a net, hooks, bait, a bag (or cooler), a license, a knife, and so on. If you take your time to go fishing in the right area, at the right time, with the right hook and bait, you will likely catch quite a lot of fish. That’s good food. But there is nothing worse than spending all the time getting ready, driving to your nearest fishing spot, setting out the line and hook, waiting for hours to try and catch something, leaving just before dusk, and coming home with nothing to show for it. That is miserable and frustrating. It’s a wasted effort, and it’s usually not fun when you have nothing to bring home with you. That is what Egypt will look like. Everything they do and take their time in doing, everything they would prosper in before and would earn a wage from, will be useless and will not work. It’s like the fish have disappeared, and they no longer have the ability to perform the art they once could before. Those people who could easily make a nice net or worked with flax and made useful tools will suddenly forget how to do it. That would be miserable as well. I used to love writing music. I could express myself greatly by writing a song. I haven’t done it in years. I have lost that talent, and I wish I could do it again. It took a lot of time for me to stop playing before I forgot how to do it. These people will lose their craft seemingly overnight. They will just completely forget how they are supposed to work. They will become people who have no joy or fulfillment in the things they loved so much. That’s another pretty evident sign of God’s judgment. Joy will be lost if the Lord is judging people." }]);
  });

  it('Isaiah 21 entry 12-12: the morning para stands first, verbatim, ahead of the Psalm quote', () => {
    const entry = entryOf(21, 12, 12);
    expect(entry).toBeDefined();
    expect(entry?.blocks).toHaveLength(7);
    expect(entry?.blocks[0]).toEqual({ kind: 'para', text: "The morning could reference Christ. It could reference His return. The Earth is dark, but Christ will bring light." });
    expect(entry?.blocks[1].kind).toBe('scripture');
    expect(entry?.blocks[1].ref).toBe('Psalm 139:12');
  });
});

describe('v553 — nothing else moved', () => {
  it('Isaiah’s verses are v551’s: the three chapters keep their clean verse maps', () => {
    expect(Object.keys(isaiah.chapters[6].verses ?? {})).toHaveLength(13);
    expect(Object.keys(isaiah.chapters[19].verses ?? {})).toHaveLength(25);
    expect(Object.keys(isaiah.chapters[21].verses ?? {})).toHaveLength(17);
    expect(isaiah.chapters[6].verses?.[3]).toBe(
      'And one cried unto another, and said, Holy, holy, holy, is the Lord of hosts: the whole earth is full of his glory.',
    );
    expect(isaiah.chapters[19].verses?.[10]).toBe(
      'And they shall be broken in the purposes thereof, all that make sluices and ponds for fish.',
    );
    expect(isaiah.chapters[21].verses?.[12]).toBe(
      'The watchman said, The morning cometh, and also the night: if ye will enquire, enquire ye: return, come.',
    );
    // The restored prose lives in the blocks now — never back in a verse.
    for (const n of [6, 19, 21]) {
      for (const t of Object.values(isaiah.chapters[n].verses ?? {})) {
        expect(t).not.toContain('four beasts had each of them six wings');
        expect(t).not.toContain('gone fishing');
        expect(t).not.toContain('morning could reference Christ');
      }
    }
  });

  it('1 Corinthians 7 is untouched: entry (12,14) keeps its blocks in order', () => {
    const ch = COMMENTARY_DATA['1 Corinthians'].chapters[7];
    const entry = ch.sections
      .flatMap((s) => s.entries)
      .find((e) => e.start === 12 && e.end === 14);
    expect(entry).toBeDefined();
    expect((entry?.blocks ?? []).map((b) => b.kind)).toEqual([
      'para',
      'thought',
      'para',
      'thought',
      'conversation',
      'scripture',
    ]);
    const convo = entry?.blocks.find((b) => b.kind === 'conversation');
    expect(convo?.text).toContain('I made a grave mistake as a newborn Christian in ministry.');
    const last = entry?.blocks[entry.blocks.length - 1];
    expect(last?.kind).toBe('scripture');
    expect(last?.ref).toBe('2 Corinthians 6:14');
  });
});
