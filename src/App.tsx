import React, { useState, useEffect } from 'react';
import { NavTab, CalendarEvent, TaskItem } from './types';
import { LanguageProvider, useTranslation } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ScheduleProvider } from './context/ScheduleContext';
import { Navbar } from './components/Navbar';
import { DashboardToday } from './components/DashboardToday';
import { CalendarView } from './components/CalendarView';
import { TasksView } from './components/TasksView';
import { SettingsView } from './components/SettingsView';
import { EventModal } from './components/EventModal';
import { TaskModal } from './components/TaskModal';
import { AuthModal } from './components/AuthModal';
import { EmailVerificationWall } from './components/EmailVerificationWall';
import { CheckCircle2, X } from 'lucide-react';

function AppContent() {
  const { t } = useTranslation();
  const {
    user,
    resetTokenFromUrl,
    verificationNotice,
    clearVerificationNotice,
  } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavTab>('today');

  // Event Modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [initialEventDate, setInitialEventDate] = useState<string | undefined>(undefined);
  const [initialEventTime, setInitialEventTime] = useState<string | undefined>(undefined);

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskItem | null>(null);
  const [initialTaskDate, setInitialTaskDate] = useState<string | undefined>(undefined);

  // Auth Modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Auto-open modal when reset token is present in URL
  useEffect(() => {
    if (resetTokenFromUrl) {
      setIsAuthModalOpen(true);
    }
  }, [resetTokenFromUrl]);

  // Handlers
  const handleOpenNewEvent = (initialDate?: string, initialTime?: string) => {
    setEventToEdit(null);
    setInitialEventDate(initialDate);
    setInitialEventTime(initialTime);
    setIsEventModalOpen(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setEventToEdit(event);
    setInitialEventDate(undefined);
    setInitialEventTime(undefined);
    setIsEventModalOpen(true);
  };

  const handleOpenNewTask = (initialDate?: string) => {
    setTaskToEdit(null);
    setInitialTaskDate(initialDate);
    setIsTaskModalOpen(true);
  };

  const handleSelectTask = (task: TaskItem) => {
    setTaskToEdit(task);
    setInitialTaskDate(undefined);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenNewEvent={() => handleOpenNewEvent()}
        onOpenNewTask={() => handleOpenNewTask()}
        onOpenAuth={() => {
          setAuthMode('signin');
          setIsAuthModalOpen(true);
        }}
      />

      {/* Global Toast for Verification Notices */}
      {verificationNotice && (
        <div className="bg-emerald-600 text-white px-4 py-3 shadow-md animate-in slide-in-from-top-2 duration-300">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold">{verificationNotice}</span>
            </div>
            <button
              onClick={clearVerificationNotice}
              className="p-1 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {/* MANDATORY: Prevent unverified users from accessing main dashboard */}
        {user && !user.emailVerified ? (
          <EmailVerificationWall />
        ) : (
          <>
            {currentTab === 'today' && (
              <DashboardToday
                onOpenNewEvent={handleOpenNewEvent}
                onOpenNewTask={handleOpenNewTask}
                onSelectEvent={handleSelectEvent}
                onSelectTask={handleSelectTask}
                onGoToCalendar={() => setCurrentTab('calendar')}
                onGoToTasks={() => setCurrentTab('tasks')}
              />
            )}

            {currentTab === 'calendar' && (
              <CalendarView
                onOpenNewEvent={handleOpenNewEvent}
                onSelectEvent={handleSelectEvent}
              />
            )}

            {currentTab === 'tasks' && (
              <TasksView
                onOpenNewTask={handleOpenNewTask}
                onSelectTask={handleSelectTask}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                onOpenAuth={() => {
                  setAuthMode('signup');
                  setIsAuthModalOpen(true);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        eventToEdit={eventToEdit}
        initialDate={initialEventDate}
        initialTime={initialEventTime}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={taskToEdit}
        initialDate={initialTaskDate}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ScheduleProvider>
          <AppContent />
        </ScheduleProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
