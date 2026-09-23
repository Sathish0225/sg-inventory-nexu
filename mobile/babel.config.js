// "@/..." resolves to the web app's src/ for code shared with the phone app (types, GST maths,
// permissions, printable documents); "~/..." is this app's own src/.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: { "@": "../src", "~": "./src" },
          extensions: [".ts", ".tsx", ".js", ".json"],
        },
      ],
    ],
  };
};
