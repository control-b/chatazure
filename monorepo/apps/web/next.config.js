/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', '*.blob.core.windows.net', '*.azurecontainerapps.io'],
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  PHOENIX_WS_URL: process.env.PHOENIX_WS_URL || 'ws://localhost:4000/socket',
  NEXT_PUBLIC_PHOENIX_WS_URL: process.env.NEXT_PUBLIC_PHOENIX_WS_URL || process.env.PHOENIX_WS_URL || 'ws://localhost:4000/socket',
    YJS_WS_URL: process.env.YJS_WS_URL || 'ws://localhost:4001',
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:4000/api',
  },
  async rewrites() {
    return [
      {
        source: '/api/phoenix/:path*',
        destination: `${process.env.API_BASE_URL || 'http://localhost:4000/api'}/:path*`,
      },
    ];
  },
  webpack: (config) => {
    // Use package export for phoenix (esm)
    config.resolve.alias = {
      ...config.resolve.alias,
      phoenix: 'phoenix',
    }
    return config
  },
};

module.exports = nextConfig;
