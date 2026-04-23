<script lang="ts">
    import '../app.css';
    import { page } from '$app/stores';

    let { children } = $props();

    // Derive breadcrumb from route. Keep it dumb; pages own their own headings.
    let crumbs = $derived.by(() => {
        const segs = $page.url.pathname.split('/').filter(Boolean);
        const out: Array<{ label: string; href: string }> = [{ label: 'Mexico', href: '/' }];
        if (segs[0] === 'r' && segs[1]) {
            out.push({ label: segs[1], href: `/r/${segs[1]}` });
            if (segs[2]) out.push({ label: segs[2], href: `/r/${segs[1]}/${segs[2]}` });
        }
        return out;
    });
</script>

<div class="min-h-screen flex flex-col">
    <header class="navbar bg-base-200 border-b border-base-300">
        <div class="flex-1 px-2">
            <a href="/" class="text-lg font-semibold tracking-tight">bw-pwa</a>
        </div>
    </header>

    <nav class="px-4 py-2 text-sm text-base-content/70 bg-base-100 border-b border-base-300">
        <div class="breadcrumbs py-0">
            <ul>
                {#each crumbs as c, i (c.href)}
                    <li>
                        {#if i < crumbs.length - 1}
                            <a href={c.href} class="link link-hover">{c.label}</a>
                        {:else}
                            <span>{c.label}</span>
                        {/if}
                    </li>
                {/each}
            </ul>
        </div>
    </nav>

    <main class="flex-1 p-4 max-w-5xl w-full mx-auto">
        {@render children()}
    </main>

    <footer class="text-xs text-base-content/50 px-4 py-3 border-t border-base-300">
        Data: scriptureearth.org via scripts/fetch_pkf.py · Regions: config/regions.conf
    </footer>
</div>
