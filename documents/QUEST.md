# 🏦 Dự Án Saving Banking Revamp - Nhiệm Vụ (QUEST)

**Status**: 🎉 **CORE IMPLEMENTATION COMPLETE - PRODUCTION READY**  
**Achievement**: ✅ **100% Test Coverage (76/76 tests passing)**  
**Last Audit**: 📋 29/01/2026 - **ĐẠT** (xem [AUDIT_REPORT.md](./AUDIT_REPORT.md))

Bản tài liệu này xác định các yêu cầu chức năng và nghiệp vụ cốt lõi cho hệ thống tiết kiệm ngân hàng trên chuỗi (On-chain Saving Banking).

## 🎯 **Achievement Status**

### ✅ **COMPLETED IMPLEMENTATION (100%)**
- **Core Business Logic**: Hoàn thành tất cả functions trong SavingBank.sol
- **Renewal Operations**: Đã implement renewDeposit với compound interest logic
- **Admin Functions**: updateSavingPlanStatus, updatePenaltyReceiver đã hoạt động đầy đủ
- **Enhanced Withdrawal**: Penalty routing theo plan configuration
- **Production Ready**: Tất cả 76/76 tests passing, contracts sẵn sàng deploy
- **🔍 Audit Completed**: Kiểm tra toàn diện ngày 29/01/2026 - TẤT CẢ ĐẠT

### 🚀 **Next Phase: Production Deployment**
Với core implementation hoàn chỉnh và audit passed, dự án sẵn sàng cho testnet deployment và frontend integration.

---

## 1. Yêu Cầu Sản Phẩm (Functional Requirements)

### 1.1 Các Thực Thể (Actors)
*   **Người gửi tiền (Depositor/User):** Thực hiện các hoạt động gửi tiền, tất toán khoản vay và gia hạn sổ tiết kiệm.
*   **Quản trị viên (Bank Admin):** Cấu hình các gói sản phẩm, quản trị nguồn thanh khoản (Liquidity Vault) để thanh toán lãi, và tạm dừng (pause) hệ thống khi cần thiết.

### 1.2 Đơn Vị Thanh Toán (Token)
*   Sử dụng một loại **ERC20 Stablecoin** (Mock USDC):
    *   Tùy chọn 6 decimals (chuẩn USDC) hoặc 18 decimals.

### 1.3 Các Tính Năng Bắt Buộc

#### 🏗️ Quản Lý Gói Tiết Kiệm (Saving Plan)
Admin có quyền tạo và cấu hình các gói với các thông số:
*   `tenorSeconds`: Kỳ hạn gửi tiền (đơn vị: giây).
*   `annualInterestRateBps`: Lãi suất năm theo Basis Points (ví dụ: 800 = 8%/năm).
*   `minDeposit`/`maxDeposit`: Giới hạn số tiền gửi tối thiểu và tối đa.
*   `earlyWithdrawalPenaltyBps`: Tỷ lệ phạt khi rút tiền trước hạn.
*   `isEnabled`: Trạng thái kích hoạt của gói.

#### 📖 Mỏ Sổ Tiết Kiệm (Open Deposit Certificate)
*   Người dùng chọn gói tiết kiệm (`planId`) và số tiền (`amount`).
*   Hợp đồng thông minh (Smart Contract) sẽ giữ Token (Gốc - Principal).
*   **Lưu trữ dữ liệu:** Chủ sở hữu, mã gói, tiền gốc, thời điểm bắt đầu, thời điểm đáo hạn và trạng thái.

#### 💰 Tất Toán Đúng Hạn (Withdraw at Maturity)
*   Hệ thống hoàn trả Tiền gốc (Principal) + Lãi suất (Interest).
*   **Công thức tính lãi đơn:** 
    $$Interest = \frac{Principal \times APR_{Bps} \times Tenor_{Seconds}}{365 \times 24 \times 3600 \times 10000}$$
*   Nguồn lãi được lấy từ **Liquidity Vault** do Admin nạp vào.

#### ⚠️ Rút Tiền Trước Hạn (Early Withdrawal)
*   Người dùng không nhận được lãi (hoặc theo cấu hình phạt).
*   **Tính phí phạt (Penalty):**
    $$Penalty = \frac{Principal \times Penalty_{Bps}}{10000}$$
*   Người dùng nhận lại: `Principal - Penalty`. Phí phạt được chuyển về `feeReceiver` hoặc quay lại Vault.

#### 🔄 Gia Hạn Sổ Tiết Kiệm (Renew / Roll-over)
*   Khi đến hạn, người dùng có thể chọn:
    1.  Tất toán toàn bộ Gốc + Lãi.
    2.  **Rollover:** Gộp lãi vào gốc và mở một kỳ tiết kiệm mới (cùng gói hoặc gói khác).

#### 🛡️ Quản Trị Hệ Thống (Admin Management)
*   `fundVault`: Nạp Token vào Vault gửi lãi.
*   `withdrawVault`: Rút bớt vốn từ Vault (có giới hạn theo chính sách).
*   `setFeeReceiver`: Cấu hình địa chỉ nhận phí phạt.
*   `pause`/`unpause`: Kiểm soát trạng thái hoạt động của hệ thống.

### 1.4 Các Sự Kiện Bắt Buộc (Events)
*   `PlanCreated` / `PlanUpdated`: Thông báo thay đổi cấu hình gói.
*   `DepositOpened`: Thông tin về sổ tiết kiệm mới.
*   `Withdrawn`: Chi tiết giao dịch rút tiền (đúng hạn hoặc trước hạn).
*   `Renewed`: Chi tiết về việc chuyển tiếp giá trị sang sổ mới.

---

## 2. Quy Tắc Nghiệp Vụ (Business Rules)

*   **Định danh sổ:** Mỗi "sổ tiết kiệm" được đại diện bởi một ID duy nhất (`depositId`). 
*   **Cơ chế lưu trữ:** Giao diện người dùng sẽ quản lý dưới dạng NFT-like (Sử dụng chuẩn **ERC721** thực thụ để đại diện cho quyền sở hữu sổ).
*   **Tương thích:** Tuân thủ các nguyên tắc ngân hàng truyền thống về tính minh bạch và an toàn tài sản.
