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
 * - **Hosted Designer Extension** (`https://*.webflow-ext.com`): relative `/api` would hit Webflow — wrong; use
 *   `http://localhost:8787` (or set `VITE_API_BASE_URL` to a deployed HTTPS API for production).
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

  // Hosted extension (Designer loads from webflow-ext.com); relative `/api` has no backend.
  if (isWebflowExt) {
    return "http://localhost:8787";
  }

  return "";
}

function apiUrl(path: string): string {
  const base = resolveApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch";
    throw new Error(
      `${msg}. Start the IconDock API on port 8787 (run \`npm run dev\` in the backend folder), or set VITE_API_BASE_URL to your API origin and rebuild.`
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


