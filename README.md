# Posemaster AI

Posemaster là một ứng dụng web hiện đại hỗ trợ phân tích tư thế và thực hiện các bài kiểm tra chỉnh hình (Orthopedic Tests) thông qua AI. Ứng dụng cung cấp các công cụ trực quan để đo đạc góc độ, độ lệch cơ thể và đưa ra các báo cáo sức khỏe chi tiết.

## ✨ Tính năng chính

- **AI Posture Analysis**: Tự động phân tích khung xương từ hình ảnh hoặc camera.
- **Orthopedic Tests**:
  - **Shoulder Level**: Kiểm tra độ cân bằng của vai.
  - **Forward Head**: Phân tích độ nhô của cổ/đầu (địa tầng cổ).
  - **Leg Alignment**: Kiểm tra độ thẳng của chân (Valgus/Varus).
- **Interactive Skeleton Editor**: Cho phép chỉnh sửa thủ công các điểm mốc (landmarks), thêm kết nối và đo góc linh hoạt.
- **Lưu trữ & Gallery**: Quản lý lịch sử các lần chụp và phân tích ngay trên thiết bị.
- **Đa ngôn ngữ**: Hỗ trợ đầy đủ tiếng Việt và tiếng Anh.
- **Trải nghiệm người dùng mượt mà**:
  - Voice guidance (Hướng dẫn bằng giọng nói).
  - Hiệu ứng âm thanh (Shutter sound).
  - Giao diện tối ưu cho cả di động và máy tính.

## 🛠 Công nghệ sử dụng

- **Frontend**: React 18, Vite, TypeScript.
- **Styling**: Tailwind CSS.
- **Icons**: Lucide React.
- **Architecture**: Atomic Design (Atoms, Molecules, Organisms, Pages).
- **Code Quality**: ESLint v9 (Flat Config), Prettier.

## 📂 Cấu trúc thư mục (Atomic Design)

```text
src/
├── components/
│   ├── atoms/       # Các UI nhỏ nhất (Button, Icon, Text)
│   ├── molecules/   # Các cụm UI chức năng (LoadingOverlay, EditTool)
│   ├── organisms/   # Các thành phần phức tạp (EditorCanvas, HealthReport)
│   └── pages/       # Các trang chính của ứng dụng
├── hooks/           # Custom hooks (useSpeech, useLanguage, etc.)
├── services/        # Logic nghiệp vụ & API (Gallery, Orthopedic logic)
├── utils/           # Tiện ích toán học, hình học & dịch thuật
└── contexts/        # Quản lý trạng thái toàn cục (LanguageContext)
```

## 🚀 Hướng dẫn bắt đầu

### Yêu cầu hệ thống

- **Node.js**: Phiên bản 18 trở lên.
- **NPM** hoặc **Yarn**.

### Cài đặt

1. Clone dự án:

   ```bash
   git clone <repository-url>
   cd posemaster
   ```

2. Cài đặt dependency:

   ```bash
   npm install
   ```

3. Chạy môi trường phát triển:
   ```bash
   npm run dev
   ```

## 📜 Các lệnh quan trọng

- `npm run dev`: Chạy server dev tại localhost:5173.
- `npm run build`: Build dự án cho production (output thư mục `dist`).
- `npm run lint`: Kiểm tra lỗi code với ESLint.
- `npm run format`: Tự động định dạng code với Prettier.

## 🌐 Deploy

Dự án được cấu hình sẵn GitHub Actions để tự động deploy lên GitHub Pages khi có push vào branch `main` hoặc `master`. Xem cấu hình tại [deploy.yml](.github/workflows/deploy.yml).
