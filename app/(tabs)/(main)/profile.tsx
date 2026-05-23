import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { KycVerificationBanner } from '@/components/profile/KycVerificationBanner';
import { ProfileRow } from '@/components/profile/ProfileRow';
import { ProfileSection } from '@/components/profile/ProfileSection';
import { ProfileSummaryCard } from '@/components/profile/ProfileSummaryCard';
import { Screen } from '@/components/Screen';
import {
  avatarColorFromSeed,
  CURRENT_USER_FOCUS_REFETCH_STALE_MS,
  displayMemberRoleLabel,
  displayProfileHeader,
  initialsFromDisplayName,
  isDocumentVerified,
  useCurrentUser,
} from '@/contexts/CurrentUserContext';
import { formatCardBrandLabel, getSavedCards } from '@/lib/api/payment-methods';
import { getProfilePicture, type ProfilePicture } from '@/lib/api/profile-picture';
import { updateProfile } from '@/lib/api/profile';
import { getAccessToken } from '@/lib/auth/access-token';
import {
  isUnauthorizedSessionError,
  recoverFromUnauthorized,
} from '@/lib/auth/session-expired';

const PAYMENT_CARDS_SUBTITLE_DEFAULT = 'Add or manage your cards';

export default function ProfileScreen() {
  const { user, isLoading, refreshUser, signOut } = useCurrentUser();
  const [anonToggling, setAnonToggling] = useState(false);
  const lastRefreshRef = useRef<number>(0);

  const [pushNotifications, setPushNotifications] = useState(true);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [paymentCardsSubtitle, setPaymentCardsSubtitle] = useState(PAYMENT_CARDS_SUBTITLE_DEFAULT);
  const [profilePicture, setProfilePicture] = useState<ProfilePicture | null>(null);

  const loadPaymentCardsSubtitle = useCallback(
    async (retryAfterRefresh = false) => {
      try {
        const token = await getAccessToken();
        if (!token) {
          setPaymentCardsSubtitle(PAYMENT_CARDS_SUBTITLE_DEFAULT);
          return;
        }
        const cards = await getSavedCards(token);
        if (cards.length === 0) {
          setPaymentCardsSubtitle('No cards saved yet — add one when you donate');
          return;
        }
        const def = cards.find((c) => c.isDefault) ?? cards[0];
        if (!def) {
          setPaymentCardsSubtitle(PAYMENT_CARDS_SUBTITLE_DEFAULT);
          return;
        }
        const brand = formatCardBrandLabel(def.cardType);
        if (cards.length === 1) {
          setPaymentCardsSubtitle(`${brand} •••• ${def.last4}`);
        } else {
          setPaymentCardsSubtitle(
            `${cards.length} cards · Default ${brand} •••• ${def.last4}`
          );
        }
      } catch (e) {
        if (isUnauthorizedSessionError(e) && !retryAfterRefresh) {
          const recovered = await recoverFromUnauthorized(signOut);
          if (recovered) {
            await loadPaymentCardsSubtitle(true);
          }
          return;
        }
        setPaymentCardsSubtitle(PAYMENT_CARDS_SUBTITLE_DEFAULT);
      }
    },
    [signOut]
  );

  const loadProfilePicture = useCallback(
    async (retryAfterRefresh = false) => {
      try {
        const token = await getAccessToken();
        if (!token) {
          setProfilePicture(null);
          return;
        }
        setProfilePicture(await getProfilePicture(token));
      } catch (e) {
        if (isUnauthorizedSessionError(e) && !retryAfterRefresh) {
          const recovered = await recoverFromUnauthorized(signOut);
          if (recovered) {
            await loadProfilePicture(true);
          }
        }
      }
    },
    [signOut]
  );

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastRefreshRef.current >= CURRENT_USER_FOCUS_REFETCH_STALE_MS) {
        lastRefreshRef.current = now;
        void refreshUser();
      }
      void loadPaymentCardsSubtitle();
      void loadProfilePicture();
    }, [refreshUser, loadPaymentCardsSubtitle, loadProfilePicture])
  );

  useEffect(() => {
    setAnonymousMode(user?.profile?.isAnonymous ?? false);
  }, [user?.profile?.isAnonymous]);

  const header = displayProfileHeader(user);
  const fullName = header.name;
  const email = header.email;
  const roleLabel = displayMemberRoleLabel(user);
  const seed = user?.username ?? user?.email ?? '';
  const avatarColor = seed ? avatarColorFromSeed(seed) : '#2E8BEA';
  const avatarUrl = profilePicture?.displayUrl ?? user?.avatar?.displayUrl ?? null;
  const initials = header.initials || (fullName ? initialsFromDisplayName(fullName) : '?');
  const showCardLoading = isLoading && !user;

  const stats = user?.stats;
  const givenNaira = Math.round(Number(stats?.totalDonated) || 0);
  const peopleHelped = stats?.peopleHelped ?? 0;
  const requestsCount = stats?.requestsCount ?? 0;

  return (
    <Screen backgroundColor="#F9FAFB" scrollable>
      <AppHeaderTitleRow title="My Profile" backIconColor="#9CA3AF" />

      <View style={styles.content}>
               <ProfileSummaryCard
          fullName={fullName}
          email={email}
          emailVerified={user?.isEmailVerified ?? false}
          govIdVerified={isDocumentVerified(user)}
          roleLabel={roleLabel}
          avatarColor={avatarColor}
          avatarUrl={avatarUrl}
          initials={initials}
          maskAvatar={header.maskAvatar}
          given={givenNaira}
          helped={peopleHelped}
          requests={requestsCount}
          isLoading={showCardLoading}
        />

        {user && !isDocumentVerified(user) ? (
          <KycVerificationBanner onPress={() => router.push('/(tabs)/kyc-verification')} />
        ) : null}

        <ProfileSection title="User info">
          <ProfileRow
            icon="person-outline"
            title="Personal Information"
            subtitle="Edit your name, email, phone & change location"
            onPress={() => router.push('/(tabs)/personal-info')}
          />
          <ProfileRow
            icon="camera-outline"
            title="Profile Picture"
            subtitle="Upload a photo or choose an avatar"
            onPress={() => router.push('/(tabs)/profile-picture' as import('expo-router').Href)}
          />
          <ProfileRow
            icon="wallet-outline"
            title="Withdraw Funds"
            subtitle="Cash out when funded or after a request ends"
            onPress={() => router.push('/(tabs)/withdraw-funds')}
            isLast
          />
        </ProfileSection>

        <ProfileSection title="Settings">
          <ProfileRow
            icon="notifications-outline"
            title="Push Notifications"
            showArrow={false}
            showToggle
            toggleValue={pushNotifications}
            onToggleChange={setPushNotifications}
          />
          <ProfileRow
            icon="sync-outline"
            title="Anonymous Mode"
            subtitle="Hides your name, photo, and contact on your profile"
            showArrow={false}
            showToggle
            toggleValue={anonymousMode}
            onToggleChange={async (next) => {
              if (anonToggling) return;
              const token = await getAccessToken();
              if (!token) {
                Alert.alert('Sign in required', 'Please log in again to update privacy.');
                return;
              }
              setAnonToggling(true);
              try {
                await updateProfile(token, { isAnonymous: next });
                setAnonymousMode(next);
                await refreshUser();
              } catch {
                Alert.alert(
                  'Could not update',
                  'We could not update anonymous mode. Check your connection and try again.'
                );
              } finally {
                setAnonToggling(false);
              }
            }}
          />
          <ProfileRow
            icon="card-outline"
            title="Payment Cards"
            subtitle={paymentCardsSubtitle}
            onPress={() => router.push('/(tabs)/payment-cards')}
          />
          <ProfileRow
            icon="lock-closed-outline"
            title="Security"
            subtitle="Password & authentication"
            onPress={() => router.push('/(tabs)/security-settings')}
          />
          <ProfileRow
            icon="settings-outline"
            title="Account Settings"
            subtitle="Preferences"
            onPress={() => router.push('/(tabs)/account-settings')}
            isLast
          />
        </ProfileSection>

        <ProfileSection title="Support">
          <ProfileRow
            icon="help-circle-outline"
            title="Help Center"
            subtitle="FAQ and support"
            onPress={() => router.push('/(tabs)/support' as import('expo-router').Href)}
          />
          <ProfileRow
            icon="document-text-outline"
            title="Terms & Privacy"
            subtitle="Terms of Service and Privacy Policy"
            onPress={() => router.push('/(tabs)/legal' as import('expo-router').Href)}
            isLast
          />
        </ProfileSection>

        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
          onPress={() => router.push('/(tabs)/logout' as import('expo-router').Href)}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Ionicons name="log-out-outline" size={22} color="#DC2626" />
          <Text style={styles.logoutText}>Log Out</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </Pressable>

        <Text style={styles.version}>Plz v1.0.0</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  pressed: {
    opacity: 0.8,
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 12,
  },
  version: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
