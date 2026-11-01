/**
 * v336 — the News page: "The Briefing, Boxed" (approved mockup
 * news-email-concepts-v3.html; Jonathan's build order Oct 29).
 * A News schedule event is a door — tapping its card lands here
 * with the event's id in the params, and the Finished bar at the
 * foot of the page is that event's check-off.
 *
 * The page reads his curated church-world feeds LIVE on open
 * (lib/news.ts), painting the last good fetch from cache first;
 * the briefing is five items across Church News · Church
 * Leadership · Prayer & Fasting · For Ministers, one open at a
 * time in the seed-derived container box.
 *
 * v407 — a prepared snapshot outranks the live engine: when the
 * morning pack's newsBriefing section has landed in the
 * snapshot store (lib/news-briefing.ts), the page renders IT —
 * Eva's picks as delivered, under a "Prepared …" line — and
 * never fetches over it; pull-to-refresh steps aside while a
 * snapshot is active, so nothing on this page can silently
 * replace it. Replacement happens only by importing a newer
 * pack. With no snapshot stored, the live behaviour above is
 * unchanged, word for word.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import {
  FinishedBar,
  KeywordPageHeader,
  numberWord,
} from "@/components/keyword-page-chrome";
import { NewsAccordionItem } from "@/components/news-accordion-item";
import { useNewsEmailMaterial } from "@/hooks/use-news-email-material";
import {
  accordionTap,
  fetchNewsItems,
  formatUpdatedLine,
  groupMoreByArea,
  loadNewsCache,
  saveNewsCache,
  selectBriefing,
  type NewsArea,
  type NewsItem,
} from "@/lib/news";
import {
  formatNewsPreparedLine,
  loadNewsBriefing,
  snapshotToBriefingItems,
  snapshotToMoreGroups,
  type NewsBriefingSnapshot,
} from "@/lib/news-briefing";
import { finishScheduleEvent } from "@/lib/finish-event";

const AREA_ICONS: Record<NewsArea, string> = {
  "Church News": "public",
  "Church Leadership": "groups",
  "Prayer & Fasting": "volunteer-activism",
  "For Ministers": "menu-book",
};

export default function NewsPage() {
  const m = useNewsEmailMaterial();
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string; eventDate?: string }>();
  const eventId = typeof params.eventId === "string" && params.eventId ? params.eventId : null;

  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [snapshot, setSnapshot] = useState<NewsBriefingSnapshot | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const startedRef = useRef(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = await fetchNewsItems();
      if (fresh.length > 0) {
        const at = Date.now();
        setItems(fresh);
        setFetchedAt(at);
        setNow(at);
        void saveNewsCache({ fetchedAt: at, items: fresh });
      }
    } catch {
      // Offline or a dead feed: whatever is on screen (cache or a
      // previous fetch) simply stays — the Updated line tells the
      // truth about its age.
    } finally {
      setRefreshing(false);
      setAttempted(true);
    }
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      // v407: the prepared snapshot is checked first — when one
      // is stored, the page renders it and the live engine never
      // runs at all (no cache paint, no fetch on open).
      const snap = await loadNewsBriefing();
      if (snap) {
        setSnapshot(snap);
        setAttempted(true);
        return;
      }
      const cache = await loadNewsCache();
      if (cache) {
        setItems(cache.items);
        setFetchedAt(cache.fetchedAt);
      }
      void refresh();
    })();
  }, [refresh]);

  const liveBriefing = useMemo(() => (items ? selectBriefing(items) : []), [items]);
  const liveMore = useMemo(
    () => (items ? groupMoreByArea(items, liveBriefing) : []),
    [items, liveBriefing]
  );
  const snapshotItems = useMemo(
    () => (snapshot ? snapshotToBriefingItems(snapshot) : null),
    [snapshot]
  );
  const snapshotMore = useMemo(
    () => (snapshot ? snapshotToMoreGroups(snapshot) : null),
    [snapshot]
  );
  const briefing = snapshotItems ?? liveBriefing;
  const more = snapshotMore ?? liveMore;
  const ready = snapshot !== null || items !== null;

  // The briefing opens with its first story open (his accordion
  // ruling: exactly one item is open).
  useEffect(() => {
    if (openKey === null && briefing.length > 0) setOpenKey(briefing[0].link);
  }, [briefing, openKey]);

  const onFinished = useCallback(async () => {
    if (eventId) await finishScheduleEvent(eventId);
    router.back();
  }, [eventId, router]);

  const today = new Date();
  const dateLong = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const dateChip = today.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <ScreenContainer className="p-0">
      <View style={{ flex: 1, backgroundColor: m.ground }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: eventId ? 112 : 40,
          }}
          refreshControl={
            // v407: no pull-to-refresh while a snapshot is active —
            // a live fetch must never silently replace what Eva
            // prepared; a newer pack is the only replacement.
            snapshot ? undefined : <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
        >
          <KeywordPageHeader m={m} title="News" dateChip={dateChip} onBack={() => router.back()} />
          <Text style={[styles.dated, { color: m.deep }]}>{dateLong}</Text>
          <Text style={[styles.h1, { color: m.ink }]}>The Briefing</Text>
          <Text style={[styles.standfirst, { color: m.inkSoft }]}>
            {briefing.length > 0
              ? `${numberWord(briefing.length)} ${briefing.length === 1 ? "thing" : "things"} worth knowing before the day gets loud.`
              : "The morning's five, from across the church world."}
          </Text>
          {snapshot ? (
            <Text style={[styles.updated, { color: m.inkSoft }]}>
              {formatNewsPreparedLine(snapshot.preparedAt)}
            </Text>
          ) : fetchedAt ? (
            <Text style={[styles.updated, { color: m.inkSoft }]}>{formatUpdatedLine(fetchedAt)}</Text>
          ) : null}

          {!ready ? (
            <Text style={[styles.quiet, { color: m.inkSoft }]}>Gathering the morning's briefing…</Text>
          ) : briefing.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: m.card }]}>
              <Text style={[styles.emptyTitle, { color: m.ink }]}>
                {attempted ? "The sources didn't answer" : "The briefing is empty right now"}
              </Text>
              <Text style={[styles.emptyLine, { color: m.inkSoft }]}>
                Pull down to try again — nothing here is made up when the feeds are quiet.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.briefingList}>
                {briefing.map((item, index) => (
                  <NewsAccordionItem
                    key={item.link}
                    m={m}
                    item={item}
                    chipLabel={String(index + 1)}
                    open={openKey === item.link}
                    onPress={() => setOpenKey((current) => accordionTap(current, item.link))}
                    now={now}
                  />
                ))}
              </View>

              {more.length > 0 ? (
                <>
                  <Text style={[styles.moreHead, { color: m.ink }]}>More from your sources</Text>
                  {more.map((group) => (
                    <View key={group.area} style={styles.areaGroup}>
                      <View style={styles.areaHead}>
                        <View style={[styles.areaIconSeat, { backgroundColor: m.tonal }]}>
                          <MaterialIcons
                            name={AREA_ICONS[group.area] as any}
                            size={14}
                            color={m.tonalInk}
                          />
                        </View>
                        <Text style={[styles.areaLabel, { color: m.ink }]}>{group.area}</Text>
                      </View>
                      <View style={styles.briefingList}>
                        {group.items.map((item) => (
                          <NewsAccordionItem
                            key={item.link}
                            m={m}
                            item={item}
                            open={openKey === item.link}
                            onPress={() =>
                              setOpenKey((current) => accordionTap(current, item.link))
                            }
                            now={now}
                          />
                        ))}
                      </View>
                    </View>
                  ))}
                </>
              ) : null}
            </>
          )}
        </ScrollView>
        {/* v342: no top fade — door page with a definite
            header (fade scope ruling, Oct 29). */}
      </View>
      {eventId ? <FinishedBar m={m} onFinished={onFinished} /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  dated: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginTop: 18,
  },
  h1: { fontSize: 27, fontWeight: "800", marginTop: 4 },
  standfirst: { fontSize: 13.5, lineHeight: 19, marginTop: 5 },
  updated: { fontSize: 11.5, fontWeight: "600", marginTop: 6 },
  quiet: { fontSize: 13.5, marginTop: 28 },
  emptyBox: { borderRadius: 20, padding: 18, marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyLine: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  briefingList: { gap: 10, marginTop: 16 },
  moreHead: { fontSize: 17, fontWeight: "800", marginTop: 26 },
  areaGroup: { marginTop: 14 },
  areaHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  areaIconSeat: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  areaLabel: { fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },
});
