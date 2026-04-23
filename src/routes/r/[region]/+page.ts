import { error } from '@sveltejs/kit';
import { regions, regionsById, languagesByIso, pkfSizeBytes } from '$lib/data/regions';

export const prerender = true;

export function entries() {
    return regions.map((r) => ({ region: r.id }));
}

export function load({ params }) {
    const region = regionsById.get(params.region);
    if (!region) throw error(404, `Unknown region: ${params.region}`);

    const available = region.available.map((iso) => {
        const lang = languagesByIso.get(iso)!;
        return {
            iso,
            version: lang.version,
            pkfCount: lang.pkfs.length,
            sizeBytes: pkfSizeBytes(iso)
        };
    });
    const missing = region.isos.filter((iso) => !languagesByIso.has(iso));

    return {
        region: {
            id: region.id,
            displayName: region.displayName,
            trade: region.trade,
            regional: region.regional
        },
        available,
        missing
    };
}
