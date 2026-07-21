import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useEffect, useState } from 'react';
import { parseVerseForChristWords } from '@/lib/christ-words';

export interface BibleChapterViewerProps {
  visible: boolean;
  book: string;
  chapter: number;
  onClose: () => void;
  onMarkComplete: () => Promise<void>;
  onPreviousChapter: () => void;
  onNextChapter: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

interface Verse {
  verse: number;
  text: string;
}

export function BibleChapterViewer({
  visible,
  book,
  chapter,
  onClose,
  onMarkComplete,
  onPreviousChapter,
  onNextChapter,
  canGoPrevious,
  canGoNext,
}: BibleChapterViewerProps) {
  const colors = useColors();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<'kjv' | 'csb'>('kjv');

  // Load Bible verses when modal becomes visible
  useEffect(() => {
    if (!visible) return;

    const loadVerses = async () => {
      setLoading(true);
      setError(null);
      setVerses([]);

      try {
        // Fetch from bible-api.com using selected translation
        const response = await fetch(
          `https://bible-api.com/${encodeURIComponent(`${book} ${chapter}`)}?translation=${version}`
        );

        if (!response.ok) {
          throw new Error(`Failed to load ${book} ${chapter}`);
        }

        const data = await response.json();

        // Parse verses from the API response
        if (data.verses && Array.isArray(data.verses)) {
          const parsedVerses: Verse[] = data.verses.map((v: any) => ({
            verse: v.verse,
            text: v.text.trim(),
          }));
          setVerses(parsedVerses);
        } else {
          throw new Error('No verses found in response');
        }
      } catch (err) {
        console.error('Error loading Bible chapter:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chapter');
      } finally {
        setLoading(false);
      }
    };

    loadVerses();
  }, [visible, book, chapter, version]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingTop: 48,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose} style={{ padding: 8 }}>
            <MaterialIcons name="close" size={24} color={colors.foreground} />
          </Pressable>
          
          <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 12 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: colors.foreground,
              }}
              numberOfLines={1}
            >
              {book} {chapter}
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 4, gap: 8 }}>
              <Pressable
                onPress={() => setVersion('kjv')}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4,
                  backgroundColor: version === 'kjv' ? colors.primary : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: version === 'kjv' ? '#fff' : colors.muted,
                  }}
                >
                  KJV
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setVersion('csb')}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4,
                  backgroundColor: version === 'csb' ? colors.primary : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: version === 'csb' ? '#fff' : colors.muted,
                  }}
                >
                  CSB
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={onMarkComplete}
            style={{ padding: 8 }}
          >
            <MaterialIcons name="check-circle" size={24} color={colors.primary} />
          </Pressable>
        </View>

        {/* Content */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <Text style={{ color: colors.error, textAlign: 'center' }}>
              {error}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={true}
          >
            {verses.map((verse) => {
              const segments = parseVerseForChristWords(verse.text);
              return (
                <View key={verse.verse} style={{ marginBottom: 18 }}>
                  <Text
                    style={{
                      fontSize: 17,
                      lineHeight: 26,
                      color: colors.foreground,
                      fontFamily: 'Georgia',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: colors.primary,
                        marginRight: 6,
                        fontFamily: 'Georgia',
                      }}
                    >
                      {verse.verse}
                    </Text>
                    {segments.map((segment, idx) => (
                      <Text
                        key={idx}
                        style={{
                          color: segment.isChristWords ? '#4A90E2' : colors.foreground,
                          fontFamily: 'Georgia',
                        }}
                      >
                        {segment.text}
                      </Text>
                    ))}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Floating Pill Navigation */}
        <View
          style={{
            position: 'absolute',
            bottom: 24,
            left: 0,
            right: 0,
            alignItems: 'center',
            pointerEvents: 'box-none',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: colors.surface,
              borderRadius: 32,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Pressable
              onPress={onPreviousChapter}
              disabled={!canGoPrevious}
              style={{
                padding: 8,
                opacity: canGoPrevious ? 1 : 0.3,
              }}
            >
              <MaterialIcons name="chevron-left" size={24} color={colors.foreground} />
            </Pressable>

            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: colors.foreground,
                marginHorizontal: 12,
                minWidth: 70,
                textAlign: 'center',
              }}
            >
              Chapter {chapter}
            </Text>

            <Pressable
              onPress={onNextChapter}
              disabled={!canGoNext}
              style={{
                padding: 8,
                opacity: canGoNext ? 1 : 0.3,
              }}
            >
              <MaterialIcons name="chevron-right" size={24} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
