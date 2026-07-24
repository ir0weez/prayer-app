import { ScrollView, View, Text, Pressable } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { BibleSection } from '@/lib/bible-section-parser';
import { getBookIcon } from '@/lib/book-icons';

interface BibleStoriesBarProps {
  sections: BibleSection[];
  onSectionPress: (section: BibleSection) => void;
  completedSections?: number[];
  book?: string;
}

// Green color matching the commentary style
const SECTION_COLOR = '#2D8659';

export function BibleStoriesBar({
  sections,
  onSectionPress,
  completedSections = [],
  book = '',
}: BibleStoriesBarProps) {
  const colors = useColors();
  const bookIcon = getBookIcon(book);

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
                  backgroundColor: SECTION_COLOR,
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: pressed ? 0.8 : 1,
                  borderWidth: isCompleted ? 3 : 0,
                  borderColor: isCompleted ? '#fff' : 'transparent',
                },
              ]}
            >
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text
                  style={{
                    fontSize: 28,
                    lineHeight: 32,
                  }}
                >
                  {bookIcon}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: '#fff',
                  }}
                >
                  {section.startVerse}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
