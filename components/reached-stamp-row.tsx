import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useId, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { CoinStampArt, PostageStampArt } from "@/components/stamp-design-art";
import { useColors } from "@/hooks/use-colors";
import { formatIsoDateForDisplay, relationshipColors, type Person } from "@/lib/prayercircle-data";
import { getUnlockedReachedStampSkins, normalizeReachedStampSkin, REACHED_STAMP_SKIN_STORAGE_KEY, REACHED_STAMP_SKINS, removeReachedStamp, updateReachedStamp, type ReachedStamp, type ReachedStampSkin } from "@/lib/reached-stamps";
import { loadXPState } from "@/lib/xp-engine";

type StampShape = "circle" | "oval" | "rounded-rectangle";
type StampVariation = { rotation: number; radius: number; dash: string; markOffset: number; shape: StampShape };

function hashStamp(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) | 0;
  return Math.abs(hash);
}

export function getStampVariation(stamp: ReachedStamp): StampVariation {
  const hash = hashStamp(`${stamp.personId}:${stamp.personName}`);
  return {
    rotation: -4 + (hash % 9),
    radius: 52 + (hash % 3),
    dash: hash % 2 === 0 ? "2 3" : "1 4",
    markOffset: hash % 18,
    shape: (["circle", "oval", "rounded-rectangle"] as StampShape[])[hash % 3],
  };
}

function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Stamp skins — the REAL redesign (2026-10-21). Jonathan caught the  */
/* first pass twice: Postmark was Classic at 0.3 opacity, Linen was    */
/* Classic plus two hair-thin lines at 0.2 — indistinguishable at the  */
/* collection grid's size, which made the skins a lie. Every skin now  */
/* carries a signature that reads at a glance at 124 units:            */
/*   classic  — the clean reference: rings, specks, text. Nothing else.*/
/*   postmark — four bold cancellation waves crossing the FULL stamp   */
/*              plus a large, legible circular date seal overlapping   */
/*              the edge, and heavier broken-ink texture.              */
/*   linen    — chunky plain-weave thread bundles (5–8 units, soft     */
/*              feathered edges, flax/cream tones) plus bold slubs,    */
/*              clipped inside the stamp's shape, a stitched inner     */
/*              border, a soft cloth halo and a faint offset ghost     */
/*              of the rings: a stamp ON fabric.                       */
/*   sticker  — a commemorative POSTAGE stamp (2026-10-21):          */
/*              perforated white body, a framed Christian picture     */
/*              assigned per person, name/date printed in the margin. */
/*   coin     — the stamp struck as a gold coin (2026-10-21): reeded  */
/*              rim, the person's emblem in relief on the face, name  */
/*              and REACHED · year curved as the rim legend. It took  */
/*              Embossed's unlock slot — every relief attempt at an    */
/*              "embossed" stamp read as something else (stacked       */
/*              stamps, then coins), so the coin became the skin.     */
/* ------------------------------------------------------------------ */

/** Cancellation waves for the postmark: full-width sweeps, edge to edge. */
const POSTMARK_WAVE_PATHS = [
  "M -2 40 Q 20 31 42 40 T 86 40 T 126 40",
  "M -2 50 Q 20 41 42 50 T 86 50 T 126 50",
  "M -2 60 Q 20 51 42 60 T 86 60 T 126 60",
  "M -2 70 Q 20 61 42 70 T 86 70 T 126 70",
] as const;
const POSTMARK_WAVE_WIDTHS = [2.3, 1.9, 1.6, 1.3] as const;

/** Linen weave — plain-weave at THREAD scale, hand-loomed.
 *  Thread BUNDLES 5–8 units wide (never hairlines): chunky enough to
 *  read as cloth at the collection grid's 124-unit size. Widths and
 *  opacities follow a fixed irregular pattern — no bundle repeats its
 *  neighbour's width, and the vertical (warp) pass is rotated against
 *  the horizontal (weft) pass — so the weave never resolves into a
 *  machined uniform grid / graph paper. Bundles are FILLED rects laid
 *  with a 1-unit overlap, so their edges feather by translucency
 *  instead of ending in a hard line, and they alternate between the
 *  stamp ink (at whisper opacity) and flax / cream fibre tones. */
const LINEN_FLAX = "#D9C69C";
const LINEN_CREAM = "#EEE1C2";
const LINEN_BUNDLE_WIDTHS = [7, 5, 6, 8, 5, 7, 6, 5, 8, 6, 7, 5, 6, 8, 5, 7, 6, 5] as const;
const LINEN_BUNDLE_OPACITIES = [0.14, 0.09, 0.17, 0.11, 0.15, 0.1, 0.13, 0.08, 0.16, 0.12, 0.15, 0.09, 0.14, 0.11, 0.16, 0.1, 0.13, 0.09] as const;

type LinenBundle = { offset: number; width: number; opacity: number };

function buildLinenBundles(widths: readonly number[], startOffset: number): LinenBundle[] {
  let offset = startOffset;
  return widths.map((width, index) => {
    const bundle: LinenBundle = { offset, width, opacity: LINEN_BUNDLE_OPACITIES[index % LINEN_BUNDLE_OPACITIES.length] };
    offset += width;
    return bundle;
  });
}

/** Horizontal weft bundles, laid from the top of the stamp. */
const LINEN_H_BUNDLES: LinenBundle[] = buildLinenBundles(LINEN_BUNDLE_WIDTHS, 4);
/** Vertical warp bundles — the same irregular widths, rotated by
 *  three, so warp/weft crossings never form identical squares. */
const LINEN_V_BUNDLES: LinenBundle[] = buildLinenBundles([...LINEN_BUNDLE_WIDTHS.slice(3), ...LINEN_BUNDLE_WIDTHS.slice(0, 3)], 4);

/** Slubs — linen's signature: a few thicker, imperfect threads laid
 *  ACROSS the weave. Slightly wavy (Q/T curves, never straight),
 *  round-capped, each a different length / weight / opacity — clearly
 *  visible at collection size without shouting. */
const LINEN_SLUBS = [
  { d: "M 16 39 Q 39 37.2 62 39.1 T 101 38.3", width: 3.4, opacity: 0.3 },
  { d: "M 24 73 Q 47 71.4 70 73.3 T 109 72.5", width: 2.6, opacity: 0.24 },
  { d: "M 12 95 Q 33 93.6 55 95.4 T 87 94.6", width: 3.8, opacity: 0.27 },
] as const;

/** The stamp's outline rings (outer solid + inner ring). The inner
 *  ring is the dashed classic ring — or, with `stitch`, the linen
 *  skin's stitched border: short thread dashes, slightly irregular. */
function StampRings({ ink, variation, stitch = false }: { ink: string; variation: StampVariation; stitch?: boolean }) {
  const innerDash = stitch ? "3 2.2" : variation.dash;
  const innerWidth = stitch ? 1.6 : 1.2;
  const innerOpacity = stitch ? 0.95 : 0.85;
  const innerOffset = stitch ? variation.markOffset % 3 : undefined;
  if (variation.shape === "circle") {
    return (
      <>
        <Circle cx="62" cy="62" r={variation.radius} fill="none" stroke={ink} strokeWidth={2.2} opacity={0.9} />
        <Circle cx="62" cy="62" r={variation.radius - 6} fill="none" stroke={ink} strokeWidth={innerWidth} strokeDasharray={innerDash} strokeDashoffset={innerOffset} opacity={innerOpacity} />
      </>
    );
  }
  if (variation.shape === "oval") {
    return (
      <>
        <Ellipse cx="62" cy="62" rx="56" ry="48" fill="none" stroke={ink} strokeWidth={2.2} opacity={0.9} />
        <Ellipse cx="62" cy="62" rx="50" ry="42" fill="none" stroke={ink} strokeWidth={innerWidth} strokeDasharray={innerDash} strokeDashoffset={innerOffset} opacity={innerOpacity} />
      </>
    );
  }
  return (
    <>
      <Rect x="8" y="14" width="108" height="96" rx="19" fill="none" stroke={ink} strokeWidth={2.2} opacity={0.9} />
      <Rect x="14" y="20" width="96" height="84" rx="14" fill="none" stroke={ink} strokeWidth={innerWidth} strokeDasharray={innerDash} strokeDashoffset={innerOffset} opacity={innerOpacity} />
    </>
  );
}

/** The stamp's own artwork in a single color: rings, the uneven-ink
 *  specks, and the name / date / note text. Shared by classic,
 *  postmark and linen — postage and coin draw their own art. */
function StampArtwork({ stamp, ink, variation, stitch = false }: { stamp: ReachedStamp; ink: string; variation: StampVariation; stitch?: boolean }) {
  const shortName = stamp.personName.length > 18 ? `${stamp.personName.slice(0, 17)}…` : stamp.personName;
  const shortNote = stamp.note && stamp.note.length > 17 ? `${stamp.note.slice(0, 16)}…` : stamp.note;
  return (
    <G>
      <StampRings ink={ink} variation={variation} stitch={stitch} />
      <Circle cx={24 + variation.markOffset} cy="29" r="1.3" fill={ink} opacity={0.22} />
      <Circle cx="96" cy={84 + (variation.markOffset % 13)} r="1.1" fill={ink} opacity={0.2} />
      <Line x1="29" y1="94" x2="40" y2="91" stroke={ink} strokeWidth="1" opacity={0.18} />
      <Line x1="84" y1="30" x2="96" y2="33" stroke={ink} strokeWidth="1" opacity={0.16} />
      <SvgText x="62" y="35" textAnchor="middle" fill={ink} fontSize="9" fontWeight="800" letterSpacing="0.4">{shortName.toUpperCase()}</SvgText>
      <SvgText x="62" y="66" textAnchor="middle" fill={ink} fontSize="13" fontWeight="900">{formatIsoDateForDisplay(stamp.date)}</SvgText>
      <SvgText x="62" y="84" textAnchor="middle" fill={ink} fontSize="8" fontWeight="700">{shortNote ? shortNote : "REACHED"}</SvgText>
      <SvgText x="62" y="96" textAnchor="middle" fill={ink} fontSize="7" fontWeight="700" letterSpacing="1.2">PRAYERCIRCLE</SvgText>
    </G>
  );
}

/** The filled outline of the stamp's shape — the linen weave's clip. */
function StampShapeFill({ variation }: { variation: StampVariation }) {
  if (variation.shape === "circle") return <Circle cx="62" cy="62" r={variation.radius} fill="#000" />;
  if (variation.shape === "oval") return <Ellipse cx="62" cy="62" rx="56" ry="48" fill="#000" />;
  return <Rect x="8" y="14" width="108" height="96" rx="19" fill="#000" />;
}

/** The stamp's outline as a soft thick stroke — linen's cloth halo. */
function StampShapeHalo({ ink, variation }: { ink: string; variation: StampVariation }) {
  if (variation.shape === "circle") return <Circle cx="62" cy="62" r={variation.radius} fill="none" stroke={ink} strokeWidth={6} opacity={0.1} />;
  if (variation.shape === "oval") return <Ellipse cx="62" cy="62" rx="56" ry="48" fill="none" stroke={ink} strokeWidth={6} opacity={0.1} />;
  return <Rect x="8" y="14" width="108" height="96" rx="19" fill="none" stroke={ink} strokeWidth={6} opacity={0.1} />;
}

function PassportStamp({ stamp, ink, skin = "classic" }: { stamp: ReachedStamp; ink: string; skin?: ReachedStampSkin }) {
  const variation = getStampVariation(stamp);
  const weaveClipId = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <View style={[styles.stampWrap, { transform: [{ rotate: `${variation.rotation}deg` }] }]}>
      <Svg width={124} height={124} viewBox="0 0 124 124">
        {skin === "coin" ? (
          <CoinStampArt stamp={stamp} />
        ) : skin === "sticker" ? (
          <PostageStampArt stamp={stamp} ink={ink} />
        ) : (
          <>
            {skin === "linen" && (
              <Defs>
                <ClipPath id={weaveClipId}>
                  <StampShapeFill variation={variation} />
                </ClipPath>
              </Defs>
            )}
            <G>
              {skin === "linen" && <>
            {/* The cloth the stamp sits on: a soft halo at the edge… */}
            <StampShapeHalo ink={ink} variation={variation} />
            {/* …the plain weave itself, clipped to the stamp: chunky
                thread bundles (filled rects overlapping by a unit so
                the edges feather), never hairlines. Weft first, then
                warp over it — where they cross, the translucency
                deepens, which is what reads as woven cloth. */}
            <G clipPath={`url(#${weaveClipId})`}>
              <Rect x="4" y="4" width="116" height="116" fill={LINEN_CREAM} opacity={0.16} />
              {LINEN_H_BUNDLES.map((bundle, index) => (
                <Rect key={`lh${bundle.offset}`} x="4" y={bundle.offset - 0.5} width="116" height={bundle.width + 1} fill={index % 2 === 0 ? ink : LINEN_FLAX} opacity={index % 2 === 0 ? bundle.opacity : bundle.opacity + 0.07} />
              ))}
              {LINEN_V_BUNDLES.map((bundle, index) => (
                <Rect key={`lv${bundle.offset}`} x={bundle.offset - 0.5} y="4" width={bundle.width + 1} height="116" fill={index % 2 === 0 ? LINEN_FLAX : ink} opacity={index % 2 === 0 ? bundle.opacity + 0.05 : bundle.opacity * 0.85} />
              ))}
              {/* Slubs: the thicker imperfect threads across the weave. */}
              <G fill="none" stroke={ink} strokeLinecap="round">
                {LINEN_SLUBS.map((slub) => (
                  <Path key={slub.d} d={slub.d} strokeWidth={slub.width} opacity={slub.opacity} />
                ))}
              </G>
            </G>
            {/* …and ink printed on fabric sits slightly diffused: a
                faint ghost of the rings, offset a whisper. */}
            <G transform="translate(0.6 0.5)" opacity={0.22}>
              <StampRings ink={ink} variation={variation} stitch />
            </G>
          </>}
          <StampArtwork stamp={stamp} ink={ink} variation={variation} stitch={skin === "linen"} />
          {skin === "postmark" && <>
            {/* Bold cancellation waves sweep the FULL stamp, edge to
                edge, over the ink — like the machine actually struck it. */}
            <G fill="none" stroke={ink} strokeLinecap="round" opacity={0.55}>
              {POSTMARK_WAVE_PATHS.map((d, i) => (
                <Path key={d} d={d} strokeWidth={POSTMARK_WAVE_WIDTHS[i]} />
              ))}
            </G>
            {/* The circular date seal, large and legible, overlapping
                the stamp's edge the way a real postmark lands. */}
            <G fill="none" stroke={ink} opacity={0.72}>
              <Circle cx="88" cy="36" r={23} strokeWidth={2} />
              <Circle cx="88" cy="36" r={18.5} strokeWidth={0.9} strokeDasharray="2 2" />
            </G>
            <SvgText x="88" y="34" textAnchor="middle" fill={ink} fontSize="6.5" fontWeight="900" letterSpacing="0.5" opacity={0.78}>REACHED</SvgText>
            <SvgText x="88" y="43" textAnchor="middle" fill={ink} fontSize="6.5" fontWeight="900" opacity={0.78}>{formatIsoDateForDisplay(stamp.date)}</SvgText>
            {/* Heavier uneven-ink texture: broken specks + short arcs. */}
            <G fill={ink} opacity={0.25}>
              <Circle cx="18" cy="31" r="1.3" /><Circle cx="23" cy="28" r="0.8" /><Circle cx="106" cy="76" r="1.2" />
              <Circle cx="111" cy="72" r="0.7" /><Circle cx="36" cy="105" r="0.9" /><Circle cx="42" cy="101" r="0.6" />
              <Circle cx="52" cy="18" r="0.7" /><Circle cx="15" cy="66" r="0.9" /><Circle cx="98" cy="104" r="0.8" />
            </G>
            <G fill="none" stroke={ink} strokeLinecap="round" opacity={0.3}>
              <Path d="M 14 84 A 50 50 0 0 1 22 62" strokeWidth="1.2" />
              <Path d="M 104 22 A 52 52 0 0 1 112 44" strokeWidth="1" />
            </G>
          </>}
            </G>
          </>
        )}
      </Svg>
    </View>
  );
}

export function StampCollectionModal({
  visible,
  stamps,
  people = [],
  onClose,
  skin: controlledSkin,
  onSkinChange,
}: {
  visible: boolean;
  stamps: ReachedStamp[];
  people?: Person[];
  onClose: () => void;
  skin?: ReachedStampSkin;
  onSkinChange?: (skin: ReachedStampSkin) => void;
}) {
  const colors = useColors();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [storedSkin, setStoredSkin] = useState<ReachedStampSkin>("classic");
  const [xpLevel, setXpLevel] = useState(1);
  const selectedSkin = controlledSkin ?? storedSkin;
  const unlockedSkins = useMemo(() => getUnlockedReachedStampSkins(xpLevel), [xpLevel]);
  useEffect(() => {
    if (!visible) return;
    void Promise.all([loadXPState(), AsyncStorage.getItem(REACHED_STAMP_SKIN_STORAGE_KEY)]).then(([xpState, savedSkin]) => {
      setXpLevel(xpState.level);
      const nextSkin = normalizeReachedStampSkin(savedSkin);
      if (getUnlockedReachedStampSkins(xpState.level).includes(nextSkin)) {
        setStoredSkin(nextSkin);
        onSkinChange?.(nextSkin);
      } else {
        setStoredSkin("classic");
        onSkinChange?.("classic");
      }
    }).catch(() => undefined);
  }, [onSkinChange, visible]);
  const selectSkin = (nextSkin: ReachedStampSkin) => {
    if (!unlockedSkins.includes(nextSkin)) return;
    setStoredSkin(nextSkin);
    onSkinChange?.(nextSkin);
    void AsyncStorage.setItem(REACHED_STAMP_SKIN_STORAGE_KEY, nextSkin);
  };
  const personById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const monthGroups = useMemo(() => {
    const grouped = new Map<string, ReachedStamp[]>();
    stamps.forEach((stamp) => grouped.set(stamp.date.slice(0, 7), [...(grouped.get(stamp.date.slice(0, 7)) || []), stamp]));
    return Array.from(grouped.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [stamps]);
  const highestMonthlyCount = Math.max(0, ...monthGroups.map(([, monthStamps]) => monthStamps.length));
  const inkFor = (stamp: ReachedStamp) => relationshipColors[personById.get(stamp.personId)?.relationship || "Friends"].accent;
  const personGroupsForMonth = (month: string, monthStamps: ReachedStamp[]) => {
    const grouped = new Map<string, ReachedStamp[]>();
    monthStamps.forEach((stamp) => {
      const key = stamp.personId || stamp.personName;
      grouped.set(key, [...(grouped.get(key) || []), stamp]);
    });
    return Array.from(grouped.entries()).map(([key, personStamps]) => ({
      key: `${month}-${key}`,
      stamps: personStamps.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
    }));
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.collectionModal, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Stamp collection</Text>
              <Text style={[styles.modalSubtitle, { color: colors.muted }]}>{stamps.length} stamps collected</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close stamp collection" onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.muted} />
            </Pressable>
          </View>
          <View style={styles.skinPickerSection}>
            <Text style={[styles.skinPickerLabel, { color: colors.muted }]}>STAMP SKIN</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skinPickerRow}>
              {REACHED_STAMP_SKINS.map((skinOption) => {
                const unlocked = unlockedSkins.includes(skinOption.id);
                const active = selectedSkin === skinOption.id;
                return <Pressable key={skinOption.id} accessibilityRole="button" accessibilityLabel={`${skinOption.name} stamp skin${unlocked ? "" : `, unlocks at level ${skinOption.unlockLevel}`}`} onPress={() => selectSkin(skinOption.id)} style={[styles.skinOption, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + "18" : colors.background, opacity: unlocked ? 1 : 0.5 }]}>
                  <MaterialIcons name={unlocked ? (active ? "check-circle" : "verified") : "lock"} size={14} color={active ? colors.primary : colors.muted} />
                  <Text style={[styles.skinOptionText, { color: active ? colors.primary : colors.foreground }]}>{skinOption.name}</Text>
                  {!unlocked && <Text style={[styles.skinUnlockText, { color: colors.muted }]}>Lv {skinOption.unlockLevel}</Text>}
                </Pressable>;
              })}
            </ScrollView>
          </View>
          <ScrollView contentContainerStyle={styles.collectionContent}>
            {monthGroups.map(([month, monthStamps]) => (
              <View key={month} style={[styles.monthGroup, { borderColor: colors.border }]}>
                <View style={styles.monthHeader}>
                  <Text style={[styles.monthTitle, { color: colors.foreground }]}>{getMonthLabel(month)}</Text>
                  <View style={[styles.countPill, { backgroundColor: colors.primary }]}><Text style={styles.countText}>{monthStamps.length}</Text></View>
                </View>
                {monthStamps.length === highestMonthlyCount && <Text style={[styles.personalBest, { color: colors.primary }]}>Personal best</Text>}
                <View style={styles.collectionStamps}>
                  {personGroupsForMonth(month, monthStamps).map((personGroup) => {
                    const representative = personGroup.stamps[0];
                    const isStacked = personGroup.stamps.length > 1;
                    const isExpanded = expandedGroups[personGroup.key] === true;
                    return (
                      <View key={personGroup.key} style={styles.collectionStampGroup}>
                        <Pressable
                          accessibilityRole={isStacked ? "button" : undefined}
                          accessibilityLabel={isStacked ? `${representative.personName}, ${personGroup.stamps.length} stamps` : `Stamp for ${representative.personName}`}
                          onPress={isStacked ? () => setExpandedGroups((previous) => ({ ...previous, [personGroup.key]: !isExpanded })) : undefined}
                          style={({ pressed }) => [styles.collectionStampButton, pressed && isStacked && { opacity: 0.7 }]}
                        >
                          <PassportStamp stamp={representative} ink={inkFor(representative)} skin={selectedSkin} />
                          {isStacked && (
                            <View style={[styles.stackCountBadge, { backgroundColor: colors.primary }]}>
                              <Text style={styles.stackCountText}>×{personGroup.stamps.length}</Text>
                            </View>
                          )}
                        </Pressable>
                        {isExpanded && (
                          <View style={[styles.expandedStampList, { borderTopColor: colors.border }]}>
                            {personGroup.stamps.map((stamp) => (
                              <View key={stamp.id} style={styles.expandedStampItem}>
                                <PassportStamp stamp={stamp} ink={inkFor(stamp)} skin={selectedSkin} />
                                <View style={styles.expandedStampMeta}>
                                  <Text style={[styles.expandedStampDate, { color: colors.foreground }]}>{formatIsoDateForDisplay(stamp.date)}</Text>
                                  <Text numberOfLines={2} style={[styles.expandedStampNote, { color: colors.muted }]}>{stamp.note || "Reached"}</Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
            {monthGroups.length === 0 && <Text style={[styles.modalSubtitle, { color: colors.muted }]}>No stamps collected yet.</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function ReachedStampRow({
  stamps,
  people = [],
  selectedDate,
  onChange,
}: {
  stamps: ReachedStamp[];
  people?: Person[];
  selectedDate: string;
  onChange?: (stamps: ReachedStamp[]) => void;
}) {
  const colors = useColors();
  const selectedDayStamps = useMemo(() => stamps.filter((stamp) => stamp.date === selectedDate), [stamps, selectedDate]);
  const [editingStamp, setEditingStamp] = useState<ReachedStamp | null>(null);
  const [note, setNote] = useState("");
  const [showCollection, setShowCollection] = useState(false);
  const [stampSkin, setStampSkin] = useState<ReachedStampSkin>("classic");
  const personById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);

  useEffect(() => {
    void AsyncStorage.getItem(REACHED_STAMP_SKIN_STORAGE_KEY).then((savedSkin) => setStampSkin(normalizeReachedStampSkin(savedSkin))).catch(() => undefined);
  }, []);

  const inkFor = (stamp: ReachedStamp) => relationshipColors[personById.get(stamp.personId)?.relationship || "Friends"].accent;

  const openMenu = (stamp: ReachedStamp) => {
    Alert.alert(stamp.personName, "Reached stamp", [
      { text: "Cancel", style: "cancel" },
      { text: "Edit", onPress: () => { setEditingStamp(stamp); setNote(stamp.note || ""); } },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => Alert.alert("Delete stamp?", "This only removes the stamp; it will not unmark the person as reached.", [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => onChange?.(removeReachedStamp(stamps, stamp.id)) },
        ]),
      },
    ]);
  };

  const saveNote = () => {
    if (!editingStamp) return;
    onChange?.(updateReachedStamp(stamps, editingStamp.id, note));
    setEditingStamp(null);
    setNote("");
  };

  if (selectedDayStamps.length === 0) return null;

  return (
    <View style={[styles.container, { borderTopColor: colors.border }]}>
      <View style={styles.headingRow}>
        <View style={styles.headingLabel}>
          <MaterialIcons name="verified" size={17} color={colors.primary} />
          <Text style={[styles.heading, { color: colors.foreground }]}>Reached today</Text>
        </View>
        <Pressable onPress={() => setShowCollection(true)} style={({ pressed }) => [styles.collectionButton, { borderColor: colors.border, backgroundColor: colors.surface }, pressed && { opacity: 0.7 }]}>
          <MaterialIcons name="collections-bookmark" size={15} color={colors.primary} />
          <Text style={[styles.collectionButtonText, { color: colors.primary }]}>Collection</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        {selectedDayStamps.map((stamp) => (
          <Pressable
            key={stamp.id}
            accessibilityRole="button"
            accessibilityLabel={`Reached stamp for ${stamp.personName}`}
            onLongPress={() => openMenu(stamp)}
            delayLongPress={350}
            style={({ pressed }) => [styles.stampButton, pressed && { opacity: 0.65, transform: [{ scale: 0.97 }] }]}
          >
            <PassportStamp stamp={stamp} ink={inkFor(stamp)} skin={stampSkin} />
          </Pressable>
        ))}
      </View>
      <StampCollectionModal visible={showCollection} stamps={stamps} people={people} skin={stampSkin} onSkinChange={setStampSkin} onClose={() => setShowCollection(false)} />
      <Modal transparent visible={Boolean(editingStamp)} animationType="fade" onRequestClose={() => setEditingStamp(null)}>
        <View style={styles.overlay}>
          <View style={[styles.editModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit reached stamp</Text>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>{editingStamp?.personName}</Text>
            <TextInput autoFocus value={note} onChangeText={setNote} placeholder="Where you met or how you spoke" placeholderTextColor={colors.muted} returnKeyType="done" style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditingStamp(null)} style={({ pressed }) => [styles.secondary, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}><Text style={{ color: colors.muted, fontWeight: "700" }}>Cancel</Text></Pressable>
              <Pressable onPress={saveNote} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary }, pressed && { opacity: 0.7 }]}><Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Save</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, marginTop: 18, paddingTop: 12, paddingBottom: 22, borderTopWidth: 1 },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  headingLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  heading: { fontSize: 13, fontWeight: "800", letterSpacing: 0.2 },
  collectionButton: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 30, paddingHorizontal: 9, borderWidth: 1, borderRadius: 15 },
  collectionButtonText: { fontSize: 11, fontWeight: "800" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 4, alignItems: "flex-start" },
  stampButton: { width: 124, height: 124, alignItems: "center", justifyContent: "center" },
  stampWrap: { width: 124, height: 124, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 18 },
  collectionModal: { width: "100%", maxWidth: 420, maxHeight: "86%", borderRadius: 20, overflow: "hidden" },
  editModal: { width: "100%", maxWidth: 360, borderRadius: 16, padding: 18, gap: 10 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, paddingBottom: 10 },
  modalTitle: { fontSize: 19, fontWeight: "900" },
  modalSubtitle: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  skinPickerSection: { paddingHorizontal: 18, paddingTop: 2, paddingBottom: 4, gap: 6 },
  skinPickerLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  skinPickerRow: { gap: 7, paddingRight: 18 },
  skinOption: { minHeight: 32, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, borderWidth: 1, borderRadius: 16 },
  skinOptionText: { fontSize: 11, fontWeight: "800" },
  skinUnlockText: { fontSize: 9, fontWeight: "700" },
  collectionContent: { padding: 18, paddingTop: 6, gap: 12 },
  monthGroup: { borderWidth: 1, borderRadius: 14, padding: 10 },
  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthTitle: { fontSize: 15, fontWeight: "900" },
  countPill: { minWidth: 26, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 7 },
  countText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  personalBest: { marginTop: 3, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
  collectionStamps: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 5 },
  collectionStampGroup: { alignItems: "center", marginHorizontal: 2, marginBottom: 6 },
  collectionStampButton: { width: 124, height: 124, alignItems: "center", justifyContent: "center", position: "relative" },
  stackCountBadge: { position: "absolute", top: 2, right: 1, minWidth: 30, height: 24, paddingHorizontal: 6, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF" },
  stackCountText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  expandedStampList: { width: "100%", borderTopWidth: 1, marginTop: 3, paddingTop: 5, alignItems: "center" },
  expandedStampItem: { alignItems: "center", marginBottom: 4 },
  expandedStampMeta: { alignItems: "center", marginTop: -2, paddingHorizontal: 4 },
  expandedStampDate: { fontSize: 11, fontWeight: "800" },
  expandedStampNote: { maxWidth: 116, fontSize: 10, fontWeight: "600", textAlign: "center", marginTop: 1 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 4 },
  secondary: { minWidth: 82, minHeight: 42, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  primary: { minWidth: 82, minHeight: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
