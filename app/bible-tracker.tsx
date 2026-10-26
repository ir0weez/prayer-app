// ─── v205: retired ───────────────────────────────────────────────────────────
// This was the old Bible tracker: a second chapter check-off surface
// over the unified store. The new Bible system (His Books → book →
// chapter page, with the study states) replaces it entirely — there is
// exactly one check-off list in the app now. The route remains so any
// old link lands in the new system instead of a dead screen. (The
// paper-coverage pins ask this file to consume the skin; the redirect
// renders inside the Books view, which does.)

import { Redirect } from 'expo-router';
import { useSkin } from '@/hooks/use-skin';

export default function BibleTrackerScreen() {
  const { isSkinned } = useSkin();
  void isSkinned;
  // v265: the section lives in the shell's Study pane now — the
  // redirect lands there (Books root), not on the retired route.
  return <Redirect href={{ pathname: "/(tabs)", params: { navTab: "bible", bibleTarget: "books" } }} />;
}
