import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { getBlockedUsers, unblockUser, type BlockedUserRow } from '@/lib/api/blocks';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { withUnauthorizedRecovery } from '@/lib/auth/session-expired';

function displayBlockedName(row: BlockedUserRow): string {
  return (
    row.displayName?.trim() ||
    [row.firstName, row.lastName].filter(Boolean).join(' ').trim() ||
    row.username
  );
}

export default function BlockedUsersScreen() {
  const { signOut } = useCurrentUser();
  const [rows, setRows] = useState<BlockedUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await withUnauthorizedRecovery(signOut, (token) => getBlockedUsers(token));
      setRows(result.blockedUsers);
    } catch (e) {
      Alert.alert('Could not load blocked users', formatPlizApiErrorForUser(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  const onUnblock = (row: BlockedUserRow) => {
    Alert.alert('Unblock user?', `${displayBlockedName(row)} will be able to interact with you again.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: () =>
          void (async () => {
            try {
              await withUnauthorizedRecovery(signOut, (token) => unblockUser(token, row.id));
              setRows((prev) => prev.filter((item) => item.id !== row.id));
            } catch (e) {
              Alert.alert('Could not unblock', formatPlizApiErrorForUser(e));
            }
          })(),
      },
    ]);
  };

  return (
    <Screen backgroundColor="#F9FAFB" scrollable>
      <AppHeaderTitleRow title="Blocked users" backIconColor="#9CA3AF" />
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#2E8BEA" style={styles.loader} />
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>You have not blocked anyone.</Text>
        ) : (
          rows.map((row) => (
            <View key={row.id} style={styles.row}>
              <View style={styles.copy}>
                <Text style={styles.name}>{displayBlockedName(row)}</Text>
                <Text style={styles.meta}>@{row.username}</Text>
              </View>
              <Pressable style={styles.unblockBtn} onPress={() => onUnblock(row)}>
                <Text style={styles.unblockText}>Unblock</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32, gap: 10 },
  loader: { marginTop: 40 },
  empty: { color: '#6B7280', fontSize: 15, marginTop: 24, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    gap: 12,
  },
  copy: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  unblockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  unblockText: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
});
