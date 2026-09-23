import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CalendarEvent, TaskItem } from '../types';
import { GoogleCalendarService } from '../services/googleCalendar';
import { useAuth } from './AuthContext';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ScheduleContextType {
  events: CalendarEvent[];
  tasks: TaskItem[];
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<CalendarEvent>;
  updateEvent: (event: CalendarEvent) => Promise<void>;
  moveEvent: (eventId: string, newDate: string, newStartTime: string, newEndTime: string) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  syncWithGoogleCalendar: () => Promise<void>;
  addTask: (task: Omit<TaskItem, 'id' | 'createdAt'>) => Promise<TaskItem>;
  updateTask: (task: TaskItem) => Promise<void>;
  toggleTaskCompleted: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  todayStats: {
    totalItems: number;
    completedItems: number;
    percent: number;
    todayEvents: CalendarEvent[];
    todayTasks: TaskItem[];
    upcomingEvent: CalendarEvent | null;
  };
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isCalendarConnected } = useAuth();

  // Initialize with genuinely empty events (purging any legacy sample mock data)
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('my_schedule_events');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((e: any) => !e.id?.startsWith('sample-'));
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  // Initialize with genuinely empty tasks (purging any legacy sample mock data)
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('my_schedule_tasks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((t: any) => !t.id?.startsWith('sample-'));
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem('my_schedule_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('my_schedule_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Load from Firestore if logged in
  useEffect(() => {
    if (!user) return;

    const loadCloudData = async () => {
      try {
        // Load tasks
        const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', user.uid));
        const tasksSnap = await getDocs(tasksQuery);
        if (!tasksSnap.empty) {
          const cloudTasks: TaskItem[] = [];
          tasksSnap.forEach((d) => {
            const data = d.data() as TaskItem;
            if (!data.id?.startsWith('sample-')) {
              cloudTasks.push(data);
            }
          });
          setTasks(cloudTasks);
        }

        // Load local events for user
        const eventsQuery = query(collection(db, 'events'), where('userId', '==', user.uid));
        const eventsSnap = await getDocs(eventsQuery);
        if (!eventsSnap.empty) {
          const cloudEvents: CalendarEvent[] = [];
          eventsSnap.forEach((d) => {
            const data = d.data() as CalendarEvent;
            if (!data.id?.startsWith('sample-')) {
              cloudEvents.push(data);
            }
          });
          setEvents((prev) => {
            const gcalEvents = prev.filter((e) => e.isSyncedWithGoogle);
            return [...cloudEvents, ...gcalEvents];
          });
        }
      } catch (err) {
        console.warn('Firestore load non-blocking fallback:', err);
      }
    };

    loadCloudData();
  }, [user]);

  // Synchronize with Google Calendar
  const syncWithGoogleCalendar = useCallback(async () => {
    if (!GoogleCalendarService.isConnected()) return;

    setIsSyncing(true);
    try {
      const gcalEvents = await GoogleCalendarService.fetchEvents();

      setEvents((prev) => {
        // Keep user's purely local non-sample events
        const localOnlyEvents = prev.filter((e) => !e.googleEventId && !e.id.startsWith('sample-'));

        // Deduplicate and merge Google events
        const merged = [...localOnlyEvents];
        for (const ge of gcalEvents) {
          const existingIdx = merged.findIndex(
            (e) => e.googleEventId === ge.googleEventId || e.id === ge.id
          );
          if (existingIdx >= 0) {
            merged[existingIdx] = { ...merged[existingIdx], ...ge };
          } else {
            merged.push(ge);
          }
        }
        return merged;
      });

      setLastSyncedAt(new Date());
    } catch (err) {
      console.error('Failed to sync with Google Calendar:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Auto-sync when calendar is connected
  useEffect(() => {
    if (isCalendarConnected) {
      syncWithGoogleCalendar();
    }
  }, [isCalendarConnected, syncWithGoogleCalendar]);

  // Periodic background check every 3 minutes if connected
  useEffect(() => {
    if (!isCalendarConnected) return;
    const timer = setInterval(() => {
      syncWithGoogleCalendar();
    }, 180000);
    return () => clearInterval(timer);
  }, [isCalendarConnected, syncWithGoogleCalendar]);

  // 1. Add Event
  const addEvent = async (eventData: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
    let googleEventId: string | undefined;
    let isSynced = false;

    if (GoogleCalendarService.isConnected()) {
      try {
        const res = await GoogleCalendarService.createEvent(eventData);
        googleEventId = res.googleEventId;
        isSynced = true;
      } catch (e) {
        console.warn('Failed to sync new event to Google Calendar:', e);
      }
    }

    const newEvent: CalendarEvent = {
      ...eventData,
      id: googleEventId ? `gcal-${googleEventId}` : `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      googleEventId,
      isSyncedWithGoogle: isSynced,
      userId: user?.uid,
      createdAt: Date.now(),
    };

    setEvents((prev) => [...prev, newEvent]);

    // Save to Firestore if user is authenticated
    if (user) {
      try {
        await setDoc(doc(db, 'events', newEvent.id), newEvent);
      } catch {
        // Fallback local
      }
    }

    return newEvent;
  };

  // 2. Update Event
  const updateEvent = async (updated: CalendarEvent) => {
    // Update locally
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));

    // Sync to Google Calendar if linked
    if (updated.googleEventId && GoogleCalendarService.isConnected()) {
      try {
        await GoogleCalendarService.updateEvent(updated);
      } catch (err) {
        console.warn('Failed to update event in Google Calendar:', err);
      }
    }

    // Update in Firestore
    if (user) {
      try {
        await setDoc(doc(db, 'events', updated.id), updated);
      } catch {
        // fallback
      }
    }
  };

  // 3. Move/Drag Event
  const moveEvent = async (eventId: string, newDate: string, newStartTime: string, newEndTime: string) => {
    const existing = events.find((e) => e.id === eventId);
    if (!existing) return;

    const updated: CalendarEvent = {
      ...existing,
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
    };

    await updateEvent(updated);
  };

  // 4. Delete Event
  const deleteEvent = async (eventId: string) => {
    const existing = events.find((e) => e.id === eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));

    if (existing?.googleEventId && GoogleCalendarService.isConnected()) {
      try {
        await GoogleCalendarService.deleteEvent(existing.googleEventId);
      } catch (err) {
        console.warn('Failed to delete event from Google Calendar:', err);
      }
    }

    if (user) {
      try {
        await deleteDoc(doc(db, 'events', eventId));
      } catch {
        // fallback
      }
    }
  };

  // 5. Add Task
  const addTask = async (taskData: Omit<TaskItem, 'id' | 'createdAt'>): Promise<TaskItem> => {
    const newTask: TaskItem = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user?.uid,
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTask, ...prev]);

    if (user) {
      try {
        await setDoc(doc(db, 'tasks', newTask.id), newTask);
      } catch {
        // local fallback
      }
    }

    return newTask;
  };

  // 6. Update Task
  const updateTask = async (updated: TaskItem) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (user) {
      try {
        await setDoc(doc(db, 'tasks', updated.id), updated);
      } catch {
        // fallback
      }
    }
  };

  // 7. Toggle Task Completed
  const toggleTaskCompleted = async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    const updated = { ...target, completed: !target.completed };
    await updateTask(updated);
  };

  // 8. Delete Task
  const deleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (user) {
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
      } catch {
        // fallback
      }
    }
  };

  // Today Statistics & Upcoming Event calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayEvents = events.filter((e) => e.date === todayStr);
  const todayTasks = tasks.filter((t) => t.dueDate === todayStr);

  const completedTasksCount = todayTasks.filter((t) => t.completed).length;
  // Events that have passed or are completed
  const completedEventsCount = todayEvents.filter((e) => {
    if (e.completed) return true;
    const [h, m] = (e.endTime || '23:59').split(':').map(Number);
    return h * 60 + m < currentMinutes;
  }).length;

  const totalItems = todayEvents.length + todayTasks.length;
  const completedItems = completedTasksCount + completedEventsCount;
  const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Upcoming event: next event today whose start or end time is in the future
  const upcomingEvent =
    todayEvents
      .filter((e) => {
        const [endH, endM] = (e.endTime || '23:59').split(':').map(Number);
        return endH * 60 + endM >= currentMinutes;
      })
      .sort((a, b) => {
        const [aH, aM] = a.startTime.split(':').map(Number);
        const [bH, bM] = b.startTime.split(':').map(Number);
        return aH * 60 + aM - (bH * 60 + bM);
      })[0] || null;

  return (
    <ScheduleContext.Provider
      value={{
        events,
        tasks,
        isSyncing,
        lastSyncedAt,
        addEvent,
        updateEvent,
        moveEvent,
        deleteEvent,
        syncWithGoogleCalendar,
        addTask,
        updateTask,
        toggleTaskCompleted,
        deleteTask,
        todayStats: {
          totalItems,
          completedItems,
          percent,
          todayEvents,
          todayTasks,
          upcomingEvent,
        },
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};
