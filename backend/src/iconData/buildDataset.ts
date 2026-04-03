import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IconLibraryId } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// buildDataset.ts lives at `backend/src/iconData/*`
// so `../../node_modules` resolves to `backend/node_modules`.
const NODE_MODULES_DIR = path.join(__dirname, "../../node_modules");
const DATA_DIR = path.join(__dirname, "../../data");
const SVG_OUT_DIR = path.join(DATA_DIR, "svgs");
const MANIFEST_PATH = path.join(DATA_DIR, "manifest.json");

type BuiltIcon = {
  id: string;
  name: string;
  library: IconLibraryId;
  variant: string;
  style: string;
  styles: string[];
  tags: string[];
  searchText: string;
  svgPath: string;
};

// Optional dev convenience to avoid building the full icon corpus locally.
// Usage: `ICONDOCK_MAX_ICONS_PER_LIBRARY=500 npm run build:dataset`
const MAX_ICONS_PER_LIBRARY = (() => {
  const raw = process.env.ICONDOCK_MAX_ICONS_PER_LIBRARY;
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
})();

type BuildLib = IconLibraryId;
const BUILD_LIBRARIES = (() => {
  const raw = process.env.ICONDOCK_LIBRARIES;
  if (!raw) return null; // default: build everything

  const allowed = new Set<BuildLib>([
    "material",
    "fontawesome",
    "heroicons",
    "lucide",
    "phosphor",
    "material-symbols",
    "remix",
    "iconoir",
    "bootstrap"
  ]);
  const libs = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s as BuildLib)
    .filter((s) => allowed.has(s));

  if (libs.length === 0) return null;
  return Array.from(new Set(libs));
})();

function stem(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

function tokenizeFromName(name: string): string[] {
  return name
    .replace(/[_]/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function tagsFor(args: { library: string; variant: string; name: string; style: string }): string[] {
  const parts = new Set<string>();
  for (const t of tokenizeFromName(args.name)) parts.add(t);
  parts.add(args.library);
  parts.add(args.variant);
  parts.add(args.style);
  return Array.from(parts);
}

function searchText(args: { name: string; variant: string; library: string; tags: string[] }): string {
  // Keep as a space-delimited blob for fast includes-based matching.
  return [args.name, args.library, args.variant, ...args.tags].join(" ").toLowerCase();
}

async function copySvgFile(args: { src: string; out: string }) {
  await fs.mkdir(path.dirname(args.out), { recursive: true });
  const buf = await fs.readFile(args.src);
  await fs.writeFile(args.out, buf);
}

function listSvgFilesRecursively(dir: string): string[] {
  const out: string[] = [];
  if (!fsSync.existsSync(dir)) return out;

  const stack: string[] = [dir];
  while (stack.length) {
    const current = stack.pop()!;
    if (!fsSync.existsSync(current)) continue;

    const entries = fsSync.readdirSync(current, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(current, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile() && e.name.toLowerCase().endsWith(".svg")) out.push(full);
    }
  }

  return out;
}

function variantToStyle(variant: string, library: IconLibraryId): string {
  const v = variant.toLowerCase();
  if (library === "material") {
    if (v === "outlined") return "outline";
    return "filled";
  }
  if (library === "material-symbols") {
    if (v.includes("outlined")) return "outline";
    if (v.includes("rounded")) return "rounded";
    if (v.includes("sharp")) return "sharp";
    return "filled";
  }
  if (library === "fontawesome") {
    if (v === "regular") return "outline";
    return "filled";
  }
  if (library === "heroicons") return v.includes("outline") ? "outline" : "filled";
  if (library === "phosphor") return v;
  if (library === "bootstrap") return "filled";
  if (library === "lucide") return "outline";
  // Iconoir npm package: `icons/regular` (stroke) vs `icons/solid` (filled). Must not merge into one variant.
  if (library === "iconoir") return v === "solid" ? "filled" : "outline";
  if (library === "remix") return v.includes("fill") ? "filled" : "outline";
  return v;
}

async function buildMaterial(): Promise<BuiltIcon[]> {
  const styles = ["filled", "outlined", "round", "sharp", "two-tone"];
  const base = path.join(NODE_MODULES_DIR, "@material-design-icons/svg");

  const built: BuiltIcon[] = [];
  for (const style of styles) {
    const dir = path.join(base, style);
    const matches = listSvgFilesRecursively(dir);
    for (const file of matches) {
      const name = stem(file);
      const variant = style;
      const styleLabel = variantToStyle(variant, "material");
      const tags = tagsFor({ library: "material", variant, name, style: styleLabel });
      const id = `material:${variant}:${name}`;
      const svgOutPath = path.join(SVG_OUT_DIR, "material", variant, `${name}.svg`);
      await copySvgFile({ src: file, out: svgOutPath });
      built.push({
        id,
        name,
        library: "material",
        variant,
        style: styleLabel,
        styles: [styleLabel, variant],
        tags,
        searchText: searchText({ name, variant, library: "material", tags }),
        svgPath: svgOutPath
      });

      if (MAX_ICONS_PER_LIBRARY > 0 && built.length >= MAX_ICONS_PER_LIBRARY) {
        return built;
      }
    }
  }
  return built;
}

async function buildFontAwesome(): Promise<BuiltIcon[]> {
  // Only the published `fontawesome-free` package is indexed. Pro icons are not on disk here and are never included.
  const base = path.join(NODE_MODULES_DIR, "@fortawesome/fontawesome-free/svgs");
  const variants: Array<"solid" | "regular" | "brands"> = ["solid", "regular", "brands"];

  const built: BuiltIcon[] = [];
  for (const variant of variants) {
    const dir = path.join(base, variant);
    const matches = listSvgFilesRecursively(dir);
    for (const file of matches) {
      const name = stem(file);
      // Keep "brands" as a separate variant for retrieval; filter maps to filled/outline.
      const library: IconLibraryId = "fontawesome";
      const styleLabel = variantToStyle(variant, library);
      const tags = tagsFor({ library: "fontawesome", variant, name, style: styleLabel });
      const id = `fontawesome:${variant}:${name}`;
      const svgOutPath = path.join(SVG_OUT_DIR, "fontawesome", variant, `${name}.svg`);
      await copySvgFile({ src: file, out: svgOutPath });
      built.push({
        id,
        name,
        library,
        variant,
        style: styleLabel,
        styles: [styleLabel, variant],
        tags,
        searchText: searchText({ name, variant, library: "fontawesome", tags }),
        svgPath: svgOutPath
      });

      if (MAX_ICONS_PER_LIBRARY > 0 && built.length >= MAX_ICONS_PER_LIBRARY) {
        return built;
      }
    }
  }
  return built;
}

async function buildHeroicons(): Promise<BuiltIcon[]> {
  const base = path.join(NODE_MODULES_DIR, "heroicons");
  // `heroicons` package ships as: /<size>/<variant> (e.g. 24/outline, 24/solid).
  const variants = ["outline", "solid"] as const;
  const size = "24";

  const built: BuiltIcon[] = [];
  for (const variant of variants) {
    const dir = path.join(base, size, variant);
    const matches = listSvgFilesRecursively(dir);
    for (const file of matches) {
      const name = stem(file);
      const library: IconLibraryId = "heroicons";
      const styleLabel = variantToStyle(variant, library);
      const tags = tagsFor({ library: "heroicons", variant, name, style: styleLabel });
      const id = `heroicons:${variant}:${name}`;
      const svgOutPath = path.join(SVG_OUT_DIR, "heroicons", variant, `${name}.svg`);
      await copySvgFile({ src: file, out: svgOutPath });
      built.push({
        id,
        name,
        library,
        variant,
        style: styleLabel,
        styles: [styleLabel, variant],
        tags,
        searchText: searchText({ name, variant, library: "heroicons", tags }),
        svgPath: svgOutPath
      });

      if (MAX_ICONS_PER_LIBRARY > 0 && built.length >= MAX_ICONS_PER_LIBRARY) {
        return built;
      }
    }
  }
  return built;
}

async function buildGenericLibrary(args: {
  library: IconLibraryId;
  sourceDirs: string[];
  variantFromPath?: (relativePath: string) => string;
}): Promise<BuiltIcon[]> {
  const built: BuiltIcon[] = [];
  for (const sourceDir of args.sourceDirs) {
    const files = listSvgFilesRecursively(sourceDir);
    for (const file of files) {
      const relative = path.relative(sourceDir, file);
      const firstSeg = relative.split(path.sep)[0] || "";
      const variant = args.variantFromPath?.(relative) || firstSeg || "regular";
      const name = stem(file);
      const styleLabel = variantToStyle(variant, args.library);
      const tags = tagsFor({ library: args.library, variant, name, style: styleLabel });
      const id = `${args.library}:${variant}:${name}`;
      const svgOutPath = path.join(SVG_OUT_DIR, args.library, variant, `${name}.svg`);
      await copySvgFile({ src: file, out: svgOutPath });
      built.push({
        id,
        name,
        library: args.library,
        variant,
        style: styleLabel,
        styles: [styleLabel, variant],
        tags,
        searchText: searchText({ name, variant, library: args.library, tags }),
        svgPath: svgOutPath
      });
      if (MAX_ICONS_PER_LIBRARY > 0 && built.length >= MAX_ICONS_PER_LIBRARY) return built;
    }
  }
  return built;
}

function ensureEmptyDirPaths() {
  // Remove the dataset folder first, then recreate it.
  return fs
    .rm(DATA_DIR, { recursive: true, force: true })
    .catch(() => undefined)
    .then(() => fs.mkdir(DATA_DIR, { recursive: true }));
}

async function run() {
  await ensureEmptyDirPaths();
  await fs.mkdir(SVG_OUT_DIR, { recursive: true });

  const libsToBuild =
    BUILD_LIBRARIES ??
    ([
      "material",
      "fontawesome",
      "heroicons",
      "lucide",
      "phosphor",
      "material-symbols",
      "remix",
      "iconoir",
      "bootstrap"
    ] as IconLibraryId[]);

  const [material, fontawesome, heroicons, lucide, phosphor, materialSymbols, remix, iconoir, bootstrap] =
    await Promise.all([
    libsToBuild.includes("material") ? buildMaterial() : Promise.resolve([]),
    libsToBuild.includes("fontawesome") ? buildFontAwesome() : Promise.resolve([]),
    libsToBuild.includes("heroicons") ? buildHeroicons() : Promise.resolve([]),
    libsToBuild.includes("lucide")
      ? buildGenericLibrary({
          library: "lucide",
          sourceDirs: [path.join(NODE_MODULES_DIR, "lucide-static/icons")],
          variantFromPath: () => "outline"
        })
      : Promise.resolve([]),
    libsToBuild.includes("phosphor")
      ? buildGenericLibrary({
          library: "phosphor",
          sourceDirs: [path.join(NODE_MODULES_DIR, "@phosphor-icons/core/assets")],
          variantFromPath: (rel) => rel.split(path.sep)[0] || "regular"
        })
      : Promise.resolve([]),
    libsToBuild.includes("material-symbols")
      ? buildGenericLibrary({
          library: "material-symbols",
          sourceDirs: [path.join(NODE_MODULES_DIR, "@material-symbols/svg-400")],
          variantFromPath: (rel) => rel.split(path.sep)[0] || "outlined"
        })
      : Promise.resolve([]),
    libsToBuild.includes("remix")
      ? buildGenericLibrary({
          library: "remix",
          sourceDirs: [path.join(NODE_MODULES_DIR, "remixicon/icons")],
          variantFromPath: (rel) => {
            const seg = rel.split(path.sep)[0] || "line";
            return seg.includes("fill") ? "fill" : "line";
          }
        })
      : Promise.resolve([]),
    libsToBuild.includes("iconoir")
      ? buildGenericLibrary({
          library: "iconoir",
          sourceDirs: [path.join(NODE_MODULES_DIR, "iconoir/icons")],
          variantFromPath: (rel) => {
            const first = rel.split(path.sep)[0] || "";
            if (first === "solid") return "solid";
            if (first === "regular") return "regular";
            return first || "regular";
          }
        })
      : Promise.resolve([]),
    libsToBuild.includes("bootstrap")
      ? buildGenericLibrary({
          library: "bootstrap",
          sourceDirs: [path.join(NODE_MODULES_DIR, "bootstrap-icons/icons")],
          variantFromPath: () => "filled"
        })
      : Promise.resolve([])
  ]);

  // eslint-disable-next-line no-console
  console.log(
    `[IconDock] build counts - material:${material.length} fontawesome:${fontawesome.length} heroicons:${heroicons.length} lucide:${lucide.length} phosphor:${phosphor.length} material-symbols:${materialSymbols.length} remix:${remix.length} iconoir:${iconoir.length} bootstrap:${bootstrap.length}`
  );

  const icons = [
    ...material,
    ...fontawesome,
    ...heroicons,
    ...lucide,
    ...phosphor,
    ...materialSymbols,
    ...remix,
    ...iconoir,
    ...bootstrap
  ];
  if (icons.length === 0) {
    // eslint-disable-next-line no-console
    console.error("Icon dataset build produced 0 icons. Check that icon packages installed correctly.");
    process.exit(1);
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  const manifest = { icons };
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest), "utf8");

  // eslint-disable-next-line no-console
  console.log(`[IconDock] dataset built: ${icons.length} icons`);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

