import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { CTAButton } from '@/components/CTAButton';
import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import {
  changeTransactionPin,
  getTransactionPinStatus,
  setupTransactionPin,
  type TransactionPinStatus,
} from '@/lib/api/transaction-pin';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { getAccessToken } from '@/lib/auth/access-token';
import { recoverFromUnauthorized, isUnauthorizedSessionError } from '@/lib/auth/session-expired';

function normalizePin(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}

export default function TransactionPinScreen() {
  const { signOut } = useCurrentUser();
  const [status, setStatus] = useState<TransactionPinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadStatus = useCallback(
    async (retryAfterRefresh = false) => {
      const token = await getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        setStatus(await getTransactionPinStatus(token));
      } catch (e) {
        if (isUnauthorizedSessionError(e) && !retryAfterRefresh) {
          const recovered = await recoverFromUnauthorized(signOut);
          if (recovered) {
            await loadStatus(true);
            return;
          }
        }
        setError(formatPlizApiErrorForUser(e));
      } finally {
        setLoading(false);
      }
    },
    [signOut]
  );

  useFocusEffect(
    useCallback(() => {
      void loadStatus();
    }, [loadStatus])
  );

  const hasPin = Boolean(status?.hasPin);
  const canSubmit =
    pin.length === 4 &&
    confirmPin.length === 4 &&
    pin === confirmPin &&
    (!hasPin || currentPin.length === 4);

  const handleSave = async () => {
    setError(null);
    setSuccessMessage(null);
    if (pin.length !== 4 || confirmPin.length !== 4) {
      setError('Enter and confirm your 4-digit PIN.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }
    if (hasPin && currentPin.length !== 4) {
      setError('Enter your current PIN.');
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      setError('Sign in again to continue.');
      return;
    }

    setSaving(true);
    try {
      if (hasPin) {
        await changeTransactionPin(token, currentPin, pin);
      } else {
        await setupTransactionPin(token, pin);
      }
      setCurrentPin('');
      setPin('');
      setConfirmPin('');
      setStatus((prev) => ({
        hasPin: true,
        locked: false,
        lockedUntil: null,
        failedAttempts: 0,
        maxFailedAttempts: prev?.maxFailedAttempts ?? 5,
      }));
      setSuccessMessage(
        hasPin
          ? 'Your Transaction PIN has been updated.'
          : 'Your Transaction PIN is ready for secure transactions.'
      );
    } catch (e) {
      setError(formatPlizApiErrorForUser(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen backgroundColor="#F9FAFB" scrollable>
      <AppHeaderTitleRow title="Transaction PIN" />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2E8BEA" />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Ionicons name="key" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>{hasPin ? 'Change your PIN' : 'Create your PIN'}</Text>
          <Text style={styles.subtitle}>
            {hasPin
              ? 'Use a 4-digit PIN to protect sensitive transactions.'
              : 'You will use this PIN to confirm sensitive transactions like payments and withdrawals.'}
          </Text>

          {hasPin ? (
            <>
              <Text style={styles.label}>Current PIN</Text>
              <TextInput
                style={styles.input}
                value={currentPin}
                onChangeText={(value) => {
                  setSuccessMessage(null);
                  setCurrentPin(normalizePin(value));
                }}
                placeholder="Enter current PIN"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
              />
            </>
          ) : null}

          <Text style={styles.label}>{hasPin ? 'New PIN' : 'PIN'}</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={(value) => {
              setSuccessMessage(null);
              setPin(normalizePin(value));
            }}
            placeholder="Enter 4-digit PIN"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
          />

          <Text style={styles.label}>Confirm PIN</Text>
          <TextInput
            style={styles.input}
            value={confirmPin}
            onChangeText={(value) => {
              setSuccessMessage(null);
              setConfirmPin(normalizePin(value));
            }}
            placeholder="Re-enter 4-digit PIN"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
          />

          {status?.locked ? (
            <Text style={styles.warningText}>
              Your PIN is temporarily locked. Please try again later.
            </Text>
          ) : null}
          {successMessage ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={20} color="#047857" />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <CTAButton
            label={successMessage ? 'Done' : saving ? 'Saving…' : hasPin ? 'Change PIN' : 'Set PIN'}
            onPress={() => {
              if (successMessage) {
                router.back();
                return;
              }
              void handleSave();
            }}
            variant="gradient"
            disabled={!successMessage && (!canSubmit || saving || Boolean(status?.locked))}
            accessibilityLabel={
              successMessage
                ? 'Done'
                : hasPin
                  ? 'Change Transaction PIN'
                  : 'Set Transaction PIN'
            }
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  content: {
    paddingTop: 8,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2E8BEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 18,
    letterSpacing: 6,
    color: '#111827',
    marginBottom: 18,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#B45309',
    marginBottom: 12,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    marginBottom: 14,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#047857',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#B91C1C',
    marginBottom: 12,
  },
});
