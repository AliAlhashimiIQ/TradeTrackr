/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@tremor/react'],
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@tremor/react'],
  },
  webpack: (config) => {
    // Enable fast refresh and optimize compilation
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };
    return config;
  },
  images: {
    domains: [
      'lasbltckupplodtvwzsq.supabase.co',
    ],
  },
};

module.exports = nextConfig; 