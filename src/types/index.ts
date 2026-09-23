export type Language = 'en' | 'ru' | 'tg' | 'zh';

export type Priority = 'low' | 'medium' | 'high';

export type CalendarViewMode = 'day' | 'week' | 'month';

export type NavTab = 'today' | 'calendar' | 'tasks' | 'settings';

export type EventRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export type EventReminder = 'none' | '5m' | '10m' | '15m' | '30m' | '1h' | '1d';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  description?: string;
  location?: string;
  reminder?: EventReminder;
  recurrence?: EventRecurrence;
  color?: string;
  googleEventId?: string;
  isSyncedWithGoogle?: boolean;
  userId?: string;
  completed?: boolean;
  createdAt?: number;
}

export interface TaskItem {
  id: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority: Priority;
  completed: boolean;
  userId?: string;
  createdAt: number;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  emailVerified: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  googleCalendarConnected: boolean;
  googleCalendarEmail?: string | null;
  language?: Language;
}
