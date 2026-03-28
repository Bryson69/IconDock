import express from "express";
import { getDatasetInfo } from "../iconData/loader.js";
import { searchIcons } from "../iconData/search.js";
import { getIconById } from "../iconData/getIconById.js";
import type { IconLibraryId } from "../iconData/types.js";

export const iconsRouter = express.Router();

/** Express may pass `string | string[]` for repeated query keys. */
function firstQueryString(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  return "";
}

function parseLimit(raw: unknown): number {
  const n = Number(firstQueryString(raw) || "120");
  if (!Number.isFinite(n)) return 120;
  return Math.max(1, Math.min(2000, Math.floor(n)));
}

function parseOffset(raw: unknown): number {
  const n = Number(firstQueryString(raw) || "0");
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function parseLibraryParam(raw: unknown): "all" | IconLibraryId {
  const v = firstQueryString(raw).trim().toLowerCase();
  if (v === "" || v === "all") return "all";

  if (v === "material" || v === "google-material-icons") return "material";
  if (v === "material-symbols" || v === "materialsymbols") return "material-symbols";
  if (v === "fontawesome" || v === "font-awesome" || v === "font-awesome-free") return "fontawesome";
  if (v === "heroicons") return "heroicons";
  if (v === "lucide") return "lucide";
  if (v === "phosphor") return "phosphor";
  if (v === "remix" || v === "remixicon") return "remix";
  if (v === "iconoir") return "iconoir";
  if (v === "bootstrap" || v === "bootstrap-icons") return "bootstrap";
  return "all";
}

function parseStyleParam(raw: unknown): "all" | string {
  const v = firstQueryString(raw).trim().toLowerCase();
  if (v === "" || v === "all" || v === "any") return "all";
  if (v === "outlined") return "outline";
  if (v === "fill") return "filled";
  return v;
}

iconsRouter.get("/libraries", async (_req, res) => {
  const dataset = await getDatasetInfo();
  if (!dataset) {
    res.json({
      libraries: [
        { id: "material", label: "Material Design Icons", count: 0 },
        { id: "fontawesome", label: "Font Awesome Free", count: 0 },
        { id: "heroicons", label: "Heroicons", count: 0 },
        { id: "lucide", label: "Lucide", count: 0 },
        { id: "phosphor", label: "Phosphor Icons", count: 0 },
        { id: "material-symbols", label: "Material Symbols", count: 0 },
        { id: "remix", label: "Remix Icon", count: 0 },
        { id: "iconoir", label: "Iconoir", count: 0 },
        { id: "bootstrap", label: "Bootstrap Icons", count: 0 }
      ],
      styles: [],
      stylesByLibrary: {}
    });
    return;
  }

  const counts: Record<string, number> = {};
  const stylesByLibrary: Record<string, Record<string, number>> = {};

  for (const icon of dataset.icons) {
    counts[icon.library] = (counts[icon.library] || 0) + 1;
    const lib = icon.library;
    stylesByLibrary[lib] ||= {};
    for (const st of icon.styles) {
      const key = String(st);
      stylesByLibrary[lib][key] = (stylesByLibrary[lib][key] || 0) + 1;
    }
  }

  const libraries = [
    { id: "material", label: "Material Design Icons" },
    { id: "fontawesome", label: "Font Awesome Free" },
    { id: "heroicons", label: "Heroicons" },
    { id: "lucide", label: "Lucide" },
    { id: "phosphor", label: "Phosphor Icons" },
    { id: "material-symbols", label: "Material Symbols" },
    { id: "remix", label: "Remix Icon" },
    { id: "iconoir", label: "Iconoir" },
    { id: "bootstrap", label: "Bootstrap Icons" }
  ].map((l) => ({ ...l, count: counts[l.id] || 0 }));

  const styleSet = new Set<string>();
  for (const icon of dataset.icons) {
    for (const st of icon.styles) styleSet.add(st);
  }

  res.json({
    libraries,
    styles: Array.from(styleSet).sort((a, b) => a.localeCompare(b)),
    stylesByLibrary
  });
});

iconsRouter.get("/status", async (_req, res) => {
  const dataset = await getDatasetInfo();
  if (!dataset) {
    res.json({
      built: false,
      iconCount: 0,
      perLibrary: {}
    });
    return;
  }

  const perLibrary: Record<string, number> = {};

  for (const icon of dataset.icons) {
    perLibrary[icon.library] = (perLibrary[icon.library] || 0) + 1;
  }

  res.json({
    built: true,
    iconCount: dataset.icons.length,
    perLibrary
  });
});

iconsRouter.get("/search", async (req, res) => {
  try {
    const dataset = await getDatasetInfo();
    if (!dataset) {
      res.status(503).json({
        error: "Icon dataset not built. Run `npm run build:dataset` in the backend folder."
      });
      return;
    }

    const query = firstQueryString(req.query.query);
    const library = parseLibraryParam(req.query.library);
    const style = parseStyleParam(req.query.style);
    const limit = parseLimit(req.query.limit);
    const offset = parseOffset(req.query.offset);

    const result = await searchIcons({
      dataset,
      query,
      library,
      style,
      limit,
      offset
    });

    res.json(result);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[IconDock] /api/icons/search failed:", err);
    res.status(500).json({
      error: err?.message || "Search failed"
    });
  }
});

iconsRouter.get("/svg/:id", async (req, res) => {
  const dataset = await getDatasetInfo();
  if (!dataset) {
    res.status(503).json({
      error: "Icon dataset not built. Run `npm run build:dataset` in the backend folder."
    });
    return;
  }

  const id = req.params.id;
  const icon = await getIconById({ dataset, id, includeSvg: true });
  if (!icon) {
    res.status(404).json({ error: "Icon not found" });
    return;
  }

  res.json(icon);
});

iconsRouter.get("/png/:id", async (req, res) => {
  const dataset = await getDatasetInfo();
  if (!dataset) {
    res.status(503).json({
      error: "Icon dataset not built. Run `npm run build:dataset` in the backend folder."
    });
    return;
  }

  const id = req.params.id;
  const size = Math.max(64, Math.min(1024, Number(req.query.size || 512)));

  const icon = await getIconById({ dataset, id, includeSvg: true });
  if (!icon) {
    res.status(404).json({ error: "Icon not found" });
    return;
  }

  const pngBuffer = await dataset.pngRenderer.renderPngFromSvg({
    svg: (icon as any).svg,
    size
  });

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(pngBuffer);
});
