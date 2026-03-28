import type {
  IconDataset,
  IconLibraryId,
  SearchIconsArgs,
  SearchIconsResult
} from "./types.js";

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

function tokenize(q: string): string[] {
  const parts = q
    .split(/[\s,]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.map((t) => (t.length > 64 ? t.slice(0, 64) : t));
}

function iconScore(args: {
  icon: { searchText: string; tags: string[] };
  query: string;
  tokens: string[];
}): { ok: boolean; score: number } {
  const { icon, query, tokens } = args;
  const searchText = icon.searchText ?? "";
  const tags = Array.isArray(icon.tags) ? icon.tags : [];
  if (query.length === 0) return { ok: true, score: 0 };
  if (searchText.includes(query)) return { ok: true, score: 10 };

  let score = 0;
  for (const t of tokens) {
    if (!searchText.includes(t)) return { ok: false, score: 0 };
    score += tags.includes(t) ? 2 : 1;
  }
  return { ok: true, score };
}

export async function searchIcons(args: SearchIconsArgs): Promise<SearchIconsResult> {
  const { dataset, query, library, style, limit, offset } = args;

  const q = normalizeQuery(query);
  const tokens = tokenize(q);

  const allowedLibrary = library === "all" ? null : (library as IconLibraryId);
  const allowedStyle = style === "all" ? null : style.toLowerCase();

  // Basic includes-based search for fast “works out of the box”; can be swapped later.
  if (q.length === 0) {
    const filtered = dataset.icons.filter((icon) => {
      if (allowedLibrary && icon.library !== allowedLibrary) return false;
      const styleKeys = (icon.styles || []).map((s) => String(s).toLowerCase());
      if (allowedStyle && !styleKeys.includes(allowedStyle)) return false;
      return true;
    });

    const total = filtered.length;
    const items = filtered
      .slice(offset, offset + limit)
      .map((icon) => ({
        id: icon.id,
        name: icon.name,
        library: icon.library,
        style: icon.style,
        styles: icon.styles,
        tags: icon.tags
      }));

    return { items, total, offset, limit };
  }

  const scored: Array<{
    id: string;
    name: string;
    library: IconLibraryId;
    style: string;
    styles: string[];
    tags: string[];
    score: number;
  }> = [];

  for (const icon of dataset.icons) {
    if (allowedLibrary && icon.library !== allowedLibrary) continue;
    const styleKeys = (icon.styles || []).map((s) => String(s).toLowerCase());
    if (allowedStyle && !styleKeys.includes(allowedStyle)) continue;

    const { ok, score } = iconScore({ icon, query: q, tokens });
    if (!ok) continue;
    scored.push({
      id: icon.id,
      name: icon.name,
      library: icon.library,
      style: icon.style,
      styles: icon.styles,
      tags: icon.tags,
      score
    });
  }

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const total = scored.length;
  const items = scored.slice(offset, offset + limit);

  return { items, total, offset, limit };
}

