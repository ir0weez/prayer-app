import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { format12HourTime, formatDecimalTo12Hour } from '@/lib/utils';

export interface TimeBlock {
  id: string;
  title: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  color: string;
  type: 'event' | 'ministry' | 'todo'; // for accessibility
}

interface TimelineVisualizationProps {
  blocks: TimeBlock[];
  dayStartHour?: number;  // default 6 (6 AM)
  dayEndHour?: number;    // default 23 (11 PM)
}

export function TimelineVisualization({
  blocks,
  dayStartHour = 6,
  dayEndHour = 23,
}: TimelineVisualizationProps) {
  const colors = useColors();
  const totalHours = dayEndHour - dayStartHour;

  // Convert time string "HH:MM" to decimal hours
  const timeToDecimal = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  };

  // Calculate position and width for each block
  const calculatedBlocks = useMemo(() => {
    return blocks
      .map((block) => {
        const startDecimal = timeToDecimal(block.startTime);
        const endDecimal = timeToDecimal(block.endTime);

        // Clamp to day window
        const clampedStart = Math.max(startDecimal, dayStartHour);
        const clampedEnd = Math.min(endDecimal, dayEndHour);

        if (clampedStart >= clampedEnd) return null; // Block is outside day window

        const leftPercent = ((clampedStart - dayStartHour) / totalHours) * 100;
        const widthPercent = ((clampedEnd - clampedStart) / totalHours) * 100;

        return {
          ...block,
          leftPercent,
          widthPercent,
          displayStart: clampedStart,
          displayEnd: clampedEnd,
        };
      })
      .filter((b) => b !== null);
  }, [blocks, dayStartHour, dayEndHour, totalHours]);

  // Format time for display (convert to 12-hour AM/PM)
  const formatTime = (hours: number): string => {
    return formatDecimalTo12Hour(hours);
  };

  return (
    <View style={{ gap: 8 }}>
      {/* Hour labels */}
      <View style={{ flexDirection: 'row', height: 20, marginBottom: 4 }}>
        {Array.from({ length: totalHours + 1 }).map((_, i) => {
          const hour = dayStartHour + i;
          const leftPercent = (i / totalHours) * 100;
          // Convert to 12-hour format
          const period = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 || 12;
          return (
            <Text
              key={`hour-${i}`}
              style={{
                position: 'absolute',
                left: `${leftPercent}%`,
                fontSize: 10,
                color: colors.muted,
                transform: [{ translateX: -12 }], // Center text
              }}
            >
              {displayHour}{period.charAt(0)}
            </Text>
          );
        })}
      </View>

      {/* Timeline bar background */}
      <View
        style={{
          height: 40,
          backgroundColor: colors.surface,
          borderRadius: 8,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Time blocks */}
        {calculatedBlocks.map((block) => (
          <View
            key={block.id}
            style={{
              position: 'absolute',
              left: `${block.leftPercent}%`,
              width: `${block.widthPercent}%`,
              height: '100%',
              backgroundColor: block.color,
              opacity: 0.85,
              borderRadius: 4,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 4,
            }}
          >
            {/* Show title if block is wide enough */}
            {block.widthPercent > 8 && (
              <Text
                style={{
                  fontSize: 10,
                  color: '#FFFFFF',
                  fontWeight: '600',
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {block.title}
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Legend */}
      {calculatedBlocks.length > 0 && (
        <View style={{ gap: 6 }}>
          {calculatedBlocks.map((block) => (
            <View
              key={`legend-${block.id}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: block.color,
                  borderRadius: 2,
                }}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: colors.foreground,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {block.title}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: colors.muted,
                }}
              >
                {formatTime(block.displayStart)} - {formatTime(block.displayEnd)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
