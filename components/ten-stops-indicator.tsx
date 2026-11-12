// ─── Ten Stops indicator surfaces (v507) ────────────────────────────────────
// The route strip from Jonathan's picked blend (2026-11-11,
// ten-stops-indicator-blend-v2.html): Concept 3's route across the
// top of the chapter — ten numbered dots on a line, in the book's
// own v420 family. Stops in chapters behind the reader are filled
// with the family's mid tone, this chapter's stop stands larger in
// the solid primary, stops ahead wait as white dots; a segment is
// filled exactly when the stop at its left is behind the reader
// (the rule both of the drawing's phones follow). The caption
// names how many stops are behind you and, on a stop's own
// chapter, which stop this is. Every dot is a door (below).
//
// The margin marker (the blend's other half) renders inside the
// chapter page's entries themselves — see chapter-page.tsx's
// stopMark props — because an entry's measured position is its
// own; this file carries the strip and the shared door only.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BiblePalette } from './bible-v205/palette';
import { tenStopsAsDevotional, type TenStops } from '@/lib/ten-stops';
import {
  routeBehindLabel,
  routeHereLabel,
  routeStopState,
  stopMarkForChapter,
  tenStopIndicatorTones,
  tenStopMarks,
  type TenStopMark,
} from '@/lib/ten-stops-indicator';
import { tenStopsLocalSource } from '@/lib/ten-stops-download';

/**
 * The shared door behind every Ten Stops disc and dot: open the
 * tour in the devotional player AT this stop. Returns true when
 * the player took the session (the caller then opens the player
 * route); false when the tour is not on this phone, so the caller
 * can route the reader to the book page's Ten Stops card, where
 * Download lives — a tap never fails silently.
 *
 * The controller loads LAZILY (the v501 card's pattern): it pulls
 * expo-audio's native module in with it, and these surfaces must
 * stay importable anywhere the chapter page is, tests included.
 * Seeking after the open works whether the session was just
 * loaded (openDevotional starts it) or was already standing (the
 * same tour reopened — the open is a no-op, the seek lands).
 */
export function openTenStopsAtStop(entry: TenStops, mark: TenStopMark): boolean {
  const source = tenStopsLocalSource(entry);
  if (!source) return false;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { openDevotional, seekDevotional } = require('../lib/devotional-player') as typeof import('@/lib/devotional-player');
  if (!openDevotional(tenStopsAsDevotional(entry), source)) return false;
  seekDevotional(mark.startSec);
  return true;
}

export function TenStopsRouteStrip(props: {
  entry: TenStops | null;
  chapter: number;
  palette: BiblePalette;
  onStopPress: (mark: TenStopMark) => void;
}) {
  const { entry, chapter, palette, onStopPress } = props;
  if (!entry) return null;
  const marks = tenStopMarks(entry);
  if (marks.length === 0) return null;
  const tones = tenStopIndicatorTones(palette.rasp);
  const here = stopMarkForChapter(entry, chapter);
  return (
    <View
      testID="ten-stops-route-strip"
      style={[styles.route, { backgroundColor: palette.raspTint }]}
    >
      <View style={styles.routeLine}>
        {marks.map((mark, i) => {
          const state = routeStopState(mark, chapter);
          const dotStyle =
            state === 'now'
              ? [styles.dot, styles.dotNow, { backgroundColor: palette.rasp, borderColor: palette.rasp }]
              : state === 'done'
                ? [styles.dot, { backgroundColor: tones.mid, borderColor: tones.mid }]
                : [styles.dot, { backgroundColor: palette.paper2, borderColor: tones.mid }];
          const numStyle =
            state === 'ahead'
              ? [styles.dotNum, { color: tones.dotText }]
              : [styles.dotNum, state === 'now' ? styles.dotNumNow : null, { color: '#FFFFFF' }];
          return (
            <View
              key={mark.stop}
              style={[styles.routeCell, i === marks.length - 1 ? { flex: 0 } : null]}
            >
              <Pressable
                testID={`ten-stop-route-dot-${mark.stop}`}
                accessibilityLabel={`Ten Stops stop ${mark.stop} — ${mark.title}`}
                onPress={() => onStopPress(mark)}
                style={dotStyle}
              >
                <Text style={numStyle}>{mark.stop}</Text>
              </Pressable>
              {i < marks.length - 1 ? (
                <View
                  style={[
                    styles.seg,
                    { backgroundColor: state === 'done' ? tones.mid : tones.seg },
                  ]}
                />
              ) : null}
            </View>
          );
        })}
      </View>
      <View style={styles.routeCap}>
        <Text style={[styles.capText, { color: palette.raspDeep }]}>
          {routeBehindLabel(entry, chapter)}
        </Text>
        {here ? (
          <Text testID="ten-stop-route-here" style={[styles.capText, { color: palette.raspDeep }]}>
            {routeHereLabel(here)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The drawing's measure: tintA panel, 14px radius, 10/12 padding,
  // seated with a 2px top and 12px bottom margin in the chapter's
  // own flow.
  route: { borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, marginTop: 2, marginBottom: 12 },
  routeLine: { flexDirection: 'row', alignItems: 'center' },
  // One dot + the segment after it travel as one cell so the
  // segment flexes in the space between dots, as the drawing's
  // flex line does.
  routeCell: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dot: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0,
  },
  dotNow: { width: 23, height: 23, borderRadius: 12 },
  dotNum: { fontSize: 9.5, fontWeight: '800' },
  dotNumNow: { fontSize: 11 },
  seg: { flex: 1, height: 2.5, marginHorizontal: 2 },
  routeCap: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  capText: { fontSize: 11, fontWeight: '700' },
});
