import { apiUrl } from '@/constants/api';
import { isWebAuthEnvironment } from '@/lib/auth/web-auth';

import { apiFailureFromResponseJson, PlizApiError } from './types';

export type AvatarType = 'photo' | 'initials' | 'library';

export type ProfilePicture = {
  userId: string;
  avatarType: AvatarType;
  avatarUrl: string | null;
  avatarColor: string | null;
  avatarLibraryId: string | null;
  displayUrl: string;
};

export type ProfilePictureOptions = {
  colors: string[];
  libraryAvatars: { id: string; url: string }[];
};

function authHeaders(accessToken: string): HeadersInit {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

function parsePicturePayload(json: unknown, status: number): ProfilePicture {
  const data = json as {
    success?: boolean;
    data?: ProfilePicture | { avatar?: ProfilePicture; profilePicture?: ProfilePicture };
  };

  let picture: ProfilePicture | undefined;
  if (data.data && 'displayUrl' in data.data) {
    picture = data.data;
  } else if (data.data && 'avatar' in data.data) {
    picture = data.data.avatar;
  } else if (data.data && 'profilePicture' in data.data) {
    picture = data.data.profilePicture;
  }

  if (data.success !== true || !picture) {
    throw apiFailureFromResponseJson(json, status);
  }

  return picture;
}

export async function getProfilePicture(accessToken: string): Promise<ProfilePicture> {
  const res = await fetch(apiUrl('/api/profile-picture'), {
    method: 'GET',
    headers: authHeaders(accessToken),
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
  });
  const json = await res.json().catch(() => {
    throw new PlizApiError('Invalid response from server', res.status);
  });
  return parsePicturePayload(json, res.status);
}

export async function getProfilePictureOptions(
  accessToken: string
): Promise<ProfilePictureOptions> {
  const res = await fetch(apiUrl('/api/profile-picture/options'), {
    method: 'GET',
    headers: authHeaders(accessToken),
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
  });
  const json = await res.json().catch(() => {
    throw new PlizApiError('Invalid response from server', res.status);
  });
  const data = json as { success?: boolean; data?: ProfilePictureOptions };
  if (!res.ok || data.success !== true || !data.data) {
    throw apiFailureFromResponseJson(json, res.status);
  }
  return data.data;
}

export async function uploadProfilePicture(
  accessToken: string,
  file: { uri: string; name: string; type: string }
): Promise<ProfilePicture> {
  const form = new FormData();
  if (isWebAuthEnvironment()) {
    const blob = await fetch(file.uri).then((response) => response.blob());
    form.append('avatar', blob, file.name);
  } else {
    form.append('avatar', file as unknown as Blob);
  }

  const res = await fetch(apiUrl('/api/profile-picture/upload'), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: form,
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
  });
  const json = await res.json().catch(() => {
    throw new PlizApiError('Invalid response from server', res.status);
  });
  return parsePicturePayload(json, res.status);
}

export async function setInitialsAvatar(
  accessToken: string,
  color: string
): Promise<ProfilePicture> {
  const res = await fetch(apiUrl('/api/profile-picture/avatar/initials'), {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
    body: JSON.stringify({ color }),
  });
  const json = await res.json().catch(() => {
    throw new PlizApiError('Invalid response from server', res.status);
  });
  return parsePicturePayload(json, res.status);
}

export async function setLibraryAvatar(
  accessToken: string,
  avatarId: string
): Promise<ProfilePicture> {
  const res = await fetch(apiUrl('/api/profile-picture/avatar/library'), {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
    body: JSON.stringify({ avatarId }),
  });
  const json = await res.json().catch(() => {
    throw new PlizApiError('Invalid response from server', res.status);
  });
  return parsePicturePayload(json, res.status);
}

export async function removeProfilePicture(accessToken: string): Promise<ProfilePicture> {
  const res = await fetch(apiUrl('/api/profile-picture'), {
    method: 'DELETE',
    headers: authHeaders(accessToken),
    credentials: isWebAuthEnvironment() ? 'include' : 'omit',
  });
  const json = await res.json().catch(() => {
    throw new PlizApiError('Invalid response from server', res.status);
  });
  return parsePicturePayload(json, res.status);
}
