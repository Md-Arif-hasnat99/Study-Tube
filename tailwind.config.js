/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#F7F7F5',
          surface: '#FFFFFF',
          text: '#171717',
          muted: '#737373',
          border: '#E5E5E5',
          dark: {
            bg: '#151515',
            surface: '#202020',
            text: '#F5F5F5',
            border: '#343434',
          }
        },
        focus: {
          green: '#2F6B4F',
          light: '#E7F0E9',
          warning: '#C58B36',
          error: '#B84646',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Geist', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

