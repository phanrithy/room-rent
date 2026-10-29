import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeSetting, setThemeSetting] = useState(() => {
    return localStorage.getItem('app_theme') || 'system';
  });

  const [activeTheme, setActiveTheme] = useState(() => {
    const stored = localStorage.getItem('app_theme') || 'system';
    if (stored === 'system') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return stored;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme() {
      let resolved = themeSetting;
      if (themeSetting === 'system') {
        resolved = mediaQuery.matches ? 'dark' : 'light';
      }
      setActiveTheme(resolved);
      document.documentElement.setAttribute('data-theme', resolved);
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    applyTheme();

    const handler = () => {
      if (themeSetting === 'system') {
        applyTheme();
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [themeSetting]);

  const setTheme = useCallback((newTheme) => {
    if (!['light', 'dark', 'system'].includes(newTheme)) return;
    localStorage.setItem('app_theme', newTheme);
    setThemeSetting(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const current = document.documentElement.getAttribute('data-theme') || activeTheme;
    const nextTheme = current === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    return nextTheme;
  }, [activeTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme: themeSetting, activeTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
