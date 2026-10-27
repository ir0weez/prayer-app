// ─────────────────────────────────────────────────────────────────────────────
// v279 — The Street & The Café: the town-map overlay (presentation only).
//
// Drawn in the map's own overlay grammar — the same paper-and-ink pieces
// the cottages wear (warm glow pools, slate veils, dashed waiting
// edges), settled from stored state on open: no timers, no loops, and
// pointer-events none throughout, so the diner underneath keeps its
// own tap, sheet, and interior exactly as before.
//
// The café IS the town map's diner, re-dressed: a striped awning on
// its front, the ovens in its storefront window (bread when the fast
// feeds the day, dark when a missed day leaves them cold), tables out
// front where the served sit, the slipping standing at the door in
// the grey-edged waiting dress, and — the heart of it — the ORDER
// BOARD on the street edge, carrying today's real prayer list as
// tickets (lib/cafe-street.ts does the deriving; this file only draws
// what it is handed). When no diner stands on the town map yet, the
// board alone anchors at the diner's home lot (Chapel Shops), so the
// loop is visible from the first day; the rest of the dress arrives
// with the building.
// ─────────────────────────────────────────────────────────────────────────────

import { memo } from "react";
import { Text, View } from "react-native";
import type { CafeBoard, CafeOvenState, CafeTicket } from "@/lib/cafe-street";

export type CafeAnchor = {
  left: number;
  top: number;
  width: number;
  height: number;
  /** False when the anchor is the diner's home lot (no building yet). */
  hasBuilding: boolean;
};

const PAPER = "#FFF8EA";
const INK = "#5B4632";
const INK_DEEP = "#4A3220";
const WOOD = "#B07B45";
const WOOD_DEEP = "#7A5230";
const EMERGENCY = "#EF4444";
const EMERGENCY_INK = "#B3261E";
const PRAISE = "#F59E0B";
const WAITING_BAND = "#D8C9A3";
const SLIP_EDGE = "#94A3B8";
const SLIP_INK = "#64748B";
const SERVED_INK = "#2F7D4F";
const GLOW = "#FBBF24";

const MAX_BOARD_ROWS = 6;
const MAX_SEATS = 3;
const MAX_DOOR_FIGURES = 2;

function bandColor(ticket: CafeTicket): string {
  if (ticket.slippingDays !== undefined) return SLIP_EDGE;
  if (ticket.kind === "emergency") return EMERGENCY;
  if (ticket.kind === "praise") return PRAISE;
  return WAITING_BAND;
}

function TicketRow({ ticket }: { ticket: CafeTicket }) {
  const slipping = ticket.slippingDays !== undefined;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        marginTop: 2,
        paddingHorizontal: slipping ? 2 : 0,
        paddingVertical: slipping ? 1 : 0,
        borderWidth: slipping ? 1 : 0,
        borderColor: SLIP_EDGE,
        borderStyle: "dashed",
        borderRadius: 3,
      }}
    >
      <View style={{ width: 3, alignSelf: "stretch", borderRadius: 1.5, backgroundColor: bandColor(ticket) }} />
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={{ fontSize: 8.5, fontWeight: "800", color: ticket.kind === "emergency" ? EMERGENCY_INK : INK_DEEP }}
        >
          {ticket.firstName}
        </Text>
        {ticket.kind === "emergency" && ticket.need ? (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{ fontSize: 7, fontWeight: "700", color: EMERGENCY_INK }}
          >
            {ticket.need}
          </Text>
        ) : null}
      </View>
      {slipping ? (
        <View style={{ backgroundColor: "#E2E8F0", borderRadius: 3, paddingHorizontal: 2, paddingVertical: 0.5 }}>
          <Text style={{ fontSize: 7, fontWeight: "800", color: SLIP_INK }}>{ticket.slippingDays}d</Text>
        </View>
      ) : null}
    </View>
  );
}

/** A person served today, seated at a café table: their disc, warmly ringed. */
function ServedSeat({ ticket }: { ticket: CafeTicket }) {
  return (
    <View style={{ width: 30, height: 30, alignItems: "center", justifyContent: "flex-end" }}>
      <View
        pointerEvents="none"
        style={{ position: "absolute", bottom: 0, width: 27, height: 27, borderRadius: 13.5, backgroundColor: "#8B5E34", borderWidth: 2, borderColor: "#5E3D22" }}
      />
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: -3, width: 26, height: 26, borderRadius: 13, backgroundColor: GLOW, opacity: 0.35 }}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          width: 17,
          height: 17,
          borderRadius: 8.5,
          backgroundColor: ticket.accentColor,
          borderWidth: 2,
          borderColor: PRAISE,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 7, fontWeight: "800", color: "#FFFFFF" }}>
          {ticket.name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

/** An empty table — the café front reads as a café before anyone is served. */
function EmptyTable() {
  return (
    <View style={{ width: 30, height: 30, alignItems: "center", justifyContent: "flex-end" }}>
      <View style={{ width: 27, height: 27, borderRadius: 13.5, backgroundColor: "#8B5E34", borderWidth: 2, borderColor: "#5E3D22", opacity: 0.75 }} />
    </View>
  );
}

/** Someone slipping, at the café door: grey-edged, ticket unfilled. */
function DoorFigure({ ticket }: { ticket: CafeTicket }) {
  return (
    <View style={{ width: 23, alignItems: "center" }}>
      <View style={{ width: 11, height: 8, backgroundColor: PAPER, borderWidth: 1, borderColor: SLIP_EDGE, borderStyle: "dashed", borderRadius: 1.5, marginBottom: 1.5 }} />
      <View
        style={{
          width: 13,
          height: 13,
          borderRadius: 6.5,
          backgroundColor: ticket.accentColor,
          borderWidth: 1.5,
          borderColor: SLIP_EDGE,
        }}
      />
      <View style={{ width: 16, height: 11, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: ticket.accentColor, marginTop: 1, overflow: "hidden" }}>
        <View style={{ flex: 1, backgroundColor: "#64748B", opacity: 0.45 }} />
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: 6.5, fontWeight: "700", color: "#475569", marginTop: 1 }}>
        {ticket.firstName}
      </Text>
    </View>
  );
}

export const CafeStreetOverlay = memo(function CafeStreetOverlay(props: {
  anchor: CafeAnchor;
  cellSize: number;
  board: CafeBoard;
  oven: CafeOvenState;
  night: boolean;
}) {
  const { anchor, cellSize, board, oven, night } = props;
  const frontW = Math.max(anchor.width, cellSize * 4.6);
  const deckH = cellSize * 0.95;
  const left = anchor.left + anchor.width / 2 - frontW / 2;
  const bx = (frontW - anchor.width) / 2; // the building's own x inside the frontage

  const waitingTickets = board.tickets.filter((t) => t.kind !== "served");
  const servedTickets = board.tickets.filter((t) => t.kind === "served");
  const rows = waitingTickets.slice(0, MAX_BOARD_ROWS);
  const hiddenCount = waitingTickets.length - rows.length;
  const doorTickets = board.tickets.filter((t) => t.slippingDays !== undefined).slice(0, MAX_DOOR_FIGURES);
  const seats = servedTickets.slice(0, MAX_SEATS);
  const extraServed = servedTickets.length - seats.length;
  const hasEmergency = board.tickets.some((t) => t.kind === "emergency");

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left, top: anchor.top, width: frontW, height: anchor.height + deckH, zIndex: 1400000 }}
    >
      {anchor.hasBuilding && oven === "cold" && (
        <View
          style={{ position: "absolute", left: bx, top: 0, width: anchor.width, height: anchor.height, backgroundColor: "#334155", opacity: 0.16, borderRadius: 8 }}
        />
      )}
      {anchor.hasBuilding && (
        <>
          {/* the striped awning, seated on the storefront */}
          <View
            style={{
              position: "absolute",
              left: bx - 3,
              top: anchor.height * 0.44,
              width: anchor.width + 6,
              height: 9,
              flexDirection: "row",
              borderWidth: 1,
              borderColor: INK,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: i % 2 ? "#FFF3DC" : "#D9534A" }} />
            ))}
          </View>
          {/* the ovens: warm light + bread in the window while the fast feeds the day */}
          {oven !== "none" && (
            <>
              {oven === "lit" && (
                <View
                  style={{
                    position: "absolute",
                    left: bx + anchor.width / 2 - 29,
                    top: anchor.height * 0.52,
                    width: 58,
                    height: 30,
                    borderRadius: 14,
                    backgroundColor: GLOW,
                    opacity: night ? 0.38 : 0.22,
                  }}
                />
              )}
              <View
                style={{
                  position: "absolute",
                  left: bx + anchor.width / 2 - 16,
                  top: anchor.height * 0.58,
                  width: 32,
                  height: 15,
                  borderRadius: 3,
                  borderWidth: 1.5,
                  borderColor: INK_DEEP,
                  backgroundColor: oven === "lit" ? "#7A4A21" : "#2E3440",
                  flexDirection: "row",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  gap: 2,
                  paddingBottom: 2,
                }}
              >
                {oven === "lit" &&
                  [0, 1, 2].map((i) => (
                    <View key={i} style={{ width: 8, height: 5, borderRadius: 2.5, backgroundColor: "#E8B06A", borderBottomWidth: 1.5, borderBottomColor: "#C98B4A" }} />
                  ))}
              </View>
            </>
          )}
        </>
      )}

      {/* the front deck — the café's ground, flush at the building's base */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: anchor.height - 2,
          height: deckH,
          backgroundColor: WOOD,
          borderTopWidth: 3,
          borderTopColor: WOOD_DEEP,
          borderRadius: 4,
        }}
      />

      {/* someone slipping stands at the door — an invitation, never a scolding */}
      {anchor.hasBuilding &&
        doorTickets.map((ticket, i) => (
          <View key={ticket.personId} style={{ position: "absolute", left: 2 + i * 25, bottom: 2 }}>
            <DoorFigure ticket={ticket} />
          </View>
        ))}

      {/* tables out front — the served sit here, warm, for the rest of the day */}
      {anchor.hasBuilding && (
        <View style={{ position: "absolute", left: doorTickets.length * 25 + 8, bottom: 3, flexDirection: "row", alignItems: "flex-end", gap: 5 }}>
          {seats.length > 0 ? seats.map((ticket) => <ServedSeat key={ticket.personId} ticket={ticket} />) : [<EmptyTable key="t1" />, <EmptyTable key="t2" />]}
          {extraServed > 0 && (
            <View style={{ backgroundColor: PAPER, borderWidth: 1, borderColor: INK, borderRadius: 7, paddingHorizontal: 3, paddingVertical: 1, marginBottom: 4 }}>
              <Text style={{ fontSize: 7.5, fontWeight: "800", color: SERVED_INK }}>+{extraServed} served</Text>
            </View>
          )}
        </View>
      )}

      {/* THE ORDER BOARD — today's list, pinned on the street */}
      <View style={{ position: "absolute", right: 2, bottom: 2, width: 97 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-evenly" }}>
          <View style={{ width: 3.5, height: 7, backgroundColor: WOOD_DEEP }} />
          <View style={{ width: 3.5, height: 7, backgroundColor: WOOD_DEEP }} />
        </View>
        <View style={{ backgroundColor: PAPER, borderWidth: 1.5, borderColor: INK, borderRadius: 6, paddingHorizontal: 5, paddingTop: 4, paddingBottom: 5 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Text style={{ fontSize: 7.5, fontWeight: "800", letterSpacing: 0.8, color: WOOD_DEEP }}>{"TODAY'S ORDERS"}</Text>
            {hasEmergency && <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: EMERGENCY }} />}
          </View>
          {rows.length === 0 && servedTickets.length === 0 && (
            <Text style={{ fontSize: 7.5, color: SLIP_INK, marginTop: 2 }}>No orders today</Text>
          )}
          {rows.map((ticket) => (
            <TicketRow key={ticket.personId} ticket={ticket} />
          ))}
          {hiddenCount > 0 && (
            <Text style={{ fontSize: 7.5, fontStyle: "italic", color: WOOD_DEEP, marginTop: 2 }}>+{hiddenCount} more orders</Text>
          )}
          {servedTickets.length > 0 && (
            <View style={{ borderTopWidth: 1, borderTopColor: "#E7DCC3", marginTop: 3, paddingTop: 2 }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: 7.5, fontWeight: "700", color: SERVED_INK }}>
                {servedTickets.slice(0, 3).map((t) => `✓ ${t.firstName}`).join(" · ")}
                {servedTickets.length > 3 ? ` · +${servedTickets.length - 3}` : ""}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

/**
 * The roped new lot at the street's end — the fast-week milestone,
 * drawn as ground truth: ropes, posts, and the sign from the sheet.
 * (Buying/building on it is a named follow-up; this is the marker.)
 */
export const CafeWeekLot = memo(function CafeWeekLot(props: {
  left: number;
  top: number;
  size: number;
  weeks: number;
}) {
  const { left, top, size, weeks } = props;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left, top, width: size, height: size, zIndex: 1400000 }}>
      <View style={{ position: "absolute", left: 3, top: 3, right: 3, bottom: 3, borderWidth: 2, borderStyle: "dashed", borderColor: "#B45309", borderRadius: 8, backgroundColor: "rgba(253, 230, 138, 0.13)" }} />
      {[
        { left: 0, top: 0 },
        { right: 0, top: 0 },
        { left: 0, bottom: 0 },
        { right: 0, bottom: 0 },
      ].map((pos, i) => (
        <View key={i} style={{ position: "absolute", width: 6, height: 6, borderRadius: 1, backgroundColor: WOOD_DEEP, ...pos }} />
      ))}
      <View style={{ position: "absolute", alignSelf: "center", top: size / 2 - 13, backgroundColor: PAPER, borderWidth: 1, borderColor: INK, borderRadius: 5, paddingHorizontal: 4, paddingVertical: 2.5, alignItems: "center" }}>
        <Text style={{ fontSize: 7.5, fontWeight: "800", letterSpacing: 0.5, color: "#92400E" }}>{`WEEK ${weeks} COMPLETE`}</Text>
        <Text style={{ fontSize: 7, color: WOOD_DEEP, marginTop: 0.5 }}>New lot — yours</Text>
      </View>
    </View>
  );
});
