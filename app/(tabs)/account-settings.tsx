import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/Text';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';

const ACCENT_BLUE = '#2E8BEA';
const BORDER_GRAY = '#E5E7EB';
const ICON_BG = '#DBEAFE';
const DESTRUCTIVE_RED = '#DC2626';
const SECTION_TITLE = '#6B7280';

function SettingsSection({
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

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  showToggle,
  toggleValue,
  onToggleChange,
  destructive,
  isLast,
  badge,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showToggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  destructive?: boolean;
  isLast?: boolean;
  badge?: string;
  disabled?: boolean;
}) {
  const iconBg = destructive ? DESTRUCTIVE_RED : ICON_BG;
  const titleColor = destructive ? DESTRUCTIVE_RED : '#1F2937';

  const content = (
    <>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color="#FFFFFF" />
      </View>
      <View style={styles.rowText}>
        <View style={styles.rowTitleLine}>
          <Text style={[styles.rowTitle, { color: titleColor }]}>{title}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
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

export default function AccountSettingsScreen() {
  const handleLanguage = () => {
    Alert.alert(
      'Language',
      'Additional languages will be available in a future update. The app currently follows your device language where supported.'
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export my data',
      'A full data export is processed on the server. Contact support from your profile email with the subject “Data export” and we will send your package when the export API is enabled for your account.'
    );
  };

  const handleDeleteAccount = () => {
    router.push('/(tabs)/delete-account' as import('expo-router').Href);
  };

  return (
    <Screen backgroundColor="#F9FAFB" scrollable>
      <AppHeaderTitleRow title="Account Settings" />

      <SettingsSection title="Preferences">
        <SettingsRow
          icon="globe-outline"
          title="Language"
          badge="Coming soon"
          onPress={handleLanguage}
          isLast={false}
        />
        <SettingsRow
          icon="moon-outline"
          title="Dark Mode"
          subtitle="A full app theme is coming soon"
          badge="Coming soon"
          showToggle
          toggleValue={false}
          onToggleChange={undefined}
          disabled
          isLast
        />
      </SettingsSection>

      <SettingsSection title="Notification Preferences">
        <SettingsRow
          icon="mail-outline"
          title="Email Notifications"
          subtitle="Receive updates via email"
          badge="Coming soon"
          showToggle
          toggleValue={false}
          onToggleChange={undefined}
          disabled
          isLast={false}
        />
        <SettingsRow
          icon="call-outline"
          title="SMS Notifications"
          subtitle="Get text message alerts"
          badge="Coming soon"
          showToggle
          toggleValue={false}
          onToggleChange={undefined}
          disabled
          isLast
        />
      </SettingsSection>

      <SettingsSection title="Data & Privacy">
        <SettingsRow
          icon="download-outline"
          title="Export My Data"
          subtitle="Download a copy of your data"
          badge="Coming soon"
          onPress={handleExportData}
          isLast={false}
        />
        <SettingsRow
          icon="trash-outline"
          title="Delete Account"
          subtitle="Permanently delete your account and sign out"
          onPress={handleDeleteAccount}
          destructive
          isLast
        />
      </SettingsSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  },
  badge: {
    borderRadius: 999,
    backgroundColor: '#EEF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: ACCENT_BLUE,
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
});
