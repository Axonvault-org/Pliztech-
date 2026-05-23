import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import {
  getProfilePicture,
  getProfilePictureOptions,
  removeProfilePicture,
  setInitialsAvatar,
  setLibraryAvatar,
  uploadProfilePicture,
  type ProfilePicture,
  type ProfilePictureOptions,
} from '@/lib/api/profile-picture';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { getAccessToken } from '@/lib/auth/access-token';
import { withUnauthorizedRecovery } from '@/lib/auth/session-expired';

function mimeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

export default function ProfilePictureScreen() {
  const { refreshUser, signOut } = useCurrentUser();
  const [picture, setPicture] = useState<ProfilePicture | null>(null);
  const [options, setOptions] = useState<ProfilePictureOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [avatar, avatarOptions] = await Promise.all([
        getProfilePicture(token),
        getProfilePictureOptions(token),
      ]);
      setPicture(avatar);
      setOptions(avatarOptions);
    } catch (e) {
      Alert.alert('Could not load avatar', formatPlizApiErrorForUser(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const applyPicture = async (updated: ProfilePicture) => {
    setPicture(updated);
    await refreshUser();
  };

  const choosePhoto = async () => {
    if (saving) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to upload a profile picture.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    setSaving(true);
    try {
      const updated = await withUnauthorizedRecovery(signOut, (token) =>
        uploadProfilePicture(token, {
          uri: asset.uri,
          name: asset.fileName ?? `avatar-${Date.now()}.jpg`,
          type: asset.mimeType ?? mimeFromUri(asset.uri),
        })
      );
      await applyPicture(updated);
      Alert.alert('Profile picture updated', 'Your new photo is now on your profile.');
    } catch (e) {
      Alert.alert('Could not upload', formatPlizApiErrorForUser(e));
    } finally {
      setSaving(false);
    }
  };

  const chooseColor = async (color: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await applyPicture(
        await withUnauthorizedRecovery(signOut, (token) => setInitialsAvatar(token, color))
      );
    } catch (e) {
      Alert.alert('Could not update avatar', formatPlizApiErrorForUser(e));
    } finally {
      setSaving(false);
    }
  };

  const chooseLibraryAvatar = async (avatarId: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await applyPicture(
        await withUnauthorizedRecovery(signOut, (token) => setLibraryAvatar(token, avatarId))
      );
    } catch (e) {
      Alert.alert('Could not update avatar', formatPlizApiErrorForUser(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await applyPicture(
        await withUnauthorizedRecovery(signOut, (token) => removeProfilePicture(token))
      );
    } catch (e) {
      Alert.alert('Could not remove photo', formatPlizApiErrorForUser(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen backgroundColor="#F9FAFB" scrollable>
      <AppHeaderTitleRow title="Profile Picture" backIconColor="#9CA3AF" />
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.previewWrap}>
            <View style={styles.previewRing}>
              <View style={styles.previewImageWrap}>
                {loading ? (
                  <ActivityIndicator size="large" color="#355C7D" />
                ) : picture?.displayUrl ? (
                  <Image source={{ uri: picture.displayUrl }} style={styles.previewImage} contentFit="cover" />
                ) : (
                  <Ionicons name="person" size={48} color="#FFFFFF" />
                )}
              </View>
            </View>
            <Pressable
              style={[styles.cameraFab, saving && styles.disabled]}
              onPress={() => void choosePhoto()}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Upload profile photo"
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
          <Text style={styles.heroTitle}>Set your profile picture</Text>
          <Text style={styles.heroSubtitle}>
            Upload a clear photo, choose an avatar, or keep your initials.
          </Text>
          <View style={styles.heroActions}>
            <Pressable
              style={[styles.primaryButton, saving && styles.disabled]}
              onPress={() => void choosePhoto()}
              disabled={saving}
              accessibilityRole="button"
            >
              <Ionicons name="image-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Choose photo</Text>
            </Pressable>
            {picture?.avatarType === 'photo' ? (
              <Pressable
                style={[styles.secondaryButton, saving && styles.disabled]}
                onPress={() => void remove()}
                disabled={saving}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Choose an avatar</Text>
            <Text style={styles.sectionHint}>Illustrated options</Text>
          </View>
          <View style={styles.avatarGrid}>
            {(options?.libraryAvatars ?? []).map((avatar) => (
              <Pressable
                key={avatar.id}
                onPress={() => void chooseLibraryAvatar(avatar.id)}
                style={[
                  styles.avatarOption,
                  picture?.avatarLibraryId === avatar.id && styles.selectedOption,
                ]}
              >
                <Image source={{ uri: avatar.url }} style={styles.avatarOptionImage} contentFit="cover" />
                {picture?.avatarLibraryId === avatar.id ? (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Initials color</Text>
            <Text style={styles.sectionHint}>Fallback avatar</Text>
          </View>
          <View style={styles.colorGrid}>
            {(options?.colors ?? []).map((color) => (
              <Pressable
                key={color}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  picture?.avatarColor === color && styles.selectedOption,
                ]}
                onPress={() => void chooseColor(color)}
                accessibilityRole="button"
                accessibilityState={{ selected: picture?.avatarColor === color }}
              >
                {picture?.avatarColor === color ? (
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
    gap: 14,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewWrap: {
    width: 140,
    height: 140,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRing: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#EEF4F8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D7E4EC',
  },
  previewImageWrap: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: '#355C7D',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  cameraFab: {
    position: 'absolute',
    right: 10,
    bottom: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F67280',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#262626',
    textAlign: 'center',
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    textAlign: 'center',
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 18,
  },
  primaryButton: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#F67280',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
  },
  secondaryButtonText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#262626',
  },
  sectionHint: {
    marginTop: 3,
    fontSize: 13,
    color: '#6B7280',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatarOption: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  selectedBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#355C7D',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedOption: {
    borderColor: '#355C7D',
  },
});
