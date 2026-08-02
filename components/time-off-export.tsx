import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/hooks/use-colors';
import {
  TimeOff,
  getTimeOffWithDuration,
} from '@/lib/time-off';
import {
  generateTimeOffSummary,
  generateTimeOffMarkdown,
  copyTimeOffToClipboard,
  shareTimeOffSummary,
  getTimeOffStats,
} from '@/lib/time-off-export';
import { formatDateLocal } from '@/lib/date-utils';

interface TimeOffExportProps {
  visible: boolean;
  onClose: () => void;
  timeOffList: TimeOff[];
}

export function TimeOffExport({ visible, onClose, timeOffList }: TimeOffExportProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);

  const stats = getTimeOffStats(timeOffList);

  const handleCopyText = async () => {
    setLoading(true);
    try {
      const success = await copyTimeOffToClipboard(timeOffList);
      if (success) {
        Alert.alert('Copied', 'Time-off summary copied to clipboard');
      } else {
        Alert.alert('Error', 'Failed to copy to clipboard');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    setLoading(true);
    try {
      const success = await shareTimeOffSummary(timeOffList);
      if (success) {
        Alert.alert('Success', 'Time-off summary prepared for sharing');
      } else {
        Alert.alert('Error', 'Failed to share');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>Export Time-Off</Text>
          <Pressable onPress={onClose} style={{ padding: 8 }}>
            <MaterialIcons name="close" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
            {/* Statistics */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                gap: 12,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>Summary</Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>Total Periods</Text>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: colors.primary }}>
                    {stats.totalPeriods}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>Total Days</Text>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: colors.primary }}>
                    {stats.totalDays}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>Upcoming</Text>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: colors.success }}>
                    {stats.upcomingCount}
                  </Text>
                </View>
              </View>

              {Object.keys(stats.byType).length > 0 && (
                <View style={{ marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>By Type</Text>
                  {Object.entries(stats.byType).map(([type, days]) => (
                    <View key={type} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, color: colors.foreground, textTransform: 'capitalize' }}>
                        {type}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>
                        {days} day{days !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Preview */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground, marginBottom: 12 }}>
                Preview
              </Text>
              <ScrollView
                style={{
                  backgroundColor: colors.background,
                  borderRadius: 8,
                  padding: 12,
                  maxHeight: 200,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.muted,
                    fontFamily: 'monospace',
                    lineHeight: 18,
                  }}
                >
                  {generateTimeOffSummary(timeOffList)}
                </Text>
              </ScrollView>
            </View>

            {/* Actions */}
            <View style={{ gap: 12 }}>
              <Pressable
                onPress={handleCopyText}
                disabled={loading}
                style={({ pressed }) => [{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: colors.primary,
                  opacity: pressed || loading ? 0.7 : 1,
                }]}
              >
                <MaterialIcons name="content-copy" size={20} color="white" />
                <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                  Copy to Clipboard
                </Text>
              </Pressable>

              <Pressable
                onPress={handleShare}
                disabled={loading}
                style={({ pressed }) => [{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed || loading ? 0.7 : 1,
                }]}
              >
                <MaterialIcons name="share" size={20} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
                  Share Summary
                </Text>
              </Pressable>
            </View>

            {/* Time-off List */}
            {timeOffList.length > 0 && (
              <View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground, marginBottom: 12 }}>
                  All Time-Off Periods
                </Text>
                {timeOffList.map((timeOff) => {
                  const withDuration = getTimeOffWithDuration(timeOff);
                  return (
                    <View
                      key={timeOff.id}
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 8,
                        borderLeftWidth: 4,
                        borderLeftColor: colors.primary,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground, flex: 1 }}>
                          {timeOff.title}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.muted }}>
                          {withDuration.durationDays}d
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.muted }}>
                        {formatDateLocal(new Date(timeOff.startDate))} - {formatDateLocal(new Date(timeOff.endDate))}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
