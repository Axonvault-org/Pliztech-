import { type Href } from 'expo-router';

/** Open transaction PIN from withdraw step 3; return replaces back to confirm step. */
export const WITHDRAWAL_PIN_RETURN_TO = 'withdraw';

const TRANSACTION_PIN_PATH = '/(tabs)/transaction-pin';
const WITHDRAW_FUNDS_PATH = '/(tabs)/withdraw-funds';

export function isWithdrawalPinFlow(returnTo: string | undefined): boolean {
  return returnTo === WITHDRAWAL_PIN_RETURN_TO;
}

export function transactionPinHrefForWithdrawal(params: {
  begId: string;
  amount: string;
  bankAccountId: string;
}): Href {
  return {
    pathname: TRANSACTION_PIN_PATH,
    params: {
      returnTo: WITHDRAWAL_PIN_RETURN_TO,
      step: '3',
      begId: params.begId,
      amount: params.amount,
      bankAccountId: params.bankAccountId,
    },
  } as Href;
}

export function withdrawFundsStep3Href(params: {
  begId: string;
  amount: string;
  bankAccountId: string;
  pinCreated?: boolean;
}): Href {
  return {
    pathname: WITHDRAW_FUNDS_PATH,
    params: {
      step: '3',
      begId: params.begId,
      amount: params.amount,
      bankAccountId: params.bankAccountId,
      ...(params.pinCreated ? { pinCreated: '1' } : {}),
    },
  } as Href;
}
