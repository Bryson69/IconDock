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

export type IconRecord = {
  id: string; // `${library}:${variant}:${name}`
  name: string;
  library: IconLibraryId;
  variant: string; // source variant (e.g. filled, outlined, solid)
  style: string; // primary style label used for filtering
  styles: string[]; // all style labels attached to this icon
  tags: string[]; // lowercase
  searchText: string; // lowercase consolidated text for search
  svgPath: string; // resolved absolute path for fs reads (manifest stores portable paths under data/)
};

export type IconDataset = {
  icons: IconRecord[];
  iconById: Map<string, IconRecord>;
  pngRenderer: {
    renderPngFromSvg: (args: { svg: string; size: number }) => Promise<Buffer>;
  };
};

export type SearchIconsArgs = {
  dataset: IconDataset;
  query: string;
  library: "all" | IconLibraryId;
  style: "all" | string;
  limit: number;
  offset: number;
};

export type SearchIconsResult = {
  items: Array<{
    id: string;
    name: string;
    library: IconLibraryId;
    style: string;
    styles: string[];
    tags: string[];
  }>;
  total: number;
  offset: number;
  limit: number;
};

