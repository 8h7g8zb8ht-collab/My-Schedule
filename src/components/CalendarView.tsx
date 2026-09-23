import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Calendar as CalendarIcon,
  MapPin,
  Sparkles,
  Info,
} from 'lucide-react';
import { CalendarEvent, CalendarViewMode } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useSchedule } from '../context/ScheduleContext';
import { useAuth } from '../context/AuthContext';

interface CalendarViewProps {
  onOpenNewEvent: (initialDate?: string, initialTime?: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 to 22:00

export const CalendarView: React.FC<CalendarViewProps> = ({
  onOpenNewEvent,
  onSelectEvent,
}) => {
  const { t, language } = useTranslation();
  const { events, moveEvent } = useSchedule();
  const { isCalendarConnected } = useAuth();

  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);

  // Helper date calculations
  const todayStr = new Date().toISOString().split('T')[0];

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Week dates calculation (Monday as start of week)
  const getWeekDates = (date: Date): Date[] => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      return nextDay;
    });
  };

  // Format header title
  const getHeaderTitle = (): string => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    const localeMap: Record<string, string> = {
      en: 'en-US',
      ru: 'ru-RU',
      tg: 'tg-TJ',
      zh: 'zh-CN',
    };
    const locale = localeMap[language] || 'en-US';

    if (viewMode === 'day') {
      return currentDate.toLocaleDateString(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return currentDate.toLocaleDateString(locale, options);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.stopPropagation();
    setDraggedEventId(eventId);
    e.dataTransfer.setData('text/plain', eventId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnSlot = async (
    e: React.DragEvent,
    targetDateStr: string,
    targetHour: number
  ) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('text/plain') || draggedEventId;
    if (!eventId) return;

    const event = events.find((ev) => ev.id === eventId);
    if (!event) return;

    // Calculate duration
    const [startH, startM] = event.startTime.split(':').map(Number);
    const [endH, endM] = event.endTime.split(':').map(Number);
    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);

    const newStartHourStr = String(targetHour).padStart(2, '0');
    const newStartMStr = String(startM).padStart(2, '0');
    const newStartTime = `${newStartHourStr}:${newStartMStr}`;

    const totalEndMinutes = targetHour * 60 + startM + (durationMinutes > 0 ? durationMinutes : 60);
    const calculatedEndH = String(Math.floor(totalEndMinutes / 60) % 24).padStart(2, '0');
    const calculatedEndM = String(totalEndMinutes % 60).padStart(2, '0');
    const newEndTime = `${calculatedEndH}:${calculatedEndM}`;

    await moveEvent(eventId, targetDateStr, newStartTime, newEndTime);
    setDraggedEventId(null);
  };

  const weekDayNames = [
    t('mon'),
    t('tue'),
    t('wed'),
    t('thu'),
    t('fri'),
    t('sat'),
    t('sun'),
  ];

  const currentDateStr = currentDate.toISOString().split('T')[0];
  const dayEventsCount = events.filter((e) => e.date === currentDateStr).length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Calendar Header Controls */}
      <div className="bg-white/95 rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation & Title */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 shadow-2xs">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-all duration-150 active:scale-95 shadow-2xs"
              title={t('previous')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 rounded-xl text-xs font-semibold hover:bg-white text-slate-700 transition-all active:scale-95"
            >
              {t('currentDay')}
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-all duration-150 active:scale-95 shadow-2xs"
              title={t('next')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight capitalize">
            {getHeaderTitle()}
          </h2>
        </div>

        {/* View Switcher & Action */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {/* Day / Week / Month Pill */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 text-xs font-semibold shadow-2xs">
            {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-xl transition-all duration-200 ${
                  viewMode === mode
                    ? 'bg-white text-emerald-800 shadow-xs font-bold border border-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(mode)}
              </button>
            ))}
          </div>

          {/* New Event Button */}
          <button
            onClick={() => onOpenNewEvent(currentDate.toISOString().split('T')[0])}
            className="px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl text-xs sm:text-sm font-semibold shadow-sm shadow-emerald-500/25 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newEvent')}</span>
          </button>
        </div>
      </div>

      {/* Tip Pill with helpful cues */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 px-2 gap-2">
        <span className="flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Click any slot to schedule • Drag events to reschedule</span>
        </span>
        {isCalendarConnected && (
          <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Google Calendar active</span>
          </span>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. DAY VIEW */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'day' && (
        <div className="bg-white/95 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800">
              {currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            <span className="text-xs text-slate-400">
              {dayEventsCount === 0 ? 'Your schedule is empty for this day' : `${dayEventsCount} events`}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {HOURS.map((hour) => {
              const hourStr = `${String(hour).padStart(2, '0')}:00`;
              const dateStr = currentDate.toISOString().split('T')[0];
              const slotEvents = events.filter((e) => {
                if (e.date !== dateStr) return false;
                const [h] = e.startTime.split(':').map(Number);
                return h === hour;
              });

              return (
                <div
                  key={hour}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnSlot(e, dateStr, hour)}
                  onClick={() => onOpenNewEvent(dateStr, hourStr)}
                  className="flex items-start min-h-[68px] hover:bg-emerald-50/20 transition-colors group cursor-pointer"
                >
                  <div className="w-16 sm:w-20 py-3 text-right pr-4 text-xs font-semibold text-slate-400 select-none shrink-0 border-r border-slate-100">
                    {hourStr}
                  </div>
                  <div className="flex-1 p-2 space-y-1.5 min-h-[64px]">
                    {slotEvents.map((evt) => (
                      <div
                        key={evt.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, evt.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(evt);
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-all hover:scale-[1.01] active:scale-95 cursor-grab flex items-center justify-between"
                        style={{ backgroundColor: evt.color || '#10b981' }}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span className="bg-black/20 px-1.5 py-0.5 rounded-md text-[10px]">
                            {evt.startTime} - {evt.endTime}
                          </span>
                          <span className="truncate">{evt.title}</span>
                          {evt.location && (
                            <span className="text-[10px] opacity-80 flex items-center space-x-0.5">
                              <MapPin className="w-3 h-3" />
                              <span>{evt.location}</span>
                            </span>
                          )}
                        </div>
                        {evt.isSyncedWithGoogle && (
                          <span className="text-[9px] bg-white/25 px-1 rounded-sm">GCal</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. WEEK VIEW */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'week' && (
        <div className="bg-white/95 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-x-auto">
          <div className="min-w-[760px]">
            {/* Week Header row */}
            <div className="grid grid-cols-8 border-b border-slate-200/80 bg-slate-50/70">
              <div className="w-16 p-3 text-center text-xs font-bold text-slate-400 border-r border-slate-200/60">
                Time
              </div>
              {getWeekDates(currentDate).map((dayDate, idx) => {
                const dateString = dayDate.toISOString().split('T')[0];
                const isToday = dateString === todayStr;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setCurrentDate(dayDate);
                      setViewMode('day');
                    }}
                    className={`p-3 text-center border-r border-slate-200/60 last:border-r-0 cursor-pointer hover:bg-slate-100/60 transition-colors ${
                      isToday ? 'bg-emerald-50/70' : ''
                    }`}
                  >
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {weekDayNames[idx]}
                    </span>
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 mt-1 rounded-full text-xs font-bold transition-transform ${
                        isToday
                          ? 'bg-emerald-600 text-white shadow-xs scale-105'
                          : 'text-slate-800'
                      }`}
                    >
                      {dayDate.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Hourly Grid */}
            <div className="divide-y divide-slate-100">
              {HOURS.map((hour) => {
                const hourStr = `${String(hour).padStart(2, '0')}:00`;
                const weekDates = getWeekDates(currentDate);

                return (
                  <div key={hour} className="grid grid-cols-8 min-h-[58px]">
                    <div className="w-16 py-2 text-center text-xs font-semibold text-slate-400 border-r border-slate-100 select-none">
                      {hourStr}
                    </div>

                    {weekDates.map((dayDate, colIdx) => {
                      const dateStr = dayDate.toISOString().split('T')[0];
                      const slotEvents = events.filter((e) => {
                        if (e.date !== dateStr) return false;
                        const [h] = e.startTime.split(':').map(Number);
                        return h === hour;
                      });

                      return (
                        <div
                          key={colIdx}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDropOnSlot(e, dateStr, hour)}
                          onClick={() => onOpenNewEvent(dateStr, hourStr)}
                          className="p-1 border-r border-slate-100 last:border-r-0 hover:bg-emerald-50/20 transition-colors cursor-pointer space-y-1 relative"
                        >
                          {slotEvents.map((evt) => (
                            <div
                              key={evt.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, evt.id)}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectEvent(evt);
                              }}
                              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-white shadow-2xs transition-all hover:scale-[1.02] cursor-grab truncate"
                              style={{ backgroundColor: evt.color || '#10b981' }}
                            >
                              <span className="font-bold mr-1">{evt.startTime}</span>
                              {evt.title}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. MONTH VIEW */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'month' && (
        <div className="bg-white/95 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/70 text-center text-xs font-bold text-slate-400 py-3 uppercase tracking-wider">
            {weekDayNames.map((name, i) => (
              <div key={i}>{name}</div>
            ))}
          </div>

          {/* Month Cells Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {(() => {
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth();

              // First day of current month
              const firstDayOfMonth = new Date(year, month, 1);
              const startDayOfWeek = firstDayOfMonth.getDay();
              const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

              // Days in month
              const daysInMonth = new Date(year, month + 1, 0).getDate();

              // Total cells
              const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

              const cells = [];
              for (let i = 0; i < totalCells; i++) {
                const dayNum = i - offset + 1;
                const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
                const cellDate = new Date(year, month, dayNum);
                const cellDateStr = cellDate.toISOString().split('T')[0];
                const isToday = cellDateStr === todayStr;

                const dayEvents = events.filter((e) => e.date === cellDateStr);

                cells.push(
                  <div
                    key={i}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnSlot(e, cellDateStr, 9)}
                    onClick={() => {
                      if (isCurrentMonth) {
                        setCurrentDate(cellDate);
                        setViewMode('day');
                      }
                    }}
                    className={`min-h-[110px] p-2 transition-colors flex flex-col justify-between group cursor-pointer ${
                      !isCurrentMonth
                        ? 'bg-slate-50/30 text-slate-300'
                        : isToday
                        ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Date header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isToday
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-300'
                        }`}
                      >
                        {cellDate.getDate()}
                      </span>

                      {isCurrentMonth && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenNewEvent(cellDateStr);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-emerald-700 transition-opacity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Events pills inside month cell */}
                    <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, ev.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent(ev);
                          }}
                          className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-white truncate shadow-2xs cursor-grab flex items-center space-x-1"
                          style={{ backgroundColor: ev.color || '#10b981' }}
                        >
                          <span className="opacity-90">{ev.startTime}</span>
                          <span className="truncate">{ev.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-slate-400 font-semibold px-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return cells;
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
