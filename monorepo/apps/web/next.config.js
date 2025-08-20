/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations for 20M+ DAU
  experimental: {
    ppr: true, // Partial Pre-rendering
    reactCompiler: true, // React Compiler for better performance
    optimizePackageImports: ['@headlessui/react', '@heroicons/react'],
    turbotrace: {
      logLevel: 'error'
    }
  },
  
  // Output configuration for container deployment
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Image optimization
  images: {
    domains: ['localhost', '*.blob.core.windows.net', '*.azurecontainerapps.io'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400, // 24 hours
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Compression and caching
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // Environment variables
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    PHOENIX_WS_URL: process.env.PHOENIX_WS_URL || 'ws://localhost:4000/socket',
    NEXT_PUBLIC_PHOENIX_WS_URL: process.env.NEXT_PUBLIC_PHOENIX_WS_URL || process.env.PHOENIX_WS_URL || 'ws://localhost:4000/socket',
    YJS_WS_URL: process.env.YJS_WS_URL || 'ws://localhost:4001',
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:4000/api',
    NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL,
    NEXT_PUBLIC_ENVIRONMENT: process.env.NODE_ENV,
  },
  
  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // API proxying for better performance
  async rewrites() {
    return [
      {
        source: '/api/phoenix/:path*',
        destination: `${process.env.API_BASE_URL || 'http://localhost:4000/api'}/:path*`,
      },
    ];
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Use package export for phoenix (esm)
    config.resolve.alias = {
      ...config.resolve.alias,
      phoenix: 'phoenix',
    };
    
    // Production optimizations
    if (!dev) {
      // Tree shaking and dead code elimination
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // Bundle analyzer in production
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
          })
        );
      }
    }
    
    // Module federation for micro-frontend architecture (future scaling)
    if (process.env.ENABLE_MODULE_FEDERATION === 'true') {
      const { ModuleFederationPlugin } = require('@module-federation/webpack');
      config.plugins.push(
        new ModuleFederationPlugin({
          name: 'trucking_web',
          filename: 'remoteEntry.js',
          exposes: {
            './Chat': './src/components/app/chat-window',
            './Dashboard': './src/components/dashboard',
          },
          shared: {
            react: { singleton: true },
            'react-dom': { singleton: true },
            next: { singleton: true },
          },
        })
      );
    }
    
    return config;
  },
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // ESLint configuration for production
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  
  // Logging configuration
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },
};

module.exports = nextConfig;
