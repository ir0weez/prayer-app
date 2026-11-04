// ─── v429: the prayer-post faces overlap again — as circles ───────────────
// The Journal PRAYER post's face stack, three acts:
//
// Pre-v426: the faces overlapped in a column (marginTop -12,
// marginLeft 15 for index>0, size 40, a 3px ring in the card tint).
// On device two same-coloured faces merged into one speech-bubble
// blob — his words: "aren't even circles" (Nov 4). The mechanism,
// read off his screenshot pixel by pixel: the stack painted
// DESCENDING (zIndex 3 - index), so each later face slid UNDER the
// one above it. The front face rendered as a complete ringed
// circle; the face behind it was sliced by that disc — its top
// boundary was the front face's bottom ring arc (a concave cut),
// and where its disc emerged at the front face's lower-right the
// two outlines met at a sharp point, a tail. The 3px tint ring
// never saved it: the only ring visible between the two fills
// belonged to the face IN FRONT, outlining the cutter, never the
// cut face — and with both fills the same deep green, nothing
// outlined the behind face as a circle at all.
//
// v426 (shipped, apk-20261104-v426) removed the overlap entirely:
// faces stood separate in a column with a 6px gap. Complete
// circles — and a look he never asked to lose.
//
// v429 is his correction (Nov 4, over the v426 screenshot): "I
// like the way the avatars overlapped before. I just wanted them
// to be fixed into circles..." The overlap composition is back
// (the pre-v426 offsets, size 40, max 3, tap-to-open-person
// unchanged) and the circles are fixed by the STACKING ORDER:
// each later face now paints OVER the previous one (ascending
// zIndex), so every face's own opaque tint ring is drawn against
// the face behind it and its disc reads as a complete circle;
// earlier faces peek out from behind. AvatarImage is untouched,
// and so is the v425 initials ink (avatar-system.tsx) — the whole
// fix lives in the prayer branch of journal-kind-post.tsx.
//
// The pins: a real render (the v425/v427 SSR rig) — face order,
// the overlap offsets on the rendered faces, strictly ascending
// z-index, every face's ring colour equal to the prayer card's
// own surface colour (and not the face colour), the stack capped
// at 3 — plus source pins for the dress the render carries as
// classes (3px ring, full-round clip, size 40) and the tap wiring.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', async () => {
  const rnw = await import('react-native-web');
  return {
    ...rnw,
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
  };
});

vi.mock('@expo/vector-icons/MaterialIcons', async () => {
  const React = await import('react');
  const { Text } = await import('react-native-web');
  return {
    default: (props: any) =>
      React.createElement(Text, { style: { color: props.color, fontSize: props.size } }, `icon:${props.name}`),
  };
});

vi.mock('expo-image', async () => {
  const React = await import('react');
  const { View } = await import('react-native-web');
  return { Image: (props: any) => React.createElement(View, props) };
});

// AvatarImage itself is NOT under test (v429 must not touch it) —
// the stub stands in with the same contract the stack consumes:
// a size×size round disc in the person's fallback colour.
vi.mock('@/components/avatar-system', async () => {
  const React = await import('react');
  const { View, Text } = await import('react-native-web');
  return {
    AvatarImage: (props: any) =>
      React.createElement(
        View,
        {
          dataSet: { avatarfor: props.id },
          style: { width: props.size, height: props.size, borderRadius: props.size / 2, backgroundColor: props.fallbackColor, alignItems: 'center', justifyContent: 'center' },
        },
        React.createElement(Text, null, props.name.split(/\s+/).map((p: string) => p[0]).join('')),
      ),
  };
});

vi.mock('@/components/markdown-text', async () => {
  const React = await import('react');
  const { Text } = await import('react-native-web');
  return { MarkdownText: (props: any) => React.createElement(Text, props, props?.children ?? props?.text ?? null) };
});

vi.mock('@/components/mood-face', async () => {
  const React = await import('react');
  const { View } = await import('react-native-web');
  return { MoodFaceChip: (props: any) => React.createElement(View, props) };
});

vi.mock('@/components/wavy-progress', async () => {
  const React = await import('react');
  const { View } = await import('react-native-web');
  return { WavyProgress: (props: any) => React.createElement(View, props) };
});

import { JournalKindPost } from '@/components/journal-kind-post';
import { getThemedPalette } from '../color-themes';
import { deriveJournalMaterial } from '../journal-material';
import type { PrayerJournalEntry, PrayerJournalTaggedPerson } from '../prayer-journal';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

const palette = getThemedPalette('light', 'default' as never);
const jm = deriveJournalMaterial(palette.primary, {
  background: palette.background,
  surface: palette.surface,
  foreground: palette.foreground,
  muted: palette.muted,
  border: palette.border,
});

// His screenshot's pair: two faces, the SAME deep green — the
// exact case that blobbed. A third and a fourth ride along to pin
// the ascending stack and the max-3 cap.
const GREEN = '#1E6B46';
const person = (id: string, name: string, initials: string): PrayerJournalTaggedPerson =>
  ({ id, name, initials, avatarColor: GREEN, accentColor: GREEN, photoUri: undefined, avatarAsset: undefined, gender: undefined } as PrayerJournalTaggedPerson);

const entry: PrayerJournalEntry = {
  id: 'e1',
  kind: 'prayer',
  title: 'For Matthew & Peter',
  body: 'Bring them to their knees Lord.',
  date: '2026-11-04',
  taggedPeople: [
    person('matthew', 'Matthew Roberts', 'MR'),
    person('peter', 'Peter Miller', 'PM'),
    person('third', 'Third Person', 'TP'),
    person('fourth', 'Fourth Person', 'FP'),
  ],
  isBookmarked: false,
  replies: [],
  createdAt: '2026-11-04T10:36:00.000Z',
  updatedAt: '2026-11-04T10:36:00.000Z',
};

function renderFaces() {
  const html = renderToString(
    <JournalKindPost
      entry={entry}
      jm={jm}
      onShowActions={() => {}}
      onToggleBookmark={() => {}}
      onOpenPerson={() => {}}
      onReplyLongPress={() => {}}
    />,
  );
  // Each face is a Pressable whose only child is the avatar disc.
  const faces = [...html.matchAll(/<div tabindex="0" class="([^"]*)" style="([^"]*)"><div data-avatarfor="([^"]+)"/g)].map(
    (m) => ({ classes: m[1], style: m[2], id: m[3] }),
  );
  const cardBg = /style="background-color:(rgba?\([^)]*\))"/.exec(html)?.[1];
  return { html, faces, cardBg };
}

const styleOf = (style: string) =>
  Object.fromEntries(style.split(';').filter(Boolean).map((kv) => {
    const i = kv.indexOf(':');
    return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
  }));

describe("v429 — the rendered stack (behaviour)", () => {
  const { faces, cardBg } = renderFaces();

  it("renders the tagged people in order, capped at 3 faces", () => {
    expect(faces.map((f) => f.id)).toEqual(['matthew', 'peter', 'third']);
  });

  it("the overlap is back: later faces pull up 12 and shift right 15, the first sits at 0/0", () => {
    const s0 = styleOf(faces[0].style);
    expect(s0['margin-top']).toBe('0px');
    expect(s0['margin-left']).toBe('0px');
    for (const face of faces.slice(1)) {
      const s = styleOf(face.style);
      expect(s['margin-top']).toBe('-12px');
      expect(s['margin-left']).toBe('15px');
    }
  });

  it("stacking ASCENDS: each later face paints over the previous one (the blob fix)", () => {
    const zs = faces.map((f) => Number(styleOf(f.style)['z-index']));
    for (let i = 1; i < zs.length; i++) expect(zs[i]).toBeGreaterThan(zs[i - 1]);
  });

  it("every face carries an opaque ring in the card's own tint — on all four sides, and never the face colour", () => {
    expect(cardBg).toBeTruthy();
    for (const face of faces) {
      const s = styleOf(face.style);
      for (const side of ['top', 'right', 'bottom', 'left']) {
        expect(s[`border-${side}-color`]).toBe(cardBg);
      }
      // The ring is the card tint, not the shared face green — it
      // is what outlines each disc against the face behind it.
      expect(s['border-top-color']).not.toContain('30,107,70');
      // The dress rides along: ring width, full-round radius, clip.
      expect(face.classes).toContain('r-borderWidth-');
      expect(face.classes).toContain('r-borderRadius-');
      expect(face.classes).toContain('r-overflow-');
    }
  });
});

describe("v429 — the wiring (source pins)", () => {
  const kindPost = read("components/journal-kind-post.tsx");
  const prayerBranch = kindPost.slice(kindPost.indexOf('if (format === "prayer")'), kindPost.indexOf('if (format === "answered")'));

  it("restores the pre-v426 offsets with ascending stacking; the descending stack and the v426 gap are gone", () => {
    expect(prayerBranch).toContain("marginTop: index === 0 ? 0 : -12");
    expect(prayerBranch).toContain("marginLeft: index === 0 ? 0 : 15");
    expect(prayerBranch).toContain("zIndex: index + 1");
    expect(prayerBranch).not.toContain("zIndex: 3 - index");
    expect(prayerBranch).not.toContain("marginTop: index === 0 ? 0 : 6");
  });

  it("the ring is the prayer card's own surface token — the same jm.prayerTint the card paints", () => {
    expect(prayerBranch).toContain("borderColor: jm.prayerTint");
    expect(prayerBranch).toContain("backgroundColor: jm.prayerTint");
  });

  it("the circle dress is unchanged: 3px ring, full-round, clipped, size 40", () => {
    expect(kindPost).toContain("prayerFace: { borderRadius: 999, borderWidth: 3, overflow: \"hidden\" }");
    expect(prayerBranch).toContain("size={40}");
  });

  it("max 3 and tap-to-open-person are unchanged", () => {
    expect(prayerBranch).toContain("people.slice(0, 3)");
    expect(prayerBranch).toContain("onPress={() => callbacks.onOpenPerson(person.id)}");
  });
});
