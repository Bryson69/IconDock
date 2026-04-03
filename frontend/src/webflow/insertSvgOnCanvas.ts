/// <reference types="@webflow/designer-extension-typings" />

export const ICON_CLASS_NAME = "icondock-icon";

/** Default rules for `icondock-icon` — only these; users edit size via this class in Webflow. */
const ICON_CLASS_PROPERTIES: Record<string, string> = {
  width: "1.5rem",
  height: "1.5rem",
  "max-width": "100%"
};

/**
 * Removes root sizing that would fight the `icondock-icon` class (inline styles and width/height
 * attributes have high specificity vs class-only edits in the Designer).
 */
function stripSvgRootSizingConflicts(rootSvg: Element): void {
  rootSvg.removeAttribute("width");
  rootSvg.removeAttribute("height");

  const raw = rootSvg.getAttribute("style");
  if (!raw?.trim()) return;

  const blocked = new Set(["width", "height", "max-width", "min-width", "min-height"]);
  const next = raw
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((decl) => {
      const key = decl.split(":")[0]?.trim().toLowerCase();
      return key && !blocked.has(key);
    })
    .join("; ");

  if (next) rootSvg.setAttribute("style", next);
  else rootSvg.removeAttribute("style");
}

function applySvgIconClass(rootSvg: Element, className: string): void {
  const prev = rootSvg.getAttribute("class");
  const tokens = new Set(
    (prev ?? "")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean)
  );
  tokens.add(className.trim());
  rootSvg.setAttribute("class", [...tokens].join(" "));
}

async function getOrCreateIconDockIconStyle(wf: WebflowApi): Promise<Style | null> {
  try {
    let s = await wf.getStyleByName(ICON_CLASS_NAME);
    if (!s) {
      s = await wf.createStyle(ICON_CLASS_NAME);
      await s.setProperties(ICON_CLASS_PROPERTIES);
    }
    return s;
  } catch {
    return null;
  }
}

/** Prepares raw SVG markup for Webflow: strips conflicting sizing, applies `icondock-icon` class name. */
export function prepareSvgForCanvas(svgMarkup: string, iconClassName: string): string {
  const doc = new DOMParser().parseFromString(svgMarkup.trim(), "image/svg+xml");
  const err = doc.querySelector("parsererror");
  const rootSvg = doc.documentElement;
  if (err || !rootSvg || rootSvg.localName.toLowerCase() !== "svg") {
    throw new Error("Invalid SVG markup.");
  }
  stripSvgRootSizingConflicts(rootSvg);
  applySvgIconClass(rootSvg, iconClassName);
  return new XMLSerializer().serializeToString(rootSvg);
}

function elementCanHaveChildren(el: AnyElement): boolean {
  return "children" in el && (el as { readonly children: boolean }).children === true;
}

/** Runtime-checked parent that supports `append(BuilderElement)`. */
type CanvasParent = AnyElement & { append: (b: BuilderElement) => Promise<AnyElement> };

export function buildDomFromSvgElement(wf: WebflowApi, parent: BuilderElement, el: Element): void {
  const child = parent.append(wf.elementPresets.DOM);
  child.setTag(el.localName);
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (attr) child.setAttribute(attr.name, attr.value);
  }

  const hasElementChildren = el.children.length > 0;
  if (!hasElementChildren) {
    const text = el.textContent?.trim();
    if (text) child.setTextContent(text);
    return;
  }

  for (let i = 0; i < el.childNodes.length; i++) {
    const sub = el.childNodes[i];
    if (sub?.nodeType === Node.ELEMENT_NODE) {
      buildDomFromSvgElement(wf, child, sub as Element);
    }
  }
}

function buildSvgRootBuilder(wf: WebflowApi, rootSvg: Element): BuilderElement {
  const rootBuilder = wf.elementBuilder(wf.elementPresets.DOM);
  rootBuilder.setTag(rootSvg.localName);
  for (let i = 0; i < rootSvg.attributes.length; i++) {
    const attr = rootSvg.attributes[i];
    if (attr) rootBuilder.setAttribute(attr.name, attr.value);
  }

  const hasElementChildren = rootSvg.children.length > 0;
  if (!hasElementChildren) {
    const text = rootSvg.textContent?.trim();
    if (text) rootBuilder.setTextContent(text);
    return rootBuilder;
  }

  for (let i = 0; i < rootSvg.childNodes.length; i++) {
    const sub = rootSvg.childNodes[i];
    if (sub?.nodeType === Node.ELEMENT_NODE) {
      buildDomFromSvgElement(wf, rootBuilder, sub as Element);
    }
  }

  return rootBuilder;
}

/** Loads/creates `icondock-icon` and returns SVG string ready for canvas / embed. */
export async function prepareIconSvgMarkupForWebflow(
  wf: WebflowApi,
  svgMarkup: string
): Promise<{ prepared: string; iconStyle: Style | null }> {
  const iconStyle = await getOrCreateIconDockIconStyle(wf);
  const iconClassName = iconStyle ? await iconStyle.getName() : ICON_CLASS_NAME;
  return {
    prepared: prepareSvgForCanvas(svgMarkup, iconClassName),
    iconStyle
  };
}

async function insertSvgViaDomBuilder(
  wf: WebflowApi,
  preparedSvgMarkup: string,
  anchor: CanvasParent,
  iconStyle: Style | null
): Promise<void> {
  const doc = new DOMParser().parseFromString(preparedSvgMarkup.trim(), "image/svg+xml");
  const err = doc.querySelector("parsererror");
  const rootSvg = doc.documentElement;
  if (err || !rootSvg || rootSvg.localName.toLowerCase() !== "svg") {
    throw new Error("Invalid SVG markup.");
  }

  const rootBuilder = buildSvgRootBuilder(wf, rootSvg);
  if (iconStyle) {
    rootBuilder.setStyles([iconStyle]);
  }
  await anchor.append(rootBuilder);
}

/**
 * Inserts a single `<svg>` with class **`icondock-icon`**. Sizing defaults live only on that class
 * (width/height 1.5rem, max-width 100%) so dimensions stay editable in Webflow. Root width/height
 * attributes and conflicting inline sizing are stripped so they don’t override the class.
 */
export async function insertSvgOnCanvas(svgMarkup: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const wf = (globalThis as { webflow?: WebflowApi & { ready?: () => Promise<void> } }).webflow;
  if (!wf) {
    return {
      ok: false,
      message: "Open IconDock inside the Webflow Designer (Apps panel) to insert on the canvas."
    };
  }

  try {
    if (typeof wf.ready === "function") {
      await wf.ready();
    }
  } catch {
    return { ok: false, message: "Designer is not ready yet. Try again in a moment." };
  }

  const selected = await wf.getSelectedElement();
  const anchor = selected ?? (await wf.getRootElement());
  if (!anchor) {
    return { ok: false, message: "Could not find a place to insert. Open a page in the Designer." };
  }
  if (!elementCanHaveChildren(anchor)) {
    return {
      ok: false,
      message: "Select a container (e.g. Div, Section, or Block) that can hold child elements."
    };
  }

  const appendParent = anchor as CanvasParent;

  let preparedSvg: string;
  let iconStyle: Style | null;
  try {
    const r = await prepareIconSvgMarkupForWebflow(wf, svgMarkup);
    preparedSvg = r.prepared;
    iconStyle = r.iconStyle;
  } catch {
    return { ok: false, message: "Invalid SVG markup." };
  }

  const notifyOk = async () => {
    try {
      await wf.notify({ type: "Success", message: "Icon added to the page." });
    } catch {
      // optional
    }
  };

  if (typeof wf.insertElementFromWHTML === "function") {
    try {
      await wf.insertElementFromWHTML(preparedSvg, appendParent, "append");
      await notifyOk();
      return { ok: true };
    } catch {
      // Fall through — many Designer builds omit WHTML but support elementBuilder.
    }
  }

  try {
    await insertSvgViaDomBuilder(wf, preparedSvg, appendParent, iconStyle);
    await notifyOk();
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Could not insert.";
    return { ok: false, message: msg };
  }
}
