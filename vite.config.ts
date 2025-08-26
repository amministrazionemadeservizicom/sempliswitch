import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { createServer } from "./server";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [
    react(),
    // Only use Express plugin in standalone Vite mode, not with Netlify Dev
    ...(process.env.VITE_STANDALONE ? [expressPlugin()] : []),
    copyRedirectsPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve",
    configureServer(server) {
      const app = createServer();
      server.middlewares.use(app);
    },
  };
}

// ✅ Plugin che copia il file _redirects nella cartella di build
function copyRedirectsPlugin(): Plugin {
  return {
    name: "copy-redirects",
    apply: "build",
    closeBundle() {
      const source = path.resolve(__dirname, "public/_redirects");
      const destination = path.resolve(__dirname, "dist/spa/_redirects");
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, destination);
        console.log("✅ File _redirects copiato in dist/spa/");
      } else {
        console.warn("⚠️ File _redirects non trovato in public/");
      }
    },
  };
}
