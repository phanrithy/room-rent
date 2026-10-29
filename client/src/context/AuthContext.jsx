import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest, setOnUnauthorized } from '../utils/api.js';
import { setAppLanguage } from '../i18n/index.js';
import { useTheme } from './ThemeContext.jsx';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('app_token'));
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme();

  const logout = useCallback(() => {
    localStorage.removeItem('app_token');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
    });
  }, [logout]);

  // Inactivity Auto-Logout (30 minutes)
  useEffect(() => {
    if (!token) return;

    const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
    let timeoutId;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        sessionStorage.setItem('session_expired_reason', 'inactivity');
        logout();
      }, INACTIVITY_LIMIT_MS);
    };

    resetTimer();

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    return () => {
      clearTimeout(timeoutId);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [token, logout]);

  const fetchCurrentUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest('auth/me');
      setUser(data.user);
      // Only set language from server if not already explicitly selected in localStorage
      const localLang = localStorage.getItem('app_language');
      if (!localLang && data.user.language) {
        setAppLanguage(data.user.language);
      }
      const localTheme = localStorage.getItem('app_theme');
      if (!localTheme && data.user.theme) {
        setTheme(data.user.theme);
      }
    } catch (err) {
      console.warn('Failed to fetch current user:', err);
      logout();
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (username, password) => {
    const data = await apiRequest('auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('app_token', data.token);
    setToken(data.token);
    setUser(data.user);
    const chosenLang = localStorage.getItem('app_language');
    if (!chosenLang && data.user.language) {
      setAppLanguage(data.user.language);
    }
    const chosenTheme = localStorage.getItem('app_theme');
    if (!chosenTheme && data.user.theme) {
      setTheme(data.user.theme);
    }
    return data.user;
  };

  const updatePreferences = async ({ language, theme }) => {
    const data = await apiRequest('auth/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ language, theme }),
    });
    setUser(data.user);
    if (language) setAppLanguage(language);
    if (theme) setTheme(theme);
    return data.user;
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    return await apiRequest('auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isStaff: user?.role === 'staff' || user?.role === 'admin',
        isTenant: user?.role === 'tenant',
        login,
        logout,
        updatePreferences,
        changePassword,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
