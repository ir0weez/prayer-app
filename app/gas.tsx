/**
 * v379 — the Gas page (Jonathan's door idea Oct 29; Concept 1
 * "Cheapest First" — "Love concept 1"; build ordered Oct 30).
 * A Gas schedule event is a door, like News, Email and Food:
 * tapping its day card lands here with the event's id in the
 * params, and the Finished bar at the foot of the page is that
 * event's check-off.
 *
 * The page is fed by the gas snapshot store
 * (prayercircle.gas-prices.v1, lib/gas-prices.ts) — there is no
 * live per-station feed an app can call, so Eva prepares the
 * snapshot outside the app and it arrives through the Studio
 * pack / Drive folder doors. The page states plainly when the
 * snapshot was prepared and never calls it live. The refresh
 * button re-reads the store — on tap, and again whenever the
 * page comes back into focus — so what it shows is always the
 * freshest snapshot Eva has delivered, nothing fresher.
 *
 * Concept 1's anatomy: the cheapest station WITH a price wears
 * the tonal hero (price big, reported-time + distance quiet, a
 * Members tag where it applies); the rest sort by price as
 * clean rows, unpriced last. An old price reads old: the older
 * the report, the quieter it renders. A station with no price
 * says "No price listed" — the page never invents one, and with
 * no snapshot at all it shows an honest empty state, no
 * stations.
 */
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { FinishedBar, KeywordPageHeader } from "@/components/keyword-page-chrome";
import { useNewsEmailMaterial } from "@/hooks/use-news-email-material";
import { finishScheduleEvent } from "@/lib/finish-event";
import { loadScheduleEventById } from "@/lib/food";
import {
  cheapestPricedStation,
  formatDistance,
  formatGasPreparedLine,
  formatGasPrice,
  formatReportedAge,
  loadGasSnapshot,
  sortStationsForDisplay,
  stationStaleness,
  type GasPriceSnapshot,
  type GasStation,
} from "@/lib/gas-prices";
import type { ScheduleEvent } from "@/lib/schedule-data";
import { format12HourTime } from "@/lib/utils";

export default function GasPage() {
  const m = useNewsEmailMaterial();
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string; eventDate?: string }>();
  const eventId = typeof params.eventId === "string" && params.eventId ? params.eventId : null;

  // undefined = still reading the stores; null = nothing there.
  const [event, setEvent] = useState<ScheduleEvent | null | undefined>(undefined);
  const [snapshot, setSnapshot] = useState<GasPriceSnapshot | null | undefined>(undefined);
  const [now, setNow] = useState(() => new Date());

  // The refresh: re-read the store, nothing more — the freshest
  // snapshot Eva has delivered is the freshest thing this page
  // can show. Runs on open, on every return to the page, and on
  // the refresh button's tap.
  const refresh = useCallback(() => {
    let live = true;
    Promise.all([
      eventId ? loadScheduleEventById(eventId) : Promise.resolve(null),
      loadGasSnapshot(),
    ]).then(([loadedEvent, loadedSnapshot]) => {
      if (!live) return;
      setEvent(loadedEvent);
      setSnapshot(loadedSnapshot);
      setNow(new Date());
    });
    return () => {
      live = false;
    };
  }, [eventId]);

  useFocusEffect(refresh);

  const onFinished = useCallback(async () => {
    if (eventId) await finishScheduleEvent(eventId);
    router.back();
  }, [eventId, router]);

  const today = new Date();
  const chipDate = event ? new Date(`${event.date}T12:00:00`) : today;
  const dateChip = chipDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const whenLine = event
    ? `for ${chipDate.toLocaleDateString("en-US", { weekday: "long" })}${event.startTime ? ` ${format12HourTime(event.startTime)}` : ""}`
    : "";

  const hero: GasStation | null = snapshot ? cheapestPricedStation(snapshot.stations) : null;
  const rows: GasStation[] = snapshot
    ? sortStationsForDisplay(snapshot.stations).filter((s) => s !== hero)
    : [];

  const membersTag = (onOpen: boolean) => (
    <View
      style={[
        styles.tag,
        { backgroundColor: onOpen ? m.chipOnOpen : m.chipOnCard },
      ]}
    >
      <Text style={[styles.tagText, { color: onOpen ? m.chipOnOpenInk : m.chipOnCardInk }]}>
        Members
      </Text>
    </View>
  );

  const ageLine = (station: GasStation): string => {
    const parts: string[] = [];
    const age = formatReportedAge(station.reportedAt, now);
    if (age) parts.push(age.charAt(0).toUpperCase() + age.slice(1));
    return parts.join(" · ");
  };

  return (
    <ScreenContainer className="p-0">
      <View style={{ flex: 1, backgroundColor: m.ground }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: eventId ? 112 : 40,
          }}
        >
          <KeywordPageHeader
            m={m}
            title={event?.title ?? "Gas"}
            dateChip={dateChip}
            onBack={() => router.back()}
          />
          {whenLine ? (
            <Text style={[styles.when, { color: m.inkSoft }]}>{whenLine}</Text>
          ) : null}

          <View style={styles.gradeRow}>
            <Text style={[styles.grade, { color: m.inkSoft }]}>
              Regular{snapshot?.areaLabel ? ` · ${snapshot.areaLabel}` : ""}
            </Text>
            <Pressable
              onPress={refresh}
              accessibilityRole="button"
              accessibilityLabel="Refresh prices"
              style={[styles.refreshBtn, { backgroundColor: m.tonal }]}
            >
              <MaterialIcons name="refresh" size={17} color={m.tonalInk} />
            </Pressable>
          </View>

          {snapshot === undefined ? (
            <Text style={[styles.quiet, { color: m.inkSoft }]}>Checking the pumps…</Text>
          ) : snapshot === null ? (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptySeat, { backgroundColor: m.tonal }]}>
                <MaterialIcons name="local-gas-station" size={30} color={m.tonalInk} />
              </View>
              <Text style={[styles.emptyTitle, { color: m.ink }]}>No gas prices yet</Text>
              <Text style={[styles.emptyLine, { color: m.inkSoft }]}>
                Eva prepares these with the morning digest — when a snapshot is ready, it
                will be waiting here.
              </Text>
            </View>
          ) : (
            <>
              {hero ? (
                <View style={[styles.hero, { backgroundColor: m.openBox }]}>
                  <Text style={[styles.heroLab, { color: m.openInkSoft }]}>
                    Cheapest nearby
                  </Text>
                  <View style={styles.heroNameRow}>
                    <Text style={[styles.heroStation, { color: m.openInk }]}>
                      {hero.name}
                    </Text>
                    {hero.membersOnly ? membersTag(true) : null}
                  </View>
                  <Text style={[styles.heroBig, { color: m.openInk }]}>
                    {formatGasPrice(hero.priceRegular)}{" "}
                    <Text style={[styles.heroPer, { color: m.openInkSoft }]}>/ gal</Text>
                  </Text>
                  <Text style={[styles.heroSub, { color: m.openInkSoft }]}>
                    {[
                      ageLine(hero),
                      formatDistance(hero.distanceMiles)
                        ? `${formatDistance(hero.distanceMiles)} away`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
              ) : null}

              {rows.length > 0 ? (
                <View style={[styles.card, { backgroundColor: m.card }]}>
                  {rows.map((station, index) => {
                    const staleness = stationStaleness(station.reportedAt, now);
                    const fade =
                      staleness === "stale" ? 0.55 : staleness === "aging" ? 0.8 : 1;
                    const meta = [station.note ?? "", formatReportedAge(station.reportedAt, now)]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <View
                        key={`${station.name}-${index}`}
                        style={[
                          styles.row,
                          index > 0 && { borderTopWidth: 1, borderTopColor: m.line },
                        ]}
                      >
                        <View style={styles.rowWhat}>
                          <View style={styles.rowNameRow}>
                            <Text style={[styles.rowName, { color: m.ink }]}>
                              {station.name}
                            </Text>
                            {station.membersOnly ? membersTag(false) : null}
                          </View>
                          {meta ? (
                            <Text
                              style={[
                                styles.rowMeta,
                                { color: m.inkSoft, opacity: fade },
                              ]}
                            >
                              {meta}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.priceBox}>
                          {station.priceRegular !== null ? (
                            <Text
                              style={[
                                styles.rowPrice,
                                { color: m.deep, opacity: fade },
                              ]}
                            >
                              {formatGasPrice(station.priceRegular)}
                            </Text>
                          ) : (
                            <Text style={[styles.noPrice, { color: m.inkSoft }]}>
                              No price listed
                            </Text>
                          )}
                          {station.distanceMiles !== null ? (
                            <Text style={[styles.rowDist, { color: m.inkSoft }]}>
                              {formatDistance(station.distanceMiles)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <Text style={[styles.prepared, { color: m.inkSoft }]}>
                {formatGasPreparedLine(snapshot.preparedAt, now)}
              </Text>
            </>
          )}
        </ScrollView>
      </View>
      {eventId ? <FinishedBar m={m} onFinished={onFinished} /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  when: { fontSize: 13.5, fontWeight: "600", marginTop: 14 },
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  grade: { flex: 1, fontSize: 13.5, fontWeight: "600" },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quiet: { fontSize: 13.5, marginTop: 28 },
  emptyWrap: { alignItems: "center", marginTop: 44, paddingHorizontal: 24 },
  emptySeat: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", marginTop: 16 },
  emptyLine: { fontSize: 13.5, lineHeight: 20, textAlign: "center", marginTop: 6 },
  hero: { borderRadius: 24, marginTop: 14, paddingHorizontal: 20, paddingVertical: 18 },
  heroLab: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  heroNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  heroStation: { fontSize: 21, fontWeight: "800", letterSpacing: -0.2 },
  heroBig: { fontSize: 44, fontWeight: "800", letterSpacing: -0.5, marginTop: 2 },
  heroPer: { fontSize: 16, fontWeight: "700" },
  heroSub: { fontSize: 12.5, fontWeight: "600", marginTop: 6 },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  card: { borderRadius: 24, marginTop: 14, paddingHorizontal: 16, paddingVertical: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  rowWhat: { flex: 1, minWidth: 0 },
  rowNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  rowName: { fontSize: 15.5, fontWeight: "700" },
  rowMeta: { fontSize: 12.5, fontWeight: "600", marginTop: 2 },
  priceBox: { alignItems: "flex-end" },
  rowPrice: { fontSize: 17, fontWeight: "800" },
  noPrice: { fontSize: 13.5, fontWeight: "600" },
  rowDist: { fontSize: 11, fontWeight: "600", marginTop: 1 },
  prepared: { fontSize: 12, fontWeight: "600", marginTop: 16, paddingHorizontal: 4 },
});
