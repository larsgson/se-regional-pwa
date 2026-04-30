<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';

    type Props = {
        /** URL to monitor for changes. */
        url: string;
        /** Optional headers (e.g. Authorization). */
        headers?: Record<string, string>;
        /** How often to re-check while the page is visible (ms). */
        pollIntervalMs?: number;
        /** Click handler — only fires when status === 'changed'. */
        onclick?: () => void;
    };
    let {
        url,
        headers = {},
        pollIntervalMs = 30_000,
        onclick
    }: Props = $props();

    type IndicatorState = 'idle' | 'fresh' | 'changed' | 'error';
    let status = $state<IndicatorState>('idle');
    let lastChecked = $state(0);

    const KEY = (u: string) => `bw-doc-hash:${u}`;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let aborter: AbortController | null = null;

    async function sha256Hex(text: string): Promise<string> {
        const bytes = new TextEncoder().encode(text);
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    }

    function loadBaseline(): string | null {
        if (!browser) return null;
        try { return localStorage.getItem(KEY(url)); } catch { return null; }
    }
    function saveBaseline(hash: string) {
        if (!browser) return;
        try { localStorage.setItem(KEY(url), hash); } catch { /* silent */ }
    }

    async function check() {
        if (!browser) return;
        if (aborter) aborter.abort();
        aborter = new AbortController();
        try {
            const r = await fetch(url, {
                cache: 'no-cache',
                headers,
                signal: aborter.signal
            });
            if (!r.ok) { status = 'error'; return; }
            const text = await r.text();
            const hash = await sha256Hex(text);
            const baseline = loadBaseline();
            if (baseline === null) {
                saveBaseline(hash);
                status = 'fresh';
            } else if (baseline === hash) {
                status = 'fresh';
            } else {
                status = 'changed';
            }
            lastChecked = Date.now();
        } catch (e) {
            if ((e as Error).name === 'AbortError') return;
            status = 'error';
        }
    }

    function schedule() {
        if (timer != null) return;
        timer = setTimeout(async () => {
            timer = null;
            if (browser && document.visibilityState === 'visible') {
                await check();
            }
            schedule();
        }, pollIntervalMs);
    }

    function onVisibility() {
        if (browser && document.visibilityState === 'visible') check();
    }

    onMount(() => {
        check();
        schedule();
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('focus', onVisibility);
    });

    onDestroy(() => {
        if (timer != null) { clearTimeout(timer); timer = null; }
        if (aborter) { aborter.abort(); aborter = null; }
        if (browser) {
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('focus', onVisibility);
        }
    });

    const tooltip = $derived(
        status === 'changed'
            ? `Documento actualizado — clic para ver${lastChecked ? ` · ${new Date(lastChecked).toLocaleTimeString()}` : ''}`
            : status === 'fresh'
              ? `Sin cambios${lastChecked ? ` · ${new Date(lastChecked).toLocaleTimeString()}` : ''}`
              : status === 'error'
                ? 'No se pudo consultar el documento'
                : 'Comprobando…'
    );

    function handleClick() {
        if (status !== 'changed') return;
        onclick?.();
    }
</script>

<button
    type="button"
    class="change-indicator"
    class:status-idle={status === 'idle'}
    class:status-fresh={status === 'fresh'}
    class:status-changed={status === 'changed'}
    class:status-error={status === 'error'}
    onclick={handleClick}
    disabled={status !== 'changed'}
    aria-label={tooltip}
    title={tooltip}
>
    <span class="dot" aria-hidden="true"></span>
</button>

<style>
    .change-indicator {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border: 0;
        background: transparent;
        cursor: default;
        border-radius: 999px;
        transition: background 160ms ease;
    }
    .change-indicator:not(:disabled) { cursor: pointer; }
    .change-indicator:not(:disabled):hover {
        background: rgba(34, 197, 94, 0.12);
    }
    .change-indicator:focus-visible {
        outline: 2px solid rgb(0, 11, 99);
        outline-offset: 2px;
    }

    .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: rgba(0, 11, 99, 0.3);
        box-shadow: 0 0 0 2px rgba(0, 11, 99, 0.06);
        transition: background 200ms ease, box-shadow 220ms ease, transform 200ms ease;
    }
    .status-fresh .dot {
        background: rgba(0, 11, 99, 0.3);
    }
    .status-error .dot {
        background: rgb(217 119 6);
        box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.18);
    }
    .status-changed .dot {
        background: rgb(34, 197, 94);
        box-shadow:
            0 0 0 3px rgba(34, 197, 94, 0.22),
            0 4px 10px -2px rgba(34, 197, 94, 0.45);
        animation: pulse 1.6s ease-in-out infinite;
    }
    .change-indicator:not(:disabled):hover .dot {
        transform: scale(1.15);
    }

    @keyframes pulse {
        0%, 100% { box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.22), 0 4px 10px -2px rgba(34, 197, 94, 0.45); }
        50%      { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0),    0 4px 10px -2px rgba(34, 197, 94, 0.4); }
    }
    @media (prefers-reduced-motion: reduce) {
        .status-changed .dot { animation: none; }
    }
</style>
