/**
 * v336 — the Email page's digest body ("Digest, then Groups"),
 * split from the route so it renders purely from a prepared
 * digest: a hero digest box (each thing that touches today, with
 * its one-line why), then the groups — Needs a reply · Money &
 * bills · From people you know — as quiet cards of static rows,
 * then the collapsed "Quietly filed · N" line. Mail rows are
 * display-only by design: no press states, no chevrons, no
 * dead-end buttons (there is no mailbox behind them in this
 * build — the digest is a morning snapshot).
 */
import { StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { numberWord } from "@/components/keyword-page-chrome";
import {
  formatPreparedLine,
  type DigestMailRow,
  type EmailDigest,
} from "@/lib/email-digest";
import type { NewsEmailMaterialFamily } from "@/lib/news-email-material";

const GROUP_DEFS: {
  key: "reply" | "money" | "people";
  label: string;
  icon: string;
}[] = [
  { key: "reply", label: "Needs a reply", icon: "reply" },
  { key: "money", label: "Money & bills", icon: "payments" },
  { key: "people", label: "From people you know", icon: "people" },
];

function MailRowView({
  m,
  row,
  last,
}: {
  m: NewsEmailMaterialFamily;
  row: DigestMailRow;
  last: boolean;
}) {
  return (
    <View style={[styles.mailRow, !last && { borderBottomColor: m.line, borderBottomWidth: 1 }]}>
      <View style={styles.mailTop}>
        <Text style={[styles.mailFrom, { color: m.ink }]} numberOfLines={1}>
          {row.sender}
        </Text>
        {row.when ? <Text style={[styles.mailWhen, { color: m.inkSoft }]}>{row.when}</Text> : null}
      </View>
      {row.subject ? <Text style={[styles.mailSubject, { color: m.ink }]}>{row.subject}</Text> : null}
      {row.preview ? (
        <Text style={[styles.mailPreview, { color: m.inkSoft }]} numberOfLines={2}>
          {row.preview}
        </Text>
      ) : null}
    </View>
  );
}

export function EmailDigestView({
  m,
  digest,
}: {
  m: NewsEmailMaterialFamily;
  digest: EmailDigest;
}) {
  const prepared = formatPreparedLine(digest.preparedAt);
  return (
    <>
      <Text style={[styles.standfirst, { color: m.inkSoft }]}>
        {digest.digest.length > 0
          ? `${numberWord(digest.digest.length)} ${digest.digest.length === 1 ? "thing" : "things"} in your inbox actually touch today.`
          : "Nothing in your inbox touches today."}
      </Text>
      {prepared ? <Text style={[styles.updated, { color: m.inkSoft }]}>{prepared}</Text> : null}

      {digest.digest.length > 0 ? (
        <View style={[styles.heroBox, { backgroundColor: m.openBox }]}>
          {digest.digest.map((lead, index) => (
            <View
              key={`${lead.subject}-${index}`}
              style={[styles.leadRow, index > 0 && { borderTopColor: m.line, borderTopWidth: 1 }]}
            >
              <View style={[styles.leadDot, { backgroundColor: m.deep }]} />
              <View style={styles.leadText}>
                <Text style={[styles.leadSubject, { color: m.openInk }]}>{lead.subject}</Text>
                {lead.why ? (
                  <Text style={[styles.leadWhy, { color: m.openInkSoft }]}>{lead.why}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {GROUP_DEFS.map((group) => {
        const rows = digest.groups[group.key];
        if (rows.length === 0) return null;
        return (
          <View key={group.key} style={styles.groupWrap}>
            <View style={styles.groupHead}>
              <View style={[styles.groupIconSeat, { backgroundColor: m.tonal }]}>
                <MaterialIcons name={group.icon as any} size={14} color={m.tonalInk} />
              </View>
              <Text style={[styles.groupLabel, { color: m.ink }]}>{group.label}</Text>
              <View style={[styles.countChip, { backgroundColor: m.tonal }]}>
                <Text style={[styles.countText, { color: m.tonalInk }]}>{rows.length}</Text>
              </View>
            </View>
            <View style={[styles.groupCard, { backgroundColor: m.card }]}>
              {rows.map((row, index) => (
                <MailRowView
                  key={`${row.sender}-${row.subject}-${index}`}
                  m={m}
                  row={row}
                  last={index === rows.length - 1}
                />
              ))}
            </View>
          </View>
        );
      })}

      {digest.filedCount > 0 ? (
        <View style={[styles.filedBox, { backgroundColor: m.tonal }]}>
          <MaterialIcons name="folder" size={16} color={m.tonalInk} />
          <Text style={[styles.filedLabel, { color: m.tonalInk }]}>Quietly filed</Text>
          <Text style={[styles.filedCount, { color: m.tonalInk }]}>
            {digest.filedCount} {digest.filedCount === 1 ? "message" : "messages"}
          </Text>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  standfirst: { fontSize: 13.5, lineHeight: 19, marginTop: 5 },
  updated: { fontSize: 11.5, fontWeight: "600", marginTop: 6 },
  heroBox: { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 6, marginTop: 18 },
  leadRow: { flexDirection: "row", gap: 11, paddingVertical: 12 },
  leadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  leadText: { flex: 1 },
  leadSubject: { fontSize: 14.5, fontWeight: "700", lineHeight: 20 },
  leadWhy: { fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  groupWrap: { marginTop: 22 },
  groupHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  groupIconSeat: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  groupLabel: { flex: 1, fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },
  countChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontSize: 11, fontWeight: "800" },
  groupCard: { borderRadius: 18, paddingHorizontal: 14, marginTop: 10 },
  mailRow: { paddingVertical: 11 },
  mailTop: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  mailFrom: { flex: 1, fontSize: 13.5, fontWeight: "700" },
  mailWhen: { fontSize: 11, fontWeight: "600" },
  mailSubject: { fontSize: 13.5, fontWeight: "600", marginTop: 2 },
  mailPreview: { fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  filedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 22,
  },
  filedLabel: { flex: 1, fontSize: 13, fontWeight: "700" },
  filedCount: { fontSize: 12, fontWeight: "700" },
});
