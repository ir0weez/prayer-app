import React from "react";
import { Text, View } from "react-native";

type Props = {
  children: React.ReactNode;
  fallbackTitle?: string;
};

type State = {
  hasError: boolean;
};

/**
 * Catches render errors in the wrapped tree and shows a calm fallback
 * instead of crashing the app. Used around complex scenes like the
 * Mission Field where bad persisted data could otherwise force-quit
 * the production build.
 */
export class SafeBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    try {
      console.warn("[SafeBoundary] caught render error:", error);
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            backgroundColor: "#FFFBEB",
            borderRadius: 12,
            padding: 20,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#FDE68A",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontWeight: "700", fontSize: 14, color: "#92400E", textAlign: "center" }}>
            {this.props.fallbackTitle ?? "This view hit a snag"}
          </Text>
          <Text style={{ fontSize: 12, color: "#B45309", textAlign: "center", marginTop: 6 }}>
            Nothing was lost — try reopening this view.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}
