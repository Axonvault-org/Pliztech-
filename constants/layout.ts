import type { ViewStyle } from 'react-native';

/** Shared layout tokens for consistent responsive width across screens. */
export const LAYOUT = {
  /** Cap form width on large phones / small tablets; content uses full width below this. */
  contentMaxWidth: 480,
  screenPaddingHorizontal: 24,
} as const;

/** Centered column for auth forms and CTAs — stretches to screen minus padding, capped on wide devices. */
export const formContentStyle: ViewStyle = {
  width: '100%',
  maxWidth: LAYOUT.contentMaxWidth,
  alignSelf: 'center',
};
