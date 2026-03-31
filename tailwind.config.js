export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgMain: '#0e0e11',
        bgCard: '#18181b',
        borderSubtle: '#27272a',
        accentPrimary: '#3b82f6',
        accentHover: '#2563eb',
        textMuted: '#a1a1aa'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      }
    },
  },
  plugins: [],
}
