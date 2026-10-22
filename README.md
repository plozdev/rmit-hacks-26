# Proof/Gate — RMIT Hacks 2026 (Challenge 2: Tide UNLOCKED)

> **One-sentence pitch:** A case custodian can seal a synthetic evidence record, but cannot unseal it until a TideCloak role change survives an independent QEA quorum.

---

## 📖 Bối cảnh & Mục tiêu dự án

Dự án tham gia **Challenge 2: Tide UNLOCKED** tại RMIT Hacks 2026.
Chi tiết xem tại tài liệu kiến trúc nội bộ: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

- **TideCloak (Keycloak IGA)**: Quản trị danh tính phi tập trung, hỗ trợ mô hình Four-Eyes Control / QEA Quorum và mã hóa phân tán (E2EE) qua mạng lưới Tide ORK.
- **Next.js / React Frontend & Node Backend**: Ứng dụng quản lý bằng chứng (Evidence Custody) với quy trình Seal (mã hóa tự thân) và Unseal (chỉ giải mã sau khi quorum phê duyệt cấp role).
- **SQLite Database**: Lưu trữ metadata bằng chứng và trạng thái yêu cầu truy cập.

---

## 🚀 Khởi động nhanh môi trường TideCloak IGA

TideCloak IGA được đóng gói và chạy độc lập qua Docker Compose:

```bash
# 1. Khởi chạy TideCloak IGA container
docker compose up -d

# 2. Theo dõi log
docker compose logs -f

# 3. Dừng container khi không dùng
docker compose down
```

### Thông tin kết nối mặc định:
- **TideCloak URL**: [http://localhost:8080](http://localhost:8080)
- **Admin Username**: `admin` (cấu hình trong file `.env`)
- **Admin Password**: `adminpassword`
- **Volume lưu trữ**: `./data/h2` (lưu trữ toàn bộ realm, roles, users và quorum request)

---

## 🛠️ Cấu trúc thư mục dự án

```text
├── docker-compose.yml       # Dịch vụ TideCloak IGA (image: tideorg/tidecloak-dev:latest)
├── .env.example             # Mẫu biến môi trường
├── .env                     # Biến môi trường cục bộ (gitignored)
├── PROJECT_CONTEXT.md       # Đặc tả kỹ thuật & kịch bản demo Hackathon Challenge 2
├── HACKATHON_QUICKSTART.md  # Hướng dẫn chi tiết cho thành viên team
└── README.md                # Tài liệu tổng quan dự án
```
