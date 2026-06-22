import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Modal, TextInput, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { WorshipListCard } from '@/components/worship-list-card';
import { AddWorshipSongModal } from '@/components/add-worship-song-modal';
import { createWorshipList, addSongToList, WORSHIP_LISTS_KEY, type WorshipList } from '@/lib/worship-list';

export function WorshipScreen() {
  const colors = useColors();
  const [worshipLists, setWorshipLists] = useState<WorshipList[]>([]);
  const [showAddSongModal, setShowAddSongModal] = useState(false);
  const [selectedWorshipListId, setSelectedWorshipListId] = useState<string | null>(null);
  const [newWorshipListName, setNewWorshipListName] = useState('');
  const [showCreateListModal, setShowCreateListModal] = useState(false);

  // Load worship lists
  useEffect(() => {
    const loadWorshipLists = async () => {
      try {
        const data = await AsyncStorage.getItem(WORSHIP_LISTS_KEY);
        if (data) {
          setWorshipLists(JSON.parse(data));
        }
      } catch (error) {
        console.error('Error loading worship lists:', error);
      }
    };
    loadWorshipLists();
  }, []);

  // Save worship lists whenever they change
  useEffect(() => {
    if (worshipLists.length > 0) {
      AsyncStorage.setItem(WORSHIP_LISTS_KEY, JSON.stringify(worshipLists)).catch(console.error);
    }
  }, [worshipLists]);

  const handleCreateWorshipList = () => {
    if (!newWorshipListName.trim()) return;
    const newList = createWorshipList(newWorshipListName);
    setWorshipLists([...worshipLists, newList]);
    setNewWorshipListName('');
    setShowCreateListModal(false);
  };

  const handleAddSongToList = (song: any) => {
    if (!selectedWorshipListId) return;
    setWorshipLists(worshipLists.map(list =>
      list.id === selectedWorshipListId ? addSongToList(list, song) : list
    ));
    setShowAddSongModal(false);
  };

  const handleDeleteWorshipList = (listId: string) => {
    setWorshipLists(worshipLists.filter(list => list.id !== listId));
  };

  return (
    <ScreenContainer className="p-4" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Worship Lists</Text>
          <Pressable
            onPress={() => setShowCreateListModal(true)}
            style={({ pressed }) => [styles.createButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <MaterialIcons name="add" size={24} color="#FFFFFF" />
            <Text style={styles.createButtonText}>New List</Text>
          </Pressable>
        </View>

        {worshipLists.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="music-note" size={54} color={colors.muted} />
            <Text style={[styles.emptyStateTitle, { color: colors.foreground }]}>No Worship Lists Yet</Text>
            <Text style={[styles.emptyStateText, { color: colors.muted }]}>Create your first worship list to get started</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {worshipLists.map(list => (
              <WorshipListCard
                key={list.id}
                list={list}
                onPress={() => {
                  setSelectedWorshipListId(list.id);
                  setShowAddSongModal(true);
                }}
                onDelete={() => handleDeleteWorshipList(list.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showCreateListModal} transparent animationType="slide" onRequestClose={() => setShowCreateListModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCreateListModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Create Worship List</Text>
            <TextInput
              placeholder="List name (e.g., Sunday Worship)"
              placeholderTextColor={colors.muted}
              value={newWorshipListName}
              onChangeText={setNewWorshipListName}
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowCreateListModal(false)}
                style={({ pressed }) => [styles.modalButton, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.modalButtonText, { color: colors.primary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreateWorshipList}
                disabled={!newWorshipListName.trim()}
                style={({ pressed }) => [styles.modalButton, { backgroundColor: colors.primary, opacity: !newWorshipListName.trim() ? 0.5 : pressed ? 0.8 : 1 }]}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <AddWorshipSongModal
        visible={showAddSongModal}
        onClose={() => setShowAddSongModal(false)}
        onAdd={handleAddSongToList}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  listContainer: {
    gap: 12,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
