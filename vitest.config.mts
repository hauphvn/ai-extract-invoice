import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  test: {
    // Bật chế độ global để sử dụng trực tiếp describe, it, expect mà không cần import
    globals: true,
    // Chỉ định môi trường test là Node.js
    environment: 'node',
    // Đặt thư mục chứa các file test
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    // Bỏ qua các thư mục không cần thiết
    exclude: ['node_modules', 'dist'],
    root: './',
  },
  plugins: [
    // swc giúp Vitest hiểu các Decorators của NestJS
    // Bạn cần cài đặt @swc/core và @swc/jest để sử dụng plugin này
    // ['@swc/jest', { jsc: { parser: { syntax: 'typescript', decorators: true } } }]
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
