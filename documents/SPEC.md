# 📐 SPEC.md — Chi Tiết Kỹ Thuật Triển Khai

Tài liệu này chứa **toàn bộ signatures, errors, events và file mapping** để triển khai dự án Saving Banking theo chuẩn Clean Code.

---

## 🚀 TRẠNG THÁI TRIỂN KHAI (Cập nhật 31/01/2026)

### ✅ **PRODUCTION READY - SEPOLIA DEPLOYED + MULTISIG SECURED**

- [x] **Vault Contract**: Đã triển khai đầy đủ với role-based access control
- [x] **SavingBank Contract**: Đã cập nhật sử dụng dependency injection pattern
- [x] **Interface Segregation**: Interfaces rõ ràng cho tất cả contract interactions
- [x] **Deploy Scripts**: Hoàn thành 5 giai đoạn deployment
- [x] **Contract Compilation**: Tất cả contracts compile thành công
- [x] **Local Deployment**: Deploy thành công lên Hardhat network
- [x] **Comprehensive Testing**: **155/155 tests passing (100% success rate)**
- [x] **🔍 Audit Completed**: Internal audit passed 30/01/2026
- [x] **NFT-Based Withdrawal**: Certificate holder system implemented
- [x] **24h Transfer Cooldown**: Anti-instant-withdrawal security
- [x] **Sepolia Deployment**: 4 contracts deployed và verified
- [x] **Multisig Security**: Gnosis Safe với 3 signers
- [x] **Admin Transfer**: Deployer revoked, multisig có full admin
- [x] **View Functions Enhanced**: Thêm các view functions mới (31/01/2026)

**Test Infrastructure Status:**

```bash
✅ Business Tests (6 files) : 60+ tests (100%)
✅ Unit Tests (7 files)     : 70+ tests (100%)
✅ Integration Tests        : 16 tests (100%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 TOTAL                    : 155 tests (100%)
```

**Sepolia Deployment (LIVE):**
| Contract | Address | Status |
|----------|---------|--------|
| MockUSDC | `0x4806158ad022d93a27bB17eF6d423870BA23fac7` | ✅ Verified |
| DepositCertificate | `0xDc112945182d21d10DEfEb1E179F96F5075BB6BF` | ✅ Verified |
| Vault | `0xA78f3F0D5de4C4B7789216Ee5e56f4BE0542e128` | ✅ Verified |
| SavingBank | `0x2fcF8E2110dc3b1111DF0F222B4F572d06A9548f` | ✅ Verified |

**Multisig Admin:**
| | Value |
|---|-------|
| Gnosis Safe | `0x09E6F2590fF9245245735c59dFE1AE862AB1A082` |
| Dashboard | [Gnosis Safe UI](https://app.safe.global/home?safe=sep:0x09E6F2590fF9245245735c59dFE1AE862AB1A082) |

### 🔜 **NEXT PHASE: FRONTEND + EXTERNAL AUDIT**

- [ ] External security audit
- [ ] Frontend development
- [ ] Mainnet deployment

---

## 1. CẤU TRÚC THƯ MỤC HOÀN CHỈNH

```
contracts/
├── interfaces/
│   ├── ISavingBankStructs.sol    # ✅ Structs: SavingPlan, Deposit, DepositStatus
│   ├── ISavingBankErrors.sol     # ✅ Tất cả custom errors
│   ├── ISavingBankEvents.sol     # ✅ Tất cả events
│   ├── ISavingBankAdmin.sol      # ✅ Admin interface
│   ├── ISavingBankUser.sol       # ✅ User interface
│   ├── ISavingBankView.sol       # ✅ View interface (enhanced)
│   ├── IDepositCertificate.sol   # ✅ NFT interface hoàn chỉnh
│   ├── IVault.sol                # ✅ Vault interface với core functions
│   └── IVaultEvents.sol          # ✅ Vault events cho liquidity operations
│
├── libraries/
│   └── InterestCalculator.sol    # ✅ Pure math functions hoàn chỉnh
│
├── certificates/
│   └── DepositCertificate.sol    # ✅ ERC721 với enumerable + cooldown
│
├── tokens/
│   └── MockUSDC.sol              # ✅ ERC20 mock với 6 decimals
│
├── vault/
│   └── Vault.sol                 # ✅ Liquidity management với AccessControl
│
└── SavingBank.sol                # ✅ Main business logic

deploy/                           # ✅ Hoàn chỉnh 5-stage deployment
├── 1-deploy-mock-usdc.ts
├── 2-deploy-deposit-certificate.ts
├── 3-deploy-vault.ts
├── 4-deploy-saving-bank.ts
└── 5-setup-admin-security.ts

test/
├── helpers/
│   ├── constants.ts              # ✅ Constants
│   ├── fixtures.ts               # ✅ Deploy fixtures
│   └── time.ts                   # ✅ Time helpers
├── business/                     # ✅ Business scenario tests
├── unit/                         # ✅ Unit tests
└── integration/                  # ✅ Integration tests
```

---

## 2. HẰNG SỐ (CONSTANTS)

```solidity
// InterestCalculator.sol
uint256 public constant BASIS_POINTS = 10_000;      // 1% = 100 bp
uint256 public constant DAYS_PER_YEAR = 365;

// SavingBank.sol - Roles
bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

// DepositCertificate.sol - Roles
bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
uint256 public constant TRANSFER_COOLDOWN = 24 hours;

// Vault.sol - Roles
bytes32 public constant LIQUIDITY_MANAGER_ROLE = keccak256("LIQUIDITY_MANAGER_ROLE");
bytes32 public constant WITHDRAW_ROLE = keccak256("WITHDRAW_ROLE");
```

---

## 3. DATA STRUCTURES (ISavingBankStructs.sol)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISavingBankStructs {
    enum DepositStatus {
        Active,
        Withdrawn,
        Renewed
    }

    struct SavingPlan {
        uint256 id;
        string name;
        uint256 minDepositAmount;           // Số tiền gửi tối thiểu
        uint256 maxDepositAmount;           // Số tiền gửi tối đa (0 = không giới hạn)
        uint32 minTermInDays;               // Kỳ hạn tối thiểu (ngày)
        uint32 maxTermInDays;               // Kỳ hạn tối đa (ngày)
        uint256 annualInterestRateInBasisPoints;  // Lãi suất năm (800 = 8%)
        uint256 penaltyRateInBasisPoints;         // Tỷ lệ phạt rút sớm
        bool isActive;                      // Trạng thái hoạt động
    }

    struct SavingPlanInput {
        string name;
        uint256 minDepositAmount;
        uint256 maxDepositAmount;
        uint32 minTermInDays;
        uint32 maxTermInDays;
        uint256 annualInterestRateInBasisPoints;
        uint256 penaltyRateInBasisPoints;
    }

    struct Deposit {
        uint256 id;
        address user;                       // Người gửi ban đầu
        uint256 savingPlanId;
        uint256 amount;                     // Số tiền gốc
        uint32 termInDays;                  // Kỳ hạn (ngày)
        uint256 expectedInterest;           // Lãi dự kiến khi đáo hạn
        uint256 depositDate;                // Thời điểm gửi
        uint256 maturityDate;               // Thời điểm đáo hạn
        DepositStatus status;               // Trạng thái
    }
}
```

---

## 4. CUSTOM ERRORS (ISavingBankErrors.sol)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISavingBankErrors {
    // Plan related errors
    error SavingPlanNotFound(uint256 planId);
    error SavingPlanNotActive(uint256 planId);
    error InvalidTermDays(uint32 termInDays);
    error InvalidInterestRate(uint256 annualInterestRateInBasisPoints);
    error InvalidPenaltyRate(uint256 penaltyRateInBasisPoints);

    // Deposit related errors
    error DepositNotFound(uint256 depositId);
    error DepositNotActive(uint256 depositId);
    error DepositAlreadyClosed(uint256 depositId);
    error DepositNotMature(uint256 depositId, uint256 maturityTimestamp, uint256 currentTimestamp);
    error DepositStillActive(uint256 depositId);

    // Amount related errors
    error InvalidAmount(uint256 amount);
    error InsufficientDepositAmount(uint256 amount, uint256 minimumRequired);
    error ExcessiveDepositAmount(uint256 amount, uint256 maximumAllowed);

    // Access and permission errors
    error UnauthorizedWithdrawal(address caller, uint256 depositId);
    error InvalidAddress();
    error InsufficientVaultLiquidity(uint256 requested, uint256 available);

    // NFT transfer cooldown error
    error CertificateInCooldown(uint256 depositId, uint256 remainingSeconds);
}
```

---

## 5. EVENTS (ISavingBankEvents.sol)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISavingBankEvents {
    // Saving Plan events
    event SavingPlanCreated(uint256 indexed planId, string name);
    event SavingPlanUpdated(uint256 indexed planId);
    event SavingPlanActivated(uint256 indexed planId);
    event SavingPlanDeactivated(uint256 indexed planId);
    event SavingPlanStatusUpdated(uint256 indexed planId, bool isEnabled);
    event PenaltyReceiverUpdated(uint256 indexed planId, address indexed oldReceiver, address indexed newReceiver);

    // Deposit events
    event DepositCreated(
        uint256 indexed depositId,
        address indexed user,
        uint256 indexed savingPlanId,
        uint256 amount,
        uint32 termInDays,
        uint256 maturityDate,
        uint256 certificateId
    );

    event DepositWithdrawn(
        uint256 indexed depositId,
        address indexed user,
        uint256 withdrawAmount,
        uint256 interestAmount,
        uint256 penaltyAmount,
        bool isEarlyWithdrawal
    );

    event DepositRenewed(
        uint256 indexed oldDepositId,
        uint256 indexed newDepositId,
        address indexed depositor,
        uint256 newPrincipalAmount,
        uint256 newPlanId
    );

    // Liquidity management events
    event LiquidityDeposited(address indexed admin, uint256 amount);
    event LiquidityWithdrawn(address indexed admin, uint256 amount);
}
```

---

## 6. API SIGNATURES

### 6.1 Admin Functions (ISavingBankAdmin.sol)

```solidity
interface ISavingBankAdmin is ISavingBankStructs {
    /// @notice Tạo gói tiết kiệm mới
    function createSavingPlan(SavingPlanInput calldata input) external;

    /// @notice Cập nhật gói tiết kiệm
    function updateSavingPlan(uint256 planId, SavingPlanInput calldata input) external;

    /// @notice Cập nhật trạng thái hoạt động của gói
    function updateSavingPlanStatus(uint256 planId, bool isEnabled) external;

    /// @notice Cập nhật địa chỉ nhận tiền phạt
    function updatePenaltyReceiver(uint256 planId, address newReceiver) external;

    /// @notice Kích hoạt gói tiết kiệm
    function activateSavingPlan(uint256 planId) external;

    /// @notice Vô hiệu hóa gói tiết kiệm
    function deactivateSavingPlan(uint256 planId) external;

    /// @notice Nạp token vào vault để trả lãi
    function depositToVault(uint256 amount) external;

    /// @notice Rút token từ vault
    function withdrawFromVault(uint256 amount) external;

    /// @notice Tạm dừng hệ thống
    function pause() external;

    /// @notice Mở lại hệ thống
    function unpause() external;
}
```

### 6.2 User Functions (ISavingBankUser.sol)

```solidity
interface ISavingBankUser {
    /// @notice Tạo sổ tiết kiệm mới
    /// @param savingPlanId ID của gói tiết kiệm
    /// @param amount Số tiền gửi
    /// @param termInDays Kỳ hạn gửi (ngày)
    /// @return depositId ID của sổ tiết kiệm mới
    function createDeposit(
        uint256 savingPlanId,
        uint256 amount,
        uint32 termInDays
    ) external returns (uint256 depositId);

    /// @notice Rút tiền (đúng hạn hoặc trước hạn)
    /// @dev Chỉ NFT owner mới có quyền rút
    function withdrawDeposit(uint256 depositId) external;

    /// @notice Gia hạn sổ tiết kiệm (chỉ khi đã đáo hạn)
    /// @param depositId ID của sổ cũ
    /// @param newPlanId ID của gói mới
    /// @param newTermInDays Kỳ hạn mới
    /// @return newDepositId ID của sổ mới
    function renewDeposit(
        uint256 depositId,
        uint256 newPlanId,
        uint32 newTermInDays
    ) external returns (uint256 newDepositId);
}
```

### 6.3 View Functions (ISavingBankView.sol)

```solidity
interface ISavingBankView is ISavingBankStructs {
    /// @notice Lấy thông tin gói tiết kiệm
    function getSavingPlan(uint256 planId) external view returns (SavingPlan memory);

    /// @notice Lấy thông tin sổ tiết kiệm
    function getDeposit(uint256 depositId) external view returns (Deposit memory);

    /// @notice Lấy danh sách deposit IDs của user
    function getUserDepositIds(address user) external view returns (uint256[] memory);

    /// @notice Đếm số lượng deposits đang active
    function getActiveDepositCount() external view returns (uint256);

    /// @notice Tính lãi dự kiến cho deposit giả định
    function calculateExpectedInterest(uint256 amount, uint256 planId, uint32 termInDays) external view returns (uint256);

    /// @notice Lấy tổng số gói tiết kiệm
    function getTotalPlans() external view returns (uint256);

    /// @notice Lấy tổng số deposits
    function getTotalDeposits() external view returns (uint256);

    /// @notice Lấy địa chỉ token gửi
    function getDepositToken() external view returns (address);

    /// @notice Lấy địa chỉ NFT certificate
    function getDepositCertificateAddress() external view returns (address);

    /// @notice Lấy địa chỉ vault
    function getVaultAddress() external view returns (address);

    /// @notice Lấy số dư vault
    function getVaultBalance() external view returns (uint256);

    /// @notice Kiểm tra deposit đã đáo hạn chưa
    function isDepositMature(uint256 depositId) external view returns (bool);

    /// @notice Tính tiền phạt rút sớm cho deposit
    function calculateEarlyWithdrawalPenalty(uint256 depositId) external view returns (uint256);

    /// @notice Lấy địa chỉ nhận tiền phạt của plan
    function getPenaltyReceiver(uint256 planId) external view returns (address);
}
```

### 6.4 NFT Interface (IDepositCertificate.sol)

```solidity
interface IDepositCertificate is IERC721 {
    /// @notice Mint chứng chỉ tiết kiệm
    function mintCertificate(address to, uint256 depositId) external returns (uint256);

    /// @notice Burn chứng chỉ
    function burnCertificate(uint256 depositId) external;

    /// @notice Kiểm tra certificate tồn tại
    function exists(uint256 depositId) external view returns (bool);

    /// @notice Kiểm tra đang trong cooldown period
    function isInCooldown(uint256 tokenId) external view returns (bool);

    /// @notice Lấy thời gian cooldown còn lại
    function getRemainingCooldown(uint256 tokenId) external view returns (uint256);

    /// @notice Lấy thời điểm transfer cuối
    function getLastTransferTime(uint256 tokenId) external view returns (uint256);
}
```

---

## 7. LIBRARY: InterestCalculator.sol

```solidity
library InterestCalculator {
    uint256 public constant BASIS_POINTS = 10_000;
    uint256 public constant DAYS_PER_YEAR = 365;

    /// @notice Tính lãi đơn (simple interest)
    /// Formula: Interest = (Principal × Rate × Days) / (BASIS_POINTS × DAYS_PER_YEAR)
    function calculateSimpleInterest(
        uint256 principal,
        uint256 annualRateInBasisPoints,
        uint256 termInDays
    ) internal pure returns (uint256 interest);

    /// @notice Tính tiền phạt rút sớm
    /// Formula: Penalty = (Principal × PenaltyRate) / BASIS_POINTS
    function calculatePenalty(
        uint256 principal,
        uint256 penaltyRateInBasisPoints
    ) internal pure returns (uint256 penalty);

    /// @notice Tính tổng số tiền nhận khi đáo hạn
    function calculateMaturityAmount(
        uint256 principal,
        uint256 annualRateInBasisPoints,
        uint256 termInDays
    ) internal pure returns (uint256 maturityAmount);
}
```

---

## 8. PERMISSION MATRIX

| Function                 | DEFAULT_ADMIN | ADMIN_ROLE | PAUSER_ROLE | NFT Owner | Anyone |
| :----------------------- | :-----------: | :--------: | :---------: | :-------: | :----: |
| `createSavingPlan`       |      ✅       |     ✅     |     ❌      |    ❌     |   ❌   |
| `updateSavingPlan`       |      ✅       |     ✅     |     ❌      |    ❌     |   ❌   |
| `updateSavingPlanStatus` |      ✅       |     ✅     |     ❌      |    ❌     |   ❌   |
| `updatePenaltyReceiver`  |      ✅       |     ✅     |     ❌      |    ❌     |   ❌   |
| `depositToVault`         |      ✅       |     ✅     |     ❌      |    ❌     |   ❌   |
| `withdrawFromVault`      |      ✅       |     ✅     |     ❌      |    ❌     |   ❌   |
| `pause`                  |      ✅       |     ❌     |     ✅      |    ❌     |   ❌   |
| `unpause`                |      ✅       |     ❌     |     ✅      |    ❌     |   ❌   |
| `createDeposit`          |      ❌       |     ❌     |     ❌      |    ❌     |   ✅   |
| `withdrawDeposit`        |      ❌       |     ❌     |     ❌      |    ✅     |   ❌   |
| `renewDeposit`           |      ❌       |     ❌     |     ❌      |    ✅     |   ❌   |
| View functions           |      ❌       |     ❌     |     ❌      |    ❌     |   ✅   |

---

## 9. CÔNG THỨC NGHIỆP VỤ

### 9.1 Tính Lãi Đơn (Simple Interest)

$$Interest = \lfloor\frac{Principal \times APR_{Bps} \times Term_{Days}}{DAYS\_PER\_YEAR \times BASIS\_POINTS}\rfloor$$

**Ví dụ:** 1000 USDC × 800 bps × 30 days / (365 × 10000) = 6.575 USDC

### 9.2 Tính Phạt Rút Sớm

$$Penalty = \lfloor\frac{Principal \times Penalty_{Bps}}{BASIS\_POINTS}\rfloor$$

**Ví dụ:** 1000 USDC × 100 bps / 10000 = 10 USDC

### 9.3 Xử Lý Rút Tiền

- **Đúng hạn:** `Payout = Principal + Interest`
- **Trước hạn:** `Payout = Principal - Penalty` (không có lãi)

### 9.4 Gia Hạn (Compound Interest)

- **New Principal = Old Principal + Old Interest**
- NFT cũ burn, NFT mới mint cho kỳ mới

---

## 10. SECURITY FEATURES

### 10.1 NFT Transfer Cooldown (24 hours)

- Sau khi NFT được transfer, owner mới phải đợi 24h trước khi withdraw/renew
- Ngăn chặn front-running và instant withdrawal attacks
- Áp dụng trên tất cả transfers (trừ mint/burn)

### 10.2 Role-Based Access Control

- `DEFAULT_ADMIN_ROLE`: Full control, grant/revoke roles
- `ADMIN_ROLE`: Manage plans, vault operations
- `PAUSER_ROLE`: Emergency pause/unpause

### 10.3 Reentrancy Protection

- Tất cả state-changing functions có `nonReentrant` modifier

### 10.4 Pausable

- Emergency stop capability
- Chặn deposits, withdrawals, renewals khi paused
- Admin functions vẫn hoạt động

---

## 11. DEFINITION OF DONE

| Tiêu chí              | Yêu cầu                          | Status |
| :-------------------- | :------------------------------- | :----: |
| **Compile**           | `npx hardhat compile` thành công |   ✅   |
| **Contract Size**     | Tất cả contracts < 24KB          |   ✅   |
| **Unit Tests**        | Coverage ≥ 95%                   |   ✅   |
| **Integration Tests** | All flows pass                   |   ✅   |
| **Gas Report**        | No function > 500k gas           |   ✅   |
| **Deploy**            | Scripts work on localhost        |   ✅   |
| **NatSpec**           | All public functions documented  |   ✅   |
| **Clean Code**        | No nested logic > 2 levels       |   ✅   |
| **Sepolia**           | Deployed & verified              |   ✅   |
| **Multisig**          | Admin transferred                |   ✅   |

---

## 12. TEST HELPERS

### 12.1 Constants (test/helpers/constants.ts)

```typescript
export const BASIS_POINTS = 10000n;
export const SECONDS_PER_DAY = 86400n;
export const SECONDS_PER_YEAR = 31536000n;
export const USDC_DECIMALS = 6;
export const ONE_USDC = 10n ** BigInt(USDC_DECIMALS);
```

### 12.2 Fixtures (test/helpers/fixtures.ts)

- `deployFullFixture()`: Deploy all contracts with roles configured

### 12.3 Time Helpers (test/helpers/time.ts)

- `advanceTimeByDays(days)`: Time travel
- `advanceTimeBySeconds(seconds)`: Precise time control

---

## 13. CHANGELOG

### v1.1.0 (31/01/2026)

- ✅ Added new view functions:
  - `getTotalPlans()`
  - `getTotalDeposits()`
  - `getDepositToken()`
  - `getDepositCertificateAddress()`
  - `getVaultAddress()`
  - `getVaultBalance()`
  - `isDepositMature(depositId)`
  - `calculateEarlyWithdrawalPenalty(depositId)`
  - `getPenaltyReceiver(planId)`
- ✅ Updated ISavingBankView interface
- ✅ All 155 tests passing

### v1.0.0 (30/01/2026)

- Initial Sepolia deployment
- Multisig security configured
- 91 tests passing
