// ─── v241 Bible screen boundary ──────────────────────────────────────────────
// The pattern follows components/safe-boundary.tsx (the Mission Field
// precedent: a render error lands on a calm, visible fallback instead
// of force-quitting the production build). The Bible screens need the
// same net, in their own palette, full-screen: on Oct 24 the Books
// view presented on Jonathan's phone as a blank page in the
// navigator's default background (rgb(242,242,242)) with only the
// topbar's borders painted — a subtree failure with no visible word
// about itself. Any future failure here lands on THIS page instead:
// his ink on his paper, a way back, and the error's name in small
// print (SafeBoundary-style diagnostics) so a screenshot of the
// fallback names the real fault.

import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useBiblePalette } from './palette';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
  /** Diagnostics shown under the fallback so the real bug can be fixed. */
  details?: string;
}

export class BibleScreenBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    try {
      console.warn('[BibleScreenBoundary] caught render error:', error);
    } catch {}
    try {
      const details =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);
      this.setState({ details: details.slice(0, 300) });
    } catch {}
  }

  render() {
    if (this.state.failed) return <BibleScreenFallback details={this.state.details} />;
    return this.props.children;
  }
}

/** Exported for the v241 render pins: what the boundary shows is a
 * promise, so the suite renders this page directly. */
export function BibleScreenFallback({ details }: { details?: string }) {
  const palette = useBiblePalette();
  const router = useRouter();
  return (
    <View style={[styles.wrap, { backgroundColor: palette.paper }]}>
      <Text style={[styles.kicker, { color: palette.rasp }]}>PrayerCircle · Bible</Text>
      <Text style={[styles.title, { color: palette.ink }]}>This page hit a snag</Text>
      <Text style={[styles.body, { color: palette.inkSoft }]}>
        The Bible page couldn&rsquo;t draw itself. Your notes, marks and reading record are saved —
        nothing here is lost. Go back and come in again.
      </Text>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={[styles.backBtn, { borderColor: palette.rasp }]}
      >
        <Text style={[styles.backText, { color: palette.raspDeep }]}>Go back</Text>
      </Pressable>
      {details ? (
        <Text style={[styles.details, { color: palette.inkFaint }]}>Details: {details}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  kicker: { fontSize: 10.5, letterSpacing: 2.4, textTransform: 'uppercase', fontWeight: '800', textAlign: 'center' },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginTop: 10, textAlign: 'center' },
  body: { fontSize: 13.5, lineHeight: 21, textAlign: 'center', marginTop: 12 },
  backBtn: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 18, marginTop: 20 },
  backText: { fontSize: 13, fontWeight: '800' },
  details: { fontSize: 10.5, lineHeight: 15, textAlign: 'center', marginTop: 18 },
});
