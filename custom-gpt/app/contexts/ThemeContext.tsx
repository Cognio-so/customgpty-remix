import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useFetcher } from '@remix-run/react';
import { Theme, getSystemTheme, applyTheme } from '~/lib/theme';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  systemTheme: Theme;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  specifiedTheme?: Theme | null;
}

export function ThemeProvider({ children, specifiedTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // If we have a specified theme from the server, use it
    if (specifiedTheme) return specifiedTheme;
    
    // Otherwise, try to get from localStorage or fall back to system
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme-preference');
      if (stored === 'light' || stored === 'dark') return stored;
    }
    
    return getSystemTheme();
  });

  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);
  const fetcher = useFetcher();

  // Update system theme when it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to DOM and update localStorage
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme-preference', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    
    // Update server-side cookie
    fetcher.submit(
      { theme: newTheme },
      { method: 'POST', action: '/api/theme' }
    );
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, systemTheme }}>
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