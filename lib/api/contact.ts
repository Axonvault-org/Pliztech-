import { apiUrl } from '@/constants/api';

import { apiFailureFromResponseJson, PlizApiError } from './types';

export type ContactInfo = {
  appName: string;
  support: {
    email: string;
    responseTime: string;
  };
  reportAbuse: {
    email: string;
    description: string;
    responseTime: string;
  };
  legal: {
    termsOfService: string;
    privacyPolicy: string;
    communityGuidelines: string;
  };
  social: {
    twitter: string;
    instagram: string;
  };
  address: {
    company: string;
    country: string;
  };
};

export async function getContactInfo(): Promise<ContactInfo> {
  const res = await fetch(apiUrl('/api/contact'), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as { success?: boolean; data?: ContactInfo };
  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }

  return data.data;
}
