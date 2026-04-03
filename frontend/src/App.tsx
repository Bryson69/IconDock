import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ElementDashboard from "./components/ElementDashboard";
import FiltersBar from "./components/FiltersBar";
import IconGrid from "./components/IconGrid";
import LicensesModal from "./components/LicensesModal";
import { getLibraries, searchIcons } from "./lib/api";
import IconDockLogo from "./components/IconDockLogo";
import { mergeLibraryCounts } from "./lib/iconLibraries";
import type { IconLibraryId, IconSearchItem, IconStyleGroup } from "./lib/types";
import { useDebouncedValue } from "./lib/useDebouncedValue";
import { OWNERSHIP_DISCLAIMER } from "./lib/licenses";

export default function App() {
  const [libraries, setLibraries] = useState<
    Array<{ id: IconLibraryId; label: string; count: number }>
  >([]);
  const [availableStyles, setAvailableStyles] = useState<string[]>([]);
  const [stylesByLibrary, setStylesByLibrary] = useState<Record<string, Record<string, number>>>({});
  const [library, setLibrary] = useState<"all" | IconLibraryId>("all");
  const [style, setStyle] = useState<"all" | IconStyleGroup>("all");

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const [items, setItems] = useState<IconSearchItem[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [licensesOpen, setLicensesOpen] = useState(false);
  const pageSize = 120;
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    getLibraries()
      .then((res) => {
        setLibraries(mergeLibraryCounts(res.libraries));
        setAvailableStyles(res.styles || []);
        setStylesByLibrary(res.stylesByLibrary || {});
      })
      .catch((e) => {
        setError(e?.message || "Failed to load libraries");
        setLibraries(mergeLibraryCounts([]));
      });
  }, []);

  const requestArgs = useMemo(
    () => ({ query: debouncedQuery, library, style }),
    [debouncedQuery, library, style]
  );

  const derivedStyles = useMemo(() => {
    const phosphorOrder = ["thin", "light", "regular", "bold", "fill", "duotone"];
    const selectedLib = library === "all" ? null : library;
    const fromMap =
      selectedLib && stylesByLibrary[selectedLib]
        ? Object.keys(stylesByLibrary[selectedLib])
        : availableStyles;

    const unique = Array.from(new Set(fromMap)).filter(Boolean);
    if (selectedLib === "phosphor") {
      const ordered = phosphorOrder.filter((s) => unique.includes(s));
      const rest = unique.filter((s) => !phosphorOrder.includes(s)).sort((a, b) => a.localeCompare(b));
      return [...ordered, ...rest];
    }
    return unique.sort((a, b) => a.localeCompare(b));
  }, [availableStyles, library, stylesByLibrary]);

  useEffect(() => {
    // If current style isn't valid for the selected library, reset.
    if (style === "all") return;
    if (!derivedStyles.includes(String(style))) setStyle("all");
  }, [derivedStyles, style]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setItems([]);
    setTotalMatches(0);
    setOffset(0);

    (async () => {
      try {
        const res = await searchIcons({
          ...requestArgs,
          limit: pageSize,
          offset: 0
        });
        if (cancelled) return;
        setItems(res.items);
        setTotalMatches(res.total);
        setOffset(res.items.length);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Search failed");
        setItems([]);
        setTotalMatches(0);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestArgs]);

  const hasMore = items.length < totalMatches;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await searchIcons({
        ...requestArgs,
        limit: pageSize,
        offset
      });
      setItems((prev) => [...prev, ...res.items]);
      setOffset((prev) => prev + res.items.length);
      setTotalMatches(res.total);
    } catch (e: any) {
      setError(e?.message || "Failed to load more results");
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset, pageSize, requestArgs]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (!hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  const showEmptyState = !loading && !error && items.length === 0;

  const isSearching = useMemo(() => {
    const debouncing = query !== debouncedQuery;
    const fetching = loading && (query.length > 0 || debouncedQuery.length > 0);
    return debouncing || fetching;
  }, [query, debouncedQuery, loading]);

  return (
    <div className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_85%_55%_at_50%_-18%,rgba(255,255,255,0.04),transparent)]">
      <LicensesModal open={licensesOpen} onClose={() => setLicensesOpen(false)} />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8">
          <header>
            <div className="flex items-start gap-4">
              <IconDockLogo className="h-12 w-12 shrink-0" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-100">IconDock</h1>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-400">
                  Search free icons from Material, Font Awesome, Heroicons, Lucide, Phosphor, Material
                  Symbols, Remix, Iconoir, and Bootstrap in one place.
                </p>
              </div>
            </div>
          </header>

          <ElementDashboard />

          <FiltersBar
            query={query}
            onQueryChange={setQuery}
            isSearching={isSearching}
            libraries={libraries}
            library={library}
            onLibraryChange={setLibrary}
            style={style}
            onStyleChange={setStyle}
            availableStyles={derivedStyles}
          />

          <div className="text-sm text-zinc-400" role="status" aria-live="polite" aria-atomic="true">
            Showing{" "}
            <span className="font-semibold text-zinc-100">{loading ? "…" : items.length}</span>
            {totalMatches > 0 ? (
              <>
                {" "}
                of <span className="font-semibold text-emerald-400">{totalMatches.toLocaleString()}</span>{" "}
                icons
              </>
            ) : (
              !loading && " icons"
            )}
          </div>

          {loading ? (
            <div className="relative z-0 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex animate-pulse flex-col rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg shadow-black/40"
                >
                  <div className="mb-3 flex justify-between gap-2">
                    <div className="h-4 w-24 rounded bg-emerald-500/15" />
                    <div className="h-5 w-14 rounded-full bg-emerald-500/12" />
                  </div>
                  <div className="mb-4 aspect-square w-full rounded-xl bg-zinc-800 ring-1 ring-inset ring-white/[0.04]" />
                  <div className="flex flex-col gap-2">
                    <div className="h-9 w-full rounded-full bg-emerald-500/10" />
                    <div className="h-9 w-full rounded-full bg-emerald-500/10" />
                    <div className="h-9 w-full rounded-full bg-emerald-500/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/25 bg-red-950/35 p-4 text-sm text-red-100/95 shadow-lg shadow-black/40">
              {error}
            </div>
          ) : showEmptyState ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center shadow-lg shadow-black/40">
              <div className="text-sm font-semibold text-zinc-100">No icons found</div>
              <div className="mt-2 text-sm text-zinc-400">
                Try a different search term or switch the library/style filters.
              </div>
            </div>
          ) : (
            <>
              <IconGrid icons={items} />
              <div ref={sentinelRef} className="h-1 w-full" />
              {hasMore ? (
                <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="rounded-full border border-emerald-500/35 bg-emerald-500/5 px-6 py-2.5 text-sm font-medium text-emerald-400 transition hover:border-emerald-400/55 hover:bg-emerald-500/12 disabled:opacity-50"
                  >
                    {loadingMore ? "Loading…" : `Load more (${totalMatches - items.length} left)`}
                  </button>
                </div>
              ) : null}
            </>
          )}

          <footer className="space-y-3 border-t border-zinc-800/60 pt-6 text-xs text-zinc-500">
            <p className="max-w-2xl leading-relaxed text-zinc-500">{OWNERSHIP_DISCLAIMER}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={() => setLicensesOpen(true)}
                className="font-medium text-emerald-500/90 underline decoration-emerald-500/25 underline-offset-2 transition hover:text-emerald-400 hover:decoration-emerald-400/50"
              >
                Licenses & attribution
              </button>
              <span className="hidden text-zinc-700 sm:inline">·</span>
              <span>API: stable REST endpoints for search and assets.</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

