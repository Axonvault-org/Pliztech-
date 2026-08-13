import { Redirect, useLocalSearchParams } from 'expo-router';

function firstQuery(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim();
  }
  return undefined;
}

export default function LegacyCommunityPulseRedirect() {
  const params = useLocalSearchParams<{
    tx_ref?: string;
    reference?: string;
    trxref?: string;
    transaction_id?: string;
    status?: string;
  }>();

  return (
    <Redirect
      href={{
        pathname: '/(tabs)/community-purse',
        params: {
          tx_ref: firstQuery(params.tx_ref),
          reference: firstQuery(params.reference),
          trxref: firstQuery(params.trxref),
          transaction_id: firstQuery(params.transaction_id),
          status: firstQuery(params.status),
        },
      }}
    />
  );
}
