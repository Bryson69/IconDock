import { useEffect, useMemo, useRef, useState } from "react";
import type { IconSearchItem } from "../lib/types";
import { downloadIconPng, getIconSvg } from "../lib/api";
import { getLibraryLabel } from "../lib/iconLibraries";
import { getLicenseForLibrary } from "../lib/licenses";

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

type CopyKind = "svg" | "embed" | "png";

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
  if (kind === "svg") return `Pasted ${n} svg`;
  if (kind === "embed") return `Pasted ${n} embed`;
  return `Pasted ${n} png`;
}

export default function IconCard(props: { icon: IconSearchItem }) {
  const [inView, setInView] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [loadingSvg, setLoadingSvg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<CopyKind | null>(null);
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
    return () => clearTimeout(t);
  }, [toast]);

  const embedCode = useMemo(() => svg ?? "", [svg]);
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
      await safeClipboardWrite(svg);
      showToast("svg", toastMessage("svg", props.icon.name));
    } finally {
      setBusyAction(null);
    }
  }

  async function onCopyEmbed() {
    if (!svg) return;
    setBusyAction("embed");
    try {
      await safeClipboardWrite(embedCode);
      showToast("embed", toastMessage("embed", props.icon.name));
    } finally {
      setBusyAction(null);
    }
  }

  async function onDownloadPng() {
    if (!svg) return;
    setBusyAction("png");
    try {
      const blob = await downloadIconPng(props.icon.id, 512);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${props.icon.name}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("png", toastMessage("png", props.icon.name));
    } finally {
      setBusyAction(null);
    }
  }

  const busy = busyAction !== null;

  const btnClass =
    "relative z-0 w-full rounded-full border border-white/20 bg-zinc-800/35 px-3 py-2.5 text-center text-xs font-medium text-zinc-100 transition hover:border-white/30 hover:bg-zinc-800/55 disabled:opacity-40";

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
            className="iconSvg flex h-[55%] w-[55%] items-center justify-center text-zinc-100 [&>svg]:h-full [&>svg]:w-full [&>svg]:fill-current"
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
          <button type="button" onClick={onCopySvg} disabled={!svg || busy} className={btnClass}>
            {busyAction === "svg" ? "…" : "Paste as SVG"}
          </button>
          <button type="button" onClick={onCopyEmbed} disabled={!svg || busy} className={btnClass}>
            {busyAction === "embed" ? "…" : "Paste as Embed"}
          </button>
          <button type="button" onClick={onDownloadPng} disabled={!svg || busy} className={btnClass}>
            {busyAction === "png" ? "…" : "Paste as PNG"}
          </button>
        </div>
      </div>
    </div>
  );
}
