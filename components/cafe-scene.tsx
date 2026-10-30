// ─────────────────────────────────────────────────────────────────────────────
// v287 — The Café Is a Place: the café street scene, composed.
//
// The vignette (components/cafe-scene-art.tsx) is the drawing: the
// café on its plot, tables out front, the hero reading the board, the
// slipping standing at the lit door. Below it stands THE ORDER BOARD
// as a physical object — a panel on two posts — carrying today's real
// prayer list as tickets at readable size, ALL of them: the list
// scrolls inside the board and no name is ever hidden behind a
// "+N more" line (that popup was the v279 overlay, retired in this
// build; Jonathan's 2026-10-27 screenshot 10759 is why).
//
// Serving is prayer (v343): every waiting ticket carries a SERVE
// button that routes to People with the person, and the prayer
// session opens on them — the app's one prayer path, started from
// the board. (The v287 "no serve button" design is superseded:
// arriving at the café used to auto-collect the register too, and
// both passive behaviours are gone — nothing here moves money or
// marks anyone served; praying does.) The scene settles from
// stored state on open — serve someone, come back, and the ticket
// is checked, the figure is at their table, warm. Coins never
// touch a ticket; the day's earnings sit piled by the register,
// waiting, and collecting stays a deliberate tap on the street.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  PaperHeroFigure,
  PaperStandingVillager,
} from "@/components/paper-interior";
import { paperDinerLookFor, type PaperDinerLook } from "@/lib/paper-interior";
import type { Person } from "@/lib/prayercircle-data";
import type { CustomPawn } from "@/lib/pawn";
import {
  serveRouteForTicket,
  weekStripFor,
  type CafeBoard,
  type CafeOvenState,
  type CafeTicket,
} from "@/lib/cafe-street";
import { formatWholeCoins, type DayPhase } from "@/lib/welcoming-town";
import {
  CAFE_LAYOUT,
  CAFE_SCENE_COLS,
  CAFE_SCENE_ROWS,
  CafeSceneCanvas,
} from "@/components/cafe-scene-art";

const INK = "#43331F";
const INK_SOFT = "#8A7458";
const PAPER_TICKET = "#FFFDF6";
const EMERGENCY_BG = "#FDECEA";
const EMERGENCY_EDGE = "#D9534A";
const EMERGENCY_INK = "#991B1B";
const SLIP_EDGE = "#94A3B8";
const SERVED_GREEN = "#5E9E52";
const LABEL_INK = "#5A4630";

/** The slipping figure's dress: the same paper person, grey at the
 *  edges — the drawing's `.fig.grey` palette over their own look. */
function greyLook(person: { id: string; accentColor?: string }): PaperDinerLook {
  const base = paperDinerLookFor(person);
  return { ...base, skin: "#DDD2C0", hair: "#9A938A", shirt: "#A8A29A", pants: "#8A8378" };
}

function FigureLabel({ name, cx, feetY, u }: { name: string; cx: number; feetY: number; u: number }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: (cx - 9) * u, top: (feetY + 1.2) * u, width: 18 * u, alignItems: "center" }}
    >
      <View style={{ backgroundColor: "rgba(255,248,234,0.92)", borderRadius: 7, paddingHorizontal: 6, paddingVertical: 1.5 }}>
        <Text style={{ fontSize: 11, fontWeight: "700", color: LABEL_INK }} numberOfLines={1}>
          {name}
        </Text>
      </View>
    </View>
  );
}

function Chip({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}>
      <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 0.5, color }}>{label}</Text>
    </View>
  );
}

function TicketCard({
  ticket,
  stripCount,
  onServe,
}: {
  ticket: CafeTicket;
  stripCount: number | null;
  /** v343: SERVE — routes to the prayer session on this person. */
  onServe?: () => void;
}) {
  const slipping = ticket.slippingDays !== undefined;
  const emergency = ticket.kind === "emergency";
  const served = ticket.kind === "served";
  const band = emergency
    ? "#EF4444"
    : slipping
      ? SLIP_EDGE
      : ticket.kind === "praise"
        ? "#F59E0B"
        : served
          ? SERVED_GREEN
          : "#D8C9A3";
  return (
    <View
      style={{
        backgroundColor: emergency ? EMERGENCY_BG : served ? "#FDF6E9" : PAPER_TICKET,
        borderRadius: 9,
        paddingTop: 12,
        paddingHorizontal: 12,
        paddingBottom: 10,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: band,
        borderWidth: emergency ? 1.5 : slipping ? 1.5 : 0,
        borderColor: emergency ? EMERGENCY_EDGE : SLIP_EDGE,
        borderStyle: slipping && !emergency ? "dashed" : "solid",
        elevation: 2,
        shadowColor: "#3A2410",
        shadowOffset: { width: 1.5, height: 1.5 },
        shadowOpacity: 0.22,
        shadowRadius: 0,
      }}
    >
      {/* the pin, seated on the ticket's top edge */}
      <View
        style={{
          position: "absolute",
          top: -5,
          alignSelf: "center",
          width: 11,
          height: 11,
          borderRadius: 5.5,
          backgroundColor: emergency ? EMERGENCY_INK : served ? SERVED_GREEN : "#B4503C",
        }}
      />
      <Text
        style={{
          fontSize: emergency ? 18 : 15.5,
          fontWeight: "800",
          letterSpacing: 0.4,
          color: emergency ? EMERGENCY_INK : INK,
          textTransform: "uppercase",
        }}
        numberOfLines={2}
      >
        {ticket.name}
      </Text>
      {ticket.need ? (
        <Text
          style={{
            fontSize: 13.5,
            lineHeight: 18,
            marginTop: 3,
            color: emergency ? "#B4503C" : INK_SOFT,
            fontWeight: emergency ? "600" : "400",
          }}
          numberOfLines={2}
        >
          {ticket.need}
        </Text>
      ) : null}
      {(emergency || slipping || ticket.tomorrow || ticket.kind === "praise") && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 7 }}>
          {emergency && <Chip label="EMERGENCY" bg="#D9534A" color="#FFFFFF" />}
          {slipping && (
            <Chip
              label={`${ticket.slippingDays} ${ticket.slippingDays === 1 ? "DAY" : "DAYS"}`}
              bg={EMERGENCY_INK}
              color="#FFF6E2"
            />
          )}
          {ticket.kind === "praise" && <Chip label="PRAISE" bg="#FDE8C8" color="#92400E" />}
          {ticket.tomorrow && <Chip label="TOMORROW — FIRST" bg="#E2E8F0" color="#475569" />}
        </View>
      )}
      {!served && !ticket.tomorrow && onServe && (
        <Pressable
          onPress={onServe}
          accessibilityLabel={`Serve ${ticket.name} — pray for them now`}
          style={({ pressed }) => ({
            marginTop: 9,
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: emergency ? EMERGENCY_INK : "#8A4A34",
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 7,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <MaterialIcons name="front-hand" size={14} color="#FFF6E2" />
          <Text style={{ fontSize: 12.5, fontWeight: "800", letterSpacing: 0.8, color: "#FFF6E2" }}>
            {`SERVE ${ticket.firstName.toUpperCase()}`}
          </Text>
        </Pressable>
      )}
      {served && stripCount !== null && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
          <View
            style={{
              width: 19,
              height: 19,
              borderRadius: 9.5,
              backgroundColor: SERVED_GREEN,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="check" size={13} color="#FFFFFF" />
          </View>
          <View style={{ flexDirection: "row", gap: 3.5 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: i < stripCount ? SERVED_GREEN : "#E2D5B8",
                }}
              />
            ))}
          </View>
          <Text style={{ fontSize: 10.5, fontWeight: "700", letterSpacing: 0.6, color: "#7A6248" }}>
            {`PRAYED ${stripCount} OF THE LAST 7 DAYS`}
          </Text>
        </View>
      )}
    </View>
  );
}

export function CafeOrderBoard(props: {
  board: CafeBoard;
  peopleById: Map<string, Person>;
  today: string;
}) {
  const { board, peopleById, today } = props;
  const router = useRouter();
  return (
    <View style={{ marginTop: 16 }}>
      {/* the panel, standing on its two posts */}
      <View
        style={{
          backgroundColor: "#9A6A42",
          borderWidth: 3,
          borderColor: "#86603C",
          borderRadius: 14,
          padding: 12,
        }}
      >
        <View style={{ backgroundColor: "#8A4A34", borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", letterSpacing: 1.4, color: "#FFF6E2", textAlign: "center" }}>
            {"TODAY'S ORDERS"}
          </Text>
        </View>
        {board.ordersTotal > 0 && (
          <Text style={{ fontSize: 13, color: "#FFEFD2", textAlign: "center", marginTop: 8 }}>
            {`${board.ordersServed} served · ${board.ordersWaiting} waiting`}
          </Text>
        )}
        {board.tickets.length === 0 ? (
          <Text style={{ fontSize: 15, color: "#FFF6E2", textAlign: "center", paddingVertical: 16 }}>
            No orders today
          </Text>
        ) : (
          <ScrollView
            style={{ maxHeight: 460, marginTop: 10 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {board.tickets.map((ticket) => {
              const person = peopleById.get(ticket.personId);
              const stripCount =
                ticket.kind === "served" && person ? weekStripFor(person, today).count : null;
              return (
                <TicketCard
                  key={ticket.personId}
                  ticket={ticket}
                  stripCount={stripCount}
                  onServe={() => {
                    const route = serveRouteForTicket(ticket);
                    if (route) router.push(route);
                  }}
                />
              );
            })}
          </ScrollView>
        )}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 40, marginTop: -2 }}>
        <View style={{ width: 12, height: 20, backgroundColor: "#7A4A2E", borderRadius: 3 }} />
        <View style={{ width: 12, height: 20, backgroundColor: "#7A4A2E", borderRadius: 3 }} />
      </View>
    </View>
  );
}

// v343: three door spots (was two — the caps rise with the
// tables'; the board below still carries everyone).
const SLIP_SPOTS = [
  { cx: CAFE_LAYOUT.slipCx, feetY: CAFE_LAYOUT.slipFeetY },
  { cx: 20, feetY: CAFE_LAYOUT.slipFeetY },
  { cx: 37, feetY: CAFE_LAYOUT.slipFeetY },
] as const;

export function CafeScene(props: {
  width: number;
  phase: DayPhase;
  oven: CafeOvenState;
  board: CafeBoard;
  people: Person[];
  today: string;
  pawn: CustomPawn | null;
  weekLots: number;
  earnings: number;
  buildingId?: string;
}) {
  const { width, phase, oven, board, people, today, pawn, weekLots, earnings, buildingId } = props;
  const router = useRouter();
  const u = width / CAFE_SCENE_COLS;
  const sceneH = CAFE_SCENE_ROWS * u;

  const peopleById = useMemo(() => new Map(people.map((p) => [String(p.id), p])), [people]);
  const servedTickets = board.tickets.filter((t) => t.kind === "served");
  const seated = servedTickets.slice(0, CAFE_LAYOUT.tablesX.length);
  const slippingFigures = board.tickets
    .filter((t) => t.slippingDays !== undefined && t.kind !== "served")
    .slice(0, SLIP_SPOTS.length);
  const miniTickets = board.tickets.filter((t) => t.kind !== "served").slice(0, 3);
  const bp = CAFE_LAYOUT.boardPanel;

  return (
    <View>
      {/* ── the vignette ─────────────────────────────────────────── */}
      <View
        style={{
          width,
          height: sceneH,
          borderRadius: 18,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(90,60,20,0.25)",
        }}
      >
        <CafeSceneCanvas
          phase={phase}
          oven={oven}
          servedCount={seated.length}
          anyoneServed={servedTickets.length > 0}
          weekLots={weekLots}
          earnings={earnings}
          width={width}
        />

        {/* the served, at their tables — real paper figures in their
            own looks, warm with the day's prayer */}
        {seated.map((ticket, i) => {
          const person = peopleById.get(ticket.personId);
          const look = paperDinerLookFor(person ?? { id: ticket.personId, accentColor: ticket.accentColor });
          const cx = CAFE_LAYOUT.tablesX[i] + CAFE_LAYOUT.servedDx;
          const feetY = CAFE_LAYOUT.servedFeetY;
          const fw = 10 * u;
          return (
            <View key={ticket.personId} pointerEvents="none">
              <View
                style={{
                  position: "absolute",
                  left: (cx - 6.4) * u,
                  top: (feetY - 13.4) * u,
                  width: 12.8 * u,
                  height: 12.8 * u,
                  borderRadius: 6.4 * u,
                  backgroundColor: "#FFC65C",
                  opacity: 0.32,
                }}
              />
              <View style={{ position: "absolute", left: (cx - 5) * u, top: (feetY - 16) * u }}>
                <PaperStandingVillager look={look} width={fw} />
              </View>
              <FigureLabel name={ticket.firstName} cx={cx} feetY={feetY} u={u} />
            </View>
          );
        })}

        {/* someone slipping stands at the café door — a full paper
            figure, grey at the edges. An invitation, never a scolding. */}
        {slippingFigures.map((ticket, i) => {
          const spot = SLIP_SPOTS[i];
          const person = peopleById.get(ticket.personId);
          const look = greyLook(person ?? { id: ticket.personId, accentColor: ticket.accentColor });
          const fw = 10 * u;
          return (
            <View key={ticket.personId} pointerEvents="none">
              <View style={{ position: "absolute", left: (spot.cx - 5) * u, top: (spot.feetY - 16) * u }}>
                <PaperStandingVillager look={look} width={fw} />
              </View>
              <FigureLabel name={ticket.firstName} cx={spot.cx} feetY={spot.feetY} u={u} />
            </View>
          );
        })}

        {/* the hero, at the board — a villager-equal in normal
            clothes, reading today's orders */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: (CAFE_LAYOUT.heroFeet.x - 5.2) * u,
            top: (CAFE_LAYOUT.heroFeet.y - 16) * u,
          }}
        >
          {pawn ? (
            <PaperHeroFigure pawn={pawn} unit={(16 * u) / 17} />
          ) : (
            <PaperStandingVillager look={paperDinerLookFor({ id: "the-hero" })} width={10 * u} />
          )}
        </View>

        {/* the board's face in the vignette: its head strip and the
            first tickets pinned on it (the readable board stands
            below — every ticket, at full size) */}
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: bp.x * u, top: bp.y * u, width: bp.w * u, height: 3.8 * u }}
        >
          <Text
            style={{
              fontSize: 8.5,
              fontWeight: "800",
              letterSpacing: 0.8,
              color: "#FFF6E2",
              textAlign: "center",
              lineHeight: 3.8 * u,
            }}
            numberOfLines={1}
          >
            {"TODAY'S ORDERS"}
          </Text>
        </View>
        {miniTickets.map((ticket, i) => (
          <View
            key={ticket.personId}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: (bp.x + 0.9) * u,
              top: (bp.y + 4.4 + i * 4.4) * u,
              width: (bp.w - 1.8) * u,
              backgroundColor: ticket.kind === "emergency" ? EMERGENCY_BG : PAPER_TICKET,
              borderRadius: 2,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 3,
              paddingVertical: 2,
            }}
          >
            <View
              style={{
                width: 3,
                alignSelf: "stretch",
                borderRadius: 1.5,
                backgroundColor:
                  ticket.kind === "emergency"
                    ? "#EF4444"
                    : ticket.slippingDays !== undefined
                      ? SLIP_EDGE
                      : ticket.kind === "praise"
                        ? "#F59E0B"
                        : "#D8C9A3",
                marginRight: 3,
              }}
            />
            <Text
              style={{
                flex: 1,
                fontSize: 9.5,
                fontWeight: "700",
                color: ticket.kind === "emergency" ? EMERGENCY_INK : INK,
              }}
              numberOfLines={1}
            >
              {ticket.firstName}
            </Text>
            {ticket.slippingDays !== undefined && (
              <Text style={{ fontSize: 8, fontWeight: "800", color: "#64748B" }}>{`${ticket.slippingDays}d`}</Text>
            )}
          </View>
        ))}
        {miniTickets.length === 0 && board.ordersTotal > 0 && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: (bp.x + 0.9) * u,
              top: (bp.y + 4.4) * u,
              width: (bp.w - 1.8) * u,
              backgroundColor: PAPER_TICKET,
              borderRadius: 2,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              paddingVertical: 2.5,
            }}
          >
            <MaterialIcons name="check" size={10} color={SERVED_GREEN} />
            <Text style={{ fontSize: 9, fontWeight: "700", color: SERVED_GREEN }}>All served</Text>
          </View>
        )}

        {/* the week lot's sign, on its post at the street's end */}
        {weekLots >= 1 && (
          <View
            pointerEvents="none"
            style={{ position: "absolute", left: (CAFE_LAYOUT.weekLot.x - 1.5) * u, top: 44.6 * u, width: (CAFE_LAYOUT.weekLot.w + 3) * u, alignItems: "center" }}
          >
            <View
              style={{
                backgroundColor: "#FFF8EA",
                borderWidth: 1,
                borderColor: "#5B4632",
                borderRadius: 4,
                paddingHorizontal: 5,
                paddingVertical: 2.5,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: "800", letterSpacing: 0.4, color: "#92400E" }}>
                {`WEEK ${weekLots} COMPLETE`}
              </Text>
              <Text style={{ fontSize: 8, color: "#7A5230", marginTop: 0.5 }}>New lot — yours</Text>
            </View>
            <View style={{ width: 3, height: 8.4 * u - 30, backgroundColor: "#7A4A2E" }} />
          </View>
        )}
      </View>

      {/* the day's earnings, piled by the register — waiting, as ever */}
      {earnings > 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 12 }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: "#F2C14E",
              borderWidth: 1.5,
              borderColor: "#B8860B",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="monetization-on" size={14} color="#8A6D1F" />
          </View>
          <Text style={{ fontSize: 14.5, fontWeight: "600", color: LABEL_INK }}>
            {`${formatWholeCoins(earnings)} coins waiting at this diner`}
          </Text>
        </View>
      )}

      {/* ── the board, up close — every ticket, readable ─────────── */}
      <CafeOrderBoard board={board} peopleById={peopleById} today={today} />

      {/* the diner's own door: its interior (and its coffee) live on,
          one step inside */}
      {buildingId ? (
        <Pressable
          onPress={() => router.push(`/restaurant-interior?buildingId=${buildingId}`)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 18,
            paddingVertical: 12,
          }}
        >
          <MaterialIcons name="restaurant" size={20} color="#7A4A2E" />
          <Text style={{ fontSize: 15.5, fontWeight: "700", color: "#7A4A2E" }}>Step inside the diner</Text>
          <MaterialIcons name="chevron-right" size={20} color="#7A4A2E" />
        </Pressable>
      ) : null}
    </View>
  );
}
