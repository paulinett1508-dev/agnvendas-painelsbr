import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        orange: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        dark: {
          50:  '#f5f5f7',
          100: '#e8e8ec',
          200: '#d1d1da',
          300: '#a0a0b2',
          400: '#6e6e85',
          500: '#4a4a5e',
          600: '#2e2e3e',
          700: '#1e1e2a',
          800: '#141420',
          900: '#0d0d14',
          950: '#08080d',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-in': 'slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'bar-fill': 'barFill 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        barFill: {
          from: { width: '0%' },
          to:   { width: 'var(--bar-width)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(249,115,22,0.3)' },
          '50%':       { boxShadow: '0 0 20px rgba(249,115,22,0.6)' },
        },
      },
      boxShadow: {
        'orange-glow': '0 0 20px rgba(249,115,22,0.25)',
        'orange-glow-sm': '0 0 10px rgba(249,115,22,0.15)',
        'card-dark': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6)',
        'card-light': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config
