/// <reference types="@webflow/designer-extension-typings" />

import { downloadIconPng } from "../lib/api";

function elementCanHaveChildren(el: AnyElement): boolean {
  return "children" in el && (el as { readonly children: boolean }).children === true;
}

type AppendableParent = AnyElement & {
  append: (preset: ElementPreset<AnyElement>) => Promise<AnyElement>;
};

type WebflowWithReady = WebflowApi & { ready?: () => Promise<void> };

/**
 * Uploads the icon PNG as a site asset and inserts an **Image** element on the canvas.
 */
export async function insertPngOnCanvas(
  iconId: string,
  fileBaseName: string
): Promise<{ ok: true } | { ok: false; message: string }> {
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

  let blob: Blob;
  try {
    blob = await downloadIconPng(iconId, 512);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Could not load PNG.";
    return { ok: false, message: msg };
  }

  const safeName = fileBaseName.replace(/[^\w.\-]+/g, "-").slice(0, 80) || "icon";
  const file = new File([blob], `${safeName}.png`, { type: "image/png" });

  let asset: Asset;
  try {
    asset = await wf.createAsset(file);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Could not upload image to Asset.";
    return { ok: false, message: msg };
  }

  const el = await appendParent.append(wf.elementPresets.Image);
  if (el.type !== "Image") {
    try {
      await el.remove();
    } catch {
      // ignore
    }
    return { ok: false, message: "Could not insert an Image element." };
  }

  try {
    await el.setAsset(asset);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Could not attach image to element.";
    try {
      await el.remove();
    } catch {
      // ignore
    }
    return { ok: false, message: msg };
  }

  try {
    await wf.setSelectedElement(el);
  } catch {
    // optional
  }

  try {
    await wf.notify({ type: "Success", message: "PNG image added to the page." });
  } catch {
    // optional
  }

  return { ok: true };
}
