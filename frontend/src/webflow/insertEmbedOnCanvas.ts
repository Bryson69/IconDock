/// <reference types="@webflow/designer-extension-typings" />

import { buildSvgEmbedHtml } from "../lib/svgEmbed";
import { prepareIconSvgMarkupForWebflow } from "./insertSvgOnCanvas";
import { setHtmlEmbedMarkup } from "./setHtmlEmbedMarkup";

function elementCanHaveChildren(el: AnyElement): boolean {
  return "children" in el && (el as { readonly children: boolean }).children === true;
}

/** Parent that can `append` presets or builder elements (e.g. HtmlEmbed). */
type AppendableParent = AnyElement & {
  append: (target: ElementPreset<AnyElement> | BuilderElement) => Promise<AnyElement>;
};

type WebflowWithReady = WebflowApi & { ready?: () => Promise<void> };

export type InsertEmbedResult =
  | { ok: true }
  | { ok: true; clipboardFallback: true }
  | { ok: false; message: string };

/**
 * Inserts a native **Code Embed** (HtmlEmbed) with the same HTML as “Paste as Embed”.
 * Tries, in order: `insertElementFromWHTML`, `elementBuilder` + `setTextContent`, then runtime embed setters.
 * If none work, returns `{ clipboardFallback: true }` so the UI can copy in a **fresh user gesture**
 * (clipboard writes after `await` in the Designer iframe are often blocked — see IconCard).
 */
export async function insertEmbedOnCanvas(svgMarkup: string): Promise<InsertEmbedResult> {
  const wf = (globalThis as { webflow?: WebflowWithReady }).webflow;
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

  const appendParent = anchor as AppendableParent;

  let preparedSvg: string;
  try {
    preparedSvg = (await prepareIconSvgMarkupForWebflow(wf, svgMarkup)).prepared;
  } catch {
    return { ok: false, message: "Invalid SVG markup." };
  }

  const embedHtml = buildSvgEmbedHtml(preparedSvg);

  const notifyOk = async () => {
    try {
      await wf.notify({ type: "Success", message: "Code Embed added to the page." });
    } catch {
      // optional
    }
  };

  const selectAndFinish = async (el: AnyElement): Promise<InsertEmbedResult> => {
    try {
      await wf.setSelectedElement(el);
    } catch {
      // optional
    }
    await notifyOk();
    return { ok: true };
  };

  /** 1) WHTML insert — try raw HTML and Webflow-style wrappers (Designer may map these to HtmlEmbed). */
  const whtmlAttempts = [
    embedHtml,
    `<div class="w-embed w-html">${embedHtml}</div>`,
    `<div class="w-embed">${embedHtml}</div>`
  ];
  if (typeof wf.insertElementFromWHTML === "function") {
    for (const whtml of whtmlAttempts) {
      try {
        const el = await wf.insertElementFromWHTML(whtml, appendParent, "append");
        if (el.type === "HtmlEmbed") {
          return selectAndFinish(el);
        }
        try {
          await el.remove();
        } catch {
          // ignore
        }
      } catch {
        // try next whtml variant
      }
    }
  }

  /** 2) Builder + setTextContent — embed code is often applied on the builder before append. */
  try {
    const builder = wf.elementBuilder(wf.elementPresets.HtmlEmbed);
    builder.setTextContent(embedHtml);
    const el = await appendParent.append(builder);
    if (el.type === "HtmlEmbed") {
      return selectAndFinish(el);
    }
    try {
      await el.remove();
    } catch {
      // ignore
    }
  } catch {
    // try next strategy
  }

  /** 3) Append empty HtmlEmbed and set markup via any runtime setter Webflow exposes. */
  let htmlEmbed: AnyElement | null = null;
  try {
    htmlEmbed = await appendParent.append(wf.elementPresets.HtmlEmbed);
    const setOk = await setHtmlEmbedMarkup(htmlEmbed, embedHtml);
    if (setOk) {
      return selectAndFinish(htmlEmbed);
    }
  } catch {
    // fall through to cleanup + clipboard
  }

  if (htmlEmbed) {
    try {
      await htmlEmbed.remove();
    } catch {
      // ignore
    }
    htmlEmbed = null;
  }

  /** 4) Let the app copy in a **synchronous** click handler — clipboard cannot be trusted after `await` here. */
  return { ok: true, clipboardFallback: true };
}
