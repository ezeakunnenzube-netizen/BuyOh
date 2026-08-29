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
  const [oauthError, setOauthError] = useState('');

  useEffect(() => {
    // 1. Check for OAuth error returned in URL hash or query params
    try {
      const hash = window.location.hash.substring(1);
      const search = window.location.search.substring(1);
      const params = new URLSearchParams(hash || search);
      const errorDescription = params.get('error_description') || params.get('error');
      if (errorDescription) {
        const formatted = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
        console.error("OAuth error received in URL:", formatted);
        setOauthError(formatted);
        setIsAuthOpen(true);
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (e) {}

    // 2. Subscribe to active auth state changes continuously
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthOpen(false);
        setOauthError('');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      setLoading(false);
    });

    // 3. Explicitly handle OAuth code / token callback exchange & initial session
    const initAuth = async () => {
      try {
        // Handle PKCE Code exchange if returning from Google OAuth
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.warn("PKCE code exchange notice:", error);
            } else if (data?.session?.user) {
              setUser(data.session.user);
              setIsAuthOpen(false);
              setLoading(false);
              window.history.replaceState(null, '', window.location.pathname);
              return;
            }
          } catch (err) {
            console.warn("Code exchange caught notice:", err);
          }
        }

        // Handle Implicit Flow hash tokens if returning from Google OAuth
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            if (!error && data?.session?.user) {
              setUser(data.session.user);
              setIsAuthOpen(false);
              setLoading(false);
              window.history.replaceState(null, '', window.location.pathname);
              return;
            }
          } catch (err) {
            console.warn("Set session caught notice:", err);
          }
        }

        // Regular session check
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setIsAuthOpen(false);
        } else {
          const cached = getCachedUser();
          if (!cached) {
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
        onClose={() => {
          setIsAuthOpen(false);
          setOauthError('');
        }} 
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          setIsAuthOpen(false);
          setOauthError('');
        }}
        initialError={oauthError}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
