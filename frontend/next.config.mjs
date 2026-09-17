/** Configure development-only API proxying while keeping client requests same-origin. */
const nextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }
    const backendOrigin = process.env.BACKEND_DEV_ORIGIN;
    return backendOrigin ? [{ source: '/api/:path*', destination: `${backendOrigin}/api/:path*` }] : [];
  },
};

export default nextConfig;
