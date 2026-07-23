import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { BibleSection, BibleVerse } from '@/lib/bible-section-parser';

interface BibleStoryViewerProps {
  visible: boolean;
  section: BibleSection | null;
  onClose: () => void;
  onComplete?: () => void;
}

const STORY_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
];

export function BibleStoryViewer({
  visible,
  section,
  onClose,
  onComplete,
}: BibleStoryViewerProps) {
  const colors = useColors();
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    if (visible) {
      setCurrentVerseIndex(0);
    }
  }, [visible, section]);

  if (!section || section.verses.length === 0) {
    return null;
  }

  const currentVerse = section.verses[currentVerseIndex];
  const isLastVerse = currentVerseIndex === section.verses.length - 1;
  const backgroundColor = STORY_COLORS[section.startVerse % STORY_COLORS.length];

  const handleNext = () => {
    if (isLastVerse) {
      onComplete?.();
      onClose();
    } else {
      setCurrentVerseIndex(currentVerseIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentVerseIndex > 0) {
      setCurrentVerseIndex(currentVerseIndex - 1);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Progress bar */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: 'rgba(255,255,255,0.3)',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${((currentVerseIndex + 1) / section.verses.length) * 100}%`,
              backgroundColor: 'rgba(255,255,255,0.8)',
            }}
          />
        </View>

        {/* Close button */}
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 10,
            padding: 8,
          }}
        >
          <MaterialIcons name="close" size={28} color="white" />
        </Pressable>

        {/* Section title */}
        <Text
          style={{
            position: 'absolute',
            top: 60,
            fontSize: 14,
            color: 'rgba(255,255,255,0.7)',
            fontWeight: '500',
            paddingHorizontal: 16,
          }}
          numberOfLines={1}
        >
          {section.title}
        </Text>

        {/* Main content area */}
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingVertical: 40,
          }}
        >
          {/* Verse number */}
          <Text
            style={{
              fontSize: 32,
              fontWeight: '700',
              color: 'rgba(255,255,255,0.9)',
              marginBottom: 24,
            }}
          >
            {currentVerse.verse}
          </Text>

          {/* Verse text */}
          <Text
            style={{
              fontSize: 24,
              lineHeight: 36,
              color: 'white',
              textAlign: 'center',
              fontFamily: 'Georgia',
            }}
          >
            {currentVerse.text}
          </Text>
        </View>

        {/* Navigation areas */}
        <View style={{ flexDirection: 'row', flex: 1, width: '100%' }}>
          {/* Previous button */}
          <Pressable
            onPress={handlePrevious}
            disabled={currentVerseIndex === 0}
            style={{
              flex: 1,
              opacity: currentVerseIndex === 0 ? 0.3 : 1,
            }}
          />

          {/* Next button */}
          <Pressable
            onPress={handleNext}
            style={{
              flex: 1,
            }}
          />
        </View>

        {/* Verse counter at bottom */}
        <View
          style={{
            position: 'absolute',
            bottom: 24,
            alignSelf: 'center',
            backgroundColor: 'rgba(0,0,0,0.3)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
            {currentVerseIndex + 1} / {section.verses.length}
          </Text>
        </View>

        {/* Completion indicator */}
        {isLastVerse && (
          <View
            style={{
              position: 'absolute',
              bottom: 80,
              alignSelf: 'center',
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: 'white', fontSize: 12 }}>
              Tap to complete
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
