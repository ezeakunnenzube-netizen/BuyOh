'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import AuthModal from '../components/AuthModal';
import { getUserProfileData } from '../utils/userSync';

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
  const [user, setUser] = useState(getCachedUser);
  const [loading, setLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Subscribe to active auth state changes continuously
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch fresh server user metadata
        try {
          const { data: { user: freshUser } } = await supabase.auth.getUser();
          const activeUser = freshUser || session.user;
          setUser(activeUser);
          getUserProfileData(activeUser);
        } catch (e) {
          setUser(session.user);
          getUserProfileData(session.user);
        }
        setIsAuthOpen(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      setLoading(false);
    });

    // 2. Initialize session from Supabase server / local storage
    const initAuth = async () => {
      try {
        const { data: { user: serverUser }, error } = await supabase.auth.getUser();
        if (serverUser && !error) {
          setUser(serverUser);
          getUserProfileData(serverUser);
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            getUserProfileData(session.user);
          } else {
            setUser(null);
          }
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
    };
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
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
        }}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
