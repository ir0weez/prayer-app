import { View, Text, ScrollView, Pressable } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { addDays, getWeekStart } from '@/lib/date-utils';
import { useMemo, useRef, useEffect } from 'react';

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
const START_HOUR = 6;
const END_HOUR = 22;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

function getBlockPosition(startTime: string, endTime: string) {
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  const startHourOffset = START_HOUR * 60;
  
  const top = ((startMins - startHourOffset) / 60) * HOUR_HEIGHT;
  const height = ((endMins - startMins) / 60) * HOUR_HEIGHT;
  
  return { top: Math.max(0, top), height: Math.max(20, height) };
}

function isTodo(block: TimeBlock): boolean {
  return block.type === 'todo';
}

export function WeeklyCalendarView({
  selectedDate,
  timeBlocks,
  onDayPress,
  onBlockPress,
}: WeeklyCalendarViewProps) {
  const colors = useColors();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const weekDays = useMemo(() => {
    const weekStart = getWeekStart(selectedDate);
    const days: DayColumn[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dateStr = date.toISOString().split('T')[0];
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
  
  // Auto-scroll to current time on mount
  useEffect(() => {
    setTimeout(() => {
      const now = new Date();
      const currentHour = now.getHours();
      const scrollPosition = Math.max(0, (currentHour - START_HOUR) * HOUR_HEIGHT - 100);
      scrollViewRef.current?.scrollTo({ y: scrollPosition, animated: false });
    }, 100);
  }, []);
  
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
      
      {/* Time grid - use absolute positioning for time blocks */}
      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Render all hours */}
        {HOURS.map((hour) => (
          <View key={hour} style={{ flexDirection: 'row', height: HOUR_HEIGHT, borderBottomWidth: 1, borderBottomColor: colors.border }}>
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
              />
            ))}
          </View>
        ))}
        
        {/* Render time blocks as overlays - positioned absolutely across hours */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: HOURS.length * HOUR_HEIGHT,
            pointerEvents: 'box-none',
          }}
        >
          {weekDays.map((day, dayIdx) => {
            const dayWidth = 1 / 7; // Each day takes 1/7 of the width
            const dayLeftOffset = 60 + dayIdx * ((100 - 60 / 700) * 7); // Account for hour label width
            
            return (
              <View
                key={`blocks-${day.date.toISOString()}`}
                style={{
                  position: 'absolute',
                  left: `${(60 / 700) + dayIdx * (100 / 7)}%`,
                  width: `${100 / 7}%`,
                  top: 0,
                  height: '100%',
                  pointerEvents: 'box-none',
                }}
              >
                {/* Render events and ministries as full time blocks */}
                {day.timeBlocks
                  .filter(block => !isTodo(block))
                  .map((block) => {
                    const { top, height } = getBlockPosition(block.startTime, block.endTime);
                    return (
                      <Pressable
                        key={block.id}
                        onPress={() => onBlockPress?.(block)}
                        style={{
                          position: 'absolute',
                          left: 4,
                          right: 4,
                          top,
                          height,
                          backgroundColor: block.color,
                          borderRadius: 4,
                          padding: 4,
                          opacity: block.isCompleted ? 0.6 : 1,
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
                    const { top, height } = getBlockPosition(block.startTime, block.endTime);
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
                          top,
                          height,
                          backgroundColor: block.color,
                          borderRadius: 1,
                          opacity: block.isCompleted ? 0.5 : 1,
                        }}
                      />
                    );
                  })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
