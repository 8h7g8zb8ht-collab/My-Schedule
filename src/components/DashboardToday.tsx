import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  Plus,
  Sparkles,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Sun,
  Check,
} from 'lucide-react';
import { CalendarEvent, TaskItem } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useSchedule } from '../context/ScheduleContext';
import { useAuth } from '../context/AuthContext';

interface DashboardTodayProps {
  onOpenNewEvent: (initialDate?: string, initialTime?: string) => void;
  onOpenNewTask: (initialDate?: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectTask: (task: TaskItem) => void;
  onGoToCalendar: () => void;
  onGoToTasks: () => void;
}

export const DashboardToday: React.FC<DashboardTodayProps> = ({
  onOpenNewEvent,
  onOpenNewTask,
  onSelectEvent,
  onSelectTask,
  onGoToCalendar,
  onGoToTasks,
}) => {
  const { t, language } = useTranslation();
  const { user, isCalendarConnected, connectGoogleCalendar } = useAuth();
  const {
    todayStats,
    toggleTaskCompleted,
    addTask,
    syncWithGoogleCalendar,
    isSyncing,
  } = useSchedule();

  const [greeting, setGreeting] = useState('');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [currentDateTimeStr, setCurrentDateTimeStr] = useState('');

  // Update greeting and current date/time
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      if (hour < 12) setGreeting(t('goodMorning'));
      else if (hour < 18) setGreeting(t('goodAfternoon'));
      else setGreeting(t('goodEvening'));

      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      };

      const localeMap: Record<string, string> = {
        en: 'en-US',
        ru: 'ru-RU',
        tg: 'tg-TJ',
        zh: 'zh-CN',
      };

      const locale = localeMap[language] || 'en-US';
      const datePart = now.toLocaleDateString(locale, options);
      const timePart = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      setCurrentDateTimeStr(`${datePart} • ${timePart}`);
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, [t, language]);

  const handleQuickTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    await addTask({
      title: quickTaskTitle.trim(),
      dueDate: today,
      priority: 'medium',
      completed: false,
    });
    setQuickTaskTitle('');
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const { totalItems, completedItems, percent, todayEvents, todayTasks, upcomingEvent } = todayStats;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Calm & Vibrant Hero Greeting Banner */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:border-emerald-200/80 transition-all duration-300">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute right-36 -bottom-16 w-52 h-52 bg-sky-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-50/90 border border-emerald-200/70 rounded-full text-emerald-800 text-xs font-semibold mb-3 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{currentDateTimeStr || 'Today'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {greeting}
              {user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md">
              {t('planYourDay')}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onOpenNewTask(todayStr)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200/90 text-slate-800 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center space-x-2 cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>{t('newTask')}</span>
            </button>
            <button
              onClick={() => onOpenNewEvent(todayStr)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl text-xs sm:text-sm font-semibold shadow-sm shadow-emerald-500/25 hover:shadow-md hover:shadow-emerald-500/30 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('newEvent')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Google Calendar Connect Banner (Only if not connected yet) */}
      {!isCalendarConnected && (
        <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-emerald-50/80 rounded-3xl p-5 sm:p-6 border border-blue-200/70 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md transition-all duration-200">
          <div className="flex items-start space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white shadow-xs border border-blue-100 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {t('connectGoogleCalendar')}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                {t('googleCalendarDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={connectGoogleCalendar}
            className="shrink-0 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs sm:text-sm font-semibold shadow-sm shadow-blue-500/20 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('connectGoogleCalendar')}</span>
          </button>
        </div>
      )}

      {/* Top 3 Cards Grid: Daily Progress & Upcoming Event */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Daily Progress Indicator */}
        <div className="bg-white/95 rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-emerald-200/70 transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t('dailyProgress')}</h3>
                <span className="text-[11px] text-slate-400">Today's completion</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
              {percent}%
            </span>
          </div>

          <div className="space-y-3">
            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-700 shadow-xs"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                <strong className="text-slate-900 font-semibold">{completedItems}</strong> of {totalItems} completed
              </span>
              <span>{todayTasks.filter((t) => t.completed).length} tasks done</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{todayEvents.length} events • {todayTasks.length} tasks</span>
            <span className="text-emerald-700 font-medium">
              {totalItems === 0 ? 'Start planning' : percent === 100 ? 'All caught up! 🎉' : 'Keep going'}
            </span>
          </div>
        </div>

        {/* Card 2: Upcoming Event Spotlight */}
        <div className="bg-white/95 rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col justify-between md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{t('upcomingEvent')}</h3>
                <span className="text-[11px] text-slate-400">Next on your agenda</span>
              </div>
            </div>
            <button
              onClick={onGoToCalendar}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 hover:translate-x-0.5 transition-transform"
            >
              <span>{t('calendar')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingEvent ? (
            <div
              onClick={() => onSelectEvent(upcomingEvent)}
              className="group cursor-pointer bg-slate-50/80 hover:bg-emerald-50/50 p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-200 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 bg-white text-slate-800 font-bold text-xs rounded-lg border border-slate-200/80 shadow-2xs">
                      {upcomingEvent.startTime} - {upcomingEvent.endTime}
                    </span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    {upcomingEvent.isSyncedWithGoogle && (
                      <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                        Google Calendar
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                    {upcomingEvent.title}
                  </h4>
                  {upcomingEvent.description && (
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {upcomingEvent.description}
                    </p>
                  )}
                  {upcomingEvent.location && (
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{upcomingEvent.location}</span>
                    </div>
                  )}
                </div>
                <div
                  className="w-3.5 h-3.5 rounded-full mt-1.5 shrink-0 shadow-2xs"
                  style={{ backgroundColor: upcomingEvent.color || '#10b981' }}
                />
              </div>
            </div>
          ) : (
            <div className="py-7 text-center text-slate-500 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/80 flex flex-col items-center justify-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                <Sun className="w-5 h-5 text-amber-500/80" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-xs">Your schedule is empty</p>
                <p className="text-[11px] text-slate-400">No upcoming events scheduled for the rest of today</p>
              </div>
              <button
                onClick={() => onOpenNewEvent(todayStr)}
                className="mt-1 text-emerald-700 font-semibold hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors"
              >
                + Schedule an event
              </button>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Next schedule slot</span>
            {isCalendarConnected && (
              <button
                onClick={syncWithGoogleCalendar}
                disabled={isSyncing}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center space-x-1"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? t('syncing') : t('syncCalendar')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Split: Today's Timeline Schedule vs Today's Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Today's Schedule */}
        <div className="lg:col-span-7 bg-white/95 rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{t('events')}</h2>
                <p className="text-xs text-slate-400">Timeline for today</p>
              </div>
            </div>
            <button
              onClick={() => onOpenNewEvent(todayStr)}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('newEvent')}</span>
            </button>
          </div>

          {/* Events List */}
          <div className="space-y-3 pt-1">
            {todayEvents.length > 0 ? (
              todayEvents
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((event) => (
                  <div
                    key={event.id}
                    onClick={() => onSelectEvent(event)}
                    className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-emerald-200 hover:shadow-xs transition-all duration-200 cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div
                        className="w-1.5 h-10 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: event.color || '#10b981' }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-700">
                            {event.startTime} - {event.endTime}
                          </span>
                          {event.isSyncedWithGoogle && (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-medium border border-emerald-100">
                              Google
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900 truncate group-hover:text-emerald-800 transition-colors">
                          {event.title}
                        </h4>
                        {event.location && (
                          <p className="text-[11px] text-slate-500 truncate flex items-center space-x-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{event.location}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <button className="text-slate-400 group-hover:text-slate-600 p-1 rounded-lg">
                      <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                ))
            ) : (
              <div className="py-14 text-center text-slate-400 text-xs bg-slate-50/40 rounded-2xl border border-dashed border-slate-200/80 flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-300">
                  <CalendarIcon className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-xs">Your schedule is empty</p>
                  <p className="text-[11px] text-slate-400">Start planning your day by adding your first event</p>
                </div>
                <button
                  onClick={() => onOpenNewEvent(todayStr)}
                  className="mt-2 text-emerald-700 font-semibold hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                >
                  + {t('newEvent')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Today's Tasks */}
        <div className="lg:col-span-5 bg-white/95 rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{t('tasks')}</h2>
                  <p className="text-xs text-slate-400">Action items for today</p>
                </div>
              </div>
              <button
                onClick={onGoToTasks}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-1 hover:translate-x-0.5 transition-transform"
              >
                <span>{t('filterAll')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Inline Quick Add Task input */}
            <form onSubmit={handleQuickTaskSubmit} className="mt-3">
              <div className="relative">
                <input
                  type="text"
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  placeholder="+ Add a task for today (Press Enter)..."
                  className="w-full pl-3.5 pr-14 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-2xs"
                />
                {quickTaskTitle && (
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-emerald-600 text-white font-semibold text-[11px] rounded-lg hover:bg-emerald-700 active:scale-95 transition-all shadow-2xs"
                  >
                    Add
                  </button>
                )}
              </div>
            </form>

            {/* Task list */}
            <div className="space-y-2 mt-4 max-h-[340px] overflow-y-auto pr-1">
              {todayTasks.length > 0 ? (
                todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-2xl border transition-all duration-200 flex items-start justify-between group ${
                      task.completed
                        ? 'bg-slate-50/60 border-slate-200/60 text-slate-400'
                        : 'bg-white border-slate-200/80 text-slate-800 hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start space-x-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleTaskCompleted(task.id)}
                        className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <div
                        onClick={() => onSelectTask(task)}
                        className="cursor-pointer min-w-0"
                      >
                        <p
                          className={`text-xs font-semibold leading-snug truncate ${
                            task.completed ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.dueTime && (
                          <p className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{task.dueTime}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Priority badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 uppercase tracking-wide ${
                        task.priority === 'high'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          : task.priority === 'medium'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-slate-400 text-xs bg-slate-50/40 rounded-2xl border border-dashed border-slate-200/80">
                  <p className="font-semibold text-slate-600">No tasks for today</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Use the bar above to add an action item</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{todayTasks.filter((t) => !t.completed).length} remaining</span>
            <button
              onClick={() => onOpenNewTask(todayStr)}
              className="text-emerald-700 font-semibold hover:underline"
            >
              + {t('addTask')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
