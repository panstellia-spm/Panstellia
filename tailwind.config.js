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
          50: '#fbf7e8',
          100: '#f5edc5',
          200: '#eed999',
          300: '#e7c066',
          400: '#e1a83d',
          500: '#db912d',
          600: '#b37325',
          700: '#8c581e',
          800: '#664016',
          900: '#40280f',
        },
        luxury: {
          50: '#faf9f7',
          100: '#f2efe9',
          200: '#e5e0d4',
          300: '#d3ccb8',
          400: '#b8a98c',
          500: '#9d8664',
          600: '#846854',
          700: '#6b5142',
          800: '#564236',
          900: '#45372e',
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
