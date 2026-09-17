/** Describe a user returned by the authentication API. */
export interface AuthUser {
  id: number;
  mobileNumber: string;
}

/** Describe the stable API error returned by the backend. */
export interface ApiErrorPayload {
  error: { code: string; message: string; requestId: string };
}

/** Represent a failed API request with a readable server message. */
export class ApiError extends Error {
  /** Construct a client error from an HTTP response. */
  public constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/** Send a JSON POST request and normalize backend failures. */
async function post<T>(path: string, body: Record<string, string>): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = (await response.json()) as ApiErrorPayload;
    throw new ApiError(response.status, payload.error.code, payload.error.message);
  }
  return (await response.json()) as T;
}

/** Request an OTP challenge for a customer mobile number. */
export async function login(mobileNumber: string): Promise<{ accepted: true; mobileNumber: string }> {
  const response = await post<{ data: { accepted: true; mobileNumber: string } }>('/api/auth/login', { mobileNumber });
  return response.data;
}

/** Verify an OTP and return the server-issued user token. */
export async function verifyOtp(mobileNumber: string, otp: string): Promise<{ token: string; user: AuthUser }> {
  const response = await post<{ data: { token: string; user: AuthUser } }>('/api/auth/verify', { mobileNumber, otp });
  return response.data;
}
