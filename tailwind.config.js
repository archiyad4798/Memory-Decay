/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        paper: '#fbfaf5',
        ink: '#1f2724',
        muted: '#68716c',
        line: '#cfd3cc',
        soft: '#e8ebe5',
        sage: '#6f806f',
        'sage-dark': '#405447'
      },
      boxShadow: {
        app: '0 18px 50px rgba(32,42,37,.08)'
      },
      fontFamily: {
        display: ['Georgia', 'serif']
      }
    },
  },
  plugins: [],
};
