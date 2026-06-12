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
        primary: {
          50:  '#fff0f0',
          100: '#ffe0e0',
          200: '#ffb8b8',
          300: '#ff8080',
          400: '#ff4d4d',
          500: '#cc0000',
          600: '#b30000',
          700: '#990000',
          800: '#7a0000',
          900: '#660000',
          DEFAULT: '#CC0000',
          hover: '#B30000',
        },
        bg: {
          DEFAULT: '#FFF5F5',
          dark: '#1a1a1a',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#2d2d2d',
        },
        text: {
          DEFAULT: '#333333',
          muted: '#666666',
          dark: '#f0f0f0',
        },
      },
      fontFamily: {
        sans: ['"Nirmala UI"', '"Noto Sans Sinhala"', '"Segoe UI"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 30px rgba(204,0,0,0.12)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-red': 'pulseRed 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateX(-20px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        pulseRed: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '.6' } },
      },
    },
  },
  plugins: [],
}
