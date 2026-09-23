import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  ShieldCheck,
  AlertCircle,
  Calendar as CalendarIcon,
  RefreshCw,
  LogOut,
  Globe,
  CheckCircle2,
  Lock,
  Mail,
  Edit3,
  Check,
  Sparkles,
  Server,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSchedule } from '../context/ScheduleContext';
import { GoogleCalendarService } from '../services/googleCalendar';

interface SettingsViewProps {
  onOpenAuth: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenAuth }) => {
  const { t, language, setLanguage } = useTranslation();
  const {
    user,
    isCalendarConnected,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    sendVerificationEmailAgain,
    reloadUser,
    updateUserDisplayName,
    sendResetEmail,
    logout,
  } = useAuth();
  const { syncWithGoogleCalendar, isSyncing, lastSyncedAt } = useSchedule();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [showConfigDetails, setShowConfigDetails] = useState(false);
  const [serverStatus, setServerStatus] = useState<{
    configured: boolean;
    hasSmtp: boolean;
    databaseReady: boolean;
  } | null>(null);

  useEffect(() => {
    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data) => setServerStatus(data))
      .catch((err) => console.error('Failed to get status:', err));
  }, []);

  const languages: { code: Language; label: string; nativeLabel: string; flag: string }[] = [
    { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
    { code: 'ru', label: 'Russian', nativeLabel: 'Русский', flag: '🇷🇺' },
    { code: 'tg', label: 'Tajik', nativeLabel: 'Тоҷикӣ', flag: '🇹🇯' },
    { code: 'zh', label: 'Chinese', nativeLabel: '中文', flag: '🇨🇳' },
  ];

  const handleUpdateName = async () => {
    if (!displayName.trim()) return;
    await updateUserDisplayName(displayName.trim());
    setIsEditingName(false);
    setInfoMessage('Name updated successfully.');
  };

  const handleResendVerification = async () => {
    try {
      await sendVerificationEmailAgain();
      setInfoMessage(t('verificationSentNotice'));
    } catch (err: any) {
      setInfoMessage(err.message || 'Failed to send verification email.');
    }
  };

  const handleCheckStatus = async () => {
    const verified = await reloadUser();
    if (verified) {
      setInfoMessage('Email verified successfully! Full dashboard access granted.');
    } else {
      setInfoMessage('Your email is still unverified. Please check your inbox.');
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendResetEmail(user.email);
      setInfoMessage(t('resetEmailSent'));
    } catch (err: any) {
      setInfoMessage(err.message || 'Failed to send reset email.');
    }
  };

  const connectedCalendarEmail = GoogleCalendarService.getConnectedEmail() || user?.email;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {t('settings')}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your profile, Google Calendar synchronization, language, and system configuration
        </p>
      </div>

      {infoMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{infoMessage}</span>
          </div>
          <button
            onClick={() => setInfoMessage(null)}
            className="text-xs text-emerald-700 font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Account & Profile Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <UserIcon className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-slate-900">{t('profile')}</h2>
        </div>

        {user ? (
          <div className="space-y-4">
            {/* User photo & name */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-bold flex items-center justify-center text-base shadow-xs overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    (user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()
                  )}
                </div>
                <div>
                  {isEditingName ? (
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                      />
                      <button
                        onClick={handleUpdateName}
                        className="p-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">
                        {user.displayName || 'Planner'}
                      </span>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="text-slate-400 hover:text-slate-600"
                        title="Edit name"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </div>

              {/* Email Verification Status */}
              <div>
                {user.emailVerified ? (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Email {t('verified')}</span>
                  </div>
                ) : (
                  <div className="flex flex-col sm:items-end space-y-1.5">
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Email {t('unverified')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleResendVerification}
                        className="text-[11px] font-semibold text-emerald-700 hover:underline"
                      >
                        {t('resendVerification')}
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        onClick={handleCheckStatus}
                        className="text-[11px] font-semibold text-slate-600 hover:underline"
                      >
                        Check Status
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions for authenticated user */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handlePasswordReset}
                className="px-3.5 py-2 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset Password</span>
              </button>

              <button
                onClick={logout}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('logout')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/60 text-center space-y-3">
            <p className="text-xs text-slate-600">
              Sign in with your email or Google account to synchronize your schedule across devices.
            </p>
            <button
              onClick={onOpenAuth}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              {t('signIn')} / {t('createAccount')}
            </button>
          </div>
        )}
      </div>

      {/* 2. Google Calendar Integration Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Google Calendar</h2>
              <p className="text-xs text-slate-400">Two-way real-time calendar synchronization</p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              isCalendarConnected
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {isCalendarConnected ? t('statusConnected') : t('statusNotConnected')}
          </span>
        </div>

        <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60 space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            {t('googleCalendarDesc')}
          </p>

          {isCalendarConnected && (
            <div className="text-xs text-slate-500 space-y-1 pt-1 border-t border-slate-200/60">
              <p>
                <strong>Connected Account:</strong> {connectedCalendarEmail || 'Primary Google Account'}
              </p>
              <p>
                <strong>{t('lastSynced')}:</strong>{' '}
                {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : t('justNow')}
              </p>
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {isCalendarConnected ? (
              <>
                <button
                  onClick={syncWithGoogleCalendar}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-2 transition-all active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? t('syncing') : t('syncCalendar')}</span>
                </button>

                {confirmDisconnect ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        disconnectGoogleCalendar();
                        setConfirmDisconnect(false);
                      }}
                      className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
                    >
                      Confirm Disconnect
                    </button>
                    <button
                      onClick={() => setConfirmDisconnect(false)}
                      className="px-3 py-2 text-slate-500 text-xs hover:text-slate-800"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDisconnect(true)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-rose-600 rounded-xl text-xs font-semibold transition-colors"
                  >
                    {t('disconnect')}
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={connectGoogleCalendar}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs shadow-blue-200 transition-all active:scale-95 flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t('connectGoogleCalendar')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Authentication & Service Architecture Diagnostics */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Authentication & Email Infrastructure</h2>
              <p className="text-xs text-slate-400">Live operational status and provider details</p>
            </div>
          </div>
          <button
            onClick={() => setShowConfigDetails(!showConfigDetails)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-1"
          >
            <span>{showConfigDetails ? 'Hide Details' : 'View Details'}</span>
            {showConfigDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60">
            <div className="flex items-center space-x-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">Auth Engine</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Active (Email/Password + Google OAuth)
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60">
            <div className="flex items-center space-x-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">Email Verification</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {serverStatus?.hasSmtp ? 'Active (Custom SMTP)' : 'Active (Direct Dispatcher)'}
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60">
            <div className="flex items-center space-x-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">Database Storage</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Persistent & Encrypted (Scrypt)
            </p>
          </div>
        </div>

        {showConfigDetails && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-3 animate-in fade-in duration-200">
            <p className="font-semibold text-slate-800">
              Email Dispatch & Configuration Options:
            </p>
            <p className="leading-relaxed">
              Real email verification links and password reset tokens are generated with cryptographic security and dispatched directly. Unverified users are prevented from accessing the main dashboard until verified.
            </p>
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 font-mono text-[11px]">
              <div className="text-slate-500 font-sans font-bold">To configure custom SMTP server:</div>
              <div>SMTP_HOST="smtp.example.com"</div>
              <div>SMTP_PORT="587"</div>
              <div>SMTP_USER="user@example.com"</div>
              <div>SMTP_PASS="your-password"</div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Language Selector */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{t('language')}</h2>
            <p className="text-xs text-slate-400">Select your preferred interface language</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {languages.map((l) => {
            const isSelected = language === l.code;
            return (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200/80 bg-white hover:bg-slate-50'
                }`}
              >
                <div>
                  <span className="text-2xl block mb-1">{l.flag}</span>
                  <span className="text-xs font-bold text-slate-900 block">{l.label}</span>
                  <span className="text-[11px] text-slate-400">{l.nativeLabel}</span>
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. About My Schedule */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">{t('aboutTitle')}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          {t('aboutDesc')}
        </p>
        <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100">
          <span>Version 1.0.0 • Designed for focus & simplicity</span>
          <span className="text-emerald-700 font-semibold">My Schedule</span>
        </div>
      </div>
    </div>
  );
};
