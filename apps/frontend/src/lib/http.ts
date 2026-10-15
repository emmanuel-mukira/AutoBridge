import { API_URL } from "@/lib/config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestConfig {
  headers?: Record<string, string>;
  params?: object;
  withCredentials?: boolean;
}

interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

export class HttpError extends Error {
  readonly status: number;
  readonly response: { status: number; data: unknown } | undefined;
  readonly config: { url: string };

  constructor(message: string, status: number, data: unknown, url: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.response = { status, data };
    this.config = { url };
  }
}

function getEnvOrigin(value: string | undefined): string | null {
  // Parse configured URLs defensively. If env is malformed, we treat it as not trusted.
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function assertAllowedAbsoluteUrl(url: string): void {
  // Relative paths are always routed through API_URL and are already under our control.
  const isAbsolute = url.startsWith("http://") || url.startsWith("https://");
  if (!isAbsolute) return;

  // Security control: absolute URLs are restricted to a strict allowlist.
  // This prevents accidental/malicious calls to arbitrary hosts and reduces
  // the blast radius if any caller input is compromised.
  const targetOrigin = new URL(url).origin;
  const allowedOrigins = new Set<string>();
  if (typeof window !== "undefined") {
    allowedOrigins.add(window.location.origin);
  }
  const apiOrigin = getEnvOrigin(API_URL);
  if (apiOrigin) {
    allowedOrigins.add(apiOrigin);
  }
  const autheliaOrigin = getEnvOrigin(import.meta.env.VITE_AUTHELIA_URL as string | undefined);
  if (autheliaOrigin) {
    allowedOrigins.add(autheliaOrigin);
  }
  if (!allowedOrigins.has(targetOrigin)) {
    throw new HttpError("Blocked outbound request to untrusted origin.", 0, {}, url);
  }
}

function normalizeQueryParams(
  params?: object,
): URLSearchParams {
  // Centralized query normalization keeps all API calls consistent and lets us
  // enforce the same rules our backend expects.
  const query = new URLSearchParams();
  if (!params) return query;
  for (const [key, rawValue] of Object.entries(params)) {
    // Undefined/null params are intentionally omitted to avoid noisy URLs.
    if (rawValue === undefined || rawValue === null) continue;
    if (key === "page") {
      const page = Number(rawValue);
      if (!Number.isInteger(page) || page < 1) {
        throw new HttpError("Invalid pagination: 'page' must be a positive integer.", 400, {}, "");
      }
      query.set(key, String(page));
      continue;
    }
    if (key === "limit") {
      const limit = Number(rawValue);
      if (!Number.isInteger(limit) || limit < 1) {
        throw new HttpError("Invalid pagination: 'limit' must be a positive integer.", 400, {}, "");
      }
      // Backend schemas enforce max(100), so we clamp here for predictable behavior
      // and to avoid sending oversized requests that the API will reject.
      query.set(key, String(Math.min(limit, 100)));
      continue;
    }
    if (
      typeof rawValue !== "string" &&
      typeof rawValue !== "number" &&
      typeof rawValue !== "boolean"
    ) {
      // Block complex values (arrays/objects/functions) to avoid ambiguous
      // serialization and unexpected backend filter behavior.
      throw new HttpError(
        `Invalid query parameter '${key}': only string, number, and boolean are supported.`,
        400,
        {},
        "",
      );
    }
    query.set(key, String(rawValue));
  }
  return query;
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  config?: RequestConfig,
): Promise<HttpResponse<T>> {
  // Support both relative API paths and explicit absolute endpoints.
  // Absolute endpoints are still checked by our allowlist security guard.
  const isAbsolute = url.startsWith("http://") || url.startsWith("https://");
  const baseUrl = isAbsolute ? url : `${API_URL}${url}`;

  // Normalize query params once so every call gets consistent pagination/filter rules.
  const queryParams = normalizeQueryParams(config?.params);
  const queryString = queryParams.toString();
  const fullUrl = queryString ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${queryString}` : baseUrl;
  // Security boundary: only allow absolute calls to known trusted origins.
  assertAllowedAbsoluteUrl(fullUrl);
  const headers: Record<string, string> = { ...config?.headers };
  let fetchBody: BodyInit | undefined;
  if (body instanceof URLSearchParams) {
    fetchBody = body;
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
  } else if (body !== undefined && body !== null  ) {
    fetchBody = JSON.stringify(body);
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  }
  // Default to cookie-based sessions (`include`) for Authelia/API auth.
  // Allow explicit opt-out (`omit`) for endpoints that must not send cookies.
  // Security control: reduce attack surface by only sending credentials when necessary.
  const credentials: RequestCredentials = config?.withCredentials === false ? "omit" : "include";
  let res: Response;
  try {
    res = await fetch(fullUrl, {
      method,
      headers,
      body: fetchBody,
      credentials,
    });
  } catch {
    // Normalize low-level network failures into a stable app-level error type.
    throw new HttpError(
      "Network error, please check your connection and try again.",
      0,
      {},
      url,
    );
  }
  // --- Success path ---
  if (res.ok) {
    const ct = res.headers.get("content-type") ?? "";
    const data: T = ct.includes("application/json")
      ? ((await res.json()) as T)
      : ({} as T);
    return { data, status: res.status, headers: res.headers };
  }
  // --- Error path ---
  let errorData: unknown = {};
  try {
    errorData = await res.json();
  } catch {
    // non-JSON error body
  }
  // Friendly error messages
  const serverData = (errorData ?? {}) as { error?: string; message?: string };
  const serverMsg = serverData.error || serverData.message;
  let friendly = serverMsg || res.statusText;
  if (res.status === 401) {
    friendly = "Session expired. Please log in again.";
  } else if (res.status === 403) {
    friendly = "Forbidden. You do not have permission to perform this action.";
  } else if (res.status === 409) {
    friendly = "Email already in use.";
  } else if (res.status >= 500) {
    friendly = "Server error. Please try again later.";
  } else if (!serverMsg) {
    friendly = `Request failed (${res.status}).`;
  }
  throw new HttpError(friendly, res.status, errorData, url);
}

// ---------------------------------------------------------------------------
// Public API — native fetch-based HTTP client
// ---------------------------------------------------------------------------

const http = {
  get: <T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> =>
    request<T>("GET", url, undefined, config),
  post: <T = unknown>(url: string, body?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> =>
    request<T>("POST", url, body, config),
  put: <T = unknown>(url: string, body?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> =>
    request<T>("PUT", url, body, config),
  patch: <T = unknown>(url: string, body?: unknown, config?: RequestConfig): Promise<HttpResponse<T>> =>
    request<T>("PATCH", url, body, config),
  delete: <T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> =>
    request<T>("DELETE", url, undefined, config),
};

export { http };
