import { ScrollView, View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
const COMPLETED_COLOR = '#666666';

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

  // Separate active and completed sections
  const activeSections = sections
    .map((section, index) => ({ section, index, isCompleted: false }))
    .filter((item) => !completedSections.includes(item.index));

  const completedSectionsList = sections
    .map((section, index) => ({ section, index, isCompleted: true }))
    .filter((item) => completedSections.includes(item.index));

  // Combine: active first, then completed at end
  const orderedSections = [...activeSections, ...completedSectionsList];

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
        {orderedSections.map(({ section, index, isCompleted }) => {
          return (
            <Pressable
              key={section.id || `${section.title}-${section.startVerse}`}
              onPress={() => !isCompleted && onSectionPress(section)}
              disabled={isCompleted}
              style={({ pressed }) => [
                {
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: isCompleted ? COMPLETED_COLOR : SECTION_COLOR,
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: isCompleted ? 0.5 : pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={{ alignItems: 'center', gap: 2 }}>
                <MaterialIcons
                  name={bookIcon as any}
                  size={32}
                  color={isCompleted ? '#999' : 'white'}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: isCompleted ? '#999' : '#fff',
                    textDecorationLine: isCompleted ? 'line-through' : 'none',
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
