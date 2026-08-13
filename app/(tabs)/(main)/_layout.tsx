import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { CustomTabBar } from '@/components/CustomTabBar';
import { SupportChatFab } from '@/components/support/SupportChatFab';

export default function MainTabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { flex: 1, backgroundColor: '#FFFFFF' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="browse" options={{ title: 'Browse' }} />
        <Tabs.Screen name="create" options={{ title: 'Create' }} />
        <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
      <SupportChatFab />
    </View>
  );
}
