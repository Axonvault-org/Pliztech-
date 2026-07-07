import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';

export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

type ModerationStatusBadgeProps = {
  status: ModerationStatus;
  compact?: boolean;
};

const CONFIG: Record<
  ModerationStatus,
  { label: string; bg: string; text: string }
> = {
  pending: { label: 'Pending review', bg: '#FEF3C7', text: '#B45309' },
  approved: { label: 'Approved', bg: '#DBEAFE', text: '#1D4ED8' },
  rejected: { label: 'Rejected', bg: '#FEE2E2', text: '#DC2626' },
  flagged: { label: 'Under review', bg: '#FFEDD5', text: '#EA580C' },
};

export function ModerationStatusBadge({ status, compact = false }: ModerationStatusBadgeProps) {
  const config = CONFIG[status];
  return (
    <View
      style={[styles.chip, compact && styles.chipCompact, { backgroundColor: config.bg }]}
      accessibilityRole="text"
      accessibilityLabel={`Request status: ${config.label}`}
    >
      <Text style={[styles.label, compact && styles.labelCompact, { color: config.text }]}>
        {config.label}
      </Text>
    </View>
  );
}

export function moderationStatusFromBeg(input: {
  approved?: boolean;
  begStatus?: string;
  isOwner?: boolean;
}): ModerationStatus | null {
  const status = input.begStatus?.toLowerCase();
  if (status === 'rejected') return 'rejected';
  if (status === 'flagged') return 'flagged';
  if (input.approved === false) return 'pending';
  if (input.approved === true && input.isOwner) return 'approved';
  return null;
}

export function moderationOwnerMessage(status: ModerationStatus): string | null {
  switch (status) {
    case 'pending':
      return "Your request isn't visible to the community yet. We'll notify you when it's approved.";
    case 'rejected':
      return 'This request was not approved. It is not visible for donations. Contact support if you believe this was a mistake.';
    case 'flagged':
      return 'This request is under review. Donations and payouts may be paused while our team investigates.';
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  labelCompact: {
    fontSize: 11,
  },
});
