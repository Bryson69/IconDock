/// <reference types="@webflow/designer-extension-typings" />

import { useEffect, useState } from "react";

type ElementSnapshot = {
  type: string;
  componentId: string;
  elementId: string;
  displayName: string | null;
  childCount: number | null;
  tag: string | null;
};

async function snapshotFromElement(el: AnyElement | null): Promise<ElementSnapshot | null> {
  if (!el) return null;
  const id = el.id;
  const type = "type" in el ? String((el as { type: string }).type) : "Element";

  let displayName: string | null = null;
  if (typeof (el as { getDisplayName?: () => Promise<null | string> }).getDisplayName === "function") {
    try {
      displayName = await (el as { getDisplayName: () => Promise<null | string> }).getDisplayName();
    } catch {
      displayName = null;
    }
  }

  let childCount: number | null = null;
  if (typeof (el as { getChildren?: () => Promise<AnyElement[]> }).getChildren === "function") {
    try {
      const kids = await (el as { getChildren: () => Promise<AnyElement[]> }).getChildren();
      childCount = Array.isArray(kids) ? kids.length : null;
    } catch {
      childCount = null;
    }
  }

  let tag: string | null = null;
  if (typeof (el as { getTag?: () => Promise<null | string> }).getTag === "function") {
    try {
      tag = await (el as { getTag: () => Promise<null | string> }).getTag();
    } catch {
      tag = null;
    }
  }

  return {
    type,
    componentId: String(id.component),
    elementId: String(id.element),
    displayName,
    childCount,
    tag
  };
}

/**
 * Read-only inspector for the Webflow Designer canvas (`getSelectedElement` + `subscribe('selectedelement')`),
 * similar to the official hybrid-app tutorial’s element dashboard.
 */
export default function ElementDashboard() {
  const [designer, setDesigner] = useState<boolean | null>(null);
  const [snapshot, setSnapshot] = useState<ElementSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const wf = (globalThis as {
      webflow?: WebflowApi & { ready?: () => Promise<void> };
    }).webflow;
    if (!wf) {
      setDesigner(false);
      return;
    }

    setDesigner(true);
    let unsub: (() => void) | undefined;

    void (async () => {
      try {
        if (typeof wf.ready === "function") {
          await wf.ready();
        }
        setSnapshot(await snapshotFromElement(await wf.getSelectedElement()));
        unsub = wf.subscribe("selectedelement", (el) => {
          void snapshotFromElement(el).then(setSnapshot, () => setSnapshot(null));
        });
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Designer API error");
      }
    })();

    return () => {
      unsub?.();
    };
  }, []);

  if (designer === null) {
    return (
      <section
        className="h-[4.5rem] animate-pulse rounded-2xl border border-zinc-800/60 bg-zinc-900/30"
        aria-hidden
      />
    );
  }

  if (!designer) {
    return (
      <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Designer</h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          Open IconDock inside the <span className="text-zinc-400">Webflow Designer</span> (Apps panel) to see the
          selected element on the canvas.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-emerald-500/20 bg-zinc-900/50 px-4 py-3 shadow-inner shadow-black/20">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-500/90">Canvas selection</h2>
        <span className="text-[10px] font-medium text-zinc-600">Designer API</span>
      </div>

      {err ? (
        <p className="mt-2 text-xs text-amber-400/90">{err}</p>
      ) : !snapshot ? (
        <p className="mt-2 text-xs text-zinc-500">Select an element on the page to see its details.</p>
      ) : (
        <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Type</dt>
            <dd className="font-mono text-zinc-200">{snapshot.type}</dd>
          </div>
          {snapshot.tag ? (
            <div>
              <dt className="text-zinc-500">Tag</dt>
              <dd className="font-mono text-zinc-200">{snapshot.tag}</dd>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Display name</dt>
            <dd className="truncate text-zinc-200">{snapshot.displayName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Children</dt>
            <dd className="font-mono text-zinc-200">{snapshot.childCount ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Element ID</dt>
            <dd className="break-all font-mono text-[11px] leading-snug text-zinc-400">
              {snapshot.componentId} / {snapshot.elementId}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
