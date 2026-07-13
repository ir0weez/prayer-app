import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { getWeeksInMonth, isSameDay, formatDateISO, formatDateLocal } from '@/lib/date-utils';

interface EventBadge {
  id: string;
  title: string;
  color: string;
  isCompleted?: boolean;
}

interface MonthlyCalendarViewProps {
  selectedDate: Date;
  events: Map<string, EventBadge[]>; // Map of date (YYYY-MM-DD) to events
  onDayPress?: (date: Date) => void;
  onEventPress?: (event: EventBadge, date: Date) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthlyCalendarView({
  selectedDate,
  events,
  onDayPress,
  onEventPress,
}: MonthlyCalendarViewProps) {
  const colors = useColors();
  
  const weeks = useMemo(() => {
    return getWeeksInMonth(selectedDate);
  }, [selectedDate]);
  
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === selectedDate.getMonth();
  };
  
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Day names header */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {DAY_NAMES.map((day) => (
          <View
            key={day}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: 'center',
              borderRightWidth: 1,
              borderRightColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted }}>
              {day}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Calendar grid */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={{ flexDirection: 'row' }}>
            {week.map((date) => {
              const dateStr = formatDateISO(date);
              const dayEvents = events.get(dateStr) || [];
              const isInCurrentMonth = isCurrentMonth(date);
              const isToday = isSameDay(date, new Date());
              
              return (
                <Pressable
                  key={dateStr}
                  onPress={() => onDayPress?.(date)}
                  style={{
                    flex: 1,
                    minHeight: 100,
                    borderRightWidth: 1,
                    borderRightColor: colors.border,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    padding: 8,
                    backgroundColor: isInCurrentMonth ? colors.surface : colors.background,
                    opacity: isInCurrentMonth ? 1 : 0.5,
                  }}
                >
                  {/* Day number in top-left */}
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: isToday ? colors.primary : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: isToday ? '700' : '600',
                        color: isToday ? '#fff' : colors.foreground,
                      }}
                    >
                      {date.getDate()}
                    </Text>
                  </View>
                  
                  {/* Total count centered in cell with circle */}
                  {dayEvents.length > 0 && (
                    <View
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: colors.primary,
                          justifyContent: 'center',
                          alignItems: 'center',
                          opacity: date < new Date() && !isToday ? 0.4 : 1,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '600',
                            color: '#fff',
                          }}
                        >
                          {dayEvents.length}
                        </Text>
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
