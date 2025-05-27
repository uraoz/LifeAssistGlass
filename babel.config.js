module.exports = {
  presets: ['module:@react-native/babel-preset'], // デフォルトのpresetを使用
  plugins: [
    [
      'module:react-native-dotenv',
      {
        envName: 'APP_ENV',
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
      },
    ],
  ],
};