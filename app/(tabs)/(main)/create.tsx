import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import { Text } from '@/components/Text';
import { z } from 'zod';

import { CategoryChip } from '@/components/create/CategoryChip';
import { ConfirmRequestModal } from '@/components/create/ConfirmRequestModal';
import { RequestLiveModal } from '@/components/create/RequestLiveModal';
import { RequestLimitAlert } from '@/components/create/RequestLimitAlert';
import { CTAButton } from '@/components/CTAButton';
import { FormTextArea } from '@/components/FormTextArea';
import { AppHeaderLogoRow } from '@/components/layout/AppHeaderLogoRow';
import { Screen } from '@/components/Screen';
import { categoryEmojiForId, REQUEST_CATEGORIES } from '@/constants/categories';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import {
  getBegAmountTierError,
  parseAmountInput,
} from '@/lib/beg/tier-progression';
import {
  clampBegDescriptionForApi,
  createBeg,
  getTrustProgress,
  type BegExpiryHours,
  type TrustProgress,
  uiCategoryToApiCategory,
} from '@/lib/api/beg';
import { formatPlizApiErrorForUser } from '@/lib/api/types';
import {
  getAccessTokenOrTryRefresh,
  withUnauthorizedRecovery,
} from '@/lib/auth/session-expired';
import { formatAmountInput } from '@/lib/money/input-format';
import {
  PLATFORM_FEE_PERCENT,
  VAT_ON_PLATFORM_FEE_PERCENT,
} from '@/lib/withdrawal-fees';

const MAX_DESC_WORDS = 40;

const createRequestSchema = z.object({
  categoryId: z.string().min(1, 'Please select a category'),
  description: z
    .string()
    .min(1, 'Please describe your need')
    .refine(
      (val) => val.trim().split(/\s+/).filter(Boolean).length <= MAX_DESC_WORDS,
      `Maximum ${MAX_DESC_WORDS} words`
    ),
  amount: z
    .string()
    .min(1, 'Please enter an amount')
    .refine(
      (val) => {
        const num = Number(val.replace(/,/g, ''));
        return !isNaN(num) && num >= 100;
      },
      'Minimum amount is ₦100'
    ),
  expiryHours: z.enum(['24', '72', '168']),
  showName: z.boolean(),
});

type CreateRequestFormData = z.infer<typeof createRequestSchema>;

const DEFAULT_CREATE_VALUES: CreateRequestFormData = {
  categoryId: '',
  description: '',
  amount: '',
  expiryHours: '24',
  showName: true,
};

const COLORS = {
  background: '#FFFFFF',
  brandBlue: '#2E8BEA',
  heading: '#1F2937',
  body: '#6B7280',
} as const;

const EXPIRY_OPTIONS = [
  { value: '24' as const, label: '24 hours' },
  { value: '72' as const, label: '72 hours' },
  { value: '168' as const, label: '7 days' },
];

function formatNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

function buildTrustLimitMessage(progress: TrustProgress | null): string {
  if (!progress) {
    return 'Verify your identity and make at least one donation to request more.';
  }
  if (progress.isMaxTier) {
    return `You are at the highest tier: ${progress.capabilities.requestsPerDay} approved requests per day.`;
  }
  if (progress.nextTierRequirements.length > 0) {
    return `Next: ${progress.nextTierRequirements.join(' • ')}`;
  }
  if (progress.nextCapabilities) {
    return `Next tier unlocks requests up to ${formatNaira(progress.nextCapabilities.maxAmount)}.`;
  }
  return 'Build trust by verifying your identity and helping others.';
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function CreateScreen() {
  const { user, signOut } = useCurrentUser();
  const anonymousModeEnabled = user?.profile?.isAnonymous ?? false;
  const createDefaults = useMemo<CreateRequestFormData>(
    () => ({ ...DEFAULT_CREATE_VALUES, showName: !anonymousModeEnabled }),
    [anonymousModeEnabled]
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trustProgress, setTrustProgress] = useState<TrustProgress | null>(null);
  const [trustProgressLoading, setTrustProgressLoading] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<CreateRequestFormData | null>(null);
  const [liveSuccess, setLiveSuccess] = useState<{
    requestId: string;
    amount: number;
    categoryLabel: string;
    categoryId: string;
    expiryLine: string;
  } | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<CreateRequestFormData>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: createDefaults,
    mode: 'onChange',
  });

  const description = watch('description');
  const amountInput = watch('amount');
  const wordCount = countWords(description ?? '');

  const parsedAmount = useMemo(() => parseAmountInput(amountInput ?? ''), [amountInput]);
  const amountTierError = useMemo(() => {
    if (parsedAmount == null || parsedAmount < 100) return null;
    return getBegAmountTierError(parsedAmount, user);
  }, [parsedAmount, user]);
  const amountDisplayError = errors.amount?.message ?? amountTierError ?? undefined;
  const continueDisabled = isSubmitting || !isValid || amountTierError != null;

  const loadTrustProgress = useCallback(async () => {
    const token = await getAccessTokenOrTryRefresh();
    if (!token) return;
    setTrustProgressLoading(true);
    try {
      const progress = await getTrustProgress(token);
      setTrustProgress(progress);
    } catch {
      setTrustProgress(null);
    } finally {
      setTrustProgressLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrustProgress();
  }, [loadTrustProgress]);

  useEffect(() => {
    if (anonymousModeEnabled) {
      setValue('showName', false, { shouldDirty: true, shouldValidate: true });
    }
  }, [anonymousModeEnabled, setValue]);

  const onContinue = async (data: CreateRequestFormData) => {
    if (isSubmitting) return;

    const token = await getAccessTokenOrTryRefresh();
    if (!token) {
      Alert.alert('Sign in required', 'Please log in to submit a request.', [
        { text: 'OK', onPress: () => router.push('/(auth)/login' as import('expo-router').Href) },
      ]);
      return;
    }

    const cat = REQUEST_CATEGORIES.find((c) => c.id === data.categoryId);
    if (!cat) {
      Alert.alert('Category required', 'Please select a category.');
      return;
    }

    setPendingSubmit({
      ...data,
      showName: anonymousModeEnabled ? false : data.showName,
    });
    setConfirmVisible(true);
  };

  const closeConfirmModal = () => {
    if (isSubmitting) return;
    setConfirmVisible(false);
    setPendingSubmit(null);
  };

  const onConfirmSubmit = async () => {
    const data = pendingSubmit;
    if (!data || isSubmitting) return;

    const amountRequested = Number(data.amount.replace(/,/g, ''));
    const descriptionForApi = clampBegDescriptionForApi(data.description);
    const expiryHours = Number(data.expiryHours) as BegExpiryHours;

    setIsSubmitting(true);
    try {
      const { beg } = await withUnauthorizedRecovery(signOut, (token) =>
        createBeg(token, {
          description: descriptionForApi,
          category: uiCategoryToApiCategory(data.categoryId),
          amountRequested,
          expiryHours,
          isAnonymous: !data.showName,
          mediaType: 'text',
        })
      );

      const categoryMeta = REQUEST_CATEGORIES.find((c) => c.id === data.categoryId);
      const expiryHoursLabel =
        EXPIRY_OPTIONS.find((o) => o.value === data.expiryHours)?.label ?? '';

      setConfirmVisible(false);
      setPendingSubmit(null);
      setLiveSuccess({
        requestId: beg.id,
        amount: amountRequested,
        categoryLabel: categoryMeta?.label ?? 'Your request',
        categoryId: data.categoryId,
        expiryLine: `Expires in ${expiryHoursLabel}`,
      });
    } catch (e) {
      Alert.alert('Could not submit', formatPlizApiErrorForUser(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onBack = () => {
    router.back();
  };

  const clearCreateFormAndLiveState = () => {
    setLiveSuccess(null);
    reset(createDefaults);
    setSelectedCategory(null);
  };

  const onLiveDismissOrHome = () => {
    clearCreateFormAndLiveState();
    router.replace('/(tabs)/(main)' as Href);
  };

  const onLiveViewRequest = () => {
    const id = liveSuccess?.requestId;
    clearCreateFormAndLiveState();
    if (id) {
      router.push({ pathname: '/(tabs)/request/[id]', params: { id } } as Href);
    }
  };

  const pendingCategory =
    pendingSubmit != null
      ? REQUEST_CATEGORIES.find((c) => c.id === pendingSubmit.categoryId)
      : undefined;
  const pendingAmount =
    pendingSubmit != null ? Number(pendingSubmit.amount.replace(/,/g, '')) : 0;
  const pendingExpiryLabel =
    pendingSubmit != null
      ? EXPIRY_OPTIONS.find((o) => o.value === pendingSubmit.expiryHours)?.label ?? ''
      : '';

  return (
    <Screen backgroundColor={COLORS.background} scrollable>
      {pendingSubmit != null && pendingCategory != null ? (
        <ConfirmRequestModal
          visible={confirmVisible}
          onClose={closeConfirmModal}
          onConfirm={onConfirmSubmit}
          categoryLabel={pendingCategory.label}
          categoryIcon={pendingCategory.icon}
          description={pendingSubmit.description}
          amountRequested={pendingAmount}
          expiryLabel={pendingExpiryLabel}
          submitting={isSubmitting}
        />
      ) : null}
      {liveSuccess != null ? (
        <RequestLiveModal
          visible
          onDismiss={onLiveDismissOrHome}
          onViewMyRequest={onLiveViewRequest}
          onBackToHome={onLiveDismissOrHome}
          amountRequested={liveSuccess.amount}
          categoryLabel={liveSuccess.categoryLabel}
          categoryEmoji={categoryEmojiForId(liveSuccess.categoryId)}
          expiryLine={liveSuccess.expiryLine}
        />
      ) : null}
      <View style={styles.content}>
          <AppHeaderLogoRow onPressBack={onBack} backIconColor={COLORS.heading} />

          <Text style={styles.title}>Ask for Help</Text>
          <Text style={styles.subtitle}>
            Tell us what you need the money for. Keep it simple and honest
          </Text>

          <RequestLimitAlert
            limit={formatNaira(trustProgress?.capabilities.maxAmount ?? 10000)}
            tierLabel={
              trustProgress
                ? `${trustProgress.currentTierBadge} ${trustProgress.currentTierName}`
                : undefined
            }
            verifyMessage={buildTrustLimitMessage(trustProgress)}
            loading={trustProgressLoading}
          />

          <Text style={styles.sectionTitle}>Select a Category</Text>
          <View style={styles.categoryGrid}>
            {REQUEST_CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat.id}
                label={cat.label}
                icon={cat.icon}
                selected={selectedCategory === cat.id}
                onPress={() => {
                  setSelectedCategory(cat.id);
                  setValue('categoryId', cat.id);
                }}
              />
            ))}
          </View>
          {errors.categoryId ? (
            <Text style={styles.fieldError}>{errors.categoryId.message}</Text>
          ) : null}

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormTextArea
                label="Briefly describe your need"
                placeholder="Be specific but brief (max 40 words)."
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                wordCount={{ current: wordCount, max: MAX_DESC_WORDS }}
                error={errors.description?.message}
                hint="No title on the feed — only this description. No editing after submission."
                maxLength={300}
              />
            )}
          />

          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormTextArea
                variant="single"
                prefix="₦"
                label="How much do you need?"
                placeholder="0"
                value={value}
                onChangeText={(text) => onChange(formatAmountInput(text))}
                onBlur={onBlur}
                keyboardType="numeric"
                error={amountDisplayError}
                hint="Minimum ₦100. Subject to your trust tier limit."
              />
            )}
          />

          <View style={styles.sectionTitleRow}>
            <Ionicons name="time-outline" size={18} color={COLORS.heading} style={styles.sectionTitleIcon} />
            <Text style={styles.sectionTitle}>Request expires in</Text>
          </View>
          <View style={styles.expiryRow}>
            {EXPIRY_OPTIONS.map((opt) => (
              <Controller
                key={opt.value}
                control={control}
                name="expiryHours"
                render={({ field: { value, onChange } }) => (
                  <Pressable
                    onPress={() => onChange(opt.value)}
                    style={[styles.expiryChip, value === opt.value && styles.expiryChipSelected]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: value === opt.value }}
                  >
                    <Text
                      style={[
                        styles.expiryLabel,
                        value === opt.value && styles.expiryLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                )}
              />
            ))}
          </View>
          <View style={styles.platformFeeBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.body} style={styles.platformFeeIcon} />
            <Text style={styles.platformFeeText}>
              A {PLATFORM_FEE_PERCENT}% platform fee applies to successful requests. VAT is {VAT_ON_PLATFORM_FEE_PERCENT}% of that fee.
            </Text>
          </View>

          <View style={[styles.toggleRow, anonymousModeEnabled && styles.toggleRowLocked]}>
            <View style={styles.toggleLeft}>
              <Ionicons
                name={anonymousModeEnabled ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={anonymousModeEnabled ? '#9CA3AF' : COLORS.heading}
                style={styles.toggleIcon}
              />
              <View>
                <Text style={[styles.toggleTitle, anonymousModeEnabled && styles.toggleTitleLocked]}>
                  Show my name
                </Text>
                <Text style={styles.toggleSubtitle}>
                  {anonymousModeEnabled
                    ? 'Disabled because Anonymous Mode is on'
                    : 'Givers will see your first name'}
                </Text>
              </View>
            </View>
            <Controller
              control={control}
              name="showName"
              render={({ field: { value, onChange } }) => (
                <Switch
                  value={anonymousModeEnabled ? false : value}
                  onValueChange={anonymousModeEnabled ? undefined : onChange}
                  disabled={anonymousModeEnabled}
                  trackColor={{ false: '#E5E7EB', true: COLORS.brandBlue }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel="Show my name"
                />
              )}
            />
          </View>

          <CTAButton
            label="Continue"
            onPress={handleSubmit(onContinue)}
            variant="gradient"
            accessibilityLabel="Continue"
            disabled={continueDisabled}
          />

          <Text style={styles.disclaimer}>
            By submitting, you agree that this request is truthful and you accept our community guidelines
          </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.heading,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.body,
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleIcon: {
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.heading,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  fieldError: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 12,
  },
  expiryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  expiryChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  expiryChipSelected: {
    borderColor: '#D1D5DB',
    backgroundColor: '#F3F4F6',
  },
  expiryLabel: {
    fontSize: 14,
    color: COLORS.body,
  },
  expiryLabelSelected: {
    color: COLORS.heading,
    fontWeight: '600',
  },
  platformFeeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  platformFeeIcon: {
    marginRight: 10,
  },
  platformFeeText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.body,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingVertical: 12,
  },
  toggleRowLocked: {
    backgroundColor: '#F9FAFB',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleIcon: {
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.heading,
  },
  toggleTitleLocked: {
    color: '#9CA3AF',
  },
  toggleSubtitle: {
    fontSize: 13,
    color: COLORS.body,
    marginTop: 2,
  },
  disclaimer: {
    fontSize: 12,
    color: COLORS.body,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
