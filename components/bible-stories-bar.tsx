import { ScrollView, View, Text, Pressable } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { BibleSection } from '@/lib/bible-section-parser';

interface BibleStoriesBarProps {
  sections: BibleSection[];
  onSectionPress: (section: BibleSection) => void;
  completedSections?: number[];
}

// Color palette for section circles (similar to Instagram Stories)
const SECTION_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E2', // Sky Blue
  '#F8B88B', // Peach
  '#A8D5BA', // Sage
];

export function BibleStoriesBar({
  sections,
  onSectionPress,
  completedSections = [],
}: BibleStoriesBarProps) {
  const colors = useColors();

  if (sections.length <= 1) {
    return null; // Don't show bar if only one section
  }

  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: 12,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 12,
          gap: 12,
        }}
      >
        {sections.map((section, index) => {
          const backgroundColor = SECTION_COLORS[index % SECTION_COLORS.length];
          const isCompleted = completedSections.includes(index);

          return (
            <Pressable
              key={section.id || `${section.title}-${section.startVerse}`}
              onPress={() => onSectionPress(section)}
              style={({ pressed }) => [
                {
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor,
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: pressed ? 0.8 : 1,
                  borderWidth: isCompleted ? 2 : 0,
                  borderColor: isCompleted ? colors.foreground : 'transparent',
                },
              ]}
            >
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: '700',
                    color: '#fff',
                  }}
                >
                  {section.startVerse}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color: '#fff',
                    textAlign: 'center',
                    maxWidth: 70,
                  }}
                  numberOfLines={1}
                >
                  {section.title.substring(0, 10)}
                </Text>
              </View>
            </Pressable>
          );
                })}
      </ScrollView>
    </View>
  );
}

