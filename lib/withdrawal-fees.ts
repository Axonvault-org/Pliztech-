/**
 * Mirrors `WithdrawalService.calculateFees` in pliz-backend (keep in sync).
 * COMPANY_FEE_RATE = 0.07, VAT_RATE = 0.075 of the company/platform fee.
 */
export const PLATFORM_FEE_PERCENT = 7;
export const VAT_ON_PLATFORM_FEE_PERCENT = 7.5;

export function calculateWithdrawalFeesDisplay(amountRaised: number): {
  amountRaised: number;
  companyFee: number;
  vatFee: number;
  totalFees: number;
  amountToReceive: number;
} {
  const rounded = Math.max(0, amountRaised);
  const companyFee = Math.round(rounded * 0.07 * 100) / 100;
  const vatFee = Math.round(companyFee * 0.075 * 100) / 100;
  const totalFees = companyFee + vatFee;
  const amountToReceive = rounded - totalFees;
  return {
    amountRaised: rounded,
    companyFee,
    vatFee,
    totalFees,
    amountToReceive,
  };
}

export function getPlatformFee(amount: number): number {
  return calculateWithdrawalFeesDisplay(amount).companyFee;
}

export function getVatOnPlatformFee(amount: number): number {
  return calculateWithdrawalFeesDisplay(amount).vatFee;
}

export function getRequestReceives(amount: number): number {
  return calculateWithdrawalFeesDisplay(amount).amountToReceive;
}
