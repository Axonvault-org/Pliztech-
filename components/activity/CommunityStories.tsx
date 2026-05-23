import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { router, type Href } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { Text } from '@/components/Text';

import { StoryCard, type StoryCardData } from '@/components/activity/StoryCard';
import { getStoriesFeed, type StoryItem } from '@/lib/api/stories';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { getAccessToken } from '@/lib/auth/access-token';
import {
  isUnauthorizedSessionError,
  recoverFromUnauthorized,
} from '@/lib/auth/session-expired';

const CARD_GUTTER = 8;

function storyItemToCardData(item: StoryItem): StoryCardData {
  const name = item.user.username?.trim() || 'Member';
  const initial =
    name.toLowerCase() === 'anonymous' ? '?' : name.charAt(0).toUpperCase();
  return {
    id: item.id,
    text: item.content,
    authorName: name,
    authorInitial: initial,
    amountReceived: 0,
    role: 'Receiver',
  };
}

export function CommunityStories() {
  const { signOut } = useCurrentUser();
  const { width } = useWindowDimensions();
  const [stories, setStories] = useState<StoryCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<StoryCardData>>(null);

  const load = useCallback(
    async (retryAfterRefresh = false) => {
      setError(null);
      try {
        const token = await getAccessToken();
        if (!token) {
          setStories([]);
          setLoading(false);
          return;
        }
        const res = await getStoriesFeed(token, { page: 1, limit: 20 });
        setStories(res.stories.map(storyItemToCardData));
        setActiveIndex(0);
      } catch (e) {
        if (isUnauthorizedSessionError(e) && !retryAfterRefresh) {
          const recovered = await recoverFromUnauthorized(signOut);
          if (recovered) {
            await load(true);
            return;
          }
        }
        setStories([]);
        setError(e instanceof Error ? formatPlizApiErrorForUser(e) : 'Could not load stories.');
      } finally {
        setLoading(false);
      }
    },
    [signOut]
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const count = stories.length;
  const maxIndex = Math.max(0, count - 1);
  const cardWidth = Math.max(240, width - 48);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (count === 0 || cardWidth <= 0) return;
      const offset = e.nativeEvent.contentOffset.x;
      const index = Math.round(offset / cardWidth);
      setActiveIndex(Math.min(Math.max(0, index), maxIndex));
    },
    [cardWidth, count, maxIndex]
  );

  const goPrev = useCallback(() => {
    if (activeIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: activeIndex - 1,
        animated: true,
      });
    }
  }, [activeIndex]);

  const goNext = useCallback(() => {
    if (activeIndex < maxIndex) {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    }
  }, [activeIndex, maxIndex]);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionIcon}>
            <Ionicons name="sparkles" size={20} color="#2E8BEA" />
          </View>
          <Text style={styles.sectionTitle}>Community Stories</Text>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/share-story' as Href)}
          style={styles.shareStoryBtn}
          accessibilityRole="button"
          accessibilityLabel="Add your testimony"
        >
          <Ionicons name="create-outline" size={17} color="#2E8BEA" />
          <Text style={styles.shareStoryText}>Add testimony</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#2E8BEA" />
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : count === 0 ? (
        <Text style={styles.emptyText}>
          No approved stories yet. Share yours from a funded request or the stories screen.
        </Text>
      ) : (
        <View style={styles.carouselWrap}>
          <FlatList<StoryCardData>
            ref={flatListRef}
            data={stories}
            style={{ width: cardWidth, alignSelf: 'center' }}
            renderItem={({ item }) => (
              <View style={[styles.cardWrap, { width: cardWidth }]}>
                <StoryCard story={item} />
              </View>
            )}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled={false}
            snapToInterval={cardWidth || undefined}
            snapToAlignment="start"
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.carouselContent}
            getItemLayout={(_, index) => ({
              length: cardWidth,
              offset: cardWidth * index,
              index,
            })}
          />

          <View style={styles.controls}>
            <Pressable
              onPress={goPrev}
              style={[styles.arrow, activeIndex === 0 && styles.arrowDisabled]}
              disabled={activeIndex === 0}
              accessibilityLabel="Previous story"
              accessibilityRole="button"
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={activeIndex === 0 ? '#D1D5DB' : '#1F2937'}
              />
            </Pressable>

            <View style={styles.dots}>
              {stories.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === activeIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>

            <Pressable
              onPress={goNext}
              style={[
                styles.arrow,
                activeIndex === maxIndex && styles.arrowDisabled,
              ]}
              disabled={activeIndex === maxIndex}
              accessibilityLabel="Next story"
              accessibilityRole="button"
            >
              <Ionicons
                name="chevron-forward"
                size={24}
                color={activeIndex === maxIndex ? '#D1D5DB' : '#1F2937'}
              />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  shareStoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
  },
  shareStoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E8BEA',
  },
  centered: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#B45309',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  carouselWrap: {
    width: '100%',
  },
  carouselContent: {
    paddingBottom: 20,
  },
  cardWrap: {
    paddingHorizontal: CARD_GUTTER,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  arrowDisabled: {
    opacity: 0.5,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#2E8BEA',
  },
  dotInactive: {
    backgroundColor: '#E5E7EB',
  },
});
