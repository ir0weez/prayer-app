/**
 * v412 — the Due to reach page (Journal/Fast Rework's sibling:
 * the reach-out card's SEE ALL door, approved drawing
 * reach-out-card-concepts-v2 Frame B).
 *
 * The People card seats ONE due person and never becomes a list;
 * the list lives here, on a page he visits and leaves. Rows run
 * most overdue first (lib/reach-out's one ordering), each with
 * the card pill's standing action (open the person's page), a
 * Mark reached quick action under the name — the same write the
 * person page's button makes (lib/reach-out's markReachedOnDate),
 * so marking here promotes the next person into the card's seat
 * and drops the count — and a tap through to the person's page.
 * A plain mount; dress derives from the seed × appearance
 * through the People front-door family, never pinned.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarImage } from "@/components/avatar-system";
import { usePeopleFrontDoor } from "@/hooks/use-people-material";
import {
  getTodayISOString,
  normalizePeopleForStorage,
  type Person,
} from "@/lib/prayercircle-data";
import { PEOPLE_STORAGE_KEY, REACHED_STAMPS_STORAGE_KEY } from "@/lib/prayercircle-storage";
import {
  getDueReachOut,
  markReachedOnDate,
  reachOutRowSubline,
  type ReachOutEntry,
} from "@/lib/reach-out";
import { normalizeReachedStamps, type ReachedStamp } from "@/lib/reached-stamps";
import { awardXP } from "@/lib/xp-engine";

export default function DueToReachScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pmf = usePeopleFrontDoor();
  const [people, setPeople] = useState<Person[]>([]);
  const [stamps, setStamps] = useState<ReachedStamp[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      Promise.all([
        AsyncStorage.getItem(PEOPLE_STORAGE_KEY),
        AsyncStorage.getItem(REACHED_STAMPS_STORAGE_KEY),
      ])
        .then(([storedPeople, storedStamps]) => {
          if (!isActive) return;
          if (storedPeople) {
            const parsed = JSON.parse(storedPeople) as Person[];
            setPeople(Array.isArray(parsed) ? normalizePeopleForStorage(parsed) : []);
          }
          if (storedStamps) setStamps(normalizeReachedStamps(JSON.parse(storedStamps)));
          setHasHydrated(true);
        })
        .catch(() => undefined);
      return () => {
        isActive = false;
      };
    }, []),
  );

  const due = useMemo(() => getDueReachOut(people, new Date()), [people]);

  const handleMarkReached = (entry: ReachOutEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = markReachedOnDate(people, stamps, entry.person.id, entry.person.name, getTodayISOString());
    setPeople(result.people);
    setStamps(result.stamps);
    AsyncStorage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(normalizePeopleForStorage(result.people))).catch(() => undefined);
    AsyncStorage.setItem(REACHED_STAMPS_STORAGE_KEY, JSON.stringify(result.stamps)).catch(() => undefined);
    if (result.createdStampId) void awardXP("reached-stamp", result.createdStampId).catch(() => undefined);
  };

  const openPerson = (personId: string) => {
    router.push({ pathname: "/person", params: { personId } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: pmf.ground }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 16, paddingBottom: insets.bottom + 28 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [{ width: 34, height: 34, borderRadius: 17, backgroundColor: pmf.card, alignItems: "center", justifyContent: "center", shadowColor: pmf.shadow, shadowOpacity: 1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, pressed && { opacity: 0.85 }]}
          >
            <MaterialIcons name="chevron-left" size={20} color={pmf.ink} />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "800", color: pmf.ink }}>Due to reach</Text>
          {due.length > 0 ? (
            <View style={{ marginLeft: "auto", backgroundColor: pmf.inkSeed, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 }}>
              <Text style={{ fontSize: 10.5, fontWeight: "800", letterSpacing: 1, color: "#FFFFFF" }}>{due.length} {due.length === 1 ? "PERSON" : "PEOPLE"}</Text>
            </View>
          ) : null}
        </View>

        {hasHydrated && due.length === 0 ? (
          <Text style={{ fontSize: 13.5, fontWeight: "600", color: pmf.inkSoft, marginTop: 6 }}>No one is due to reach right now.</Text>
        ) : null}

        {due.map((entry) => {
          const person = entry.person;
          return (
            <Pressable
              key={person.id}
              onPress={() => openPerson(person.id)}
              style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: pmf.card, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 9, shadowColor: pmf.shadow, shadowOpacity: 1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, pressed && { opacity: 0.9 }]}
            >
              <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={48} thumbnail fallbackColor={person.accentColor} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 15.5, fontWeight: "800", color: pmf.ink }}>{person.name}</Text>
                <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "600", color: pmf.inkSoft, marginTop: 2 }}>{reachOutRowSubline(entry)}</Text>
                <Pressable onPress={() => handleMarkReached(entry)} hitSlop={6} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                  <Text style={{ fontSize: 11.5, fontWeight: "800", color: pmf.deep, marginTop: 3 }}>Mark reached</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => openPerson(person.id)}
                style={({ pressed }) => [{ backgroundColor: pmf.seed, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10 }, pressed && { opacity: 0.85 }]}
              >
                <Text style={{ fontSize: 12.5, fontWeight: "800", color: "#FFFFFF" }}>Reach out</Text>
              </Pressable>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
