<script lang="ts">
    import Reader from '$lib/reader/Reader.svelte';
    import { displayName } from '$lib/data/languageNames';

    let { data } = $props();

    const primaryName = $derived(displayName(data.iso));
</script>

<svelte:head>
    <title>{primaryName} — {data.region.displayName}</title>
</svelte:head>

{#if data.docSetId && data.pkfUrl && data.catalogUrl}
    <Reader
        iso={data.iso}
        docSetId={data.docSetId}
        pkfUrl={data.pkfUrl}
        catalogUrl={data.catalogUrl}
        styleUrl={data.styleUrl}
        figureUrls={data.figureUrls}
        captionMode={data.captionMode}
        media={data.media}
    />
{:else}
    <div class="alert alert-warning text-sm">
        No pkf / catalog asset found for this language in info.json.
    </div>
{/if}

{#if data.info}
    <section class="text-xs mt-8 pt-4 border-t" style="color:rgba(0,11,99,0.5);border-color:rgba(0,11,99,0.12)">
        <div>Build version: <span class="font-mono">{data.info.version ?? '?'}</span></div>
        <div>
            Source: <a class="link" href={data.info.source} target="_blank" rel="noreferrer">
                {data.info.source}
            </a>
        </div>
        <div>Fetched: {data.info.fetched_at}</div>
    </section>
{/if}
