import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { HeaderNotificationButton } from '@/components/home/HeaderNotificationButton';
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount';

const LOGO = require('@/assets/images/pliz-logo.png');

const NOTIFICATIONS_HREF = '/(tabs)/notifications' as Href;

export type RequestDetailHeaderProps = {
  /** Opens hide / block / flag options. */
  onMenuPress?: () => void;
};

function goBackOrHome() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)/(main)' as Href);
  }
}

export function RequestDetailHeader({ onMenuPress }: RequestDetailHeaderProps) {
  const { unreadCount } = useUnreadNotificationCount();

  return (
    <View style={styles.header}>
      <Pressable
        onPress={goBackOrHome}
        style={styles.backCircle}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Ionicons name="arrow-back" size={22} color="#1F2937" />
      </Pressable>
      <View style={styles.logoWrap}>
        <Image source={LOGO} style={styles.logo} contentFit="contain" />
      </View>
      <View style={styles.rightCluster}>
        <HeaderNotificationButton
          onPress={() => router.push(NOTIFICATIONS_HREF)}
          unreadCount={unreadCount}
        />
        {onMenuPress ? (
          <Pressable
            style={styles.iconCircle}
            onPress={onMenuPress}
            accessibilityLabel="More options"
            accessibilityRole="button"
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#1F2937" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  logo: {
    width: 40,
    height: 40,
  },
});
