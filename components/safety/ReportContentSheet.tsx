import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Text } from '@/components/Text';
import {
  REPORT_CATEGORIES,
  REPORT_CATEGORY_LABELS,
  type ReportCategory,
  type ReportContentBody,
} from '@/lib/api/reports';
import { formatPlizApiErrorForUser } from '@/lib/api/types';

export type ReportTarget =
  | { type: 'beg'; id: string; label?: string }
  | { type: 'user'; id: string; label?: string }
  | { type: 'story'; id: string; label?: string };

type ReportContentSheetProps = {
  visible: boolean;
  target: ReportTarget | null;
  onClose: () => void;
  onSubmit: (body: ReportContentBody) => Promise<void>;
};

export function ReportContentSheet({
  visible,
  target,
  onClose,
  onSubmit,
}: ReportContentSheetProps) {
  const [category, setCategory] = useState<ReportCategory>('other');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCategory('other');
    setReason('');
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      Alert.alert('Add more detail', 'Please describe the issue in at least 10 characters.');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ category, reason: trimmed });
      reset();
      onClose();
      Alert.alert('Report submitted', 'Thank you. Our team will review this content.');
    } catch (e) {
      Alert.alert('Could not submit report', formatPlizApiErrorForUser(e));
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    target?.type === 'beg'
      ? 'Report request'
      : target?.type === 'user'
        ? 'Report user'
        : target?.type === 'story'
          ? 'Report story'
          : 'Report content';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color="#6B7280" />
            </Pressable>
          </View>

          {target?.label ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {target.label}
            </Text>
          ) : null}

          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {REPORT_CATEGORIES.map((value) => {
              const selected = category === value;
              return (
                <Pressable
                  key={value}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setCategory(value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {REPORT_CATEGORY_LABELS[value]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Reason</Text>
          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder="Describe what is wrong (10–500 characters)"
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            editable={!submitting}
          />
          <Text style={styles.hint}>{reason.trim().length}/500</Text>

          <Pressable
            style={[styles.submit, submitting && styles.submitDisabled]}
            onPress={() => void handleSubmit()}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  chipScroll: {
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#DBEAFE',
  },
  chipText: {
    fontSize: 13,
    color: '#4B5563',
  },
  chipTextSelected: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
    fontSize: 15,
    color: '#111827',
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  submit: {
    marginTop: 20,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
