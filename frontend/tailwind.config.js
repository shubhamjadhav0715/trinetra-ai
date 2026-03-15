/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#070b14',
        panel: '#0f1628',
        border: '#1f2d47',
        accent: '#14b8a6',
      },
      boxShadow: {
        glow: '0 0 20px rgba(20, 184, 166, 0.22)',
      },
    },
  },
  plugins: [],
}
