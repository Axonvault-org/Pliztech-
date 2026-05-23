import { formatBegCreatedTimeAgo } from '@/lib/api/beg';

export function formatWithdrawalNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString()}`;
}

export function maskAccountNumber(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  return `•••• ${digits.slice(-4)}`;
}

export function formatWithdrawalDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatWithdrawalTimeAgo(iso: string): string {
  return formatBegCreatedTimeAgo(iso);
}

export type WithdrawalStatusUi = {
  label: string;
  color: string;
  backgroundColor: string;
};

export function withdrawalStatusUi(status: string): WithdrawalStatusUi {
  switch (status) {
    case 'completed':
      return { label: 'Successful', color: '#047857', backgroundColor: '#D1FAE5' };
    case 'pending':
    case 'processing':
      return { label: 'Processing', color: '#D97706', backgroundColor: '#FEF3C7' };
    case 'failed':
      return { label: 'Failed', color: '#B91C1C', backgroundColor: '#FEE2E2' };
    case 'on_hold':
      return { label: 'On hold', color: '#B45309', backgroundColor: '#FFEDD5' };
    case 'rejected':
      return { label: 'Rejected', color: '#B91C1C', backgroundColor: '#FEE2E2' };
    default:
      return {
        label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        color: '#4B5563',
        backgroundColor: '#F3F4F6',
      };
  }
}
