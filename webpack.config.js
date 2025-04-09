import path from "path";

const __dirname = import.meta.dirname;
const exports = {
  mode: "development",
  devtool: "inline-source-map",
  entry: {
    background: {
      import: "./scripts/background.js",
      chunkLoading: `import-scripts`,
    },
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
  },
};
export default exports;
