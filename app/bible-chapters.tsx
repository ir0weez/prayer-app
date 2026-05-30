import { View, Text, ScrollView, Pressable, SectionList } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useCallback, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

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

export default function BibleChaptersScreen() {
  const colors = useColors();
  const [readChapters, setReadChapters] = useState<Set<string>>(new Set());

  const loadReadChapters = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem('bibleReadChapters');
      if (data) {
        setReadChapters(new Set(JSON.parse(data)));
      }
    } catch (error) {
      console.error('Error loading Bible chapters:', error);
    }
  }, []);

  const saveReadChapters = useCallback(async (chapters: Set<string>) => {
    try {
      await AsyncStorage.setItem('bibleReadChapters', JSON.stringify(Array.from(chapters)));
    } catch (error) {
      console.error('Error saving Bible chapters:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReadChapters();
    }, [loadReadChapters])
  );

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
  };

  const sections = BIBLE_BOOKS.map(book => ({
    title: book.name,
    data: Array.from({ length: book.chapters }, (_, i) => ({
      book: book.name,
      chapter: i + 1,
    })),
  }));

  const totalChapters = BIBLE_BOOKS.reduce((sum, book) => sum + book.chapters, 0);
  const readCount = readChapters.size;
  const progressPercent = Math.round((readCount / totalChapters) * 100);

  return (
    <ScreenContainer className="p-4">
      {/* Header with progress */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-2xl font-bold text-foreground">Bible Reading</Text>
          <Text className="text-sm font-semibold text-muted">{readCount}/{totalChapters}</Text>
        </View>
        <View className="bg-surface rounded-full h-3 overflow-hidden">
          <View
            className="bg-primary h-full"
            style={{ width: `${progressPercent}%` }}
          />
        </View>
        <Text className="text-xs text-muted mt-2">{progressPercent}% complete</Text>
      </View>

      {/* Bible books and chapters */}
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.book}-${item.chapter}`}
        renderItem={({ item }) => {
          const chapterId = `${item.book}-${item.chapter}`;
          const isRead = readChapters.has(chapterId);
          return (
            <Pressable
              onPress={() => toggleChapter(item.book, item.chapter)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <View
                className={`flex-row items-center p-3 rounded-lg mb-2 ${
                  isRead ? 'bg-success/20' : 'bg-surface'
                }`}
              >
                <View
                  className={`w-5 h-5 rounded border-2 items-center justify-center mr-3 ${
                    isRead
                      ? 'bg-success border-success'
                      : 'border-border'
                  }`}
                >
                  {isRead && (
                    <MaterialIcons name="check" size={14} color={colors.background} />
                  )}
                </View>
                <Text
                  className={`flex-1 font-medium ${
                    isRead ? 'text-success line-through' : 'text-foreground'
                  }`}
                >
                  Chapter {item.chapter}
                </Text>
              </View>
            </Pressable>
          );
        }}
        renderSectionHeader={({ section: { title } }) => (
          <View className="mt-4 mb-2">
            <Text className="text-lg font-bold text-foreground">{title}</Text>
          </View>
        )}
        scrollEnabled={true}
        nestedScrollEnabled={true}
      />
    </ScreenContainer>
  );
}
