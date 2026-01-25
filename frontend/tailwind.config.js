/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#2563eb',
                    hover: '#1d4ed8',
                },
                sidebar: {
                    bg: '#1e293b',
                    text: '#f1f5f9',
                },
                navbar: {
                    bg: '#ffffff',
                },
                'text-main': '#0f172a',
                'text-muted': '#64748b',
                'border-color': '#e2e8f0',
            },
            height: {
                'navbar': '64px',
            },
            width: {
                'sidebar': '280px',
                'sidebar-collapsed': '80px',
            },
            transitionProperty: {
                'width': 'width',
                'spacing': 'margin, padding',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            },
            animation: {
                fadeIn: 'fadeIn 0.5s ease-out forwards',
            }
        },
    },
    plugins: [],
}
