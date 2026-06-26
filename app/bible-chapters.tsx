import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useCallback, useState, useEffect, useRef } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScrollView, View, Pressable, Text, StyleSheet, Alert, Modal, FlatList } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { loadUnifiedBible, saveUnifiedBible, UNIFIED_BIBLE_KEY, type UnifiedBibleState } from '@/lib/bible-unified';

const BIBLE_BOOKS = [
  { name: 'Genesis', chapters: 50 },
  { name: 'Exodus', chapters: 40 },
  { name: 'Leviticus', chapters: 27 },
  { name: 'Numbers', chapters: 36 },
  { name: 'Deuteronomy', chapters: 34 },
  { name: 'Joshua', chapters: 24 },
  { name: 'Judges', chapters: 21 },
  { name: 'Ruth', chapters: 4 },
  { name: '1 Samuel', chapters: 31 },
  { name: '2 Samuel', chapters: 24 },
  { name: '1 Kings', chapters: 22 },
  { name: '2 Kings', chapters: 25 },
  { name: '1 Chronicles', chapters: 29 },
  { name: '2 Chronicles', chapters: 36 },
  { name: 'Ezra', chapters: 10 },
  { name: 'Nehemiah', chapters: 13 },
  { name: 'Esther', chapters: 10 },
  { name: 'Job', chapters: 42 },
  { name: 'Psalms', chapters: 150 },
  { name: 'Proverbs', chapters: 31 },
  { name: 'Ecclesiastes', chapters: 12 },
  { name: 'Song of Solomon', chapters: 8 },
  { name: 'Isaiah', chapters: 66 },
  { name: 'Jeremiah', chapters: 52 },
  { name: 'Lamentations', chapters: 5 },
  { name: 'Ezekiel', chapters: 48 },
  { name: 'Daniel', chapters: 12 },
  { name: 'Hosea', chapters: 14 },
  { name: 'Joel', chapters: 3 },
  { name: 'Amos', chapters: 9 },
  { name: 'Obadiah', chapters: 1 },
  { name: 'Jonah', chapters: 4 },
  { name: 'Micah', chapters: 7 },
  { name: 'Nahum', chapters: 3 },
  { name: 'Habakkuk', chapters: 3 },
  { name: 'Zephaniah', chapters: 3 },
  { name: 'Haggai', chapters: 2 },
  { name: 'Zechariah', chapters: 14 },
  { name: 'Malachi', chapters: 4 },
  { name: 'Matthew', chapters: 28 },
  { name: 'Mark', chapters: 16 },
  { name: 'Luke', chapters: 24 },
  { name: 'John', chapters: 21 },
  { name: 'Acts', chapters: 28 },
  { name: 'Romans', chapters: 16 },
  { name: '1 Corinthians', chapters: 16 },
  { name: '2 Corinthians', chapters: 13 },
  { name: 'Galatians', chapters: 6 },
  { name: 'Ephesians', chapters: 6 },
  { name: 'Philippians', chapters: 4 },
  { name: 'Colossians', chapters: 4 },
  { name: '1 Thessalonians', chapters: 5 },
  { name: '2 Thessalonians', chapters: 3 },
  { name: '1 Timothy', chapters: 6 },
  { name: '2 Timothy', chapters: 4 },
  { name: 'Titus', chapters: 3 },
  { name: 'Philemon', chapters: 1 },
  { name: 'Hebrews', chapters: 13 },
  { name: 'James', chapters: 5 },
  { name: '1 Peter', chapters: 5 },
  { name: '2 Peter', chapters: 3 },
  { name: '1 John', chapters: 5 },
  { name: '2 John', chapters: 1 },
  { name: '3 John', chapters: 1 },
  { name: 'Jude', chapters: 1 },
  { name: 'Revelation', chapters: 22 },
];

type BookStatus = 'not-started' | 'current' | 'complete';
type BookStatusData = Record<string, BookStatus>;

const BIBLE_STORAGE_KEY = 'bibleReadingProgress';
const BIBLE_STATUS_STORAGE_KEY = 'bibleBookStatus';

export default function BibleChaptersScreen() {
  const colors = useColors();
  const router = useRouter();
  const [readChapters, setReadChapters] = useState<Set<string>>(new Set());
  const [bookStatuses, setBookStatuses] = useState<BookStatusData>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const [showBookNav, setShowBookNav] = useState(false);
  const bookPositions = useRef<Record<string, number>>({});
  const [hasScrolled, setHasScrolled] = useState(false);
  const [justMarkedAsRead, setJustMarkedAsRead] = useState<Set<string>>(new Set());

  const saveReadChapters = useCallback(async (chapters: Set<string>) => {
    try {
      // Save to legacy storage for backward compatibility
      await AsyncStorage.setItem(BIBLE_STORAGE_KEY, JSON.stringify(Array.from(chapters)));
      
      // Also save to unified Bible storage so Schedule tab sees the updates
      const unifiedState = await loadUnifiedBible();
      const chapterArray = Array.from(chapters);
      
      // Update the chapters array in unified state
      unifiedState.chapters = unifiedState.chapters.map(ch => ({
        ...ch,
        isRead: chapterArray.includes(`${ch.book}-${ch.chapter}`)
      }));
      
      await saveUnifiedBible(unifiedState);
    } catch (error) {
      console.error('Error saving read chapters:', error);
    }
  }, []);

  const saveBookStatuses = useCallback(async (statuses: BookStatusData) => {
    try {
      // Save to old storage for backward compatibility
      await AsyncStorage.setItem(BIBLE_STATUS_STORAGE_KEY, JSON.stringify(statuses));
      
      // Also save to unified Bible storage so Schedule tab sees the update
      const unifiedState = await loadUnifiedBible();
      unifiedState.bookStatuses = statuses;
      await saveUnifiedBible(unifiedState);
    } catch (error) {
      console.error('Error saving book statuses:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [chaptersStored, statusesStored] = await Promise.all([
        AsyncStorage.getItem(BIBLE_STORAGE_KEY),
        AsyncStorage.getItem(BIBLE_STATUS_STORAGE_KEY),
      ]);

      if (chaptersStored) {
        setReadChapters(new Set(JSON.parse(chaptersStored)));
      }
      if (statusesStored) {
        setBookStatuses(JSON.parse(statusesStored));
      }
    } catch (error) {
      console.error('Error loading Bible data:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      setHasScrolled(false);
    }, [loadData])
  );

  // Scroll to current book once positions are measured
  useEffect(() => {
    if (hasScrolled) return;
    const currentBook = Object.entries(bookStatuses).find(([_, status]) => status === 'current');
    if (!currentBook) return; // Don't scroll if no book is current

    const targetPosition = bookPositions.current[currentBook[0]];
    if (targetPosition !== undefined && targetPosition > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: targetPosition - 10, animated: true });
        setHasScrolled(true);
      }, 400);
    }
  }, [bookStatuses, hasScrolled]);

  const handleBookLayout = (bookName: string, y: number) => {
    bookPositions.current[bookName] = y;
    // Check if we need to scroll after this layout
    if (!hasScrolled) {
      const currentBook = Object.entries(bookStatuses).find(([_, status]) => status === 'current');
      if (currentBook && currentBook[0] === bookName) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: y - 10, animated: true });
          setHasScrolled(true);
        }, 500);
      }
    }
  };

  const scrollToBook = (bookName: string) => {
    const position = bookPositions.current[bookName];
    if (position !== undefined) {
      scrollViewRef.current?.scrollTo({ y: position - 10, animated: true });
    }
    setShowBookNav(false);
  };

  const getBookChapterCount = (bookName: string): number => {
    const book = BIBLE_BOOKS.find(b => b.name === bookName);
    return book ? book.chapters : 0;
  };

  const toggleChapter = (bookName: string, chapterNum: number) => {
    const chapterId = `${bookName}-${chapterNum}`;
    const newChapters = new Set(readChapters);

    if (newChapters.has(chapterId)) {
      newChapters.delete(chapterId);
    } else {
      newChapters.add(chapterId);
      AsyncStorage.setItem('bibleLastReadDate', new Date().toISOString()).catch(() => undefined);
    }

    setReadChapters(newChapters);
    saveReadChapters(newChapters);

    // Add animation trigger for newly marked chapters
    if (!readChapters.has(chapterId)) {
      setJustMarkedAsRead(prev => new Set([...prev, chapterId]));
      setTimeout(() => {
        setJustMarkedAsRead(prev => {
          const updated = new Set(prev);
          updated.delete(chapterId);
          return updated;
        });
      }, 600);
    }

    // Check if all chapters are now read and auto-complete the book
    const bookChapters = getBookChapterCount(bookName);
    const allRead = Array.from({ length: bookChapters }, (_, i) =>
      newChapters.has(`${bookName}-${i + 1}`)
    ).every(Boolean);

    if (allRead && bookStatuses[bookName] !== 'complete') {
      const newStatuses = { ...bookStatuses, [bookName]: 'complete' as BookStatus };
      setBookStatuses(newStatuses);
      saveBookStatuses(newStatuses);
    }
  };

  const getStatusColor = (status: BookStatus): string => {
    switch (status) {
      case 'current':
        return colors.primary;
      case 'complete':
        return '#22C55E';
      default:
        return colors.muted;
    }
  };

  const getStatusLabel = (status: BookStatus): string => {
    switch (status) {
      case 'current':
        return 'Current';
      case 'complete':
        return 'Complete';
      default:
        return 'Not Started';
    }
  };

  const cycleBookStatus = (bookName: string) => {
    const currentStatus = bookStatuses[bookName] || 'not-started';
    let nextStatus: BookStatus;

    if (currentStatus === 'not-started') {
      nextStatus = 'current';
    } else if (currentStatus === 'current') {
      nextStatus = 'complete';
    } else {
      nextStatus = 'not-started';
    }

    const newStatuses: BookStatusData = { ...bookStatuses };

    // If setting to 'current', unset any other current books
    if (nextStatus === 'current') {
      Object.keys(newStatuses).forEach(key => {
        if (newStatuses[key] === 'current') {
          newStatuses[key] = 'not-started';
        }
      });
    }

    // If setting to 'complete', mark all chapters as read
    if (nextStatus === 'complete') {
      const newChapters = new Set(readChapters);
      const bookChapters = getBookChapterCount(bookName);
      for (let i = 1; i <= bookChapters; i++) {
        newChapters.add(`${bookName}-${i}`);
      }
      setReadChapters(newChapters);
      saveReadChapters(newChapters);
    }

    // If setting to 'not-started', unmark all chapters
    if (nextStatus === 'not-started') {
      const newChapters = new Set(readChapters);
      const bookChapters = getBookChapterCount(bookName);
      for (let i = 1; i <= bookChapters; i++) {
        newChapters.delete(`${bookName}-${i}`);
      }
      setReadChapters(newChapters);
      saveReadChapters(newChapters);
    }

    newStatuses[bookName] = nextStatus;
    setBookStatuses(newStatuses);
    saveBookStatuses(newStatuses);
  };

  const resetAllData = () => {
    Alert.alert(
      'Reset Bible Progress',
      'Are you sure you want to clear all Bible reading progress? This cannot be undone.',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            setReadChapters(new Set());
            setBookStatuses({});
            await AsyncStorage.removeItem(BIBLE_STORAGE_KEY);
            await AsyncStorage.removeItem(BIBLE_STATUS_STORAGE_KEY);
          },
          style: 'destructive',
        },
      ]
    );
  };

  const totalChapters = BIBLE_BOOKS.reduce((sum, book) => sum + book.chapters, 0);
  const readCount = readChapters.size;
  const progressPercent = Math.round((readCount / totalChapters) * 100);

  return (
    <ScreenContainer className="p-0">
      <ScrollView ref={scrollViewRef} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}>
        {/* Header with close, title, and reset buttons */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.back()} style={[styles.closeButton, { backgroundColor: colors.surface }]}>
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={[styles.title, { color: colors.foreground }]}>Bible Reading</Text>
              <Text style={[styles.counter, { color: colors.muted }]}>{readCount}/{totalChapters}</Text>
            </View>
            <View style={styles.headerRight}>
              <Pressable onPress={() => setShowBookNav(true)} style={[styles.navButton, { backgroundColor: colors.surface }]}>
                <MaterialIcons name="list" size={20} color={colors.foreground} />
              </Pressable>
              <Pressable onPress={resetAllData} style={styles.resetButton}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </Pressable>
            </View>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.muted }]}>{progressPercent}% complete</Text>
        </View>

        {/* Bible books and chapters grid */}
        {BIBLE_BOOKS.map((book) => {
          const bookChapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
          const bookStatus = bookStatuses[book.name] || 'not-started';
          const statusColor = getStatusColor(bookStatus);

          return (
            <View
              key={book.name}
              style={styles.bookSection}
              onLayout={(e) => handleBookLayout(book.name, e.nativeEvent.layout.y)}
            >
              <View style={styles.bookHeader}>
                <Text style={[styles.bookTitle, { color: colors.foreground }]}>{book.name}</Text>
                <Pressable
                  onPress={() => cycleBookStatus(book.name)}
                  style={[
                    styles.statusPill,
                    {
                      borderColor: statusColor,
                      backgroundColor: bookStatus === 'not-started' ? 'transparent' : statusColor + '20',
                    },
                  ]}
                >
                  <Text style={[styles.statusPillText, { color: statusColor }]}>
                    {getStatusLabel(bookStatus)}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.chapterGrid}>
                {bookChapters.map((chapterNum) => {
                  const chapterId = `${book.name}-${chapterNum}`;
                  const isRead = readChapters.has(chapterId);
                  const isJustMarked = justMarkedAsRead.has(chapterId);

                  return (
                    <Pressable
                      key={chapterId}
                      onPress={() => toggleChapter(book.name, chapterNum)}
                      style={({ pressed }) => [
                        styles.chapterButton,
                        {
                          borderColor: isRead ? '#22C55E' : colors.muted,
                          backgroundColor: isRead ? '#22C55E' : 'transparent',
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.chapterText, { color: isRead ? '#FFFFFF' : colors.foreground }]}>
                        {chapterNum}
                      </Text>
                      {isRead && (
                        isJustMarked ? (
                          <Animated.View entering={ZoomIn.springify()}>
                            <MaterialIcons name="check" size={12} color="#FFFFFF" style={styles.checkmark} />
                          </Animated.View>
                        ) : (
                          <MaterialIcons name="check" size={12} color="#FFFFFF" style={styles.checkmark} />
                        )
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Book Navigation Modal */}
      <Modal visible={showBookNav} transparent animationType="slide" onRequestClose={() => setShowBookNav(false)}>
        <View style={styles.navModalOverlay}>
          <Pressable style={styles.navModalBackdrop} onPress={() => setShowBookNav(false)} />
          <View style={[styles.navModalContent, { backgroundColor: colors.background }]}>
            <View style={styles.navModalHeader}>
              <Text style={[styles.navModalTitle, { color: colors.foreground }]}>Jump to Book</Text>
              <Pressable onPress={() => setShowBookNav(false)}>
                <MaterialIcons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>
            <FlatList
              data={BIBLE_BOOKS}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => {
                const status = bookStatuses[item.name] || 'not-started';
                const statusColor = getStatusColor(status);
                return (
                  <Pressable
                    onPress={() => scrollToBook(item.name)}
                    style={({ pressed }) => [styles.navItem, { borderBottomColor: colors.border }, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={[styles.navItemText, { color: colors.foreground }]}>{item.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.navItemChapters, { color: colors.muted }]}>{item.chapters} ch.</Text>
                      <View style={[styles.navItemDot, { backgroundColor: statusColor }]} />
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  counter: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  progressBar: {
    borderRadius: 12,
    height: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookSection: {
    marginBottom: 16,
  },
  bookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chapterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chapterButton: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterText: {
    fontSize: 14,
    fontWeight: '700',
  },
  checkmark: {
    marginTop: 2,
  },
  navModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  navModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  navModalContent: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  navModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  navModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  navItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  navItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  navItemChapters: {
    fontSize: 13,
  },
  navItemDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
