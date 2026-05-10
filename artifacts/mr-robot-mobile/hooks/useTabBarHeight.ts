import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Returns the total tab bar height (including safe area insets).
 * Use this to set bottom padding on scrollable content so it doesn't
 * get hidden behind the absolute-positioned tab bar.
 *
 * iOS: 49pt (standard tab bar) + bottom inset (home indicator)
 * Android: 60pt (touch-friendly) + bottom inset (gesture nav)
 */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  return isIOS ? 49 + insets.bottom : 60 + insets.bottom;
}
