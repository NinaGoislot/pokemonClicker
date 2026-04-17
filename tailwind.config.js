export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'disabled': '#747272c4',
        'primary': '#ffb347',
        'primary-start': '#fd6f2d',
        'light': '#dadada',
        'surface-border': '#6ab4ff66',
        'surface-glass': '#ffffffb8',
        'surface-glass-border': '#19273d26',
        'enemy-border': '#93deff66',
        'capture-border': '#f6b174',
        'capture-ring': '#f6b17440',
      },
      backgroundColor: {
        'disabled': '#f5f6f6c4',
        'neutral-bg-light': '#F5F5F5', // Background clair
        'neutral-raised-light': '#FAFAFA', // fond clair par dessus le bg clair
        'neutral-overlay-light': '#EBE9F1', // Fond clair overlay
        'neutral-bg-dark': '#101a2c', // Background sombre
        'neutral-raised-dark': '#0a1423', // fond sombre par dessus le bg sombre 
        'neutral-overlay-dark': '#1D2B47', // Fond sombre overlay
        'primary': '#ffb347', // Jaune orangé
        'secondary': 'oklch(20.8% 0.042 265.755)',
      },
      keyframes: {
        "rise-in": {
          from: {
            opacity: "0",
            transform: "translateY(8px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
      animation: {
        "rise-in": "rise-in 0.35s ease",
      },
    },
  },
  plugins: [],
}
