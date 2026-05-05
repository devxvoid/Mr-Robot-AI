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
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider } from '@/contexts/AppContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient();
const STARTUP_TIMEOUT_MS = 3500;

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
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
  const [fontTimeoutReached, setFontTimeoutReached] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const canRenderApp = useMemo(
    () => fontsLoaded || !!fontError || fontTimeoutReached,
    [fontsLoaded, fontError, fontTimeoutReached]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFontTimeoutReached(true);
    }, STARTUP_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!canRenderApp) return;
    void SplashScreen.hideAsync().catch(() => undefined);
  }, [canRenderApp]);

  useEffect(() => {
    const hardSplashTimeout = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => undefined);
    }, STARTUP_TIMEOUT_MS + 1500);

    return () => clearTimeout(hardSplashTimeout);
  }, []);

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
