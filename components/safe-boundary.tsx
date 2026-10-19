import React from "react";
import { Text, View } from "react-native";

type Props = {
  children: React.ReactNode;
  fallbackTitle?: string;
};

type State = {
  hasError: boolean;
  /** TEMPORARY diagnostics: shown under the fallback so the real bug can be fixed. */
  errorDetails?: string;
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
    try {
      const details =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : typeof error === "string"
            ? error
            : JSON.stringify(error);
      this.setState({ errorDetails: details.slice(0, 300) });
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
          {this.state.errorDetails ? (
            <Text style={{ fontSize: 10, color: "#A8A29E", textAlign: "center", marginTop: 8 }}>
              Details: {this.state.errorDetails}
            </Text>
          ) : null}
        </View>
      );
    }
    return this.props.children;
  }
}
