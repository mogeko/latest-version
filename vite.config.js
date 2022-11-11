import { defineConfig } from "vite";

export default defineConfig({
  test: {
    include: ["./{src,test}/**/*.test.js"],
    coverage: {
      include: ["./src/**/*.js"],
    },
  },
});
