/** @type {import('next').NextConfig} */

// 6.5 — Bundle analyser (run: ANALYZE=true npm run build)
const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (cfg) => cfg;

const nextConfig = {
  transpilePackages: ['@tremor/react'],
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  async headers() {
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.jsdelivr.net;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com data:;
      img-src 'self' data: blob: https://*.supabase.co https://*.tradingview.com https://s3.tradingview.com https://images.unsplash.com;
      media-src 'self' data: blob: https://*.supabase.co;
      connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.stripe.com https://api.openai.com https://api.twelvedata.com https://query1.finance.yahoo.com https://api.tradingeconomics.com;
      frame-src 'self' https://js.stripe.com https://hooks.stripe.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@tremor/react', 'recharts', 'framer-motion'],
  },
  webpack: (config, { isServer }) => {
    // Enable top-level await
    config.experiments = { ...config.experiments, topLevelAwait: true };

    // 6.5 — Split heavy chart/animation libs into separate chunks
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          cacheGroups: {
            ...(config.optimization?.splitChunks?.cacheGroups ?? {}),
            recharts: {
              test: /[\\/]node_modules[\\/]recharts[\\/]/,
              name: 'recharts',
              chunks: 'all',
              priority: 30,
            },
            framerMotion: {
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              name: 'framer-motion',
              chunks: 'all',
              priority: 25,
            },
            tremor: {
              test: /[\\/]node_modules[\\/]@tremor[\\/]/,
              name: 'tremor',
              chunks: 'all',
              priority: 20,
            },
          },
        },
      };
    }

    return config;
  },
  // 6.4 — Use remotePatterns (replaces deprecated `domains`)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lasbltckupplodtvwzsq.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'gfodubbocdhjckgiualw.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.tradingview.com',
        pathname: '/**',
      },
    ],
    // Serve WebP/AVIF where supported — next/image does this automatically
    formats: ['image/avif', 'image/webp'],
    // Keep trade screenshots in Next.js image cache for 7 days
    minimumCacheTTL: 604800,
  },
};

module.exports = withBundleAnalyzer(nextConfig);