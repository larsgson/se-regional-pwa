import { error } from '@sveltejs/kit';
import { regions, regionsById, languagesByIso } from '$lib/data/regions';
import { loadInfo } from '$lib/data/pkfInfo';
import { captionModeFor } from '$lib/data/figureCaptions';

export const prerender = true;

export function entries() {
    const list: Array<{ region: string; iso: string }> = [];
    for (const r of regions) {
        for (const iso of r.available) list.push({ region: r.id, iso });
    }
    return list;
}

export async function load({ params }) {
    const region = regionsById.get(params.region);
    if (!region) throw error(404, `Unknown region: ${params.region}`);
    const lang = languagesByIso.get(params.iso);
    if (!lang) throw error(404, `No data for ISO: ${params.iso}`);
    const info = await loadInfo(params.iso);

    // Pick the first pkf/catalog pair. Languages with >1 collection (e.g. hch, poi)
    // will show their first one for now; multi-collection picker is a later step.
    const pkfAsset = info?.assets.find((a) => a.kind === 'pkf') ?? null;
    const catalogAsset = pkfAsset
        ? info?.assets.find((a) => a.kind === 'json' && a.base === pkfAsset.base) ?? null
        : null;

    const pkfUrl = pkfAsset ? `/pkf/${params.iso}/${pkfAsset.name}` : null;
    const catalogUrl = catalogAsset ? `/pkf/${params.iso}/${catalogAsset.name}` : null;
    const docSetId = pkfAsset?.base ?? null;
    const styleUrl = info?.style_delta ? `/pkf/${params.iso}/${info.style_delta}` : null;

    return {
        iso: params.iso,
        region: { id: region.id, displayName: region.displayName },
        lang,
        info,
        docSetId,
        pkfUrl,
        catalogUrl,
        styleUrl,
        figureUrls: info?.figure_urls ?? {},
        captionMode: captionModeFor(params.iso),
        media: info?.media ?? { videos: [], audio: { base_url: null, items: [] } }
    };
}
