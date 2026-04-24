import { languagesByIso } from '$lib/data/regions';

/** Match only segments that are a known ISO in the current release manifest.
 *  Keeps /<anything-else> from being captured by the [iso=iso] route. */
export function match(value: string): boolean {
    return languagesByIso.has(value);
}
