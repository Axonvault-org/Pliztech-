import { useEffect, useRef, useState } from 'react';

import { FormTextInput } from '@/components/FormTextInput';
import {
  displayDobFromIso,
  formatDobInput,
  isoDobFromDisplay,
} from '@/lib/form/date-of-birth';

type DateOfBirthPickerProps = {
  label?: string;
  value: string;
  onChange: (isoDate: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
};

export function DateOfBirthPicker({
  label = 'Date of birth',
  value,
  onChange,
  error,
  hint,
  disabled = false,
}: DateOfBirthPickerProps) {
  const [display, setDisplay] = useState(() => displayDobFromIso(value));
  const isFocusedRef = useRef(false);
  const prevDigitsRef = useRef('');

  useEffect(() => {
    if (isFocusedRef.current) return;
    const nextDisplay = displayDobFromIso(value);
    setDisplay(nextDisplay);
    prevDigitsRef.current = nextDisplay.replace(/\D/g, '');
  }, [value]);

  const handleChange = (text: string) => {
    const formatted = formatDobInput(text, prevDigitsRef.current);
    prevDigitsRef.current = formatted.replace(/\D/g, '');
    setDisplay(formatted);
    onChange(isoDobFromDisplay(formatted) ?? '');
  };

  return (
    <FormTextInput
      label={label}
      placeholder="DD/MM/YYYY"
      value={display}
      onChangeText={handleChange}
      onFocus={() => {
        isFocusedRef.current = true;
        prevDigitsRef.current = display.replace(/\D/g, '');
      }}
      onBlur={() => {
        isFocusedRef.current = false;
      }}
      keyboardType="number-pad"
      maxLength={10}
      hint={hint}
      error={error}
      editable={!disabled}
      accessibilityLabel={label}
    />
  );
}
