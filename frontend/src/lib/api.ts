import type {
  IconByIdResponse,
  IconLibraryId,
  IconSearchItem,
  IconSearchResponse,
  IconStyleGroup,
  LibrariesResponse
} from "./types";

/** In the Designer iframe the app origin is Webflow, not your API — set `VITE_API_BASE_URL` to the IconDock backend. */
function apiUrl(path: string): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const base = raw == null || raw === "" ? "" : raw.replace(/\/$/, "");
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

