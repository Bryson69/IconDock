import type {
  IconByIdResponse,
  IconLibraryId,
  IconSearchItem,
  IconSearchResponse,
  IconStyleGroup,
  LibrariesResponse
} from "./types";

/**
 * API origin for `/api/*` calls.
 * - **Vite dev** (`localhost:5173`): relative `/api` is proxied — base is empty.
 * - **`webflow extension serve`** (default **localhost:1337**): static bundle must call the API on another origin; use
 *   `http://localhost:8787` (or 127.0.0.1 when the host is 127.0.0.1).
 * - **Hosted Designer Extension** (`https://*.webflow-ext.com`): must set `VITE_API_BASE_URL` to a **public HTTPS**
 *   API at build time. Never uses `http://localhost:8787` here — browsers block mixed content from https iframes.
 */
function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (raw != null && raw.trim() !== "") {
    return raw.replace(/\/$/, "");
  }
  if (typeof window === "undefined") return "";

  const { hostname, port } = window.location;

  // Vite dev / preview: proxy handles `/api` on the same origin.
  if ((hostname === "localhost" || hostname === "127.0.0.1") && (port === "5173" || port === "4173")) {
    return "";
  }

  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  const isWebflowExt = hostname.endsWith(".webflow-ext.com");
  const apiLoopbackOrigin = (() => {
    if (hostname === "127.0.0.1") return "http://127.0.0.1:8787";
    if (hostname === "[::1]") return "http://[::1]:8787";
    return "http://localhost:8787";
  })();

  // Webflow CLI static host for the extension (default 1337) — same fix for any port on loopback when not Vite.
  if (isLocal && port === "1337") {
    return apiLoopbackOrigin;
  }

  // Hosted Designer: https://*.webflow-ext.com cannot call http://localhost (mixed content / unreachable).
  if (isWebflowExt) {
    return "";
  }

  return "";
}

function apiUrl(path: string): string {
  const base = resolveApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (
    typeof window !== "undefined" &&
    window.location.hostname.endsWith(".webflow-ext.com") &&
    base === ""
  ) {
    throw new Error(
      "This build has no VITE_API_BASE_URL. Rebuild with VITE_API_BASE_URL=https://your-api.example.com (e.g. your Render URL) and run webflow extension bundle again."
    );
  }
  return `${base}${p}`;
}

function requestUrlString(input: RequestInfo): string {
  if (typeof input === "string") return input;
  if (input instanceof Request) return input.url;
  return String(input);
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const urlStr = requestUrlString(input);
  let res: Response;
  try {
    res = await fetch(input, { ...init, mode: "cors" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch";
    throw new Error(
      `${msg} — request was: ${urlStr}. Tips: hard-refresh the extension (or re-run webflow extension serve after npm run build). In Designer, upload a bundle built with VITE_API_BASE_URL. For 1337 without that var, run backend on :8787. Check DevTools Console for blocked:csp / net::ERR_.`
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = text.trim();
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j?.error) detail = j.error;
    } catch {
      // use raw body
    }
    throw new Error(
      detail ? `Request failed: ${res.status} — ${detail}` : `Request failed: ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

export async function getLibraries(): Promise<LibrariesResponse> {
  return fetchJson<LibrariesResponse>(apiUrl("/api/icons/libraries"));
}

export async function searchIcons(args: {
  query: string;
  library: "all" | IconLibraryId;
  style: "all" | IconStyleGroup;
  limit: number;
  offset: number;
}): Promise<IconSearchResponse> {
  const params = new URLSearchParams();
  params.set("query", args.query);
  if (args.library !== "all") params.set("library", args.library);
  if (args.style !== "all") params.set("style", args.style);
  params.set("limit", String(args.limit));
  params.set("offset", String(args.offset));
  // Uses the same REST contract (`/api/*`) for extension compatibility.
  return fetchJson<IconSearchResponse>(apiUrl(`/api/icons/search?${params.toString()}`));
}

export async function getIconSvg(id: string): Promise<IconByIdResponse> {
  return fetchJson<IconByIdResponse>(apiUrl(`/api/icons/svg/${encodeURIComponent(id)}`));
}

export async function downloadIconPng(id: string, size: number): Promise<Blob> {
  const res = await fetch(
    apiUrl(`/api/icons/png/${encodeURIComponent(id)}?size=${size}`)
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PNG download failed: ${res.status} ${text}`);
  }
  return await res.blob();
}

export type { IconSearchItem };


