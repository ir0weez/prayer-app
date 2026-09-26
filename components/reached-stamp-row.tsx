import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Rect, Text as SvgText } from "react-native-svg";

import { useColors } from "@/hooks/use-colors";
import { formatIsoDateForDisplay, relationshipColors, type Person } from "@/lib/prayercircle-data";
import { removeReachedStamp, updateReachedStamp, type ReachedStamp } from "@/lib/reached-stamps";

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

function PassportStamp({ stamp, ink }: { stamp: ReachedStamp; ink: string }) {
  const variation = getStampVariation(stamp);
  const shortName = stamp.personName.length > 18 ? `${stamp.personName.slice(0, 17)}…` : stamp.personName;
  const shortNote = stamp.note && stamp.note.length > 17 ? `${stamp.note.slice(0, 16)}…` : stamp.note;
  return (
    <View style={[styles.stampWrap, { transform: [{ rotate: `${variation.rotation}deg` }] }]}>
      <Svg width={124} height={124} viewBox="0 0 124 124">
        <G>
          {variation.shape === "circle" && <>
            <Circle cx="62" cy="62" r={variation.radius} fill="none" stroke={ink} strokeWidth={2.2} opacity={0.9} />
            <Circle cx="62" cy="62" r={variation.radius - 6} fill="none" stroke={ink} strokeWidth={1.2} strokeDasharray={variation.dash} opacity={0.85} />
          </>}
          {variation.shape === "oval" && <>
            <Ellipse cx="62" cy="62" rx="56" ry="48" fill="none" stroke={ink} strokeWidth={2.2} opacity={0.9} />
            <Ellipse cx="62" cy="62" rx="50" ry="42" fill="none" stroke={ink} strokeWidth={1.2} strokeDasharray={variation.dash} opacity={0.85} />
          </>}
          {variation.shape === "rounded-rectangle" && <>
            <Rect x="8" y="14" width="108" height="96" rx="19" fill="none" stroke={ink} strokeWidth={2.2} opacity={0.9} />
            <Rect x="14" y="20" width="96" height="84" rx="14" fill="none" stroke={ink} strokeWidth={1.2} strokeDasharray={variation.dash} opacity={0.85} />
          </>}
          <Circle cx={24 + variation.markOffset} cy="29" r="1.3" fill={ink} opacity={0.22} />
          <Circle cx="96" cy={84 + (variation.markOffset % 13)} r="1.1" fill={ink} opacity={0.2} />
          <Line x1="29" y1="94" x2="40" y2="91" stroke={ink} strokeWidth="1" opacity={0.18} />
          <Line x1="84" y1="30" x2="96" y2="33" stroke={ink} strokeWidth="1" opacity={0.16} />
          <SvgText x="62" y="35" textAnchor="middle" fill={ink} fontSize="9" fontWeight="800" letterSpacing="0.4">{shortName.toUpperCase()}</SvgText>
          <SvgText x="62" y="66" textAnchor="middle" fill={ink} fontSize="13" fontWeight="900">{formatIsoDateForDisplay(stamp.date)}</SvgText>
          <SvgText x="62" y="84" textAnchor="middle" fill={ink} fontSize="8" fontWeight="700">{shortNote ? shortNote : "REACHED"}</SvgText>
          <SvgText x="62" y="96" textAnchor="middle" fill={ink} fontSize="7" fontWeight="700" letterSpacing="1.2">PRAYERCIRCLE</SvgText>
        </G>
      </Svg>
    </View>
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
  const personById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const monthGroups = useMemo(() => {
    const grouped = new Map<string, ReachedStamp[]>();
    stamps.forEach((stamp) => grouped.set(stamp.date.slice(0, 7), [...(grouped.get(stamp.date.slice(0, 7)) || []), stamp]));
    return Array.from(grouped.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [stamps]);
  const highestMonthlyCount = Math.max(0, ...monthGroups.map(([, monthStamps]) => monthStamps.length));

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
            <PassportStamp stamp={stamp} ink={inkFor(stamp)} />
          </Pressable>
        ))}
      </View>
      <Modal transparent visible={showCollection} animationType="slide" onRequestClose={() => setShowCollection(false)}>
        <View style={styles.overlay}>
          <View style={[styles.collectionModal, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Stamp collection</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>{stamps.length} stamps collected</Text>
              </View>
              <Pressable onPress={() => setShowCollection(false)}><MaterialIcons name="close" size={24} color={colors.muted} /></Pressable>
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
                    {monthStamps.map((stamp) => <PassportStamp key={stamp.id} stamp={stamp} ink={inkFor(stamp)} />)}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  collectionContent: { padding: 18, paddingTop: 6, gap: 12 },
  monthGroup: { borderWidth: 1, borderRadius: 14, padding: 10 },
  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthTitle: { fontSize: 15, fontWeight: "900" },
  countPill: { minWidth: 26, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 7 },
  countText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  personalBest: { marginTop: 3, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
  collectionStamps: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 5 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 4 },
  secondary: { minWidth: 82, minHeight: 42, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  primary: { minWidth: 82, minHeight: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
