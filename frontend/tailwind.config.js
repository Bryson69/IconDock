/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      keyframes: {
        /** Toast: slide up + fade in → hold ~1s → fade out + drift up (uses translateX(-50%) for centering) */
        "copy-confirm": {
          "0%": { opacity: "0", transform: "translate(-50%, 0.5rem)" },
          "10%": { opacity: "1", transform: "translate(-50%, 0)" },
          "72%": { opacity: "1", transform: "translate(-50%, 0)" },
          "100%": { opacity: "0", transform: "translate(-50%, -0.375rem)" }
        },
        "copy-confirm-reduced": {
          "0%": { opacity: "0" },
          "10%": { opacity: "1" },
          "72%": { opacity: "1" },
          "100%": { opacity: "0" }
        }
      },
      animation: {
        "copy-confirm": "copy-confirm 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "copy-confirm-reduced": "copy-confirm-reduced 1.8s ease-out forwards"
      }
    }
  },
  plugins: []
};
