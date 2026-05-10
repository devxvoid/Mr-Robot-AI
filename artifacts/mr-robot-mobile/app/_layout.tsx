import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppProvider } from '@/contexts/AppContext';
import { useColors } from '@/hooks/useColors';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient();
const STARTUP_TIMEOUT_MS = 1200;

function RootLayoutNav() {
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

function StartupFallback({ message }: { message: string }) {
  const colorScheme = useColorScheme();
  const isLight = colorScheme === 'light';
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isLight ? '#f8fafc' : '#000000',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <ActivityIndicator size="large" color={isLight ? '#007AFF' : '#00FF41'} />
      <Text
        style={{
          color: isLight ? '#667085' : '#A3A3A3',
          marginTop: 16,
          textAlign: 'center',
          fontSize: 14,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const [bootTimeoutReached, setBootTimeoutReached] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const canRenderApp = useMemo(
    () => fontsLoaded || !!fontError || bootTimeoutReached,
    [fontsLoaded, fontError, bootTimeoutReached]
  );

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
    const timeout = setTimeout(() => {
      setBootTimeoutReached(true);
      void SplashScreen.hideAsync().catch(() => undefined);
    }, STARTUP_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (canRenderApp) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [canRenderApp]);

  if (!canRenderApp) {
    return <StartupFallback message="Starting Mr. Robot..." />;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
