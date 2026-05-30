'use client';

import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useCallback, useState, useEffect, useRef } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { ScrollView, View, Pressable, Text, StyleSheet, Alert } from 'react-native';

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

const BIBLE_STORAGE_KEY = 'bibleChapters';
const BIBLE_BOOK_STATUS_KEY = 'bibleBookStatus';

type BookStatus = 'not-started' | 'current' | 'complete';

interface BookStatusData {
  [bookName: string]: BookStatus;
}

export default function BibleChaptersScreen() {
  const colors = useColors();
  const [readChapters, setReadChapters] = useState<Set<string>>(new Set());
  const [bookStatuses, setBookStatuses] = useState<BookStatusData>({});
  const scrollViewRef = useRef<ScrollView>(null);

  const saveReadChapters = useCallback(async (chapters: Set<string>) => {
    try {
      await AsyncStorage.setItem(BIBLE_STORAGE_KEY, JSON.stringify(Array.from(chapters)));
    } catch (error) {
      console.error('Failed to save Bible chapters:', error);
    }
  }, []);

  const saveBookStatuses = useCallback(async (statuses: BookStatusData) => {
    try {
      await AsyncStorage.setItem(BIBLE_BOOK_STATUS_KEY, JSON.stringify(statuses));
    } catch (error) {
      console.error('Failed to save book statuses:', error);
    }
  }, []);

  const loadReadChapters = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(BIBLE_STORAGE_KEY);
      if (stored) {
        setReadChapters(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error('Failed to load Bible chapters:', error);
    }
  }, []);

  const loadBookStatuses = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(BIBLE_BOOK_STATUS_KEY);
      if (stored) {
        setBookStatuses(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load book statuses:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReadChapters();
      loadBookStatuses();
    }, [loadReadChapters, loadBookStatuses])
  );

  const getBookChapterCount = (bookName: string) => {
    const book = BIBLE_BOOKS.find(b => b.name === bookName);
    return book?.chapters || 0;
  };

  const getReadChapterCountForBook = (bookName: string) => {
    const bookChapters = BIBLE_BOOKS.find(b => b.name === bookName)?.chapters || 0;
    let count = 0;
    for (let i = 1; i <= bookChapters; i++) {
      if (readChapters.has(`${bookName}-${i}`)) {
        count++;
      }
    }
    return count;
  };

  const isBookFullyRead = (bookName: string) => {
    const totalChapters = getBookChapterCount(bookName);
    const readCount = getReadChapterCountForBook(bookName);
    return totalChapters > 0 && totalChapters === readCount;
  };

  const toggleChapter = (bookName: string, chapterNum: number) => {
    const chapterId = `${bookName}-${chapterNum}`;
    const newChapters = new Set(readChapters);
    if (newChapters.has(chapterId)) {
      newChapters.delete(chapterId);
    } else {
      newChapters.add(chapterId);
    }
    setReadChapters(newChapters);
    saveReadChapters(newChapters);

    // Check if book is now fully read and auto-complete
    const bookChapters = getBookChapterCount(bookName);
    let readCount = 0;
    for (let i = 1; i <= bookChapters; i++) {
      if (newChapters.has(`${bookName}-${i}`)) {
        readCount++;
      }
    }
    if (bookChapters > 0 && bookChapters === readCount && bookStatuses[bookName] !== 'complete') {
      const newStatuses: BookStatusData = { ...bookStatuses, [bookName]: 'complete' };
      setBookStatuses(newStatuses);
      saveBookStatuses(newStatuses);
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
            try {
              setReadChapters(new Set());
              setBookStatuses({} as BookStatusData);
              await AsyncStorage.setItem(BIBLE_STORAGE_KEY, JSON.stringify([]));
              await AsyncStorage.setItem(BIBLE_BOOK_STATUS_KEY, JSON.stringify({}));
            } catch (error) {
              console.error('Failed to reset Bible data:', error);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const getStatusColor = (status: BookStatus | undefined) => {
    switch (status) {
      case 'current':
        return colors.primary;
      case 'complete':
        return '#22C55E';
      default:
        return colors.muted;
    }
  };

  const getStatusLabel = (status: BookStatus | undefined) => {
    switch (status) {
      case 'current':
        return 'current';
      case 'complete':
        return 'complete';
      default:
        return 'not started';
    }
  };

  // Auto-scroll to current book on load
  useEffect(() => {
    if (scrollViewRef.current && bookStatuses) {
      const currentBook = Object.entries(bookStatuses).find(([_, status]) => status === 'current');
      if (currentBook) {
        const bookIndex = BIBLE_BOOKS.findIndex(b => b.name === currentBook[0]);
        if (bookIndex !== -1) {
          // Scroll to the current book (approximate position)
          setTimeout(() => {
            const estimatedPosition = bookIndex * 280; // Rough estimate of each book section height
            scrollViewRef.current?.scrollTo({ y: estimatedPosition, animated: true });
          }, 100);
        }
      }
    }
  }, [bookStatuses]);

  const totalChapters = BIBLE_BOOKS.reduce((sum, book) => sum + book.chapters, 0);
  const readCount = readChapters.size;
  const progressPercent = Math.round((readCount / totalChapters) * 100);

  const styles = StyleSheet.create({
    header: {
      marginBottom: 24,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 28,
      fontWeight: '900',
      color: colors.foreground,
    },
    counter: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
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
      backgroundColor: colors.surface,
      borderRadius: 12,
      height: 12,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: {
      backgroundColor: colors.primary,
      height: '100%',
    },
    progressText: {
      fontSize: 12,
      color: colors.muted,
    },
    bookSection: {
      marginBottom: 24,
    },
    bookHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    bookTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
    },
    statusPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 2,
    },
    statusPillText: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'capitalize' as const,
    },
    chapterGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chapterButton: {
      width: '18%',
      minHeight: 56,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    },
    chapterText: {
      fontSize: 16,
      fontWeight: '700',
    },
    checkmark: {
      marginTop: 2,
    },
  });

  return (
    <ScreenContainer className="p-0">
      <ScrollView ref={scrollViewRef} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}>
        {/* Header with reset button and progress */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable onPress={resetAllData} style={styles.resetButton}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </Pressable>
          </View>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Bible Reading</Text>
            <Text style={styles.counter}>{readCount}/{totalChapters}</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{progressPercent}% complete</Text>
        </View>

        {/* Bible books and chapters grid */}
        {BIBLE_BOOKS.map((book) => {
          const bookChapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
          const bookStatus = bookStatuses[book.name] || 'not-started';
          const statusColor = getStatusColor(bookStatus);

          return (
            <View key={book.name} style={styles.bookSection}>
              <View style={styles.bookHeader}>
                <Text style={styles.bookTitle}>{book.name}</Text>
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
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: statusColor },
                    ]}
                  >
                    {getStatusLabel(bookStatus)}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.chapterGrid}>
                {bookChapters.map((chapterNum) => {
                  const chapterId = `${book.name}-${chapterNum}`;
                  const isRead = readChapters.has(chapterId);

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
                      <Text
                        style={[
                          styles.chapterText,
                          { color: isRead ? '#FFFFFF' : colors.foreground },
                        ]}
                      >
                        {chapterNum}
                      </Text>
                      {isRead && (
                        <MaterialIcons
                          name="check"
                          size={14}
                          color="#FFFFFF"
                          style={styles.checkmark}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}
