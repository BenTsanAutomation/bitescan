import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../theme';

interface WeekCalendarProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  daysWithMeals?: string[];
}

interface CalendarDay {
  dateKey: string;
  dayLabel: string;
  dateLabel: string;
  isToday: boolean;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildDays = (): CalendarDay[] => {
  const now = new Date();
  const result: CalendarDay[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(now.getDate() - offset);

    result.push({
      dateKey: getDateKey(day),
      dayLabel: WEEKDAY_LABELS[day.getDay()],
      dateLabel: String(day.getDate()),
      isToday: getDateKey(day) === getDateKey(now),
    });
  }

  return result;
};

export const WeekCalendar: React.FC<WeekCalendarProps> = ({
  selectedDate,
  onSelectDate,
  daysWithMeals = [],
}) => {
  const days = useMemo(() => buildDays(), []);
  const mealsSet = useMemo(() => new Set(daysWithMeals), [daysWithMeals]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {days.map((day) => {
          const isSelected = day.dateKey === selectedDate;
          const hasMeals = mealsSet.has(day.dateKey);

          return (
            <Pressable
              key={day.dateKey}
              style={({ pressed }) => [
                styles.dayChip,
                day.isToday && styles.todayChip,
                isSelected && styles.selectedChip,
                pressed && styles.dayChipPressed,
              ]}
              onPress={() => onSelectDate(day.dateKey)}
            >
              <Text style={[styles.dayLabel, isSelected && styles.selectedText]}>{day.dayLabel}</Text>
              <Text style={[styles.dateLabel, isSelected && styles.selectedText]}>{day.dateLabel}</Text>
              <View style={[styles.dot, hasMeals && styles.dotActive, isSelected && styles.dotSelected]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  dayChip: {
    width: 58,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  todayChip: {
    borderColor: colors.primary[300],
  },
  selectedChip: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  dayChipPressed: {
    opacity: 0.85,
  },
  dayLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  dateLabel: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
  },
  selectedText: {
    color: colors.text.inverse,
  },
  dot: {
    marginTop: spacing.xs,
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: colors.secondary[500],
  },
  dotSelected: {
    backgroundColor: colors.text.inverse,
  },
});

export default WeekCalendar;
