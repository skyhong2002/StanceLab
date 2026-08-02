import adapterCloudflare from "@sveltejs/adapter-cloudflare";
import adapterStatic from "@sveltejs/adapter-static";

const isGithubPages = process.env.DEPLOY_TARGET === "github-pages";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
    runes: ({ filename }) =>
      filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
  },
  kit: {
    adapter: isGithubPages
      ? adapterStatic({ fallback: "404.html" })
      : adapterCloudflare(),
    paths: {
      base: process.env.BASE_PATH ?? "",
    },
  },
};

export default config;
