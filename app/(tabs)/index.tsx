import { ScrollView, Text, View, Pressable, TextInput, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useMemo, useState } from "react";
import {
  getInitialState,
  addPerson,
  getPrayTodayList,
  calculatePrayerStreak,
  RelationshipType,
  relationshipColors,
} from "@/lib/prayercircle-data";

export default function HomeScreen() {
  const palette = useColors();
  const [people, setPeople] = useState(getInitialState().people);
  const [journal, setJournal] = useState(getInitialState().journal);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonRelationship, setNewPersonRelationship] = useState<RelationshipType>("Friends");
  const [activeTab, setActiveTab] = useState<"home" | "people" | "journal" | "reminders" | "settings">("home");

  const todayDayOfWeek = new Date().getDay();
  const prayTodayList = useMemo(() => getPrayTodayList(people, todayDayOfWeek), [people, todayDayOfWeek]);
  const streak = useMemo(() => calculatePrayerStreak(people), [people]);
  const prayersLeftToday = prayTodayList.length;

  const handleAddPerson = () => {
    if (newPersonName.trim()) {
      const newPeople = addPerson(people, newPersonName, newPersonRelationship);
      setPeople(newPeople);
      setNewPersonName("");
      setNewPersonRelationship("Friends");
      setShowAddPerson(false);
    }
  };

  const renderHome = () => (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 12, color: palette.muted, marginBottom: 4 }}>PRAY TODAY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {prayTodayList.length === 0 ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}>
              <Text style={{ color: palette.muted, fontSize: 14 }}>No one to pray for today</Text>
            </View>
          ) : (
            prayTodayList.map((person: typeof prayTodayList[0]) => (
              <Pressable key={person.id} style={{ marginRight: 16, alignItems: "center" }}>
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    borderWidth: 3,
                    borderColor: relationshipColors[person.relationship].accent,
                    backgroundColor: relationshipColors[person.relationship].avatar,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 32, fontWeight: "700" }}>
                    {person.name.substring(0, 1).toUpperCase()}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: "600", color: palette.foreground, marginTop: 8, textAlign: "center", maxWidth: 80 }}>
                  {person.name.split(" ")[0]}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>

      <View>
        <Text style={{ fontSize: 12, color: palette.muted, marginBottom: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
          FRIENDS
        </Text>
        {people.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <Text style={{ color: palette.muted, fontSize: 14 }}>No contacts yet</Text>
          </View>
        ) : (
          people.map((person) => (
            <View
              key={person.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: palette.surface,
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: palette.border,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: relationshipColors[person.relationship].accent,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: "700", color: "white" }}>
                  {person.name.substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: palette.foreground }}>{person.name}</Text>
                <Text style={{ fontSize: 12, color: palette.muted }}>
                  {person.relationship} • Prayed today
                </Text>
              </View>
              <Pressable style={{ padding: 8 }}>
                <Text style={{ fontSize: 18 }}>✏️</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderPeople = () => {
    if (showAddPerson) {
      return (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 100 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: palette.foreground, marginBottom: 20, textAlign: "center" }}>ADD NEW PERSON</Text>
          <TextInput
            style={{
              backgroundColor: palette.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: palette.border,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              color: palette.foreground,
              marginBottom: 16,
            }}
            placeholder="Full name"
            placeholderTextColor={palette.muted}
            value={newPersonName}
            onChangeText={setNewPersonName}
          />
          <Text style={{ fontSize: 12, fontWeight: "700", color: palette.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>RELATIONSHIP</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {(["Family", "Friends", "Ministry", "Prospect"] as RelationshipType[]).map((rel) => (
              <Pressable
                key={rel}
                onPress={() => setNewPersonRelationship(rel)}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: relationshipColors[rel].accent,
                    backgroundColor: newPersonRelationship === rel ? relationshipColors[rel].accent : "transparent",
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={{
                    fontWeight: "700",
                    color: newPersonRelationship === rel ? "white" : relationshipColors[rel].accent,
                  }}
                >
                  {rel}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={handleAddPerson}
            style={({ pressed }) => [
              {
                backgroundColor: "#7C3AED",
                paddingVertical: 12,
                borderRadius: 24,
                alignItems: "center",
                marginBottom: 12,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Save</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowAddPerson(false)}
            style={({ pressed }) => [
              {
                backgroundColor: palette.surface,
                paddingVertical: 12,
                borderRadius: 24,
                alignItems: "center",
                borderWidth: 1,
                borderColor: palette.border,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={{ color: palette.foreground, fontWeight: "700", fontSize: 16 }}>Cancel</Text>
          </Pressable>
        </ScrollView>
      );
    }

    if (people.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>👥</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: palette.foreground, marginBottom: 4 }}>No contacts yet</Text>
          <Text style={{ fontSize: 14, color: palette.muted }}>Tap the + button to add someone</Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 100 }}>
        {people.map((person: typeof people[0]) => (
          <View
            key={person.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: palette.surface,
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: relationshipColors[person.relationship as RelationshipType].accent,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "700", color: "white" }}>
                {person.name.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: palette.foreground }}>{person.name}</Text>
              <Text style={{ fontSize: 12, color: palette.muted }}>{person.relationship}</Text>
            </View>
            <Pressable onPress={() => {}} style={{ padding: 8 }}>
              <Text style={{ fontSize: 18 }}>✏️</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderJournal = () => (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
      <Text style={{ fontSize: 14, fontWeight: "700", color: palette.foreground, marginBottom: 12 }}>PRAYER JOURNAL</Text>
      {journal.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 32 }}>
          <Text style={{ color: palette.muted }}>No journal entries yet</Text>
        </View>
      ) : (
        journal.map((entry: typeof journal[0], idx: number) => (
          <View key={idx} style={{ marginBottom: 12, padding: 12, backgroundColor: palette.surface, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, color: palette.muted }}>{entry.date}</Text>
            <Text style={{ fontSize: 14, color: palette.foreground }}>{entry.note}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderReminders = () => (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>🔔</Text>
      <Text style={{ fontSize: 16, fontWeight: "700", color: palette.foreground }}>Reminders</Text>
      <Text style={{ fontSize: 14, color: palette.muted, marginTop: 4 }}>Coming soon</Text>
    </View>
  );

  const renderSettings = () => (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>⚙️</Text>
      <Text style={{ fontSize: 16, fontWeight: "700", color: palette.foreground }}>Settings</Text>
      <Text style={{ fontSize: 14, color: palette.muted, marginTop: 4 }}>Coming soon</Text>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return renderHome();
      case "people":
        return renderPeople();
      case "journal":
        return renderJournal();
      case "reminders":
        return renderReminders();
      case "settings":
        return renderSettings();
    }
  };

  return (
    <ScreenContainer
      containerClassName="bg-gradient-to-b from-purple-50 to-white"
      style={{ backgroundColor: "#F3E8FF" }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.border }}>
        <View>
          <Text style={{ fontSize: 28, fontWeight: "700", color: palette.foreground }}>PrayerCircle</Text>
          <Text style={{ fontSize: 12, color: palette.muted }}>{prayTodayList.length}/{people.length} prayed today</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 24 }}>🔥</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", color: palette.foreground }}>{streak}</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 24 }}>📋</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", color: palette.foreground }}>{prayersLeftToday}</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>{renderContent()}</View>

      {/* FAB */}
      <Pressable
        onPress={() => setShowAddPerson(true)}
        style={({ pressed }) => [
          {
            position: "absolute",
            bottom: 80,
            right: 16,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "#7C3AED",
            justifyContent: "center",
            alignItems: "center",
          },
          pressed && { transform: [{ scale: 0.95 }] },
        ]}
      >
        <Text style={{ fontSize: 28, color: "white" }}>+</Text>
      </Pressable>

      {/* Tab Bar */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: "row",
          backgroundColor: "#7C3AED",
          borderTopWidth: 1,
          borderTopColor: "#6D28D9",
          paddingBottom: 8,
          paddingTop: 8,
        }}
      >
        {(["home", "people", "journal", "reminders", "settings"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              setActiveTab(tab);
              setShowAddPerson(false);
            }}
            style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}
          >
            <Text style={{ fontSize: 20, marginBottom: 4 }}>
              {tab === "home" && "🏠"}
              {tab === "people" && "👥"}
              {tab === "journal" && "📝"}
              {tab === "reminders" && "🔔"}
              {tab === "settings" && "⚙️"}
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: activeTab === tab ? "white" : "rgba(255,255,255,0.7)",
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}
