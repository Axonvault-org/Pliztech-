import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/Text';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { logoutOtherSessions } from '@/lib/api/sessions';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { withUnauthorizedRecovery } from '@/lib/auth/session-expired';
import { useCurrentUser } from '@/contexts/CurrentUserContext';

const ACCENT_BLUE = '#2E8BEA';
const SECURITY_GREEN = '#22C55E';
const WARNING_ORANGE = '#F59E0B';
const BORDER_GRAY = '#E5E7EB';
const ICON_BG = '#DBEAFE';
const SECTION_TITLE = '#6B7280';

function SecurityBanner() {
  return (
    <View style={styles.securityBanner}>
      <View style={styles.shieldIcon}>
        <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
      </View>
      <View style={styles.bannerText}>
        <View style={styles.bannerTitleRow}>
          <Text style={styles.bannerTitle}>Good Security</Text>
          <View style={styles.statusDot} />
        </View>
        <Text style={styles.bannerSubtitle}>Your account is well protected</Text>
      </View>
    </View>
  );
}

function SecuritySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function SecurityRow({
  icon,
  title,
  subtitle,
  onPress,
  showToggle,
  toggleValue,
  onToggleChange,
  badge,
  disabled,
  iconBgColor,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showToggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  badge?: string;
  disabled?: boolean;
  iconBgColor?: string;
  isLast?: boolean;
}) {
  const content = (
    <>
      <View style={[styles.rowIcon, { backgroundColor: iconBgColor ?? ICON_BG }]}>
        <Ionicons name={icon} size={20} color="#FFFFFF" />
      </View>
      <View style={styles.rowText}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle}>{title}</Text>
          {badge ? (
            <View style={badge === 'Current' ? styles.currentBadge : styles.comingSoonBadge}>
              <Text
                style={
                  badge === 'Current'
                    ? styles.currentBadgeText
                    : styles.comingSoonBadgeText
                }
              >
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {showToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggleChange}
          disabled={disabled}
          trackColor={{ false: '#E5E7EB', true: ACCENT_BLUE }}
          thumbColor="#FFFFFF"
        />
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      ) : null}
    </>
  );

  const rowStyle = [styles.row, isLast && styles.rowLast];

  if (onPress && !showToggle && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...rowStyle, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={rowStyle}>{content}</View>;
}

function SecurityTipsBanner() {
  const tips = [
    'Never share your password or PIN with anyone',
    'Plz will never ask for your password via email',
    'Enable 2FA for extra protection',
  ];
  return (
    <View style={styles.tipsBanner}>
      <Ionicons name="warning" size={24} color={WARNING_ORANGE} style={styles.tipsIcon} />
      <View style={styles.tipsList}>
        {tips.map((tip, i) => (
          <Text key={i} style={styles.tipItem}>
            • {tip}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function SecuritySettingsScreen() {
  const { signOut } = useCurrentUser();
  const [loggingOutOthers, setLoggingOutOthers] = useState(false);

  const handleChangePassword = () => {
    router.push('/(tabs)/change-password');
  };

  const handleLogoutOthers = () => {
    if (loggingOutOthers) return;
    Alert.alert(
      'Log out other devices?',
      'This keeps you signed in here and ends active sessions on your other devices.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setLoggingOutOthers(true);
              try {
                const result = await withUnauthorizedRecovery(signOut, (token) =>
                  logoutOtherSessions(token)
                );
                Alert.alert(
                  'Other devices logged out',
                  result.sessionsLoggedOut > 0
                    ? `${result.sessionsLoggedOut} session${
                        result.sessionsLoggedOut === 1 ? '' : 's'
                      } ended.`
                    : 'No other active sessions were found.'
                );
              } catch (e) {
                Alert.alert('Could not log out devices', formatPlizApiErrorForUser(e));
              } finally {
                setLoggingOutOthers(false);
              }
            })();
          },
        },
      ]
    );
  };

  return (
    <Screen backgroundColor="#F9FAFB" scrollable>
      <AppHeaderTitleRow title="Security Settings" />

      <SecurityBanner />

      <SecuritySection title="Password & Authentication">
        <SecurityRow
          icon="lock-closed"
          title="Change Password"
          subtitle="Update your account password"
          onPress={handleChangePassword}
          isLast={false}
        />
        <SecurityRow
          icon="phone-portrait"
          title="Two-Factor Authentication"
          subtitle="Add extra security to your account"
          badge="Coming soon"
          showToggle
          toggleValue={false}
          onToggleChange={undefined}
          disabled
          isLast={false}
        />
        <SecurityRow
          icon="finger-print"
          title="Biometric Login"
          subtitle="Use fingerprint or face ID"
          badge="Coming soon"
          showToggle
          toggleValue={false}
          onToggleChange={undefined}
          disabled
          isLast
        />
      </SecuritySection>

      <SecuritySection title="Transaction Security">
        <SecurityRow
          icon="key"
          title="Transaction PIN"
          subtitle="4-digit PIN for donations"
          badge="Coming soon"
          disabled
          isLast
        />
      </SecuritySection>

      <SecuritySection title="Active Sessions">
        <SecurityRow
          icon="phone-portrait"
          title="This Device"
          subtitle="Abuja, Nigeria • Active now"
          badge="Current"
          iconBgColor={SECURITY_GREEN}
          isLast={false}
        />
        <Pressable
          style={({ pressed }) => [
            styles.logoutLink,
            pressed && !loggingOutOthers && styles.pressed,
            loggingOutOthers && styles.logoutLinkDisabled,
          ]}
          onPress={handleLogoutOthers}
          disabled={loggingOutOthers}
          accessibilityRole="button"
          accessibilityLabel="Log out of all other devices"
        >
          <View style={styles.logoutLinkRow}>
            <Text style={styles.logoutLinkText}>
              {loggingOutOthers ? 'Logging out other devices...' : 'Log out of all other devices'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </Pressable>
      </SecuritySection>

      <SecurityTipsBanner />
    </Screen>
  );
}

const styles = StyleSheet.create({
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  shieldIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SECURITY_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SECURITY_GREEN,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#15803D',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: SECTION_TITLE,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  pressed: {
    opacity: 0.7,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  currentBadge: {
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  comingSoonBadge: {
    borderRadius: 999,
    backgroundColor: '#EEF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  comingSoonBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: ACCENT_BLUE,
  },
  logoutLink: {
    paddingVertical: 14,
  },
  logoutLinkDisabled: {
    opacity: 0.88,
  },
  logoutLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  logoutLinkText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
  tipsBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipsIcon: {
    marginRight: 12,
  },
  tipsList: {
    flex: 1,
  },
  tipItem: {
    fontSize: 14,
    color: '#B45309',
    marginBottom: 4,
    lineHeight: 20,
  },
});
