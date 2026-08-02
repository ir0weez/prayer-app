import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useEffect, useState } from 'react';
import type { TimeOff } from '@/lib/time-off';

interface TimeOffCardProps {
  timeOff: TimeOff;
  onPress?: () => void;
}

function formatDateWithoutYear(dateStr: string): string {
  return dateStr.split('-').slice(1).join('-');
}

export function TimeOffCard({ timeOff, onPress }: TimeOffCardProps) {
  const colors = useColors();
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    const calculateDaysRemaining = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(timeOff.endDate);
      endDate.setHours(0, 0, 0, 0);
      const remaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      setDaysRemaining(Math.max(0, remaining));
    };
    calculateDaysRemaining();
    const interval = setInterval(calculateDaysRemaining, 1000 * 60 * 60); // Update every hour
    return () => clearInterval(interval);
  }, [timeOff.endDate]);

  // Calculate total duration
  const duration = timeOff.endDate && timeOff.startDate
    ? Math.ceil((new Date(timeOff.endDate).getTime() - new Date(timeOff.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 1;

  // Type-specific configuration with better icons and symbolic meaning
  const typeConfig: Record<string, { icon: string; label: string; gradient: [string, string]; accentColor: string }> = {
    vacation: {
      icon: '✈️',
      label: 'Vacation',
      gradient: ['#FFA726', '#FB8C00'],
      accentColor: '#FF6F00',
    },
    sick: {
      icon: '🏥',
      label: 'Sick Leave',
      gradient: ['#EF5350', '#E53935'],
      accentColor: '#C62828',
    },
    personal: {
      icon: '🧘',
      label: 'Personal Time',
      gradient: ['#AB47BC', '#8E24AA'],
      accentColor: '#6A1B9A',
    },
    sabbatical: {
      icon: '🔄',
      label: 'Sabbatical',
      gradient: ['#29B6F6', '#1976D2'],
      accentColor: '#0D47A1',
    },
    other: {
      icon: '⏸️',
      label: 'Time Off',
      gradient: ['#66BB6A', '#43A047'],
      accentColor: '#2E7D32',
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
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={{
          borderRadius: 14,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        {/* Gradient background */}
        <View
          style={{
            backgroundColor: config.gradient[0],
            paddingTop: 12,
            paddingBottom: 12,
            paddingHorizontal: 14,
            borderRadius: 14,
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
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.3)',
              }}
            >
              <Text style={{ fontSize: 20 }}>{config.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#FFFFFF',
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
                  color: 'rgba(255, 255, 255, 0.85)',
                }}
              >
                {timeOff.startDate.split('-').slice(1).join('-')} → {timeOff.endDate.split('-').slice(1).join('-')}
              </Text>
            </View>
          </View>

          {/* Right: Days remaining pill */}
          <View
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
              minWidth: 50,
              alignItems: 'center',
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
