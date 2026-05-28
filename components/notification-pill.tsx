import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColors } from "@/hooks/use-colors";

interface NotificationPillProps {
  visible: boolean;
  title: string;
  icon?: string | React.ComponentProps<typeof MaterialIcons>["name"];
  backgroundColor?: string;
  onPress?: () => void;
  duration?: number; // Auto-hide after duration (ms), 0 = never auto-hide
}

/**
 * A notification pill component that displays at the top of the screen.
 * Similar to native iOS/Android notification badges.
 * 
 * Usage:
 * ```tsx
 * <NotificationPill
 *   visible={hasEmergencyPrayers}
 *   title={emergencyPrayerTitle}
 *   icon="priority-high"
 *   backgroundColor="#FF6B6B"
 *   onPress={() => scrollToEmergency()}
 * />
 * ```
 */
export function NotificationPill({
  visible,
  title,
  icon = "notifications-active",
  backgroundColor = "#FF6B6B",
  onPress,
  duration = 0,
}: NotificationPillProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-hide after duration if specified
      if (duration > 0) {
        const timer = setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShouldRender(false);
          });
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, duration, slideAnim]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          top: insets.top,
          paddingTop: 8,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        style={[
          styles.pill,
          {
            backgroundColor,
          },
        ]}
      >
        <View style={styles.content}>
          <MaterialIcons name={icon as any} size={16} color="#FFFFFF" />
          <Text style={styles.text} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    maxWidth: 200,
  },
});
