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

// Green color matching the story viewer
const AVATAR_GREEN = '#2D8659';
const AVATAR_GREY = '#A0A0A0';

export function BibleStoriesBar({
  sections,
  onSectionPress,
  completedSections = [],
  book = '',
}: BibleStoriesBarProps) {
  const colors = useColors();

  if (sections.length <= 1) {
    return null; // Don't show bar if only one section
  }

  const bookIcon = getBookIcon(book);

  // Sort sections: active first, completed at end
  const sortedSections = sections
    .map((section, index) => ({
      section,
      index,
      isCompleted: completedSections.includes(index),
    }))
    .sort((a, b) => {
      // Active sections first, completed sections at end
      if (a.isCompleted === b.isCompleted) return 0;
      return a.isCompleted ? 1 : -1;
    });

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
        {sortedSections.map(({ section, index, isCompleted }) => {
          const backgroundColor = isCompleted ? AVATAR_GREY : AVATAR_GREEN;

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
                  backgroundColor,
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: pressed && !isCompleted ? 0.8 : isCompleted ? 0.5 : 1,
                  borderWidth: isCompleted ? 2 : 0,
                  borderColor: isCompleted ? 'rgba(255,255,255,0.4)' : 'transparent',
                },
              ]}
            >
              <View style={{ alignItems: 'center', gap: 2 }}>
                {/* Icon */}
                <MaterialIcons
                  name={bookIcon as any}
                  size={24}
                  color="#fff"
                />
                {/* Verse number */}
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: '700',
                    color: '#fff',
                    textAlign: 'center',
                  }}
                  numberOfLines={1}
                >
                  v{section.startVerse}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
