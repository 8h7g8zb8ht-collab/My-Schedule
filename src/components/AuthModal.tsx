import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

type ModalView = 'signin' | 'signup' | 'forgot' | 'verify-notice' | 'reset';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
}) => {
  const { t } = useTranslation();
  const {
    user,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    sendVerificationEmailAgain,
    sendResetEmail,
    resetPasswordWithToken,
    reloadUser,
    resetTokenFromUrl,
    clearResetToken,
  } = useAuth();

  const [view, setView] = useState<ModalView>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sentToEmail, setSentToEmail] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // If reset token is detected from URL, switch to reset mode
  useEffect(() => {
    if (resetTokenFromUrl) {
      setView('reset');
      setError(null);
    }
  }, [resetTokenFromUrl]);

  useEffect(() => {
    if (isOpen) {
      setView(initialMode);
      setError(null);
      setSuccessMsg(null);
      setPassword('');
    }
  }, [isOpen, initialMode]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await signUpWithEmail(email, password, displayName);
      setSentToEmail(email);
      if (res.verificationUrl) {
        setFallbackUrl(res.verificationUrl);
      }
      setView('verify-notice');
      setResendCooldown(30);
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithEmail(email, password);
      if (!res.emailVerified) {
        setSentToEmail(email);
        setView('verify-notice');
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign In
  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      if (err.message && !err.message.includes('closed')) {
        setError(err.message || 'Failed to connect with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await sendResetEmail(email);
      setSuccessMsg('Password reset instructions have been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!resetTokenFromUrl) {
      setError('Password reset token is missing or invalid.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithToken(resetTokenFromUrl, newPassword);
      clearResetToken();
      setSuccessMsg('Your password has been reset! Please sign in with your new password.');
      setTimeout(() => {
        setView('signin');
        setPassword('');
        setSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend Verification
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await sendVerificationEmailAgain(sentToEmail || user?.email || undefined);
      setSuccessMsg('Verification email resent! Please check your inbox.');
      setResendCooldown(45);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  // Handle "I've Verified My Email" check
  const handleCheckStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const isVerified = await reloadUser();
      if (isVerified) {
        onClose();
      } else {
        setError('Your email is not verified yet. Please check your inbox and click the verification link.');
      }
    } catch (err: any) {
      setError('Could not verify status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: VERIFICATION NOTICE ("Check Your Inbox") */}
        {/* ------------------------------------------------------------- */}
        {view === 'verify-notice' && (
          <div className="space-y-5 text-center py-2 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-xs">
              <Mail className="w-8 h-8 text-emerald-600 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Verify Your Email
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xs mx-auto">
                We sent a real verification link to:
              </p>
              <div className="inline-block px-3.5 py-1.5 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200/70 shadow-2xs">
                {sentToEmail || user?.email || 'your email'}
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                You must verify your email to unlock your schedule and access the dashboard.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start space-x-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* In preview/development, provide convenient verification link copy */}
            {fallbackUrl && (
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-left space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>Direct Verification Link</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(fallbackUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
                  >
                    {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? 'Copied' : 'Copy link'}</span>
                  </button>
                </div>
                <a
                  href={fallbackUrl}
                  className="block text-[11px] text-emerald-700 hover:underline font-mono truncate bg-white p-2 rounded-lg border border-slate-200"
                >
                  {fallbackUrl}
                </a>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-sm shadow-emerald-500/20 active:scale-95 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>I've Verified My Email</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={loading || resendCooldown > 0}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-xs rounded-2xl transition-colors disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : 'Resend Verification Email'}
              </button>

              <button
                type="button"
                onClick={() => setView('signin')}
                className="text-xs text-slate-500 hover:text-slate-800 pt-1"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: RESET PASSWORD */}
        {/* ------------------------------------------------------------- */}
        {view === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Choose New Password
              </h2>
              <p className="text-xs text-slate-500">
                Enter your new password below.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center space-x-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Update Password</span>}
            </button>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: FORGOT PASSWORD */}
        {/* ------------------------------------------------------------- */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Reset Password
              </h2>
              <p className="text-xs text-slate-500">
                Enter your email and we'll send you a password reset link.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('email')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-sm active:scale-95 flex items-center justify-center space-x-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Send Reset Link</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                setView('signin');
                setError(null);
                setSuccessMsg(null);
              }}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              Back to Sign In
            </button>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 4 & 5: SIGN IN OR SIGN UP */}
        {/* ------------------------------------------------------------- */}
        {(view === 'signin' || view === 'signup') && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Header */}
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 rounded-full text-emerald-800 text-[11px] font-bold mb-2 border border-emerald-200/60">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>My Schedule</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {view === 'signup' ? t('createAccount') : t('signIn')}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {view === 'signup'
                  ? 'Start organizing your days with intentional clarity'
                  : 'Welcome back! Sign in to access your planner'}
              </p>
            </div>

            {/* Error Message Display */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 font-semibold text-xs sm:text-sm rounded-2xl transition-all hover:shadow-xs active:scale-95 flex items-center justify-center space-x-2.5 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{t('signInWithGoogle')}</span>
            </button>

            {/* Separator */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Or with email
              </span>
            </div>

            {/* Form */}
            <form onSubmit={view === 'signup' ? handleSignUp : handleSignIn} className="space-y-3.5">
              {view === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('fullName')}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('email')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {t('password')}
                  </label>
                  {view === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setView('forgot');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold"
                    >
                      {t('forgotPassword')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={view === 'signup' ? 'At least 6 characters' : '••••••••'}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-sm shadow-emerald-500/25 hover:shadow-md hover:shadow-emerald-500/30 active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <span>{view === 'signup' ? t('createAccount') : t('signIn')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle between Sign In and Sign Up */}
            <div className="pt-2 text-center text-xs text-slate-500">
              {view === 'signup' ? (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setView('signin');
                      setError(null);
                    }}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    {t('signIn')}
                  </button>
                </p>
              ) : (
                <p>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setView('signup');
                      setError(null);
                    }}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    {t('createAccount')}
                  </button>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
