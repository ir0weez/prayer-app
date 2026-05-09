module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  // Order matters: worklets first, then reanimated last
  plugins.push("react-native-worklets/plugin");
  plugins.push("react-native-reanimated/plugin");

  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
    plugins,
  };
};
