# Hướng dẫn Cài đặt ZenCine trên Smart TV

Thư mục này chứa 2 gói cài đặt đã được đóng gói và cấu hình tối ưu cho TV:

1. **`ZenCine-AndroidTV.apk`**: Dành cho **Android TV / Google TV / Fire TV** (Sony, TCL, Xiaomi, Casper, Chromecast, Android Box...).
2. **`com.zencine.tv_1.0.0_all.ipk`**: Dành cho **Smart TV LG (hệ điều hành webOS)**.

---

## 1. Cài đặt trên Android TV / Google TV (`ZenCine-AndroidTV.apk`)

### Cách 1: Cài đặt qua ứng dụng "Send Files to TV" (Nhanh nhất - Không cần USB)
1. Trên TV: Vào Google Play Store, tải app **Send files to TV** và một app quản lý file (như **X-plore File Manager** hoặc **File Commander**).
2. Trên điện thoại Android hoặc máy tính: Tải app **Send files to TV**.
3. Kết nối TV và điện thoại/máy tính chung một mạng Wi-Fi.
4. Gửi file `ZenCine-AndroidTV.apk` sang TV.
5. Mở file APK trên TV và chọn **Install (Cài đặt)**.

### Cách 2: Cài đặt bằng USB
1. Copy file `ZenCine-AndroidTV.apk` vào USB.
2. Cắm USB vào TV.
3. Mở ứng dụng quản lý file trên TV (nếu chưa có thì tải từ Google Play Store).
4. Tìm đến file APK và bấm Cài đặt.

*Lưu ý: Nếu TV hỏi quyền "Cài đặt ứng dụng không rõ nguồn gốc" (Unknown Sources), hãy chọn Cho phép (Allow).*

---

## 2. Cài đặt trên LG Smart TV webOS (`com.zencine.tv_1.0.0_all.ipk`)

### Cách 1: Sử dụng "webOS Dev Manager" trên PC (Dễ nhất - Giao diện đồ họa)
1. Trên TV LG: Vào LG Content Store, tìm và cài đặt app **Developer Mode**, mở app lên và bật **Dev Mode Status = ON**.
2. Trên máy tính: Tải phần mềm [webOS Dev Manager (GitHub)](https://github.com/webosbrew/dev-manager/releases).
3. Kết nối với TV bằng IP và Passphrase hiển thị trong app Developer Mode trên TV.
4. Kéo thả file `com.zencine.tv_1.0.0_all.ipk` vào webOS Dev Manager để cài đặt lên TV.

### Cách 2: Cài bằng dòng lệnh webOS CLI
Chạy lệnh trực tiếp từ thư mục dự án:
```bash
npx -p @webosose/ares-cli ares-install -d <TÊN_THIẾT_BỊ_TV> release/com.zencine.tv_1.0.0_all.ipk
```

---

## 3. Lệnh Build lại khi có code mới
- **Build APK Android TV:**
  ```bash
  npm run build:apk
  ```
- **Build IPK LG TV:**
  ```bash
  npm run build:webos
  ```
