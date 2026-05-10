import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  const tabBarHeight = useTabBarHeight();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
          height: tabBarHeight,
          // Prevent oversized hit areas and clipping
          paddingBottom: insets.bottom,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint={colors.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ),
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 10,
          marginBottom: isIOS ? 0 : 4,
        },
        tabBarIconStyle: {
          marginTop: isIOS ? 0 : 4,
        },
        // Prevent tab screens from unmounting on switch (preserves state)
        lazy: true,
        freezeOnBlur: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <Feather name="message-square" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Feather name="clock" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="memory"
        options={{
          title: 'Memory',
          tabBarIcon: ({ color, size }) => <Feather name="database" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="skills"
        options={{
          title: 'Skills',
          tabBarIcon: ({ color, size }) => <Feather name="zap" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
