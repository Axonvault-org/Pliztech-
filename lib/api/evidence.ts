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
  isFlagged?: boolean;
  isSensitive?: boolean;
  sensitiveReason?: string | null;
  adminVisibility?: boolean | null;
  shouldBlur?: boolean;
};

export type EvidenceUploadFile = {
  uri: string;
  name: string;
  type: string;
  file?: File;
  isSensitive?: boolean;
  sensitiveReason?: string;
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

  if (isWebAuthEnvironment()) {
    if (file.file) {
      body.append('evidence', file.file, file.name);
    } else {
      const blob = await fetch(file.uri).then((response) => response.blob());
      body.append('evidence', blob, file.name);
    }
  } else {
    body.append('evidence', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
  }

  if (file.isSensitive) {
    body.append('isSensitive', 'true');
    if (file.sensitiveReason?.trim()) {
      body.append('sensitiveReason', file.sensitiveReason.trim());
    }
  }

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

export async function updateEvidenceSensitivity(
  accessToken: string,
  begId: string,
  evidenceId: string,
  isSensitive: boolean,
  sensitiveReason?: string
): Promise<BegEvidenceItem> {
  const res = await fetch(
    apiUrl(
      `/api/begs/${encodeURIComponent(begId)}/evidence/${encodeURIComponent(evidenceId)}/sensitivity`
    ),
    {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: isWebAuthEnvironment() ? 'include' : 'omit',
      body: JSON.stringify({
        isSensitive,
        ...(sensitiveReason?.trim() ? { sensitiveReason: sensitiveReason.trim() } : {}),
      }),
    }
  );

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as { success?: boolean; data?: BegEvidenceItem };
  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }

  return data.data;
}
