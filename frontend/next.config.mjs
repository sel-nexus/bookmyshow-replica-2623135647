/** Configure development-only API proxying while keeping client requests same-origin. */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const backendOrigin = process.env.NODE_ENV === 'development' ? process.env.BACKEND_DEV_ORIGIN : process.env.BACKEND_ORIGIN;
    return backendOrigin ? [{ source: '/api/:path*', destination: `${backendOrigin}/api/:path*` }] : [];
  },
};

export default nextConfig;
