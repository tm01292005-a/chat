/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: true,
    serverActionsBodySizeLimit: "5gb",
  },
};

module.exports = nextConfig;
