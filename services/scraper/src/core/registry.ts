import type { RunnableSource, SourceDescriptor } from "./types.js";

/**
 * A source is registered as a factory, not as an instance.
 *
 * The old module exported eleven pre-built singletons and a hand-maintained
 * `DEFAULT_SOURCES` array of strings beside them, so "is this source on by
 * default" was answered in a different file from the source itself and the two
 * drifted. Here a source declares that about itself in its descriptor, and the
 * registry is the only thing that has to know the whole set.
 *
 * Building a fresh instance per run also means a source may hold per-search
 * state — a discovered URL list, a budget — without leaking it into the next
 * request on a warm Lambda.
 */
export type SourceFactory = () => RunnableSource;

class SourceRegistry {
    private readonly factories = new Map<string, SourceFactory>();
    private readonly descriptors = new Map<string, SourceDescriptor>();

    /**
     * Registration probes the factory once to read its descriptor.
     *
     * Metadata has to be answerable without running a search — `/api/sources`
     * is a catalogue endpoint — and reading it off a throwaway instance keeps
     * the descriptor on the class where it belongs rather than duplicated into
     * the registration call.
     */
    register(factory: SourceFactory): void {
        const descriptor = factory().descriptor;
        if (this.factories.has(descriptor.key)) {
            throw new Error(`Duplicate source key: ${descriptor.key}`);
        }
        this.factories.set(descriptor.key, factory);
        this.descriptors.set(descriptor.key, descriptor);
    }

    has(key: string): boolean {
        return this.factories.has(key);
    }

    describe(): SourceDescriptor[] {
        return [...this.descriptors.values()];
    }

    /** Keys used when the caller names none. */
    defaults(): string[] {
        return this.describe().filter((d) => d.enabledByDefault).map((d) => d.key);
    }

    create(key: string): RunnableSource | null {
        return this.factories.get(key)?.() ?? null;
    }

    /**
     * The sources this call should instantiate.
     *
     * Only *configuration* is decided here — which sources the caller asked
     * for, or the defaults. Whether a configured source is worth calling for
     * this particular search is the source's own `accepts()`, so a skip is
     * reported in `meta.sources` with a reason instead of vanishing.
     */
    selectFor(requested?: string[]): RunnableSource[] {
        const keys = requested?.length ? requested.filter((key) => this.has(key)) : this.defaults();
        return keys
            .map((key) => this.create(key))
            .filter((source): source is RunnableSource => source !== null);
    }
}

export const registry = new SourceRegistry();
