import { defineConfig } from "wmr";

// Full list of options: https://wmr.dev/docs/configuration
export default defineConfig((options) => {
  const project = "arcaea-toolbelt-aol-b30";
  return {
    /* Your configuration here */
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
    },
    port: 1237,
    publicPath: options.mode === "build" ? `/${project}/` : "/",
  };
});
