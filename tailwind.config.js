/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
        },
        surface: {
          DEFAULT: '#0a0a0a',
          elevated: '#161616',
          hover: '#1f1f1f',
          border: '#2f2f2f',
        },
      },
      fontFamily: {
        sans: ['"Source Sans Pro"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 20px rgba(234, 179, 8, 0.25)',
        'gold-bubble': '0 0 0 2px rgba(234, 179, 8, 0.4), inset 0 0 20px rgba(234, 179, 8, 0.08)',
      },
    },
  },
  plugins: [],
}
