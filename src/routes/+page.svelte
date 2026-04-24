<script lang="ts">
    import { onMount } from 'svelte';
    import { goto, replaceState } from '$app/navigation';
    import { page } from '$app/stores';
    import { formatKB } from '$lib/data/pkfInfo';
    import {
        loadLastIso,
        consumeHomeOverride,
        loadGreetingSeen,
        loadGreetingBackShown,
        markGreetingBackShown
    } from '$lib/reader/position';
    import { languagesByIso } from '$lib/data/regions';
    import LanguageSearch from '$lib/components/LanguageSearch.svelte';
    import GreetingOverlay from '$lib/components/GreetingOverlay.svelte';

    let { data } = $props();

    let container: HTMLElement | undefined = $state();
    let showGreeting = $state(false);
    let showBackPill = $state(false);

    function onGreetingDismiss() {
        showGreeting = false;
        // Surface a one-shot "how to return" hint the first time ever.
        if (!loadGreetingBackShown()) {
            showBackPill = true;
            markGreetingBackShown();
            // Auto-hide after 12 s if the user doesn't engage with it.
            setTimeout(() => (showBackPill = false), 12000);
        }
    }
    function reopenGreeting() {
        showBackPill = false;
        showGreeting = true;
    }

    // React to ?welcome=1 landings whether on first load OR on a same-route
    // re-navigation (footer link while already on /). onMount only fires once
    // per page instance, so we need a reactive path.
    $effect(() => {
        if ($page.url.searchParams.has('welcome')) {
            showGreeting = true;
            const cleaned = new URL($page.url);
            cleaned.searchParams.delete('welcome');
            replaceState(
                cleaned.pathname + (cleaned.search ? cleaned.search : '') + cleaned.hash,
                {}
            );
        }
    });

    // One-open-at-a-time: when any <details> opens, close its siblings.
    // Also: honour `#region-id` in the URL to auto-open a region on load.
    // Plus: if the user has a last-read language, auto-resume there unless
    // they explicitly asked for the home view (via breadcrumb / logo).
    onMount(() => {
        const url = new URL(location.href);
        const forceWelcome = url.searchParams.has('welcome');
        const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
        const override = consumeHomeOverride();

        if (!forceWelcome && !hash && !override) {
            const last = loadLastIso();
            if (last && languagesByIso.has(last)) {
                goto(`/${last}`, { replaceState: true });
                return;
            }
        }

        // First-time visitors get the greeting. The $effect above handles
        // ?welcome=1 reactively on both first load and same-route re-navs.
        if (!loadGreetingSeen()) showGreeting = true;

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
    <title>Tu Biblia mexicana</title>
</svelte:head>

{#if showGreeting}
    <GreetingOverlay onDismiss={onGreetingDismiss} />
{/if}

{#if showBackPill}
    <button
        type="button"
        class="back-pill"
        onclick={reopenGreeting}
        aria-label="Volver a la introducción"
    >
        ← Ver introducción
    </button>
{/if}

<style>
    .back-pill {
        position: fixed;
        top: 64px;
        right: 14px;
        z-index: 40;
        padding: 0.55rem 0.95rem;
        border: 0;
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 600;
        color: rgb(0, 11, 99);
        background: #fff;
        cursor: pointer;
        box-shadow:
            0 8px 24px -10px rgba(0, 11, 99, 0.35),
            0 2px 6px -2px rgba(0, 11, 99, 0.12),
            0 0 0 1px rgba(0, 11, 99, 0.12);
        animation: back-pill-in 420ms cubic-bezier(0.16, 1, 0.3, 1);
        transition: transform 160ms ease, box-shadow 200ms ease;
    }
    .back-pill:hover,
    .back-pill:focus-visible {
        transform: translateY(-1px);
        box-shadow:
            0 12px 28px -10px rgba(0, 11, 99, 0.45),
            0 3px 8px -2px rgba(0, 11, 99, 0.18),
            0 0 0 1px rgba(0, 11, 99, 0.3);
        outline: none;
    }
    @keyframes back-pill-in {
        from { transform: translateX(20px); opacity: 0; }
        to   { transform: translateX(0);     opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
        .back-pill { animation: none; }
    }
</style>

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
