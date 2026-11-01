/**
 * v336 — the Email page's store (Jonathan, Oct 29: the digest
 * route). Eva prepares a morning digest from his connected Gmail
 * and it reaches the app through the EXISTING backup/pack import
 * path — the backup import accepts every prayercircle.* storage
 * key generically (app/(tabs)/index.tsx handleImportData), so this
 * key round-trips with no new transport and no Gmail sign-in in
 * the app. A private fetch channel is a later build.
 *
 * Shape under prayercircle.email-digest.v1:
 * {
 *   preparedAt: string (ISO),
 *   digest: [{ sender, subject, why }],
 *   groups: {
 *     reply:  [{ sender, subject, preview, when }],
 *     money:  [{ sender, subject, preview, when }],
 *     people: [{ sender, subject, preview, when }],
 *   },
 *   filedCount: number
 * }
 * Reading is tolerant: anything malformed reads as "no digest",
 * and the page shows its calm empty state — never fake mail.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export const EMAIL_DIGEST_KEY = "prayercircle.email-digest.v1";

export interface DigestLead {
  sender: string;
  subject: string;
  /** The one-line why — why this touches his day. */
  why: string;
}

export interface DigestMailRow {
  sender: string;
  subject: string;
  preview: string;
  /** Display time as prepared ("9:41 AM", "Tue") — the digest is a
   * morning snapshot, so the words travel with it. */
  when: string;
}

export interface EmailDigest {
  preparedAt: string;
  digest: DigestLead[];
  groups: {
    reply: DigestMailRow[];
    money: DigestMailRow[];
    people: DigestMailRow[];
  };
  filedCount: number;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseLead(value: unknown): DigestLead | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const subject = asString(row.subject);
  if (!subject) return null;
  return { sender: asString(row.sender), subject, why: asString(row.why) };
}

function parseMailRow(value: unknown): DigestMailRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const subject = asString(row.subject);
  const sender = asString(row.sender);
  if (!subject && !sender) return null;
  return {
    sender,
    subject,
    preview: asString(row.preview),
    when: asString(row.when),
  };
}

function parseRows(value: unknown, parseOne: (v: unknown) => unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.map(parseOne).filter((row) => row !== null);
}

/** Parse + validate a stored digest. Returns null for anything
 * that is not a usable digest — the page's empty state. */
export function parseEmailDigest(raw: string | null): EmailDigest | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const store = parsed as Record<string, unknown>;
  const preparedAt = asString(store.preparedAt);
  if (!preparedAt) return null;
  const groupsRaw =
    store.groups && typeof store.groups === "object"
      ? (store.groups as Record<string, unknown>)
      : {};
  const digest: EmailDigest = {
    preparedAt,
    digest: parseRows(store.digest, parseLead) as DigestLead[],
    groups: {
      reply: parseRows(groupsRaw.reply, parseMailRow) as DigestMailRow[],
      money: parseRows(groupsRaw.money, parseMailRow) as DigestMailRow[],
      people: parseRows(groupsRaw.people, parseMailRow) as DigestMailRow[],
    },
    filedCount:
      typeof store.filedCount === "number" && store.filedCount >= 0
        ? Math.floor(store.filedCount)
        : 0,
  };
  const hasContent =
    digest.digest.length > 0 ||
    digest.groups.reply.length > 0 ||
    digest.groups.money.length > 0 ||
    digest.groups.people.length > 0 ||
    digest.filedCount > 0;
  return hasContent ? digest : null;
}

export async function loadEmailDigest(): Promise<EmailDigest | null> {
  try {
    return parseEmailDigest(await AsyncStorage.getItem(EMAIL_DIGEST_KEY));
  } catch {
    return null;
  }
}

/** Forward-only: true when the incoming digest is strictly
 * newer than the stored one (or there is none). An equal stamp
 * is a re-delivery, not an update. (v407: until now the pack
 * door rewrote this key unconditionally, so a stale digest
 * file arriving late could rewind the Email page; the gas
 * snapshot's discipline — storeGasSnapshotForwardOnly — is
 * the digest's own rule too, and both doors now keep it.) */
export function isNewerEmailDigest(
  stored: EmailDigest | null,
  incoming: EmailDigest,
): boolean {
  if (!stored) return true;
  const incomingMs = Date.parse(incoming.preparedAt);
  const storedMs = Date.parse(stored.preparedAt);
  if (Number.isNaN(incomingMs)) return false;
  if (Number.isNaN(storedMs)) return true;
  return incomingMs > storedMs;
}

/** The one write door for delivered digests (Studio pack,
 * Drive folder): writes ONLY its own key, and only when the
 * incoming digest is newer than the stored one. Returns
 * whether it wrote. */
export async function storeEmailDigestForwardOnly(
  incoming: EmailDigest,
): Promise<boolean> {
  const stored = await loadEmailDigest();
  if (!isNewerEmailDigest(stored, incoming)) return false;
  await AsyncStorage.setItem(EMAIL_DIGEST_KEY, JSON.stringify(incoming));
  return true;
}

/** "Prepared 7:04 AM" — the snapshot's freshness, in its own words. */
export function formatPreparedLine(preparedAt: string): string {
  const date = new Date(preparedAt);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `Prepared ${time}`;
}
