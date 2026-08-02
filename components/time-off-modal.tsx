import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/hooks/use-colors';
import { DateTimePicker } from './date-time-picker';
import {
  TimeOff,
  TimeOffType,
  getAllTimeOff,
  createTimeOff,
  updateTimeOff,
  deleteTimeOff,
  getTimeOffWithDuration,
  getTimeOffColor,
  getTimeOffTextColor,
  getTimeOffIcon,
  getTimeOffLabel,
  getActiveTimeOff,
} from '@/lib/time-off';
import { formatDateLocal } from '@/lib/date-utils';
import { TimeOffExport } from './time-off-export';

interface TimeOffModalProps {
  visible: boolean;
  onClose: () => void;
  onTimeOffUpdated?: () => void;
}

const TIME_OFF_TYPES: TimeOffType[] = ['vacation', 'sick', 'personal', 'sabbatical', 'other'];

export function TimeOffModal({ visible, onClose, onTimeOffUpdated }: TimeOffModalProps) {
  const colors = useColors();
  const [timeOffList, setTimeOffList] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<TimeOffType>('vacation');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [selectedColor, setSelectedColor] = useState('#E1F5FE');

  useEffect(() => {
    if (visible) {
      loadTimeOff();
    }
  }, [visible]);

  const loadTimeOff = async () => {
    setLoading(true);
    try {
      const data = await getAllTimeOff();
      setTimeOffList(data);
    } catch (error) {
      console.error('Error loading time-off:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setType('vacation');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setSelectedColor('#E1F5FE');
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (startDate > endDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await updateTimeOff(editingId, { title, type, startDate, endDate, notes, color: selectedColor });
      } else {
        await createTimeOff(title, type, startDate, endDate, notes, selectedColor);
      }

      await loadTimeOff();
      resetForm();
      setShowForm(false);
      onTimeOffUpdated?.();
    } catch (error) {
      console.error('Error saving time-off:', error);
      Alert.alert('Error', 'Failed to save time-off');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Time-Off', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await deleteTimeOff(id);
            await loadTimeOff();
            onTimeOffUpdated?.();
          } catch (error) {
            console.error('Error deleting time-off:', error);
            Alert.alert('Error', 'Failed to delete time-off');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleEdit = (timeOff: TimeOff) => {
    setTitle(timeOff.title);
    setType(timeOff.type);
    setStartDate(timeOff.startDate);
    setEndDate(timeOff.endDate);
    setNotes(timeOff.notes || '');
    setEditingId(timeOff.id);
    setShowForm(true);
  };

  const activeTimeOff = getActiveTimeOff(timeOffList);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>Time Off</Text>
          <Pressable onPress={onClose} style={{ padding: 8 }}>
            <MaterialIcons name="close" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        {loading && !showForm ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : showForm ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
              {editingId ? 'Edit Time-Off' : 'Add Time-Off'}
            </Text>

            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 8 }}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Summer Vacation"
                placeholderTextColor={colors.muted}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.foreground,
                  fontSize: 14,
                }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 8 }}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
                  {TIME_OFF_TYPES.map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setType(t)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor: type === t ? colors.primary : colors.surface,
                        borderWidth: 1,
                        borderColor: type === t ? colors.primary : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: type === t ? 'white' : colors.foreground,
                        }}
                      >
                        {getTimeOffLabel(t)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 8 }}>Start Date</Text>
              <DateTimePicker value={startDate} onChange={setStartDate} mode="date" label="Start Date" />
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 8 }}>End Date</Text>
              <DateTimePicker value={endDate} onChange={setEndDate} mode="date" label="End Date" />
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 8 }}>Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
                  {['#E1F5FE', '#F3E5F5', '#E8F5E9', '#FFF3E0', '#FCE4EC', '#F1F8E9'].map((color) => (
                    <Pressable
                      key={color}
                      onPress={() => {
                        const timeOffWithColor = editingId
                          ? timeOffList.find((to) => to.id === editingId)
                          : null;
                        if (timeOffWithColor && editingId) {
                          updateTimeOff(editingId, { ...timeOffWithColor, color });
                        }
                        // For new items, we'll update color in handleSave
                      }}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor: color,
                        borderWidth: 2,
                        borderColor: editingId && timeOffList.find((to) => to.id === editingId)?.color === color ? colors.primary : 'transparent',
                      }}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 8 }}>Notes (Optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.foreground,
                  fontSize: 14,
                  textAlignVertical: 'top',
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Pressable
                onPress={() => {
                  resetForm();
                  setShowForm(false);
                }}
                style={({ pressed }) => [{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.7 : 1,
                }]}
              >
                <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={loading}
                style={({ pressed }) => [{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: colors.primary,
                  opacity: pressed || loading ? 0.7 : 1,
                }]}
              >
                <Text style={{ color: 'white', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                  {loading ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
            {activeTimeOff.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <MaterialIcons name="event-available" size={48} color={colors.muted} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.muted, marginTop: 12 }}>
                  No time-off scheduled
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4, textAlign: 'center' }}>
                  Add a vacation, sick day, or personal time
                </Text>
              </View>
            ) : (
              activeTimeOff.map((timeOff) => {
                const withDuration = getTimeOffWithDuration(timeOff);
                const bgColor = getTimeOffColor(timeOff.type);
                const textColor = getTimeOffTextColor(timeOff.type);
                const icon = getTimeOffIcon(timeOff.type);

                return (
                  <Pressable
                    key={timeOff.id}
                    style={({ pressed }) => [{
                      backgroundColor: bgColor,
                      borderRadius: 12,
                      padding: 16,
                      opacity: pressed ? 0.7 : 1,
                    }]}
                    onPress={() => handleEdit(timeOff)}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <MaterialIcons name={icon as any} size={24} color={textColor} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: textColor }}>
                            {timeOff.title}
                          </Text>
                          <Text style={{ fontSize: 12, color: textColor, opacity: 0.8, marginTop: 2 }}>
                            {withDuration.durationDays} day{withDuration.durationDays !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>
                      <Pressable onPress={() => handleDelete(timeOff.id)} style={{ padding: 8 }}>
                        <MaterialIcons name="close" size={20} color={textColor} />
                      </Pressable>
                    </View>
                    <Text style={{ fontSize: 12, color: textColor, opacity: 0.8 }}>
                      {formatDateLocal(new Date(timeOff.startDate))} - {formatDateLocal(new Date(timeOff.endDate))}
                    </Text>
                    {timeOff.notes && (
                      <Text style={{ fontSize: 12, color: textColor, opacity: 0.7, marginTop: 8 }}>
                        {timeOff.notes}
                      </Text>
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        )}

        {!showForm && (
          <>
            <Pressable
              onPress={() => {
                resetForm();
                setShowForm(true);
              }}
              style={({ pressed }) => [{
                position: 'absolute',
                bottom: 24,
                right: 24,
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.8 : 1,
              }]}
            >
              <MaterialIcons name="add" size={28} color="white" />
            </Pressable>

            {timeOffList.length > 0 && (
              <Pressable
                onPress={() => setShowExport(true)}
                style={({ pressed }) => [{
                  position: 'absolute',
                  bottom: 24,
                  right: 88,
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: colors.success,
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: pressed ? 0.8 : 1,
                }]}
              >
                <MaterialIcons name="share" size={28} color="white" />
              </Pressable>
            )}
          </>
        )}
      {/* Export Modal */}
      <TimeOffExport
        visible={showExport}
        onClose={() => setShowExport(false)}
        timeOffList={timeOffList}
      />
    </SafeAreaView>
    </Modal>
  );
}
