import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { useStoryIndicator } from '@/contexts/StoryIndicatorContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BRAND_BLUE = '#2E8BEA';
const TAB_INACTIVE = '#6B7280';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { hasUnseenStories } = useStoryIndicator();
  const routes = state.routes;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {routes.map((route) => {
        const { options } = descriptors[route.key];
        const routeIndex = state.routes.findIndex((r) => r.key === route.key);
        const isFocused = state.index === routeIndex;
        const isCreate = route.name === 'create';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const color = isFocused ? BRAND_BLUE : TAB_INACTIVE;

        if (isCreate) {
          return (
            <View key={route.key} style={styles.tabWrapper}>
              <Pressable
                onPress={onPress}
                style={styles.floatingButton}
                accessibilityRole="button"
                accessibilityLabel={
                  typeof options.tabBarLabel === 'string' ? options.tabBarLabel : route.name
                }
              >
                <Ionicons name="add" size={32} color="#FFFFFF" />
              </Pressable>
            </View>
          );
        }

        const iconName =
          route.name === 'index'
            ? isFocused
              ? 'home'
              : 'home-outline'
            : route.name === 'browse'
              ? 'search-outline'
              : route.name === 'activity'
                ? 'stats-chart-outline'
                : 'person-outline';

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={
              typeof options.tabBarLabel === 'string' ? options.tabBarLabel : route.name
            }
          >
            <View style={styles.iconWrap}>
              <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={24} color={color} />
              {route.name === 'activity' && hasUnseenStories ? (
                <View
                  style={styles.unseenDot}
                  accessibilityLabel="New community story"
                />
              ) : null}
            </View>
            <Text style={[styles.label, { color }]}>{options.title ?? route.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrap: {
    width: 28,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unseenDot: {
    position: 'absolute',
    top: 0,
    right: 1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  tabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Platform.OS === 'ios' ? -24 : -28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});
