import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useTabBarPadding(extra = 16): number {
  const insets = useSafeAreaInsets();
  const baseHeight = Platform.OS === 'ios' ? insets.bottom + 56 : 56;
  return baseHeight + extra;
}

export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'ios' ? insets.bottom + 56 : 56;
}
