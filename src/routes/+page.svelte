<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { formatKB } from '$lib/data/pkfInfo';
    import { loadLastIso, consumeHomeOverride } from '$lib/reader/position';
    import { languagesByIso } from '$lib/data/regions';
    import LanguageSearch from '$lib/components/LanguageSearch.svelte';

    let { data } = $props();

    let container: HTMLElement | undefined = $state();

    // One-open-at-a-time: when any <details> opens, close its siblings.
    // Also: honour `#region-id` in the URL to auto-open a region on load.
    // Plus: if the user has a last-read language, auto-resume there unless
    // they explicitly asked for the home view (via breadcrumb / logo).
    onMount(() => {
        const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
        const override = consumeHomeOverride();
        if (!hash && !override) {
            const last = loadLastIso();
            if (last && languagesByIso.has(last)) {
                goto(`/${last}`, { replaceState: true });
                return;
            }
        }

        if (!container) return;
        const accs = Array.from(container.querySelectorAll<HTMLDetailsElement>('.region-acc'));

        function closeOthers(opened: HTMLDetailsElement) {
            for (const d of accs) if (d !== opened && d.open) d.open = false;
        }
        for (const d of accs) d.addEventListener('toggle', () => { if (d.open) closeOthers(d); });

        if (hash) {
            const match = accs.find((d) => d.dataset.id === hash);
            if (match) {
                match.open = true;
                match.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });

    const totalLangs = $derived(data.regions.reduce((s, r) => s + r.languages.length, 0));
</script>

<svelte:head>
    <title>Mexico — se-regional-pwa</title>
</svelte:head>

<section class="mb-8">
    <h1
        class="text-3xl sm:text-4xl font-bold tracking-tight"
        style="color:rgb(0,11,99);letter-spacing:-0.02em"
    >
        Mexico
    </h1>
    <p class="mt-2 text-sm" style="color:rgba(0,11,99,0.65)">
        {totalLangs} Scripture translations across {data.regions.length} language regions. Search
        by name or ISO code, or browse by region below.
    </p>
</section>

<div class="mb-6">
    <LanguageSearch languages={data.allLanguages} />
</div>

<div bind:this={container} class="space-y-3">
    {#each data.regions as region (region.id)}
        <details class="region-acc" id={region.id} data-id={region.id}>
            <summary>
                <span class="region-chevron" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
                        <path d="M7 5l6 5-6 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </span>
                <span class="region-title">{region.displayName}</span>
                <span class="region-count">{region.languages.length}</span>
            </summary>

            <div class="region-body">
                {#if region.languages.length === 0}
                    <p class="text-sm" style="color:rgba(0,11,99,0.55)">
                        No Scripture data available.
                    </p>
                {:else}
                    <ul class="lang-grid">
                        {#each region.languages as lang (lang.iso)}
                            <li>
                                <a
                                    href={`/${lang.iso}`}
                                    class="lang-card"
                                >
                                    <span class="lang-name">{lang.name}</span>
                                    {#if lang.alt}
                                        <span class="lang-alt">{lang.alt}</span>
                                    {/if}
                                    <span class="lang-meta">
                                        <span class="lang-iso">{lang.iso}</span>
                                        <span>{formatKB(lang.sizeBytes)}</span>
                                    </span>
                                </a>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>
        </details>
    {/each}
</div>
