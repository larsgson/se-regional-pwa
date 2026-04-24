<script lang="ts">
    import '../app.css';
    import { page } from '$app/stores';
    import { displayName } from '$lib/data/languageNames';
    import { regionsById } from '$lib/data/regions';

    let { children } = $props();

    // Breadcrumb: only home → reader (when on an ISO page). The region
    // intermediate is collapsed into a deep-link back to the home accordion.
    type Crumb = { label: string; href: string };
    let crumbs = $derived.by<Crumb[]>(() => {
        const segs = $page.url.pathname.split('/').filter(Boolean);
        const out: Crumb[] = [{ label: 'Mexico', href: '/' }];
        if (segs[0] === 'r' && segs[1] && segs[2]) {
            const region = regionsById.get(segs[1]);
            if (region) {
                out.push({ label: region.displayName, href: `/#${region.id}` });
            }
            out.push({ label: displayName(segs[2]), href: `/r/${segs[1]}/${segs[2]}` });
        }
        return out;
    });
</script>

<div class="min-h-screen flex flex-col">
    <header
        class="sticky top-0 z-10 border-b"
        style="background:rgb(0,11,99);border-color:rgba(0,11,99,0.4)"
    >
        <div class="max-w-5xl mx-auto px-4 py-3 flex items-baseline gap-3">
            <a href="/" class="text-white font-semibold tracking-tight text-lg">
                se-regional-pwa
            </a>
            <span class="text-white/60 text-xs">Mexico</span>
        </div>
    </header>

    {#if crumbs.length > 1}
        <nav
            class="text-sm border-b"
            style="color:rgba(0,11,99,0.7);background:rgba(255,255,255,0.5);border-color:rgba(0,11,99,0.1)"
        >
            <ol class="max-w-5xl mx-auto px-4 py-2 flex flex-wrap items-center gap-1.5">
                {#each crumbs as c, i (c.href + i)}
                    <li class="flex items-center gap-1.5">
                        {#if i < crumbs.length - 1}
                            <a
                                href={c.href}
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
        </nav>
    {/if}

    <main class="flex-1 px-4 py-6 sm:py-10 max-w-5xl w-full mx-auto">
        {@render children()}
    </main>

    <footer
        class="text-xs px-4 py-3 border-t"
        style="color:rgba(0,11,99,0.55);border-color:rgba(0,11,99,0.12);background:rgba(255,255,255,0.4)"
    >
        <div class="max-w-5xl mx-auto">
            Data from scriptureearth.org · CC BY-NC-ND 4.0 for included languages (see
            config/licenses.json).
        </div>
    </footer>
</div>
