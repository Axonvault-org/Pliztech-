import { apiUrl } from '@/constants/api';
import { isWebAuthEnvironment } from '@/lib/auth/web-auth';

import { PlizApiError } from './types';

export type KycVerificationType = 'nin' | 'passport';
export type KycVerificationStatus =
  | 'pending'
  | 'document_uploaded'
  | 'liveness_passed'
  | 'under_review'
  | 'verified'
  | 'rejected';

export type KycVerificationRecord = {
  userId: string;
  verificationType: KycVerificationType | null;
  status: KycVerificationStatus;
  isVerified: boolean;
  phoneVerified: boolean;
  documentVerified: boolean;
  faceLivenessPassed: boolean;
  faceLivenessScore: number | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  attemptCount: number;
  attemptsRemaining: number;
  canRetry: boolean;
  createdAt: string;
  updatedAt: string;
};

export type KycStep = {
  step: number;
  label: string;
  completed: boolean;
  description: string;
};

export type KycUiMessage = {
  title: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
};

export type KycStatusPayload = {
  verification: KycVerificationRecord | null;
  phoneNumber: string | null;
  steps: KycStep[];
  attemptsRemaining: number;
  canRetry: boolean;
  ui: KycUiMessage;
};

export type KycDocumentUploadBase = {
  verificationType: KycVerificationType;
  documentType: 'nin_front' | 'nin_back' | 'passport_biodata';
  file: {
    uri: string;
    name: string;
    type: string;
  };
};

export type KycNinDocumentUpload = KycDocumentUploadBase & {
  verificationType: 'nin';
  documentType: 'nin_front' | 'nin_back';
  nin: string;
  ninDocumentType: 'slip' | 'card';
  ninMiddleName?: string;
  ninStateOfOrigin: string;
  ninLGA: string;
  ninEnrollmentDate: string;
};

export type KycPassportDocumentUpload = KycDocumentUploadBase & {
  verificationType: 'passport';
  documentType: 'passport_biodata';
  passportMiddleName?: string;
  passportNumber: string;
  passportPlaceOfBirth: string;
  passportIssueDate: string;
  passportExpiry: string;
  passportPlaceOfIssue: string;
};

export type KycDocumentUploadBody = KycNinDocumentUpload | KycPassportDocumentUpload;

function authHeaders(accessToken: string): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

/**
 * GET /api/kyc/status
 */
export async function getKycStatus(accessToken: string): Promise<KycStatusPayload> {
  const res = await fetch(apiUrl('/api/kyc/status'), {
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
    message?: string;
    data?: KycStatusPayload;
  };

  if (!res.ok || data.success !== true || !data.data) {
    throw new PlizApiError(data.message ?? `Request failed (${res.status})`, res.status);
  }

  return data.data;
}

/**
 * POST /api/kyc/phone/send-otp
 */
export async function sendKycPhoneOtp(accessToken: string): Promise<void> {
  const res = await fetch(apiUrl('/api/kyc/phone/send-otp'), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({}),
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as { success?: boolean; message?: string };

  if (!res.ok || data.success !== true) {
    throw new PlizApiError(data.message ?? `Request failed (${res.status})`, res.status);
  }
}

/**
 * POST /api/kyc/phone/resend-otp
 */
export async function resendKycPhoneOtp(accessToken: string): Promise<void> {
  const res = await fetch(apiUrl('/api/kyc/phone/resend-otp'), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({}),
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as { success?: boolean; message?: string };

  if (!res.ok || data.success !== true) {
    throw new PlizApiError(data.message ?? `Request failed (${res.status})`, res.status);
  }
}

/**
 * POST /api/kyc/phone/verify-otp
 */
export async function verifyKycPhoneOtp(accessToken: string, otp: string): Promise<void> {
  const res = await fetch(apiUrl('/api/kyc/phone/verify-otp'), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ otp: otp.trim() }),
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }

  const data = json as { success?: boolean; message?: string };

  if (!res.ok || data.success !== true) {
    throw new PlizApiError(data.message ?? `Request failed (${res.status})`, res.status);
  }
}

function appendIfPresent(form: FormData, key: string, value: string | undefined): void {
  const trimmed = value?.trim();
  if (trimmed) form.append(key, trimmed);
}

/**
 * POST /api/kyc/document/upload — upload NIN/passport scan.
 */
export async function uploadKycDocument(
  accessToken: string,
  body: KycDocumentUploadBody
): Promise<KycVerificationRecord> {
  const form = new FormData();
  form.append('document', body.file as unknown as Blob);
  form.append('verificationType', body.verificationType);
  form.append('documentType', body.documentType);

  if (body.verificationType === 'nin') {
    form.append('nin', body.nin.trim());
    form.append('ninDocumentType', body.ninDocumentType);
    appendIfPresent(form, 'ninMiddleName', body.ninMiddleName);
    form.append('ninStateOfOrigin', body.ninStateOfOrigin.trim());
    form.append('ninLGA', body.ninLGA.trim());
    form.append('ninEnrollmentDate', body.ninEnrollmentDate.trim());
  } else {
    appendIfPresent(form, 'passportMiddleName', body.passportMiddleName);
    form.append('passportNumber', body.passportNumber.trim().toUpperCase());
    form.append('passportPlaceOfBirth', body.passportPlaceOfBirth.trim());
    form.append('passportIssueDate', body.passportIssueDate.trim());
    form.append('passportExpiry', body.passportExpiry.trim());
    form.append('passportPlaceOfIssue', body.passportPlaceOfIssue.trim());
  }

  const res = await fetch(apiUrl('/api/kyc/document/upload'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
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
    message?: string;
    data?: { verification: KycVerificationRecord };
  };

  if (!res.ok || data.success !== true || !data.data?.verification) {
    throw new PlizApiError(data.message ?? `Request failed (${res.status})`, res.status);
  }

  return data.data.verification;
}

/**
 * POST /api/kyc/face-liveness — submit selfie image as base64.
 */
export async function verifyKycFaceLiveness(
  accessToken: string,
  imageBase64: string
): Promise<{ passed: boolean; score?: number }> {
  const res = await fetch(apiUrl('/api/kyc/face-liveness'), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ image: imageBase64 }),
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
    message?: string;
    data?: { passed: boolean; score?: number };
  };

  if (!res.ok || data.success !== true || !data.data) {
    throw new PlizApiError(data.message ?? `Request failed (${res.status})`, res.status);
  }

  return data.data;
}

/**
 * POST /api/kyc/submit — final identity submission after document + liveness.
 */
export async function submitKyc(accessToken: string): Promise<KycVerificationRecord> {
  const res = await fetch(apiUrl('/api/kyc/submit'), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({}),
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
    message?: string;
    data?: KycVerificationRecord | { verification?: KycVerificationRecord };
  };

  const verification =
    data.data && 'verification' in data.data
      ? data.data.verification
      : (data.data as KycVerificationRecord | undefined);

  if (!res.ok || data.success !== true || !verification) {
    throw new PlizApiError(data.message ?? `Request failed (${res.status})`, res.status);
  }

  return verification;
}

/**
 * PUT /api/kyc/update — reset rejected KYC so the user can resubmit.
 */
export async function resetKycAfterRejection(accessToken: string): Promise<KycVerificationRecord> {
  const res = await fetch(apiUrl('/api/kyc/update'), {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify({}),
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
    message?: string;
    data?: KycVerificationRecord | { verification?: KycVerificationRecord };
  };

  const verification =
    data.data && 'verification' in data.data
      ? data.data.verification
      : (data.data as KycVerificationRecord | undefined);

  if (!res.ok || data.success !== true || !verification) {
    throw new PlizApiError(data.message ?? `Request failed (${res.status})`, res.status);
  }

  return verification;
}
