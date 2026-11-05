// ─── v436 — the home-screen widget faces ────────────────────────────────────
// The six PrayerCircle widgets (react-native-android-widget),
// drawn after the approved W-1 concepts as refined Nov 5: Pray
// Today is the flagship for his top slot (queue face row
// included; 4×2 since v437 — the 4×3 was "way too big"), Your
// Study carries his study life (verse line,
// last written, restudy head), Fast + Reach Out are the half-width
// pair, Emergency and Up Next stay wide. Dark dress, violet seed,
// initials avatars — and NO emojis anywhere (hearts and the book
// glyph are drawn SVG, the way the mockup drew them).
//
// Every face renders a lib/widget-snapshots snapshot — data the
// app's own selectors computed from the real stores. Taps are
// OPEN_URI deep links only (open-to-act): nothing here completes,
// marks, or saves anything.

import { FlexWidget, SvgWidget, TextWidget, type ColorProp } from "react-native-android-widget";

import {
  widgetFastUri,
  widgetPrayUri,
  widgetReachOutUri,
  widgetStudyUri,
  widgetUpNextUri,
  type EmergencyWidgetSnapshot,
  type FastWidgetSnapshot,
  type PrayTodayWidgetSnapshot,
  type ReachOutWidgetSnapshot,
  type StudyWidgetSnapshot,
  type UpNextWidgetSnapshot,
} from "@/lib/widget-snapshots";

const INK = "#F4F1FD" as const;
const MUTED = "#AAA2C6" as const;
const SEED = "#A78BFA" as const;
const SEED_INK = "#1D1430" as const;
const CARD = "#241B45" as const;
const CARD_DEEP = "#171231" as const;
const RING_OFF = "#4A3D78" as const;

const HEART_PATH =
  "M12 21s-7.5-4.7-10-9.3C.3 8.6 1.8 4.9 5.2 4.4c2-.3 3.9.7 4.9 2.2l1.9 2.7 1.9-2.7c1-1.5 2.9-2.5 4.9-2.2 3.4.5 4.9 4.2 3.2 7.3C19.5 16.3 12 21 12 21z";
const heartSvg = (fill: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${HEART_PATH}" fill="${fill}"/></svg>`;
const BOOK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.8"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5V5.5"/><path d="M20 18H6.5"/></svg>`;

function Kicker({ text, color = MUTED, dot = SEED }: { text: string; color?: ColorProp; dot?: ColorProp }) {
  return (
    <FlexWidget style={{ flexDirection: "row", alignItems: "center", flexGap: 7 }}>
      <FlexWidget style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <TextWidget
        text={text}
        style={{ fontSize: 11, fontWeight: "800", letterSpacing: 1.4, color }}
      />
    </FlexWidget>
  );
}

function Avatar({
  face,
  size,
  ring,
}: {
  face: { initials: string; color: string };
  size: number;
  ring?: string;
}) {
  return (
    <FlexWidget
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: face.color as `#${string}`,
        alignItems: "center",
        justifyContent: "center",
        ...(ring
          ? { borderWidth: 2, borderColor: ring as `#${string}` }
          : {}),
      }}
    >
      <TextWidget
        text={face.initials}
        style={{ fontSize: Math.round(size * 0.34), fontWeight: "800", color: "#FFFFFF" }}
      />
    </FlexWidget>
  );
}

// ─── v437 — the never-blank card ────────────────────────────────────────────
// Rendered when there is no snapshot to draw at all (the task
// handler's last-ditch fallback, and renderWidgetByName's default).
// A widget must NEVER sit blank: its initialLayout is a transparent
// empty frame, so any path that renders nothing leaves a hole on
// the home screen. This card needs no data and opens the app.

export function WidgetFallbackCard() {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: "match_parent",
        height: "match_parent",
        backgroundColor: CARD,
        borderRadius: 26,
        padding: 16,
        flexDirection: "column",
        flexGap: 8,
      }}
    >
      <Kicker text="PRAYERCIRCLE" />
      <TextWidget text="Open PrayerCircle" style={{ fontSize: 15, fontWeight: "800", color: INK }} />
    </FlexWidget>
  );
}

// ─── Pray Today — the flagship (his top slot; 4×2 since v437) ───────────────

export function PrayTodayWidget({
  snapshot,
  scheme,
  compact = false,
}: {
  snapshot: PrayTodayWidgetSnapshot;
  scheme: string;
  compact?: boolean;
}) {
  if (snapshot.state === "no-queue") {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          width: "match_parent",
          height: "match_parent",
          backgroundColor: CARD,
          borderRadius: 26,
          padding: 16,
          flexDirection: "column",
          flexGap: 8,
        }}
      >
        <Kicker text="PRAY TODAY" />
        <TextWidget text="Open PrayerCircle" style={{ fontSize: 17, fontWeight: "800", color: INK }} />
        <TextWidget
          text="Today's prayer list will stand here."
          style={{ fontSize: 13, color: MUTED }}
        />
      </FlexWidget>
    );
  }

  // v437: Pray Today lives at 4×2 now (Jonathan: the 4×3 was "way
  // too big"), so the compact face row shrinks to 26px faces —
  // the whole composition is budgeted against the ~150dp canvas
  // in the compact branch below.
  const faceSize = compact ? 26 : 36;
  const faces = snapshot.faces.slice(0, compact ? 6 : 8);
  const faceRow = (
    <FlexWidget style={{ flexDirection: "row", flexGap: 10, marginTop: compact ? 8 : 12 }}>
      {faces.map((face) => (
        <FlexWidget
          key={face.personId}
          style={{ flexDirection: "column", alignItems: "center", flexGap: 3, width: faceSize + 8 }}
        >
          <Avatar face={face} size={faceSize} ring={face.prayed ? SEED : RING_OFF} />
          <TextWidget
            text={face.firstName}
            maxLines={1}
            style={{
              fontSize: 9.5,
              fontWeight: "700",
              color: face.prayed ? SEED : MUTED,
              textAlign: "center",
            }}
          />
        </FlexWidget>
      ))}
      {snapshot.faces.length > faces.length ? (
        <FlexWidget style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", width: faceSize + 8 }}>
          <TextWidget
            text={`+${snapshot.faces.length - faces.length}`}
            style={{ fontSize: 12, fontWeight: "800", color: MUTED }}
          />
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );

  if (snapshot.state === "complete") {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          width: "match_parent",
          height: "match_parent",
          backgroundColor: CARD,
          borderRadius: 26,
          padding: 16,
          flexDirection: "column",
        }}
      >
        <Kicker text="PRAY TODAY" />
        <TextWidget
          text="Pray Today complete"
          style={{ fontSize: 20, fontWeight: "800", color: INK, marginTop: 10 }}
        />
        <TextWidget
          text={`${snapshot.prayed} of ${snapshot.total} prayed`}
          style={{ fontSize: 13, color: MUTED, marginTop: 3 }}
        />
        {faceRow}
      </FlexWidget>
    );
  }

  const prayUri = widgetPrayUri(scheme, snapshot.personId, "today");

  // v437 — the 4×2 composition. Budgeted against the ~150dp-tall
  // canvas: kicker + count on one line, the next person (44px
  // avatar, need title, the sentence fenced to ONE line), Pray now
  // riding the same row, and the 26px queue faces under it.
  // Nothing here may grow a second line or the row clips.
  if (compact) {
    return (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: prayUri }}
        style={{
          width: "match_parent",
          height: "match_parent",
          backgroundColor: CARD,
          borderRadius: 26,
          padding: 12,
          flexDirection: "column",
        }}
      >
        <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
          <Kicker text="PRAY TODAY" />
          <FlexWidget style={{ flex: 1 }} />
          <TextWidget
            text={`${snapshot.prayed} of ${snapshot.total} prayed`}
            style={{ fontSize: 11.5, fontWeight: "700", color: MUTED }}
          />
        </FlexWidget>
        <FlexWidget
          style={{ flexDirection: "row", alignItems: "center", flexGap: 10, marginTop: 8 }}
        >
          <Avatar face={snapshot} size={44} />
          <FlexWidget style={{ flexDirection: "column", flex: 1 }}>
            <TextWidget
              text={`NEXT UP · ${snapshot.name.toUpperCase()}`}
              maxLines={1}
              style={{ fontSize: 10.5, fontWeight: "800", letterSpacing: 1.1, color: MUTED }}
            />
            {!!snapshot.needTitle && (
              <TextWidget
                text={snapshot.needTitle}
                maxLines={1}
                style={{ fontSize: 16, fontWeight: "800", color: INK, marginTop: 1 }}
              />
            )}
            {!!snapshot.needLine && (
              <TextWidget
                text={snapshot.needLine}
                maxLines={1}
                style={{ fontSize: 12.5, color: "#D8D2F2", marginTop: 1 }}
              />
            )}
          </FlexWidget>
          <FlexWidget
            clickAction="OPEN_URI"
            clickActionData={{ uri: prayUri }}
            style={{
              backgroundColor: SEED,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
          >
            <TextWidget text="Pray now" style={{ fontSize: 12.5, fontWeight: "800", color: SEED_INK }} />
          </FlexWidget>
        </FlexWidget>
        {faceRow}
      </FlexWidget>
    );
  }

  const avatarSize = 64;
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: prayUri }}
      style={{
        width: "match_parent",
        height: "match_parent",
        backgroundColor: CARD,
        borderRadius: 26,
        padding: 16,
        flexDirection: "column",
      }}
    >
      <Kicker text="PRAY TODAY" />
      <FlexWidget style={{ flexDirection: "row", flexGap: 12, marginTop: compact ? 8 : 12 }}>
        <Avatar face={snapshot} size={avatarSize} />
        <FlexWidget style={{ flexDirection: "column", flex: 1 }}>
          <TextWidget
            text={`NEXT UP · ${snapshot.name.toUpperCase()}`}
            maxLines={1}
            style={{ fontSize: 11, fontWeight: "800", letterSpacing: 1.1, color: MUTED }}
          />
          {!!snapshot.needTitle && (
            <TextWidget
              text={snapshot.needTitle}
              maxLines={1}
              style={{ fontSize: compact ? 17 : 20, fontWeight: "800", color: INK, marginTop: 2 }}
            />
          )}
          {!!snapshot.needLine && (
            <TextWidget
              text={snapshot.needLine}
              maxLines={2}
              style={{ fontSize: 13.5, color: "#D8D2F2", marginTop: 2 }}
            />
          )}
        </FlexWidget>
      </FlexWidget>
      <FlexWidget
        style={{ flexDirection: "row", alignItems: "center", flexGap: 12, marginTop: compact ? 10 : 14 }}
      >
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: prayUri }}
          style={{
            backgroundColor: SEED,
            borderRadius: 999,
            paddingHorizontal: 18,
            paddingVertical: 9,
          }}
        >
          <TextWidget text="Pray now" style={{ fontSize: 13.5, fontWeight: "800", color: SEED_INK }} />
        </FlexWidget>
        <FlexWidget style={{ flex: 1 }} />
        <TextWidget
          text={`${snapshot.prayed} of ${snapshot.total} prayed`}
          style={{ fontSize: 12.5, fontWeight: "700", color: MUTED }}
        />
      </FlexWidget>
      {faceRow}
    </FlexWidget>
  );
}

// ─── Emergency (wide) ───────────────────────────────────────────────────────

export function EmergencyWidget({
  snapshot,
  scheme,
}: {
  snapshot: EmergencyWidgetSnapshot;
  scheme: string;
}) {
  if (snapshot.state === "none") {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          width: "match_parent",
          height: "match_parent",
          backgroundColor: CARD,
          borderRadius: 26,
          padding: 16,
          flexDirection: "column",
          flexGap: 8,
        }}
      >
        <Kicker text="EMERGENCY" dot="#FF8A75" />
        <TextWidget text="No emergencies" style={{ fontSize: 17, fontWeight: "800", color: INK }} />
        <TextWidget text="Nothing urgent right now." style={{ fontSize: 13, color: MUTED }} />
      </FlexWidget>
    );
  }
  const firstUri = widgetPrayUri(scheme, snapshot.rows[0].personId, "emergency");
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: firstUri }}
      style={{
        width: "match_parent",
        height: "match_parent",
        backgroundGradient: { from: "#B91C1C", to: "#7F1D1D", orientation: "TL_BR" },
        borderRadius: 26,
        padding: 15,
        flexDirection: "column",
      }}
    >
      <Kicker
        text={`EMERGENCY · ${snapshot.total} ACTIVE`}
        color="#FFD9D2"
        dot="#FF8A75"
      />
      {snapshot.rows.map((row, index) => (
        <FlexWidget
          key={row.personId + row.title}
          style={{
            flexDirection: "row",
            flexGap: 11,
            marginTop: index === 0 ? 10 : 12,
            alignItems: "flex-start",
          }}
        >
          <Avatar face={row} size={40} ring="rgba(255,255,255,0.75)" />
          <FlexWidget style={{ flexDirection: "column", flex: 1 }}>
            <TextWidget
              text={row.name.toUpperCase()}
              maxLines={1}
              style={{ fontSize: 10.5, fontWeight: "800", letterSpacing: 1.1, color: "rgba(255, 255, 255, 0.88)" }}
            />
            <TextWidget
              text={row.title}
              maxLines={1}
              style={{ fontSize: 15.5, fontWeight: "800", color: "#FFFFFF" }}
            />
            {!!row.note && (
              <TextWidget
                text={row.note}
                maxLines={1}
                style={{ fontSize: 12.5, color: "#FEE2E2" }}
              />
            )}
            <TextWidget text={row.leftText} style={{ fontSize: 11.5, color: "#FECACA", marginTop: 1 }} />
          </FlexWidget>
          <FlexWidget
            clickAction="OPEN_URI"
            clickActionData={{ uri: widgetPrayUri(scheme, row.personId, "emergency") }}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 999,
              paddingHorizontal: 13,
              paddingVertical: 7,
              marginTop: 4,
            }}
          >
            <TextWidget text="Pray now" style={{ fontSize: 12, fontWeight: "800", color: "#8F1D16" }} />
          </FlexWidget>
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

// ─── Your Fast (small, half-width) ──────────────────────────────────────────

export function YourFastWidget({
  snapshot,
  scheme,
}: {
  snapshot: FastWidgetSnapshot;
  scheme: string;
}) {
  if (snapshot.state === "none") {
    return (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: widgetFastUri(scheme) }}
        style={{
          width: "match_parent",
          height: "match_parent",
          backgroundColor: CARD,
          borderRadius: 26,
          padding: 14,
          flexDirection: "column",
          flexGap: 8,
        }}
      >
        <Kicker text="YOUR FAST" />
        <TextWidget text="No fast running" style={{ fontSize: 15, fontWeight: "800", color: INK }} />
      </FlexWidget>
    );
  }
  const hearts =
    snapshot.hearts != null && snapshot.maxHearts != null
      ? Array.from({ length: snapshot.maxHearts }, (_, i) => i < (snapshot.hearts ?? 0))
      : null;
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: widgetFastUri(scheme) }}
      style={{
        width: "match_parent",
        height: "match_parent",
        backgroundColor: CARD,
        borderRadius: 26,
        padding: 14,
        flexDirection: "column",
      }}
    >
      <Kicker text="YOUR FAST" />
      <TextWidget
        text={`Day ${snapshot.dayNumber}`}
        style={{ fontSize: 27, fontWeight: "800", color: INK, marginTop: 7 }}
      />
      <TextWidget
        text={`${snapshot.name} · of ${snapshot.totalDays}`}
        maxLines={2}
        style={{ fontSize: 12, color: MUTED, marginTop: 2 }}
      />
      {hearts ? (
        <FlexWidget style={{ flexDirection: "row", flexGap: 4, marginTop: 9 }}>
          {hearts.map((full, i) => (
            <SvgWidget
              key={i}
              svg={heartSvg(full ? "#A78BFA" : "#4A3D78")}
              style={{ width: 16, height: 16 }}
            />
          ))}
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

// ─── Due to Reach Out (small, half-width) ───────────────────────────────────

export function ReachOutWidget({
  snapshot,
  scheme,
}: {
  snapshot: ReachOutWidgetSnapshot;
  scheme: string;
}) {
  if (snapshot.state === "none") {
    return (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: widgetReachOutUri(scheme) }}
        style={{
          width: "match_parent",
          height: "match_parent",
          backgroundColor: "#1D2F26",
          borderRadius: 26,
          padding: 14,
          flexDirection: "column",
          flexGap: 8,
        }}
      >
        <Kicker text="DUE TO REACH OUT" color="#9FC4A8" dot="#7FC98F" />
        <TextWidget text="Nobody due" style={{ fontSize: 15, fontWeight: "800", color: INK }} />
        <TextWidget text="Everyone's been reached lately." style={{ fontSize: 12, color: "#B9CDBD" }} />
      </FlexWidget>
    );
  }
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: widgetReachOutUri(scheme) }}
      style={{
        width: "match_parent",
        height: "match_parent",
        backgroundColor: "#1D2F26",
        borderRadius: 26,
        padding: 14,
        flexDirection: "column",
      }}
    >
      <Kicker text="DUE TO REACH OUT" color="#9FC4A8" dot="#7FC98F" />
      <FlexWidget style={{ flexDirection: "row", flexGap: 10, marginTop: 9, alignItems: "center" }}>
        <Avatar face={snapshot.lead} size={40} />
        <FlexWidget style={{ flexDirection: "column", flex: 1 }}>
          <TextWidget
            text={`${snapshot.lead.days} days`}
            style={{ fontSize: 22, fontWeight: "800", color: INK }}
          />
          <TextWidget
            text={`since you reached ${snapshot.lead.firstName}`}
            maxLines={1}
            style={{ fontSize: 12, color: "#B9CDBD" }}
          />
        </FlexWidget>
      </FlexWidget>
      {snapshot.second ? (
        <FlexWidget style={{ flexDirection: "row", flexGap: 8, marginTop: 10, alignItems: "center" }}>
          <Avatar face={snapshot.second} size={24} />
          <TextWidget
            text={`${snapshot.second.firstName} · ${snapshot.second.days}d`}
            maxLines={1}
            style={{ fontSize: 12, fontWeight: "700", color: "#D8E8DB" }}
          />
          {snapshot.totalDue > 2 ? (
            <TextWidget
              text={`+${snapshot.totalDue - 2} more due`}
              style={{ fontSize: 11.5, color: "#9FC4A8" }}
            />
          ) : null}
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

// ─── Up Next (wide) ─────────────────────────────────────────────────────────

export function UpNextWidget({
  snapshot,
  scheme,
}: {
  snapshot: UpNextWidgetSnapshot;
  scheme: string;
}) {
  if (snapshot.state === "none") {
    return (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: widgetUpNextUri(scheme) }}
        style={{
          width: "match_parent",
          height: "match_parent",
          backgroundColor: CARD,
          borderRadius: 26,
          padding: 16,
          flexDirection: "column",
          flexGap: 8,
        }}
      >
        <Kicker text="UP NEXT · TODAY" />
        <TextWidget text="Nothing left today" style={{ fontSize: 16, fontWeight: "800", color: INK }} />
      </FlexWidget>
    );
  }
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: widgetUpNextUri(scheme) }}
      style={{
        width: "match_parent",
        height: "match_parent",
        backgroundColor: CARD,
        borderRadius: 26,
        padding: 16,
        flexDirection: "column",
      }}
    >
      <Kicker text="UP NEXT · TODAY" />
      <FlexWidget style={{ flexDirection: "row", flexGap: 12, marginTop: 10, alignItems: "flex-start" }}>
        <FlexWidget
          style={{
            backgroundColor: CARD_DEEP,
            borderRadius: 999,
            paddingHorizontal: 11,
            paddingVertical: 5,
          }}
        >
          <TextWidget text={snapshot.timeLabel} style={{ fontSize: 12, fontWeight: "800", color: SEED }} />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: "column", flex: 1 }}>
          <TextWidget text={snapshot.title} maxLines={2} style={{ fontSize: 17, fontWeight: "800", color: INK }} />
          {!!snapshot.line && (
            <TextWidget text={snapshot.line} maxLines={1} style={{ fontSize: 13, color: "#D8D2F2", marginTop: 2 }} />
          )}
        </FlexWidget>
      </FlexWidget>
      {!!snapshot.thenOpenText && (
        <TextWidget
          text={snapshot.thenOpenText}
          style={{
            fontSize: 12.5,
            color: MUTED,
            marginTop: 11,
            borderTopWidth: 1,
            borderTopColor: "#3A2F63",
            paddingTop: 9,
          }}
        />
      )}
    </FlexWidget>
  );
}

// ─── Your Study (wide, resizable) ───────────────────────────────────────────

export function YourStudyWidget({
  snapshot,
  scheme,
}: {
  snapshot: StudyWidgetSnapshot;
  scheme: string;
}) {
  if (snapshot.state === "none") {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          width: "match_parent",
          height: "match_parent",
          backgroundColor: CARD,
          borderRadius: 26,
          padding: 16,
          flexDirection: "column",
          flexGap: 8,
        }}
      >
        <Kicker text="YOUR STUDY" />
        <TextWidget text="No book underway" style={{ fontSize: 16, fontWeight: "800", color: INK }} />
      </FlexWidget>
    );
  }
  const openChapter = snapshot.nextChapter ?? snapshot.lastWrittenChapter ?? 1;
  const openUri = widgetStudyUri(scheme, snapshot.book, openChapter);
  const primary = snapshot.colorPrimary as `#${string}`;
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: openUri }}
      style={{
        width: "match_parent",
        height: "match_parent",
        backgroundColor: snapshot.colorTint as `#${string}`,
        borderRadius: 26,
        padding: 16,
        flexDirection: "column",
      }}
    >
      <Kicker text="YOUR STUDY" color="#DDD6F5" dot={snapshot.colorPrimary as `#${string}`} />
      <FlexWidget style={{ flexDirection: "row", flexGap: 12, marginTop: 10, alignItems: "flex-start" }}>
        <FlexWidget
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            backgroundColor: primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SvgWidget svg={BOOK_SVG} style={{ width: 24, height: 24 }} />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: "column", flex: 1 }}>
          <TextWidget
            text={
              snapshot.nextChapter != null
                ? `${snapshot.book} ${snapshot.nextChapter}`
                : snapshot.book
            }
            maxLines={1}
            style={{ fontSize: 18, fontWeight: "800", color: INK }}
          />
          <TextWidget
            text={snapshot.nextChapter != null ? "Next to write" : "Fully written"}
            style={{ fontSize: 13, color: "#DDD6F5", marginTop: 1 }}
          />
        </FlexWidget>
      </FlexWidget>
      {!!snapshot.verseText && (
        <TextWidget
          text={snapshot.verseRef ? `${snapshot.verseText} — ${snapshot.verseRef}` : snapshot.verseText}
          maxLines={2}
          style={{ fontSize: 13.5, fontStyle: "italic", color: "#EDE9FA", marginTop: 10 }}
        />
      )}
      {snapshot.lastWrittenChapter != null ? (
        <TextWidget
          text={`Last written · Chapter ${snapshot.lastWrittenChapter}${
            snapshot.lastWrittenNotes != null ? ` · ${snapshot.lastWrittenNotes} notes` : ""
          }`}
          maxLines={1}
          style={{ fontSize: 12.5, color: MUTED, marginTop: 8 }}
        />
      ) : null}
      {!!snapshot.restudyLine && (
        <TextWidget
          text={`Restudy · ${snapshot.restudyLine}`}
          maxLines={1}
          style={{ fontSize: 12.5, color: MUTED, marginTop: 3 }}
        />
      )}
      <FlexWidget style={{ flexDirection: "row", alignItems: "center", marginTop: 11 }}>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: openUri }}
          style={{ backgroundColor: primary, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 8 }}
        >
          <TextWidget text="Open chapter" style={{ fontSize: 12.5, fontWeight: "800", color: "#FFFFFF" }} />
        </FlexWidget>
        <FlexWidget style={{ flex: 1 }} />
        <TextWidget
          text={`${snapshot.chaptersWritten} of ${snapshot.totalChapters} written`}
          style={{ fontSize: 12, fontWeight: "700", color: MUTED }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

// ─── The registry the push layer and the task handler share ─────────────────

export function renderWidgetByName(
  name: string,
  snapshots: {
    prayToday: PrayTodayWidgetSnapshot;
    emergency: EmergencyWidgetSnapshot;
    fast: FastWidgetSnapshot;
    reachOut: ReachOutWidgetSnapshot;
    upNext: UpNextWidgetSnapshot;
    study: StudyWidgetSnapshot;
  },
  scheme: string,
  compact = false,
) {
  switch (name) {
    case "PrayToday":
      return <PrayTodayWidget snapshot={snapshots.prayToday} scheme={scheme} compact={compact} />;
    case "Emergency":
      return <EmergencyWidget snapshot={snapshots.emergency} scheme={scheme} />;
    case "YourFast":
      return <YourFastWidget snapshot={snapshots.fast} scheme={scheme} />;
    case "ReachOut":
      return <ReachOutWidget snapshot={snapshots.reachOut} scheme={scheme} />;
    case "UpNext":
      return <UpNextWidget snapshot={snapshots.upNext} scheme={scheme} />;
    case "YourStudy":
      return <YourStudyWidget snapshot={snapshots.study} scheme={scheme} />;
    default:
      // v437: the shared never-blank card (see WidgetFallbackCard).
      return <WidgetFallbackCard />;
  }
}
