/**
 * v336 — the Email page: "Digest, then Groups" (approved mockup
 * news-email-concepts-v3.html; Jonathan's build order Oct 29).
 * An Email schedule event is a door — tapping its card lands here
 * with the event's id in the params, and the Finished bar at the
 * foot of the page is that event's check-off.
 *
 * The page is fed by the morning digest store
 * (prayercircle.email-digest.v1, lib/email-digest.ts), prepared
 * outside the app and delivered through the existing backup/pack
 * import — there is deliberately no Gmail sign-in or mail fetch
 * in this build. An empty store shows a calm empty state — never
 * sample mail. The digest body itself lives in
 * components/email-digest-view.tsx.
 */
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { TopFade } from "@/components/top-fade";
import { FinishedBar, KeywordPageHeader } from "@/components/keyword-page-chrome";
import { EmailDigestView } from "@/components/email-digest-view";
import { useNewsEmailMaterial } from "@/hooks/use-news-email-material";
import { loadEmailDigest, type EmailDigest } from "@/lib/email-digest";
import { finishScheduleEvent } from "@/lib/finish-event";

export default function EmailPage() {
  const m = useNewsEmailMaterial();
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string; eventDate?: string }>();
  const eventId = typeof params.eventId === "string" && params.eventId ? params.eventId : null;

  // undefined = still reading the store; null = no digest prepared.
  const [digest, setDigest] = useState<EmailDigest | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    loadEmailDigest().then((loaded) => {
      if (live) setDigest(loaded);
    });
    return () => {
      live = false;
    };
  }, []);

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
        >
          <KeywordPageHeader m={m} title="Email" dateChip={dateChip} onBack={() => router.back()} />
          <Text style={[styles.dated, { color: m.deep }]}>{dateLong}</Text>
          <Text style={[styles.h1, { color: m.ink }]}>Morning Digest</Text>

          {digest === undefined ? (
            <Text style={[styles.quiet, { color: m.inkSoft }]}>Opening your mail…</Text>
          ) : digest === null ? (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptySeat, { backgroundColor: m.tonal }]}>
                <MaterialIcons name="mail" size={30} color={m.tonalInk} />
              </View>
              <Text style={[styles.emptyTitle, { color: m.ink }]}>No digest yet</Text>
              <Text style={[styles.emptyLine, { color: m.inkSoft }]}>
                When a morning digest is prepared, it will be waiting here.
              </Text>
            </View>
          ) : (
            <EmailDigestView m={m} digest={digest} />
          )}
        </ScrollView>
        <TopFade color={m.ground} />
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
});
