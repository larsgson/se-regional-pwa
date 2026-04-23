<script lang="ts">
    import { formatKB } from '$lib/data/pkfInfo';

    let { data } = $props();
</script>

<svelte:head>
    <title>{data.region.displayName} — bw-pwa</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-1">{data.region.displayName}</h1>
<p class="text-sm text-base-content/70 mb-6">
    {data.available.length} language{data.available.length === 1 ? '' : 's'} with data available
    {#if data.missing.length > 0}
        · {data.missing.length} listed without data
    {/if}
</p>

{#if data.available.length === 0}
    <div class="p-4 rounded-lg border border-base-300 bg-base-200 text-sm">
        No scripture data fetched yet for this region.
    </div>
{:else}
    <ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {#each data.available as lang (lang.iso)}
            <li>
                <a
                    href={`/r/${data.region.id}/${lang.iso}`}
                    class="block p-4 rounded-lg border border-base-300 hover:border-primary hover:bg-base-200 transition-colors"
                >
                    <div class="flex items-baseline justify-between gap-2">
                        <span class="font-mono font-medium text-lg">{lang.iso}</span>
                        <span class="text-xs text-base-content/60 tabular-nums">
                            {formatKB(lang.sizeBytes)}
                        </span>
                    </div>
                    <div class="text-xs text-base-content/60 mt-1">
                        {lang.pkfCount} collection{lang.pkfCount === 1 ? '' : 's'}
                    </div>
                </a>
            </li>
        {/each}
    </ul>
{/if}

{#if data.missing.length > 0}
    <details class="mt-8">
        <summary class="cursor-pointer text-sm text-base-content/70">
            Listed in region but no data fetched ({data.missing.length})
        </summary>
        <div class="mt-2 flex flex-wrap gap-1">
            {#each data.missing as iso (iso)}
                <span
                    class="font-mono text-xs px-2 py-1 rounded bg-base-200 text-base-content/60"
                >
                    {iso}
                </span>
            {/each}
        </div>
    </details>
{/if}
