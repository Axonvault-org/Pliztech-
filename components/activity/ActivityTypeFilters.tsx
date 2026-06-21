import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

const HEADING = '#1F2937';
const BODY = '#6B7280';

export type ActivityType = 'requests' | 'giving' | 'stories';

export interface ActivityTypeFiltersProps {
  activeTab: ActivityType;
  onTabChange: (tab: ActivityType) => void;
  showStoriesDot?: boolean;
}

const TABS: { id: ActivityType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'requests', label: 'Requests', icon: 'time-outline' },
  { id: 'giving', label: 'Giving', icon: 'heart-outline' },
  { id: 'stories', label: 'Stories', icon: 'chatbubble-outline' },
];

export function ActivityTypeFilters({
  activeTab,
  onTabChange,
  showStoriesDot = false,
}: ActivityTypeFiltersProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isSelected = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            style={[styles.tab, isSelected && styles.tabSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={isSelected ? HEADING : BODY}
              style={styles.icon}
            />
            <View style={styles.labelWrap}>
              <Text style={[styles.label, isSelected && styles.labelSelected]}>{tab.label}</Text>
              {tab.id === 'stories' && showStoriesDot ? <View style={styles.unseenDot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#EFF2F9',
    borderRadius: 15,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tabSelected: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    color: BODY,
    fontWeight: '500',
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelSelected: {
    color: HEADING,
  },
  unseenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginLeft: 5,
    marginTop: -8,
  },
});
