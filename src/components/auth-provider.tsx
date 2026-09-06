'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  supabase: SupabaseClient | null;
  approved: boolean;
  isAdmin: boolean;
  profileFetched: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [approved, setApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileFetched, setProfileFetched] = useState(false);
  const mountedRef = useRef(false);

  // Read approval status from user_metadata (no profiles table dependency)
  const updateApprovalFromUser = useCallback((u: User | null) => {
    if (u) {
      const meta = u.user_metadata || {};
      const isApproved = meta.approved === true;
      const isAdminUser = meta.is_admin === true;
      console.log('[AuthProvider] User metadata:', { approved: isApproved, isAdmin: isAdminUser, meta });
      setApproved(isApproved);
      setIsAdmin(isAdminUser);
    } else {
      setApproved(false);
      setIsAdmin(false);
    }
    setProfileFetched(true);
  }, []);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    async function initSupabase() {
      try {
        const res = await fetch('/api/config/supabase');
        const config = await res.json();

        if (cancelled) return;

        if (!config.url || !config.anonKey) {
          console.error('[AuthProvider] Supabase config empty');
          setLoading(false);
          setProfileFetched(true);
          return;
        }

        const supabase = createClient(config.url, config.anonKey);

        if (cancelled) return;

        setClient(supabase);

        const { data: { session: s } } = await supabase.auth.getSession();

        if (cancelled) return;

        setSession(s);
        setUser(s?.user ?? null);

        // Read approval from user_metadata directly
        updateApprovalFromUser(s?.user ?? null);

        setLoading(false);

        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          updateApprovalFromUser(newSession?.user ?? null);
        });

        subscription = sub;
      } catch (err) {
        console.error('[AuthProvider] Failed to init Supabase:', err);
        if (!cancelled) {
          setLoading(false);
          setProfileFetched(true);
        }
      }
    }

    initSupabase();

    return () => {
      cancelled = true;
      if (subscription) subscription.unsubscribe();
    };
  }, [updateApprovalFromUser]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!client) return { error: '系统未就绪' };
    
    const { data, error } = await client.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: undefined,
        data: {
          email_verified: true,
          approved: false,
          is_admin: false,
        }
      }
    });
    
    if (error) {
      return { error: error.message };
    }

    if (data.user && !data.session) {
      const signInResult = await client.auth.signInWithPassword({ email, password });
      if (signInResult.error) {
        return { error: '注册成功，但需要邮箱验证。请联系管理员开启自动验证。' };
      }
    }
    
    return { error: null };
  }, [client]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!client) return { error: '系统未就绪' };
    const { error } = await client.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, [client]);

  const signOut = useCallback(async () => {
    if (!client) return;
    await client.auth.signOut();
  }, [client]);

  const refreshProfile = useCallback(async () => {
    if (!client || !user) return;
    // Refresh user to get latest metadata
    const { data } = await client.auth.getUser();
    if (data?.user) {
      updateApprovalFromUser(data.user);
    }
  }, [client, user, updateApprovalFromUser]);

  return (
    <AuthContext.Provider value={{ user, session, loading, supabase: client, approved, isAdmin, profileFetched, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
