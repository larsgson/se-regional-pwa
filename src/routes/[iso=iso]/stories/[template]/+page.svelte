<script lang="ts">
    import { onMount } from 'svelte';
    import { TEMPLATES, type TemplateName } from '$lib/templates/types';
    import {
        templateRoot,
        categoryIdsFor,
        categoryDefFor,
        storiesFor,
        imageConfigFor
    } from '$lib/templates/templateManifest';
    import { loadLocale, localeLookup } from '$lib/templates/locales';
    import { resolveThumbUrl } from '$lib/templates/imageUrl';
    import { displayName } from '$lib/data/languageNames';

    let { data } = $props();

    const template = $derived(data.template as TemplateName);
    const iso = $derived(data.iso);

    const cfg = $derived(imageConfigFor(template));
    const localeMap = $derived(loadLocale(template, 'spa'));
    const fallbackMap = $derived(loadLocale(template, 'eng'));
    const root = $derived(templateRoot(template));
    const categoryIds = $derived(categoryIdsFor(template));

    const bookTitle = $derived(
        localeLookup(localeMap, 'title') ??
            localeLookup(fallbackMap, 'title') ??
            (TEMPLATES.find((t) => t.name === template)?.label ?? template)
    );

    const STORAGE_KEY = $derived(`bw-last-cat:${template}`);
    let openCatId = $state<string | null>(null);

    function categoryTitle(catId: string): string {
        return (
            localeLookup(localeMap, `${catId}.title`) ??
            localeLookup(fallbackMap, `${catId}.title`) ??
            `Category ${catId}`
        );
    }
    function categoryDesc(catId: string): string {
        return (
            localeLookup(localeMap, `${catId}.description`) ??
            localeLookup(fallbackMap, `${catId}.description`) ??
            ''
        );
    }
    function storyTitle(catId: string, storyId: string): string {
        const key = `${catId}.${storyId}.title`;
        return (
            localeLookup(localeMap, key) ??
            localeLookup(fallbackMap, key) ??
            `Story ${storyId}`
        );
    }

    function toggle(catId: string) {
        openCatId = openCatId === catId ? null : catId;
        if (openCatId) {
            try {
                localStorage.setItem(STORAGE_KEY, openCatId);
            } catch {
                /* ignore */
            }
        }
    }

    onMount(() => {
        // Pick a default open category: localStorage → first.
        let cat: string | null = null;
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && categoryIds.includes(saved)) cat = saved;
        } catch {
            /* ignore */
        }
        if (!cat) cat = categoryIds[0] ?? null;
        openCatId = cat;
    });
</script>

<svelte:head>
    <title>{bookTitle} — {displayName(iso)}</title>
</svelte:head>

<div class="chapter-picker">
<div class="story-nav">
    <a class="story-back" href={`/${iso}`} aria-label="Volver">
        <span aria-hidden="true">←</span>
    </a>
    <h1 class="story-nav-title">{bookTitle}</h1>
</div>

{#if !root}
    <p class="story-nav-empty">Template not available.</p>
{:else if categoryIds.length === 0}
    <p class="story-nav-empty">No categories.</p>
{:else}
    <div class="acc">
        {#each categoryIds as catId (catId)}
            {@const def = categoryDefFor(template, catId)}
            {@const stories = storiesFor(template, catId)}
            {@const isOpen = openCatId === catId}
            {@const thumb = def?.image ? resolveThumbUrl(def.image, cfg) : ''}
            <div class="acc-item" class:open={isOpen}>
                <button class="acc-header" type="button" onclick={() => toggle(catId)}>
                    {#if thumb}
                        <img class="acc-thumb" src={thumb} alt="" loading="lazy" />
                    {:else}
                        <div class="acc-thumb acc-thumb-placeholder" aria-hidden="true">📖</div>
                    {/if}
                    <div class="acc-info">
                        <span class="acc-title">{categoryTitle(catId)}</span>
                        {#if categoryDesc(catId)}
                            <span class="acc-desc">{categoryDesc(catId)}</span>
                        {/if}
                    </div>
                    <span class="acc-chev" aria-hidden="true">▸</span>
                </button>
                <div class="acc-body">
                    <div class="acc-body-inner">
                        <div class="ch-grid">
                            {#each stories as story (story.id)}
                                {@const storyThumb = (story.image || def?.image)
                                    ? resolveThumbUrl(story.image || def!.image, cfg)
                                    : ''}
                                <a
                                    class="ch-card"
                                    href={`/${iso}/stories/${template}/${catId}/${story.id}`}
                                >
                                    {#if storyThumb}
                                        <img
                                            class="ch-card-img"
                                            src={storyThumb}
                                            alt=""
                                            loading="lazy"
                                        />
                                    {:else}
                                        <div class="ch-card-img ch-card-placeholder" aria-hidden="true"></div>
                                    {/if}
                                    <div class="ch-card-info">
                                        <span class="ch-card-num">{storyTitle(catId, story.id)}</span>
                                    </div>
                                </a>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>
        {/each}
    </div>
{/if}
</div>

<style>
    /* Match the bibel-wiki ".chapter-picker" container width so the
     * picture-grid scaling stays the same on wide screens. */
    .chapter-picker {
        max-width: 700px;
        margin: 0 auto;
        padding: 0;
    }
    .story-nav {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin: 0.5rem 0 1.25rem;
    }
    .story-back {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 999px;
        text-decoration: none;
        font-size: 1.2rem;
        color: rgb(0, 11, 99);
        background: rgba(0, 11, 99, 0.06);
        transition: background 160ms ease, transform 160ms ease;
    }
    .story-back:hover, .story-back:focus-visible {
        background: rgba(0, 11, 99, 0.12);
        outline: none;
    }
    .story-nav-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: rgb(0, 11, 99);
        letter-spacing: -0.01em;
        margin: 0;
        flex: 1;
        min-width: 0;
    }
    .story-nav-empty { color: rgba(0, 11, 99, 0.55); }

    /* ---- Accordion ---- */
    .acc { display: flex; flex-direction: column; gap: 0.5rem; }
    .acc-item {
        border-radius: 12px;
        overflow: hidden;
        background: #fff;
        border: 1px solid rgba(0, 11, 99, 0.1);
    }
    .acc-item.open {
        border-color: rgba(0, 11, 99, 0.25);
        box-shadow: 0 14px 30px -16px rgba(0, 11, 99, 0.25);
    }
    .acc-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.75rem 0.95rem;
        border: 0;
        background: transparent;
        cursor: pointer;
        text-align: left;
        font: inherit;
        color: inherit;
    }
    .acc-header:hover { background: rgba(0, 11, 99, 0.04); }
    .acc-thumb {
        width: 48px;
        height: 48px;
        border-radius: 8px;
        object-fit: cover;
        flex-shrink: 0;
        background: rgba(0, 11, 99, 0.05);
    }
    .acc-thumb-placeholder { display: grid; place-items: center; font-size: 1.4rem; }
    .acc-info {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
    }
    .acc-title {
        font-weight: 600;
        color: rgb(0, 11, 99);
        line-height: 1.2;
    }
    .acc-desc {
        font-size: 0.8rem;
        color: rgba(0, 11, 99, 0.6);
        margin-top: 0.1rem;
    }
    .acc-chev {
        color: rgba(0, 11, 99, 0.55);
        transition: transform 220ms ease;
        flex-shrink: 0;
    }
    .acc-item.open .acc-chev { transform: rotate(90deg); }

    .acc-body {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.35s ease;
    }
    .acc-item.open .acc-body { max-height: 4000px; }
    .acc-body-inner { padding: 0 0.85rem 0.95rem; }

    /* ---- Story chapter cards inside an open category — sizes match
     * bibel-wiki's .chapter-grid + .chapter-card-img exactly. */
    .ch-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 12px;
    }
    @media (max-width: 500px) {
        .ch-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
        }
    }
    @media (max-width: 360px) {
        .ch-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        }
    }
    .ch-card {
        display: flex;
        flex-direction: column;
        background: #fff;
        border: 1px solid rgba(0, 11, 99, 0.08);
        border-radius: 10px;
        overflow: hidden;
        text-decoration: none;
        color: inherit;
        transition: transform 180ms ease, box-shadow 200ms ease, border-color 180ms ease;
    }
    .ch-card:hover, .ch-card:focus-visible {
        transform: translateY(-2px);
        border-color: rgba(0, 11, 99, 0.3);
        box-shadow: 0 10px 24px -14px rgba(0, 11, 99, 0.35);
        outline: none;
    }
    .ch-card-img {
        width: 100%;
        aspect-ratio: 3 / 2;
        object-fit: cover;
        display: block;
        background: rgba(0, 11, 99, 0.05);
    }
    .ch-card-info { padding: 0.4rem 0.55rem 0.55rem; }
    .ch-card-num {
        font-size: 0.82rem;
        font-weight: 600;
        color: rgb(0, 11, 99);
        line-height: 1.2;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
</style>
