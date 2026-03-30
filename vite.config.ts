import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 允许局域网访问
    port: 5173, // 可选端口
    allowedHosts: [
      'bsmct.online',   // 允许这个域名
      'localhost',      // 保留 localhost
      '.yourdomain.com' // 可以用通配符允许子域名
    ]
  },
});
