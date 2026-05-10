import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppProvider } from '@/contexts/AppContext';
import { useColors } from '@/hooks/useColors';

// Prevent native splash from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

function AppContent() {
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Fonts ready — hide the native splash screen
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // Safety timeout — hide splash after 4s no matter what
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // IMPORTANT: Expo Router requires we always return a navigator from _layout.
  // We cannot return null here. Instead we use Slot as a minimal pass-through
  // while fonts are loading (native splash is still visible on top).
  if (!fontsLoaded && !fontError) {
    // Return Slot so Expo Router's route tree is valid.
    // The native splash screen covers this until hideAsync is called.
    return <Slot />;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <AppContent />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
