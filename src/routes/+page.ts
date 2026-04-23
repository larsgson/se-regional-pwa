import { regions } from '$lib/data/regions';

export const prerender = true;

export function load() {
    return {
        regions: regions.map((r) => ({
            id: r.id,
            displayName: r.displayName,
            fullName: r.fullName,
            listed: r.isos.length,
            available: r.available.length
        }))
    };
}
