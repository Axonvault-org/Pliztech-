import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

import { RequestCard } from './RequestCard';

import type { TrendingRequest } from '@/lib/types/home';

const HEADING = '#1F2937';
const BRAND_BLUE = '#2E8BEA';

export interface TrendingRequestsProps {
  requests: readonly TrendingRequest[];
  loading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  onSeeAll: () => void;
  onRequestMenuPress?: (request: TrendingRequest) => void;
}

export function TrendingRequests({
  requests,
  loading = false,
  errorMessage = null,
  onRetry,
  onSeeAll,
  onRequestMenuPress,
}: TrendingRequestsProps) {
  const showEmpty = !loading && !errorMessage && requests.length === 0;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Trending Requests</Text>
        <Pressable
          onPress={onSeeAll}
          style={styles.seeAll}
          accessibilityLabel="See all requests"
          accessibilityRole="button"
        >
          <Text style={styles.seeAllText}>See all →</Text>
        </Pressable>
      </View>

      {loading && requests.length === 0 ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="small" color={BRAND_BLUE} />
          <Text style={styles.stateHint}>Loading requests…</Text>
        </View>
      ) : null}

      {errorMessage && requests.length === 0 ? (
        <Pressable
          onPress={onRetry}
          disabled={!onRetry}
          style={styles.errorBox}
          accessibilityRole={onRetry ? 'button' : 'text'}
          accessibilityLabel={onRetry ? 'Retry loading trending requests' : undefined}
        >
          <Text style={styles.errorText}>{errorMessage}</Text>
          {onRetry ? <Text style={styles.retryText}>Tap to retry</Text> : null}
        </Pressable>
      ) : null}

      {showEmpty ? (
        <Text style={styles.stateHint}>No active requests to show yet.</Text>
      ) : null}

      <View style={styles.listContent}>
        {requests.map((item) => (
          <RequestCard
            key={item.id}
            request={item}
            onMenuPress={
              onRequestMenuPress && item.ownerUserId
                ? () => onRequestMenuPress(item)
                : undefined
            }
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: HEADING,
  },
  seeAll: {
    padding: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND_BLUE,
  },
  listContent: {
    paddingBottom: 8,
  },
  stateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  stateHint: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    color: '#B91C1C',
  },
  retryText: {
    fontSize: 13,
    color: BRAND_BLUE,
    marginTop: 6,
    fontWeight: '600',
  },
});
