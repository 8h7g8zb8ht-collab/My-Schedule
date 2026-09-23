import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit2,
  Search,
  ListTodo,
  Check,
} from 'lucide-react';
import { TaskItem } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useSchedule } from '../context/ScheduleContext';

interface TasksViewProps {
  onOpenNewTask: (initialDate?: string) => void;
  onSelectTask: (task: TaskItem) => void;
}

type TaskFilter = 'all' | 'today' | 'upcoming' | 'completed' | 'high';

export const TasksView: React.FC<TasksViewProps> = ({
  onOpenNewTask,
  onSelectTask,
}) => {
  const { t } = useTranslation();
  const { tasks, toggleTaskCompleted, deleteTask, addTask } = useSchedule();

  const [activeFilter, setActiveFilter] = useState<TaskFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickTitle, setQuickTitle] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    await addTask({
      title: quickTitle.trim(),
      dueDate: todayStr,
      priority: 'medium',
      completed: false,
    });
    setQuickTitle('');
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Search query
    if (searchQuery.trim() && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    if (activeFilter === 'today') {
      return task.dueDate === todayStr;
    }
    if (activeFilter === 'upcoming') {
      return task.dueDate > todayStr && !task.completed;
    }
    if (activeFilter === 'completed') {
      return task.completed;
    }
    if (activeFilter === 'high') {
      return task.priority === 'high' && !task.completed;
    }
    return true;
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = tasks.filter((t) => !t.completed).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="bg-white/95 rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <ListTodo className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {t('myTasks')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {pendingCount} remaining • {completedCount} completed
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onOpenNewTask()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl text-xs sm:text-sm font-semibold shadow-sm shadow-emerald-500/25 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addTask')}</span>
          </button>
        </div>
      </div>

      {/* Quick Add Bar & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <form onSubmit={handleQuickAdd} className="md:col-span-2">
          <div className="relative">
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="+ Add a new task (Press Enter to save)..."
              className="w-full pl-4 pr-16 py-3 bg-white/95 border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-xs transition-all"
            />
            {quickTitle && (
              <button
                type="submit"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-2xs active:scale-95"
              >
                Add
              </button>
            )}
          </div>
        </form>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-4 py-3 bg-white/95 border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-xs transition-all"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all', label: t('filterAll') },
          { id: 'today', label: t('filterToday') },
          { id: 'upcoming', label: t('filterUpcoming') },
          { id: 'high', label: t('filterHighPriority') },
          { id: 'completed', label: t('filterCompleted') },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as TaskFilter)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 ${
              activeFilter === tab.id
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="bg-white/95 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] divide-y divide-slate-100 overflow-hidden">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 sm:p-5 flex items-center justify-between transition-all duration-200 group ${
                task.completed ? 'bg-slate-50/50 text-slate-400' : 'hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                {/* Checkbox with micro-interaction */}
                <button
                  type="button"
                  onClick={() => toggleTaskCompleted(task.id)}
                  className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors shrink-0 active:scale-90"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                {/* Content */}
                <div
                  onClick={() => onSelectTask(task)}
                  className="cursor-pointer min-w-0 flex-1 pr-2"
                >
                  <h3
                    className={`text-sm font-semibold truncate ${
                      task.completed ? 'line-through text-slate-400' : 'text-slate-800'
                    }`}
                  >
                    {task.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                    <span className="flex items-center space-x-1">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>{task.dueDate}</span>
                    </span>

                    {task.dueTime && (
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{task.dueTime}</span>
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
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
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onSelectTask(task)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                  title={t('editTask')}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title={t('delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-16 text-center text-slate-400 text-xs bg-slate-50/30 flex flex-col items-center justify-center space-y-2">
            <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-300">
              <Check className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="font-bold text-slate-700 text-sm">Your task list is empty</p>
              <p className="text-[11px] text-slate-400">Start planning your day by adding your first action item</p>
            </div>
            <button
              onClick={() => onOpenNewTask()}
              className="mt-3 text-emerald-700 font-semibold hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
            >
              + {t('addTask')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
