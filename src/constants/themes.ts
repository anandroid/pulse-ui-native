export type ThemeMode = 'light' | 'dark' | 'evening' | 'twilight' | 'twilight-light' | 'purple-day' | 'system';

export interface ThemeColors {
  statusBarStyle: 'light-content' | 'dark-content';
  statusBarBackground: string;
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
}

export const themes: Record<ThemeMode, ThemeColors> = {
  light: {
    statusBarStyle: 'dark-content',
    statusBarBackground: '#ffffff',
    background: '#ffffff',
    foreground: '#020817',
    primary: '#6366f1',
    secondary: '#f3f4f6',
    accent: '#3b82f6',
  },
  dark: {
    statusBarStyle: 'light-content',
    statusBarBackground: '#020817',
    background: '#020817',
    foreground: '#f8fafc',
    primary: '#818cf8',
    secondary: '#1e293b',
    accent: '#60a5fa',
  },
  evening: {
    statusBarStyle: 'light-content',
    statusBarBackground: '#1a0b2e',
    background: '#1a0b2e',
    foreground: '#fef3c7',
    primary: '#fb923c',
    secondary: '#2d1b69',
    accent: '#f97316',
  },
  twilight: {
    statusBarStyle: 'light-content',
    statusBarBackground: '#1f1f23',
    background: '#1f1f23',
    foreground: '#e5e5e7',
    primary: '#9ca3af',
    secondary: '#27272a',
    accent: '#6b7280',
  },
  'twilight-light': {
    statusBarStyle: 'dark-content',
    statusBarBackground: '#faf9fb',
    background: '#faf9fb',
    foreground: '#1f1f23',
    primary: '#8b5cf6',
    secondary: '#f3f4f6',
    accent: '#7c3aed',
  },
  'purple-day': {
    statusBarStyle: 'dark-content',
    statusBarBackground: '#fefcff',
    background: '#fefcff',
    foreground: '#1a0b2e',
    primary: '#9333ea',
    secondary: '#f3e8ff',
    accent: '#7c3aed',
  },
  system: {
    statusBarStyle: 'dark-content',
    statusBarBackground: '#ffffff',
    background: '#ffffff',
    foreground: '#020817',
    primary: '#6366f1',
    secondary: '#f3f4f6',
    accent: '#3b82f6',
  },
};

export const DEFAULT_THEME: ThemeMode = 'twilight-light';
export const THEME_STORAGE_KEY = 'pulse-ui-theme';