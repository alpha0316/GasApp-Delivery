import { API_URL } from '../config';
import { mockApi, MOCK_API } from './devMock';

// TEMP: the OTP screen's dev bypass signs in with this fake token so onboarding
// screens can be explored without a real backend session. A 401 for it is
// expected (the backend doesn't know it) and must not force a sign-out.
// Remove alongside the bypass in features/auth/screens/OtpScreen.tsx.
const DEV_BYPASS_TOKEN = 'dev-token';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type TokenProvider = () => string | null;
type UnauthorizedHandler = () => void;

let getToken: TokenProvider = () => null;
let onUnauthorized: UnauthorizedHandler = () => {};

// The auth feature registers these so this module does not import features.
export function configureApiClient(options: { getToken: TokenProvider; onUnauthorized: UnauthorizedHandler }) {
  getToken = options.getToken;
  onUnauthorized = options.onUnauthorized;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  // Background tasks run without the auth store and pass the stored token.
  token?: string | null;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, headers, token } = options;

  if (MOCK_API) return mockApi<T>(path, method, body, query);

  const search = query
    ? Object.entries(query)
        .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&')
    : '';
  const url = `${API_URL}${path}${search ? `?${search}` : ''}`;

  const authToken = token === undefined ? getToken() : token;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.');
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = payload?.error;
    if (response.status === 401 && authToken && authToken !== DEV_BYPASS_TOKEN && token === undefined) onUnauthorized();
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? 'Something went wrong. Please try again.',
      error?.details
    );
  }

  return payload as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
