import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base path so the built assets resolve correctly regardless of
  // which sub-path the app is served from (e.g. https://user.github.io/repo/).
  // This works because the app is a single page with no client-side router.
  // If you deploy to a custom domain served from the root, './' still works.
  // Only change this if you have a specific reason to use an absolute base.
  base: "./",
});
