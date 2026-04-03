import { useEffect, useRef, useState } from "react";
import type { IconSearchItem } from "../lib/types";
import { getIconSvg } from "../lib/api";
import { getLibraryLabel } from "../lib/iconLibraries";
import { getLicenseForLibrary } from "../lib/licenses";
import { simplifySvgForClipboard } from "../lib/svgClipboard";
import { insertPngOnCanvas } from "../webflow/insertPngOnCanvas";
import { insertSvgOnCanvas } from "../webflow/insertSvgOnCanvas";

async function safeClipboardWrite(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

function styleLabel(s: string) {
  if (!s) return "";
  if (s === "remote") return "Remote";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

type CopyKind = "svg" | "png";
type BusyKind = CopyKind | "insert" | "insertPng";

/** e.g. "file-arrow-down" → "file arrow down" for toast copy */
function iconNameForToast(name: string): string {
  return name
    .replace(/[-_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function toastMessage(kind: CopyKind, iconName: string): string {
  const n = iconNameForToast(iconName);
  if (kind === "svg") return `Copied ${n} SVG`;
  return `Inserted ${n} PNG on the canvas`;
}

export default function IconCard(props: { icon: IconSearchItem }) {
  const [inView, setInView] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [loadingSvg, setLoadingSvg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<BusyKind | null>(null);
  /** Toast shown after copy / save; cleared when CSS animation finishes. */
  const [toast, setToast] = useState<{ id: number; kind: CopyKind; message: string } | null>(null);
  const toastIdRef = useRef(0);

  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) setInView(true);
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || svg || loadingSvg) return;
    setLoadingSvg(true);
    setError(null);
    getIconSvg(props.icon.id)
      .then((res) => setSvg(res.svg))
      .catch((e) => setError(e?.message || "Failed to load icon"))
      .finally(() => setLoadingSvg(false));
  }, [inView, props.icon.id, svg, loadingSvg]);

  // If animationend doesn’t fire (background tab, etc.), clear toast after the animation duration.
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const libraryLabel = getLibraryLabel(props.icon.library);
  const licenseMeta = getLicenseForLibrary(props.icon.library);
  const licenseTooltip = `${licenseMeta.license} — ${licenseMeta.name}. Open Licenses for full terms.`;

  function showToast(kind: CopyKind, message: string) {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, kind, message });
  }

  const handleToastAnimationEnd = () => {
    setToast(null);
  };

  async function onCopySvg() {
    if (!svg) return;
    setBusyAction("svg");
    try {
      let text: string;
      try {
        text = simplifySvgForClipboard(svg);
      } catch {
        text = svg;
      }
      await safeClipboardWrite(text);
      showToast("svg", toastMessage("svg", props.icon.name));
    } finally {
      setBusyAction(null);
    }
  }

  async function onInsertOnCanvas() {
    if (!svg) return;
    setBusyAction("insert");
    try {
      const result = await insertSvgOnCanvas(svg);
      if (result.ok) {
        toastIdRef.current += 1;
        setToast({
          id: toastIdRef.current,
          kind: "svg",
          message: `Inserted ${iconNameForToast(props.icon.name)} on the canvas`
        });
      } else {
        toastIdRef.current += 1;
        setToast({
          id: toastIdRef.current,
          kind: "svg",
          message: result.message
        });
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function onInsertPngOnCanvas() {
    if (!svg) return;
    setBusyAction("insertPng");
    try {
      const result = await insertPngOnCanvas(props.icon.id, props.icon.name);
      if (result.ok) {
        showToast("png", toastMessage("png", props.icon.name));
      } else {
        toastIdRef.current += 1;
        setToast({
          id: toastIdRef.current,
          kind: "svg",
          message: result.message
        });
      }
    } finally {
      setBusyAction(null);
    }
  }

  const busy = busyAction !== null;

  /**
   * Default: grey outline, transparent fill, light text.
   * Hover: forest-green border, mint text, near-black with a hint of dark green (matches reference).
   */
  const dockBtnClass =
    "relative z-0 w-full rounded-full border border-zinc-600/50 bg-transparent px-3 py-2.5 text-center text-xs font-medium text-zinc-100 transition-colors duration-150 " +
    "hover:border-emerald-800/95 hover:bg-emerald-950/45 hover:text-emerald-200 " +
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-600/50 disabled:hover:bg-transparent disabled:hover:text-zinc-100";

  return (
    <div
      ref={rootRef}
      className="relative z-0 flex flex-col overflow-visible rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg shadow-black/40 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/50"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold text-zinc-100">{props.icon.name}</div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1">
            <span className="truncate text-[13px] font-medium text-zinc-400">{libraryLabel}</span>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
              title={licenseTooltip}
              aria-label={licenseTooltip}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
              </svg>
            </button>
            {props.icon.licenseStatus === "unknown" ? (
              <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-px text-[10px] font-medium text-amber-400/95">
                License unknown
              </span>
            ) : null}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[12px] font-semibold capitalize text-zinc-900">
          {styleLabel(props.icon.style)}
        </span>
      </div>

      {props.icon.sourceUrl ? (
        <div className="mb-2 text-[11px] leading-snug text-zinc-500">
          <a
            href={props.icon.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-500/90 underline decoration-emerald-500/30 underline-offset-2 hover:text-emerald-400"
          >
            Original source
          </a>
          <span className="text-zinc-600"> · verify license on the provider page</span>
        </div>
      ) : null}

      <div className="mb-4 flex aspect-square w-full items-center justify-center rounded-xl bg-zinc-800 ring-1 ring-inset ring-white/[0.06]">
        {loadingSvg ? (
          <div className="h-8 w-8 animate-pulse rounded-lg bg-zinc-600/30" />
        ) : error ? (
          <span className="text-xs text-red-400/90">?</span>
        ) : svg ? (
          <div
            className="iconSvg flex h-[55%] w-[55%] items-center justify-center text-zinc-100 [&>svg]:h-full [&>svg]:w-full [&>svg]:shrink-0 [&>svg]:overflow-visible"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="h-8 w-8 rounded-lg bg-zinc-700/40" />
        )}
      </div>

      {/* Toast is position:absolute above this stack so it never affects button size or layout. */}
      <div className="relative mt-auto">
        {toast ? (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            onAnimationEnd={handleToastAnimationEnd}
            className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[min(calc(100vw-2rem),20rem)] rounded-xl border border-[#59b687]/30 bg-[#0a1210]/95 px-4 py-2 text-center text-xs font-medium leading-snug text-[#59b687] shadow-lg shadow-black/50 backdrop-blur-sm motion-safe:animate-copy-confirm motion-reduce:animate-copy-confirm-reduced break-words"
          >
            {toast.message}
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onInsertOnCanvas}
            disabled={!svg || busy}
            className={dockBtnClass}
            title="Adds the SVG inside the selected element on the canvas (uses icondock-icon class). Open the Webflow Designer app to use this."
          >
            {busyAction === "insert" ? "…" : "Insert SVG on Canvas"}
          </button>
          <button
            type="button"
            onClick={onCopySvg}
            disabled={!svg || busy}
            className={dockBtnClass}
            title="Minimal &lt;svg&gt; with paths only — paste into Webflow or your editor"
          >
            {busyAction === "svg" ? "…" : "Copy SVG code"}
          </button>
          <button
            type="button"
            onClick={onInsertPngOnCanvas}
            disabled={!svg || busy}
            className={dockBtnClass}
            title="Uploads PNG to Assets and inserts an Image in the selected container. Open the Webflow Designer app to use this."
          >
            {busyAction === "insertPng" ? "…" : "Insert PNG on Canvas"}
          </button>
        </div>
      </div>
    </div>
  );
}
