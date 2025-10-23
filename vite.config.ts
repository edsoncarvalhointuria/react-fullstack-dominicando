import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
    build: {
        sourcemap: false,
    },
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["favicon.svg", "apple-touch-icon.png"],
            // strategies: "injectManifest",
            // srcDir: "src",
            // filename: "firebase-messaging-sw.ts",
            filename: "firebase-messaging-sw.js",

            manifest: {
                name: "Dominicando",
                short_name: "Dominicando",
                description:
                    "Gestão Inteligente para sua Escola Dominical. Controle chamadas, relatórios e o engajamento dos seus alunos em um só lugar.",
                theme_color: "#ffffff",
                background_color: "#ffffff",
                display: "standalone",
                scope: "/",
                start_url: "/",
                orientation: "portrait",
                icons: [
                    {
                        src: "web-app-manifest-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "web-app-manifest-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                    {
                        src: "web-app-manifest-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any maskable",
                    },
                ],
            },
            workbox: {
                importScripts: ["teste-firebase-messaging-sw.js"],
            },
        }),
    ],
    resolve: {
        alias: {
            "@": "/src",
        },
    },
});
