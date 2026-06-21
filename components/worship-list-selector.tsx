import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/hooks/use-colors';
import type { WorshipList } from '@/lib/worship-list';
import type { WorshipListLink } from '@/lib/schedule-data';

interface WorshipListSelectorProps {
  selectedDate: string;
  linkedWorshipList?: WorshipListLink;
  availableWorshipLists: WorshipList[];
  onSelectWorshipList: (list: WorshipList) => void;
  onRemoveWorshipList: () => void;
}

export function WorshipListSelector({
  selectedDate,
  linkedWorshipList,
  availableWorshipLists,
  onSelectWorshipList,
  onRemoveWorshipList,
}: WorshipListSelectorProps) {
  const colors = useColors();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <MaterialIcons name="music-note" size={20} color={colors.primary} />
            <Text style={[styles.title, { color: colors.foreground }]}>Worship</Text>
          </View>
          {linkedWorshipList && (
            <Pressable onPress={onRemoveWorshipList} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
              <MaterialIcons name="close" size={20} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {linkedWorshipList ? (
          <Pressable
            onPress={() => setShowModal(true)}
            style={({ pressed }) => [
              styles.selectedList,
              {
                backgroundColor: colors.primary + '15',
                borderColor: colors.primary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={styles.selectedListContent}>
              {linkedWorshipList.worshipListImageUrl && (
                <Image
                  source={{ uri: linkedWorshipList.worshipListImageUrl }}
                  style={styles.thumbnail}
                />
              )}
              <View style={styles.selectedListInfo}>
                <Text style={[styles.selectedListName, { color: colors.foreground }]} numberOfLines={1}>
                  {linkedWorshipList.worshipListName}
                </Text>
                <Text style={[styles.selectedListDate, { color: colors.muted }]}>
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
            </View>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setShowModal(true)}
            style={({ pressed }) => [
              styles.emptyState,
              {
                backgroundColor: colors.primary + '10',
                borderRadius: 8,
                paddingVertical: 12,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialIcons name="music-note" size={20} color={colors.muted} />
            <Text style={[styles.emptyStateText, { color: colors.muted, fontSize: 13 }]}>No worship list linked</Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.muted, fontSize: 11 }]}>Tap to add one</Text>
          </Pressable>
        )}
      </View>

      {/* Modal to select worship list */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View
            style={[
              styles.modalHeader,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Worship List</Text>
            <Pressable onPress={() => setShowModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <FlatList
            data={availableWorshipLists}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelectWorshipList(item);
                  setShowModal(false);
                }}
                style={({ pressed }) => [
                  styles.listItem,
                  {
                    backgroundColor: pressed ? colors.primary + '10' : 'transparent',
                  },
                ]}
              >
                {item.imageUrl && (
                  <Image source={{ uri: item.imageUrl }} style={styles.listItemThumbnail} />
                )}
                <View style={styles.listItemContent}>
                  <Text style={[styles.listItemName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.listItemCount, { color: colors.muted }]}>
                    {item.songs.length} {item.songs.length === 1 ? 'song' : 'songs'}
                  </Text>
                </View>
                {linkedWorshipList?.worshipListId === item.id && (
                  <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                )}
              </Pressable>
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialIcons name="music-note" size={48} color={colors.muted} />
                <Text style={[styles.emptyStateText, { color: colors.muted }]}>No worship lists yet</Text>
                <Text style={[styles.emptyStateSubtext, { color: colors.muted }]}>
                  Create a worship list in the app to link it here
                </Text>
              </View>
            }
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedList: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  selectedListContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  selectedListInfo: {
    flex: 1,
  },
  selectedListName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedListDate: {
    fontSize: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    padding: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  listItemThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  listItemContent: {
    flex: 1,
  },
  listItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  listItemCount: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});
