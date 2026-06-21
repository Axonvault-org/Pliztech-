import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/Text';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { NigerianStatePicker } from '@/components/form/NigerianStatePicker';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { NIGERIAN_STATES } from '@/constants/nigerian-states';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { updateProfile } from '@/lib/api/profile';
import { formatPlizApiErrorForUser, type UpdateProfileBody } from '@/lib/api/types';
import { withUnauthorizedRecovery } from '@/lib/auth/session-expired';

const BORDER_GRAY = '#E5E7EB';
const LABEL_GRAY = '#6B7280';
const VALUE_DARK = '#1F2937';
const INPUT_BG = '#F9FAFB';

function EditField({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  editable = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Ionicons name={icon} size={18} color={LABEL_GRAY} style={styles.fieldIcon} />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      {editable ? (
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      ) : (
        <View style={[styles.input, styles.readOnlyBox]}>
          <Text style={styles.readOnlyText}>{value || '—'}</Text>
          <Text style={styles.readOnlyHint}>Contact support to change your email.</Text>
        </View>
      )}
    </View>
  );
}

export default function EditPersonalInfoScreen() {
  const { user, isLoading, refreshUser, signOut } = useCurrentUser();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [stateValue, setStateValue] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.profile) return;
    setFirstName(user.profile.firstName?.trim() ?? '');
    setLastName(user.profile.lastName?.trim() ?? '');
    setPhoneNumber(user.profile.phoneNumber?.trim() ?? '');
    setStateValue(user.profile.state?.trim() ?? '');
    setCity(user.profile.city?.trim() ?? '');
    setAddress(user.profile.address?.trim() ?? '');
  }, [user?.profile]);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    const fn = firstName.trim();
    const ln = lastName.trim();
    const phone = phoneNumber.trim();
    const profileState = stateValue.trim();
    const profileCity = city.trim();
    const profileAddress = address.trim();

    if (fn.length < 2) {
      Alert.alert('Check first name', 'First name must be at least 2 characters.');
      return;
    }
    if (ln.length < 2) {
      Alert.alert('Check last name', 'Last name must be at least 2 characters.');
      return;
    }
    if (phone.length > 0 && !/^\+?[1-9]\d{1,14}$/.test(phone.replace(/\s/g, ''))) {
      Alert.alert(
        'Invalid phone',
        'Use international format, e.g. +2348012345678 (digits only after +).'
      );
      return;
    }
    if (!(NIGERIAN_STATES as readonly string[]).includes(profileState)) {
      Alert.alert('Check state', 'Select a valid Nigerian state.');
      return;
    }
    if (profileCity.length < 2) {
      Alert.alert('Check city', 'City must be at least 2 characters.');
      return;
    }

    setSaving(true);
    try {
      const body: UpdateProfileBody = {
        firstName: fn,
        lastName: ln,
        state: profileState,
        city: profileCity,
        address: profileAddress || null,
      };
      const normalizedPhone = phone.replace(/\s/g, '');
      if (normalizedPhone) {
        body.phoneNumber = normalizedPhone;
      }

      await withUnauthorizedRecovery(signOut, (token) => updateProfile(token, body));
      await refreshUser();
      router.back();
    } catch (e) {
      const message = formatPlizApiErrorForUser(e);
      setSaveError(message);
      Alert.alert('Could not save', message);
    } finally {
      setSaving(false);
    }
  }, [address, city, firstName, lastName, phoneNumber, refreshUser, signOut, stateValue]);

  if (isLoading && !user) {
    return (
      <Screen backgroundColor="#FFFFFF">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2E8BEA" />
        </View>
      </Screen>
    );
  }

  if (!user?.profile) {
    return (
      <Screen backgroundColor="#FFFFFF" scrollable>
        <AppHeaderTitleRow title="Personal information" marginBottom={24} />
        <Text style={styles.missingProfile}>
          Complete your profile first before editing these details.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="#FFFFFF" scrollable>
      <AppHeaderTitleRow title="Personal information" marginBottom={24} />

      <EditField
        icon="person-outline"
        label="First name"
        value={firstName}
        onChangeText={(value) => {
          setSaveError(null);
          setFirstName(value);
        }}
        placeholder="First name"
        autoCapitalize="words"
      />
      <EditField
        icon="person-outline"
        label="Last name"
        value={lastName}
        onChangeText={(value) => {
          setSaveError(null);
          setLastName(value);
        }}
        placeholder="Last name"
        autoCapitalize="words"
      />
      <EditField
        icon="mail-outline"
        label="Email"
        value={user.email}
        editable={false}
      />
      <EditField
        icon="call-outline"
        label="Phone number"
        value={phoneNumber}
        onChangeText={(value) => {
          setSaveError(null);
          setPhoneNumber(value);
        }}
        placeholder="+2348012345678"
        keyboardType="phone-pad"
      />
      <NigerianStatePicker
        label="State"
        value={stateValue}
        onChange={(value) => {
          setSaveError(null);
          setStateValue(value);
        }}
        placeholder="Tap to select state"
      />
      <EditField
        icon="location-outline"
        label="City"
        value={city}
        onChangeText={(value) => {
          setSaveError(null);
          setCity(value);
        }}
        placeholder="Ikeja"
        autoCapitalize="words"
      />
      <EditField
        icon="home-outline"
        label="Address"
        value={address}
        onChangeText={(value) => {
          setSaveError(null);
          setAddress(value);
        }}
        placeholder="Street address (optional)"
        autoCapitalize="words"
      />

      {saveError ? (
        <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle-outline" size={18} color="#B42318" />
          <Text style={styles.errorText}>{saveError}</Text>
        </View>
      ) : null}

      <PrimaryButton
        label={saving ? 'Saving…' : 'Save Changes'}
        onPress={() => void handleSave()}
        variant="gradient"
        disabled={saving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 20,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldIcon: {
    marginRight: 8,
  },
  fieldLabel: {
    fontSize: 14,
    color: LABEL_GRAY,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: VALUE_DARK,
  },
  readOnlyBox: {
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 16,
    fontWeight: '600',
    color: VALUE_DARK,
  },
  readOnlyHint: {
    fontSize: 12,
    color: LABEL_GRAY,
    marginTop: 6,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  missingProfile: {
    fontSize: 15,
    color: LABEL_GRAY,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3F2',
    borderWidth: 1,
    borderColor: '#FDA29B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#B42318',
    fontWeight: '600',
  },
});
