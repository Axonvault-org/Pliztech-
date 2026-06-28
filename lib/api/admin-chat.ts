import { apiUrl } from '@/constants/api';
import { isWebAuthEnvironment } from '@/lib/auth/web-auth';

import { apiFailureFromResponseJson, PlizApiError } from './types';

export type AdminChatMessage = {
  id: string;
  chatId: string;
  senderType: 'admin' | 'user';
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

export type AdminChatLastMessage = {
  content: string;
  senderType: 'admin' | 'user';
  createdAt: string;
};

export type AdminChatSummary = {
  id: string;
  status: string;
  user?: { id: string; name: string; isOnline?: boolean };
  admin: { id: string; name: string };
  lastMessage?: AdminChatLastMessage | null;
  messages?: AdminChatMessage[];
  unreadCount?: number;
  createdAt?: string;
  updatedAt: string;
};

export type AdminBroadcast = {
  id: string;
  title: string;
  content: string;
  adminName: string;
  createdAt: string;
  hasReplied?: boolean;
  isUnread?: boolean;
  myReply?: {
    id: string;
    content: string;
    createdAt: string;
  } | null;
};

export type AdminBroadcastReply = {
  id: string;
  broadcastId: string;
  content: string;
  createdAt: string;
  userName?: string;
};

export type SupportUnreadCount = {
  chatUnread: number;
  broadcastUnread: number;
  total: number;
};

async function authFetch(accessToken: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
  });
}

export async function getUserAdminChats(accessToken: string): Promise<AdminChatSummary[]> {
  const res = await authFetch(accessToken, '/api/chat/admin');
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }
  const data = json as { success?: boolean; data?: AdminChatSummary[] | { chats?: AdminChatSummary[] } };
  if (!res.ok || data.success !== true) {
    throw apiFailureFromResponseJson(json, res.status);
  }
  if (Array.isArray(data.data)) return data.data;
  if (data.data && Array.isArray((data.data as { chats?: AdminChatSummary[] }).chats)) {
    return (data.data as { chats: AdminChatSummary[] }).chats;
  }
  return [];
}

export async function getUserChatMessages(
  accessToken: string,
  chatId: string,
  page = 1,
  limit = 50
): Promise<{ messages: AdminChatMessage[]; total: number; pages: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await authFetch(
    accessToken,
    `/api/chat/admin/${encodeURIComponent(chatId)}/messages?${params}`
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }
  const data = json as {
    success?: boolean;
    data?: { messages?: AdminChatMessage[]; total?: number; pages?: number };
  };
  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }
  return {
    messages: Array.isArray(data.data.messages) ? data.data.messages : [],
    total: data.data.total ?? 0,
    pages: data.data.pages ?? 1,
  };
}

export async function sendUserChatMessage(
  accessToken: string,
  chatId: string,
  content: string
): Promise<AdminChatMessage> {
  const res = await authFetch(accessToken, `/api/chat/admin/${encodeURIComponent(chatId)}/message`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }
  const data = json as { success?: boolean; data?: AdminChatMessage };
  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }
  return data.data;
}

export async function getUserBroadcasts(
  accessToken: string,
  page = 1,
  limit = 20
): Promise<{ broadcasts: AdminBroadcast[]; total: number; pages: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const res = await authFetch(accessToken, `/api/chat/broadcasts?${params}`);
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }
  const data = json as {
    success?: boolean;
    data?: { broadcasts?: AdminBroadcast[]; total?: number; pages?: number };
  };
  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }
  return {
    broadcasts: Array.isArray(data.data.broadcasts) ? data.data.broadcasts : [],
    total: data.data.total ?? 0,
    pages: data.data.pages ?? 1,
  };
}

export async function getSupportUnreadCount(accessToken: string): Promise<SupportUnreadCount> {
  const res = await authFetch(accessToken, '/api/chat/support-unread-count');
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }
  const data = json as { success?: boolean; data?: SupportUnreadCount };
  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }
  return {
    chatUnread: data.data.chatUnread ?? 0,
    broadcastUnread: data.data.broadcastUnread ?? 0,
    total: data.data.total ?? 0,
  };
}

export async function getUserBroadcast(
  accessToken: string,
  broadcastId: string
): Promise<AdminBroadcast> {
  const res = await authFetch(
    accessToken,
    `/api/chat/broadcasts/${encodeURIComponent(broadcastId)}`
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }
  const data = json as { success?: boolean; data?: AdminBroadcast };
  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }
  return data.data;
}

export async function markBroadcastRead(
  accessToken: string,
  broadcastId: string
): Promise<void> {
  const res = await authFetch(
    accessToken,
    `/api/chat/broadcasts/${encodeURIComponent(broadcastId)}/read`,
    { method: 'PATCH' }
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }
  const data = json as { success?: boolean };
  if (!res.ok || data.success !== true) {
    throw apiFailureFromResponseJson(json, res.status);
  }
}

export async function replyToBroadcast(
  accessToken: string,
  broadcastId: string,
  content: string
): Promise<AdminBroadcastReply> {
  const res = await authFetch(
    accessToken,
    `/api/chat/broadcasts/${encodeURIComponent(broadcastId)}/reply`,
    {
      method: 'POST',
      body: JSON.stringify({ content }),
    }
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new PlizApiError('Invalid response from server', res.status);
  }
  const data = json as { success?: boolean; data?: AdminBroadcastReply };
  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }
  return data.data;
}
