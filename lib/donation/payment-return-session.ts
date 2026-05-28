/** Survives expo-router param updates when the payment deep link returns. */
const activeCheckoutReferences = new Set<string>();

export function markPaymentCheckoutActive(reference: string): void {
  const ref = reference.trim();
  if (ref) activeCheckoutReferences.add(ref);
}

export function markPaymentCheckoutInactive(reference: string): void {
  const ref = reference.trim();
  if (ref) activeCheckoutReferences.delete(ref);
}

export function isPaymentCheckoutActive(reference: string): boolean {
  return activeCheckoutReferences.has(reference.trim());
}
