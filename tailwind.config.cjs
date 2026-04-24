/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{html,js,svelte,ts}'],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: '#000B63',
                    50: '#EEEFF6',
                    100: '#D2D4E6',
                    200: '#A4A8CC',
                    300: '#777DB3',
                    400: '#494F92',
                    500: '#1C2770',
                    600: '#000B63',
                    700: '#00094F',
                    800: '#00073C',
                    900: '#000529'
                }
            },
            boxShadow: {
                'brand-soft': '0 4px 20px -8px rgba(0, 11, 99, 0.25)',
                'brand-ring': '0 0 0 3px rgba(0, 11, 99, 0.12)'
            }
        }
    },
    plugins: [require('daisyui')],
    daisyui: {
        themes: [
            {
                brand: {
                    primary: '#000B63',
                    'primary-content': '#FFFFFF',
                    secondary: '#7A5FFF',
                    accent: '#C8A951',
                    neutral: '#1F2132',
                    'base-100': '#FBFAF6',
                    'base-200': '#F3F1E9',
                    'base-300': '#E6E2D4',
                    'base-content': '#1B1D2B',
                    info: '#3ABFF8',
                    success: '#36D399',
                    warning: '#FBBD23',
                    error: '#F87272'
                }
            },
            'light',
            'dark'
        ]
    }
};
