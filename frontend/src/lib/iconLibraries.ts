import type { IconLibraryId } from "./types";

/** Full list of libraries the app supports — always shown in the UI regardless of API shape. */
export const CANONICAL_ICON_LIBRARIES: Array<{ id: IconLibraryId; label: string }> = [
  { id: "material", label: "Material Design Icons" },
  { id: "fontawesome", label: "Font Awesome Free" },
  { id: "heroicons", label: "Heroicons" },
  { id: "lucide", label: "Lucide" },
  { id: "phosphor", label: "Phosphor Icons" },
  { id: "material-symbols", label: "Material Symbols" },
  { id: "remix", label: "Remix Icon" },
  { id: "iconoir", label: "Iconoir" },
  { id: "bootstrap", label: "Bootstrap Icons" }
];

export type LibraryRow = { id: IconLibraryId; label: string; count: number };

/**
 * Merge `/api/icons/libraries` counts into the canonical list so the Library dropdown
 * always includes every source, even if the API omits entries or returns a partial list.
 */
const CANONICAL_IDS = new Set(CANONICAL_ICON_LIBRARIES.map((l) => l.id));

export function getLibraryLabel(id: IconLibraryId): string {
  const row = CANONICAL_ICON_LIBRARIES.find((l) => l.id === id);
  return row?.label ?? id;
}

export function mergeLibraryCounts(
  apiLibs: Array<{ id: IconLibraryId; label?: string; count?: number | null }> | undefined
): LibraryRow[] {
  const counts = new Map<IconLibraryId, number>();
  for (const row of apiLibs ?? []) {
    if (!row?.id || !CANONICAL_IDS.has(row.id)) continue;
    const n = Number(row.count);
    counts.set(row.id, Number.isFinite(n) ? n : 0);
  }

  return CANONICAL_ICON_LIBRARIES.map((c) => ({
    ...c,
    count: counts.get(c.id) ?? 0
  }));
}
