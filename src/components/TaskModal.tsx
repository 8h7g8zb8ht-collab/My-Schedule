import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, Flag, Trash2 } from 'lucide-react';
import { TaskItem, Priority } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useSchedule } from '../context/ScheduleContext';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: TaskItem | null;
  initialDate?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  initialDate,
}) => {
  const { t } = useTranslation();
  const { addTask, updateTask, deleteTask } = useSchedule();

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDueDate(taskToEdit.dueDate);
      setDueTime(taskToEdit.dueTime || '');
      setPriority(taskToEdit.priority);
    } else {
      const today = new Date().toISOString().split('T')[0];
      setTitle('');
      setDueDate(initialDate || today);
      setDueTime('');
      setPriority('medium');
    }
  }, [taskToEdit, initialDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    setLoading(true);
    try {
      if (taskToEdit) {
        await updateTask({
          ...taskToEdit,
          title: title.trim(),
          dueDate,
          dueTime: dueTime.trim() || undefined,
          priority,
        });
      } else {
        await addTask({
          title: title.trim(),
          dueDate,
          dueTime: dueTime.trim() || undefined,
          priority,
          completed: false,
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!taskToEdit) return;
    setLoading(true);
    try {
      await deleteTask(taskToEdit.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">
            {taskToEdit ? t('editTask') : t('addTask')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('taskTitle')} *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('taskTitlePlaceholder')}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <CalendarIcon className="w-3 h-3 text-slate-400" />
                <span>{t('dueDate')}</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{t('dueTime')}</span>
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center space-x-1">
              <Flag className="w-3 h-3 text-slate-400" />
              <span>{t('priority')}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPriority('high')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  priority === 'high'
                    ? 'border-rose-300 bg-rose-50 text-rose-700 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>{t('priorityHigh')}</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('medium')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  priority === 'medium'
                    ? 'border-amber-300 bg-amber-50 text-amber-800 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{t('priorityMedium')}</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('low')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  priority === 'low'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{t('priorityLow')}</span>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {taskToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center space-x-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('delete')}</span>
              </button>
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
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs shadow-emerald-200 transition-all"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
