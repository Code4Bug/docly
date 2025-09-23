import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174
  },
  // 解决字体文件路径问题
  assetsInclude: ['**/*.ttf', '**/*.woff', '**/*.woff2'],
  // 构建优化配置
  build: {
    // 提高代码分割阈值，减少警告
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // 手动代码分割，优化打包大小
        manualChunks: {
          // 将Vue相关库分离
          'vue-vendor': ['vue', 'pinia', '@vueuse/core'],
          // 将UI库分离
          'ui-vendor': ['naive-ui'],
          // 将编辑器相关库分离
          'editor-vendor': [
            '@editorjs/editorjs',
            '@editorjs/header',
            '@editorjs/paragraph',
            '@editorjs/list',
            '@editorjs/quote',
            '@editorjs/table',
            '@editorjs/code',
            '@editorjs/image'
          ],
          // 将文档处理库分离
          'docx-vendor': ['docx-preview', 'docxtemplater']
        },
        // 资源文件命名规则
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/\.(ttf|woff|woff2)$/.test(assetInfo.name)) {
            return `fonts/[name].[hash][extname]`
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return `images/[name].[hash][extname]`
          }
          return `assets/[name].[hash][extname]`
        }
      }
    }
  },
  // 路径别名配置
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@assets': resolve(__dirname, 'src/assets')
    }
  }
})
