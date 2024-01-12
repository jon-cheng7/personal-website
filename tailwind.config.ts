import colors from 'tailwindcss/colors';
import { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './ui/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  future: {
    hoverOnlyWhenSupported: true,
  },
  darkMode: 'class',
  theme: {
    extend: {
      // https://vercel.com/design/color
      colors: {
        gray: colors.zinc,
        'gray-1000': 'rgb(17,17,19)',
        'gray-1100': 'rgb(10,10,11)',
        vercel: {
          pink: '#FF0080',
          blue: '#0070F3',
          cyan: '#50E3C2',
          orange: '#F5A623',
          violet: '#7928CA',
        },
        theme: {
          red: '#ED5151',
          blue: '#4C4F6C',
          brown: '#B7B0A4',
        },
      },
      backgroundImage: ({ theme }) => ({
        'vc-border-gradient': `radial-gradient(at left top, ${theme(
          'colors.gray.500',
        )}, 50px, ${theme('colors.gray.800')} 50%)`,
        custom: `url('/bg.png')`,
      }),
      fontFamily: {
        cygre: ['Cygre', 'sans-serif'],
        mosk: ['Mosk', 'sans-serif'],
        gyanko: ['Gyanko', 'sans-serif'],
        gothic: ['FieldGothic', 'sans-serif'],
        steelfish: ['SteelFish', 'sans-serif'],
      },
      keyframes: ({ theme }) => ({
        brownian: {
          '0%': { transform: 'translate(0, 0) rotate(0deg)' },
          '10%': { transform: 'translate(-10px, 10px) rotate(15deg)' },
          '20%': { transform: 'translate(10px, -10px) rotate(-15deg)' },
          '30%': { transform: 'translate(5px, 10px) rotate(-30deg)' },
          '40%': { transform: 'translate(-10px, -5px) rotate(30deg)' },
          '50%': { transform: 'translate(10px, 5px) rotate(20deg)' },
          '60%': { transform: 'translate(-5px, -10px) rotate(-20deg)' },
          '70%': { transform: 'translate(-10px, 10px) rotate(5deg)' },
          '80%': { transform: 'translate(10px, -5px) rotate(-5deg)' },
          '90%': { transform: 'translate(-5px, 10px) rotate(-10deg)' },
          '100%': { transform: 'translate(0, 0) rotate(0deg)' },
        },
        marquee: {
          '0%': { transform: 'translate(0%, -50%)' },
          '50%': { transform: 'translate(-5%, -50%)' },
          '50.5%': { transform: 'translate(-5%, -50%)' },
          '100%': { transform: 'translate(0%, -50%)' },
        },
        ripple: {
          '0%': {
            transform: 'scale(0)',
            opacity: '1',
          },
          '100%': {
            transform: 'scale(2.5)',
            opacity: '1',
          },
        },
        fadeIn: {
          '0%': {
            opacity: '0',
          },
          '40%': {
            opacity: '0',
          },
          '100%': {
            opacity: '1',
          },
        },
        fadeOut: {
          '0%': {
            opacity: '1',
          },
          '40%': {
            opacity: '1',
          },
          '100%': {
            opacity: '0',
          },
        },
        rerender: {
          '0%': {
            ['border-color']: theme('colors.vercel.pink'),
          },
          '40%': {
            ['border-color']: theme('colors.vercel.pink'),
          },
        },
        highlight: {
          '0%': {
            background: theme('colors.vercel.pink'),
            color: theme('colors.white'),
          },
          '40%': {
            background: theme('colors.vercel.pink'),
            color: theme('colors.white'),
          },
        },
        loading: {
          '0%': {
            opacity: '.2',
          },
          '20%': {
            opacity: '1',
            transform: 'translateX(1px)',
          },
          to: {
            opacity: '.2',
          },
        },
        shimmer: {
          '100%': {
            transform: 'translateX(100%)',
          },
        },
        translateXReset: {
          '100%': {
            transform: 'translateX(0)',
          },
        },
        fadeToTransparent: {
          '0%': {
            opacity: '1',
          },
          '40%': {
            opacity: '1',
          },
          '100%': {
            opacity: '0',
          },
        },
        squish: {
          '50%': {
            transform: 'scale(1.4)',
          },
        },
        slide: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-126%)' },
        },
      }),
      animation: {
        fadeIn: 'fadeIn 1s ease-in-out',
        fadeOut: 'fadeOut 0.5s ease-in-out',
        squish: 'squish 200ms ease-in-out',
        slide: 'slide 10s linear infinite',
        brownian: 'brownian 20s infinite',
        ripple: 'ripple 0.6s linear',
        marquee: 'marquee 10s linear infinite',
      },
      boxShadow: {
        'custom-hover': '0px 30px 100px -10px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')],
} satisfies Config;
