import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@awaaz/config',
    '@awaaz/trpc',
    '@awaaz/types',
    '@awaaz/validation',
    '@awaaz/utils',
  ],
};

export default nextConfig;
