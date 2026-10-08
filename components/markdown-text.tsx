import { Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";

function renderInline(text: string, baseSize: number, baseColor: string, keyPrefix: string) {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|#(\w+))/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`${keyPrefix}-${key++}`} style={{ fontSize: baseSize, color: baseColor }}>
          {text.slice(lastIndex, match.index)}
        </Text>
      );
    }
    if (match[2]) {
      // Bold
      parts.push(
        <Text key={`${keyPrefix}-${key++}`} style={{ fontSize: baseSize, color: baseColor, fontWeight: "700" }}>
          {match[2]}
        </Text>
      );
    } else if (match[3]) {
      // Italic
      parts.push(
        <Text key={`${keyPrefix}-${key++}`} style={{ fontSize: baseSize, color: baseColor, fontStyle: "italic" }}>
          {match[3]}
        </Text>
      );
    } else if (match[4]) {
      // Hashtag
      parts.push(
        <Text key={`${keyPrefix}-${key++}`} style={{ fontSize: baseSize, color: "#7C5CFF", fontWeight: "600" }}>
          #{match[4]}
        </Text>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(
      <Text key={`${keyPrefix}-${key++}`} style={{ fontSize: baseSize, color: baseColor }}>
        {text.slice(lastIndex)}
      </Text>
    );
  }
  return parts;
}

export function MarkdownText({ text, baseSize = 15, baseColor }: { text: string; baseSize?: number; baseColor: string }) {
  const colors = useColors();
  const lines = text.split("\n");

  return (
    <View>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("### ")) {
          return (
            <Text key={i} style={{ fontSize: baseSize + 2, fontWeight: "700", color: baseColor, marginTop: 8, marginBottom: 4 }}>
              {renderInline(trimmed.slice(4), baseSize + 2, baseColor, `h3-${i}`)}
            </Text>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <Text key={i} style={{ fontSize: baseSize + 4, fontWeight: "700", color: baseColor, marginTop: 8, marginBottom: 4 }}>
              {renderInline(trimmed.slice(3), baseSize + 4, baseColor, `h2-${i}`)}
            </Text>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <Text key={i} style={{ fontSize: baseSize + 8, fontWeight: "800", color: baseColor, marginTop: 8, marginBottom: 4 }}>
              {renderInline(trimmed.slice(2), baseSize + 8, baseColor, `h1-${i}`)}
            </Text>
          );
        }
        if (trimmed.startsWith("> ")) {
          return (
            <View key={i} style={{ borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 12, marginVertical: 4 }}>
              <Text style={{ fontSize: baseSize, color: baseColor, fontStyle: "italic" }}>
                {renderInline(trimmed.slice(2), baseSize, baseColor, `q-${i}`)}
              </Text>
            </View>
          );
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <View key={i} style={{ flexDirection: "row", marginVertical: 2, paddingLeft: 8 }}>
              <Text style={{ fontSize: baseSize, color: baseColor, marginRight: 8 }}>•</Text>
              <Text style={{ fontSize: baseSize, color: baseColor, flex: 1 }}>
                {renderInline(trimmed.slice(2), baseSize, baseColor, `li-${i}`)}
              </Text>
            </View>
          );
        }
        if (trimmed === "") {
          return <View key={i} style={{ height: 8 }} />;
        }
        return (
          <Text key={i} style={{ fontSize: baseSize, color: baseColor, marginVertical: 2 }}>
            {renderInline(line, baseSize, baseColor, `p-${i}`)}
          </Text>
        );
      })}
    </View>
  );
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#(\w+)/g);
  return matches ? [...new Set(matches.map((m) => m.slice(1)))] : [];
}
