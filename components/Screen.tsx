import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

/** Spacing and layout constants for the Screen template */
export const SCREEN = {
  paddingHorizontal: 24,
  paddingVertical: 16,
  contentPaddingBottom: 24,
} as const;

export interface ScreenProps {
  /** Background color (default: '#FFFFFF') */
  backgroundColor?: string;
  /** Main content. Use with scrollable for long content. */
  children: React.ReactNode;
  /** Optional header slot rendered above the main content (inside safe area) */
  header?: React.ReactNode;
  /** When true, content is scrollable; when false, content is in a plain View (default: false) */
  scrollable?: boolean;
  /** Extra style for the inner content container */
  contentStyle?: ViewStyle;
  /** When true, center content vertically (useful for splash/auth screens). Default: false */
  centerVertical?: boolean;
}

/**
 * Reusable screen template: SafeAreaView, background, padding, optional scroll and header.
 * Use this for all full-screen routes to keep layout and safe areas consistent.
 *
 * Example for a new screen (e.g. app/welcome.tsx):
 *   import { Screen } from '@/components/Screen';
 *   export default function Welcome() {
 *     return (
 *       <Screen backgroundColor="#FFFFFF" centerVertical>
 *         <Text>Welcome</Text>
 *       </Screen>
 *     );
 *   }
 */
export function Screen({
  backgroundColor = '#FFFFFF',
  children,
  header,
  scrollable = false,
  contentStyle,
  centerVertical = false,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const containerStyle = {
    flex: 1,
    backgroundColor,
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: Math.max(insets.left, SCREEN.paddingHorizontal),
    paddingRight: Math.max(insets.right, SCREEN.paddingHorizontal),
  };

  const contentContainerStyle: ViewStyle = {
    flex: scrollable ? undefined : 1,
    justifyContent: centerVertical ? 'center' : undefined,
    paddingVertical: SCREEN.paddingVertical,
    paddingBottom: SCREEN.contentPaddingBottom,
  };

  const content = (
    <View style={[styles.content, contentContainerStyle, contentStyle]}>
      {children}
    </View>
  );

  return (
    <View style={containerStyle}>
      {header != null ? <View style={styles.header}>{header}</View> : null}
      {scrollable ? (
        <KeyboardAvoidingView
          style={styles.scroll}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              contentContainerStyle,
              styles.scrollContent,
              contentStyle,
              centerVertical && styles.scrollCenter,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    alignSelf: 'stretch',
  },
  scrollCenter: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
});
