<script lang="ts">
    let { data } = $props();
</script>

<svelte:head>
    <title>Mexico — bw-pwa</title>
</svelte:head>

<h1 class="text-2xl font-bold mb-1">Mexico</h1>
<p class="text-sm text-base-content/70 mb-6">
    Pick a language region. Counts show languages with Scripture data available /
    languages listed in the region.
</p>

<ul class="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {#each data.regions as r (r.id)}
        <li>
            <a
                href={`/r/${r.id}`}
                class="block p-4 rounded-lg border border-base-300 hover:border-primary hover:bg-base-200 transition-colors"
            >
                <div class="flex items-baseline justify-between gap-3">
                    <span class="font-medium">{r.displayName}</span>
                    <span class="text-xs text-base-content/60 tabular-nums">
                        {r.available} / {r.listed}
                    </span>
                </div>
            </a>
        </li>
    {/each}
</ul>
