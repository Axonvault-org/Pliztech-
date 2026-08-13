import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { HeaderNotificationButton } from '@/components/home/HeaderNotificationButton';
import type { RequestCardSafetyProps } from '@/components/request/request-card-safety';
import { RequestCardOverflowMenu } from '@/components/request/RequestCardOverflowMenu';
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount';

const LOGO = require('@/assets/images/pliz-logo.png');

const NOTIFICATIONS_HREF = '/(tabs)/notifications' as Href;

export type RequestDetailHeaderProps = {
  safetyMenu?: RequestCardSafetyProps;
};

function goBackOrHome() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)/(main)' as Href);
  }
}

export function RequestDetailHeader({ safetyMenu }: RequestDetailHeaderProps) {
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
        {safetyMenu ? (
          <RequestCardOverflowMenu
            variant="header"
            target={safetyMenu.target}
            isHidden={safetyMenu.isHidden}
            isBlocked={safetyMenu.isBlocked}
            showFlag={safetyMenu.showFlag}
            onToggleHidden={safetyMenu.onToggleHidden}
            onToggleBlocked={safetyMenu.onToggleBlocked}
            onFlag={safetyMenu.onFlag}
          />
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
    zIndex: 10,
    position: 'relative',
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
