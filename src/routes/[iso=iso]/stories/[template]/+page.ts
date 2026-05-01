// Template page — accordion of categories. CSR-only.
export const prerender = false;
export const ssr = false;

export function load({ params }) {
    return { iso: params.iso, template: params.template };
}
