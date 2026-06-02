import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { BIBLE_BOOKS, CHAPTER_COUNTS, loadUnifiedBible, markChapterAsRead, getCurrentBibleDisplay, getBookProgress, UnifiedBibleState } from '@/lib/bible-unified';
import { useCallback, useEffect, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from 'expo-router';

export default function BibleTrackerScreen() {
  const colors = useColors();
  const [bibleState, setBibleState] = useState<UnifiedBibleState | null>(null);
  const [selectedBook, setSelectedBook] = useState<string>('Genesis');
  const [showChapters, setShowChapters] = useState(false);

  const loadBibleState = useCallback(async () => {
    try {
      const state = await loadUnifiedBible();
      setBibleState(state);
    } catch (error) {
      console.error('Error loading Bible state:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBibleState();
    }, [loadBibleState])
  );

  const handleMarkChapterRead = async (chapter: number) => {
    try {
      const updated = await markChapterAsRead(selectedBook, chapter);
      setBibleState(updated);
    } catch (error) {
      console.error('Error marking chapter as read:', error);
      Alert.alert('Error', 'Failed to save Bible progress');
    }
  };

  if (!bibleState) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Loading...</Text>
      </ScreenContainer>
    );
  }

  const currentDisplay = getCurrentBibleDisplay(bibleState);
  const totalChapters = CHAPTER_COUNTS[selectedBook] || 1;
  const bookChapters = Array.from({ length: totalChapters }, (_, i) => i + 1);
  const progress = getBookProgress(bibleState, selectedBook);

  return (
    <ScreenContainer className="p-4">
      <View className="mb-6">
        <Pressable
          onPress={() => setShowChapters(!showChapters)}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <View className="flex-row items-center justify-between bg-surface rounded-lg p-4">
            <View>
              <Text className="text-lg font-bold text-foreground">{currentDisplay}</Text>
              <Text className="text-sm text-muted">{progress.read} of {progress.total} chapters read</Text>
            </View>
            <MaterialIcons name={showChapters ? 'expand-less' : 'expand-more'} size={24} color={colors.foreground} />
          </View>
        </Pressable>
      </View>

      {showChapters && (
        <ScrollView>
          <View className="mb-6">
            <Text className="text-sm font-semibold text-muted mb-3">SELECT BOOK</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {BIBLE_BOOKS.map(book => (
                <Pressable
                  key={book}
                  onPress={() => setSelectedBook(book)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <View
                    className={`px-3 py-2 rounded-full mr-2 ${
                      selectedBook === book ? 'bg-primary' : 'bg-surface border border-border'
                    }`}
                  >
                    <Text className={selectedBook === book ? 'text-background font-semibold text-xs' : 'text-foreground text-xs'}>
                      {book}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            <Text className="text-sm font-semibold text-muted mb-3">CHAPTERS</Text>
            <View className="flex-row flex-wrap">
              {bookChapters.map(chapter => {
                const isRead = bibleState.chapters.some(c => c.book === selectedBook && c.chapter === chapter && c.isRead);
                return (
                  <Pressable
                    key={chapter}
                    onPress={() => handleMarkChapterRead(chapter)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View
                      className={`w-12 h-12 rounded-lg items-center justify-center mr-2 mb-2 ${
                        isRead ? 'bg-success' : 'bg-surface border border-border'
                      }`}
                    >
                      {isRead ? (
                        <MaterialIcons name="check" size={20} color={colors.background} />
                      ) : (
                        <Text className="text-foreground font-semibold">{chapter}</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
