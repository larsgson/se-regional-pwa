import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
    preprocess: vitePreprocess(),
    kit: {
        adapter: adapter({
            pages: 'build',
            assets: 'build',
            precompress: false,
            strict: true,
            // SPA fallback for the CSR-only story routes (/<iso>/stories/...).
            // Netlify needs this so any non-prerendered URL hydrates the app
            // and lets client-side routing take over.
            fallback: '200.html'
        })
    }
};
