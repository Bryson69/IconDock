import { useEffect } from "react";
import type { ReactNode } from "react";
import {
  LIBRARY_LICENSES,
  LICENSES_PAGE_ORDER,
  OWNERSHIP_DISCLAIMER,
  SVG_REPO_AGGREGATE,
  type LibraryLicenseEntry
} from "../lib/licenses";

function ExternalLink(props: { href: string; children: ReactNode }) {
  return (
    <a
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-emerald-400/95 underline decoration-emerald-500/35 underline-offset-2 transition hover:text-emerald-300 hover:decoration-emerald-400/60"
    >
      {props.children}
    </a>
  );
}

function LicenseBlock(props: { entry: LibraryLicenseEntry }) {
  const { entry } = props;
  return (
    <section className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-100">{entry.name}</h3>
        <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
          {entry.license}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">{entry.shortDescription}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
        <span>
          Website: <ExternalLink href={entry.website}>{entry.website.replace(/^https?:\/\//, "")}</ExternalLink>
        </span>
        <span>
          License: <ExternalLink href={entry.licenseUrl}>View terms</ExternalLink>
        </span>
      </div>
      {entry.attributionRequired && entry.attributionText ? (
        <p className="mt-3 border-t border-zinc-800/80 pt-3 text-xs leading-relaxed text-amber-200/85">
          <span className="font-semibold text-amber-200/95">Attribution: </span>
          {entry.attributionText}
        </p>
      ) : null}
    </section>
  );
}

export default function LicensesModal(props: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="licenses-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        aria-label="Close licenses"
        onClick={props.onClose}
      />
      <div className="relative flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50 sm:rounded-2xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 id="licenses-modal-title" className="text-lg font-semibold tracking-tight text-zinc-100">
              Licenses & attribution
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{OWNERSHIP_DISCLAIMER}</p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-3">
            {LICENSES_PAGE_ORDER.map((id) => (
              <LicenseBlock key={id} entry={LIBRARY_LICENSES[id]} />
            ))}

            <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3">
              <h3 className="text-sm font-semibold text-amber-100/95">{SVG_REPO_AGGREGATE.name}</h3>
              <p className="mt-2 text-xs leading-relaxed text-amber-200/80">{SVG_REPO_AGGREGATE.shortDescription}</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">{SVG_REPO_AGGREGATE.attributionText}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                <span>
                  <ExternalLink href={SVG_REPO_AGGREGATE.website}>svgrepo.com</ExternalLink>
                </span>
                <span>
                  <ExternalLink href={SVG_REPO_AGGREGATE.licenseUrl}>Terms</ExternalLink>
                </span>
              </div>
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-zinc-800 px-5 py-3">
          <p className="text-[11px] leading-relaxed text-zinc-600">
            Add or update library entries in <code className="rounded bg-zinc-900 px-1 py-0.5 text-zinc-400">src/lib/licenses.ts</code>.
          </p>
        </footer>
      </div>
    </div>
  );
}
