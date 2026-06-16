import { apiUrl } from '@/constants/api';
import { isWebAuthEnvironment } from '@/lib/auth/web-auth';

import { apiFailureFromResponseJson, PlizApiError } from './types';

export type BegEvidenceItem = {
  id: string;
  fileType: 'photo' | 'pdf' | string;
  fileName: string;
  fileSize: number;
  url: string | null;
  createdAt: string;
};

export type EvidenceUploadFile = {
  uri: string;
  name: string;
  type: string;
};

export async function getBegEvidence(
  accessToken: string,
  begId: string
): Promise<BegEvidenceItem[]> {
  const res = await fetch(apiUrl(`/api/begs/${encodeURIComponent(begId)}/evidence`), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as {
    success?: boolean;
    data?: { evidence?: BegEvidenceItem[] };
  };

  if (!res.ok || data.success !== true) {
    throw apiFailureFromResponseJson(json, res.status);
  }

  return Array.isArray(data.data?.evidence) ? data.data.evidence : [];
}

export async function uploadBegEvidence(
  accessToken: string,
  begId: string,
  file: EvidenceUploadFile
): Promise<BegEvidenceItem> {
  const body = new FormData();
  body.append('evidence', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);

  const res = await fetch(apiUrl(`/api/begs/${encodeURIComponent(begId)}/evidence`), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
    body,
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as {
    success?: boolean;
    data?: BegEvidenceItem;
  };

  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }

  return data.data;
}

export async function deleteBegEvidence(
  accessToken: string,
  begId: string,
  evidenceId: string
): Promise<void> {
  const res = await fetch(
    apiUrl(`/api/begs/${encodeURIComponent(begId)}/evidence/${encodeURIComponent(evidenceId)}`),
    {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: isWebAuthEnvironment() ? 'include' : 'omit',
    }
  );

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    if (!res.ok) throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as { success?: boolean } | null;
  if (!res.ok || data?.success === false) {
    throw apiFailureFromResponseJson(json, res.status);
  }
}
