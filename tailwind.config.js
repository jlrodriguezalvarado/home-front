/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#009966',
        },
        secondary: {
          DEFAULT: '#00B082',
        },
        tertiary: {
          DEFAULT: '#00C5D3',
        },
        light: {
          scaffold: '#F3F6F8',
        },
        dark: {
          scaffold: '#0D1016',
          surface: '#121722',
        }
      }
    },
  },
  plugins: [],
}
