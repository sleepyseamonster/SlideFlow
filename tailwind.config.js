/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        vanilla: {
          DEFAULT: '#E9E3CD',
          soft: '#F2ECDA',
        },
        pacific: {
          DEFAULT: '#40A0B2',
          deep: '#2F7F90',
        },
        slate: '#325E6A',
        sand: {
          DEFAULT: '#E9E3CD',
          light: '#F2ECDA',
          muted: '#D6CFBA',
        },
        tropical: {
          DEFAULT: '#40A0B2',
          dark: '#2F7F90',
        },
        stormy: '#325E6A',
        charcoal: '#525250',
        charcoalBrown: '#444240',
        ink: '#1B1B1A',
        surface: {
          DEFAULT: '#2E2B28',
          alt: '#34302C',
          muted: '#3B3632',
        },
      },
      borderRadius: {
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
        '3xl': '14px',
      },
      boxShadow: {
        soft: '0 18px 60px -32px rgba(0,0,0,0.55), 0 1px 0 rgba(233,227,205,0.06)',
      },
    },
  },
  plugins: [],
};
