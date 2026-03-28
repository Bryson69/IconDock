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
 * - Production / Webflow iframe: set `VITE_API_BASE_URL` at build time.
 * - `webflow extension serve` uses port **1337** by default — relative `/api` hits that static server and returns 404,
 *   so we default the backend to `http://localhost:8787` when the UI is opened on localhost:1337 without an env base.
 */
function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (raw != null && raw.trim() !== "") {
    return raw.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const { hostname, port } = window.location;
    if (hostname === "localhost" && port === "1337") {
      return "http://localhost:8787";
    }
  }
  return "";
}

function apiUrl(path: string): string {
  const base = resolveApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
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


