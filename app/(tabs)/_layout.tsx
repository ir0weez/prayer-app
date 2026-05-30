import { Tabs, useRouter } from "expo-router";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useEffect } from "react";
import { BackHandler } from "react-native";

export default function TabLayout() {
  const colors = useColors();
  const router = useRouter();

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Always navigate to the People (home) tab when back is pressed
      router.push('/(tabs)');
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, [router]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          display: "none",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="person"
        options={{
          title: "Person",
          href: null,
        }}
      />
    </Tabs>
  );
}
