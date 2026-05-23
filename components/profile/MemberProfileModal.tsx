import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileSummaryCard } from '@/components/profile/ProfileSummaryCard';
import { Text } from '@/components/Text';
import {
  avatarColorFromSeed,
  displayRoleLabel,
  initialsFromDisplayName,
  useCurrentUser,
} from '@/contexts/CurrentUserContext';
import { getPublicMemberProfile, type PublicMemberProfile } from '@/lib/api/users';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { getAccessToken } from '@/lib/auth/access-token';
import {
  isUnauthorizedSessionError,
  recoverFromUnauthorized,
} from '@/lib/auth/session-expired';

function formatLocation(city?: string, state?: string): string | null {
  const parts = [city?.trim(), state?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export type MemberProfileModalProps = {
  visible: boolean;
  userId: string | null;
  onClose: () => void;
};

export function MemberProfileModal({ visible, userId, onClose }: MemberProfileModalProps) {
  const insets = useSafeAreaInsets();
  const { signOut } = useCurrentUser();
  const [profile, setProfile] = useState<PublicMemberProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (retryAfterRefresh = false) => {
      if (!userId || !visible) return;

      setLoading(true);
      setError(null);
      try {
        const token = await getAccessToken();
        if (!token) {
          setError('Sign in to view member profiles.');
          setProfile(null);
          return;
        }
        const data = await getPublicMemberProfile(token, userId);
        setProfile(data);
      } catch (e) {
        if (isUnauthorizedSessionError(e) && !retryAfterRefresh) {
          const recovered = await recoverFromUnauthorized(signOut);
          if (recovered) {
            await load(true);
            return;
          }
        }
        setProfile(null);
        setError(formatPlizApiErrorForUser(e));
      } finally {
        setLoading(false);
      }
    },
    [userId, visible, signOut]
  );

  useEffect(() => {
    if (visible && userId) {
      setProfile(null);
      void load();
    }
  }, [visible, userId, load]);

  const location = profile ? formatLocation(profile.city, profile.state) : null;
  const roleLabel =
    profile && profile.stats.totalDonated > 0 ? 'Community Supporter' : 'Beginner';
  const adminRole =
    profile && (profile.role === 'admin' || profile.role === 'superadmin')
      ? displayRoleLabel(profile.role)
      : roleLabel;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close profile" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.handleRow}>
          <View style={styles.handle} />
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color="#6B7280" />
          </Pressable>
        </View>

        <Text style={styles.title}>Member Profile</Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#2E8BEA" />
            </View>
          ) : null}

          {error && !loading ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => void load()} style={styles.retryBtn}>
                <Text style={styles.retryLabel}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {profile && !loading ? (
            <>
              <ProfileSummaryCard
                fullName={profile.fullName}
                email=""
                emailVerified
                govIdVerified={profile.isVerified}
                roleLabel={adminRole}
                avatarColor={
                  profile.avatar.avatarColor ?? avatarColorFromSeed(profile.id)
                }
                avatarUrl={profile.avatar.displayUrl}
                initials={initialsFromDisplayName(profile.fullName)}
                given={Math.round(profile.stats.totalDonated)}
                helped={profile.stats.peopleHelped}
                requests={profile.stats.requestsCount}
              />
              {location ? (
                <View style={styles.locationCard}>
                  <Text style={styles.locationLabel}>Location</Text>
                  <Text style={styles.locationValue}>{location}</Text>
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handleRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    top: 4,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#B91C1C',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  retryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E8BEA',
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
});
