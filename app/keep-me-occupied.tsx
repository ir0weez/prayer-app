/**
 * v395 "Keep Me Occupied" — the deal flow (Jonathan's idea, Oct 31;
 * final mockup keep-me-occupied-concept-v3.html). One tap deals one
 * random mind-occupying thing — a mini-game, the Word Dig, or a
 * random chapter — with no menu and no choosing. Everything that
 * leads here and leads out is Material Expressive, seed-derived
 * (hooks/use-keep-me-occupied-material.ts); the games' own insides
 * may be playful (his explicit carve-out).
 *
 * The flow is plain-mounted: no slide-up sheets, no springs. The
 * NO-LEDGER LAW holds over the whole screen: every value here is
 * React state, in-session only — no storage key is read for this
 * feature's own sake and none is ever written. (The study store is
 * read once, read-only, to weight the chapter and dig deals toward
 * the books he's in — the reader's own data, never KMO's.)
 */
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { BackbeatGame } from "@/components/keep-me-occupied/backbeat";
import { ChapterDealCard } from "@/components/keep-me-occupied/chapter-deal";
import { EchoLightsGame } from "@/components/keep-me-occupied/echo-lights";
import { SortItOutGame } from "@/components/keep-me-occupied/sort-it-out";
import { StackGame } from "@/components/keep-me-occupied/stack-game";
import { TendGame } from "@/components/keep-me-occupied/tend-game";
import { WaveCheck } from "@/components/keep-me-occupied/wave-check";
import { WordDigGame } from "@/components/keep-me-occupied/word-dig";
import { useKeepMeOccupiedMaterial } from "@/hooks/use-keep-me-occupied-material";
import {
  dealChapter,
  dealItem,
  digChapterCandidates,
  pickDigTarget,
  sessionLine,
  startSession,
  type ChapterDeal,
  type DigTarget,
  type KmoPoolItem,
  type KmoSession,
  type WaveDoorId,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { loadStudyState, type StudyState } from "@/lib/bible-v205/study";
import { embeddedVerses, loadChapterVerses } from "@/lib/bible-v205/verses";

interface LiveDeal {
  item: KmoPoolItem;
  nonce: number;
  chapter: ChapterDeal | null;
  firstLines: string | null;
  dig: DigTarget | null;
  digLoading: boolean;
}

export default function KeepMeOccupiedScreen() {
  const router = useRouter();
  const m = useKeepMeOccupiedMaterial();
  const [phase, setPhase] = useState<"dealt" | "wave">("dealt");
  const [deal, setDeal] = useState<LiveDeal | null>(null);
  const [entryRating, setEntryRating] = useState<number | null>(null);
  const studyRef = useRef<StudyState | null>(null);
  const sessionRef = useRef<KmoSession | null>(null);
  const nonceRef = useRef(0);

  const resolveDig = useCallback(async (nonce: number) => {
    const candidates = digChapterCandidates(studyRef.current, Math.random);
    // First pass: verses embedded in his own books — instant, offline.
    for (const spot of candidates.slice(0, 60)) {
      const verses = embeddedVerses(spot.book, spot.chapter);
      if (!verses) continue;
      const target = pickDigTarget(spot.book, spot.chapter, verses, Math.random);
      if (target) {
        setDeal((current) => (current && current.nonce === nonce ? { ...current, dig: target, digLoading: false } : current));
        return;
      }
    }
    // Second pass: the reader's own verse path (cache / API.Bible).
    for (const spot of candidates.slice(0, 10)) {
      try {
        const verses = await loadChapterVerses(spot.book, spot.chapter);
        const target = pickDigTarget(spot.book, spot.chapter, verses, Math.random);
        if (target) {
          setDeal((current) => (current && current.nonce === nonce ? { ...current, dig: target, digLoading: false } : current));
          return;
        }
      } catch {
        // A verse source declined; the next candidate gets its turn.
      }
    }
    // No diggable verse anywhere: deal a game instead — never a dead end.
    setDeal((current) => {
      if (!current || current.nonce !== nonce) return current;
      const fallback = dealItem(Math.random, "word-dig");
      sessionRef.current = startSession(fallback.id, fallback.title, Date.now());
      return { item: fallback, nonce, chapter: null, firstLines: null, dig: null, digLoading: false };
    });
  }, []);

  const applyDeal = useCallback(
    (item: KmoPoolItem) => {
      const nonce = ++nonceRef.current;
      const now = Date.now();
      if (item.id === "chapter") {
        const chapter = dealChapter(studyRef.current, Math.random);
        const label = `${chapter.book} ${chapter.chapter}`;
        sessionRef.current = startSession(item.id, label, now);
        setDeal({ item, nonce, chapter, firstLines: null, dig: null, digLoading: false });
        const verses = embeddedVerses(chapter.book, chapter.chapter);
        if (verses) {
          setDeal((current) =>
            current && current.nonce === nonce
              ? { ...current, firstLines: verses.slice(0, 2).map((v) => v.text).join(" ") }
              : current,
          );
        } else {
          loadChapterVerses(chapter.book, chapter.chapter)
            .then((loaded) => {
              setDeal((current) =>
                current && current.nonce === nonce
                  ? { ...current, firstLines: loaded.slice(0, 2).map((v) => v.text).join(" ") }
                  : current,
              );
            })
            .catch(() => {
              // First lines are a courtesy; the Open action still works.
            });
        }
      } else if (item.id === "word-dig") {
        sessionRef.current = startSession(item.id, item.title, now);
        setDeal({ item, nonce, chapter: null, firstLines: null, dig: null, digLoading: true });
        void resolveDig(nonce);
      } else {
        sessionRef.current = startSession(item.id, item.title, now);
        setDeal({ item, nonce, chapter: null, firstLines: null, dig: null, digLoading: false });
      }
      setPhase("dealt");
    },
    [resolveDig],
  );

  // Open: read the study store once (read-only weighting), then deal.
  useEffect(() => {
    let live = true;
    loadStudyState()
      .then((state) => {
        studyRef.current = state;
      })
      .catch(() => {
        studyRef.current = null;
      })
      .finally(() => {
        if (live) applyDeal(dealItem(Math.random));
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dealAgain = useCallback(() => {
    if (!deal) return;
    applyDeal(dealItem(Math.random, deal.item.id));
  }, [applyDeal, deal]);

  const onNextDig = useCallback(() => {
    if (!deal) return;
    const nonce = ++nonceRef.current;
    sessionRef.current = startSession("word-dig", "Word Dig", Date.now());
    setDeal({ ...deal, nonce, dig: null, digLoading: true });
    void resolveDig(nonce);
  }, [deal, resolveDig]);

  const onWaveDoor = useCallback(
    (door: WaveDoorId) => {
      if (door === "another") {
        dealAgain();
      } else if (door === "pray") {
        router.navigate("/(tabs)");
      } else {
        router.back();
      }
    },
    [dealAgain, router],
  );

  const rateEntry = (n: number) => {
    if (entryRating != null) return;
    setEntryRating(n);
    if (sessionRef.current) sessionRef.current = { ...sessionRef.current, entryRating: n };
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        style={{ backgroundColor: m.ground }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => (phase === "wave" ? setPhase("dealt") : router.back())}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={[styles.backButton, { backgroundColor: m.tonal }]}
          >
            <MaterialIcons name="chevron-left" size={22} color={m.tonalInk} />
          </Pressable>
          <Text style={[styles.title, { color: m.ink }]}>Keep Me Occupied</Text>
        </View>

        {phase === "wave" && sessionRef.current ? (
          <WaveCheck
            m={m}
            sessionLineText={sessionLine(sessionRef.current, Date.now())}
            entryRating={entryRating}
            onDoor={onWaveDoor}
          />
        ) : deal ? (
          <>
            <View style={styles.chipRow}>
              <View
                style={[
                  styles.dealtChip,
                  deal.item.kind === "chapter"
                    ? { backgroundColor: m.tonal, borderColor: m.line }
                    : { backgroundColor: m.redWash, borderColor: m.redWashDeep },
                ]}
              >
                <Text
                  style={[
                    styles.dealtChipText,
                    { color: deal.item.kind === "chapter" ? m.deep : m.redInk },
                  ]}
                >
                  {deal.item.chip}
                </Text>
              </View>
            </View>

            {deal.item.kind !== "chapter" ? (
              <>
                <Text style={[styles.gameTitle, { color: m.ink }]}>{deal.item.title}</Text>
                <Text style={[styles.gameSub, { color: m.inkSoft }]}>{gameSub(deal.item.id)}</Text>
              </>
            ) : null}

            {renderDealContent(deal, m, router, onNextDig)}

            <RatingRow m={m} entryRating={entryRating} onRate={rateEntry} />

            <View style={styles.actions}>
              <Pressable
                onPress={dealAgain}
                accessibilityRole="button"
                accessibilityLabel="Something else — deal again"
                style={({ pressed }) => [styles.actionMain, { backgroundColor: m.seed }, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.actionMainText}>⤨ Something else — deal again</Text>
              </Pressable>
              <Pressable
                onPress={() => setPhase("wave")}
                accessibilityRole="button"
                accessibilityLabel="I'm good — check the wave"
                style={({ pressed }) => [
                  styles.actionQuiet,
                  { backgroundColor: m.card, borderColor: m.line },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.actionQuietText, { color: m.inkSoft }]}>I&apos;m good — check the wave</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={[styles.dealing, { color: m.inkSoft }]}>Dealing…</Text>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function gameSub(id: KmoPoolItem["id"]): string {
  switch (id) {
    case "echo-lights":
      return "Watch the pattern, play it back. It only ever grows.";
    case "sort-it-out":
      return "One at a time — tap the bin it belongs in.";
    case "stack":
      return "Tap to drop the block. The tower keeps rising.";
    case "backbeat":
      return "The beat lights up; tap it back as the sweep passes.";
    case "tend":
      return "A small garden that always needs two minutes of hands.";
    case "word-dig":
      return "A word buried in a verse. Six digs, and the verse is the hint.";
    default:
      return "";
  }
}

function renderDealContent(
  deal: LiveDeal,
  m: KeepMeOccupiedMaterialFamily,
  router: ReturnType<typeof useRouter>,
  onNextDig: () => void,
) {
  switch (deal.item.id) {
    case "echo-lights":
      return <EchoLightsGame m={m} />;
    case "sort-it-out":
      return <SortItOutGame m={m} />;
    case "stack":
      return <StackGame m={m} />;
    case "backbeat":
      return <BackbeatGame m={m} />;
    case "tend":
      return <TendGame m={m} />;
    case "word-dig":
      return (
        <WordDigGame
          key={deal.nonce}
          m={m}
          target={deal.dig}
          loading={deal.digLoading}
          onNextDig={onNextDig}
        />
      );
    case "chapter":
      return deal.chapter ? (
        <ChapterDealCard
          m={m}
          deal={deal.chapter}
          firstLines={deal.firstLines}
          onOpen={() =>
            router.push({
              pathname: "/bible-chapter",
              params: { book: deal.chapter!.book, chapter: String(deal.chapter!.chapter) },
            })
          }
        />
      ) : null;
    default:
      return null;
  }
}

/**
 * The optional entry rating: one quiet row on the dealt screen.
 * Never blocking, never required — skipping it is invisible, and
 * the first tap is the only one that counts (it is the "when you
 * came in" number the wave check reads back).
 */
function RatingRow({
  m,
  entryRating,
  onRate,
}: {
  m: KeepMeOccupiedMaterialFamily;
  entryRating: number | null;
  onRate: (n: number) => void;
}) {
  if (entryRating != null) {
    return (
      <Text style={[styles.ratedNote, { color: m.inkSoft }]}>
        Rated {entryRating} on the way in — the wave check will hold it against where you land.
      </Text>
    );
  }
  return (
    <View style={styles.ratingRow}>
      <Text style={[styles.ratingLabel, { color: m.inkSoft }]}>How strong is it right now?</Text>
      <View style={styles.ratingChips}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <Pressable
            key={n}
            onPress={() => onRate(n)}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${n} out of 10`}
            style={[styles.ratingChip, { backgroundColor: m.tonal, borderColor: m.line }]}
          >
            <Text style={[styles.ratingChipText, { color: m.tonalInk }]}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 34 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  backButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "900" },
  chipRow: { marginTop: 16, flexDirection: "row" },
  dealtChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dealtChipText: { fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  gameTitle: { fontSize: 22, fontWeight: "900", marginTop: 9 },
  gameSub: { fontSize: 12.5, marginTop: 2, lineHeight: 18 },
  dealing: { marginTop: 40, fontSize: 14, textAlign: "center" },
  ratingRow: { marginTop: 20 },
  ratingLabel: { fontSize: 12.5, fontWeight: "700" },
  ratingChips: { flexDirection: "row", gap: 5, marginTop: 8, flexWrap: "wrap" },
  ratingChip: { width: 30, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  ratingChipText: { fontSize: 13.5, fontWeight: "800" },
  ratedNote: { fontSize: 12, marginTop: 20, lineHeight: 17 },
  actions: { marginTop: 16, gap: 9 },
  actionMain: { borderRadius: 999, paddingVertical: 13, alignItems: "center" },
  actionMainText: { color: "#FFFFFF", fontSize: 14.5, fontWeight: "800" },
  actionQuiet: { borderRadius: 999, paddingVertical: 13, alignItems: "center", borderWidth: 1.5 },
  actionQuietText: { fontSize: 14.5, fontWeight: "800" },
});
