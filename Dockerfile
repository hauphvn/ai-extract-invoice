# ---------------------------------------------------
# Giai đoạn 1: Biên dịch mã nguồn TypeScript (Builder)
# ---------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Sao chép danh sách phụ thuộc vào trước để tận dụng cơ chế lưu bộ đệm (cache)
COPY package*.json ./

# Cài đặt toàn bộ thư viện cần cho quá trình biên dịch
RUN npm ci

# Sao chép toàn bộ mã nguồn của dự án vào container
COPY . .

# Biên dịch mã nguồn NestJS (tạo ra thư mục /dist)
RUN npm run build

# ---------------------------------------------------
# Giai đoạn 2: Tạo môi trường chạy thực tế (Production Runner)
# ---------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Thiết lập môi trường chạy thực tế
ENV NODE_ENV=production

# Sao chép lại file package*.json để chỉ cài đặt các thư viện chạy thực tế
COPY package*.json ./

# Chỉ cài đặt dependencies, bỏ qua devDependencies (như Vitest, Typescript)
RUN npm ci --omit=dev

# Lấy sản phẩm mã đã được biên dịch từ giai đoạn 1 sang
COPY --from=builder /app/dist ./dist

# Khai báo cổng ứng dụng NestJS sẽ lắng nghe
EXPOSE 3000

# Lệnh khởi chạy ứng dụng khi container bắt đầu
CMD ["node", "dist/main"]
