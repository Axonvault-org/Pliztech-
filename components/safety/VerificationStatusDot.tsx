import { StyleSheet, View } from 'react-native';

type VerificationStatusDotProps = {
  verified: boolean;
  /** Slightly smaller on compact card headers. */
  compact?: boolean;
};

/**
 * Blue ring dot = admin-verified request. Yellow dot = not yet verified.
 */
export function VerificationStatusDot({ verified, compact = false }: VerificationStatusDotProps) {
  const outer = compact ? 12 : 14;
  const inner = compact ? 8 : 10;
  const unverifiedSize = compact ? 9 : 11;

  if (verified) {
    return (
      <View
        style={[
          styles.verifiedRing,
          { width: outer, height: outer, borderRadius: outer / 2 },
        ]}
        accessibilityRole="image"
        accessibilityLabel="Verified request"
      >
        <View
          style={[
            styles.verifiedCore,
            { width: inner, height: inner, borderRadius: inner / 2 },
          ]}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.unverifiedDot,
        { width: unverifiedSize, height: unverifiedSize, borderRadius: unverifiedSize / 2 },
      ]}
      accessibilityRole="image"
      accessibilityLabel="Unverified request"
    />
  );
}

const styles = StyleSheet.create({
  verifiedRing: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
    flexShrink: 0,
  },
  verifiedCore: {
    backgroundColor: '#2E8BEA',
  },
  unverifiedDot: {
    backgroundColor: '#FBBF24',
    flexShrink: 0,
  },
});
