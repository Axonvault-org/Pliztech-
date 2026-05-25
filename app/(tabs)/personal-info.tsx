import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import {
  CURRENT_USER_FOCUS_REFETCH_STALE_MS,
  displayFullName,
  useCurrentUser,
} from '@/contexts/CurrentUserContext';

const BORDER_GRAY = '#E5E7EB';
const LABEL_GRAY = '#6B7280';
const VALUE_DARK = '#1F2937';
const VERIFIED_GREEN = '#22C55E';
const ICON_BG = '#F3F4F6';

function formatDisplay(value: string | undefined | null, fallback = 'Not set') {
  const t = value?.trim();
  return t ? t : fallback;
}

function formatLocation(profile: {
  city?: string | null;
  state?: string | null;
  address?: string | null;
} | null | undefined): string {
  const parts = [profile?.address, profile?.city, profile?.state]
    .map((value) => value?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Not set';
}

function isPhoneVerified(user: ReturnType<typeof useCurrentUser>['user']): boolean {
  return Boolean(user?.verification?.phoneVerified);
}

function InfoRow({
  icon,
  label,
  value,
  verified,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  verified?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={20} color="#4B5563" />
      </View>
      <View style={styles.labelValueWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      {verified && (
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}

export default function PersonalInfoScreen() {
  const { user, isLoading, error, refreshUser } = useCurrentUser();
  const lastRefreshRef = useRef<number>(0);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastRefreshRef.current < CURRENT_USER_FOCUS_REFETCH_STALE_MS) {
        return;
      }
      lastRefreshRef.current = now;
      void refreshUser();
    }, [refreshUser])
  );

  const handleEdit = () => {
    router.push('/(tabs)/edit-personal-info');
  };

  if (isLoading && !user) {
    return (
      <Screen backgroundColor="#FFFFFF">
        <AppHeaderTitleRow title="Personal Information" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2E8BEA" />
          <Text style={styles.loadingText}>Loading your information…</Text>
        </View>
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen backgroundColor="#FFFFFF">
        <AppHeaderTitleRow title="Personal Information" />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'Could not load your profile.'}</Text>
          <Pressable onPress={() => void refreshUser()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const fullName = displayFullName(user);
  const email = user.email ?? 'Not set';
  const phone = formatDisplay(user.profile?.phoneNumber);
  const location = formatLocation(user.profile);
  const emailVerified = user.isEmailVerified === true;
  const phoneVerified = isPhoneVerified(user);

  return (
    <Screen backgroundColor="#FFFFFF">
      <AppHeaderTitleRow title="Personal Information" />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Information</Text>
        <InfoRow icon="person-outline" label="Full Name" value={fullName} isLast={false} />
        <InfoRow
          icon="mail-outline"
          label="Email"
          value={email}
          verified={emailVerified}
          isLast={false}
        />
        <InfoRow
          icon="call-outline"
          label="Phone"
          value={phone}
          verified={phoneVerified}
          isLast={false}
        />
        <InfoRow
          icon="location-outline"
          label="Location"
          value={location}
          isLast
        />
      </View>

      <Pressable
        style={({ pressed }) => [styles.editButton, pressed && styles.editPressed]}
        onPress={handleEdit}
        accessibilityLabel="Edit personal information"
        accessibilityRole="button"
      >
        <Text style={styles.editText}>Edit</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: LABEL_GRAY,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_GRAY,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  labelValueWrap: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 13,
    color: LABEL_GRAY,
    marginBottom: 4,
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '700',
    color: VALUE_DARK,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: VERIFIED_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  editPressed: {
    opacity: 0.7,
  },
  editText: {
    fontSize: 16,
    fontWeight: '600',
    color: VALUE_DARK,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: LABEL_GRAY,
  },
  errorText: {
    fontSize: 15,
    color: '#B91C1C',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: VALUE_DARK,
  },
});
