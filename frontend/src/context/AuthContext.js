import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('stolecheck_token');
    const savedUser = localStorage.getItem('stolecheck_user');

    if (token && savedUser) {
      try {
        const res = await authAPI.me();
        setUser(res.data);
        localStorage.setItem('stolecheck_user', JSON.stringify(res.data));
      } catch {
        // Token invalid, try saved user
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem('stolecheck_token');
          localStorage.removeItem('stolecheck_user');
          setUser(null);
        }
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = (userData, token) => {
    localStorage.setItem('stolecheck_token', token);
    localStorage.setItem('stolecheck_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('stolecheck_token');
    localStorage.removeItem('stolecheck_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
