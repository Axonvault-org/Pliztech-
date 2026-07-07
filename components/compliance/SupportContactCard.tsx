import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { getContactInfo, type ContactInfo } from '@/lib/api/contact';

const FALLBACK_SUPPORT_EMAIL = 'support@plz.ng';

type SupportContactCardProps = {
  showAbuse?: boolean;
};

export function SupportContactCard({ showAbuse = true }: SupportContactCardProps) {
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getContactInfo()
      .then(setContact)
      .catch(() => setContact(null))
      .finally(() => setLoading(false));
  }, []);

  const supportEmail = contact?.support.email?.trim() || FALLBACK_SUPPORT_EMAIL;
  const supportResponse = contact?.support.responseTime?.trim();

  const openEmail = (email: string) => {
    void Linking.openURL(`mailto:${email}`);
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color="#355C7D" />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Contact support</Text>
      <Text style={styles.body}>
        Questions about donations, account access, or technical issues? Our team is here to help.
      </Text>
      <Pressable
        onPress={() => openEmail(supportEmail)}
        accessibilityRole="link"
        accessibilityLabel={`Email support at ${supportEmail}`}
      >
        <Text style={styles.email}>{supportEmail}</Text>
      </Pressable>
      {supportResponse ? <Text style={styles.meta}>{supportResponse}</Text> : null}

      {showAbuse && contact?.reportAbuse ? (
        <View style={styles.abuseBlock}>
          <Text style={styles.abuseTitle}>Report abusive content</Text>
          <Text style={styles.body}>{contact.reportAbuse.description}</Text>
          <Pressable
            onPress={() => openEmail(contact.reportAbuse.email)}
            accessibilityRole="link"
            accessibilityLabel={`Report abuse at ${contact.reportAbuse.email}`}
          >
            <Text style={styles.email}>{contact.reportAbuse.email}</Text>
          </Pressable>
          {contact.reportAbuse.responseTime ? (
            <Text style={styles.meta}>{contact.reportAbuse.responseTime}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },
  email: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E8BEA',
    textDecorationLine: 'underline',
  },
  meta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  abuseBlock: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    gap: 6,
  },
  abuseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
});
