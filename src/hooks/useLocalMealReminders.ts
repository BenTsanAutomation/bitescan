import { AppState, AppStateStatus } from 'react-native';
import { useEffect, useRef } from 'react';

interface UseLocalMealRemindersOptions {
  enabled: boolean;
  hour: number;
  minute: number;
  onReminder: () => void;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.round(value)));

const dateKey = (date: Date): string => date.toISOString().slice(0, 10);

const nextTriggerMs = (hour: number, minute: number): number => {
  const now = new Date();
  const next = new Date();
  next.setHours(clamp(hour, 0, 23), clamp(minute, 0, 59), 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return Math.max(500, next.getTime() - now.getTime());
};

export const useLocalMealReminders = ({
  enabled,
  hour,
  minute,
  onReminder,
}: UseLocalMealRemindersOptions): void => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentAppState = useRef<AppStateStatus>(AppState.currentState);
  const lastReminderDateRef = useRef<string | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      currentAppState.current = nextState;
    });
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!enabled) return;

    const scheduleNext = () => {
      timeoutRef.current = setTimeout(() => {
        const todayKey = dateKey(new Date());
        const alreadyTriggeredToday = lastReminderDateRef.current === todayKey;

        if (!alreadyTriggeredToday && currentAppState.current === 'active') {
          lastReminderDateRef.current = todayKey;
          onReminder();
        }

        scheduleNext();
      }, nextTriggerMs(hour, minute));
    };

    scheduleNext();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled, hour, minute, onReminder]);
};
