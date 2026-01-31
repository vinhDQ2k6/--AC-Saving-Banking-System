# 🏦 AC Saving Banking System - Smart Contract Platform

**Status**: 🎉 **PRODUCTION READY (Sepolia Testnet Deployed + Multisig Secured)**

A comprehensive decentralized saving banking platform built on Ethereum smart contracts, implementing professional-grade Clean Code principles and enterprise-level security practices.

---

## 📊 Project Overview

**AC Saving Banking** is a fixed-term deposit system that allows users to earn interest on their crypto savings through transparent, auditable smart contracts. The system combines business logic, liquidity management, and NFT-based certificate system for a complete DeFi savings experience.

### Current Status

```
✅ Smart Contracts        : 100% Complete (All 4 contracts deployed)
✅ Test Coverage          : 155/155 tests passing (100%)
✅ Internal Audit         : PASSED (30/01/2026)
✅ Testnet Deployment     : Sepolia verified & live
✅ Multisig Security      : Gnosis Safe with 3 signers
✅ Admin Rights           : Transferred to multisig, deployer revoked
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 READY FOR: Frontend integration, external audit, mainnet prep
```

---

## 🏗️ Architecture

### Core Components

| Component              | Purpose                                                 | Status  |
| ---------------------- | ------------------------------------------------------- | ------- |
| **SavingBank**         | Business logic (plans, deposits, withdrawals, renewals) | ✅ Live |
| **Vault**              | Liquidity management for interest payments              | ✅ Live |
| **DepositCertificate** | ERC721 NFTs representing deposit ownership              | ✅ Live |
| **MockUSDC**           | Test USDC token (6 decimals)                            | ✅ Live |
| **InterestCalculator** | Pure math library for calculations                      | ✅ Live |

### Key Features

- ✅ **Modular Architecture**: Clean separation of business logic, liquidity, and NFT operations
- ✅ **Role-Based Access Control**: Granular permissions (DEFAULT_ADMIN, ADMIN_ROLE, PAUSER_ROLE)
- ✅ **NFT Certificates**: Each deposit = unique ERC721 NFT with transfer rights
- ✅ **NFT-Based Withdrawal**: Certificate owner (not original depositor) has withdrawal rights
- ✅ **24-Hour Transfer Cooldown**: Security mechanism to prevent instant withdrawal attacks
- ✅ **Flexible Interest System**: Configurable APY, terms, and early withdrawal penalties
- ✅ **Compound Interest**: Renewal option with interest added to principal
- ✅ **Emergency Pause**: Multisig-controlled pause/unpause functionality
- ✅ **Clean Code**: SOLID principles, zero abbreviations, comprehensive documentation

---

## 📍 Deployment Status

### Sepolia Testnet (Live)

| Contract               | Address                                      | Verified                                                                                        |
| ---------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **MockUSDC**           | `0xca06b1BD160140D6624f41e9bDc8aE4bDC296187` | ✅ [View](https://sepolia.etherscan.io/address/0xca06b1BD160140D6624f41e9bDc8aE4bDC296187#code) |
| **DepositCertificate** | `0x2A961935374CFF8CeB9233B58d423fef56F9645D` | ✅ [View](https://sepolia.etherscan.io/address/0x2A961935374CFF8CeB9233B58d423fef56F9645D#code) |
| **Vault**              | `0x6F4C9B4C6205E1D553206F2fc44F52523c764D9b` | ✅ [View](https://sepolia.etherscan.io/address/0x6F4C9B4C6205E1D553206F2fc44F52523c764D9b#code) |
| **SavingBank**         | `0xfFB768b9D631732516d3e136CF2fCC46E10880f2` | ✅ [View](https://sepolia.etherscan.io/address/0xfFB768b9D631732516d3e136CF2fCC46E10880f2#code) |

### Multisig Administration (Sepolia)

| Setting                 | Value                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| **Gnosis Safe Address** | `0x09E6F2590fF9245245735c59dFE1AE862AB1A082`                                                       |
| **Network**             | Sepolia Testnet                                                                                    |
| **Signers**             | 3 signers (threshold: 3/3)                                                                         |
| **Dashboard**           | [Gnosis Safe UI](https://app.safe.global/home?safe=sep:0x09E6F2590fF9245245735c59dFE1AE862AB1A082) |
| **Admin Status**        | ✅ All DEFAULT_ADMIN_ROLE transferred to multisig                                                  |

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js 18+ and npm
Git
```

### Installation

```bash
# Clone repository
git clone <repository-url>
cd AC-Save-Banking-Revamp

# Install dependencies
npm install

# Compile smart contracts
npx hardhat compile
```

### Local Development

```bash
# Run tests
npx hardhat test

# Start local blockchain
npx hardhat node

# Deploy to local network (in another terminal)
npx hardhat deploy --network localhost
```

### Interact with Sepolia Testnet

```bash
# View available manual scripts
ls scripts/manual/

# Create a saving plan (admin only, via multisig)
npx hardhat run scripts/manual/admin/manage-plans.ts --network sepolia

# Create a deposit (user operation)
npx hardhat run scripts/manual/user/create-deposit.ts --network sepolia

# View user deposits
npx hardhat run scripts/manual/view/view-user-deposits.ts --network sepolia

# Withdraw deposit
npx hardhat run scripts/manual/user/withdraw-deposit.ts --network sepolia

# Renew deposit (when mature)
npx hardhat run scripts/manual/user/renew-deposit.ts --network sepolia
```

---

## 📚 Documentation

### Main Documentation Files

| Document                                         | Purpose                                         |
| ------------------------------------------------ | ----------------------------------------------- |
| **[README.md](README.md)**                       | Project overview & quick start (this file)      |
| **[REQUIREMENTS.md](documents/REQUIREMENTS.md)** | Business & technical requirements               |
| **[ARCHITECTURE.md](documents/ARCHITECTURE.md)** | System architecture, data flows, access control |
| **[DEMO.md](documents/DEMO.md)**                 | Deployment guide, manual scripts, testing       |

### Project Structure

```
contracts/
├── interfaces/                # 7 contract interfaces
│   ├── ISavingBankStructs.sol
│   ├── ISavingBankErrors.sol
│   ├── ISavingBankEvents.sol
│   ├── ISavingBankAdmin.sol
│   ├── ISavingBankUser.sol
│   ├── ISavingBankView.sol
│   ├── IDepositCertificate.sol
│   ├── IVault.sol
│   └── IVaultEvents.sol
├── libraries/
│   └── InterestCalculator.sol  # Pure math functions
├── tokens/
│   └── MockUSDC.sol            # Test token (6 decimals)
├── certificates/
│   └── DepositCertificate.sol  # ERC721 with 24h cooldown
├── vault/
│   └── Vault.sol               # Liquidity management
└── SavingBank.sol              # Main business logic

deploy/                         # 5-stage deployment scripts
├── 1-deploy-mock-usdc.ts
├── 2-deploy-deposit-certificate.ts
├── 3-deploy-vault.ts
├── 4-deploy-saving-bank.ts
└── 5-setup-admin-security.ts

scripts/
├── business/                   # Business scenario simulations
├── manual/                     # Interactive CLI scripts
│   ├── admin/
│   ├── user/
│   └── view/
└── README.md

test/
├── business/                   # 6 business flow tests
├── integration/                # 1 integration test file
└── unit/                       # 7 unit test files (76 tests)

documents/
├── REQUIREMENTS.md             # Requirements & specifications
├── ARCHITECTURE.md             # System architecture & data flows
└── DEMO.md                     # Deployment & demo guide
```

---

## 💡 How It Works

### User Journey: Create Deposit → Earn Interest → Withdraw

#### 1️⃣ **Create Deposit**

```solidity
// User creates a fixed-term deposit
// - Sends USDC to Vault
// - Receives NFT certificate
// - Earns interest based on plan rate & term

createDeposit(planId, amount, termInDays)
  ├─ Validate: Plan exists, active, amount in range
  ├─ Transfer: USDC from user to Vault
  ├─ Mint: ERC721 certificate to user
  └─ Record: Deposit data with maturity date
```

#### 2️⃣ **Wait for Maturity** (or withdraw early with penalty)

```
Time passes...
- Interest accrues daily (calculated but not paid yet)
- NFT can be transferred to another user
- Transfer has 24-hour cooldown for security
- Recipient becomes new withdrawal rights holder
```

#### 3️⃣ **Withdraw (At Maturity)**

```solidity
// NFT owner withdraws at maturity
// - Receives: Principal + Interest
// - Interest paid from Vault
// - NFT burned (certificate destroyed)

withdrawDeposit(depositId)
  ├─ Verify: Caller owns NFT
  ├─ Check: Not in 24-hour cooldown
  ├─ Verify: Deposit is mature
  ├─ Calculate: Principal + Interest
  ├─ Withdraw: From Vault
  └─ Transfer: Principal + Interest to user
```

#### 3️⃣ **Alternative: Withdraw Early (with Penalty)**

```solidity
withdrawDeposit(depositId)  // Before maturity
  ├─ Verify: Caller owns NFT
  ├─ Calculate: Principal - Penalty (no interest)
  ├─ Route penalty: To penaltyReceiver or stays in Vault
  └─ Transfer: Principal - Penalty to user
```

#### 4️⃣ **Renew (Compound Interest)**

```solidity
// After maturity, renew with compound interest
// - New principal = Old principal + Old interest
// - Start new term with new/same plan
// - Mints new NFT certificate

renewDeposit(depositId, newPlanId, newTermInDays)
  ├─ Verify: Caller owns NFT
  ├─ Check: Deposit is mature
  ├─ Calculate: New principal = Principal + Interest
  ├─ Create: New deposit with compounded amount
  ├─ Mint: New NFT certificate
  └─ Emit: DepositRenewed event
```

---

## 🔒 Security Features

### Access Control

| Role                   | Functions                         | Who               |
| ---------------------- | --------------------------------- | ----------------- |
| **DEFAULT_ADMIN_ROLE** | Grant/revoke roles, manage system | Multisig Safe     |
| **ADMIN_ROLE**         | Create/update plans, manage vault | Multisig Safe     |
| **PAUSER_ROLE**        | Pause/unpause system              | Multisig Safe     |
| **User**               | Create deposits, withdraw, renew  | Certificate owner |

### Protection Mechanisms

- ✅ **Reentrancy Guard**: All state-changing functions protected
- ✅ **24-Hour NFT Cooldown**: Prevents instant transfer→withdraw attacks
- ✅ **Role-Based Access**: Fine-grained permission control
- ✅ **Emergency Pause**: Stop all user operations in emergency
- ✅ **Input Validation**: All parameters validated before processing
- ✅ **Safe ERC20**: Use SafeERC20 for token operations

---

## 📊 Testing

### Test Coverage

```
Business Tests          : 6 test files
Unit Tests              : 7 test files (76 tests)
Integration Tests       : 1 test file (15 tests)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL                   : 155/155 tests PASSING (100%)
```

### Run Tests

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/unit/SavingBank.test.ts

# Run with coverage
npx hardhat coverage

# Run on Sepolia network (live contract testing)
npx hardhat test --network sepolia
```

### Key Test Scenarios

- ✅ Plan creation and management
- ✅ Deposit creation with validation
- ✅ Interest calculation (simple interest formula)
- ✅ Maturity withdrawal
- ✅ Early withdrawal with penalties
- ✅ Deposit renewal with compound interest
- ✅ NFT certificate ownership
- ✅ 24-hour transfer cooldown
- ✅ Role-based access control
- ✅ Emergency pause/unpause

---

## 📈 Interest Calculation

### Formula

$$Interest = \left\lfloor\frac{Principal \times APR_{Bps} \times Term_{Days}}{BASIS\_POINTS \times DAYS\_PER\_YEAR}\right\rfloor$$

Where:

- `Principal` = Deposit amount (in smallest unit)
- `APR_Bps` = Annual percentage rate in basis points (1% = 100 bps)
- `Term_Days` = Deposit term in days
- `BASIS_POINTS` = 10,000
- `DAYS_PER_YEAR` = 365

### Example

```
Principal: 1,000 USDC
APY: 8% (800 basis points)
Term: 90 days

Interest = (1000 × 800 × 90) / (10000 × 365)
         = 72,000,000 / 3,650,000
         = 19.73 USDC (floor)

At Maturity: User receives 1,019.73 USDC
```

---

## 🚀 Deployment & Operations

### For Development Team

1. **Setup environment**: See [DEMO.md](documents/DEMO.md) - Deployment Setup
2. **Deploy to testnet**: `npx hardhat deploy --network sepolia`
3. **Verify on Etherscan**: Scripts provided in DEMO.md
4. **Setup multisig admin**: Transfer DEFAULT_ADMIN_ROLE to Gnosis Safe
5. **Test all operations**: Run manual scripts in `scripts/manual/`

### For End Users

1. **Connect wallet** to dApp (when frontend is ready)
2. **Browse available plans** with different APY/terms
3. **Create deposit** by selecting plan, amount, and term
4. **Receive NFT certificate** as proof of ownership
5. **Withdraw at maturity** or renew with compound interest
6. **Trade NFT** on secondary market (transfer ownership/withdrawal rights)

---

## 🔧 Technology Stack

| Layer               | Technology                              |
| ------------------- | --------------------------------------- |
| **Smart Contracts** | Solidity 0.8.28                         |
| **Framework**       | Hardhat                                 |
| **Token Standard**  | ERC20 (deposits), ERC721 (certificates) |
| **Access Control**  | OpenZeppelin AccessControl              |
| **Testing**         | Hardhat/Chai/Ethers.js                  |
| **Network**         | Ethereum Sepolia Testnet (current)      |
| **Admin Interface** | Gnosis Safe multisig                    |

---

## 📝 Contract Sizes

All contracts optimized to stay well below 24KB deployment limit:

```
SavingBank              : 12.53 KiB  ✅
DepositCertificate      :  8.39 KiB  ✅
Vault                   :  3.47 KiB  ✅
MockUSDC                :  4.72 KiB  ✅
```

---

## 🎯 Next Steps

### Phase 1: External Audit (Q1 2026)

- [ ] Prepare audit package with docs & tests
- [ ] Select external audit firm
- [ ] Resolve audit findings
- [ ] Obtain final audit report

### Phase 2: Frontend Development

- [ ] Design web interface
- [ ] Integrate Web3 wallet connections
- [ ] Build plan browser UI
- [ ] Build deposit/withdrawal flows
- [ ] Build admin dashboard

### Phase 3: Pre-Mainnet

- [ ] Setup production Gnosis Safe with hardware wallets
- [ ] Configure monitoring & alerting
- [ ] Setup bug bounty program
- [ ] Complete security checklist

### Phase 4: Mainnet Launch

- [ ] Deploy to Ethereum mainnet
- [ ] Verify contracts on Etherscan
- [ ] Announce availability
- [ ] Monitor for 1-2 weeks

---

## 📞 Support & Resources

### Documentation

- **Business Requirements**: [REQUIREMENTS.md](documents/REQUIREMENTS.md)
- **System Architecture**: [ARCHITECTURE.md](documents/ARCHITECTURE.md)
- **Deployment & Testing**: [DEMO.md](documents/DEMO.md)

### On-Chain Resources

- **SavingBank Contract**: [Sepolia Etherscan](https://sepolia.etherscan.io/address/0x2fcF8E2110dc3b1111DF0F222B4F572d06A9548f#code)
- **Gnosis Safe**: [Safe Dashboard](https://app.safe.global/home?safe=sep:0x09E6F2590fF9245245735c59dFE1AE862AB1A082)

### Scripts & Tools

```bash
# Interactive manual scripts
scripts/manual/admin/      # Admin operations
scripts/manual/user/       # User operations
scripts/manual/view/       # View operations

# Business simulations
scripts/business/          # End-to-end scenarios

# Deployment
deploy/                    # 5-stage deployment sequence
```

---

## 📄 License

MIT License - See LICENSE file for details

---

## ✅ Verification Checklist

- [x] All 4 contracts deployed to Sepolia
- [x] All contracts verified on Etherscan
- [x] 155/155 tests passing
- [x] Internal audit PASSED
- [x] Multisig security implemented
- [x] Clean code standards followed
- [x] Comprehensive documentation
- [x] Manual scripts provided
- [x] Ready for frontend integration

---

**Last Updated**: January 31, 2026  
**Version**: 1.0.0  
**Status**: Production Ready (Testnet)
