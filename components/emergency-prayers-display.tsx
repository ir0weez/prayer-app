import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/hooks/use-colors';
import { formatEmergencyPrayerCountdown, type PrayerItem } from '@/lib/prayercircle-data';

interface EmergencyPrayersDisplayProps {
  emergencyPrayers: PrayerItem[];
  onPrayerPress?: (prayer: PrayerItem) => void;
  onRemove?: (prayerId: string) => void;
  onPraise?: (prayerId: string) => void;
}

export function EmergencyPrayersDisplay({
  emergencyPrayers,
  onPrayerPress,
  onRemove,
  onPraise,
}: EmergencyPrayersDisplayProps) {
  const colors = useColors();
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});
  const [praiseCountdowns, setPraiseCountdowns] = useState<Record<string, string>>({});

  // Update countdowns every second
  useEffect(() => {
    const interval = setInterval(() => {
      const newCountdowns: Record<string, string> = {};
      const newPraiseCountdowns: Record<string, string> = {};
      emergencyPrayers.forEach((prayer) => {
        if (prayer.emergencyExpiresAt) {
          const expiresAt = new Date(prayer.emergencyExpiresAt).getTime();
          const now = new Date().getTime();
          const millisRemaining = Math.max(0, expiresAt - now);
          newCountdowns[prayer.id] = formatEmergencyPrayerCountdown(millisRemaining);
        }
        if (prayer.praiseExpiresAt) {
          const expiresAt = new Date(prayer.praiseExpiresAt).getTime();
          const now = new Date().getTime();
          const millisRemaining = Math.max(0, expiresAt - now);
          newPraiseCountdowns[prayer.id] = formatEmergencyPrayerCountdown(millisRemaining);
        }
      });
      setCountdowns(newCountdowns);
      setPraiseCountdowns(newPraiseCountdowns);
    }, 1000);

    return () => clearInterval(interval);
  }, [emergencyPrayers]);

  if (emergencyPrayers.length === 0) {
    return null;
  }

  const renderPrayer = ({ item }: { item: PrayerItem }) => {
    const countdown = countdowns[item.id] || '';
    const praiseCountdown = praiseCountdowns[item.id] || '';
    const isExpiring = countdown.includes('0m') || countdown.includes('expired') || countdown.includes('Expired');
    const isPraiseActive = item.isPraised && praiseCountdown;
    
    return (
      <Pressable
        onPress={() => onPrayerPress?.(item)}
        style={({ pressed }) => [
          styles.prayerCard,
          {
            backgroundColor: colors.surface,
            borderColor: isExpiring ? colors.error : colors.primary,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View style={styles.prayerContent}>
          <View style={styles.prayerInfo}>
            <MaterialIcons name="emergency" size={20} color={colors.error} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.prayerTitle, { color: colors.foreground }]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.title && (
                <Text style={[styles.prayerDescription, { color: colors.muted }]} numberOfLines={1}>
                  Prayer Request
                </Text>
              )}
            </View>
          </View>
          <View style={styles.countdownBadge}>
            <Text
              style={[
                styles.countdownText,
                {
                  color: isExpiring ? colors.error : colors.primary,
                  fontWeight: isExpiring ? '700' : '600',
                },
              ]}
            >
              {countdown}
            </Text>
          </View>
        </View>
        <View style={styles.actionButtons}>
          {onPraise && (
            <Pressable
              onPress={() => onPraise(item.id)}
              style={({ pressed }) => [
                styles.praiseButton,
                {
                  backgroundColor: isPraiseActive ? '#3B82F6' : '#E0E7FF',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <MaterialIcons 
                name="thumb-up" 
                size={14} 
                color={isPraiseActive ? '#FFFFFF' : '#3B82F6'} 
              />
              <Text
                style={[
                  styles.praiseButtonText,
                  {
                    color: isPraiseActive ? '#FFFFFF' : '#3B82F6',
                  },
                ]}
              >
                Praise
              </Text>
              {isPraiseActive && (
                <Text
                  style={[
                    styles.praiseCountdownText,
                    {
                      color: '#FFFFFF',
                    },
                  ]}
                >
                  {praiseCountdown}
                </Text>
              )}
            </Pressable>
          )}
          {onRemove && (
            <Pressable
              onPress={() => onRemove(item.id)}
              style={({ pressed }) => [styles.removeButton, pressed && { opacity: 0.6 }]}
            >
              <MaterialIcons name="close" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <MaterialIcons name="emergency" size={18} color={colors.error} />
        <Text style={[styles.headerText, { color: colors.error }]}>
          {emergencyPrayers.length} Emergency Prayer{emergencyPrayers.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <FlatList
        data={emergencyPrayers}
        renderItem={renderPrayer}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    maxHeight: 300,
  },
  prayerCard: {
    flexDirection: 'column',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: 8,
  },
  prayerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  prayerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prayerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  prayerDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  countdownBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  praiseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  praiseButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  praiseCountdownText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  removeButton: {
    padding: 4,
  },
});
