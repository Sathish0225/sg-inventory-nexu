/**
 * JSON client for the InvenTrack API.
 *  - Web: same-origin requests; the session lives in an httpOnly cookie.
 *  - Apps (desktop / mobile): requests go to the company server chosen at sign-in, with a bearer
 *    token. Cookies are never sent cross-origin.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const connection = { baseUrl: "", token: null as string | null };

/** Apps: point the client at a server and set / clear the bearer token. */
export const configureApi = (config: { baseUrl?: string; token?: string | null }) => Object.assign(connection, config);
export const apiBaseUrl = () => connection.baseUrl;

async function request<T>(method: string, path: string, body?: unknown, timeoutMs = 20_000): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (connection.token) headers.Authorization = `Bearer ${connection.token}`;
  let res: Response;
  try {
    res = await fetch(`${connection.baseUrl}/api${path}`, {
      method,
      credentials: connection.baseUrl ? "omit" : "same-origin",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  const data = res.status === 204 ? undefined : await res.json().catch(() => undefined);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed (${res.status}).`);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown = {}) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};

/** Check that a server address really is an InvenTrack server before signing in to it. */
export async function probeServer(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/health`, { credentials: "omit", signal: AbortSignal.timeout(8000) });
    return res.ok && (await res.json())?.ok === true;
  } catch {
    return false;
  }
}
