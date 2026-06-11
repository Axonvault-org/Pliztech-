import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { FormTextInput } from '@/components/FormTextInput';
import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { deleteAccount } from '@/lib/api/auth';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { getAccessToken } from '@/lib/auth/access-token';
import { enterSignedOutWelcome } from '@/lib/navigation/auth-navigation';

const ACCENT_BLUE = '#2E8BEA';
const DESTRUCTIVE_RED = '#DC2626';

export default function DeleteAccountScreen() {
  const { user, signOut } = useCurrentUser();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const oauthHint =
    user?.authProvider === 'google' || user?.authProvider === 'apple';

  const handleDelete = useCallback(async () => {
    if (submitting) return;

    const trimmed = password.trim();
    if (!trimmed) {
      Alert.alert('Password required', 'Enter your account password to confirm deletion.');
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      Alert.alert('Session expired', 'Please sign in again and retry account deletion.');
      return;
    }

    setSubmitting(true);
    try {
      const message = await deleteAccount(token, {
        password: trimmed,
        reason: 'User requested account deletion from Account Settings',
      });
      await signOut();
      enterSignedOutWelcome();
      Alert.alert('Account deleted', message);
    } catch (e) {
      Alert.alert('Could not delete account', formatPlizApiErrorForUser(e));
    } finally {
      setSubmitting(false);
    }
  }, [password, signOut, submitting]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Delete account permanently?',
      'This will delete your account and sign you out on all devices. You will not be able to sign in again.\n\nSome transaction and compliance records may be retained as described in our Privacy Policy.\n\nContact support@plz.ng if you deleted your account by mistake.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            void handleDelete();
          },
        },
      ]
    );
  }, [handleDelete]);

  return (
    <Screen backgroundColor="#F9FAFB" scrollable>
      <AppHeaderTitleRow title="Delete Account" backIconColor="#9CA3AF" />

      <View style={styles.content}>
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>This action is permanent</Text>
          <Text style={styles.warningBody}>
            Your account will be deleted and you will lose access to Plz. Active help requests
            without donations will be removed from the community feed. Requests that received
            donations, pending withdrawals, or accounts under investigation must be resolved
            before deletion.
          </Text>
        </View>

        <FormTextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry={!showPassword}
          onToggleSecure={() => setShowPassword((v) => !v)}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          editable={!submitting}
          hint={
            oauthHint
              ? 'If you sign in with Google or Apple only, use Forgot password to set an account password first.'
              : 'Enter the same password you use to sign in to Plz.'
          }
        />

        <Pressable
          onPress={confirmDelete}
          disabled={submitting || !password.trim()}
          style={({ pressed }) => [
            styles.deleteButton,
            (submitting || !password.trim()) && styles.deleteButtonDisabled,
            pressed && !submitting && password.trim() && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting || !password.trim() }}
        >
          <Text style={styles.deleteButtonLabel}>
            {submitting ? 'Deleting account…' : 'Delete my account'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          disabled={submitting}
          style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.cancelLabel}>Keep my account</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 32,
  },
  warningCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 16,
    gap: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DESTRUCTIVE_RED,
  },
  warningBody: {
    fontSize: 14,
    lineHeight: 21,
    color: '#7F1D1D',
  },
  deleteButton: {
    marginTop: 8,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: DESTRUCTIVE_RED,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: ACCENT_BLUE,
  },
  pressed: {
    opacity: 0.7,
  },
});
