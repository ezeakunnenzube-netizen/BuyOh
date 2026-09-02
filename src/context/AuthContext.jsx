'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import AuthModal from '../components/AuthModal';
import { getUserProfileData, syncUserDataFromCloud, initUserRealtimeSync, cleanupUserRealtimeSync } from '../utils/userSync';

const AuthContext = createContext({
  user: null,
  loading: true,
  isAuthOpen: false,
  setIsAuthOpen: () => {},
  logout: async () => {}
});

function getCachedUser() {
  if (typeof window === 'undefined') return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token'))) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            if (parsed?.user) return parsed.user;
            if (parsed?.currentSession?.user) return parsed.currentSession.user;
            if (parsed?.session?.user) return parsed.session.user;
          } catch (e) {
            // Ignore non-json items
          }
        }
      }
    }
  } catch (e) {
    console.error("Error reading cached user from localStorage:", e);
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  // Track the cleanup function returned by initUserRealtimeSync
  const realtimeCleanupRef = useRef(null);

  // Activate cloud sync + realtime subscription for a user session
  const activateSync = async (sessionUser) => {
    if (!sessionUser?.id) return;
    // Run cloud sync in the background (non-blocking)
    syncUserDataFromCloud(sessionUser).catch(err =>
      console.warn('[BuyOh] Background cloud sync error:', err)
    );
    // Only set up realtime channel once per user
    if (!realtimeCleanupRef.current) {
      realtimeCleanupRef.current = initUserRealtimeSync(sessionUser);
    }
  };

  // Deactivate realtime channel on logout
  const deactivateSync = (userId) => {
    if (realtimeCleanupRef.current) {
      realtimeCleanupRef.current();
      realtimeCleanupRef.current = null;
    }
    if (userId) cleanupUserRealtimeSync(userId);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
    }

    // 1. Subscribe to active auth state changes continuously
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthOpen(false);
        activateSync(session.user);
      } else if (event === 'SIGNED_OUT') {
        const prevUser = user;
        setUser(null);
        deactivateSync(prevUser?.id);
      }
      setLoading(false);
    });

    // 2. Initialize session from Supabase local session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session?.user && !error) {
          setUser(session.user);
          activateSync(session.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      if (subscription) subscription.unsubscribe();
      // Clean up realtime on unmount
      if (realtimeCleanupRef.current) {
        realtimeCleanupRef.current();
        realtimeCleanupRef.current = null;
      }
    };
  }, []);

  const logout = async () => {
    try {
      const currentUserId = user?.id;
      await supabase.auth.signOut();
      setUser(null);
      deactivateSync(currentUserId);
    } catch (e) {
      console.error("Logout error:", e);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthOpen, setIsAuthOpen, logout }}>
      {children}
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          setIsAuthOpen(false);
          activateSync(loggedUser);
        }}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
