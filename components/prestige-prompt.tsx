// End-of-fast prestige prompt — "Begin Again?"
//
// When a fast completes, if that fast is the current prestige offer (the
// longest fast started since the last prestige) the player is asked once
// whether they want to begin again: the prompt names the reward that
// fast's length grants (a Crown for 365+ days, a permanent devotion bonus
// below that) and what a prestige resets. "Not yet" is remembered per
// fast — the offer itself stays available from the Hometown button.

import { useEffect, useRef, useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { isFastCompleted, type PersonalFast } from "@/lib/prayercircle-fasting";
import {
  loadPrestigeLevel,
  loadPrestigeState,
  markFastPrompted,
  offerBossCleared,
  performPrestige,
  prestigeOffer,
  totalPrestigeMultiplier,
  type PrestigeOffer,
} from "@/lib/prestige";
import { BADGE_BY_ID, bossGateFor } from "@/lib/badges";

export function PrestigePrompt({ fasts }: { fasts: PersonalFast[] }) {
  const [offer, setOffer] = useState<PrestigeOffer | null>(null);
  const [crowns, setCrowns] = useState(0);
  const [gateCleared, setGateCleared] = useState(false);
  const [bossName, setBossName] = useState("");
  const [badgeName, setBadgeName] = useState("");
  const [visible, setVisible] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (!fasts || fasts.length === 0) return;
        const state = await loadPrestigeState();
        const next = prestigeOffer(fasts, state);
        if (!live || !next) return;
        if (state.promptedFastIds.includes(next.fastId)) return;
        const fast = fasts.find((f) => f.id === next.fastId);
        if (!fast || !isFastCompleted(fast)) return; // the prompt belongs to a fast's end
        const level = await loadPrestigeLevel();
        if (!live) return;
        const boss = bossGateFor(state.badges as string[], state.throneVictories);
        setBossName(boss.displayName);
        setBadgeName(BADGE_BY_ID[boss.badgeId].name);
        setGateCleared(offerBossCleared(state, next));
        setCrowns(level);
        setOffer(next);
        setVisible(true);
      } catch {}
    })();
    return () => {
      live = false;
    };
  }, [fasts]);

  if (!offer) return null;

  const dismiss = async () => {
    setVisible(false);
    try {
      await markFastPrompted(offer.fastId);
    } catch {}
  };

  const confirm = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const res = await performPrestige(fasts);
      await markFastPrompted(offer.fastId).catch(() => undefined);
      setVisible(false);
      if (res) {
        Alert.alert(
          "You began again",
          res.kind === "crown"
            ? `Crown ${res.crowns}! Every coin your town earns is now x${totalPrestigeMultiplier(res.crowns, res.devotionBonus)}. The City awaits in your Hometown.`
            : `Your devotion bonus is now +${Math.round(res.devotionBonus * 100)}% on every coin your town earns — forever.`,
        );
      } else {
        // The Boss Gate is shut — performPrestige refused.
        Alert.alert(
          "The Boss Gate is shut",
          `${bossName} guards the way in the Dark Forest. Defeat the boss to earn the ${badgeName} and clear the gate — then Begin Again from your Hometown.`
        );
      }
    } catch {
      busyRef.current = false;
    }
  };

  const rewardLine =
    offer.kind === "crown"
      ? "A Crown — every coin your town earns is doubled, and the City appears."
      : `A permanent +${Math.round(offer.bonus * 100)}% bonus on every coin your town earns.`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 }}
        onPress={dismiss}
      >
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, width: "100%" }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <MaterialIcons name="workspace-premium" size={24} color="#B8912C" />
            <Text style={{ fontSize: 19, fontWeight: "800", color: "#92400E", marginLeft: 8 }}>Your fast is complete</Text>
          </View>
          <Text style={{ fontSize: 15, color: "#1F2937", lineHeight: 21 }}>
            Begin again? Your {offer.durationDays}-day fast grants{" "}
            <Text style={{ fontWeight: "800" }}>{rewardLine}</Text>
          </Text>
          <Text style={{ fontSize: 13, color: "#6B7280", lineHeight: 19, marginTop: 10 }}>
            Your town, coin balance and gear would reset. Your prayer streak, XP, collections, Garden of Remembrance
            {crowns > 0 || offer.kind === "crown" ? ", Crowns" : ""} and devotion stay.
          </Text>
          {gateCleared ? (
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#F0FDF4", borderRadius: 10, padding: 10, marginTop: 12, borderWidth: 1, borderColor: "#4ADE80" }}>
              <MaterialIcons name="check-circle" size={18} color="#166534" />
              <Text style={{ fontSize: 13, color: "#14532D", flex: 1, marginLeft: 8, lineHeight: 18 }}>
                Boss Gate cleared — {bossName} is defeated and the {badgeName} is yours.
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 10, padding: 10, marginTop: 12, borderWidth: 1, borderColor: "#F87171" }}>
              <MaterialIcons name="lock" size={18} color="#991B1B" />
              <Text style={{ fontSize: 13, color: "#7F1D1D", flex: 1, marginLeft: 8, lineHeight: 18 }}>
                The Boss Gate: {bossName} must fall in the Dark Forest first. Victory earns the {badgeName} — yours forever.
              </Text>
            </View>
          )}
          <Pressable
            onPress={gateCleared ? confirm : undefined}
            style={{ backgroundColor: gateCleared ? "#B8912C" : "#9CA3AF", borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 16, flexDirection: "row", justifyContent: "center" }}
          >
            <MaterialIcons name={gateCleared ? "workspace-premium" : "lock"} size={18} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15, marginLeft: 6 }}>
              {gateCleared
                ? offer.kind === "crown" ? `Begin Again — Crown ${crowns + 1}` : `Begin Again — +${Math.round(offer.bonus * 100)}% forever`
                : `Defeat ${bossName} to Begin Again`}
            </Text>
          </Pressable>
          <Pressable onPress={dismiss} style={{ borderRadius: 12, paddingVertical: 11, alignItems: "center", marginTop: 8 }}>
            <Text style={{ color: "#6B7280", fontWeight: "700", fontSize: 14 }}>Not yet</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
