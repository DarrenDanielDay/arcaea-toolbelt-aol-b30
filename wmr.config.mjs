import { defineConfig } from "wmr";

// Full list of options: https://wmr.dev/docs/configuration
export default defineConfig((options) => {
  const project = "arcaea-toolbelt-aol-b30";
  return {
    /* Your configuration here */
    port: 1237,
    publicPath: options.mode === "build" ? `/${project}/` : "/",
  };
});
