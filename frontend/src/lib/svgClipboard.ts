/**
 * Produces a small, hand-editable SVG string for clipboard paste (e.g. into Webflow):
 * `<svg …>` with `xmlns`, `viewBox`, `width` / `height`, then inner elements (`<path>`, `<circle>`, …) only.
 * No wrapper divs or utility classes.
 */

function parseViewBox(vb: string): { w: number; h: number } | null {
  const parts = vb.trim().split(/\s+/);
  if (parts.length < 4) return null;
  const w = parseFloat(parts[2]!);
  const h = parseFloat(parts[3]!);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  return { w, h };
}

function stripRootNoise(root: Element): void {
  root.removeAttribute("class");
  root.removeAttribute("id");
  root.removeAttribute("data-icon");
  root.removeAttribute("aria-hidden");
}

/** One newline between tags so the snippet is easy to read and edit. */
function formatLoose(s: string): string {
  return s
    .replace(/></g, ">\n<")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * Normalizes API SVG into a compact document: root `<svg>` + children only.
 */
export function simplifySvgForClipboard(svgMarkup: string): string {
  const doc = new DOMParser().parseFromString(svgMarkup.trim(), "image/svg+xml");
  const err = doc.querySelector("parsererror");
  const root = doc.documentElement;
  if (err || !root || root.localName.toLowerCase() !== "svg") {
    throw new Error("Invalid SVG markup.");
  }

  const hadRootFill = root.hasAttribute("fill");
  stripRootNoise(root);

  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const vb = root.getAttribute("viewBox");
  if (vb) {
    root.setAttribute("viewBox", vb);
    const dim = parseViewBox(vb);
    if (dim) {
      const wNum = parseFloat(String(root.getAttribute("width") || "").replace(/px$/i, ""));
      const hNum = parseFloat(String(root.getAttribute("height") || "").replace(/px$/i, ""));
      if (!Number.isFinite(wNum) || !Number.isFinite(hNum)) {
        root.setAttribute("width", String(dim.w));
        root.setAttribute("height", String(dim.h));
      }
    }
  } else {
    const w = root.getAttribute("width");
    const h = root.getAttribute("height");
    if (w && h) {
      const wn = parseFloat(w.replace(/px$/i, ""));
      const hn = parseFloat(h.replace(/px$/i, ""));
      if (Number.isFinite(wn) && Number.isFinite(hn)) {
        root.setAttribute("viewBox", `0 0 ${wn} ${hn}`);
      }
    }
  }

  // Match a simple “stroke icon” root like the user’s example; keep source fill if it was set.
  if (!hadRootFill) {
    root.setAttribute("fill", "none");
  }

  const raw = new XMLSerializer().serializeToString(root);
  return formatLoose(raw);
}
