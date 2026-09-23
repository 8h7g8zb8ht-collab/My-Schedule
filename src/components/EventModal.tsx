import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  AlignLeft,
  Bell,
  Repeat,
  Trash2,
  Check,
  Sparkles,
  Video,
} from 'lucide-react';
import { CalendarEvent, EventReminder, EventRecurrence } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useSchedule } from '../context/ScheduleContext';
import { useAuth } from '../context/AuthContext';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: CalendarEvent | null;
  initialDate?: string;
  initialTime?: string;
}

const COLOR_PALETTE = [
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#0284c7', label: 'Sky' },
  { hex: '#6366f1', label: 'Indigo' },
  { hex: '#f59e0b', label: 'Amber' },
  { hex: '#ec4899', label: 'Rose' },
  { hex: '#8b5cf6', label: 'Purple' },
];

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
  initialDate,
  initialTime,
}) => {
  const { t } = useTranslation();
  const { addEvent, updateEvent, deleteEvent } = useSchedule();
  const { isCalendarConnected } = useAuth();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [reminder, setReminder] = useState<EventReminder>('15m');
  const [recurrence, setRecurrence] = useState<EventRecurrence>('none');
  const [color, setColor] = useState('#10b981');
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      setDate(eventToEdit.date);
      setStartTime(eventToEdit.startTime || '09:00');
      setEndTime(eventToEdit.endTime || '10:00');
      setDescription(eventToEdit.description || '');
      setLocation(eventToEdit.location || '');
      setReminder(eventToEdit.reminder || '15m');
      setRecurrence(eventToEdit.recurrence || 'none');
      setColor(eventToEdit.color || '#10b981');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setDate(initialDate || today);

      if (initialTime) {
        setStartTime(initialTime);
        // default 1 hour later
        const [h, m] = initialTime.split(':').map(Number);
        const endH = String((h + 1) % 24).padStart(2, '0');
        setEndTime(`${endH}:${String(m).padStart(2, '0')}`);
      } else {
        setStartTime('09:00');
        setEndTime('10:00');
      }

      setTitle('');
      setDescription('');
      setLocation('');
      setReminder('15m');
      setRecurrence('none');
      setColor('#10b981');
    }
    setConfirmDelete(false);
  }, [eventToEdit, initialDate, initialTime, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    setLoading(true);
    try {
      if (eventToEdit) {
        await updateEvent({
          ...eventToEdit,
          title: title.trim(),
          date,
          startTime,
          endTime,
          description: description.trim(),
          location: location.trim(),
          reminder,
          recurrence,
          color,
        });
      } else {
        await addEvent({
          title: title.trim(),
          date,
          startTime,
          endTime,
          description: description.trim(),
          location: location.trim(),
          reminder,
          recurrence,
          color,
        });
      }
      onClose();
    } catch (err) {
      console.error('Save event failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!eventToEdit) return;
    setLoading(true);
    try {
      await deleteEvent(eventToEdit.id);
      onClose();
    } catch (err) {
      console.error('Delete event failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div
              className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-xs"
              style={{ backgroundColor: color }}
            />
            <h2 className="text-lg font-bold text-slate-900">
              {eventToEdit ? t('editEvent') : t('createEvent')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Sync indicator pill */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{isCalendarConnected ? t('syncNotice') : t('localOnlyNotice')}</span>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('eventTitle')} *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('eventTitlePlaceholder')}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Date & Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <CalendarIcon className="w-3 h-3 text-slate-400" />
                <span>{t('date')}</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{t('startTime')}</span>
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{t('endTime')}</span>
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Location with Quick Video Meeting buttons */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{t('location')}</span>
              </label>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setLocation('Google Meet')}
                  className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors"
                >
                  <Video className="w-2.5 h-2.5" />
                  <span>Google Meet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocation('Zoom Meeting')}
                  className="inline-flex items-center space-x-1 text-[10px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded-md transition-colors"
                >
                  <span>Zoom</span>
                </button>
              </div>
            </div>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('locationPlaceholder')}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <AlignLeft className="w-3 h-3 text-slate-400" />
              <span>{t('description')}</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Reminder & Recurrence Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Bell className="w-3 h-3 text-slate-400" />
                <span>{t('reminder')}</span>
              </label>
              <select
                value={reminder}
                onChange={(e) => setReminder(e.target.value as EventReminder)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                <option value="none">{t('reminderNone')}</option>
                <option value="5m">{t('reminder5m')}</option>
                <option value="10m">{t('reminder10m')}</option>
                <option value="15m">{t('reminder15m')}</option>
                <option value="30m">{t('reminder30m')}</option>
                <option value="1h">{t('reminder1h')}</option>
                <option value="1d">{t('reminder1d')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Repeat className="w-3 h-3 text-slate-400" />
                <span>{t('recurring')}</span>
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as EventRecurrence)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                <option value="none">{t('recurringNone')}</option>
                <option value="daily">{t('recurringDaily')}</option>
                <option value="weekly">{t('recurringWeekly')}</option>
                <option value="monthly">{t('recurringMonthly')}</option>
              </select>
            </div>
          </div>

          {/* Color palette */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('eventColor')}
            </label>
            <div className="flex items-center space-x-3">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-xs"
                  style={{ backgroundColor: c.hex }}
                >
                  {color === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {eventToEdit ? (
              confirmDelete ? (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-1.5 text-slate-500 text-xs hover:text-slate-700"
                  >
                    {t('cancel')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('delete')}</span>
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs shadow-emerald-200 transition-all flex items-center space-x-1.5"
              >
                {loading && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                <span>{t('save')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
