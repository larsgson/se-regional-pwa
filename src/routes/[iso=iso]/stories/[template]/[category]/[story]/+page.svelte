<script lang="ts">
    import { onMount } from 'svelte';
    import StoryReader from '$lib/components/StoryReader.svelte';
    import { displayName } from '$lib/data/languageNames';
    import { loadInfo } from '$lib/data/pkfInfo';
    import { fetchCatalog } from '$lib/reader/catalog';
    import type { TemplateName } from '$lib/templates/types';

    let { data } = $props();

    type Resolved = {
        docSetId: string;
        pkfUrl: string;
        catalog: import('$lib/reader/catalog').Catalog;
        media: import('$lib/data/pkfInfo').MediaManifest;
    };
    let resolved = $state<Resolved | null>(null);
    let loadError = $state<string | null>(null);

    onMount(async () => {
        try {
            const info = await loadInfo(data.iso);
            if (!info) {
                loadError = `No data for ISO: ${data.iso}`;
                return;
            }
            const pkfAsset = info.assets.find((a) => a.kind === 'pkf') ?? null;
            const catalogAsset = pkfAsset
                ? info.assets.find((a) => a.kind === 'json' && a.base === pkfAsset.base) ?? null
                : null;
            if (!pkfAsset || !catalogAsset) {
                loadError = 'No pkf / catalog asset for this ISO';
                return;
            }
            const docSetId = pkfAsset.base;
            const pkfUrl = `/pkf/${data.iso}/${pkfAsset.name}`;
            const catalogUrl = `/pkf/${data.iso}/${catalogAsset.name}`;
            const catalog = await fetchCatalog(catalogUrl);
            const media = info.media ?? { videos: [], audio: { base_url: null, items: [] } };
            resolved = { docSetId, pkfUrl, catalog, media };
        } catch (e) {
            loadError = e instanceof Error ? e.message : String(e);
        }
    });
</script>

<svelte:head>
    <title>{displayName(data.iso)} — {data.template} {data.categoryId}/{data.storyId}</title>
</svelte:head>

<div class="story-page-shell">
    <a
        class="story-back"
        href={`/${data.iso}/stories/${data.template}`}
        aria-label="Volver"
    >
        <span aria-hidden="true">←</span>
        <span>{data.template}</span>
    </a>
</div>

{#if loadError}
    <p class="story-page-error">{loadError}</p>
{:else if !resolved}
    <p class="story-page-loading">Cargando…</p>
{:else}
    <StoryReader
        template={data.template as TemplateName}
        categoryId={data.categoryId}
        storyId={data.storyId}
        iso={data.iso}
        docSetId={resolved.docSetId}
        pkfUrl={resolved.pkfUrl}
        catalog={resolved.catalog}
        media={resolved.media}
    />
{/if}

<style>
    .story-page-loading,
    .story-page-error {
        color: rgba(0, 11, 99, 0.65);
        padding: 1rem;
    }
    .story-page-error {
        color: rgb(146 64 14);
        background: rgba(217, 119, 6, 0.1);
        border-radius: 10px;
    }
    .story-back {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        margin: 0.5rem 0 0.85rem;
        padding: 0.35rem 0.7rem 0.35rem 0.55rem;
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 600;
        color: rgb(0, 11, 99);
        background: rgba(0, 11, 99, 0.06);
        text-decoration: none;
        transition: background 160ms ease, transform 160ms ease;
    }
    .story-back:hover, .story-back:focus-visible {
        background: rgba(0, 11, 99, 0.12);
        outline: none;
    }
    .story-back:active { transform: translateX(-1px); }
    /* Keep the back link aligned with the narrow story shell. */
    .story-page-shell {
        max-width: 700px;
        margin: 0 auto;
    }
</style>
