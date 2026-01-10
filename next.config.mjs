/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure webpack for server-side bundling
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      // Prevent bundling of Node.js-specific modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
      };
    }
    
    return config;
  },
};

export default nextConfig;

