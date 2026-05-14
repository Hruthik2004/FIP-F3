/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
      },
      colors: {
        fi: {
          blue: '#2563EB',
          'blue-light': '#3B82F6',
          'blue-dark': '#1D4ED8',
          indigo: '#4F46E5',
          cyan: '#06B6D4',
          green: '#10B981',
          amber: '#F59E0B',
          red: '#EF4444',
          purple: '#8B5CF6',
        },
        surface: {
          0: '#FFFFFF',
          1: '#F8FAFC',
          2: '#F1F5F9',
          3: '#E2E8F0',
          dark0: '#0F172A',
          dark1: '#1E293B',
          dark2: '#334155',
          dark3: '#475569',
        }
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
        'blue-glow': '0 0 0 3px rgba(37,99,235,0.15)',
        'panel': '0 4px 24px rgba(0,0,0,0.08)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'blink': 'blink 1.2s step-end infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        blink: { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0 } },
      }
    }
  },
  plugins: []
}
