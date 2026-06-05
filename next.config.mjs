/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins:
    process.env.NODE_ENV === 'development' ? [process.env.NGROK_URL].filter(Boolean) : [],
};

export default nextConfig;
