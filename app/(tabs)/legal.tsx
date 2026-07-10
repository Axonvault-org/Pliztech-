import { StyleSheet, View } from 'react-native';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { ProfileRow } from '@/components/profile/ProfileRow';
import { ProfileSection } from '@/components/profile/ProfileSection';
import { Screen } from '@/components/Screen';
import { openLegalDocument } from '@/lib/compliance/legal-urls';

export default function LegalScreen() {
  return (
    <Screen backgroundColor="#F9FAFB" scrollable>
      <AppHeaderTitleRow title="Terms & Privacy" backIconColor="#9CA3AF" />
      <View style={styles.content}>
        <ProfileSection title="Legal documents">
          <ProfileRow
            icon="document-text-outline"
            title="Terms and Conditions"
            onPress={() => void openLegalDocument('terms')}
          />
          <ProfileRow
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            onPress={() => void openLegalDocument('privacy')}
            isLast
          />
        </ProfileSection>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
});
