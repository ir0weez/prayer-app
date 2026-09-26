export type ReachedStamp = {
  id: string;
  personId: string;
  personName: string;
  date: string;
  note?: string;
};

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function normalizeReachedStamps(value: unknown): ReachedStamp[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Partial<ReachedStamp>;
    const date = item.date;
    if (typeof item.personId !== "string" || typeof item.personName !== "string" || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    return [{
      id: typeof item.id === "string" && item.id.trim() ? item.id : `reached-stamp-${item.personId}-${item.date}-${index}`,
      personId: item.personId,
      personName: item.personName.trim() || "Unnamed Person",
      date,
      note: cleanText(item.note),
    }];
  });
}

export function upsertReachedStamp(
  stamps: ReachedStamp[],
  input: Pick<ReachedStamp, "personId" | "personName" | "date"> & { note?: string },
): ReachedStamp[] {
  const existing = stamps.find((stamp) => stamp.personId === input.personId && stamp.date === input.date);
  const next: ReachedStamp = {
    id: existing?.id ?? `reached-stamp-${input.personId}-${input.date}`,
    personId: input.personId,
    personName: input.personName.trim() || "Unnamed Person",
    date: input.date,
    note: input.note === undefined ? existing?.note : cleanText(input.note),
  };
  return existing ? stamps.map((stamp) => stamp.id === existing.id ? next : stamp) : [...stamps, next];
}

export function updateReachedStamp(stamps: ReachedStamp[], id: string, note?: string): ReachedStamp[] {
  return stamps.map((stamp) => stamp.id === id ? { ...stamp, note: cleanText(note) } : stamp);
}

export function removeReachedStamp(stamps: ReachedStamp[], id: string): ReachedStamp[] {
  return stamps.filter((stamp) => stamp.id !== id);
}
