"use client";

import {
    useCallback,
    useDeferredValue,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface SelectOption {
    value: string;
    label: string;
    /** Secondary line, e.g. a currency's full name. */
    hint?: string;
    /** Leading visual — a flag, a logo. */
    icon?: ReactNode;
    /** Extra text matched by the search box but never displayed. */
    keywords?: string;
}

interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    /** Shows the filter box. Defaults on above 8 options, where scanning gets slow. */
    searchable?: boolean;
    searchPlaceholder?: string;
    disabled?: boolean;
    /** Announced name for the trigger when there is no visible label. */
    ariaLabel?: string;
    className?: string;
}

/** Roughly the popover's tallest state: search row + the list's max-height. */
const POPOVER_HEIGHT = 300;

/**
 * Rows mounted per batch. Around 30 comfortably overfills the 16rem list, so the
 * user never sees the end of the batch before the next one is requested.
 */
const WINDOW_STEP = 30;

/**
 * A styled listbox.
 *
 * A native <select> was used here first: its popup is drawn by the OS, so it
 * ignored every token in the design system and rendered as a white sheet on the
 * dark canvas. Nothing about that popup can be styled, so the list is drawn in
 * the document instead — which also buys us search, hints and icons.
 *
 * Long lists are windowed. The country picker has 246 options, each with a flag,
 * and mounting all of them cost ~900ms of render and layout on every open — a
 * visible stall on a control that should feel instant. Only the first batch
 * mounts; the rest arrive as the user scrolls.
 */
export function Select({
    value,
    onChange,
    options,
    placeholder = "Select…",
    searchable,
    searchPlaceholder = "Search…",
    disabled,
    ariaLabel,
    className = "",
}: SelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const [dropUp, setDropUp] = useState(false);

    /*
     * How many rows are mounted, and which query that count belongs to. Pairing
     * them lets the count reset itself when the query changes, derived during
     * render — no effect writing state back after a paint.
     */
    const [window_, setWindow] = useState({ query: "", size: WINDOW_STEP });

    const rootRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const sentinelRef = useRef<HTMLLIElement>(null);
    /** Whether the active row was last moved by the keyboard, not the pointer. */
    const keyboardNav = useRef(false);
    const listId = useId();

    const withSearch = searchable ?? options.length > 8;
    const selected = options.find((o) => o.value === value);

    // Typing stays responsive while the (larger) filtered list renders behind it.
    const deferredQuery = useDeferredValue(query);

    /*
     * One lowercased haystack per option, built once. The previous version called
     * toLowerCase() on three fields of all 246 options on every keystroke.
     */
    const haystacks = useMemo(
        () =>
            options.map((o) =>
                `${o.label} ${o.value} ${o.keywords ?? ""}`.toLowerCase()
            ),
        [options]
    );

    const filtered = useMemo(() => {
        const q = deferredQuery.trim().toLowerCase();
        if (!q) return options;
        return options.filter((_, i) => haystacks[i].includes(q));
    }, [options, haystacks, deferredQuery]);

    // Reset the window whenever the query moves on, without an effect.
    const batch = window_.query === deferredQuery ? window_.size : WINDOW_STEP;
    // Keyboard navigation can walk past the mounted batch; keep it just ahead.
    const mounted = Math.min(filtered.length, Math.max(batch, active + 5));
    const visible = mounted >= filtered.length ? filtered : filtered.slice(0, mounted);
    const hasMore = mounted < filtered.length;

    const growWindow = useCallback(() => {
        setWindow({ query: deferredQuery, size: batch + WINDOW_STEP });
    }, [deferredQuery, batch]);

    const openList = useCallback(() => {
        /*
         * Direction is measured here, before the popover exists, not in an effect
         * afterwards. Measuring after mount meant the list painted downward for a
         * frame and then jumped up — the flip was visible every time.
         */
        const rect = rootRef.current?.getBoundingClientRect();
        if (rect) {
            const below = window.innerHeight - rect.bottom;
            setDropUp(below < POPOVER_HEIGHT && rect.top > below);
        }

        setQuery("");
        setWindow({ query: "", size: WINDOW_STEP });
        keyboardNav.current = false;

        /*
         * Start on the current value only when it is already in the first batch.
         * Seeding `active` with, say, Zimbabwe's index would force 240 rows to
         * mount and undo the windowing — the search box is the way to reach a
         * selection that far down.
         */
        const index = options.findIndex((o) => o.value === value);
        setActive(index >= 0 && index < WINDOW_STEP ? index : 0);

        setOpen(true);
    }, [options, value]);

    // Focus has to wait for the input to exist, so this one stays an effect.
    useEffect(() => {
        if (open && withSearch) searchRef.current?.focus();
    }, [open, withSearch]);

    // Mount the next batch as the end of the list comes into view.
    useEffect(() => {
        if (!open || !hasMore) return;
        const sentinel = sentinelRef.current;
        const root = listRef.current;
        if (!sentinel || !root) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) growWindow();
            },
            { root, rootMargin: "160px" }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [open, hasMore, growWindow]);

    /*
     * Keep the active row in view — but only when the keyboard moved it.
     *
     * This effect used to list `visible` as a dependency, which is a fresh slice
     * on every render, so it ran a scrollIntoView on every render: 845ms of
     * forced reflow per open in a trace, because reading layout on this page
     * means recomputing the full-viewport blurred wash and every color-mix()
     * derived from the scene tint. Scrolling on hover was wrong anyway — it
     * fought the user's own scrolling.
     */
    useEffect(() => {
        if (!open || !keyboardNav.current) return;
        listRef.current
            ?.querySelector<HTMLElement>('[data-active="true"]')
            ?.scrollIntoView({ block: "nearest" });
    }, [active, open]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    const commit = (option: SelectOption) => {
        onChange(option.value);
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open) {
            if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
                e.preventDefault();
                openList();
            }
            return;
        }

        switch (e.key) {
            case "Escape":
                e.preventDefault();
                setOpen(false);
                break;
            case "ArrowDown":
                e.preventDefault();
                keyboardNav.current = true;
                setActive((i) => Math.min(i + 1, filtered.length - 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                keyboardNav.current = true;
                setActive((i) => Math.max(i - 1, 0));
                break;
            case "Home":
                e.preventDefault();
                keyboardNav.current = true;
                setActive(0);
                break;
            case "End":
                e.preventDefault();
                keyboardNav.current = true;
                setActive(filtered.length - 1);
                break;
            case "Enter":
                e.preventDefault();
                if (filtered[active]) commit(filtered[active]);
                break;
        }
    };

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            <button
                type="button"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-haspopup="listbox"
                aria-label={ariaLabel}
                disabled={disabled}
                onClick={() => (open ? setOpen(false) : openList())}
                onKeyDown={handleKeyDown}
                className="field-trigger focus-visible:border-b-(--sc-a) focus:outline-none"
            >
                {selected?.icon}
                <span className={`flex-1 truncate text-[15px] ${selected ? "text-(--fg-primary)" : "text-fg-quaternary"}`}>
                    {selected?.label ?? placeholder}
                </span>
                <ChevronDown
                    className={`w-4 h-4 text-(--fg-tertiary) shrink-0 transition-transform duration-200 ${
                        open ? "rotate-180" : ""
                    }`}
                />
            </button>

            {open && (
                <div
                    data-drop={dropUp ? "up" : "down"}
                    className={`select-pop absolute z-50 w-full overflow-hidden border border-border-strong bg-(--bg-panel) shadow-[0_18px_54px_rgba(0,0,0,0.65)] ${
                        dropUp ? "bottom-full mb-1" : "top-full mt-1"
                    }`}
                >
                    {withSearch && (
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle">
                            <Search className="w-3.5 h-3.5 text-fg-quaternary shrink-0" />
                            <input
                                ref={searchRef}
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setActive(0);
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder={searchPlaceholder}
                                aria-label={searchPlaceholder}
                                className="w-full bg-transparent text-sm text-(--fg-primary) placeholder:text-fg-quaternary focus:outline-none"
                            />
                        </div>
                    )}

                    <ul ref={listRef} id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
                        {filtered.length === 0 && (
                            <li className="px-4 py-3 text-sm text-fg-quaternary">No matches</li>
                        )}
                        {visible.map((option, index) => {
                            const isSelected = option.value === value;
                            return (
                                <li key={option.value}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        data-active={index === active}
                                        onMouseEnter={() => {
                                            keyboardNav.current = false;
                                            setActive(index);
                                        }}
                                        onClick={() => commit(option)}
                                        className={`select-option w-full px-3 py-2.5 flex items-center gap-3 text-left text-sm transition-colors ${
                                            index === active ? "bg-white/6" : ""
                                        } ${isSelected ? "text-(--sc-a)" : "text-fg-secondary"}`}
                                    >
                                        {option.icon}
                                        <span className="flex-1 truncate">
                                            {option.label}
                                            {option.hint && (
                                                <span className="ml-2 text-fg-quaternary">{option.hint}</span>
                                            )}
                                        </span>
                                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                    </button>
                                </li>
                            );
                        })}

                        {/*
                          Watched by the observer above. Given a height so it is a
                          real intersection target, and labelled so a screen reader
                          hears why the list is still growing.
                        */}
                        {hasMore && (
                            <li
                                ref={sentinelRef}
                                aria-live="polite"
                                className="px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-fg-quaternary"
                            >
                                Loading {filtered.length - mounted} more…
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
