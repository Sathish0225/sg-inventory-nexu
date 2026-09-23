/** JSON client for the InvenTrack API: the company server chosen at sign-in, bearer-token auth. */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const connection = { baseUrl: "", token: null as string | null, onUnauthorized: () => {} };

export const configureApi = (config: Partial<typeof connection>) => Object.assign(connection, config);
export const serverUrl = () => connection.baseUrl;

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (connection.token) headers.Authorization = `Bearer ${connection.token}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(`${connection.baseUrl}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
  const data = res.status === 204 ? undefined : await res.json().catch(() => undefined);
  if (res.status === 401 && connection.token) connection.onUnauthorized();
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed (${res.status}).`);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown = {}) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};

/** "inventrack.mycompany.sg" → "https://inventrack.mycompany.sg" (no trailing slash). */
export function normaliseServerUrl(input: string): string {
  let url = input.trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, "");
}

export async function probeServer(baseUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${baseUrl}/api/health`, { signal: controller.signal });
    return res.ok && (await res.json())?.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
