import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { loadProfiles, addUserNote, type CommentaryProfile } from '@/lib/commentary-system';
import { cn } from '@/lib/utils';

interface AddCommentModalProps {
  visible: boolean;
  book: string;
  chapter: number;
  verse: number;
  onClose: () => void;
  onCommentAdded: () => void;
}

export function AddCommentModal({
  visible,
  book,
  chapter,
  verse,
  onClose,
  onCommentAdded,
}: AddCommentModalProps) {
  const colors = useColors();
  const [profiles, setProfiles] = useState<CommentaryProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadProfiles().then(p => {
        setProfiles(p);
        // Set default to first profile (usually @TriedByFire)
        if (p.length > 0) {
          setSelectedProfileId(p[0].id);
        }
      });
    }
  }, [visible]);

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    if (!selectedProfileId) {
      Alert.alert('Error', 'Please select an author profile');
      return;
    }

    setLoading(true);
    try {
      await addUserNote({
        book,
        chapter,
        verse,
        profileId: selectedProfileId,
        text: commentText.trim(),
      });

      Alert.alert('Success', 'Comment added!');
      setCommentText('');
      onCommentAdded();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to add comment');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50">
        <View className="flex-1 bg-background rounded-t-2xl mt-auto">
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-4 gap-4">
            {/* Header */}
            <View className="gap-1">
              <Text className="text-xl font-bold text-foreground">Add Comment</Text>
              <Text className="text-xs text-muted">
                {book} {chapter}:{verse}
              </Text>
            </View>

            {/* Author Selection */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Author</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
                {profiles.map(profile => (
                  <TouchableOpacity
                    key={profile.id}
                    onPress={() => setSelectedProfileId(profile.id)}
                    className={cn(
                      'px-4 py-2 rounded-full border-2 flex-row items-center gap-2',
                      selectedProfileId === profile.id
                        ? 'bg-primary border-primary'
                        : 'bg-surface border-border'
                    )}
                  >
                    <View
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: profile.color }}
                    />
                    <Text
                      className={cn(
                        'text-sm font-medium',
                        selectedProfileId === profile.id ? 'text-background' : 'text-foreground'
                      )}
                    >
                      {profile.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Selected Profile Info */}
            {selectedProfile && (
              <View className="p-3 rounded-lg bg-surface border border-border gap-2">
                <View className="flex-row items-center gap-2">
                  <View
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: selectedProfile.color }}
                  />
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">{selectedProfile.name}</Text>
                    <Text className="text-xs text-muted">{selectedProfile.handle}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Comment Text */}
            <View className="gap-2 flex-1">
              <Text className="text-sm font-semibold text-foreground">Comment</Text>
              <TextInput
                placeholder="Enter your commentary note..."
                placeholderTextColor={colors.muted}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                className="p-3 rounded-lg bg-surface border border-border text-foreground flex-1"
              />
              <Text className="text-xs text-muted text-right">
                {commentText.length} characters
              </Text>
            </View>

            {/* Actions */}
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={handleAddComment}
                disabled={loading}
                className="flex-1 p-3 rounded-lg bg-primary items-center"
              >
                <Text className="font-semibold text-background">
                  {loading ? 'Adding...' : 'Add Comment'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                disabled={loading}
                className="flex-1 p-3 rounded-lg bg-border items-center"
              >
                <Text className="font-semibold text-foreground">Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
