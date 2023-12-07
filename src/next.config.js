/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: true,
    serverActionsBodySizeLimit: "5gb",
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.plugins.push(
      new webpack.DefinePlugin({
        "process.env.FLUENTFFMPEG_COV": false,
      })
    );

    return config;
  },
};

module.exports = nextConfig;
