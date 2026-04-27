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
        hostname: 'lasbltckupplodtvwzsq.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'gfodubbocdhjckgiualw.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Serve WebP/AVIF where supported — next/image does this automatically
    formats: ['image/avif', 'image/webp'],
    // Keep trade screenshots in Next.js image cache for 7 days
    minimumCacheTTL: 604800,
  },
};

module.exports = withBundleAnalyzer(nextConfig);