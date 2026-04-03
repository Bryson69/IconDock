import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LRUCache } from "lru-cache";
import sharp from "sharp";
import type { IconDataset, IconRecord } from "./types.js";

type ManifestJson = {
  icons: Array<
    IconRecord & {
      // During build we already include these fields; keep explicit for clarity.
      svgPath: string;
    }
  >;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../../data");
const MANIFEST_PATH = path.join(DATA_DIR, "manifest.json");
const PNG_CACHE_DIR = path.join(__dirname, "../../cache/png");

let cachedDataset: IconDataset | null = null;
let datasetLoadPromise: Promise<IconDataset | null> | null = null;

const bufferCache = new LRUCache<string, Buffer>({ max: 64 });

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Manifest may store `svgs/...` (portable) or legacy absolute paths from the machine that ran build:dataset. */
function resolveSvgDiskPath(stored: string): string {
  const unified = stored.replace(/\\/g, "/");
  const m = unified.match(/\/data\/(svgs\/.+)$/i);
  if (m?.[1]) {
    return path.join(DATA_DIR, ...m[1].split("/").filter(Boolean));
  }
  if (!path.isAbsolute(stored)) {
    return path.join(DATA_DIR, ...unified.split("/").filter(Boolean));
  }
  return stored;
}

export async function getDatasetInfo(): Promise<IconDataset | null> {
  if (cachedDataset) return cachedDataset;
  if (datasetLoadPromise) return datasetLoadPromise;

  datasetLoadPromise = (async () => {
    const hasManifest = await fileExists(MANIFEST_PATH);
    if (!hasManifest) return null;

    const raw = await fs.readFile(MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw) as ManifestJson;

    const icons: IconRecord[] = (parsed.icons || []).map((i) => {
      const style = (i as any).style || (i as any).styleGroup || i.variant || "regular";
      const stylesRaw =
        (i as any).styles && Array.isArray((i as any).styles)
          ? (i as any).styles
          : [style];
      const styles = stylesRaw.map((s: unknown) => String(s ?? ""));
      const tagsRaw = (i as any).tags;
      const tags = Array.isArray(tagsRaw)
        ? tagsRaw.map((t: unknown) => String(t).toLowerCase())
        : [];
      return {
        ...i,
        style,
        styles,
        tags,
        searchText: String((i as any).searchText ?? ""),
        svgPath: resolveSvgDiskPath(i.svgPath)
      };
    });

    const iconById = new Map(icons.map((i) => [i.id, i]));

    const pngRenderer: IconDataset["pngRenderer"] = {
      renderPngFromSvg: async ({ svg, size }) => {
        const cacheKey = `${size}:${hashSvg(svg)}`;
        const cachedBuffer = bufferCache.get(cacheKey);
        if (cachedBuffer) return cachedBuffer;

        const cachedPngPath = path.join(PNG_CACHE_DIR, `${cacheKey}.png`);
        if (await fileExists(cachedPngPath)) {
          const buf = await fs.readFile(cachedPngPath);
          bufferCache.set(cacheKey, buf);
          return buf;
        }

        await fs.mkdir(PNG_CACHE_DIR, { recursive: true });

        const pngBuffer = await sharp(Buffer.from(svg))
          .resize(size, size, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer();

        // Best-effort cache write (avoid failing the request)
        try {
          await fs.writeFile(cachedPngPath, pngBuffer);
        } catch {
          // ignore
        }

        bufferCache.set(cacheKey, pngBuffer);
        return pngBuffer;
      }
    };

    cachedDataset = { icons, iconById, pngRenderer };
    return cachedDataset;
  })();

  return datasetLoadPromise;
}

export async function readSvgFile(svgPath: string): Promise<string> {
  const raw = await fs.readFile(svgPath, "utf8");
  // Strip out any HTML comments (e.g. Font Awesome license banner) so the
  // SVG users copy is clean and fully editable.
  const withoutComments = raw.replace(/<!--[\s\S]*?-->\s*/g, "");
  return sanitizeSvgForEditing(withoutComments);
}

function hashSvg(svg: string): string {
  // Simple non-crypto hash to keep cache filenames manageable.
  let h = 2166136261;
  for (let i = 0; i < svg.length; i++) {
    h ^= svg.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String(h >>> 0);
}

function sanitizeSvgForEditing(svg: string): string {
  let out = svg.trim();

  // Make root SVG scalable and inheritable.
  out = out.replace(/<svg\b([^>]*)>/i, (_m, attrs: string) => {
    let next = attrs;
    next = next.replace(/\swidth="[^"]*"/gi, "");
    next = next.replace(/\sheight="[^"]*"/gi, "");
    if (!/\sviewBox="/i.test(next) && /\sviewbox="/i.test(next)) {
      next = next.replace(/\sviewbox=/i, " viewBox=");
    }
    if (!/\sfill="/i.test(next)) next += ' fill="currentColor"';
    return `<svg${next} width="1em" height="1em">`;
  });

  // Convert hard-coded paint values into currentColor.
  out = out.replace(/\s(fill|stroke)="([^"]*)"/gi, (_m, prop: string, value: string) => {
    const v = value.trim();
    if (
      v === "" ||
      /^none$/i.test(v) ||
      /^currentColor$/i.test(v) ||
      /^inherit$/i.test(v) ||
      /^url\(/i.test(v)
    ) {
      return ` ${prop}="${v}"`;
    }
    return ` ${prop}="currentColor"`;
  });

  // Convert inline style paint declarations too.
  out = out.replace(/\sstyle="([^"]*)"/gi, (_m, styleText: string) => {
    const parts = styleText
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((decl) => {
        const idx = decl.indexOf(":");
        if (idx === -1) return decl;
        const key = decl.slice(0, idx).trim().toLowerCase();
        const value = decl.slice(idx + 1).trim();

        if (key !== "fill" && key !== "stroke") return `${decl}`;
        if (
          value === "" ||
          /^none$/i.test(value) ||
          /^currentColor$/i.test(value) ||
          /^inherit$/i.test(value) ||
          /^url\(/i.test(value)
        ) {
          return `${key}:${value}`;
        }
        return `${key}:currentColor`;
      });

    return parts.length ? ` style="${parts.join(";")}"` : "";
  });

  return out;
}

