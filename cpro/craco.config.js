/** CRACO — ignora avisos de source map quebrados do face-api.js no build (Render) */
module.exports = {
  webpack: {
    configure: (config) => {
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        /Failed to parse source map/,
        /ENOENT/,
      ];
      return config;
    },
  },
};
