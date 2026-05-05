import { useColorScheme } from 'react-native';
import { useContext } from 'react';

import { AppContext } from '@/contexts/AppContext';

const DARK = {
  text: '#e0e0e0',
  tint: '#00D4FF',
  background: '#000000',
  foreground: '#e0e0e0',
  card: '#0a0a0a',
  cardForeground: '#e0e0e0',
  primary: '#00A7D8',
  primaryForeground: '#ffffff',
  secondary: '#111111',
  secondaryForeground: '#a0a0a0',
  muted: '#111111',
  mutedForeground: '#8a8a8a',
  accent: '#001a1f',
  accentForeground: '#00D4FF',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  border: '#1f2937',
  input: '#1a1a1a',
  overlay: 'rgba(0,0,0,0.8)',
  success: '#22c55e',
  warning: '#f59e0b',
};

const LIGHT = {
  text: '#111827',
  tint: '#007AFF',
  background: '#f8fafc',
  foreground: '#111827',
  card: '#ffffff',
  cardForeground: '#111827',
  primary: '#007AFF',
  primaryForeground: '#ffffff',
  secondary: '#eef2f7',
  secondaryForeground: '#374151',
  muted: '#eef2f7',
  mutedForeground: '#667085',
  accent: '#e6f2ff',
  accentForeground: '#0057b8',
  destructive: '#dc2626',
  destructiveForeground: '#ffffff',
  border: '#d8dee9',
  input: '#ffffff',
  overlay: 'rgba(15,23,42,0.35)',
  success: '#16a34a',
  warning: '#d97706',
};

const HACKER = {
  ...DARK,
  primary: '#00FF41',
  tint: '#00FF41',
  primaryForeground: '#000000',
  accent: '#001a00',
  accentForeground: '#00FF41',
  background: '#000000',
  card: '#010d01',
  border: '#0a1a0a',
  input: '#0a1a0a',
  secondary: '#0a1a0a',
  muted: '#0a1a0a',
  overlay: 'rgba(0,0,0,0.86)',
};

export function useColors() {
  const ctx = useContext(AppContext);
  const systemScheme = useColorScheme();
  const theme = ctx?.settings?.theme ?? 'dark';
  const amoledBlack = ctx?.settings?.amoledBlack ?? true;
  const hackerMode = ctx?.settings?.hackerMode ?? false;

  const resolvedTheme = theme === 'system' ? (systemScheme ?? 'dark') : theme;

  if (hackerMode) {
    return { ...HACKER, radius: 8, isDark: true };
  }

  if (resolvedTheme === 'light') {
    return { ...LIGHT, radius: 8, isDark: false };
  }

  return {
    ...DARK,
    background: amoledBlack ? '#000000' : '#0d0d0d',
    card: amoledBlack ? '#0a0a0a' : '#111111',
    radius: 8,
    isDark: true,
  };
}
