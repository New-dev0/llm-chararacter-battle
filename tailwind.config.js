/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'battle-red': '#FF4136',
        'battle-blue': '#0074D9',
        'battle-yellow': '#FFDC00',
        'battle-green': '#2ECC40',
        'battle-purple': '#B10DC9',
        'battle-orange': '#FF851B',
        'battle-gray': '#AAAAAA',
      },
      fontFamily: {
        'pixel': ['Press Start 2P', 'cursive'],
        'battle': ['Bangers', 'cursive'],
      },
    },
  },
  plugins: [],
};
