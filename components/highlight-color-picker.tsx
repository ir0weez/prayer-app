import { View, Pressable, Text, Modal } from 'react-native';
import { useColors } from '@/hooks/use-colors';

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange';

interface HighlightColorPickerProps {
  visible: boolean;
  onSelectColor: (color: HighlightColor) => void;
  onClose: () => void;
  onBookmark?: () => void;
  isBookmarked?: boolean;
}

const HIGHLIGHT_COLORS: Record<HighlightColor, { bg: string; label: string }> = {
  yellow: { bg: '#FEF08A', label: 'Yellow' },
  green: { bg: '#86EFAC', label: 'Green' },
  blue: { bg: '#93C5FD', label: 'Blue' },
  pink: { bg: '#F472B6', label: 'Pink' },
  orange: { bg: '#FED7AA', label: 'Orange' },
};

export function HighlightColorPicker({
  visible,
  onSelectColor,
  onClose,
  onBookmark,
  isBookmarked,
}: HighlightColorPickerProps) {
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            width: '80%',
            borderWidth: 1,
            borderColor: colors.border,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.foreground,
              marginBottom: 16,
            }}
          >
            Choose Highlight Color
          </Text>

          <View style={{ gap: 8 }}>
            {(Object.entries(HIGHLIGHT_COLORS) as [HighlightColor, typeof HIGHLIGHT_COLORS[HighlightColor]][]).map(
              ([colorKey, { bg, label }]) => (
                <Pressable
                  key={colorKey}
                  onPress={() => {
                    onSelectColor(colorKey);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderRadius: 8,
                      backgroundColor: pressed ? colors.border : 'transparent',
                      gap: 12,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      backgroundColor: bg,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.foreground,
                      fontWeight: '500',
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              )
            )}
          </View>

          {/* Bookmark button */}
          {onBookmark && (
            <Pressable
              onPress={() => {
                onBookmark();
                onClose();
              }}
              style={({ pressed }) => ([
                {
                  marginTop: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: isBookmarked ? 'rgba(34, 197, 94, 0.2)' : colors.border,
                  alignItems: 'center',
                  opacity: pressed ? 0.7 : 1,
                },
              ])}
            >
              <Text
                style={{
                  color: isBookmarked ? colors.success : colors.foreground,
                  fontWeight: '600',
                  fontSize: 14,
                }}
              >
                {isBookmarked ? '✓ Bookmarked' : 'Bookmark This Verse'}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={onClose}
            style={{
              marginTop: onBookmark ? 8 : 16,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: colors.primary,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export { HIGHLIGHT_COLORS };
