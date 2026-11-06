import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  bg: string;
  card: string;
  mutedSurface: string;
  border: string;
  text: string;
  textMuted: string;
  brand: string;
  brandActive: string;
  brandDark: string;
  brandSubtle: string;
  success: string;
  warning: string;
  danger: string;
}

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@elevatio_theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceColorScheme = useDeviceColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system'); // Padrão Sistema automático (respeita iOS/Android)

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeModeState(saved);
        }
      } catch (err) {
        console.warn('Erro ao carregar preferência de tema:', err);
      }
    })();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (err) {
      console.warn('Erro ao salvar preferência de tema:', err);
    }
  };

  const isDark = themeMode === 'system' ? deviceColorScheme === 'dark' : themeMode === 'dark';

  // Tokens de Cor Oficiais shadcn Mobile
  const colors: ThemeColors = {
    bg: isDark ? '#09090b' : '#fafafa',
    card: isDark ? '#121215' : '#ffffff',
    mutedSurface: isDark ? '#18181b' : '#f4f4f5',
    border: isDark ? '#27272a' : '#e4e4e7',
    text: isDark ? '#f4f4f5' : '#09090b',
    textMuted: isDark ? '#a1a1aa' : '#71717a',
    brand: '#0ea5e9',
    brandActive: '#0284c7',
    brandDark: '#082f49',
    brandSubtle: isDark ? 'rgba(14, 165, 233, 0.14)' : 'rgba(14, 165, 233, 0.10)',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#f43f5e',
  };

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, setThemeMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
};
