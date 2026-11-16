/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-paper': '#FAF7F2',
        'bg-card': '#FFFFFF',
        'ink': '#231F20',
        'muted': '#6E665F',
        'accent': '#C85A32',
        'accent-soft': '#F7E6DF',
        'teal-custom': '#2A6F68',
        'border-custom': '#E5DDD3',
      },
      fontFamily: {
        serif: ['Fraunces', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
