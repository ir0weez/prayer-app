import { View, Text, ScrollView, Pressable } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { addDays, getWeekStart, formatDateLocal } from '@/lib/date-utils';
import { useMemo } from 'react';

interface TimeBlock {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color: string;
  isCompleted?: boolean;
  type?: 'todo' | 'event' | 'ministry';
}

interface DayColumn {
  date: Date;
  dayName: string;
  dayNumber: number;
  timeBlocks: TimeBlock[];
}

interface WeeklyCalendarViewProps {
  selectedDate: Date;
  timeBlocks: TimeBlock[];
  onDayPress?: (date: Date) => void;
  onBlockPress?: (block: TimeBlock) => void;
}

const HOUR_HEIGHT = 60;
const START_HOUR = 0; // Allow scrolling from midnight
const END_HOUR = 24; // Show full 24-hour day
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

function isTodo(block: TimeBlock): boolean {
  return block.type === 'todo';
}

function getStartHourIndex(startTime: string): number {
  const startMins = timeToMinutes(startTime);
  const startHourOffset = START_HOUR * 60;
  const hourIndex = Math.floor((startMins - startHourOffset) / 60);
  return Math.max(0, hourIndex);
}

function getBlockHeightInHours(startTime: string, endTime: string): number {
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  const durationMins = endMins - startMins;
  return durationMins / 60;
}

export function WeeklyCalendarView({
  selectedDate,
  timeBlocks,
  onDayPress,
  onBlockPress,
}: WeeklyCalendarViewProps) {
  const colors = useColors();
  
  const weekDays = useMemo(() => {
    const weekStart = getWeekStart(selectedDate);
    const days: DayColumn[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dateStr = formatDateLocal(date);
      const dayBlocks = timeBlocks.filter(block => {
        return block.id.includes(dateStr);
      });
      
      days.push({
        date,
        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
        dayNumber: date.getDate(),
        timeBlocks: dayBlocks,
      });
    }
    
    return days;
  }, [selectedDate, timeBlocks]);
  
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Day headers */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ width: 60 }} />
        {weekDays.map((day) => (
          <Pressable
            key={day.date.toISOString()}
            onPress={() => onDayPress?.(day.date)}
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border }}
          >
            <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '500' }}>{day.dayName}</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, marginTop: 4 }}>{day.dayNumber}</Text>
          </Pressable>
        ))}
      </View>
      
      {/* Time grid */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {HOURS.map((hour, hourIdx) => (
          <View key={hour} style={{ flexDirection: 'row', minHeight: HOUR_HEIGHT, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            {/* Hour label */}
            <View style={{ width: 60, justifyContent: 'flex-start', paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 11, color: colors.muted }}>
                {hour % 12 === 0 ? 12 : hour % 12} {hour < 12 ? 'AM' : 'PM'}
              </Text>
            </View>
            
            {/* Day columns */}
            {weekDays.map((day) => (
              <View
                key={`${day.date.toISOString()}-${hour}`}
                style={{
                  flex: 1,
                  borderRightWidth: 1,
                  borderRightColor: colors.border,
                  backgroundColor: colors.surface,
                  position: 'relative',
                }}
              >
                {/* Render events and ministries */}
                {day.timeBlocks
                  .filter(block => !isTodo(block))
                  .filter(block => getStartHourIndex(block.startTime) === hourIdx)
                  .map((block) => {
                    const heightInHours = getBlockHeightInHours(block.startTime, block.endTime);
                    const blockHeight = heightInHours * HOUR_HEIGHT;
                    return (
                      <Pressable
                        key={block.id}
                        onPress={() => onBlockPress?.(block)}
                        style={{
                          position: 'absolute',
                          left: 4,
                          right: 4,
                          top: 0,
                          height: blockHeight,
                          backgroundColor: block.color,
                          borderRadius: 4,
                          padding: 4,
                          opacity: block.isCompleted ? 0.6 : 1,
                          zIndex: 10,
                        }}
                      >
                        <Text 
                          style={{ 
                            fontSize: 10, 
                            fontWeight: '600', 
                            color: '#fff', 
                            lineHeight: 12,
                            textDecorationLine: block.isCompleted ? 'line-through' : 'none',
                          }}
                          numberOfLines={3}
                        >
                          {block.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                
                {/* Render todos as thin left indicators */}
                {day.timeBlocks
                  .filter(block => isTodo(block))
                  .map((block, idx) => {
                    const heightInHours = getBlockHeightInHours(block.startTime, block.endTime);
                    const blockHeight = heightInHours * HOUR_HEIGHT;
                    const todoWidth = 3;
                    const offset = idx * 4;
                    return (
                      <Pressable
                        key={block.id}
                        onPress={() => onBlockPress?.(block)}
                        style={{
                          position: 'absolute',
                          left: 2 + offset,
                          width: todoWidth,
                          top: 0,
                          height: blockHeight,
                          backgroundColor: block.color,
                          borderRadius: 1,
                          opacity: block.isCompleted ? 0.5 : 1,
                        }}
                      />
                    );
                  })}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
