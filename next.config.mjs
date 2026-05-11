/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
    serverActions: {
      bodySizeLimit: "4mb",
      allowedOrigins: ["localhost:3080", "127.0.0.1:3080"],
    },
  },
};

export default nextConfig;
