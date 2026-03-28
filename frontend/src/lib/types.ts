export type IconLibraryId =
  | "lucide"
  | "phosphor"
  | "material-symbols"
  | "remix"
  | "heroicons"
  | "iconoir"
  | "bootstrap"
  | "fontawesome"
  | "material";
export type IconStyleGroup = string;

export type IconSearchItem = {
  id: string;
  name: string;
  library: IconLibraryId;
  style: string;
  styles: string[];
  tags: string[];
  /** Original listing URL when the source is aggregated (e.g. SVG Repo). */
  sourceUrl?: string;
  /** When source metadata is missing for restricted/aggregated sources, UI may flag the row. */
  licenseStatus?: "ok" | "unknown";
};

export type IconSearchResponse = {
  items: IconSearchItem[];
  total: number;
  offset: number;
  limit: number;
};

export type IconByIdResponse = {
  id: string;
  name: string;
  library: IconLibraryId;
  tags: string[];
  svg: string;
  sourceUrl?: string;
  licenseStatus?: "ok" | "unknown";
};

export type LibrariesResponse = {
  libraries: Array<{ id: IconLibraryId; label: string; count: number }>;
  styles?: string[];
  stylesByLibrary?: Record<string, Record<string, number>>;
};

