/** @type {import('next').NextConfig} */
const nextConfig = { outputFileTracingRoot: process.cwd(), images: { remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }] } };
export default nextConfig;
