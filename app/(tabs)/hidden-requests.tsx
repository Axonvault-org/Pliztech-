import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { getHiddenBegs, unhideBeg, type HiddenBegRow } from '@/lib/api/beg';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { withUnauthorizedRecovery } from '@/lib/auth/session-expired';

export default function HiddenRequestsScreen() {
  const { signOut } = useCurrentUser();
  const [rows, setRows] = useState<HiddenBegRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await withUnauthorizedRecovery(signOut, (token) => getHiddenBegs(token));
      setRows(result.hiddenBegs);
    } catch (e) {
      Alert.alert('Could not load hidden requests', formatPlizApiErrorForUser(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  const onUnhide = (row: HiddenBegRow) => {
    Alert.alert('Show in feed again?', 'This request will reappear in your browse feed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unhide',
        onPress: () =>
          void (async () => {
            try {
              await withUnauthorizedRecovery(signOut, (token) => unhideBeg(token, row.id));
              setRows((prev) => prev.filter((item) => item.id !== row.id));
            } catch (e) {
              Alert.alert('Could not unhide', formatPlizApiErrorForUser(e));
            }
          })(),
      },
    ]);
  };

  return (
    <Screen backgroundColor="#F9FAFB" scrollable>
      <AppHeaderTitleRow title="Hidden requests" backIconColor="#9CA3AF" />
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#2E8BEA" style={styles.loader} />
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>No hidden requests.</Text>
        ) : (
          rows.map((row) => (
            <View key={row.id} style={styles.row}>
              <Pressable
                style={styles.copy}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/request/[id]',
                    params: { id: row.id },
                  })
                }
              >
                <Text style={styles.title} numberOfLines={2}>
                  {row.description}
                </Text>
                <Text style={styles.meta}>
                  {row.category.name} · ₦{Math.round(row.amountRaised).toLocaleString()} raised
                </Text>
              </Pressable>
              <Pressable style={styles.unhideBtn} onPress={() => onUnhide(row)}>
                <Text style={styles.unhideText}>Unhide</Text>
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
  title: { fontSize: 14, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  unhideBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  unhideText: { fontSize: 13, fontWeight: '600', color: '#1D4ED8' },
});
