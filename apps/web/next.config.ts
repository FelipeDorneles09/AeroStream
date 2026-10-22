import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@aerostream/shared-types'],
};

export default nextConfig;
