import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { PRIVACY_SECTIONS, TERMS_SECTIONS, type LegalSection } from '@/lib/content/legal';

type LegalTab = 'terms' | 'privacy';

const TABS: { value: LegalTab; label: string }[] = [
  { value: 'terms', label: 'Terms' },
  { value: 'privacy', label: 'Privacy' },
];

export default function LegalScreen() {
  const [activeTab, setActiveTab] = useState<LegalTab>('terms');
  const sections = activeTab === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS;

  return (
    <Screen backgroundColor="#F9FAFB" scrollable>
      <AppHeaderTitleRow title="Terms & Privacy" backIconColor="#9CA3AF" />
      <View style={styles.content}>
        <View style={styles.segment}>
          {TABS.map((tab) => {
            const active = activeTab === tab.value;
            return (
              <Pressable
                key={tab.value}
                style={[styles.segmentButton, active && styles.segmentButtonActive]}
                onPress={() => setActiveTab(tab.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>
            {activeTab === 'terms' ? 'Plz Terms & Conditions' : 'Privacy Policy'}
          </Text>
          {sections.map((section) => (
            <LegalSectionBlock key={section.title} section={section} />
          ))}
        </View>
      </View>
    </Screen>
  );
}

function LegalSectionBlock({ section }: { section: LegalSection }) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{section.title}</Text>
      {section.body ? <Text style={styles.body}>{section.body}</Text> : null}
      {section.items?.map((item) => (
        <View key={item} style={styles.row}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.body}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
    gap: 14,
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#262626',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#262626',
    marginBottom: 16,
  },
  section: {
    marginBottom: 18,
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#262626',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#355C7D',
    lineHeight: 22,
  },
  body: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
});
