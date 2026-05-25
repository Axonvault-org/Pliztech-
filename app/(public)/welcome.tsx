import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

import { BackgroundImageScreen } from '@/components/BackgroundImageScreen';
import { CTAButton } from '@/components/CTAButton';
import { enterLogin } from '@/lib/navigation/auth-navigation';

const WELCOME_BG = require('@/assets/images/welcome-bg.png');

const SPACING = {
  mottoToSub: 12,
  subToButtons: 20,
  buttonGap: 12,
} as const;

export default function WelcomeScreen() {
  const onLogin = () => {
    enterLogin();
  };

  const onRegister = () => {
    router.replace('/(auth)/register' as import('expo-router').Href);
  };

  return (
    <BackgroundImageScreen source={WELCOME_BG}>
      <View style={styles.stack}>
        <Text style={styles.motto}>
          You ask because you&apos;re <Text style={styles.mottoHighlight}>human</Text>
          {'\n'}
          You give because you&apos;re <Text style={styles.mottoHighlight}>humane</Text>
        </Text>
        <Text style={styles.subDescription}>
          Join a community where small acts of kindness make a world of difference
        </Text>
        <View style={styles.buttons}>
          <CTAButton
            label="Login"
            onPress={onLogin}
            variant="gradient"
            accessibilityLabel="Go to login"
          />
          <CTAButton
            label="Register"
            onPress={onRegister}
            variant="white"
            accessibilityLabel="Go to register"
          />
        </View>
      </View>
    </BackgroundImageScreen>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    flexShrink: 1,
  },
  motto: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: SPACING.mottoToSub,
  },
  mottoHighlight: {
    color: '#60A5FA',
  },
  subDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.subToButtons,
  },
  buttons: {
    width: '100%',
    alignSelf: 'stretch',
    gap: SPACING.buttonGap,
  },
});
