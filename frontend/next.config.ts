import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Node 24 can close the detached CLI type-checker's stdout before Next reads
  // `tsc --showConfig`. The compiler API is the documented stable path for
  // TypeScript 5/6 and keeps production builds deterministic.
  experimental: { useTypeScriptCli: false },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
