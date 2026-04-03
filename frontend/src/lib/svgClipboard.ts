/**
 * Produces a small, hand-editable SVG string for clipboard paste (e.g. into Webflow):
 * `<svg …>` with `xmlns`, `viewBox`, `width="100%"` / `height="100%"`, then inner elements only.
 * Sizing is controlled by a parent in the Designer (classes on a wrapper or embed), like Figma exports —
 * not by editing fixed pixel dimensions inside the embed.
 */

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

  // Figma-style: vector scales to the frame. In Webflow, set width/height (or padding) on a wrapper
  // via classes; the SVG fills that box.
  if (!root.getAttribute("preserveAspectRatio")) {
    root.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }
  root.setAttribute("width", "100%");
  root.setAttribute("height", "100%");

  const raw = new XMLSerializer().serializeToString(root);
  return formatLoose(raw);
}
