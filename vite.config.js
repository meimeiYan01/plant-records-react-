import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    host: '0.0.0.0', // 允许外部访问（手机可以通过局域网 IP 访问）
    port: 5173,
    allowedHosts: ["frowzy-isreal-intermunicipal.ngrok-free.dev"],
  },
  base: '/plant-records-react-/',  // 设置为你的 GitHub 仓库名
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-192.png", "pwa-512.png"],
      manifest: {
        name: "PlantByXyan",
        short_name: "PlantByXyan",
        description: "多肉养殖记录相册（本地优先，可ZIP备份）",
        start_url: "/plant-records-react-/",
        id: "/plant-records-react-/",
        scope: "/plant-records-react-/",
        display: "standalone",
        background_color: "#0b1220",
        theme_color: "#0b1220",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ]
});
