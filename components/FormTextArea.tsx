import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import {
  type StyleProp,
  type ViewStyle,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Text } from '@/components/Text';

const BORDER_RADIUS = 15;
const BORDER_COLOR = '#D1D5DB';
const HOVER_FOCUS_BORDER_COLOR = '#1766D1';
const ERROR_COLOR = '#DC2626';
const LABEL_COLOR = '#1F2937';
const BODY_COLOR = '#6B7280';
const INPUT_TEXT_COLOR = '#111827';

export interface FormTextAreaProps
  extends Omit<ComponentProps<typeof TextInput>, 'style' | 'multiline'> {
  label: string;
  error?: string;
  /** Rich error (e.g. inline links). Shown instead of `error` when set. */
  errorContent?: ReactNode;
  hint?: string;
  /** Show current/max in the label row (e.g. words or characters). */
  wordCount?: { current: number; max: number };
  /** How to label the count in the label row. Default `words`. */
  countUnit?: 'words' | 'characters';
  /** `multiline` (default): tall box like a description. `single`: one-line field with same border/label styling. */
  variant?: 'multiline' | 'single';
  /** With `variant="single"`, prefix inside the field (e.g. `₦`). Ignored for multiline. */
  prefix?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

const SINGLE_LINE_MIN_HEIGHT = 52;

export function FormTextArea({
  label,
  error,
  errorContent,
  hint,
  wordCount,
  countUnit = 'words',
  variant = 'multiline',
  prefix,
  containerStyle,
  accessibilityLabel = label,
  ...inputProps
}: FormTextAreaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = Boolean(error || errorContent);
  const borderColor = hasError
    ? ERROR_COLOR
    : isFocused
      ? HOVER_FOCUS_BORDER_COLOR
      : BORDER_COLOR;

  const isSingle = variant === 'single';
  const showPrefix = isSingle && prefix != null && prefix !== '';
  const countSuffix = countUnit === 'characters' ? 'characters' : 'words';

  const focusProps = {
    onFocus: (e: Parameters<NonNullable<typeof inputProps.onFocus>>[0]) => {
      setIsFocused(true);
      inputProps.onFocus?.(e);
    },
    onBlur: (e: Parameters<NonNullable<typeof inputProps.onBlur>>[0]) => {
      setIsFocused(false);
      inputProps.onBlur?.(e);
    },
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {wordCount != null && (
          <Text style={styles.wordCount}>
            {wordCount.current}/{wordCount.max} {countSuffix}
          </Text>
        )}
      </View>
      {showPrefix ? (
        <View style={[styles.inputShell, { borderColor }]}>
          <Text style={styles.prefix}>{prefix}</Text>
          <TextInput
            style={[styles.inputInline, styles.inputSingle]}
            placeholderTextColor={BODY_COLOR}
            multiline={false}
            accessibilityLabel={accessibilityLabel}
            showSoftInputOnFocus={true}
            {...inputProps}
            {...focusProps}
          />
        </View>
      ) : (
        <TextInput
          style={[
            styles.input,
            isSingle && styles.inputSingle,
            { borderColor },
            hasError ? styles.inputError : undefined,
          ]}
          placeholderTextColor={BODY_COLOR}
          multiline={!isSingle}
          {...(isSingle
            ? {}
            : { textAlignVertical: 'top' as const })}
          accessibilityLabel={accessibilityLabel}
          showSoftInputOnFocus={true}
          {...inputProps}
          {...focusProps}
        />
      )}
      {errorContent ? (
        <View style={styles.errorWrap}>{errorContent}</View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
      {hint && !hasError ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: LABEL_COLOR,
  },
  wordCount: {
    fontSize: 12,
    color: BODY_COLOR,
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: INPUT_TEXT_COLOR,
    minHeight: 100,
  },
  inputSingle: {
    minHeight: SINGLE_LINE_MIN_HEIGHT,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS,
    minHeight: SINGLE_LINE_MIN_HEIGHT,
    backgroundColor: '#FFFFFF',
  },
  prefix: {
    fontSize: 16,
    fontWeight: '500',
    color: LABEL_COLOR,
    paddingLeft: 16,
    marginRight: 6,
  },
  inputInline: {
    flex: 1,
    fontSize: 16,
    color: INPUT_TEXT_COLOR,
    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 0,
  },
  inputError: {
    borderColor: ERROR_COLOR,
  },
  errorWrap: {
    marginTop: 6,
  },
  error: {
    fontSize: 12,
    color: ERROR_COLOR,
    marginTop: 6,
  },
  hint: {
    fontSize: 12,
    color: BODY_COLOR,
    marginTop: 6,
  },
});
