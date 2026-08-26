export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function extractList<T>(payload: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(payload)) return payload;
  return payload?.results ?? [];
}

export function getDjangoAdminUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || '';
  if (!raw) return '/admin/';
  const base = raw.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  return `${base}/admin/`;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: { data?: Record<string, unknown>; status?: number };
    code?: string;
    message?: string;
  };

  if (!err?.response) {
    if (err?.code === 'ECONNABORTED') {
      return 'The request timed out. Please try again.';
    }
    if (err?.message === 'Network Error' || err?.code === 'ERR_NETWORK') {
      return 'Unable to reach the server. Check your connection and that the API is running, then try again.';
    }
    return fallback;
  }

  const status = err.response.status;
  if (status === 404) {
    return 'The requested resource was not found.';
  }
  if (status === 403) {
    return 'You do not have permission to perform this action.';
  }
  if (status === 500 || status === 502 || status === 503) {
    return 'The server had a problem. Please try again in a moment.';
  }

  const data = err.response.data;
  if (!data || typeof data !== 'object') return fallback;

  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.non_field_errors) && typeof data.non_field_errors[0] === 'string') {
    return String(data.non_field_errors[0]);
  }

  const firstKey = Object.keys(data)[0];
  if (!firstKey) return fallback;

  const value = data[firstKey];
  if (Array.isArray(value) && value.length > 0) return String(value[0]);
  if (typeof value === 'string') return value;

  return fallback;
}
