import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent
} from "react";
import { createPortal } from "react-dom";
import type { IconLibraryId, IconStyleGroup } from "../lib/types";

/** Static examples only — shown when input is focused and empty */
const SUGGESTED_SEARCHES = ["arrow", "menu", "home", "search", "user"] as const;

function SearchIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function ChevronIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

type FiltersBarProps = {
  query: string;
  onQueryChange: (v: string) => void;
  isSearching: boolean;
  libraries: Array<{ id: IconLibraryId; label: string; count: number }>;
  library: "all" | IconLibraryId;
  onLibraryChange: (v: "all" | IconLibraryId) => void;
  style: "all" | IconStyleGroup;
  onStyleChange: (v: "all" | IconStyleGroup) => void;
  availableStyles: string[];
};

function FiltersBarInner(props: FiltersBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const dropdownPortalRef = useRef<HTMLDivElement>(null);
  const [dropdownPlacement, setDropdownPlacement] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const listboxId = useId();
  const searchStatusId = useId();

  const showDropdown = focused && props.query.trim() === "";

  const searchActive = focused || props.query.length > 0;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || dropdownPortalRef.current?.contains(t)) return;
      setFocused(false);
      setHighlight(-1);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useLayoutEffect(() => {
    if (!showDropdown) {
      setDropdownPlacement(null);
      return;
    }
    const measure = () => {
      const el = fieldRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setDropdownPlacement({
        top: r.bottom + 4,
        left: r.left,
        width: r.width
      });
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [showDropdown]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const a = document.activeElement;
      if (
        a &&
        (a.tagName === "INPUT" ||
          a.tagName === "TEXTAREA" ||
          (a as HTMLElement).isContentEditable ||
          a.tagName === "SELECT")
      ) {
        return;
      }
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const applySuggestion = useCallback(
    (value: string) => {
      props.onQueryChange(value);
      setHighlight(-1);
    },
    [props.onQueryChange]
  );

  const clearSearch = useCallback(() => {
    props.onQueryChange("");
    inputRef.current?.focus();
    setHighlight(-1);
  }, [props.onQueryChange]);

  const onInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (props.query.length > 0) {
        clearSearch();
      } else {
        setFocused(false);
        setHighlight(-1);
        inputRef.current?.blur();
      }
      return;
    }

    if (e.key === "Enter") {
      if (showDropdown && highlight >= 0 && SUGGESTED_SEARCHES[highlight]) {
        e.preventDefault();
        applySuggestion(SUGGESTED_SEARCHES[highlight]);
        return;
      }
      return;
    }

    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => (i + 1) % SUGGESTED_SEARCHES.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) =>
        i <= 0 ? SUGGESTED_SEARCHES.length - 1 : i - 1
      );
    }
  };

  useEffect(() => {
    if (highlight < 0 || !dropdownPortalRef.current) return;
    const opt = dropdownPortalRef.current.querySelector(`[data-option-index="${highlight}"]`);
    opt?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const hasValue = props.query.length > 0;
  const inputPaddingRight = hasValue ? "pr-12" : "pr-5";

  const selectClass =
    "w-full min-w-0 appearance-none rounded-full border border-zinc-800 bg-zinc-800/95 py-3 pl-4 pr-10 text-sm text-zinc-100 outline-none transition-[border-color] duration-150 ease-out focus:border-[#59b687] focus:shadow-none focus:ring-0 focus:outline-none focus-visible:outline-none";

  return (
    <div className="relative z-40 overflow-visible rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg shadow-black/40 backdrop-blur-md">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div ref={wrapRef} className="relative z-50 min-w-0 flex-1">
          <div
            ref={fieldRef}
            className={[
              "icondock-search-field",
              searchActive ? "icondock-search-field--active" : ""
            ].join(" ")}
          >
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 z-[1] h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              ref={inputRef}
              id="search"
              type="text"
              name="search"
              value={props.query}
              onChange={(e) => props.onQueryChange(e.target.value)}
              onFocus={() => {
                setFocused(true);
                setHighlight(-1);
              }}
              onBlur={() => {
                window.setTimeout(() => {
                  const a = document.activeElement;
                  if (
                    wrapRef.current?.contains(a) ||
                    dropdownPortalRef.current?.contains(a)
                  ) {
                    return;
                  }
                  setFocused(false);
                  setHighlight(-1);
                }, 0);
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Search for an icon"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Search icons"
              aria-describedby={props.isSearching ? searchStatusId : undefined}
              aria-expanded={showDropdown}
              aria-controls={showDropdown ? listboxId : undefined}
              aria-haspopup="listbox"
              aria-autocomplete="list"
              className={[
                "search-input-glass min-h-[2.75rem] w-full min-w-0 flex-1 border-0 bg-transparent py-3 pl-12 text-sm text-zinc-50 outline-none ring-0 placeholder:text-zinc-500",
                inputPaddingRight,
                "transition-[color] duration-150 ease-out",
                "focus:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-45"
              ].join(" ")}
              inputMode="search"
            />
            {hasValue ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  clearSearch();
                }}
                className="absolute right-3 top-1/2 z-[2] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-700/80 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#59b687]"
                aria-label="Clear search"
              >
                <span className="text-lg leading-none" aria-hidden>
                  ×
                </span>
              </button>
            ) : null}
          </div>

          {props.isSearching ? (
            <p id={searchStatusId} className="mt-1.5 text-xs text-zinc-500" role="status" aria-live="polite">
              Searching…
            </p>
          ) : null}

          {showDropdown && dropdownPlacement
            ? createPortal(
                <div
                  ref={dropdownPortalRef}
                  id={listboxId}
                  role="listbox"
                  aria-label="Suggested searches"
                  className="icondock-search-dropdown"
                  style={{
                    position: "fixed",
                    top: dropdownPlacement.top,
                    left: dropdownPlacement.left,
                    width: dropdownPlacement.width,
                    zIndex: 9999
                  }}
                >
                  <div className="px-1.5 pb-1">
                    <div className="icondock-search-dropdown-section-title">Suggested searches</div>
                    {SUGGESTED_SEARCHES.map((kw, i) => (
                      <button
                        key={kw}
                        type="button"
                        role="option"
                        data-option-index={i}
                        aria-selected={highlight === i}
                        className={[
                          "flex w-full rounded-lg px-2.5 py-2 text-left text-sm text-zinc-200 transition-colors duration-150",
                          highlight === i ? "bg-zinc-800 text-zinc-50" : "hover:bg-zinc-800/70"
                        ].join(" ")}
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => applySuggestion(kw)}
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                </div>,
                document.body
              )
            : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <span className="sr-only">Library</span>
            <select
              value={props.library}
              onChange={(e) => props.onLibraryChange(e.target.value as "all" | IconLibraryId)}
              className={selectClass}
              aria-label="Filter by icon library"
            >
              <option value="all">All libraries</option>
              {props.libraries.map((l) => {
                const title =
                  l.count === 0
                    ? "No icons from this library in your local dataset yet. Run npm run build:dataset in the backend folder."
                    : undefined;
                return (
                  <option key={l.id} value={l.id} title={title}>
                    {`${l.label} (${l.count.toLocaleString()})`}
                  </option>
                );
              })}
            </select>
            <ChevronIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          </div>

          <div className="relative min-w-0 flex-1">
            <span className="sr-only">Style</span>
            <select
              value={props.style}
              onChange={(e) => props.onStyleChange(e.target.value as "all" | IconStyleGroup)}
              className={selectClass}
              aria-label="Filter by icon style"
            >
              <option value="all">All styles</option>
              {props.availableStyles.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            <ChevronIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          </div>
        </div>
      </div>
    </div>
  );
}

const FiltersBar = memo(FiltersBarInner);
export default FiltersBar;
