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
        // Modern soft brand colors
        brand: {
          DEFAULT: "#5865f2", // Discord blurple
          hover: "#4752c4",   // Darker blurple
          light: "#7983f5",   // Lighter blurple
        },
        // Modern soft color palette
        modern: {
          indigo: "#6366f1",   // Soft indigo
          purple: "#a855f7",   // Soft purple  
          teal: "#14b8a6",     // Soft teal
          emerald: "#22c55e",  // Soft emerald
          rose: "#f43f5e",     // Soft rose
          amber: "#f59e0b",    // Soft amber
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
        // Modern soft difficulty badge colors
        difficulty: {
          easy: {
            bg: "rgba(34, 197, 94, 0.1)", // Soft green background
            text: "#22c55e",
            border: "rgba(34, 197, 94, 0.2)",
          },
          medium: {
            bg: "rgba(99, 102, 241, 0.1)", // Soft indigo background
            text: "#6366f1", 
            border: "rgba(99, 102, 241, 0.2)",
          },
          hard: {
            bg: "rgba(245, 158, 11, 0.1)", // Soft amber background
            text: "#f59e0b",
            border: "rgba(245, 158, 11, 0.2)",
          },
          insane: {
            bg: "rgba(244, 63, 94, 0.1)", // Soft rose background
            text: "#f43f5e",
            border: "rgba(244, 63, 94, 0.2)",
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)", 
        sm: "calc(var(--radius) - 4px)",
        "xl": "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        "full": "9999px",
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
        "cyber-glow": {
          "0%, 100%": { 
            boxShadow: "0 0 5px #00d9ff, 0 0 10px #00d9ff, 0 0 15px #00d9ff",
          },
          "50%": { 
            boxShadow: "0 0 10px #00d9ff, 0 0 20px #00d9ff, 0 0 30px #00d9ff, 0 0 40px #00d9ff",
          },
        },
        "neon-pulse": {
          "0%, 100%": { 
            textShadow: "0 0 5px #00ff00, 0 0 10px #00ff00",
            opacity: 1
          },
          "50%": { 
            textShadow: "0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00",
            opacity: 0.8
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
        "slide-glow": {
          "0%": { 
            transform: "translateX(-100%)",
            opacity: 0
          },
          "50%": { 
            opacity: 1
          },
          "100%": { 
            transform: "translateX(100%)",
            opacity: 0
          },
        },
        "data-stream": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-20px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "matrix-rain": "matrix-rain 3s linear infinite",
        "cyber-glow": "cyber-glow 2s ease-in-out infinite",
        "neon-pulse": "neon-pulse 1.5s ease-in-out infinite",
        "scan-line": "scan-line 2s ease-in-out infinite",
        "flicker": "flicker 0.15s ease-in-out infinite alternate",
        "slide-glow": "slide-glow 3s ease-in-out infinite",
        "data-stream": "data-stream 0.5s ease-in-out infinite alternate",
      },
      backgroundImage: {
        'cyber-grid': 'linear-gradient(rgba(0, 217, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 217, 255, 0.1) 1px, transparent 1px)',
        'neon-grid': 'linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px)',
        'terminal-scanlines': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 217, 255, 0.03) 2px, rgba(0, 217, 255, 0.03) 4px)',
        'cyber-gradient': 'linear-gradient(135deg, rgba(0, 217, 255, 0.1) 0%, rgba(255, 0, 255, 0.1) 100%)',
      },
      backgroundSize: {
        'grid': '20px 20px',
        'scanlines': '100% 4px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
