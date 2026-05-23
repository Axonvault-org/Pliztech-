import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { CTA_COLORS, CTA_GRADIENT } from '@/constants/cta-buttons';

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString('en-NG', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export type ConfirmRequestModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Category label e.g. "Work & Hustle Support" */
  categoryLabel: string;
  categoryIcon: keyof typeof Ionicons.glyphMap;
  description: string;
  amountRequested: number;
  platformFeePercent?: number;
  /** VAT on platform fee (government levy), shown as info line */
  vatGovPercent?: number;
  /** Shown under “You’ll receive”, e.g. "48 hours" */
  expiryLabel: string;
  submitting?: boolean;
};

export function ConfirmRequestModal({
  visible,
  onClose,
  onConfirm,
  categoryLabel,
  categoryIcon,
  description,
  amountRequested,
  platformFeePercent = 5,
  vatGovPercent = 7.5,
  expiryLabel,
  submitting = false,
}: ConfirmRequestModalProps) {
  const insets = useSafeAreaInsets();
  const fee = roundMoney((amountRequested * platformFeePercent) / 100);
  const vatOnFee = roundMoney((fee * vatGovPercent) / 100);
  const receive = Math.max(0, roundMoney(amountRequested - fee - vatOnFee));

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => {
        if (!submitting) onClose();
      }}
    >
      <View style={[styles.overlay, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.overlayDim} />

        <View style={styles.sheet}>
          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={12}
            disabled={submitting}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <View style={styles.closeCircle}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </View>
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Confirm your Request</Text>
            <Text style={styles.subtitle}>
              Once submitted, you cannot edit or delete this request. Review can take up to 48 hours.
            </Text>

            <View style={styles.detailCard}>
              <View style={styles.categoryHeader}>
                <Ionicons name={categoryIcon} size={20} color="#6B7280" />
                <Text style={styles.categoryTitle}>{categoryLabel}</Text>
              </View>
              <Text style={styles.description}>{description.trim()}</Text>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.rowLabel}>Amount requested</Text>
                <Text style={styles.rowValueMuted}>{formatNaira(amountRequested)}</Text>
              </View>
              <View style={styles.row}>
                <View style={styles.feeLabelRow}>
                  <Text style={styles.rowLabel}>Platform fee ({platformFeePercent}%)</Text>
                  <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
                </View>
                <Text style={styles.rowValueMuted}>-{formatNaira(fee)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>VAT ({vatGovPercent}% of platform fee)</Text>
                <Text style={styles.rowValueMuted}>-{formatNaira(vatOnFee)}</Text>
              </View>

              <View style={styles.receiveBlock}>
                <Text style={styles.receiveLabel}>{"You'll receive"}</Text>
                <Text style={styles.receiveAmount}>{formatNaira(receive)}</Text>
                <Text style={styles.expiryHint}>{expiryLabel}</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Text style={styles.backBtnText}>Go back</Text>
              </Pressable>

              <Pressable
                onPress={onConfirm}
                disabled={submitting}
                style={styles.confirmOuter}
                accessibilityRole="button"
                accessibilityLabel="Confirm request"
              >
                <LinearGradient
                  colors={[...CTA_GRADIENT.gradientColors]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.confirmGradient, submitting && styles.confirmDisabled]}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <View style={styles.confirmInner}>
                      <View style={styles.confirmCheckCircle}>
                        <Ionicons name="checkmark" size={18} color={CTA_COLORS.blueStart} />
                      </View>
                      <Text style={styles.confirmText}>Confirm</Text>
                    </View>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  overlayDim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 2,
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  detailCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  feeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  rowValueMuted: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  receiveBlock: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  receiveLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  receiveAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2E8BEA',
    marginBottom: 4,
  },
  expiryHint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  backBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  pressed: {
    opacity: 0.85,
  },
  confirmOuter: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  confirmGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    minHeight: 50,
  },
  confirmDisabled: {
    opacity: 0.7,
  },
  confirmInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
