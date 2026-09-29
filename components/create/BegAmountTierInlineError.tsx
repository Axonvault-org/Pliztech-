import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { Text } from '@/components/Text';
import type { MeUser } from '@/lib/api/types';
import {
  getBegAmountTierActions,
  getBegAmountTierError,
} from '@/lib/beg/tier-progression';

const ERROR_COLOR = '#DC2626';
const LINK_COLOR = '#2E8BEA';

export type BegAmountTierInlineErrorProps = {
  requestedAmount: number;
  user: MeUser | null;
  onVerify: () => void;
  onDonate: () => void;
};

function ErrorText({ children }: { children: ReactNode }) {
  return <Text style={styles.error}>{children}</Text>;
}

function ErrorLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Text
      style={styles.link}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
    >
      {label}
    </Text>
  );
}

export function BegAmountTierInlineError({
  requestedAmount,
  user,
  onVerify,
  onDonate,
}: BegAmountTierInlineErrorProps) {
  const message = getBegAmountTierError(requestedAmount, user);
  const actions = getBegAmountTierActions(requestedAmount, user);
  if (!message) return null;

  const verify = actions.includes('verify');
  const donate = actions.includes('donate');

  if (verify && donate && requestedAmount <= 50_000) {
    return (
      <ErrorText>
        To request more than ₦10,000 you need to{' '}
        <ErrorLink label="verify your identity" onPress={onVerify} />
        {' and '}
        <ErrorLink label="make at least 1 donation" onPress={onDonate} />.
      </ErrorText>
    );
  }

  if (verify) {
    return (
      <ErrorText>
        To request more than ₦10,000 you must complete your{' '}
        <ErrorLink label="identity verification" onPress={onVerify} />.
      </ErrorText>
    );
  }

  if (donate && requestedAmount <= 50_000) {
    return (
      <ErrorText>
        To request more than ₦10,000 you must{' '}
        <ErrorLink label="make at least 1 donation" onPress={onDonate} /> first.
      </ErrorText>
    );
  }

  if (donate) {
    return (
      <ErrorText>
        {message}{' '}
        <ErrorLink label="Browse requests" onPress={onDonate} /> to donate and unlock this
        amount.
      </ErrorText>
    );
  }

  return <ErrorText>{message}</ErrorText>;
}

const styles = StyleSheet.create({
  error: {
    fontSize: 12,
    color: ERROR_COLOR,
    lineHeight: 18,
  },
  link: {
    fontSize: 12,
    fontWeight: '700',
    color: LINK_COLOR,
    textDecorationLine: 'underline',
  },
});
