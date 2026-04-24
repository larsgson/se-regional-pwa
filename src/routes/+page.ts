import { regions, pkfSizeBytes } from '$lib/data/regions';
import { displayName, altName } from '$lib/data/languageNames';

export const prerender = true;

export function load() {
    const regionsOut = regions.map((r) => ({
        id: r.id,
        displayName: r.displayName,
        languages: r.available.map((iso) => ({
            iso,
            name: displayName(iso),
            alt: altName(iso),
            sizeBytes: pkfSizeBytes(iso)
        }))
    }));

    // Flat index for the autocomplete. Each iso is listed under exactly one
    // region here — the first one it appears in — to give the search a stable
    // target URL. Search treats n/v/iso as matchable fields.
    const seen = new Set<string>();
    const allLanguages: Array<{
        iso: string;
        name: string;
        alt?: string;
        regionId: string;
        regionName: string;
    }> = [];
    for (const r of regionsOut) {
        for (const lang of r.languages) {
            if (seen.has(lang.iso)) continue;
            seen.add(lang.iso);
            allLanguages.push({
                iso: lang.iso,
                name: lang.name,
                alt: lang.alt,
                regionId: r.id,
                regionName: r.displayName
            });
        }
    }
    allLanguages.sort((a, b) => a.name.localeCompare(b.name));

    return { regions: regionsOut, allLanguages };
}
