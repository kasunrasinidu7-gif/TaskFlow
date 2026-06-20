/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // ── Color palette from the UI design ─────────────────────────────────
      colors: {
        primary: {
          50:  '#fdf4ff',
          100: '#F4AFFA',
          200: '#F9D5F5',
          300: '#DDC0EF',
          400: '#D2ABEA',
          500: '#C697E4',
          600: '#B982DF',
          700: '#AC6ED9',
          800: '#9F59D3',
          900: '#9143CD',
          DEFAULT: '#7300C0',
        },
        sidebar: '#1a0a2e',
        page:    '#f7f0fc',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '14px',
        sm:      '8px',
        lg:      '20px',
      },
    },
  },
  plugins: [],
}
