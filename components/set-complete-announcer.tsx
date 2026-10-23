// The day's-set announcement (v200): mounted once at the root, like
// the XP gain indicator, so the moment lands on whatever screen the
// twelfth game was played in. lib/mini-games fires the event exactly
// once per date — at the completion itself — so this speaks once a
// day at most, in the same voice as the "Town Income" alert.

import { useEffect } from "react";
import { Alert } from "react-native";
import { subscribeSetCompleted } from "@/lib/mini-games";

export function SetCompleteAnnouncer() {
  useEffect(() => {
    return subscribeSetCompleted(() => {
      Alert.alert(
        "Today's Set Complete",
        "All twelve games played — your town earns +10% income today."
      );
    });
  }, []);
  return null;
}
