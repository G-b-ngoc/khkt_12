import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Ứng dụng này gắn với phiên đăng nhập trên mọi trang/route — không có nội dung nào
   * nên được cache tĩnh giữa các người dùng, nên tắt Cache Components (mặc định mới của
   * Next 16) để dùng mô hình render động cổ điển, tránh rủi ro lộ dữ liệu giữa các phiên. */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
