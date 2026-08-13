import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components/Text';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { ReportContentSheet, type ReportTarget } from '@/components/safety/ReportContentSheet';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { useStoryIndicator } from '@/contexts/StoryIndicatorContext';
import { reportStory } from '@/lib/api/reports';
import { getStoriesFeed, type StoryItem } from '@/lib/api/stories';
import { formatPlizApiErrorForUser, PlizApiError } from '@/lib/api/types';
import { withUnauthorizedRecovery } from '@/lib/auth/session-expired';

function formatStoryDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function StoriesFeedScreen() {
  const { signOut } = useCurrentUser();
  const { markStoriesSeen } = useStoryIndicator();
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await withUnauthorizedRecovery(signOut, (token) =>
        getStoriesFeed(token, { page: 1, limit: 30 })
      );
      setStories(res.stories);
    } catch (e) {
      setError(
        e instanceof PlizApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not load stories'
      );
      setStories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void markStoriesSeen();
  }, [markStoriesSeen]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  return (
    <Screen backgroundColor="#F9FAFB" scrollable={false}>
      <AppHeaderTitleRow
        title="Community stories"
        marginBottom={12}
        trailingActions={
          <Pressable
            onPress={() => router.push('/(tabs)/share-story' as import('expo-router').Href)}
            style={styles.writeBtn}
            accessibilityLabel="Write a story"
            accessibilityRole="button"
          >
            <Ionicons name="create-outline" size={22} color="#2E8BEA" />
          </Pressable>
        }
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2E8BEA" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E8BEA" />
          }
        >
          <Pressable
            onPress={() => router.push('/(tabs)/share-story' as import('expo-router').Href)}
            style={styles.testimonyCard}
            accessibilityRole="button"
            accessibilityLabel="Add your testimony"
          >
            <View style={styles.testimonyIcon}>
              <Ionicons name="sparkles" size={20} color="#2E8BEA" />
            </View>
            <View style={styles.testimonyCopy}>
              <Text style={styles.testimonyTitle}>Add your testimony</Text>
              <Text style={styles.testimonySubtitle}>
                Share how Plz helped you or someone you supported.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </Pressable>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {!error && stories.length === 0 ? (
            <Text style={styles.empty}>No stories yet. Be the first to share yours.</Text>
          ) : null}
          {stories.map((s) => (
            <View key={s.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.storyBody}>{s.content}</Text>
                <Pressable
                  onPress={() => {
                    setReportTarget({
                      type: 'story',
                      id: s.id,
                      label: s.content.slice(0, 80),
                    });
                    setReportVisible(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Report story"
                >
                  <Ionicons name="flag-outline" size={18} color="#9CA3AF" />
                </Pressable>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaAuthor}>
                  {s.user?.isAnonymous ? 'Anonymous' : s.user?.username ?? 'Member'}
                </Text>
                <Text style={styles.metaDate}>{formatStoryDate(s.createdAt)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      <ReportContentSheet
        visible={reportVisible}
        target={reportTarget}
        onClose={() => {
          setReportVisible(false);
          setReportTarget(null);
        }}
        onSubmit={async (body) => {
          if (!reportTarget || reportTarget.type !== 'story') return;
          await withUnauthorizedRecovery(signOut, (token) =>
            reportStory(token, reportTarget.id, body)
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  writeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  empty: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 24,
  },
  testimonyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  testimonyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testimonyCopy: {
    flex: 1,
    minWidth: 0,
  },
  testimonyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  testimonySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  storyBody: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E8BEA',
  },
  metaDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
