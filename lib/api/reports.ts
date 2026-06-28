import { apiUrl } from '@/constants/api';
import { isWebAuthEnvironment } from '@/lib/auth/web-auth';

import { apiFailureFromResponseJson, PlizApiError } from './types';

export const REPORT_CATEGORIES = [
  'spam',
  'sexual_content',
  'hate_speech',
  'violence',
  'fraud',
  'harassment',
  'other',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export type ReportContentBody = {
  category: ReportCategory;
  reason: string;
};

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  spam: 'Spam',
  sexual_content: 'Sexual content',
  hate_speech: 'Hate speech',
  violence: 'Violence',
  fraud: 'Fraud or scam',
  harassment: 'Harassment',
  other: 'Other',
};

async function postReport(
  accessToken: string,
  path: string,
  body: ReportContentBody
): Promise<{ id: string }> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
    body: JSON.stringify(body),
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as { success?: boolean; data?: { id?: string } };
  if (!res.ok || data.success !== true || !data.data?.id) {
    throw apiFailureFromResponseJson(json, res.status);
  }

  return { id: data.data.id };
}

export function reportBeg(
  accessToken: string,
  begId: string,
  body: ReportContentBody
): Promise<{ id: string }> {
  return postReport(accessToken, `/api/reports/beg/${encodeURIComponent(begId)}`, body);
}

export function reportUser(
  accessToken: string,
  userId: string,
  body: ReportContentBody
): Promise<{ id: string }> {
  return postReport(accessToken, `/api/reports/user/${encodeURIComponent(userId)}`, body);
}

export function reportStory(
  accessToken: string,
  storyId: string,
  body: ReportContentBody
): Promise<{ id: string }> {
  return postReport(accessToken, `/api/reports/story/${encodeURIComponent(storyId)}`, body);
}
