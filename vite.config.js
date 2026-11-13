import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// npm run build        常规静态站点（dist/，需 HTTP 服务）
// npm run build:single 单文件离线版（dist-single/牛马时钟.html，可直接双击 / 转发）
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    plugins: [
      react(),
      ...(single
        ? [viteSingleFile({ outputFileName: '牛马时钟.html' })]
        : [])
    ],
    base: './',
    server: { host: '127.0.0.1', port: 5173, open: '/dev.html' },
    build: {
      // 开发入口是 dev.html；根 index.html 留给构建产物（GitHub Pages 直接发它，勿手改）
      rollupOptions: { input: 'dev.html' },
      ...(single ? { outDir: 'dist-single', emptyOutDir: true } : {})
    }
  };
});
