// Story-detail page: rendered client-side (loads template md, locale, pkf
// chapters, audio + timing for the active ISO — none of which is suitable
// for prerender across 134 ISOs × hundreds of stories).
export const prerender = false;
export const ssr = false;

export function load({ params }) {
    return {
        iso: params.iso,
        template: params.template,
        categoryId: params.category,
        storyId: params.story
    };
}
