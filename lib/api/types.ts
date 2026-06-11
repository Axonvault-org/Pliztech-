/** Standard API error item (validation) */
export type ApiErrorItem = {
  field: string;
  message: string;
};

/** Parsed failure from Plz API */
export class PlizApiError extends Error {
  readonly status: number;
  readonly errors: ApiErrorItem[];

  constructor(
    message: string,
    status: number,
    errors: ApiErrorItem[] = []
  ) {
    super(message);
    this.name = 'PlizApiError';
    this.status = status;
    this.errors = errors;
  }
}

/** Normalize validation / error items from API JSON. */
function normalizeApiErrorItems(raw: unknown): ApiErrorItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ApiErrorItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const m = row.message;
    if (typeof m !== 'string' || !m.trim()) continue;
    const f = row.field;
    out.push({
      field: typeof f === 'string' ? f : '',
      message: m.trim(),
    });
  }
  return out;
}

/**
 * Build `PlizApiError` from a failed API JSON body (`message`, optional `errors`, optional `error`).
 */
export function apiFailureFromResponseJson(json: unknown, httpStatus: number): PlizApiError {
  const fallback = `Request failed (${httpStatus})`;
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return new PlizApiError(fallback, httpStatus);
  }
  const o = json as Record<string, unknown>;

  let message = '';
  if (typeof o.message === 'string' && o.message.trim()) {
    message = o.message.trim();
  } else if (typeof o.error === 'string' && o.error.trim()) {
    message = o.error.trim();
  } else if (o.error && typeof o.error === 'object' && o.error !== null) {
    const inner = o.error as Record<string, unknown>;
    if (typeof inner.message === 'string' && inner.message.trim()) {
      message = inner.message.trim();
    }
  }

  const errors = normalizeApiErrorItems(o.errors);
  return new PlizApiError(message || fallback, httpStatus, errors);
}

function formatPlizApiMessageBody(message: string, errors: ApiErrorItem[]): string {
  const lines: string[] = [];
  if (message.trim()) lines.push(message.trim());
  if (errors.length > 0) {
    lines.push(
      errors.map((x) => (x.field ? `${x.field}: ${x.message}` : x.message)).join('\n')
    );
  }
  return lines.join('\n\n').trim() || 'Request failed';
}

function userSafeApiMessage(message: string, status?: number): string {
  const trimmed = message.trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed) return 'Something went wrong. Please try again.';

  if (
    normalized.includes('low balance') ||
    normalized.includes('fund your wallet') ||
    normalized.includes('sendchamp') ||
    normalized.includes('prembly') ||
    normalized.includes('supabase') ||
    normalized.includes('row-level security') ||
    normalized.includes('violates row-level') ||
    normalized.includes('api key') ||
    normalized.includes('secret') ||
    normalized.includes('provider') ||
    normalized.includes('database') ||
    normalized.includes('prisma') ||
    normalized.includes('cannot read properties') ||
    normalized.includes('undefined') ||
    normalized.includes('null') ||
    normalized.includes('stack') ||
    normalized.includes('internal server') ||
    normalized.includes('failed to send otp')
  ) {
    return 'We could not complete this request right now. Please try again later.';
  }

  if (typeof status === 'number' && status >= 500) {
    return 'We could not complete this request right now. Please try again later.';
  }

  return trimmed;
}

function formatSafePlizApiMessageBody(
  message: string,
  errors: ApiErrorItem[],
  status?: number
): string {
  const safeMessage = userSafeApiMessage(message, status);
  const safeErrors = errors
    .map((item) => ({
      ...item,
      message: userSafeApiMessage(item.message, status),
    }))
    .filter((item) => item.message);

  return formatPlizApiMessageBody(safeMessage, safeErrors);
}

/**
 * Generic copy for login / OAuth failures (hides deleted-account and other auth details).
 */
export function formatLoginErrorForUser(error: unknown): string {
  const message = formatPlizApiErrorForUser(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes('account has been deleted') ||
    normalized.includes('account was used for a deleted account') ||
    normalized.includes('account_deleted')
  ) {
    return 'Invalid email or password';
  }

  return message;
}

/**
 * Single string for Alerts / banners: top-level `message` plus validation `errors` from the API.
 */
export function formatPlizApiErrorForUser(error: unknown): string {
  if (error instanceof PlizApiError) {
    return formatSafePlizApiMessageBody(error.message, error.errors, error.status);
  }
  // Metro can load duplicate class instances so `instanceof` may fail; duck-type API errors.
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === 'string') {
      const status = (error as { status?: unknown }).status;
      const errs =
        'errors' in error && Array.isArray((error as { errors: unknown }).errors)
          ? normalizeApiErrorItems((error as { errors: unknown[] }).errors)
          : [];
      if (typeof status === 'number') {
        return formatSafePlizApiMessageBody(msg, errs, status);
      }
      if (errs.length > 0) {
        return formatSafePlizApiMessageBody(msg, errs);
      }
      if (msg.trim()) return userSafeApiMessage(msg);
    }
  }
  if (error instanceof Error) return userSafeApiMessage(error.message);
  return 'Something went wrong. Please try again.';
}

export type SignupRequestBody = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type SignupUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  emailVerifiedAt: string | null;
  isProfileComplete: boolean;
  isSuspended: boolean;
  isUnderInvestigation: boolean;
  createdAt: string;
  updatedAt: string;
  /** Present when API returns OAuth metadata (e.g. Google / Apple login) */
  authProvider?: string | null;
  avatar?: string | null;
};

export type SignupSuccessResponse = {
  success: true;
  message: string;
  data: {
    user: SignupUser;
  };
};

export type SignupErrorResponse = {
  success: false;
  message: string;
  errors?: ApiErrorItem[];
};

/** POST /api/auth/profile/complete — matches pliz-backend `completeProfile` */
export type CompleteProfileBody = {
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName?: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  phoneNumber: string;
  state: string;
  city: string;
  address?: string;
  agreeToTerms: boolean;
  isAnonymous?: boolean;
};

export type CompletedProfile = {
  firstName: string;
  middleName: string | null;
  lastName: string;
  displayName: string | null;
  dateOfBirth?: string;
  gender?: string;
  phoneNumber: string;
  state?: string;
  city?: string;
  address?: string | null;
  isAnonymous: boolean;
};

/** PUT /api/auth/profile */
export type UpdateProfileBody = {
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  phoneNumber?: string;
  displayName?: string | null;
  state?: string;
  city?: string;
  address?: string | null;
  isAnonymous?: boolean;
};

export type UpdatedProfilePayload = {
  firstName: string;
  middleName: string | null;
  lastName: string;
  phoneNumber: string;
  displayName: string | null;
  state?: string;
  city?: string;
  address?: string | null;
  isAnonymous: boolean;
};

export type LoginRequestBody = {
  email: string;
  password: string;
};

export type LoginUser = SignupUser;

export type LoginSuccessData = {
  user: LoginUser;
  accessToken: string;
  refreshToken: string;
};

/** POST /api/auth/google | /api/auth/apple — same tokens as password login + navigation hints */
export type OAuthLoginSuccessData = LoginSuccessData & {
  isNewUser: boolean;
  nextStep: 'complete_profile' | 'home';
};

/** Nested profile on User (GET /api/auth/me) — matches Prisma UserProfile JSON */
export type MeUserProfile = {
  userId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  phoneNumber: string;
  displayName: string | null;
  isAnonymous: boolean;
  agreeToTerms: boolean;
  /** Present when API returns location fields */
  state?: string | null;
  city?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** From GET /api/auth/me (`user_stats` + computed peopleHelped) */
export type MeUserStatsSummary = {
  totalDonated: number;
  totalReceived: number;
  requestsCount: number;
  /** Omitted on older API builds; treat as 0 */
  peopleHelped?: number;
  /** Distinct people helped via donations in the last 7 days */
  peopleHelpedThisWeek?: number;
};

/** Govt ID / NIN verification — returned when backend adds `verification` to GET /me */
export type MeUserVerification = {
  verificationType?: 'nin' | 'passport' | string | null;
  status?: string;
  isVerified?: boolean;
  phoneVerified?: boolean;
  documentVerified: boolean;
  faceLivenessPassed?: boolean;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  attemptCount?: number;
  updatedAt?: string;
};

export type MeUserAvatar = {
  avatarType: 'photo' | 'initials' | 'library' | string;
  avatarUrl: string | null;
  avatarColor: string | null;
  avatarLibraryId: string | null;
  displayUrl: string;
};

/** GET /api/auth/me — user includes profile when completed */
export type MeUser = SignupUser & {
  profile: MeUserProfile | null;
  stats?: MeUserStatsSummary | null;
  /** Present when API exposes UserVerification (NIN / passport / ID) */
  verification?: MeUserVerification | null;
  /** Present when API exposes UserAvatar */
  avatar?: MeUserAvatar | null;
};
