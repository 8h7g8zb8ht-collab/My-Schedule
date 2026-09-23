import React, { useState, useEffect } from 'react';
import {
  Mail,
  RefreshCw,
  ShieldCheck,
  LogOut,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const EmailVerificationWall: React.FC = () => {
  const { user, reloadUser, sendVerificationEmailAgain, verifyEmailWithToken, logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Periodic auto-check every 5 seconds
  useEffect(() => {
    const pollTimer = setInterval(async () => {
      try {
        await reloadUser();
      } catch {
        // silent
      }
    }, 5000);
    return () => clearInterval(pollTimer);
  }, [reloadUser]);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const isVerified = await reloadUser();
      if (isVerified) {
        setSuccess('Email verified! Redirecting to your dashboard...');
      } else {
        setError('Your email is not verified yet. Please click the link sent to your email inbox.');
      }
    } catch (err: any) {
      setError('Could not verify status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await sendVerificationEmailAgain(user?.email || undefined);
      setSuccess('Verification email resent! Please check your inbox and spam folder.');
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;

    // Extract token if user pasted the full URL
    let token = manualToken.trim();
    if (token.includes('token=')) {
      const parts = token.split('token=');
      token = parts[1].split('&')[0];
    }

    setLoading(true);
    setError(null);
    try {
      const res = await verifyEmailWithToken(token);
      setSuccess(res.message || 'Email verified successfully!');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-200">
        {/* Animated Badge */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center border border-emerald-100 shadow-xs">
            <Mail className="w-10 h-10 text-emerald-600 animate-pulse" />
          </div>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white">
            !
          </span>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 rounded-full text-amber-800 text-[11px] font-bold border border-amber-200/60">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Verification Required</span>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Verify Your Email
          </h1>

          <p className="text-xs sm:text-sm text-slate-600">
            To protect your schedule and access the dashboard, please verify your email address:
          </p>

          <div className="inline-block px-3.5 py-1.5 bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-200/80">
            {user?.email}
          </div>

          <p className="text-[11px] text-slate-400 pt-1">
            We sent a verification link to your inbox. Click the link to unlock your full planner.
          </p>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start space-x-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Main Actions */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-sm shadow-emerald-500/20 active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
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
            disabled={loading || cooldown > 0}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-xs rounded-2xl transition-colors disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend Verification Email'}
          </button>
        </div>

        {/* Manual verification code entry fallback */}
        <div className="pt-2 border-t border-slate-100">
          {!showManualInput ? (
            <button
              onClick={() => setShowManualInput(true)}
              className="text-[11px] text-slate-400 hover:text-slate-600 font-medium"
            >
              Have a verification token or URL? Click here
            </button>
          ) : (
            <form onSubmit={handleManualTokenSubmit} className="space-y-2 pt-1">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste token or verification link..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={loading || !manualToken.trim()}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl disabled:opacity-50"
              >
                Submit Verification Token
              </button>
            </form>
          )}
        </div>

        {/* Logout button */}
        <div className="pt-2">
          <button
            onClick={logout}
            className="inline-flex items-center space-x-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign in with a different account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
