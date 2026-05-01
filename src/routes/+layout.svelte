<script lang="ts">
    import '../app.css';
    import { page } from '$app/stores';
    import { displayName } from '$lib/data/languageNames';
    import { languagesByIso, regionForIso } from '$lib/data/regions';
    import { requestHomeOverride, forgetLastIso } from '$lib/reader/position';
    import ChangeIndicator from '$lib/components/ChangeIndicator.svelte';
    import {
        CHANGE_DOC_URL,
        CHANGE_DOC_SSE_URL,
        onChangeIndicatorClick
    } from '$lib/data/changeIndicator';

    let { children } = $props();

    // Reader pages (/<iso>) have ReaderTopBar as their own top chrome,
    // so the app-level header + breadcrumb are hidden there.
    let isReader = $derived.by(() => {
        const segs = $page.url.pathname.split('/').filter(Boolean);
        return segs.length === 1 && languagesByIso.has(segs[0]);
    });

    // Logo (header, row 1): show the overview once without forgetting the
    // user's last language — they can still resume later from `/`.
    function keepHome() {
        requestHomeOverride();
    }

    // Breadcrumb (row 2): clicking either "Mexico" or a region anchor means
    // the user has chosen to leave the current language — drop the last-iso
    // memory so the next visit to `/` doesn't auto-redirect back to it.
    function leaveLanguage() {
        forgetLastIso();
    }

    // Breadcrumb: Mexico → (region anchor, optional) → language. URL carries
    // only the ISO; we look up which region the language belongs to so the
    // middle crumb can deep-link back to that open panel on the home page.
    type Crumb = { label: string; href: string };
    let crumbs = $derived.by<Crumb[]>(() => {
        const segs = $page.url.pathname.split('/').filter(Boolean);
        const out: Crumb[] = [{ label: 'Mexico', href: '/' }];
        if (segs.length === 1 && languagesByIso.has(segs[0])) {
            const iso = segs[0];
            const region = regionForIso(iso);
            if (region) {
                out.push({ label: region.displayName, href: `/#${region.id}` });
            }
            out.push({ label: displayName(iso), href: `/${iso}` });
        }
        return out;
    });
</script>

<div class="min-h-screen flex flex-col">
    {#if !isReader}
        <header
            class="sticky top-0 z-10 border-b"
            style="background:rgb(0,11,99);border-color:rgba(0,11,99,0.4)"
        >
            <div
                class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3"
            >
                <a
                    href="/"
                    onclick={keepHome}
                    class="text-white font-semibold tracking-tight text-lg"
                >
                    Tu Biblia mexicana
                </a>
                <div class="layout-indicator">
                    <ChangeIndicator
                        url={CHANGE_DOC_URL}
                        sseUrl={CHANGE_DOC_SSE_URL}
                        onclick={onChangeIndicatorClick}
                        solid
                    />
                </div>
            </div>
        </header>
    {/if}

    {#if crumbs.length > 1}
        <nav
            class="text-sm border-b"
            style="color:rgba(0,11,99,0.7);background:rgba(255,255,255,0.5);border-color:rgba(0,11,99,0.1)"
        >
            <div
                class="max-w-5xl mx-auto px-4 py-1.5 flex items-center justify-between gap-3"
            >
                <ol class="flex flex-wrap items-center gap-1.5 min-w-0">
                    {#each crumbs as c, i (c.href + i)}
                        <li class="flex items-center gap-1.5">
                            {#if i < crumbs.length - 1}
                                <a
                                    href={c.href}
                                    onclick={leaveLanguage}
                                    class="hover:underline"
                                    style="color:rgb(0,11,99)"
                                >
                                    {c.label}
                                </a>
                                <span aria-hidden="true" style="color:rgba(0,11,99,0.35)">›</span>
                            {:else}
                                <span style="color:rgba(0,11,99,0.65)">{c.label}</span>
                            {/if}
                        </li>
                    {/each}
                </ol>
                <ChangeIndicator
                    url={CHANGE_DOC_URL}
                    sseUrl={CHANGE_DOC_SSE_URL}
                    onclick={onChangeIndicatorClick}
                />
            </div>
        </nav>
    {/if}

    <main class="flex-1 px-4 pb-6 sm:pb-10 max-w-5xl w-full mx-auto">
        {@render children()}
    </main>

    <footer
        class="text-xs px-4 py-3 border-t"
        style="color:rgba(0,11,99,0.55);border-color:rgba(0,11,99,0.12);background:rgba(255,255,255,0.4)"
    >
        <div class="max-w-5xl mx-auto flex flex-wrap gap-x-4 gap-y-1 items-baseline">
            <span>
                Data from scriptureearth.org · CC BY-NC-ND 4.0 for included languages (see
                config/licenses.json).
            </span>
            <a
                href="/?welcome=1"
                onclick={keepHome}
                class="hover:underline"
                style="color:rgb(0,11,99)"
            >
                Ver introducción
            </a>
        </div>
    </footer>
</div>

<style>
    /* Keep the gray dot legible against the dark navy top bar. */
    :global(.layout-indicator .change-indicator.status-fresh .dot),
    :global(.layout-indicator .change-indicator.status-idle .dot) {
        background: rgba(255, 255, 255, 0.6);
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.18);
    }
</style>
