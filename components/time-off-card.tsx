import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import type { TimeOff } from '@/lib/time-off';

interface TimeOffCardProps {
  timeOff: TimeOff;
  onPress?: () => void;
}

export function TimeOffCard({ timeOff, onPress }: TimeOffCardProps) {
  const colors = useColors();

  // Calculate duration
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
      icon: '📚',
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
          marginBottom: 16,
          marginHorizontal: 0,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        {/* Gradient background */}
        <View
          style={{
            backgroundColor: config.gradient[0],
            paddingTop: 20,
            paddingBottom: 20,
            paddingHorizontal: 20,
            borderRadius: 20,
          }}
        >
          {/* Top row: Icon and type label */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.4)',
              }}
            >
              <Text style={{ fontSize: 28 }}>{config.icon}</Text>
            </View>
            <View
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {duration}d
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 18,
              fontWeight: '800',
              color: '#FFFFFF',
              marginBottom: 8,
              letterSpacing: -0.3,
            }}
          >
            {timeOff.title}
          </Text>

          {/* Type label and dates */}
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.8)',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 4,
              }}
            >
              {config.label}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              {timeOff.startDate} → {timeOff.endDate}
            </Text>
          </View>

          {/* Notes if available */}
          {timeOff.notes && (
            <View
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                borderLeftWidth: 3,
                borderLeftColor: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontStyle: 'italic',
                  lineHeight: 16,
                }}
                numberOfLines={2}
              >
                {timeOff.notes}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
