import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { LegalDocumentLink } from '@/components/compliance/LegalDocumentLink';

export function DonationTermsConsent() {
  return (
    <View style={styles.row}>
      <Text style={styles.text}>By donating, you agree to our </Text>
      <LegalDocumentLink kind="terms" label="Terms and Conditions" style={styles.link} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  text: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
    textAlign: 'center',
  },
  link: {
    fontSize: 12,
  },
});
