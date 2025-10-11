/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html','./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base colors from the Cosmic Garden system
        cream: '#F4EFE6',
        surface: '#FFFDF9',
        sage: '#6E8F7A',
        deepSage: '#2F4A3F',
        gold: '#D8AE3D',
        coral: '#E06F5E',
        teal: '#2EC489',
        navy: '#0F1A1C',
        navyElev: '#132327',
        textPrimaryLight: '#2F4A3F',
        textSecondaryLight: '#617D70',
        borderMutedLight: '#E5DFD6',
        
        // Enhanced cosmic colors for the breathing orb and effects
        cosmic: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        
        // Mood-specific colors for the orb
        mood: {
          stormy: '#64748b',    // Slate for stormy (1)
          foggy: '#94a3b8',     // Light slate for foggy (2)
          overcast: '#cbd5e1',  // Very light slate for overcast (3)
          calm: '#fbbf24',      // Amber for calm (4)
          upbeat: '#f59e0b',    // Orange for upbeat (5)
          aurora: '#8b5cf6',    // Purple for aurora (6)
        }
      },
      borderRadius: { 
        xl: '16px',
        '2xl': '24px',
        '3xl': '32px'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Quicksand', 'system-ui', 'sans-serif'],
      },
      animation: {
        'breathe': 'breathe 8s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-out',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(46, 196, 137, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(46, 196, 137, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'cosmic': '0 0 30px rgba(46, 196, 137, 0.3)',
        'glow-teal': '0 0 20px rgba(46, 196, 137, 0.4)',
        'glow-gold': '0 0 20px rgba(216, 174, 61, 0.4)',
      },
      backdropBlur: {
        xs: '2px',
      }
    }
  },
  plugins: []
};
