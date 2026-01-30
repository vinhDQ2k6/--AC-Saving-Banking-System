# AC Saving Bank - Manual Operator Console

## 📖 Tổng Quan

Hệ thống Manual Script System cung cấp giao diện dòng lệnh tương tác để vận hành AC Saving Bank mà không cần frontend. Hệ thống hỗ trợ đầy đủ các nghiệp vụ từ người dùng thông thường đến quản trị viên.

## 🚀 Khởi Động

### Yêu Cầu Trước
- Node.js và npm đã được cài đặt
- Hardhat đã được cấu hình
- Contracts đã deploy lên network (Sepolia)
- Private key đã được cấu hình trong `.env`

### Chạy Console

```bash
# Chạy trên Sepolia Testnet (khuyến nghị)
npm run manual -- --network sepolia

# Hoặc chạy trực tiếp
npx hardhat run scripts/manual/index.ts --network sepolia

# Chạy kiểm tra hệ thống
npx hardhat run scripts/manual/validate.ts --network sepolia
```

---

## 📊 PHẦN 1: VIEW OPERATIONS (Xem Thông Tin)

### 1.1 System Status
**Menu:** Main → View Operations → System Status

Hiển thị tổng quan hệ thống:
- **Vault Balance**: Số dư USDC trong kho
- **Total Certificates**: Số lượng NFT chứng chỉ đã phát hành
- **Default Saving Plan**: Thông tin gói tiết kiệm mặc định

### 1.2 All Saving Plans
**Menu:** Main → View Operations → All Saving Plans

Hiển thị danh sách tất cả gói tiết kiệm:
- ID, Tên gói
- Lãi suất năm (APR)
- Thời hạn tối thiểu/tối đa
- Số tiền gửi tối thiểu/tối đa
- Phí phạt rút sớm
- Trạng thái (Active/Inactive)

### 1.3 My Deposits
**Menu:** Main → View Operations → My Deposits

Hiển thị tất cả sổ tiết kiệm của bạn:
- ID sổ tiết kiệm
- Gói đã chọn
- Số tiền gốc
- Lãi dự kiến
- Ngày gửi / Ngày đáo hạn
- Trạng thái (Active/Withdrawn/Renewed)

---

## 👤 PHẦN 2: USER OPERATIONS (Thao Tác Người Dùng)

### 2.1 Create New Deposit (Gửi Tiết Kiệm)
**Menu:** Main → User Operations → Create New Deposit

**Quy trình:**
1. Xem danh sách gói tiết kiệm khả dụng
2. Chọn Plan ID
3. Nhập số tiền gửi (USDC)
4. Nhập thời hạn (ngày)
5. Xem tóm tắt (lãi dự kiến, tổng nhận được)
6. Xác nhận → Approve USDC → Tạo deposit

**Lưu ý:**
- Số tiền gửi phải nằm trong khoảng min-max của gói
- Thời hạn phải nằm trong khoảng min-max của gói
- Cần đủ USDC trong ví
- Hệ thống sẽ tự động approve USDC nếu cần

### 2.2 Withdraw Deposit (Rút Tiền)
**Menu:** Main → User Operations → Withdraw Deposit

**Quy trình:**
1. Xem danh sách sổ tiết kiệm Active
2. Chọn Deposit ID cần rút
3. Xem chi tiết (gốc, lãi, ngày đáo hạn)
4. Xác nhận rút tiền

**Lưu ý quan trọng:**
- ✅ **Đáo hạn**: Nhận đủ gốc + lãi
- ⚠️ **Chưa đáo hạn**: Bị phạt theo tỷ lệ phạt của gói (có thể mất một phần gốc)

### 2.3 Renew Deposit (Tái Tục)
**Menu:** Main → User Operations → Renew Deposit

**Quy trình:**
1. Xem danh sách sổ tiết kiệm đã đáo hạn
2. Chọn Deposit ID cần tái tục
3. Chọn gói tiết kiệm mới
4. Nhập thời hạn mới
5. Xem tóm tắt (số tiền = gốc + lãi cũ)
6. Xác nhận tái tục

**Lưu ý:**
- Chỉ có thể tái tục sổ đã đáo hạn
- Toàn bộ gốc + lãi sẽ được chuyển sang sổ mới
- Được hưởng lãi kép

---

## 🔧 PHẦN 3: ADMIN OPERATIONS (Thao Tác Quản Trị)

> ⚠️ **Yêu cầu quyền ADMIN**: Các thao tác này chỉ dành cho địa chỉ có quyền DEFAULT_ADMIN_ROLE

### 3.1 Create Saving Plan (Tạo Gói Tiết Kiệm)
**Menu:** Main → Admin Operations → Create Saving Plan

**Thông tin cần nhập:**
- Tên gói (ví dụ: "Premium 90")
- Số tiền gửi tối thiểu/tối đa (USDC)
- Thời hạn tối thiểu/tối đa (ngày)
- Lãi suất năm (%, ví dụ: 5.5)
- Tỷ lệ phạt rút sớm (%, ví dụ: 2)

**Lưu ý:**
- Gói mới được tạo ở trạng thái INACTIVE
- Cần kích hoạt riêng để người dùng có thể sử dụng

### 3.2 Activate/Deactivate Plan (Bật/Tắt Gói)
**Menu:** Main → Admin Operations → Activate/Deactivate Plan

**Tác dụng:**
- **Deactivate**: Người dùng không thể tạo deposit mới với gói này
- **Activate**: Cho phép người dùng sử dụng gói

### 3.3 View Vault Details (Xem Chi Tiết Kho)
**Menu:** Main → Admin Operations → View Vault Details

Hiển thị:
- Địa chỉ Vault
- Số dư được quản lý
- Số dư USDC thực tế
- Địa chỉ token
- Quyền rút của bạn

### 3.4 Deposit to Vault (Nạp Tiền Vào Kho)
**Menu:** Main → Admin Operations → Deposit to Vault

**Mục đích:** Thêm thanh khoản cho hệ thống để chi trả lãi

**Quy trình:**
1. Xem số dư USDC của bạn
2. Nhập số tiền nạp
3. Xác nhận → Approve → Deposit

### 3.5 Withdraw from Vault (Rút Tiền Từ Kho)
**Menu:** Main → Admin Operations → Withdraw from Vault

**⚠️ CẢNH BÁO:** Chỉ dùng trong trường hợp khẩn cấp!

**Quy trình:**
1. Xem số dư hiện tại của Vault
2. Nhập số tiền rút
3. Xác nhận

### 3.6 Security Status (Trạng Thái Bảo Mật)
**Menu:** Main → Admin Operations → Security Status

Hiển thị:
- Địa chỉ ví của bạn
- Có quyền Admin không?
- Hệ thống đang bị tạm dừng không?
- Địa chỉ các contract

### 3.7 Pause System (Tạm Dừng Hệ Thống)
**Menu:** Main → Admin Operations → Pause System

**Tác dụng:** Tạm dừng TẤT CẢ hoạt động:
- ❌ Không thể tạo deposit mới
- ❌ Không thể rút tiền
- ❌ Không thể tái tục

**Sử dụng khi:**
- Phát hiện lỗ hổng bảo mật
- Bảo trì hệ thống
- Điều tra sự cố

### 3.8 Unpause System (Mở Lại Hệ Thống)
**Menu:** Main → Admin Operations → Unpause System

**Tác dụng:** Kích hoạt lại tất cả hoạt động của hệ thống

---

## 📁 Cấu Trúc Thư Mục

```
scripts/manual/
├── index.ts                    # Entry point - Main menu
├── validate.ts                 # System validation script
├── README.md                   # This file
├── utils/
│   ├── contracts.ts            # Contract loading
│   ├── format.ts               # USDC/date formatting
│   └── prompts.ts              # User input utilities
├── view/
│   ├── view-system-status.ts   # System dashboard
│   ├── view-saving-plans.ts    # List all plans
│   └── view-user-deposits.ts   # User's deposits
├── user/
│   ├── create-deposit.ts       # Create new deposit
│   ├── withdraw-deposit.ts     # Withdraw deposit
│   └── renew-deposit.ts        # Renew matured deposit
└── admin/
    ├── manage-plans.ts         # Create/activate plans
    ├── vault-operations.ts     # Vault deposit/withdraw
    └── emergency.ts            # Pause/unpause system
```

---

## 🔐 Lưu Ý Bảo Mật

1. **Private Key**: Không bao giờ chia sẻ private key trong `.env`
2. **Admin Operations**: Chỉ sử dụng trên ví có quyền admin
3. **Testnet First**: Luôn test trên Sepolia trước khi mainnet
4. **Backup**: Lưu lại tất cả transaction hash để tra cứu

---

## 🐛 Xử Lý Lỗi Thường Gặp

| Lỗi | Nguyên Nhân | Giải Pháp |
|-----|-------------|-----------|
| `AccessControlUnauthorizedAccount` | Không có quyền admin | Dùng ví có quyền admin |
| `EnforcedPause` | Hệ thống đang tạm dừng | Unpause trước khi thao tác |
| `InsufficientBalance` | Không đủ USDC | Nạp thêm USDC vào ví |
| `InvalidAmount` | Số tiền không hợp lệ | Kiểm tra min/max của gói |
| `InvalidTerm` | Thời hạn không hợp lệ | Kiểm tra min/max term của gói |

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề, kiểm tra:
1. Chạy `validate.ts` để xác nhận kết nối
2. Kiểm tra số dư ETH (cần gas)
3. Kiểm tra số dư USDC (cần cho deposit)
4. Xác nhận network đúng (Sepolia)

**Status: ✅ FULLY IMPLEMENTED & TESTED**