/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  webpack: (config, { isServer }) => {
    // Suppress the specific node-fetch warnings
    config.infrastructureLogging = {
      level: 'error',
    };
    
    // Only suppress warnings, don't suppress actual errors
    const originalWarn = console.warn;
    console.warn = (...args) => {
      const message = args.join(' ');
      if (message.includes('node-fetch') || message.includes('PackFileCacheStrategy')) {
        return; // Suppress these specific warnings
      }
      originalWarn.apply(console, args);
    };
    
    // Basic node-fetch handling
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'node-fetch': false,
      };
    }
    
    return config;
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
};
module.exports = nextConfig;
