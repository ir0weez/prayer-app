import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { BibleChapterViewer } from '@/components/bible-chapter-viewer';
import { BIBLE_BOOKS, CHAPTER_COUNTS, loadUnifiedBible, markChapterAsRead, getCurrentBibleDisplay, getBookProgress, UnifiedBibleState } from '@/lib/bible-unified';
import { useCallback, useEffect, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from 'expo-router';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { MenuView } from '@react-native-menu/menu';

export default function BibleTrackerScreen() {
  const colors = useColors();
  const [bibleState, setBibleState] = useState<UnifiedBibleState | null>(null);
  const [selectedBook, setSelectedBook] = useState<string>('Genesis');
  const [showChapters, setShowChapters] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

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

  const handleToggleChapterComplete = async (chapter: number) => {
    try {
      const updated = await markChapterAsRead(selectedBook, chapter);
      setBibleState(updated);
    } catch (error) {
      console.error('Error toggling chapter:', error);
      Alert.alert('Error', 'Failed to save Bible progress');
    }
  };

  const handleReadChapter = (chapter: number) => {
    setSelectedChapter(chapter);
    setViewerVisible(true);
  };

  const handleBookmarkChapter = (chapter: number) => {
    const key = `${selectedBook}-${chapter}`;
    const newBookmarks = new Set(bookmarks);
    if (newBookmarks.has(key)) {
      newBookmarks.delete(key);
    } else {
      newBookmarks.add(key);
    }
    setBookmarks(newBookmarks);
  };

  const isBookmarked = (chapter: number) => {
    return bookmarks.has(`${selectedBook}-${chapter}`);
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
                  <MenuView
                    key={chapter}
                    onPressAction={(e: any) => {
                      const actionId = e.nativeEvent.name || e.nativeEvent.id;
                      if (actionId === 'read') {
                        handleReadChapter(chapter);
                      } else if (actionId === 'bookmark') {
                        handleBookmarkChapter(chapter);
                      } else if (actionId === 'complete') {
                        handleToggleChapterComplete(chapter);
                      }
                    }}
                    actions={[
                      { id: 'read', title: 'Read Chapter' },
                      { id: 'bookmark', title: isBookmarked(chapter) ? 'Remove Bookmark' : 'Bookmark' },
                      { id: 'complete', title: isRead ? 'Mark Incomplete' : 'Mark Complete' },
                    ]}
                  >
                    <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                      <View
                        className={`w-12 h-12 rounded-lg items-center justify-center mr-2 mb-2 ${
                          isRead ? 'bg-success' : 'bg-surface border border-border'
                        }`}
                      >
                        {isRead ? (
                          <MaterialIcons name="check" size={20} color={colors.background} />
                        ) : isBookmarked(chapter) ? (
                          <MaterialIcons name="bookmark" size={20} color={colors.primary} />
                        ) : (
                          <Text className="text-foreground font-semibold">{chapter}</Text>
                        )}
                      </View>
                    </Pressable>
                  </MenuView>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}

      <BibleChapterViewer
        visible={viewerVisible}
        book={selectedBook}
        chapter={selectedChapter}
        onClose={() => setViewerVisible(false)}
        onMarkComplete={() => {
          handleToggleChapterComplete(selectedChapter);
          setViewerVisible(false);
        }}
      />
    </ScreenContainer>
  );
}
