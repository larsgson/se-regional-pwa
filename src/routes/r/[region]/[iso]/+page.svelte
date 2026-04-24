<script lang="ts">
    import Reader from '$lib/reader/Reader.svelte';
    import { formatKB } from '$lib/data/pkfInfo';
    import { displayName, altName } from '$lib/data/languageNames';

    let { data } = $props();

    const pkfAssets = $derived(data.info?.assets.filter((a) => a.kind === 'pkf') ?? []);
    const totalBytes = $derived(pkfAssets.reduce((s, a) => s + (a.size ?? 0), 0));
    const primaryName = $derived(displayName(data.iso));
    const secondaryName = $derived(altName(data.iso));
</script>

<svelte:head>
    <title>{primaryName} — {data.region.displayName}</title>
</svelte:head>

<header class="mb-6">
    <h1
        class="text-2xl font-bold mb-1 tracking-tight"
        style="color:rgb(0,11,99);letter-spacing:-0.01em"
    >
        {primaryName}
    </h1>
    {#if secondaryName}
        <p class="text-sm" style="color:rgba(0,11,99,0.6)">{secondaryName}</p>
    {/if}
    <p class="text-xs mt-1" style="color:rgba(0,11,99,0.55)">
        <span class="font-mono">{data.iso}</span> · {data.region.displayName} ·
        {pkfAssets.length} collection{pkfAssets.length === 1 ? '' : 's'} · {formatKB(totalBytes)}
    </p>
</header>

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
    <section class="text-xs text-base-content/60 mt-8 pt-4 border-t border-base-300">
        <div>Build version: <span class="font-mono">{data.info.version ?? '?'}</span></div>
        <div>
            Source: <a class="link" href={data.info.source} target="_blank" rel="noreferrer">
                {data.info.source}
            </a>
        </div>
        <div>Fetched: {data.info.fetched_at}</div>
    </section>
{/if}
