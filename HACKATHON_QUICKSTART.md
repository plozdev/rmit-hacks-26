# RMIT Hacks 2026 - Keycloak IGA Project

Dự án Identity Governance and Administration (IGA) xây dựng trên nền tảng **Keycloak-IGA (TideCloak)** dành cho cuộc thi RMIT Hacks 2026.

## 1. Khởi động nhanh bằng Docker (Khuyên dùng)

Hệ thống đã được thiết lập sẵn file `docker-compose.yml` sử dụng image dev chính thức của Tide Foundation:

```bash
# 1. Khởi động Keycloak IGA
docker compose up -d

# 2. Xem logs container
docker compose logs -f

# 3. Dừng hệ thống
docker compose down
```

### Thông tin đăng nhập mặc định:
- **URL**: [http://localhost:8080](http://localhost:8080)
- **Tài khoản**: `admin`
- **Mật khẩu**: `adminpassword` (cấu hình trong file `.env`)
- Dữ liệu cấu hình và realm sẽ được lưu trữ cục bộ tại `./data/h2` (không bị mất khi restart container).

---

## 2. Các tính năng cốt lõi của Keycloak IGA

- **Draft → Pending → Approved Workflow**: Các thay đổi nhạy cảm (phân quyền user, thêm realm role, chỉnh sửa client) không áp dụng ngay lập tức mà chuyển sang trạng thái chờ duyệt.
- **Quorum-based Approval Engine**: Yêu cầu đồng thuận từ nhiều quản trị viên (Four-eyes control) trước khi quyền lực có hiệu lực.
- **Audit & Compliance Trail**: Tự động lưu vết người phê duyệt, thời điểm và nội dung thay đổi.

---

## 3. Chỉnh sửa và Build trực tiếp từ Source Code Java

Nếu trong quá trình hackathon bạn muốn can thiệp sâu vào core Java / Quarkus:

### Yêu cầu:
- Java JDK 21+
- Apache Maven 3.9+

### Lệnh build:
```bash
# Build nhanh bỏ qua test
mvn clean install -DskipTests -Pdistribution
```

Sau khi build xong, bản phân phối sẽ nằm trong thư mục:
`quarkus/dist/target/keycloak-*/`
Chạy trực tiếp:
```powershell
.\quarkus\dist\target\keycloak-*\bin\kc.bat start-dev --bootstrap-admin-username=admin --bootstrap-admin-password=adminpassword
```

---

## 4. Git Workflow cho Team Hackathon

```bash
# Kiểm tra trạng thái
git status

# Commit các thay đổi
git add .
git commit -m "feat: your feature description"

# Push lên repo của team
git push origin main
```
