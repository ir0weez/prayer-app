import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useEffect, useState } from 'react';
import type { TimeOff } from '@/lib/time-off';

interface TimeOffCardProps {
  timeOff: TimeOff;
  onPress?: () => void;
}

export function TimeOffCard({ timeOff, onPress }: TimeOffCardProps) {
  const colors = useColors();
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    const calculateDaysRemaining = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(timeOff.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(timeOff.endDate);
      endDate.setHours(0, 0, 0, 0);
      
      // If time-off hasn't started yet, show 0
      if (today < startDate) {
        setDaysRemaining(0);
        return;
      }
      
      // If time-off has ended, show 0
      if (today > endDate) {
        setDaysRemaining(0);
        return;
      }
      
      // Calculate days remaining during the time-off period
      const remaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      setDaysRemaining(Math.max(0, remaining));
    };
    calculateDaysRemaining();
    const interval = setInterval(calculateDaysRemaining, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, [timeOff.startDate, timeOff.endDate]);

  // Type-specific configuration with Material Icons and refined colors
  const typeConfig: Record<string, { icon: string; label: string; bgColor: string; textColor: string }> = {
    vacation: {
      icon: 'flight-takeoff',
      label: 'Vacation',
      bgColor: '#FFF3E0',
      textColor: '#E65100',
    },
    sick: {
      icon: 'local-hospital',
      label: 'Sick Leave',
      bgColor: '#FFEBEE',
      textColor: '#C62828',
    },
    personal: {
      icon: 'self-improvement',
      label: 'Personal Time',
      bgColor: '#F3E5F5',
      textColor: '#6A1B9A',
    },
    sabbatical: {
      icon: 'trending-up',
      label: 'Sabbatical',
      bgColor: '#E3F2FD',
      textColor: '#1565C0',
    },
    other: {
      icon: 'pause-circle',
      label: 'Time Off',
      bgColor: '#E8F5E9',
      textColor: '#2E7D32',
    },
  };

  const config = typeConfig[timeOff.type] || typeConfig.other;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          marginBottom: 10,
          marginHorizontal: 0,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        <View
          style={{
            backgroundColor: config.bgColor,
            paddingTop: 12,
            paddingBottom: 12,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left: Icon and content */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <MaterialIcons name={config.icon as any} size={22} color={config.textColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: config.textColor,
                  marginBottom: 2,
                }}
                numberOfLines={1}
              >
                {timeOff.title}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '500',
                  color: config.textColor,
                  opacity: 0.7,
                }}
              >
                {timeOff.startDate.split('-').slice(1).join('-')} → {timeOff.endDate.split('-').slice(1).join('-')}
              </Text>
            </View>
          </View>

          {/* Right: Days remaining pill */}
          <View
            style={{
              backgroundColor: config.textColor,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              minWidth: 54,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: '#FFFFFF',
              }}
            >
              {daysRemaining}d
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
