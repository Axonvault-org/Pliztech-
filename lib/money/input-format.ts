export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatAmountInput(value: string): string {
  const digits = digitsOnly(value);
  if (!digits) return '';
  return Number(digits).toLocaleString('en-NG');
}

export function parseFormattedAmount(value: string): number {
  const digits = digitsOnly(value);
  return digits ? Number(digits) : 0;
}
