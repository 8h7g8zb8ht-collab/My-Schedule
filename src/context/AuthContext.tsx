import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { GoogleCalendarService } from '../services/googleCalendar';
import { AppUser, UserProfile } from '../types';

interface AuthContextType {
  user: AppUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isCalendarConnected: boolean;
  resetTokenFromUrl: string | null;
  clearResetToken: () => void;
  verificationNotice: string | null;
  clearVerificationNotice: () => void;
  signUpWithEmail: (email: string, pass: string, displayName: string) => Promise<{ success: boolean; verificationUrl?: string; message: string }>;
  signInWithEmail: (email: string, pass: string) => Promise<{ emailVerified: boolean }>;
  signInWithGoogle: () => Promise<void>;
  connectGoogleCalendar: () => Promise<void>;
  disconnectGoogleCalendar: () => void;
  sendVerificationEmailAgain: (email?: string) => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  resetPasswordWithToken: (token: string, newPass: string) => Promise<void>;
  verifyEmailWithToken: (token: string) => Promise<{ success: boolean; message: string }>;
  updateUserDisplayName: (name: string) => Promise<void>;
  reloadUser: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const withTimeout = <T,>(promise: Promise<T>, timeoutMs = 8000, errorMsg = 'Request timed out. Please try again.'): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs)),
  ]);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    // Check if there is an active local user session
    const saved = localStorage.getItem('my_schedule_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCalendarConnected, setIsCalendarConnected] = useState<boolean>(
    GoogleCalendarService.isConnected()
  );
  const [resetTokenFromUrl, setResetTokenFromUrl] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);

  // Sync profile data with Firestore / local cache
  const syncUserProfile = useCallback(async (appUser: AppUser) => {
    const profile: UserProfile = {
      uid: appUser.uid,
      email: appUser.email,
      displayName: appUser.displayName || 'Planner',
      photoURL: appUser.photoURL || null,
      emailVerified: appUser.emailVerified,
      googleCalendarConnected: GoogleCalendarService.isConnected(),
      googleCalendarEmail: GoogleCalendarService.getConnectedEmail(),
    };
    setUserProfile(profile);

    try {
      const userRef = doc(db, 'users', appUser.uid);
      await withTimeout(
        getDoc(userRef).then(async (userDoc) => {
          if (!userDoc.exists()) {
            await setDoc(userRef, {
              ...profile,
              createdAt: Date.now(),
            });
          } else {
            await updateDoc(userRef, {
              emailVerified: appUser.emailVerified,
              displayName: appUser.displayName || userDoc.data().displayName,
              googleCalendarConnected: GoogleCalendarService.isConnected(),
              lastActive: Date.now(),
            });
          }
        }),
        3000
      );
    } catch {
      // Local fallback is already active
    }
  }, []);

  // Update persistent user storage
  const setPersistedUser = (appUser: AppUser | null) => {
    setUser(appUser);
    if (appUser) {
      localStorage.setItem('my_schedule_auth_user', JSON.stringify(appUser));
      syncUserProfile(appUser);
    } else {
      localStorage.removeItem('my_schedule_auth_user');
      setUserProfile(null);
    }
  };

  // Check URL parameters on mount for ?verify_token= or ?reset_token=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyToken = params.get('verify_token');
    const resetToken = params.get('reset_token');

    if (verifyToken) {
      // Auto verify token
      fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyToken }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            const verifiedAppUser: AppUser = {
              uid: data.user.id,
              email: data.user.email,
              displayName: data.user.displayName,
              emailVerified: true,
              photoURL: null,
            };
            setPersistedUser(verifiedAppUser);
            setVerificationNotice('Your email address has been verified successfully! Welcome to My Schedule.');
          } else {
            setVerificationNotice(data.message || 'Verification link is invalid or expired.');
          }
          // Clean up URL without reload
          window.history.replaceState({}, '', window.location.pathname);
        })
        .catch((err) => {
          console.error('Error auto-verifying token:', err);
        });
    }

    if (resetToken) {
      setResetTokenFromUrl(resetToken);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const appUser: AppUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
          emailVerified: fbUser.emailVerified,
        };
        setPersistedUser(appUser);
      }
      setIsCalendarConnected(GoogleCalendarService.isConnected());
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1. Sign up with Email (Real user registration & Real email verification)
  const signUpWithEmail = async (email: string, pass: string, displayName: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // First, try Firebase native auth if operational
    try {
      const userCred = await withTimeout(
        createUserWithEmailAndPassword(auth, cleanEmail, pass),
        4000
      );

      if (displayName) {
        try {
          await updateProfile(userCred.user, { displayName });
        } catch {
          // non-critical
        }
      }

      await sendEmailVerification(userCred.user);

      const appUser: AppUser = {
        uid: userCred.user.uid,
        email: userCred.user.email,
        displayName: displayName || userCred.user.email?.split('@')[0] || 'User',
        emailVerified: false,
        photoURL: null,
      };
      setPersistedUser(appUser);

      return {
        success: true,
        message: 'Account created! We sent a verification email to your address.',
      };
    } catch (fbErr: any) {
      const code = fbErr?.code || '';
      // If operation not allowed or server error in Firebase, use full-stack Express auth API
      if (code.includes('operation-not-allowed') || code.includes('timeout') || !code) {
        const res = await withTimeout(
          fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password: pass, displayName }),
          }),
          8000,
          'Account creation took too long. Please try again.'
        );

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Failed to create account.');
        }

        const appUser: AppUser = {
          uid: data.user.id,
          email: data.user.email,
          displayName: data.user.displayName,
          emailVerified: false,
          photoURL: null,
        };
        setPersistedUser(appUser);

        return {
          success: true,
          verificationUrl: data.verificationUrl,
          message: data.message || 'Account created! Please check your email to verify.',
        };
      }

      // Format clean error message for user
      if (code.includes('email-already-in-use')) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      } else if (code.includes('weak-password')) {
        throw new Error('Password must be at least 6 characters long.');
      } else if (code.includes('invalid-email')) {
        throw new Error('Please enter a valid email address.');
      }
      throw new Error(fbErr.message || 'Failed to create account.');
    }
  };

  // 2. Sign in with Email
  const signInWithEmail = async (email: string, pass: string): Promise<{ emailVerified: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();

    // First try Firebase
    try {
      const userCred = await withTimeout(
        signInWithEmailAndPassword(auth, cleanEmail, pass),
        4000
      );

      const appUser: AppUser = {
        uid: userCred.user.uid,
        email: userCred.user.email,
        displayName: userCred.user.displayName || userCred.user.email?.split('@')[0] || 'User',
        emailVerified: userCred.user.emailVerified,
        photoURL: userCred.user.photoURL,
      };
      setPersistedUser(appUser);

      return { emailVerified: appUser.emailVerified };
    } catch (fbErr: any) {
      const code = fbErr?.code || '';
      // If operation not allowed or user not found in Firebase, attempt API login
      if (code.includes('operation-not-allowed') || code.includes('user-not-found') || !code) {
        const res = await withTimeout(
          fetch('/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password: pass }),
          }),
          8000,
          'Sign in timed out. Please try again.'
        );

        const data = await res.json();
        if (!res.ok) {
          if (data.error === 'EMAIL_NOT_VERIFIED') {
            const appUser: AppUser = {
              uid: data.user.id,
              email: data.user.email,
              displayName: data.user.displayName,
              emailVerified: false,
              photoURL: null,
            };
            setPersistedUser(appUser);
            return { emailVerified: false };
          }
          throw new Error(data.message || 'Incorrect email or password.');
        }

        const appUser: AppUser = {
          uid: data.user.id,
          email: data.user.email,
          displayName: data.user.displayName,
          emailVerified: true,
          photoURL: null,
        };
        setPersistedUser(appUser);
        return { emailVerified: true };
      }

      if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
        throw new Error('Incorrect email or password. Please verify your credentials.');
      }
      throw new Error(fbErr.message || 'Failed to sign in.');
    }
  };

  // 3. Sign in with Google (automatically pre-verified)
  const signInWithGoogle = async () => {
    const result = await withTimeout(
      signInWithPopup(auth, googleProvider),
      60000,
      'Google sign-in timed out or was closed.'
    );
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      GoogleCalendarService.setToken(credential.accessToken, 3600, result.user.email || undefined);
      setIsCalendarConnected(true);
    }
    const appUser: AppUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      emailVerified: true, // Google accounts are verified
      photoURL: result.user.photoURL,
    };
    setPersistedUser(appUser);
  };

  // 4. Connect Google Calendar
  const connectGoogleCalendar = async () => {
    const res = await GoogleCalendarService.requestGoogleCalendarAccess(user?.email || undefined);
    if (res.token) {
      setIsCalendarConnected(true);
      if (user) {
        syncUserProfile(user);
      }
    }
  };

  // 5. Disconnect Google Calendar
  const disconnectGoogleCalendar = () => {
    GoogleCalendarService.clearToken();
    setIsCalendarConnected(false);
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        googleCalendarConnected: false,
        googleCalendarEmail: null,
      });
    }
  };

  // 6. Resend verification email
  const sendVerificationEmailAgain = async (customEmail?: string) => {
    const targetEmail = customEmail || user?.email;
    if (!targetEmail) {
      throw new Error('No email address provided for verification.');
    }

    if (auth.currentUser) {
      try {
        await withTimeout(sendEmailVerification(auth.currentUser), 6000);
        return;
      } catch {
        // Fall back to server api
      }
    }

    const res = await withTimeout(
      fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      }),
      8000
    );

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to resend verification email.');
    }
  };

  // 7. Password reset email
  const sendResetEmail = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();

    try {
      await withTimeout(sendPasswordResetEmail(auth, cleanEmail), 4000);
      return;
    } catch {
      // Fallback to server API
      const res = await withTimeout(
        fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        }),
        8000
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send password reset email.');
      }
    }
  };

  // 8. Reset password with token
  const resetPasswordWithToken = async (token: string, newPass: string) => {
    const res = await withTimeout(
      fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: newPass }),
      }),
      8000
    );

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to reset password.');
    }
  };

  // 9. Verify Email with token
  const verifyEmailWithToken = async (token: string) => {
    const res = await withTimeout(
      fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }),
      8000
    );

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Verification link is invalid or expired.');
    }

    if (data.user) {
      const verifiedAppUser: AppUser = {
        uid: data.user.id,
        email: data.user.email,
        displayName: data.user.displayName,
        emailVerified: true,
        photoURL: null,
      };
      setPersistedUser(verifiedAppUser);
    }

    return {
      success: true,
      message: data.message || 'Email verified successfully!',
    };
  };

  // 10. Update user display name
  const updateUserDisplayName = async (name: string) => {
    if (user) {
      const updated: AppUser = { ...user, displayName: name };
      setPersistedUser(updated);
    }
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: name });
    }
  };

  // 11. Reload user (Check verification status)
  const reloadUser = async (): Promise<boolean> => {
    if (auth.currentUser) {
      try {
        await withTimeout(auth.currentUser.reload(), 4000);
        if (auth.currentUser.emailVerified && user) {
          setPersistedUser({ ...user, emailVerified: true });
          return true;
        }
      } catch {
        // Continue to server check
      }
    }

    if (user?.email) {
      try {
        const res = await fetch(`/api/auth/status?email=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.emailVerified) {
            setPersistedUser({ ...user, emailVerified: true });
            return true;
          }
        }
      } catch (e) {
        console.error('Error reloading verification status:', e);
      }
    }

    return false;
  };

  // 12. Logout
  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // non-critical
    }
    setPersistedUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isCalendarConnected,
        resetTokenFromUrl,
        clearResetToken: () => setResetTokenFromUrl(null),
        verificationNotice,
        clearVerificationNotice: () => setVerificationNotice(null),
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        connectGoogleCalendar,
        disconnectGoogleCalendar,
        sendVerificationEmailAgain,
        sendResetEmail,
        resetPasswordWithToken,
        verifyEmailWithToken,
        updateUserDisplayName,
        reloadUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
