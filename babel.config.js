module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: { '@': './src' },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      // Reanimated 4 moved its worklet transform into react-native-worklets.
      // This must stay last in the plugin list.
      'react-native-worklets/plugin',
    ],
  };
};
