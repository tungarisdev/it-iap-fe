FROM node:22-alpine AS builder

WORKDIR /app

# Copy package.json để tận dụng Docker Cache
COPY package.json package-lock.json ./
RUN npm ci

# Copy toàn bộ code và tiến hành build
COPY . .
RUN npm run build

FROM nginx:1.27-alpine

# Xóa các file rác mặc định của Nginx
RUN rm -rf /usr/share/nginx/html/*

# Lấy các file tĩnh từ bước build ném vào Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
