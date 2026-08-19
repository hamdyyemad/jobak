"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
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
 * A styled listbox.
 *
 * A native <select> was used here first: its popup is drawn by the OS, so it
 * ignored every token in the design system and rendered as a white sheet on the
 * dark canvas. Nothing about that popup can be styled, so the list is drawn in
 * the document instead — which also buys us search, hints and icons.
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

    const rootRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const listId = useId();

    const withSearch = searchable ?? options.length > 8;
    const selected = options.find((o) => o.value === value);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter(
            (o) =>
                o.label.toLowerCase().includes(q) ||
                o.value.toLowerCase().includes(q) ||
                o.keywords?.toLowerCase().includes(q)
        );
    }, [options, query]);

    // Open on the current value so the list starts where the user left it.
    useEffect(() => {
        if (!open) return;
        setQuery("");
        const index = options.findIndex((o) => o.value === value);
        setActive(index >= 0 ? index : 0);
        if (withSearch) searchRef.current?.focus();
    }, [open, options, value, withSearch]);

    /*
     * Open upward when there is no room below. The country picker sits low on
     * its step, so opening it downward ran most of the list off the bottom of
     * the viewport. Measured on open rather than on a resize listener — the list
     * closes on any outside interaction anyway.
     */
    useEffect(() => {
        if (!open) return;
        const rect = rootRef.current?.getBoundingClientRect();
        if (!rect) return;
        const below = window.innerHeight - rect.bottom;
        setDropUp(below < POPOVER_HEIGHT && rect.top > below);
    }, [open]);

    // Keep the active row in view for keyboard-only navigation.
    useEffect(() => {
        if (!open) return;
        listRef.current
            ?.querySelector<HTMLElement>('[data-active="true"]')
            ?.scrollIntoView({ block: "nearest" });
    }, [active, open, filtered]);

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
                setOpen(true);
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
                setActive((i) => Math.min(i + 1, filtered.length - 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
                break;
            case "Home":
                e.preventDefault();
                setActive(0);
                break;
            case "End":
                e.preventDefault();
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
                onClick={() => setOpen((o) => !o)}
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
                        {filtered.map((option, index) => {
                            const isSelected = option.value === value;
                            return (
                                <li key={option.value}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        data-active={index === active}
                                        onMouseEnter={() => setActive(index)}
                                        onClick={() => commit(option)}
                                        className={`w-full px-3 py-2.5 flex items-center gap-3 text-left text-sm transition-colors ${
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
                    </ul>
                </div>
            )}
        </div>
    );
}
