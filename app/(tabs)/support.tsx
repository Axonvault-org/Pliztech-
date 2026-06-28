import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Fragment, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { getContactInfo, type ContactInfo } from '@/lib/api/contact';
import { FAQ_SECTIONS } from '@/lib/content/legal';

export default function HelpCenterScreen() {
  const [openQuestion, setOpenQuestion] = useState<string | null>('About Plz-What is Plz?');
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [contactLoading, setContactLoading] = useState(true);

  useEffect(() => {
    void getContactInfo()
      .then(setContact)
      .catch(() => setContact(null))
      .finally(() => setContactLoading(false));
  }, []);

  return (
    <Screen backgroundColor="#F9FAFB" scrollable>
      <AppHeaderTitleRow title="Help Center" backIconColor="#9CA3AF" />
      <View style={styles.content}>
        <Pressable
          style={styles.reportCard}
          onPress={() => router.push('/(tabs)/report-issue' as import('expo-router').Href)}
          accessibilityRole="button"
        >
          <View style={styles.reportIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#355C7D" />
          </View>
          <View style={styles.reportCopy}>
            <Text style={styles.reportTitle}>Report an Issue</Text>
            <Text style={styles.reportSubtitle}>Contact support or share what went wrong</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </Pressable>

        <View style={styles.abuseCard}>
          <Text style={styles.abuseTitle}>Report abusive content</Text>
          {contactLoading ? (
            <ActivityIndicator color="#355C7D" />
          ) : contact ? (
            <>
              <Text style={styles.abuseText}>{contact.reportAbuse.description}</Text>
              <Text style={styles.abuseEmail}>{contact.reportAbuse.email}</Text>
              <Text style={styles.abuseMeta}>{contact.reportAbuse.responseTime}</Text>
            </>
          ) : (
            <Text style={styles.abuseText}>
              Use the flag icon on requests, profiles, or stories to report content in the app.
            </Text>
          )}
        </View>

        <View style={styles.faqHeader}>
          <Text style={styles.sectionTitle}>FAQ</Text>
          <Text style={styles.sectionSubtitle}>Answers about requests, donations, limits, and safety.</Text>
        </View>

        {FAQ_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.groupTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, index) => {
                const key = `${section.title}-${item.question}`;
                const expanded = openQuestion === key;
                return (
                  <Fragment key={key}>
                    <Pressable
                      style={styles.questionRow}
                      onPress={() => setOpenQuestion(expanded ? null : key)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                    >
                      <Text style={styles.question}>{item.question}</Text>
                      <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#6B7280"
                      />
                    </Pressable>
                    {expanded ? (
                      <View style={styles.answerWrap}>
                        {item.answer.map((line) => (
                          <Text key={line} style={styles.answer}>
                            {line}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                    {index < section.items.length - 1 ? <View style={styles.divider} /> : null}
                  </Fragment>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
    gap: 18,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  reportIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF4F8',
  },
  reportCopy: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#262626',
  },
  reportSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  abuseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 16,
    gap: 6,
  },
  abuseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#991B1B',
  },
  abuseText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  abuseEmail: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  abuseMeta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  faqHeader: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#262626',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  section: {
    gap: 8,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#355C7D',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  questionRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  question: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#262626',
    lineHeight: 20,
  },
  answerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  answer: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
});
