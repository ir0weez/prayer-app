/**
 * v490 — the Weather page (Jonathan's ask, Nov 10: a "Weather" —
 * or "Temperature" — keyword event that opens "a weather page
 * that gives me a detailed look at all days weather"). A Weather
 * schedule event is a door, like News, Email, Food, Gas and the
 * Daily Brief: tapping its day card lands here.
 *
 * The page is fed by the weather store alone
 * (prayercircle.weather.v1, lib/weather-snapshot.ts) — the
 * morning pack's snapshot, which Eva prepares outside the app
 * from Google Weather and which arrives through the Studio
 * pack / Drive folder doors. There is no live feed; the foot
 * stamp names the pack and the hour it was prepared, honestly,
 * and the page never invents a value the pack did not carry:
 * a field the pack omitted is a row that is not there.
 *
 * The design is Concept 1 AS FIRST DRAWN (weather-keyword-
 * concepts-v1.html — he picked it, then rejected a tile-grid
 * variant and a tonal Material redress of it): the saturated
 * blue hero now-card with its big glyph, the white hour chips,
 * every day its own white card with its range bar. His one
 * addition — "not enough information" — folds into the same
 * language: a details card under the hero (rows only for the
 * fields the pack carries), a tomorrow rail under today's, and
 * the days running as many as the pack brings. All decisions
 * about content live in lib/weather-page.ts; this file draws.
 */
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Svg, { Circle, G, Line, Path } from "react-native-svg";

import { ScreenContainer } from "@/components/screen-container";
import { loadWeatherSnapshot, type WeatherSnapshot } from "@/lib/weather-snapshot";
import {
  addDaysIso,
  localDateIso,
  resolveWeatherHero,
  weatherDayLabels,
  weatherDaysExtent,
  weatherDaysInOrder,
  weatherDetailRows,
  weatherGlyphKind,
  weatherHourRail,
  weatherPreparedStamp,
  weatherRangeSpan,
  type WeatherGlyphKind,
} from "@/lib/weather-page";

/* Concept 1's own palette — the drawing's, not a redress. */
const INK = "#182642";
const SUB = "#5A6B8C";
const GROUND = "#F6F8FC";
const HERO_BLUE = "#1E6FEB";
const NOW_CHIP = "#0F2E6B";
const TRACK = "#D9E2F2";
const SUN_GOLD = "#F5A623";
const SUN_HERO = "#FFD34D";
const CLOUD_FILL = "#B9C8DE";

/** The condition glyph, drawn — the mockup's own SVG shapes
 * (sun with rays, the cloud path, the partly sun-behind-cloud),
 * extended to the widget's remaining kinds in the same hand.
 * `onHero` swaps the sun to the hero's lighter gold. */
function WeatherGlyph({
  kind,
  size,
  onHero = false,
}: {
  kind: WeatherGlyphKind;
  size: number;
  onHero?: boolean;
}) {
  const sun = onHero ? SUN_HERO : SUN_GOLD;
  const rays = (color: string) => (
    <G stroke={color} strokeWidth={2} strokeLinecap="round">
      <Line x1={12} y1={2} x2={12} y2={5} />
      <Line x1={12} y1={19} x2={12} y2={22} />
      <Line x1={2} y1={12} x2={5} y2={12} />
      <Line x1={19} y1={12} x2={22} y2={12} />
      <Line x1={4.5} y1={4.5} x2={6.6} y2={6.6} />
      <Line x1={17.4} y1={17.4} x2={19.5} y2={19.5} />
      <Line x1={4.5} y1={19.5} x2={6.6} y2={17.4} />
      <Line x1={17.4} y1={6.6} x2={19.5} y2={4.5} />
    </G>
  );
  const cloudPath =
    "M6.5 19h10a4 4 0 0 0 .8-7.9A6 6 0 0 0 5.7 12 3.6 3.6 0 0 0 6.5 19z";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {kind === "sun" ? (
        <>
          <Circle cx={12} cy={12} r={5} fill={sun} />
          {rays(sun)}
        </>
      ) : kind === "partly" ? (
        <>
          <Circle cx={8} cy={8} r={3.4} fill={sun} />
          <Path
            d="M7 20h9.5a3.8 3.8 0 0 0 .6-7.5A5.5 5.5 0 0 0 6.4 14 3.2 3.2 0 0 0 7 20z"
            fill={CLOUD_FILL}
          />
        </>
      ) : kind === "cloud" ? (
        <Path d={cloudPath} fill={CLOUD_FILL} />
      ) : kind === "rain" ? (
        <>
          <Path d={cloudPath} fill={CLOUD_FILL} transform="translate(0 -1.5)" />
          <G stroke={HERO_BLUE} strokeWidth={1.8} strokeLinecap="round">
            <Line x1={8.5} y1={20} x2={7.8} y2={22.6} />
            <Line x1={12.5} y1={20} x2={11.8} y2={22.6} />
            <Line x1={16.5} y1={20} x2={15.8} y2={22.6} />
          </G>
        </>
      ) : kind === "snow" ? (
        <>
          <Path d={cloudPath} fill={CLOUD_FILL} transform="translate(0 -1.5)" />
          <G fill={HERO_BLUE}>
            <Circle cx={8.5} cy={21.4} r={1.1} />
            <Circle cx={12.5} cy={21.4} r={1.1} />
            <Circle cx={16.5} cy={21.4} r={1.1} />
          </G>
        </>
      ) : kind === "storm" ? (
        <>
          <Path d={cloudPath} fill={CLOUD_FILL} transform="translate(0 -1.5)" />
          <Path d="M12.6 18.6 L9.9 22.8 h1.9 L10.7 26" fill={SUN_GOLD} transform="scale(0.92) translate(1 -2.2)" />
        </>
      ) : (
        /* fog: the cloud dissolved into its drift lines */
        <G stroke={CLOUD_FILL} strokeWidth={2.2} strokeLinecap="round">
          <Line x1={6} y1={8} x2={18} y2={8} />
          <Line x1={4.5} y1={12.5} x2={19.5} y2={12.5} />
          <Line x1={6.5} y1={17} x2={17.5} y2={17} />
        </G>
      )}
    </Svg>
  );
}

export default function WeatherPage() {
  const router = useRouter();

  // undefined = still reading the store; null = nothing there.
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null | undefined>(undefined);
  const [now, setNow] = useState(() => new Date());

  // Re-read the store on open and on every return to the page —
  // the freshest snapshot Eva has delivered is the freshest
  // thing this page can show (the Gas page's own pattern).
  const refresh = useCallback(() => {
    let live = true;
    loadWeatherSnapshot().then((loaded) => {
      if (!live) return;
      setSnapshot(loaded);
      setNow(new Date());
    });
    return () => {
      live = false;
    };
  }, []);

  useFocusEffect(refresh);

  const todayIso = localDateIso(now);
  const tomorrowIso = addDaysIso(todayIso, 1);
  const hero = resolveWeatherHero(snapshot ?? null, {
    date: todayIso,
    hour: now.getHours(),
    minute: now.getMinutes(),
  });
  const detailRows =
    snapshot && snapshot.details && snapshot.details.date === todayIso
      ? weatherDetailRows(snapshot.details)
      : [];
  const todayRail = weatherHourRail(snapshot ?? null, todayIso);
  const tomorrowRail = weatherHourRail(snapshot ?? null, tomorrowIso);
  const days = weatherDaysInOrder(snapshot ?? null);
  const extent = weatherDaysExtent(days);
  const stamp = snapshot ? weatherPreparedStamp(snapshot.preparedAt, now) : "";

  const hourRail = (
    title: string,
    chips: ReturnType<typeof weatherHourRail>,
    isToday: boolean,
  ) =>
    chips.length > 0 ? (
      <>
        <Text style={styles.sect}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.railRow}>
            {chips.map((chip) => {
              const isNow = isToday && chip.hour === now.getHours();
              return (
                <View
                  key={chip.at}
                  style={[styles.hour, isNow ? styles.hourNow : styles.hourPlain]}
                >
                  <Text style={[styles.hourTime, isNow && styles.hourTimeNow]}>
                    {isNow ? "Now" : chip.label}
                  </Text>
                  <View style={styles.hourGlyph}>
                    <WeatherGlyph kind={chip.kind} size={22} onHero={isNow} />
                  </View>
                  <Text style={[styles.hourTemp, isNow && styles.hourTempNow]}>
                    {Math.round(chip.tempF)}°
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </>
    ) : null;

  return (
    <ScreenContainer className="p-0">
      <View style={{ flex: 1, backgroundColor: GROUND }}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* The drawing's topbar: a round back seat, the name,
              the place under it. */}
          <View style={styles.topbar}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={styles.back}
            >
              <MaterialIcons name="arrow-back" size={19} color={INK} />
            </Pressable>
            <View>
              <Text style={styles.title}>Weather</Text>
              <Text style={styles.subtitle}>{snapshot?.location ?? "Lancaster"}</Text>
            </View>
          </View>

          {snapshot === undefined ? (
            <Text style={styles.quiet}>Checking the weather…</Text>
          ) : snapshot === null ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No weather yet</Text>
              <Text style={styles.emptyLine}>
                The weather arrives with the morning pack — once a pack is imported,
                this page fills in with the days Eva prepared.
              </Text>
            </View>
          ) : (
            <>
              {hero ? (
                <View style={styles.hero}>
                  <View>
                    {hero.form === "current" ? (
                      <>
                        <Text style={styles.heroBig}>{Math.round(hero.tempF)}°</Text>
                        <Text style={styles.heroCond}>{hero.condition}</Text>
                        {hero.day ? (
                          <Text style={styles.heroHl}>
                            High {Math.round(hero.day.highF)}° · Low {Math.round(hero.day.lowF)}°
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <Text style={styles.heroBig}>{Math.round(hero.day.highF)}°</Text>
                        <Text style={styles.heroCond}>{hero.day.condition}</Text>
                        <Text style={styles.heroHl}>
                          High {Math.round(hero.day.highF)}° · Low {Math.round(hero.day.lowF)}°
                        </Text>
                      </>
                    )}
                  </View>
                  <WeatherGlyph
                    kind={weatherGlyphKind(
                      hero.form === "current" ? hero.condition : hero.day.condition,
                    )}
                    size={72}
                    onHero
                  />
                </View>
              ) : null}

              {detailRows.length > 0 ? (
                <>
                  <Text style={styles.sect}>DETAILS</Text>
                  <View style={styles.detailsCard}>
                    {detailRows.map((row, i) => (
                      <View
                        key={row.key}
                        style={[styles.detailRow, i > 0 && styles.detailDivide]}
                      >
                        <Text style={styles.detailLabel}>{row.label}</Text>
                        <Text style={styles.detailValue}>{row.value}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              {hourRail("TODAY BY THE HOUR", todayRail, true)}
              {hourRail("TOMORROW BY THE HOUR", tomorrowRail, false)}

              {days.length > 0 && extent ? (
                <>
                  <Text style={styles.sect}>THE DAYS</Text>
                  {days.map((day) => {
                    const labels = weatherDayLabels(day.date, todayIso);
                    const span = weatherRangeSpan(day, extent);
                    return (
                      <View key={day.date} style={styles.dayCard}>
                        <View style={styles.dayName}>
                          <Text style={styles.dayNameMain}>{labels.name}</Text>
                          <Text style={styles.dayNameSub}>
                            {labels.sub}
                            {day.precipChancePct !== undefined
                              ? ` · Rain ${Math.round(day.precipChancePct)}%`
                              : ""}
                          </Text>
                        </View>
                        <WeatherGlyph kind={weatherGlyphKind(day.condition)} size={24} />
                        <Text style={styles.dayLo}>{Math.round(day.lowF)}°</Text>
                        <View style={styles.rangeTrack}>
                          <View
                            style={[
                              styles.rangeFill,
                              { left: `${span.leftPct}%`, width: `${span.widthPct}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.dayHi}>{Math.round(day.highF)}°</Text>
                      </View>
                    );
                  })}
                </>
              ) : null}

              {stamp ? <Text style={styles.stamp}>{stamp}</Text> : null}
            </>
          )}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 28 },
  topbar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 2, paddingBottom: 12 },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E7EDFB",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 19, fontWeight: "800", color: INK },
  subtitle: { fontSize: 12, color: SUB, fontWeight: "600" },
  quiet: { fontSize: 13.5, color: SUB, marginTop: 28, paddingHorizontal: 4 },
  emptyWrap: { alignItems: "center", marginTop: 44, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: INK },
  emptyLine: { fontSize: 13.5, lineHeight: 20, textAlign: "center", color: SUB, marginTop: 6 },
  hero: {
    backgroundColor: HERO_BLUE,
    borderRadius: 28,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroBig: { fontSize: 52, fontWeight: "800", lineHeight: 56, color: "#FFFFFF" },
  heroCond: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", marginTop: 4 },
  heroHl: { fontSize: 12.5, fontWeight: "600", color: "#FFFFFF", opacity: 0.9, marginTop: 2 },
  sect: {
    fontSize: 12,
    letterSpacing: 1.4,
    fontWeight: "800",
    color: SUB,
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 2,
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 4,
    shadowColor: "#182642",
    shadowOpacity: 0.06,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  detailDivide: { borderTopWidth: 1, borderTopColor: "rgba(24,38,66,0.07)" },
  detailLabel: { fontSize: 13.5, fontWeight: "700", color: SUB },
  detailValue: { fontSize: 14.5, fontWeight: "800", color: INK },
  railRow: { flexDirection: "row", gap: 8, paddingRight: 4 },
  hour: {
    width: 58,
    borderRadius: 18,
    paddingTop: 9,
    paddingBottom: 8,
    alignItems: "center",
  },
  hourPlain: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#182642",
    shadowOpacity: 0.06,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  hourNow: { backgroundColor: NOW_CHIP },
  hourTime: { fontSize: 11, fontWeight: "700", color: SUB },
  hourTimeNow: { color: "#BFD2F5" },
  hourGlyph: { marginTop: 3 },
  hourTemp: { fontSize: 15, fontWeight: "800", color: INK, marginTop: 3 },
  hourTempNow: { color: "#FFFFFF" },
  dayCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 8,
    shadowColor: "#182642",
    shadowOpacity: 0.06,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  dayName: { width: 86, flexShrink: 0 },
  dayNameMain: { fontSize: 14, fontWeight: "800", color: INK },
  dayNameSub: { fontSize: 11, color: SUB, fontWeight: "600", marginTop: 1 },
  dayLo: { fontSize: 13, color: SUB, fontWeight: "700", width: 26, textAlign: "right" },
  rangeTrack: {
    flex: 1,
    height: 6,
    backgroundColor: TRACK,
    borderRadius: 99,
    position: "relative",
  },
  rangeFill: {
    position: "absolute",
    top: 0,
    height: 6,
    backgroundColor: HERO_BLUE,
    borderRadius: 99,
  },
  dayHi: { fontSize: 13, fontWeight: "800", color: INK, width: 26 },
  stamp: { textAlign: "center", fontSize: 11.5, color: SUB, fontWeight: "600", marginTop: 14 },
});
