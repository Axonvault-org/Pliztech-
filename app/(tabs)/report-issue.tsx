import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { z } from 'zod';

import { AppHeaderTitleRow } from '@/components/layout/AppHeaderTitleRow';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { createSupportTicket, type SupportCategory } from '@/lib/api/support';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import { withUnauthorizedRecovery } from '@/lib/auth/session-expired';

const CATEGORY_OPTIONS: { value: SupportCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'payment', label: 'Payment', icon: 'card-outline' },
  { value: 'donation', label: 'Donation', icon: 'heart-outline' },
  { value: 'beg', label: 'Request', icon: 'megaphone-outline' },
  { value: 'kyc', label: 'Verification', icon: 'shield-checkmark-outline' },
  { value: 'technical', label: 'Technical', icon: 'construct-outline' },
  { value: 'account', label: 'Account', icon: 'person-outline' },
  { value: 'other', label: 'Other', icon: 'help-circle-outline' },
];

const supportSchema = z.object({
  subject: z.string().trim().min(3, 'Add a short subject').max(255, 'Subject is too long'),
  category: z.enum(['account', 'payment', 'beg', 'donation', 'kyc', 'technical', 'other']),
  contactEmail: z.string().trim().email('Enter a valid email address'),
  message: z.string().trim().min(10, 'Please provide at least 10 characters'),
});

type SupportForm = z.infer<typeof supportSchema>;

export default function ReportIssueScreen() {
  const { user, signOut } = useCurrentUser();
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SupportForm>({
    resolver: zodResolver(supportSchema),
    defaultValues: {
      subject: '',
      category: 'technical',
      contactEmail: user?.email ?? '',
      message: '',
    },
  });

  const onSubmit = async (values: SupportForm) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const ticket = await withUnauthorizedRecovery(signOut, (token) =>
        createSupportTicket(token, {
          subject: values.subject.trim(),
          category: values.category,
          contactEmail: values.contactEmail.trim(),
          message: values.message.trim(),
        })
      );
      reset({ subject: '', category: values.category, contactEmail: values.contactEmail, message: '' });
      Alert.alert(
        'Ticket created',
        `Support ticket ${ticket.ticketNumber ?? ''} has been created. We will reply to ${values.contactEmail}.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert('Could not send report', formatPlizApiErrorForUser(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen backgroundColor="#F9FAFB" scrollable>
      <AppHeaderTitleRow title="Report an Issue" backIconColor="#9CA3AF" />
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Category</Text>
          <Controller
            control={control}
            name="category"
            render={({ field: { value, onChange } }) => (
              <View style={styles.categoryGrid}>
                {CATEGORY_OPTIONS.map((option) => {
                  const selected = value === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => onChange(option.value)}
                      style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={selected ? '#FFFFFF' : '#355C7D'}
                      />
                      <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          />

          <Controller
            control={control}
            name="subject"
            render={({ field: { value, onChange, onBlur } }) => (
              <>
                <Text style={styles.label}>Subject</Text>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="What happened?"
                  placeholderTextColor="#9CA3AF"
                />
                {errors.subject ? <Text style={styles.error}>{errors.subject.message}</Text> : null}
              </>
            )}
          />

          <Controller
            control={control}
            name="contactEmail"
            render={({ field: { value, onChange, onBlur } }) => (
              <>
                <Text style={styles.label}>Contact email</Text>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="you@example.com"
                  placeholderTextColor="#9CA3AF"
                />
                {errors.contactEmail ? <Text style={styles.error}>{errors.contactEmail.message}</Text> : null}
              </>
            )}
          />

          <Controller
            control={control}
            name="message"
            render={({ field: { value, onChange, onBlur } }) => (
              <>
                <Text style={styles.label}>Details</Text>
                <TextInput
                  style={[styles.input, styles.messageInput]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline
                  textAlignVertical="top"
                  placeholder="Tell us what you tried and what went wrong."
                  placeholderTextColor="#9CA3AF"
                />
                {errors.message ? <Text style={styles.error}>{errors.message.message}</Text> : null}
              </>
            )}
          />

          <Pressable
            style={[styles.submitButton, submitting && styles.disabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Submit report</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#EEF4F8',
  },
  categoryChipSelected: {
    backgroundColor: '#355C7D',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#355C7D',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#262626',
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
  },
  messageInput: {
    minHeight: 132,
  },
  error: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: -6,
    marginBottom: 10,
  },
  submitButton: {
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#355C7D',
    marginTop: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.65,
  },
});
