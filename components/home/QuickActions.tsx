import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

import { ActionCard } from './ActionCard';

const HEADING = '#1F2937';

export interface QuickActionsProps {
  onAskForHelp: () => void;
  onBrowseRequests: () => void;
  onCommunityPulse: () => void;
}

export function QuickActions({
  onAskForHelp,
  onBrowseRequests,
  onCommunityPulse,
}: QuickActionsProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.row}>
        <View style={styles.cardWrap}>
          <ActionCard
            icon="heart"
            title="Ask for Help"
            subtitle="Create Request"
            variant="gradient"
            onPress={onAskForHelp}
          />
        </View>
        <View style={styles.gap} />
        <View style={styles.cardWrap}>
          <ActionCard
            icon="search"
            title="Browse Requests"
            subtitle="Support Others"
            variant="solid"
            onPress={onBrowseRequests}
          />
        </View>
      </View>
      <View style={styles.singleRow}>
        <ActionCard
          icon="pulse-outline"
          title="Community Purse"
          subtitle="Support the shared fund"
          variant="solid"
          onPress={onCommunityPulse}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: HEADING,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  cardWrap: {
    flex: 1,
  },
  gap: {
    width: 12,
  },
  singleRow: {
    marginTop: 12,
  },
});
