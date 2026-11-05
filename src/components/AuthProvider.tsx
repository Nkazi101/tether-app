import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AppUser, mapSupabaseUser } from '../lib/auth-client';
import { getSupabaseBrowserClient } from '../lib/supabase/client';
import { appRoutes, buildAuthPath, sanitizeNextPath } from '../lib/routes';

export interface SignUpResult {
  hasSession: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  isAuthReady: boolean;
  authProvider: 'supabase' | null;
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, next?: string | null) => Promise<SignUpResult>;
  signInWithGoogle: (next?: string | null) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAuthReady: false,
  authProvider: null,
  isPasswordRecovery: false,
  signIn: async () => {},
  signUp: async () => ({ hasSession: false }),
  signInWithGoogle: async () => {},
  sendPasswordReset: async () => {},
  updatePassword: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [isSupabaseReady, setIsSupabaseReady] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let isMounted = true;

    if (supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) {
          return;
        }

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }

        if (event === 'SIGNED_OUT') {
          setIsPasswordRecovery(false);
        }

        setSupabaseSession(session ?? null);
        setIsSupabaseReady(true);
      });

      supabase.auth
        .getSession()
        .then(({ data, error }) => {
          if (!isMounted) {
            return;
          }

          if (error) {
            console.error('Error restoring Supabase session:', error);
          }

          setSupabaseSession(data.session ?? null);
          setIsSupabaseReady(true);
        })
        .catch((error) => {
          if (!isMounted) {
            return;
          }

          console.error('Error restoring Supabase session:', error);
          setIsSupabaseReady(true);
        });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } else {
      setIsSupabaseReady(true);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const user = supabaseSession?.user ? mapSupabaseUser(supabaseSession.user) : null;

  const authProvider = user?.provider ?? null;
  const isAuthReady = isSupabaseReady;

  const requireSupabase = () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      throw new Error('Supabase is not configured in this environment.');
    }

    return supabase;
  };

  const signIn = async (email: string, password: string) => {
    const supabase = requireSupabase();

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    next?: string | null
  ): Promise<SignUpResult> => {
    const supabase = requireSupabase();
    const safeNext = sanitizeNextPath(next) || appRoutes.feed;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName.trim(),
        },
        emailRedirectTo: `${window.location.origin}${buildAuthPath(safeNext)}`,
      },
    });

    if (error) {
      throw error;
    }

    return { hasSession: Boolean(data.session) };
  };

  const signInWithGoogle = async (next?: string | null) => {
    const supabase = requireSupabase();
    const safeNext = sanitizeNextPath(next) || appRoutes.feed;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${safeNext}`,
      },
    });

    if (error) {
      throw error;
    }
  };

  const sendPasswordReset = async (email: string) => {
    const supabase = requireSupabase();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${appRoutes.updatePassword}`,
    });

    if (error) {
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    const supabase = requireSupabase();

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw error;
    }

    setIsPasswordRecovery(false);
  };

  const signOut = async () => {
    const supabase = requireSupabase();

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session: supabaseSession,
        isAuthReady,
        authProvider,
        isPasswordRecovery,
        signIn,
        signUp,
        signInWithGoogle,
        sendPasswordReset,
        updatePassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
