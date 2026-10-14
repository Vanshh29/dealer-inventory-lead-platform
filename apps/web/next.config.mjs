/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@dealer/shared'],
  // Optional: when the API lives on another domain (e.g. a free hosted demo), the browser calls
  // /backend/* on this site and Next forwards it. Cookies then stay first-party and login works.
  async rewrites() {
    const target = process.env.API_PROXY_TARGET;
    return target ? [{ source: '/backend/:path*', destination: `${target}/:path*` }] : [];
  },
};
export default nextConfig;
