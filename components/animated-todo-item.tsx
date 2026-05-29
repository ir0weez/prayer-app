import { Pressable, View } from "react-native";
import ReAnimated, { FadeOut, ZoomOut, useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import { PersonalTodo } from "@/lib/prayercircle-data";

interface AnimatedTodoItemProps {
  todo: PersonalTodo;
  color: string;
  iconName: string;
  onComplete: () => void;
  onAnimationComplete?: () => void;
}

export function AnimatedTodoItem({
  todo,
  color,
  iconName,
  onComplete,
  onAnimationComplete,
}: AnimatedTodoItemProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePress = async () => {
    // Trigger haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Add a success haptic
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Animate the item
    scale.value = withTiming(0.8, { duration: 150, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }, () => {
      if (onAnimationComplete) {
        runOnJS(onAnimationComplete)();
      }
    });

    // Call the completion handler after animation starts
    setTimeout(() => {
      onComplete();
    }, 100);
  };

  return (
    <ReAnimated.View style={animatedStyle}>
      <View style={{ alignItems: "center", gap: 8 }}>
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 2, borderColor: color, paddingHorizontal: 12, paddingVertical: 6 }}>
          <ReAnimated.Text style={{ color, fontWeight: "600", fontSize: 14 }} numberOfLines={1}>
            {todo.title}
          </ReAnimated.Text>
        </View>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            {
              width: 86,
              height: 86,
              borderRadius: 43,
              borderWidth: 3,
              borderColor: color,
              alignItems: "center" as const,
              justifyContent: "center" as const,
              backgroundColor: color,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <MaterialIcons name={iconName as any} size={32} color="#FFFFFF" />
        </Pressable>
      </View>
    </ReAnimated.View>
  );
}
