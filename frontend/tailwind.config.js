/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:'#f1f5f9', 100:'#e2e8f0', 500:'#334155',
          700:'#1e293b', 800:'#0f172a', 900:'#020617'
        },
        accent: {
          50:'#ecfdf5', 100:'#d1fae5', 500:'#10b981',
          600:'#059669', 700:'#047857'
        }
      },
      fontFamily: {
        sans: ['Inter','ui-sans-serif','system-ui','-apple-system','Segoe UI','Roboto','sans-serif'],
        display: ['"Plus Jakarta Sans"','Inter','sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.06)'
      }
    }
  },
  plugins: []
};
