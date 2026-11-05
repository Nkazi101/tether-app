import { getAuthHeaders } from './auth-client';

export interface SavedCuration {
  id: string;
  modernTitle: string;
  historicalTitle: string;
  modernEvent: string;
  historicalEvent: string;
  description: string;
  imageUrl?: string;
  link?: string;
  createdAt?: string;
}

export interface SaveCurationInput {
  modernTitle: string;
  historicalTitle: string;
  modernEvent: string;
  historicalEvent: string;
  description: string;
  imageUrl?: string;
  link?: string;
}

async function requestCurations(path: string, init?: RequestInit) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(path, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Curation request failed');
  }

  return response;
}

export async function fetchCurations() {
  const response = await requestCurations('/api/curations');
  const data = await response.json();
  return (data.curations || []) as SavedCuration[];
}

export async function createCuration(input: SaveCurationInput) {
  const response = await requestCurations('/api/curations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();
  return data.curation as SavedCuration;
}

export async function deleteCuration(id: string) {
  await requestCurations(`/api/curations/${id}`, {
    method: 'DELETE',
  });
}
