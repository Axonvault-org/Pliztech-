import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { Text } from '@/components/Text';
import { SearchableListModal } from '@/components/form/SearchableListModal';
import { NIGERIAN_STATES } from '@/constants/nigerian-states';

type NigerianStatePickerProps = {
  label?: string;
  value: string;
  onChange: (state: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
};

export function NigerianStatePicker({
  label = 'State (Nigeria)',
  value,
  onChange,
  error,
  disabled = false,
  placeholder = 'Tap to select state',
}: NigerianStatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={() => {
          if (!disabled) setOpen(true);
        }}
        style={[styles.trigger, error && styles.triggerError, disabled && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel="Select state"
        accessibilityState={{ disabled }}
      >
        <Text style={value ? styles.triggerText : styles.triggerPlaceholder}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#6B7280" />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <SearchableListModal
        visible={open}
        title="Select state"
        items={[...NIGERIAN_STATES]}
        onSelect={(item) => {
          onChange(item);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  triggerError: {
    borderColor: '#DC2626',
  },
  disabled: {
    opacity: 0.5,
  },
  triggerText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  triggerPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
    flex: 1,
    marginRight: 8,
  },
  error: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 6,
  },
});
