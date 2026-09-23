import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  User as UserIcon,
  X,
  ListTodo,
  Sparkles,
} from 'lucide-react';
import { NavTab, Language } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSchedule } from '../context/ScheduleContext';

interface NavbarProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  onOpenNewEvent: () => void;
  onOpenNewTask: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenNewEvent,
  onOpenNewTask,
  onOpenAuth,
}) => {
  const { t, language, setLanguage } = useTranslation();
  const { user, isCalendarConnected, connectGoogleCalendar, logout } = useAuth();
  const { isSyncing, syncWithGoogleCalendar } = useSchedule();

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Live time ticker in header
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'tg', label: 'Тоҷикӣ', flag: '🇹🇯' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
  ];

  const currentLangObj = languages.find((l) => l.code === language) || languages[0];

  const navItems: { tab: NavTab; label: string; icon: React.ReactNode }[] = [
    { tab: 'today', label: t('today'), icon: <Clock className="w-4 h-4" /> },
    { tab: 'calendar', label: t('calendar'), icon: <CalendarIcon className="w-4 h-4" /> },
    { tab: 'tasks', label: t('myTasks'), icon: <ListTodo className="w-4 h-4" /> },
    { tab: 'settings', label: t('settings'), icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Brand — Guaranteed visible, aligned, and never pushed off-screen */}
          <div className="flex items-center space-x-6 sm:space-x-8 shrink-0">
            <button
              onClick={() => setCurrentTab('today')}
              className="flex items-center space-x-2.5 sm:space-x-3 text-left focus:outline-hidden group cursor-pointer"
            >
              {/* Distinctive Logo Badge */}
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 flex items-center justify-center text-white shadow-sm shadow-emerald-500/25 group-hover:scale-105 group-hover:shadow-emerald-500/40 transition-all duration-200 shrink-0">
                <CalendarIcon className="w-5 h-5 text-white" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-sky-400 rounded-full border-2 border-white" />
              </div>

              {/* Brand Typography */}
              <div className="shrink-0 flex items-center">
                <span className="font-logo font-extrabold text-base sm:text-xl tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors whitespace-nowrap">
                  My Schedule
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = currentTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    onClick={() => setCurrentTab(item.tab)}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 shadow-xs border border-emerald-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            {/* Live Clock (tablet/desktop) */}
            <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100/80 rounded-full text-xs font-semibold text-slate-600 border border-slate-200/60">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentTime}</span>
            </div>

            {/* Google Calendar Sync Indicator / Connect Button */}
            {isCalendarConnected ? (
              <button
                onClick={syncWithGoogleCalendar}
                disabled={isSyncing}
                title={t('syncCalendar')}
                className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-full text-xs font-medium text-emerald-800 transition-all active:scale-95 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {isSyncing ? t('syncing') : t('syncCalendar')}
                </span>
              </button>
            ) : (
              <button
                onClick={connectGoogleCalendar}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-full text-xs font-semibold transition-all active:scale-95 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>{t('connectGoogleCalendar')}</span>
              </button>
            )}

            {/* Quick Action Button: New Event */}
            <button
              onClick={onOpenNewEvent}
              className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('newEvent')}</span>
            </button>

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
                title="Change language"
              >
                <span className="text-base leading-none">{currentLangObj.flag}</span>
                <span className="hidden sm:inline text-xs">{currentLangObj.code.toUpperCase()}</span>
              </button>

              {langMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setLangMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {t('language')}
                    </div>
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setLanguage(l.code);
                          setLangMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors ${
                          language === l.code
                            ? 'bg-emerald-50 text-emerald-800 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center space-x-2">
                          <span>{l.flag}</span>
                          <span>{l.label}</span>
                        </span>
                        {language === l.code && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* User Profile / Auth Button */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-0.5 rounded-xl hover:ring-2 hover:ring-emerald-400/40 transition-all focus:outline-hidden"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center text-xs overflow-hidden border border-slate-300 shadow-2xs">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                    ) : (
                      (user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()
                    )}
                  </div>
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {user.displayName || 'Planner'}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        <div className="mt-1.5 flex items-center space-x-1">
                          {user.emailVerified ? (
                            <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>{t('verified')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                              {t('unverified')}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setCurrentTab('settings');
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span>{t('settings')}</span>
                      </button>

                      <button
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center space-x-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 text-left transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>{t('logout')}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-95"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>{t('signIn')}</span>
              </button>
            )}

            {/* Mobile menu hamburger toggle */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileNavOpen && (
        <div className="md:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-4 pt-3 pb-4 space-y-1.5 shadow-lg animate-in slide-in-from-top-2 duration-200">
          {navItems.map((item) => {
            const isActive = currentTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => {
                  setCurrentTab(item.tab);
                  setMobileNavOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 shadow-xs border border-emerald-200/60'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}

          {!isCalendarConnected && (
            <button
              onClick={() => {
                connectGoogleCalendar();
                setMobileNavOpen(false);
              }}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200 mt-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>{t('connectGoogleCalendar')}</span>
            </button>
          )}

          <div className="pt-2 flex items-center space-x-2">
            <button
              onClick={() => {
                onOpenNewTask();
                setMobileNavOpen(false);
              }}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              + {t('newTask')}
            </button>
            <button
              onClick={() => {
                onOpenNewEvent();
                setMobileNavOpen(false);
              }}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
            >
              + {t('newEvent')}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
