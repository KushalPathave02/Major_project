import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { dashboardTheme, lightDashboardTheme } from './theme';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}>(
  {
    theme: 'light',
    toggleTheme: () => {},
    setTheme: () => {},
  }
);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    // Try to get persisted theme from localStorage
    const stored = localStorage.getItem('theme');
    return stored === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);

    // Set CSS variables for background and text color
    if (theme === 'dark') {
      document.documentElement.style.setProperty('--bg-color', '#181a29');
      document.documentElement.style.setProperty('--text-color', '#fff');
    } else {
      document.documentElement.style.setProperty('--bg-color', '#f4f6fa');
      document.documentElement.style.setProperty('--text-color', '#23263a');
    }
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <MuiThemeProvider theme={theme === 'dark' ? dashboardTheme : lightDashboardTheme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
