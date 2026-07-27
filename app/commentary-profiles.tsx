import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, FlatList } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { loadProfiles, addProfile, updateProfile, deleteProfile, type CommentaryProfile } from '@/lib/commentary-system';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A8D8EA',
];

export default function CommentaryProfilesScreen() {
  const colors = useColors();
  const [profiles, setProfiles] = useState<CommentaryProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    handle: '',
    color: PRESET_COLORS[0],
    avatarUrl: '',
  });

  useEffect(() => {
    loadProfiles().then(setProfiles);
  }, []);

  const handleAddProfile = async () => {
    if (!formData.name.trim() || !formData.handle.trim()) {
      Alert.alert('Error', 'Name and handle are required');
      return;
    }

    if (editingId) {
      await updateProfile(editingId, formData);
    } else {
      await addProfile(formData);
    }

    const updated = await loadProfiles();
    setProfiles(updated);
    resetForm();
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.find(p => p.id === id)?.isDefault) {
      Alert.alert('Error', 'Cannot delete the default profile');
      return;
    }

    Alert.alert('Delete Profile', 'Are you sure?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          await deleteProfile(id);
          const updated = await loadProfiles();
          setProfiles(updated);
        },
      },
    ]);
  };

  const resetForm = () => {
    setFormData({ name: '', handle: '', color: PRESET_COLORS[0], avatarUrl: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEditProfile = (profile: CommentaryProfile) => {
    setFormData({
      name: profile.name,
      handle: profile.handle,
      color: profile.color,
      avatarUrl: profile.avatarUrl || '',
    });
    setEditingId(profile.id);
    setShowForm(true);
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="p-4 gap-4">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-2xl font-bold text-foreground">Commentary Profiles</Text>
            <Text className="text-sm text-muted">
              Create author personas for your commentary notes
            </Text>
          </View>

          {/* Profiles List */}
          <View className="gap-3">
            {profiles.map(profile => (
              <View
                key={profile.id}
                className="flex-row items-center gap-3 p-3 rounded-lg border border-border bg-surface"
              >
                {/* Color indicator */}
                <View
                  className="w-12 h-12 rounded-full"
                  style={{ backgroundColor: profile.color }}
                />

                {/* Profile info */}
                <View className="flex-1 gap-1">
                  <Text className="font-semibold text-foreground">{profile.name}</Text>
                  <Text className="text-xs text-muted">{profile.handle}</Text>
                </View>

                {/* Actions */}
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => handleEditProfile(profile)}
                    className="px-3 py-2 rounded-lg bg-primary"
                  >
                    <Text className="text-xs font-semibold text-background">Edit</Text>
                  </TouchableOpacity>

                  {!profile.isDefault && (
                    <TouchableOpacity
                      onPress={() => handleDeleteProfile(profile.id)}
                      className="px-3 py-2 rounded-lg bg-error"
                    >
                      <Text className="text-xs font-semibold text-background">Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Add Profile Button */}
          {!showForm && (
            <TouchableOpacity
              onPress={() => setShowForm(true)}
              className="p-4 rounded-lg bg-primary items-center"
            >
              <Text className="font-semibold text-background">+ Add Profile</Text>
            </TouchableOpacity>
          )}

          {/* Form */}
          {showForm && (
            <View className="p-4 rounded-lg bg-surface border border-border gap-4">
              <Text className="font-semibold text-foreground">
                {editingId ? 'Edit Profile' : 'New Profile'}
              </Text>

              {/* Name */}
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">Name</Text>
                <TextInput
                  placeholder="e.g., Tried By Fire"
                  placeholderTextColor={colors.muted}
                  value={formData.name}
                  onChangeText={name => setFormData({ ...formData, name })}
                  className="p-3 rounded-lg bg-background border border-border text-foreground"
                />
              </View>

              {/* Handle */}
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">Handle</Text>
                <TextInput
                  placeholder="e.g., @TriedByFire"
                  placeholderTextColor={colors.muted}
                  value={formData.handle}
                  onChangeText={handle => setFormData({ ...formData, handle })}
                  className="p-3 rounded-lg bg-background border border-border text-foreground"
                />
              </View>

              {/* Avatar URL */}
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">Avatar URL (optional)</Text>
                <TextInput
                  placeholder="https://..."
                  placeholderTextColor={colors.muted}
                  value={formData.avatarUrl}
                  onChangeText={avatarUrl => setFormData({ ...formData, avatarUrl })}
                  className="p-3 rounded-lg bg-background border border-border text-foreground"
                />
              </View>

              {/* Color Picker */}
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">Color</Text>
                <View className="flex-row flex-wrap gap-2">
                  {PRESET_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setFormData({ ...formData, color })}
                      className={cn(
                        'w-12 h-12 rounded-full border-2',
                        formData.color === color ? 'border-foreground' : 'border-border'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </View>
              </View>

              {/* Form Actions */}
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={handleAddProfile}
                  className="flex-1 p-3 rounded-lg bg-primary items-center"
                >
                  <Text className="font-semibold text-background">
                    {editingId ? 'Update' : 'Create'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={resetForm}
                  className="flex-1 p-3 rounded-lg bg-border items-center"
                >
                  <Text className="font-semibold text-foreground">Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
