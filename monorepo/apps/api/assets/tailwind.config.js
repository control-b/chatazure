/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan Phoenix templates and asset sources
  content: [
    "../lib/**/*.{ex,heex,leex,eex}",
    "./js/**/*.{js,ts}",
    "./css/**/*.css",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
