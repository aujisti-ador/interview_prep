/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 950–600 are surfaces and borders; 500–100 carry text.
        //
        // The split matters: WCAG 1.4.3 wants 4.5:1 for body text, and on a
        // ground this dark that floor lands around #6f8199. Anything below
        // ink-500 therefore cannot legally hold text — 600 and darker are for
        // borders and fills only, where no contrast minimum applies.
        ink: {
          950: '#0a0c10',
          900: '#0f1218',
          850: '#141922',
          800: '#1a212c',
          700: '#252e3c',
          600: '#354154', // borders/fills only — 1.8:1, never put text on it
          500: '#7285a1', // the dimmest legal text: 5.2 / 5.0 / 4.7:1 on ink-950/900/850
          400: '#8a9bb5', // 6.9 / 6.6 / 6.2:1
          300: '#9fadc2',
          200: '#c7d0dd',
          100: '#e6eaf1',
        },
        accent: {
          DEFAULT: '#4f9cf9',
          soft: '#7db4fb',
          dim: '#2c5f9e',
        },
        good: '#3fb950',
        warn: '#d29922',
        bad: '#f0616d',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
