import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import AuthModal from '../components/AuthModal';

const AuthContext = createContext({
  user: null,
  loading: true,
  isAuthOpen: false,
  setIsAuthOpen: () => {},
  logout: async () => {}
});

function getCachedUser() {
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
    let isMounted = true;

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        if (session?.user) {
          setUser(session.user);
        } else if (!getCachedUser()) {
          setUser(null);
        }
        setLoading(false);
      }
    }).catch(err => {
      console.error("Error getting session:", err);
      if (isMounted) setLoading(false);
    });

    // 2. Listen to active auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
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
        onSuccess={(loggedUser) => setUser(loggedUser)}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

