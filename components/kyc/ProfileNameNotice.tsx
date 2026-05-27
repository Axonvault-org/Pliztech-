import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { displayFullName, useCurrentUser } from '@/contexts/CurrentUserContext';

type ProfileNameNoticeProps = {
  documentLabel?: 'NIN';
};

/**
 * Reminds users that profile names must match their NIN before Prembly verification.
 */
export function ProfileNameNotice({ documentLabel = 'NIN' }: ProfileNameNoticeProps) {
  const { user } = useCurrentUser();
  const firstName = user?.profile?.firstName?.trim();
  const lastName = user?.profile?.lastName?.trim();
  const fullName = displayFullName(user);

  if (!firstName || !lastName) {
    return (
      <View style={styles.banner}>
        <Ionicons name="alert-circle-outline" size={18} color="#B45309" />
        <View style={styles.copy}>
          <Text style={styles.title}>Complete your profile first</Text>
          <Text style={styles.body}>
            Add your legal first and last name — they must match your {documentLabel}.
          </Text>
          <Pressable onPress={() => router.push('/(tabs)/personal-info')}>
            <Text style={styles.link}>Go to personal information →</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
      <View style={styles.copy}>
        <Text style={styles.title}>Name must match your {documentLabel}</Text>
        <Text style={styles.body}>
          We verify <Text style={styles.emphasis}>{fullName}</Text> against government records.
          Update your profile if this is not exactly as it appears on your {documentLabel}.
        </Text>
        <Pressable onPress={() => router.push('/(tabs)/edit-personal-info')}>
          <Text style={styles.link}>Edit name in profile →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 14,
    marginBottom: 20,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: '#1E40AF',
    marginBottom: 6,
  },
  emphasis: {
    fontWeight: '700',
    color: '#1E3A8A',
  },
  link: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
});
