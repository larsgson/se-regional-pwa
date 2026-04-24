import { error } from '@sveltejs/kit';
import { languages, languagesByIso, regionForIso } from '$lib/data/regions';
import { loadInfo } from '$lib/data/pkfInfo';
import { captionModeFor } from '$lib/data/figureCaptions';

export const prerender = true;

export function entries() {
    return languages.map((l) => ({ iso: l.iso }));
}

export async function load({ params }) {
    const lang = languagesByIso.get(params.iso);
    if (!lang) throw error(404, `No data for ISO: ${params.iso}`);
    const info = await loadInfo(params.iso);

    const pkfAsset = info?.assets.find((a) => a.kind === 'pkf') ?? null;
    const catalogAsset = pkfAsset
        ? info?.assets.find((a) => a.kind === 'json' && a.base === pkfAsset.base) ?? null
        : null;

    const pkfUrl = pkfAsset ? `/pkf/${params.iso}/${pkfAsset.name}` : null;
    const catalogUrl = catalogAsset ? `/pkf/${params.iso}/${catalogAsset.name}` : null;
    const docSetId = pkfAsset?.base ?? null;
    const styleUrl = info?.style_delta ? `/pkf/${params.iso}/${info.style_delta}` : null;

    const region = regionForIso(params.iso);

    return {
        iso: params.iso,
        region: region
            ? { id: region.id, displayName: region.displayName }
            : { id: 'unclassified', displayName: 'Unclassified' },
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
