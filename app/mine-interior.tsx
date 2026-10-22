// The Mine — the Dig Wall (v168; warmth pass v169).
//
// Through the cave mouth under the Great Peak — in out of the wild,
// lantern light on warm stone (the entrance shaft glows, v169: the
// cave should FEEL safe, a refuge, never a dungeon — and it has no
// name beyond "The Mine"): four strata of rock
// faces (Stone / Iron / Gold / The Deep), each a tap. Faces crack as
// you work them, break into ore for the satchel, and settle back over
// a few hours — by timestamp, never by timer (lib/mountain settles on
// open). The pickaxe ladder climbs Wood → Stone → Iron → Gold with
// coins, then Diamond behind prestige and the Crown Pick behind a
// Crown. Ore sells for coins through the canonical ledger, and only
// through it. Prayer stays the town's engine; the mine is a supplement.
// No emojis — SVG paper art and MaterialIcons only.

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, Path, Polygon, Rect } from "react-native-svg";
import { InteriorHeader } from "@/components/interior-shell";
import { PaperGlowDisc, PaperPulse } from "@/components/paper-interior";
import { pickPeople } from "@/components/activity-figures";
import {
  applyCoinsDelta,
  formatCoins,
  loadCoinsRecord,
  prayedTodayPeople,
  type HometownCoins,
  type PrayedPerson,
} from "@/lib/hometown";
import { loadPrestigeLevel, loadPrestigeState } from "@/lib/prestige";
import { formatCooldown } from "@/lib/gathering-places";
import { paperDinerLookFor } from "@/lib/paper-interior";
import {
  DAILY_FACE_CAP,
  FACES_PER_BAND,
  MINE_BANDS,
  MINE_TITLE,
  ORE_KINDS,
  ORE_PRICES,
  PICKAXES,
  applySellAll,
  bandIndexForFace,
  canPickBand,
  effectiveHits,
  faceStatus,
  loadMineState,
  mineTap,
  pickGateMet,
  pickPurchaseCheck,
  pickaxeFor,
  satchelValue,
  saveMineState,
  type MineGates,
  type MineState,
  type OreKind,
} from "@/lib/mountain";

const BG = "#20142E";
const INK = "#2A1A33";
const PANEL = "#2E2140";
const CREAM = "#F7F0DE";
const DIM = "#B8A9CC";
const GOLD = "#C9963C";

/* ------------------------------------------------------------------ */
/* Small paper glyphs                                                  */
/* ------------------------------------------------------------------ */

/** A pickaxe in a 24-box, head in the tier's color. */
function PickIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.5 6.5 C 8 2.8, 16 2.8, 20.5 6.5 C 15 5, 9 5, 3.5 6.5 Z" fill={color} />
      <Path d="M11.2 5.2 L14.8 18.6" stroke="#8A5A2B" strokeWidth={2.1} strokeLinecap="round" />
    </Svg>
  );
}

/** An ore nugget / gem in the satchel's colors. */
function OreGlyph({ kind, size = 16 }: { kind: OreKind; size?: number }) {
  if (kind === "diamond") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 3 L19 10 L12 21 L5 10 Z" fill="#9BE8F5" />
        <Path d="M5 10 H19 M12 21 L8.5 10 L12 3 L15.5 10 L12 21" fill="none" stroke="#CFF7FF" strokeWidth={1.1} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon points="7,5 15,3.4 20,8.6 18.4,16.6 10,20 4.4,14.6" fill={kind === "gold" ? "#F2B33D" : "#C96F3F"} />
      <Polygon points="7,5 12,9 10,20 4.4,14.6" fill={kind === "gold" ? "#FBBF24" : "#D97E4A"} opacity={0.75} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* One rock face                                                       */
/* ------------------------------------------------------------------ */

/** Deterministic fleck spots per band, in a 62x46 face box (the
 *  mockup's own layouts, nudged per slot so no two faces match). */
const FLECKS: Record<number, Array<[number, number]>> = {
  0: [[18, 20], [42, 32]],
  1: [[16, 12], [38, 30], [48, 14], [10, 34]],
  2: [[18, 14], [40, 28], [50, 12]],
  3: [[20, 12], [44, 30], [30, 36]],
};

function FaceArt({ bandIndex, slot, status, hitsLeft, hitsMax }: {
  bandIndex: number;
  slot: number;
  status: "ready" | "cracked" | "resting";
  hitsLeft: number | null;
  hitsMax: number;
}) {
  const band = MINE_BANDS[bandIndex];
  const fleckColor = bandIndex === 1 ? "#C96F3F" : bandIndex === 2 ? "#FBBF24" : bandIndex === 3 ? "#9BE8F5" : "#8D8D99";
  const flecks = (FLECKS[bandIndex] ?? []).map(([x, y], i) => [
    Math.min(56, Math.max(5, x + ((slot * 7 + i * 3) % 5) - 2)),
    Math.min(40, Math.max(5, y + ((slot * 5 + i * 2) % 5) - 2)),
  ] as [number, number]);
  const crackDepth = status === "cracked" ? (hitsLeft != null && hitsLeft <= Math.ceil(hitsMax / 2) ? 2 : 1) : 0;
  return (
    <Svg width={62} height={46} viewBox="0 0 62 46">
      <Rect x={1} y={1} width={60} height={44} rx={11} fill={status === "resting" ? "#5F4E47" : band.faceColor} />
      {bandIndex === 3 &&
        flecks.map(([x, y], i) => (
          <Path key={i} d={`M${x} ${y - 5} l3.4 4.6 -3.4 6 -3.4 -6 Z`} fill={fleckColor} opacity={status === "resting" ? 0.25 : 0.95} />
        ))}
      {bandIndex !== 3 &&
        flecks.map(([x, y], i) =>
          bandIndex === 0 ? (
            <Circle key={i} cx={x} cy={y} r={2.2} fill={fleckColor} opacity={status === "resting" ? 0.25 : 0.8} />
          ) : (
            <Polygon key={i} points={`${x - 4},${y + 2} ${x + 1},${y - 3} ${x + 5},${y + 1} ${x},${y + 4}`} fill={fleckColor} opacity={status === "resting" ? 0.25 : 0.95} />
          )
        )}
      {bandIndex === 2 && status !== "resting" && flecks.map(([x, y], i) => (
        <Circle key={`s${i}`} cx={x} cy={y} r={1.4} fill="#FFE9A8" />
      ))}
      {crackDepth >= 1 && (
        <Path d="M33 2 L27 13 L35 21 L29 33" fill="none" stroke="#4A3548" strokeWidth={1.8} strokeLinecap="round" />
      )}
      {crackDepth >= 2 && (
        <Path d="M14 4 L19 14 L13 24 M48 6 L43 16 L49 27" fill="none" stroke="#4A3548" strokeWidth={1.5} strokeLinecap="round" />
      )}
      {status === "resting" && (
        <Rect x={1} y={1} width={60} height={44} rx={11} fill="none" stroke="#CBB8A5" strokeWidth={1.6} strokeDasharray="5 4" />
      )}
    </Svg>
  );
}

/** The decorative villager at work in the iron band (mockup dressing —
 *  presence only; mining is the hero's own taps, no job system). */
function DressingMiner({ person }: { person: PrayedPerson }) {
  const look = paperDinerLookFor({ id: String(person.id), accentColor: person.accentColor });
  return (
    <Svg width={34} height={44} viewBox="0 0 34 44">
      <Circle cx={13} cy={9} r={5.5} fill={look.skin} />
      <Path d="M6 38 V24 a7 7 0 0 1 14 0 V38 Z" fill={look.shirt} />
      <Path d="M19 20 L27 12" stroke="#9A6A3B" strokeWidth={2.6} strokeLinecap="round" />
      <Path d="M27 12 L31 17" stroke="#9C93AC" strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* The screen                                                          */
/* ------------------------------------------------------------------ */

export default function MineInteriorScreen() {
  const [mine, setMine] = useState<MineState | null>(null);
  const [coins, setCoins] = useState<HometownCoins>({ balance: 0, lifetimeEarned: 0 });
  const [gates, setGates] = useState<MineGates>({ totalPrestiges: 0, crowns: 0 });
  const [people, setPeople] = useState<PrayedPerson[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const refresh = useCallback(async () => {
    const [m, c, pState, crowns, ppl] = await Promise.all([
      loadMineState(),
      loadCoinsRecord(),
      loadPrestigeState(),
      loadPrestigeLevel(),
      prayedTodayPeople().catch(() => [] as PrayedPerson[]),
    ]);
    setMine(m);
    setCoins(c);
    setGates({ totalPrestiges: pState.totalPrestiges, crowns });
    setPeople(ppl);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const handleTapFace = useCallback(
    (faceIndex: number) => {
      if (!mine) return;
      const now = Date.now();
      const { state, outcome } = mineTap(mine, faceIndex, now, Math.random());
      setMine(state);
      void saveMineState(state);
      const band = MINE_BANDS[bandIndexForFace(faceIndex)];
      if (outcome.kind === "broke") {
        const parts = ORE_KINDS.filter((k) => (outcome.yield[k] ?? 0) > 0).map(
          (k) => `+${outcome.yield[k]} ${k}`
        );
        showToast(parts.length ? parts.join("  ") : "The face crumbles");
      } else if (outcome.kind === "locked") {
        Alert.alert(
          "Too deep for this pick",
          `The ${band.name} band needs the ${pickaxeFor(outcome.requiredPick).name}. Better rock takes a better pick — the ladder is on the right.`
        );
      } else if (outcome.kind === "resting") {
        Alert.alert(
          "Still settling",
          `This face is filling back in, the way the mountain heals. Whole again in about ${formatCooldown(Math.max(0, outcome.readyAt - now))}.`
        );
      } else if (outcome.kind === "cap") {
        Alert.alert(
          "The mine rests",
          `You've mined today's ${DAILY_FACE_CAP} faces. The wall settles overnight — come back tomorrow.`
        );
      }
    },
    [mine, showToast]
  );

  const handleBuyPick = useCallback(
    (tier: number) => {
      if (!mine) return;
      const pick = pickaxeFor(tier);
      const check = pickPurchaseCheck(mine.pickTier, tier, gates);
      if (!check.ok) {
        if (check.reason === "order") {
          Alert.alert("One rung at a time", `The ${pickaxeFor(mine.pickTier + 1).name} comes first — the ladder is climbed in order.`);
        } else if (check.reason === "prestige") {
          Alert.alert("Behind Begin Again", "The Diamond Pick waits behind prestige. Begin Again once — any fast — and the deep way opens.");
        } else if (check.reason === "crown") {
          Alert.alert("Crown work", "The Crown Pick belongs to the Crown. Earn a Crown — a 365-day fast, then Begin Again — and it can be yours.");
        }
        return;
      }
      if (coins.balance < check.cost) {
        Alert.alert("Not enough coins", `${pick.name} costs ${formatCoins(check.cost)} coins. You have ${formatCoins(coins.balance)}.`);
        return;
      }
      Alert.alert(`Buy the ${pick.name}?`, `${formatCoins(check.cost)} coins. It cracks deeper rock — and lesser rock faster.`, [
        { text: "Not yet", style: "cancel" },
        {
          text: "Buy",
          onPress: () => {
            void (async () => {
              const next = await applyCoinsDelta(-check.cost, "dime");
              setCoins(next);
              setMine((prev) => {
                if (!prev) return prev;
                const m = { ...prev, pickTier: tier };
                void saveMineState(m);
                return m;
              });
              showToast(`${pick.name} — yours`);
            })();
          },
        },
      ]);
    },
    [mine, gates, coins.balance, showToast]
  );

  const handleSellAll = useCallback(() => {
    if (!mine) return;
    const { state, coins: total } = applySellAll(mine);
    if (total <= 0) return;
    void (async () => {
      const next = await applyCoinsDelta(total, "cent");
      setCoins(next);
      setMine(state);
      await saveMineState(state);
      showToast(`Satchel sold — +${formatCoins(total)} coins`);
    })();
  }, [mine, showToast]);

  const dressingMiner = pickPeople(people, "mine|dressing", 1)[0];
  const sellTotal = mine ? satchelValue(mine.satchel) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <InteriorHeader icon="terrain" iconColor={GOLD} title={MINE_TITLE} coins={coins} bg={BG} textColor={CREAM} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={{ color: DIM, fontSize: 13, lineHeight: 19, marginHorizontal: 16, marginBottom: 12 }}>
          Come in out of the wild — the lanterns are lit, the stone is warm, and the rock provides. Tap a face to
          mine it with your pick — iron near the top, gold deeper, diamonds sleeping in the Deep. Faces settle
          back over a few hours.
        </Text>

        {toast && (
          <View style={{ marginHorizontal: 16, marginBottom: 10, backgroundColor: "#3B2C14", borderColor: GOLD, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: "center" }}>
            <Text style={{ color: "#FDE68A", fontWeight: "800", fontSize: 14 }}>{toast}</Text>
          </View>
        )}

        {!mine ? (
          <Text style={{ color: DIM, textAlign: "center", marginTop: 24 }}>Lighting the lanterns…</Text>
        ) : (
          <View style={{ flexDirection: "row", marginHorizontal: 16 }}>
            {/* the dig wall */}
            <View style={{ flex: 1, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(24,8,44,.6)" }}>
              {/* surface strip — grass and the shaft you came down.
                  The shaft mouth carries the cave's welcome (v169):
                  warm light pooled where you step in, breathing on
                  the kit's sine — coming in out of the wild, not
                  descending into a dungeon. */}
              <View style={{ height: 20, backgroundColor: "#7CB35C", position: "relative" }}>
                <View style={{ position: "absolute", left: "42%", top: 8, width: 34, height: 12, backgroundColor: "#241430" }} />
                <PaperPulse duration={2800} min={0.6} max={1} style={{ position: "absolute", left: "42%", marginLeft: -14, top: -16 }}>
                  <PaperGlowDisc size={62} color="#FFB84D" opacity={0.65} />
                </PaperPulse>
                {/* two lantern dots keeping the shaft mouth */}
                <View style={{ position: "absolute", left: "42%", marginLeft: -5, top: 9, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FFD98A" }} />
                <View style={{ position: "absolute", left: "42%", marginLeft: 34, top: 9, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FFD98A" }} />
              </View>
              {MINE_BANDS.map((band, bandIndex) => {
                const locked = !canPickBand(mine, bandIndex * FACES_PER_BAND);
                return (
                  <View key={band.id} style={{ backgroundColor: band.color, height: 84, position: "relative", justifyContent: "center" }}>
                    {/* rotated band label, as in the mockup */}
                    <View style={{ position: "absolute", left: -29, top: 33, width: 76, alignItems: "center", transform: [{ rotate: "-90deg" }] }}>
                      <Text style={{ color: CREAM, fontSize: 9, fontWeight: "bold", letterSpacing: 2.2, opacity: 0.92 }}>{band.name.toUpperCase()}</Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-evenly", marginLeft: 22, marginRight: bandIndex === 1 && dressingMiner ? 30 : 4 }}>
                      {Array.from({ length: FACES_PER_BAND }).map((_, slot) => {
                        const faceIndex = bandIndex * FACES_PER_BAND + slot;
                        const face = mine.faces[faceIndex];
                        const status = faceStatus(mine, faceIndex);
                        return (
                          <Pressable key={faceIndex} onPress={() => handleTapFace(faceIndex)} style={{ opacity: locked ? 0.55 : 1 }}>
                            <View style={{ position: "relative", width: 62, height: 46 }}>
                              <View style={{ position: "absolute", left: 2.5, top: 3, width: 62, height: 46, borderRadius: 12, backgroundColor: "rgba(24,8,44,.3)" }} />
                              <FaceArt
                                bandIndex={bandIndex}
                                slot={slot}
                                status={status}
                                hitsLeft={face.hitsLeft}
                                hitsMax={effectiveHits(band, mine.pickTier)}
                              />
                              {locked && (
                                <View style={{ position: "absolute", left: 0, top: 0, width: 62, height: 46, alignItems: "center", justifyContent: "center" }}>
                                  <MaterialIcons name="lock" size={18} color={CREAM} />
                                </View>
                              )}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                    {bandIndex === 1 && dressingMiner && (
                      <View pointerEvents="none" style={{ position: "absolute", right: 2, bottom: 2 }}>
                        <DressingMiner person={dressingMiner} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* the pickaxe ladder */}
            <View style={{ width: 96, marginLeft: 10, backgroundColor: PANEL, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 8, borderWidth: 1, borderColor: "rgba(24,8,44,.6)" }}>
              <Text style={{ color: CREAM, fontWeight: "800", fontSize: 12, marginBottom: 8, textAlign: "center" }}>Pickaxes</Text>
              {PICKAXES.map((pick) => {
                const owned = pick.tier <= mine.pickTier;
                const current = pick.tier === mine.pickTier;
                const isNext = pick.tier === mine.pickTier + 1;
                const gateMet = pickGateMet(pick.tier, gates);
                return (
                  <Pressable
                    key={pick.tier}
                    onPress={() => {
                      if (!owned) handleBuyPick(pick.tier);
                    }}
                    style={{
                      paddingVertical: 7,
                      paddingHorizontal: 6,
                      borderRadius: 10,
                      marginBottom: 6,
                      backgroundColor: current ? "rgba(201,150,60,.22)" : "rgba(255,255,255,.05)",
                      borderWidth: current ? 1 : 0,
                      borderColor: GOLD,
                      opacity: !owned && !isNext && !gateMet ? 0.65 : 1,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <PickIcon color={pick.color} size={18} />
                      <Text style={{ color: CREAM, fontSize: 10.5, fontWeight: "700", marginLeft: 4, flex: 1 }} numberOfLines={1}>
                        {pick.name.replace(" Pick", "")}
                      </Text>
                    </View>
                    {current ? (
                      <Text style={{ color: "#FDE68A", fontSize: 9.5, fontWeight: "800", marginTop: 3 }}>Yours</Text>
                    ) : owned ? (
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                        <MaterialIcons name="check" size={11} color={DIM} />
                        <Text style={{ color: DIM, fontSize: 9.5, marginLeft: 2 }}>Owned</Text>
                      </View>
                    ) : pick.gate !== "none" && !gateMet ? (
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                        <MaterialIcons name={pick.gate === "crown" ? "workspace-premium" : "lock"} size={11} color={DIM} />
                        <Text style={{ color: DIM, fontSize: 9.5, marginLeft: 2 }}>{pick.gate === "crown" ? "Crown" : "Prestige"}</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                        <MaterialIcons name="monetization-on" size={11} color="#FDE68A" />
                        <Text style={{ color: "#FDE68A", fontSize: 9.5, fontWeight: "700", marginLeft: 2 }}>{formatCoins(pick.cost)}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
              <Text style={{ color: DIM, fontSize: 9, lineHeight: 13, textAlign: "center", marginTop: 2 }}>
                Deeper bands need the pick named for the rock above them.
              </Text>
            </View>
          </View>
        )}

        {/* the satchel */}
        {mine && (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 14, backgroundColor: PANEL, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(24,8,44,.6)" }}>
              <Text style={{ color: CREAM, fontWeight: "800", fontSize: 13, marginRight: 8 }}>Satchel</Text>
              {ORE_KINDS.map((k) => (
                <View key={k} style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}>
                  <OreGlyph kind={k} size={17} />
                  <Text style={{ color: CREAM, fontSize: 13, fontWeight: "700", marginLeft: 4 }}>× {mine.satchel[k]}</Text>
                  <Text style={{ color: DIM, fontSize: 10, marginLeft: 3 }}>@{ORE_PRICES[k]}</Text>
                </View>
              ))}
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={handleSellAll}
                disabled={sellTotal <= 0}
                style={{ backgroundColor: sellTotal > 0 ? GOLD : "rgba(255,255,255,.12)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
              >
                <Text style={{ color: sellTotal > 0 ? INK : DIM, fontWeight: "800", fontSize: 12.5 }}>
                  Sell all{sellTotal > 0 ? ` · ${formatCoins(sellTotal)}` : ""}
                </Text>
              </Pressable>
            </View>
            <Text style={{ color: DIM, fontSize: 12, textAlign: "center", marginTop: 10 }}>
              Faces mined today: {mine.minedToday} / {DAILY_FACE_CAP} · Your pick: {pickaxeFor(mine.pickTier).name}
            </Text>
            <Text style={{ color: DIM, fontSize: 12, textAlign: "center", marginTop: 6, paddingHorizontal: 40, lineHeight: 17 }}>
              Mined faces settle back over a few hours. And remember — prayer still runs this town. The mine just helps.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
