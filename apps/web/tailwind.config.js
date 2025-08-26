/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
        display: ['Orbitron', 'Arial', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Brand color (emerald-500 as specified)
        brand: {
          DEFAULT: "#10b981", // emerald-500
          hover: "#059669",   // emerald-600
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        // Difficulty badge colors as specified
        difficulty: {
          easy: {
            bg: "#10b98126", // rgba(16, 185, 129, 0.15)
            text: "#6ee7b7",
            border: "#10b98166", // rgba(16, 185, 129, 0.4)
          },
          medium: {
            bg: "#84cc2226", // rgba(132, 204, 22, 0.15)
            text: "#bef264", 
            border: "#84cc2266", // rgba(132, 204, 22, 0.4)
          },
          hard: {
            bg: "#f59e0b26", // rgba(245, 158, 11, 0.15)
            text: "#fcd34d",
            border: "#f59e0b66", // rgba(245, 158, 11, 0.4)
          },
          insane: {
            bg: "#ef444426", // rgba(239, 68, 68, 0.15)
            text: "#fca5a5",
            border: "#ef444466", // rgba(239, 68, 68, 0.4)
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem", // As specified in requirements
      },
      boxShadow: {
        focus: "0 0 0 2px rgba(163, 230, 53, 0.4)", // lime-300 at 40% opacity
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "matrix-rain": {
          "0%": { transform: "translateY(-100%)", opacity: 0 },
          "10%": { opacity: 1 },
          "90%": { opacity: 1 },
          "100%": { transform: "translateY(100vh)", opacity: 0 },
        },
        "glow-pulse": {
          "0%, 100%": { 
            textShadow: "0 0 5px hsl(var(--primary)), 0 0 10px hsl(var(--primary))",
            boxShadow: "0 0 5px hsl(var(--primary) / 0.5)",
          },
          "50%": { 
            textShadow: "0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary)), 0 0 30px hsl(var(--primary))",
            boxShadow: "0 0 15px hsl(var(--primary) / 0.8)",
          },
        },
        "scan-line": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "flicker": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.8 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "matrix-rain": "matrix-rain 3s linear infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "scan-line": "scan-line 2s ease-in-out infinite",
        "flicker": "flicker 0.15s ease-in-out infinite alternate",
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px)',
        'terminal-scanlines': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.03) 2px, rgba(0, 255, 0, 0.03) 4px)',
      },
      backgroundSize: {
        'grid': '20px 20px',
        'scanlines': '100% 4px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
