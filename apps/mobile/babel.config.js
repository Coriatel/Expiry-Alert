module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@expiry-alert/shared': '../../packages/shared/src',
          },
        },
      ],
    ],
  };
};
