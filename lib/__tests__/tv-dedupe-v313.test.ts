// ─── v313 — the TV sub-line dedupe pins ──────────────────────────────────
// His screenshot (Oct 28, 14:19): the Dexter card read "S2 E1 ·
// Dexter Resurrection · Season 2 Episode 1 · 59 min" — the season
// and episode said twice, once from the fields, once spelled out in
// his note. The dedupe strips the spelled-out copy only when the
// compact read renders AND the numbers match; his words otherwise
// stand untouched.

import { describe, expect, it } from 'vitest';
import { stripSpelledSeasonEpisode } from '@/lib/season-episode';
import { itineraryDetailLine } from '@/lib/time-off';
import type { ItineraryEntry } from '@/lib/time-off';

describe('v313 — stripSpelledSeasonEpisode', () => {
  it('the Dexter case: spelled-out pair matching the fields is stripped', () => {
    expect(stripSpelledSeasonEpisode('Dexter Resurrection · Season 2 Episode 1', 2, 1)).toBe(
      'Dexter Resurrection',
    );
  });

  it('the composed line reads the fact once', () => {
    const detail = stripSpelledSeasonEpisode('Dexter Resurrection · Season 2 Episode 1', 2, 1);
    const line = ['S2 E1', detail, '59 min'].filter(Boolean).join(' · ');
    expect(line).toBe('S2 E1 · Dexter Resurrection · 59 min');
  });

  it('tolerates a comma and loose spacing, case-insensitively', () => {
    expect(stripSpelledSeasonEpisode('The Bear — season 1, episode 6 tonight', 1, 6)).toBe(
      'The Bear — tonight',
    );
  });

  it('a note that IS only the spelled-out pair empties cleanly', () => {
    expect(stripSpelledSeasonEpisode('Season 2 Episode 1', 2, 1)).toBe('');
  });

  it('numbers that do NOT match the fields leave the note untouched', () => {
    expect(stripSpelledSeasonEpisode('Dexter Resurrection · Season 3 Episode 1', 2, 1)).toBe(
      'Dexter Resurrection · Season 3 Episode 1',
    );
    expect(stripSpelledSeasonEpisode('Dexter Resurrection · Season 2 Episode 4', 2, 1)).toBe(
      'Dexter Resurrection · Season 2 Episode 4',
    );
  });

  it('only one field set never strips — even a fully matching pair', () => {
    expect(stripSpelledSeasonEpisode('Dexter Resurrection · Season 2 Episode 1', 2, null)).toBe(
      'Dexter Resurrection · Season 2 Episode 1',
    );
    expect(stripSpelledSeasonEpisode('Dexter Resurrection · Season 2 Episode 1', null, 1)).toBe(
      'Dexter Resurrection · Season 2 Episode 1',
    );
    expect(stripSpelledSeasonEpisode('Dexter Resurrection · Season 2 Episode 1')).toBe(
      'Dexter Resurrection · Season 2 Episode 1',
    );
  });

  it('a spelled-out season alone (no episode) is not a pair and stays', () => {
    expect(stripSpelledSeasonEpisode('Dexter Resurrection · Season 2', 2, 1)).toBe(
      'Dexter Resurrection · Season 2',
    );
  });
});

describe('v313 — the itinerary detail line dedupes the same way', () => {
  const entry = (over: Partial<ItineraryEntry>): ItineraryEntry => ({
    id: 'e1',
    kind: 'plan',
    date: '2026-11-20',
    title: 'Untitled',
    ...over,
  });

  it('an itinerary TV entry with the spelled-out pair in its detail', () => {
    expect(
      itineraryDetailLine(
        entry({ title: 'TV Show', detail: 'Dexter Resurrection · Season 2 Episode 1', season: 2, episode: 1 }),
      ),
    ).toBe('S2 E1 · Dexter Resurrection');
  });

  it('a plain show name still composes as before (v303 pin intact)', () => {
    expect(itineraryDetailLine(entry({ title: 'TV Show', detail: 'The Bear', season: 1, episode: 6 }))).toBe(
      'S1 E6 · The Bear',
    );
  });
});
