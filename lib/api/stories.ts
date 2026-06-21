import { apiUrl } from '@/constants/api';
import { isWebAuthEnvironment } from '@/lib/auth/web-auth';

import { apiFailureFromResponseJson, PlizApiError } from './types';

export type StoryAuthor = {
  username: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  isAnonymous: boolean;
};

export type StoryItem = {
  id: string;
  content: string;
  isApproved: boolean;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  user: StoryAuthor;
};

export type StoriesFeedResult = {
  stories: StoryItem[];
  pagination?: { page: number; limit: number; total: number; pages: number };
};

export type StoryStatus = {
  hasUnseenStories: boolean;
  latestStoryId: string | null;
  latestStoryCreatedAt: string | null;
  lastSeenStoryAt: string | null;
};

/**
 * GET /api/stories — approved community stories (Bearer).
 */
export async function getStoriesFeed(
  accessToken: string,
  options?: { page?: number; limit?: number }
): Promise<StoriesFeedResult> {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });

  const res = await fetch(`${apiUrl('/api/stories')}?${params}`, {
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
    errors?: { field: string; message: string }[];
    data?: { stories?: StoryItem[]; total?: number; pages?: number };
  };

  if (!res.ok || data.success !== true) {
    throw apiFailureFromResponseJson(json, res.status);
  }

  const raw = data.data;
  if (!raw?.stories) {
    return { stories: [] };
  }
  return {
    stories: raw.stories,
    pagination: {
      page,
      limit,
      total: raw.total ?? raw.stories.length,
      pages: raw.pages ?? 1,
    },
  };
}

/**
 * POST /api/stories — submit story (max 60 words server-side).
 */
export type CreateStoryResult = {
  story: { id: string; content: string };
  /** Top-level API message from backend (e.g. submission confirmation). */
  message: string;
};

export async function createStory(
  accessToken: string,
  body: { content: string }
): Promise<CreateStoryResult> {
  const res = await fetch(apiUrl('/api/stories'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
    body: JSON.stringify({ content: body.content }),
  });

  const text = await res.text();
  let json: unknown = {};
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      throw new PlizApiError('Invalid response from server', res.status);
    }
  }

  const data = json as {
    success?: boolean;
    message?: string;
    errors?: { field: string; message: string }[];
    data?: { story: { id: string; content: string } };
  };

  if (!res.ok || data.success !== true) {
    throw apiFailureFromResponseJson(json, res.status);
  }

  if (!data.data?.story) {
    throw new PlizApiError(
      data.message ?? 'Unexpected response from server',
      res.status
    );
  }

  return {
    story: data.data.story,
    message: (data.message ?? 'Story submitted.').trim() || 'Story submitted.',
  };
}

export async function getStoryStatus(accessToken: string): Promise<StoryStatus> {
  const res = await fetch(apiUrl('/api/stories/status'), {
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
    data?: Partial<StoryStatus>;
  };

  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }

  return {
    hasUnseenStories: Boolean(data.data.hasUnseenStories),
    latestStoryId: data.data.latestStoryId ?? null,
    latestStoryCreatedAt: data.data.latestStoryCreatedAt ?? null,
    lastSeenStoryAt: data.data.lastSeenStoryAt ?? null,
  };
}

export async function markStoriesSeen(accessToken: string): Promise<StoryStatus> {
  const res = await fetch(apiUrl('/api/stories/mark-seen'), {
    method: 'POST',
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
    data?: Partial<StoryStatus>;
  };

  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }

  return {
    hasUnseenStories: Boolean(data.data.hasUnseenStories),
    latestStoryId: data.data.latestStoryId ?? null,
    latestStoryCreatedAt: data.data.latestStoryCreatedAt ?? null,
    lastSeenStoryAt: data.data.lastSeenStoryAt ?? null,
  };
}
