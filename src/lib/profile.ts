import { getAuthHeaders } from './auth-client';

export interface UserPreferences {
  event_archetype_slugs: string[];
  preferred_domains: string[];
  analysis_depth: 'quick' | 'balanced' | 'deep';
}

export interface CurrentUserProfile {
  userId: string;
  role: 'user' | 'admin';
  preferences: UserPreferences;
}

async function parseResponse(response: Response, fallback: string) {
  if (response.ok) return response.json();
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || fallback);
}

export async function fetchCurrentUserProfile() {
  const response = await fetch('/api/me', { headers: await getAuthHeaders() });
  return (await parseResponse(response, 'Failed to load your profile')) as CurrentUserProfile;
}

export async function saveUserPreferences(input: {
  eventArchetypeSlugs: string[];
  preferredDomains?: string[];
  analysisDepth?: UserPreferences['analysis_depth'];
}) {
  const response = await fetch('/api/preferences', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeaders()),
    },
    body: JSON.stringify(input),
  });
  return (await parseResponse(response, 'Failed to save preferences')) as { preferences: UserPreferences };
}
