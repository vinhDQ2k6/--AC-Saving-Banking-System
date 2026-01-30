# 📘 HƯỚNG DẪN THAO TÁC SAU DEPLOY

Tài liệu này hướng dẫn chi tiết các thao tác quản trị sau khi đã deploy contracts lên testnet/mainnet.

---

## 🎯 TRẠNG THÁI HIỆN TẠI

| | Sepolia Testnet |
|---|-----------------|
| **SavingBank** | `0x2fcF8E2110dc3b1111DF0F222B4F572d06A9548f` |
| **Vault** | `0xA78f3F0D5de4C4B7789216Ee5e56f4BE0542e128` |
| **DepositCertificate** | `0xDc112945182d21d10DEfEb1E179F96F5075BB6BF` |
| **MockUSDC** | `0x4806158ad022d93a27bB17eF6d423870BA23fac7` |
| **Multisig Admin** | `0x09E6F2590fF9245245735c59dFE1AE862AB1A082` |
| **Deployer** | ❌ **REVOKED** - Không còn quyền admin |

---

## 🔐 I. QUẢN TRỊ QUA GNOSIS SAFE

### 1.1 Truy Cập Dashboard

1. Mở [Gnosis Safe Dashboard](https://app.safe.global/home?safe=sep:0x09E6F2590fF9245245735c59dFE1AE862AB1A082)
2. Kết nối wallet của bạn (phải là 1 trong 3 signers)
3. Xác nhận đang ở network **Sepolia**

### 1.2 Tạo Transaction Mới

1. Click **"New transaction"** → **"Contract interaction"**
2. Nhập địa chỉ contract (VD: SavingBank: `0x2fcF8E2110dc3b1111DF0F222B4F572d06A9548f`)
3. Hệ thống sẽ tự động load ABI từ Etherscan
4. Chọn function cần gọi
5. Nhập parameters
6. Click **"Create transaction"**
7. Các signers khác sẽ nhận notification để ký

### 1.3 Quy Trình Ký (Multi-signature Flow)

```
Signer 1 tạo transaction
        ↓
    Transaction pending (0/2 hoặc 0/3 confirmations)
        ↓
Signer 2 nhận notification, review và ký
        ↓
    (1/2 confirmations - nếu 2/3 threshold)
        ↓
Signer 3 ký (optional nếu đủ threshold)
        ↓
    Transaction có thể execute
        ↓
Bất kỳ signer nào execute
        ↓
    ✅ Transaction confirmed on-chain
```

---

## 📋 II. CÁC THAO TÁC ADMIN PHỔ BIẾN

### 2.1 Tạo Saving Plan Mới

**Contract:** SavingBank (`0x2fcF8E2110dc3b1111DF0F222B4F572d06A9548f`)

**Function:** `createSavingPlan`

**Parameters:**
```
planName: "Standard 90 Days"        // Tên plan
minTermInDays: 90                   // Kỳ hạn tối thiểu (ngày)
maxTermInDays: 91                   // Kỳ hạn tối đa (ngày)
annualInterestRateBps: 800          // Lãi suất (800 = 8%/năm)
minimumDeposit: 1000000000          // Min deposit (1000 USDC với 6 decimals)
maximumDeposit: 100000000000        // Max deposit (100,000 USDC)
earlyWithdrawalPenaltyBps: 500      // Phạt rút sớm (500 = 5%)
penaltyReceiver: 0x...              // Địa chỉ nhận tiền phạt
```

### 2.2 Cập Nhật Trạng Thái Plan

**Function:** `updateSavingPlanStatus`

**Parameters:**
```
planId: 1                           // ID của plan cần update
isEnabled: true/false               // Enable hoặc disable plan
```

### 2.3 Pause/Unpause Hệ Thống

**Function:** `pause` hoặc `unpause`

> ⚠️ **Cảnh báo:** Khi pause, TẤT CẢ user operations sẽ bị block (deposit, withdraw, renew)

### 2.4 Nạp Thanh Khoản vào Vault

**Bước 1:** Approve USDC cho SavingBank
- Contract: MockUSDC (`0x4806158ad022d93a27bB17eF6d423870BA23fac7`)
- Function: `approve`
- Parameters:
  ```
  spender: 0x2fcF8E2110dc3b1111DF0F222B4F572d06A9548f  // SavingBank
  amount: 100000000000                                  // 100,000 USDC
  ```

**Bước 2:** Deposit vào Vault
- Contract: SavingBank (`0x2fcF8E2110dc3b1111DF0F222B4F572d06A9548f`)
- Function: `depositLiquidity`
- Parameters:
  ```
  amount: 100000000000                                  // 100,000 USDC
  ```

### 2.5 Rút Thanh Khoản từ Vault

**Function:** `withdrawLiquidity`

**Parameters:**
```
amount: 50000000000                 // 50,000 USDC
```

> ⚠️ **Lưu ý:** Không được rút quá số dư available trong Vault

---

## 📊 III. KIỂM TRA TRẠNG THÁI HỆ THỐNG

### 3.1 Kiểm Tra Vault Balance

**Sử dụng Etherscan Read Contract:**

1. Mở [Vault on Etherscan](https://sepolia.etherscan.io/address/0xA78f3F0D5de4C4B7789216Ee5e56f4BE0542e128#readContract)
2. Gọi function `getAvailableLiquidity` hoặc `getTotalDeposits`

### 3.2 Kiểm Tra Saving Plans

1. Mở [SavingBank on Etherscan](https://sepolia.etherscan.io/address/0x2fcF8E2110dc3b1111DF0F222B4F572d06A9548f#readContract)
2. Gọi function `getSavingPlan(planId)`
3. Gọi function `getPlanCount` để xem tổng số plans

### 3.3 Kiểm Tra Admin Rights

**Function:** `hasRole`

**Parameters:**
```
role: 0x0000000000000000000000000000000000000000000000000000000000000000
account: 0x09E6F2590fF9245245735c59dFE1AE862AB1A082
```

Kết quả: `true` = Multisig có admin rights

---

## 🚨 IV. XỬ LÝ TÌNH HUỐNG KHẨN CẤP

### 4.1 Pause Hệ Thống Ngay Lập Tức

1. Truy cập Gnosis Safe
2. Tạo transaction mới đến SavingBank
3. Gọi function `pause()`
4. **Liên hệ NGAY các signers khác** để ký khẩn cấp
5. Execute transaction sau khi đủ signatures

### 4.2 Phát Hiện Hoạt Động Bất Thường

**Dấu hiệu cần chú ý:**
- Vault balance giảm đột ngột
- Nhiều withdrawals trong thời gian ngắn
- Transactions từ địa chỉ lạ cố gắng gọi admin functions

**Hành động:**
1. Pause hệ thống
2. Review tất cả recent transactions
3. Check vault balance
4. Liên hệ team để đánh giá

### 4.3 Khôi Phục Sau Emergency

1. Xác nhận nguyên nhân và đã fix
2. Tạo transaction `unpause()`
3. Thu thập signatures từ các signers
4. Execute unpause
5. Monitor hệ thống chặt chẽ sau khi mở lại

---

## 🔧 V. CÔNG CỤ HỖ TRỢ

### 5.1 Hardhat Console (Cho Developer)

```bash
# Kết nối Sepolia
npx hardhat console --network sepolia

# Load contracts
const savingBank = await ethers.getContractAt("SavingBank", "0x2fcF8E2110dc3b1111DF0F222B4F572d06A9548f");
const vault = await ethers.getContractAt("Vault", "0xA78f3F0D5de4C4B7789216Ee5e56f4BE0542e128");

# Check plan count
const count = await savingBank.getPlanCount();
console.log("Total plans:", count.toString());

# Check vault balance
const balance = await vault.getAvailableLiquidity();
console.log("Available liquidity:", ethers.formatUnits(balance, 6), "USDC");
```

### 5.2 Scripts Có Sẵn

```bash
# Mint USDC (nếu là deployer)
npx hardhat run scripts/mint-usdc.ts --network sepolia

# Unpause contract (cần admin rights)
npx hardhat run scripts/unpause.ts --network sepolia

# Business testing
npx hardhat run scripts/sepolia-business-test.ts --network sepolia
```

### 5.3 Etherscan Links

| Contract | Read | Write |
|----------|------|-------|
| SavingBank | [Read](https://sepolia.etherscan.io/address/0x2fcF8E2110dc3b1111DF0F222B4F572d06A9548f#readContract) | [Write](https://sepolia.etherscan.io/address/0x2fcF8E2110dc3b1111DF0F222B4F572d06A9548f#writeContract) |
| Vault | [Read](https://sepolia.etherscan.io/address/0xA78f3F0D5de4C4B7789216Ee5e56f4BE0542e128#readContract) | [Write](https://sepolia.etherscan.io/address/0xA78f3F0D5de4C4B7789216Ee5e56f4BE0542e128#writeContract) |
| DepositCertificate | [Read](https://sepolia.etherscan.io/address/0xDc112945182d21d10DEfEb1E179F96F5075BB6BF#readContract) | [Write](https://sepolia.etherscan.io/address/0xDc112945182d21d10DEfEb1E179F96F5075BB6BF#writeContract) |
| MockUSDC | [Read](https://sepolia.etherscan.io/address/0x4806158ad022d93a27bB17eF6d423870BA23fac7#readContract) | [Write](https://sepolia.etherscan.io/address/0x4806158ad022d93a27bB17eF6d423870BA23fac7#writeContract) |

---

## 📝 VI. CHECKLIST HÀNG NGÀY

### Daily Operations
- [ ] Kiểm tra Vault balance
- [ ] Review pending Gnosis Safe transactions
- [ ] Check Etherscan for unusual activities
- [ ] Monitor deposit/withdrawal events

### Weekly Review
- [ ] Review all saving plans status
- [ ] Check total deposits vs vault liquidity
- [ ] Audit signer list (nếu cần thay đổi)
- [ ] Backup transaction history

---

## 📞 LIÊN HỆ KHẨN CẤP

**Khi gặp sự cố cần xử lý khẩn cấp:**

1. ⚠️ PAUSE hệ thống ngay lập tức
2. 📱 Liên hệ các signers trong Gnosis Safe
3. 📊 Thu thập evidence (screenshots, tx hashes)
4. 🔍 Phân tích nguyên nhân
5. ✅ Thực hiện fix và unpause

---

**📅 Cập nhật: 30/01/2026**
**🔐 Admin: Gnosis Safe Multisig**
