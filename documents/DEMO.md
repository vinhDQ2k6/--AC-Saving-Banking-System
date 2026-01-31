# 🎬 DEMO.md - Deployment, Scripts & Testing Guide

**Status**: 🎉 **PRODUCTION READY (Sepolia Testnet Live)**  
**Last Updated**: January 31, 2026  
**Version**: 1.0

This document provides comprehensive guides for deploying contracts, running manual scripts, executing tests, and demonstrating the AC Saving Banking system functionality.

---

## 1. DEPLOYMENT GUIDE

### 1.1 Environment Setup

#### Prerequisites

```bash
Node.js 18.0.0 or higher
npm 8.0.0 or higher
Git
```

#### Clone Repository

```bash
git clone https://github.com/vinhDQ2k6/--AC-Save-Banking-Revamp.git
cd AC-Save-Banking-Revamp
npm install
```

#### Compile Contracts

```bash
npx hardhat compile

# Expected output:
# ✓ 11 contracts compiled successfully
```

#### Check Contract Sizes

```bash
npx hardhat size-contracts

# Expected output:
# SavingBank              : 12.53 KiB  ✅
# DepositCertificate      :  8.39 KiB  ✅
# Vault                   :  3.47 KiB  ✅
# MockUSDC                :  4.72 KiB  ✅
```

### 1.2 Environment Configuration

#### Create .env File

```bash
cp .env.example .env
```

#### Edit .env with Your Values

```bash
# Sepolia Testnet Configuration
SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
SEPOLIA_PRIVATE_KEY=0x... # Your deployment wallet private key

# Etherscan Verification
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY

# Multisig Configuration (Production)
MULTISIG_ADDRESS=0x09E6F2590fF9245245735c59dFE1AE862AB1A082
```

#### Verify Wallet Balance

```bash
npx hardhat run scripts/manual/check-balance.ts --network sepolia

# Expected output:
# Wallet: 0x...
# Balance: X.XX ETH
```

### 1.3 Local Development Deployment

#### Start Local Blockchain

```bash
# Terminal 1: Start Hardhat node
npx hardhat node

# Expected output:
# started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545
# Accounts: (20 accounts with 10000 ETH each)
```

#### Deploy to Localhost

```bash
# Terminal 2: Deploy contracts
npx hardhat deploy --network localhost

# Expected output:
# ✅ MockUSDC deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
# ✅ DepositCertificate deployed at: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
# ✅ Vault deployed at: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
# ✅ SavingBank deployed at: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
# ✅ Admin roles configured
```

#### Run Local Tests

```bash
npx hardhat test --network localhost

# Expected: All 155 tests passing
```

### 1.4 Testnet Deployment (Sepolia)

#### Step 1: Deploy Stage 1 - MockUSDC

```bash
npx hardhat deploy --tags MockUSDC --network sepolia

# Verify on Etherscan:
npx hardhat verify --network sepolia <MOCK_USDC_ADDRESS>
```

#### Step 2: Deploy Stage 2 - DepositCertificate

```bash
npx hardhat deploy --tags DepositCertificate --network sepolia

# Verify (with constructor args):
npx hardhat verify --network sepolia <CERTIFICATE_ADDRESS> \
  "SavingBank Deposit Certificate" "SBDC"
```

#### Step 3: Deploy Stage 3 - Vault

```bash
npx hardhat deploy --tags Vault --network sepolia

# Verify (with MockUSDC address):
npx hardhat verify --network sepolia <VAULT_ADDRESS> <MOCK_USDC_ADDRESS>
```

#### Step 4: Deploy Stage 4 - SavingBank

```bash
npx hardhat deploy --tags SavingBank --network sepolia

# Verify (with all dependency addresses):
npx hardhat verify --network sepolia <SAVINGBANK_ADDRESS> \
  <MOCK_USDC_ADDRESS> <CERTIFICATE_ADDRESS> <VAULT_ADDRESS>
```

#### Step 5: Setup Admin Security

```bash
# Grant roles and transfer admin to multisig
MULTISIG_ADDRESS=0x09E6F2590fF9245245735c59dFE1AE862AB1A082 \
npx hardhat deploy --tags AdminSecurity --network sepolia

# Expected output:
# ✅ LIQUIDITY_MANAGER_ROLE granted to SavingBank on Vault
# ✅ WITHDRAW_ROLE granted to SavingBank on Vault
# ✅ MINTER_ROLE granted to SavingBank on DepositCertificate
# ✅ DEFAULT_ADMIN_ROLE transferred to multisig
# ✅ Deployer admin revoked
```

#### Verify All Deployments

```bash
npx hardhat run scripts/verify-deployment.ts --network sepolia

# Check deployment addresses in:
cat deployments/sepolia/.chainId
ls -la deployments/sepolia/
```

### 1.5 Contract Verification on Etherscan

#### Automatic Verification (if API key configured)

```bash
npx hardhat etherscan-verify --network sepolia
```

#### Manual Verification

Visit Etherscan and verify each contract:

- [SavingBank](https://sepolia.etherscan.io/address/0xfFB768b9D631732516d3e136CF2fCC46E10880f2#code)
- [Vault](https://sepolia.etherscan.io/address/0x6F4C9B4C6205E1D553206F2fc44F52523c764D9b#code)
- [DepositCertificate](https://sepolia.etherscan.io/address/0x2A961935374CFF8CeB9233B58d423fef56F9645D#code)
- [MockUSDC](https://sepolia.etherscan.io/address/0xca06b1BD160140D6624f41e9bDc8aE4bDC296187#code)

---

## 2. MANUAL SCRIPTS - INTERACTIVE OPERATIONS

### 2.1 Admin Operations

#### Create Saving Plan

```bash
npx hardhat run scripts/manual/admin/manage-plans.ts --network sepolia

# Interactive prompts:
# 1. Enter plan name: "Premium 90 Days"
# 2. Enter min deposit (in USDC): 1000
# 3. Enter max deposit (0 = unlimited): 100000
# 4. Enter min term (days): 90
# 5. Enter max term (days): 91
# 6. Enter APY (in basis points, 800=8%): 800
# 7. Enter early withdrawal penalty (500=5%): 500
# 8. Enter penalty receiver address: 0x...

# Expected output:
# ✅ SavingPlan #1 created successfully
# 📝 Transaction hash: 0x...
```

#### Update Saving Plan

```bash
npx hardhat run scripts/manual/admin/manage-plans.ts --network sepolia

# Select option: "Update existing plan"
# Follow prompts to modify plan parameters
```

#### Deposit Liquidity to Vault

```bash
npx hardhat run scripts/manual/admin/vault-operations.ts --network sepolia

# Interactive prompts:
# 1. Action: "Deposit liquidity"
# 2. Amount (in USDC): 10000

# Behind the scenes:
# 1. Approve USDC: 10,000 USDC
# 2. Deposit to vault: 10,000 USDC
# 3. Vault balance: 10,000 USDC

# Expected output:
# ✅ Liquidity deposited: 10,000 USDC
# 📊 New vault balance: 10,000 USDC
```

#### Withdraw Liquidity from Vault

```bash
npx hardhat run scripts/manual/admin/vault-operations.ts --network sepolia

# Interactive prompts:
# 1. Action: "Withdraw liquidity"
# 2. Amount (in USDC): 5000

# Expected output:
# ✅ Liquidity withdrawn: 5,000 USDC
# 📊 New vault balance: 5,000 USDC
```

#### Manage Roles

```bash
npx hardhat run scripts/manual/admin/role-management.ts --network sepolia

# Options:
# 1. Grant role to address
# 2. Revoke role from address
# 3. Check if address has role

# Example:
# Grant PAUSER_ROLE to multisig for emergency operations
```

### 2.2 User Operations

#### Create Deposit

```bash
npx hardhat run scripts/manual/user/create-deposit.ts --network sepolia

# Interactive prompts:
# 1. Select saving plan: [1] Premium 90 Days (8% APY)
# 2. Enter deposit amount (USDC): 5000
# 3. Enter term (days): 90

# Transaction flow:
# 1. Approve USDC to SavingBank
# 2. Call createDeposit(planId=1, amount=5000, termInDays=90)
# 3. Receive NFT certificate (tokenId = depositId)
# 4. Calculate interest: (5000 × 800 × 90) / (10000 × 365) = 98.63 USDC

# Expected output:
# ✅ Deposit created successfully
# 📋 Deposit ID: 1
# 🎫 NFT Certificate ID: 1 (owner: your address)
# 💰 Principal: 5,000 USDC
# 📈 Expected interest at maturity: 98.63 USDC
# 📅 Maturity date: [future timestamp]
```

#### View User Deposits

```bash
npx hardhat run scripts/manual/view/view-user-deposits.ts --network sepolia

# Expected output:
# 👤 Deposits for: 0x...
#
# Deposit #1 - Premium 90 Days
#   Principal: 5,000 USDC
#   Status: Active
#   Interest earned: 98.63 USDC
#   Maturity: 2026-04-30 10:00 UTC
#   NFT Owner: 0x... (current holder)
#
# Total active deposits: 1
# Total principal locked: 5,000 USDC
```

#### Withdraw Deposit (At Maturity)

```bash
# After maturity date arrives:
npx hardhat run scripts/manual/user/withdraw-deposit.ts --network sepolia

# Interactive prompts:
# 1. Select deposit to withdraw: [1] Premium 90 Days

# Pre-flight checks:
# ✓ Deposit is mature
# ✓ You own the NFT certificate
# ✓ Not in 24-hour cooldown period

# Transaction flow:
# 1. Calculate: withdrawAmount = 5000 + 98.63 = 5098.63 USDC
# 2. Verify vault has sufficient balance
# 3. Update deposit status: Active → Withdrawn
# 4. Burn NFT certificate
# 5. Transfer USDC to user

# Expected output:
# ✅ Deposit withdrawn successfully
# 💰 Received: 5,098.63 USDC (principal + interest)
# 🎫 NFT certificate burned
```

#### Withdraw Deposit Early (Before Maturity)

```bash
# Before maturity date:
npx hardhat run scripts/manual/user/withdraw-deposit.ts --network sepolia

# Select same deposit (early withdrawal auto-detected)

# Transaction flow:
# 1. Calculate penalty: (5000 × 500) / 10000 = 250 USDC
# 2. Calculate: withdrawAmount = 5000 - 250 = 4750 USDC
# 3. Route penalty to penaltyReceiver (or stay in vault)
# 4. Transfer 4750 USDC to user
# 5. Burn NFT

# Expected output:
# ⚠️  Early withdrawal detected
# 💸 Penalty applied: 250 USDC (5%)
# 💰 Received: 4,750 USDC (no interest earned)
# 📊 Loss: 98.63 USDC (all interest forfeited)
```

#### Renew Deposit (Compound Interest)

```bash
# After maturity date:
npx hardhat run scripts/manual/user/renew-deposit.ts --network sepolia

# Interactive prompts:
# 1. Select deposit to renew: [1] Premium 90 Days
# 2. Select new plan: [1] Premium 90 Days (same plan allowed)
# 3. Enter new term: 90 days

# Compound Interest Calculation:
# newPrincipal = 5000 + 98.63 = 5,098.63 USDC
# newInterest = (5098.63 × 800 × 90) / (10000 × 365) = 100.37 USDC

# Transaction flow:
# 1. Mark old deposit as: Renewed
# 2. Create new deposit with newPrincipal = 5098.63
# 3. Mint new NFT certificate
# 4. Update userDepositIds

# KEY: No token movement! Funds stay in vault

# Expected output:
# ✅ Deposit renewed successfully
# 🔄 Old Deposit: Status changed to Renewed
# 📋 New Deposit ID: 2
# 🎫 New NFT Certificate: 2
# 💰 New principal (compounded): 5,098.63 USDC
# 📈 Expected new interest: 100.37 USDC
# 📅 New maturity: [future timestamp]
```

#### Transfer NFT Certificate

```bash
npx hardhat run scripts/manual/user/transfer-certificate.ts --network sepolia

# Interactive prompts:
# 1. Select NFT to transfer: [1] Deposit #1
# 2. Enter recipient address: 0x... (new holder)

# Important: 24-hour cooldown after transfer!

# Transaction flow:
# 1. Call safeTransferFrom(from, to, tokenId)
# 2. Set _lastTransferTime[tokenId] = now
# 3. New holder becomes: withdrawal rights holder
# 4. Original depositor loses control

# Expected output:
# ✅ NFT transferred successfully
# 👤 New owner: 0x...
# ⏳ Cooldown active: 24 hours remaining
# ⚠️  New owner cannot withdraw/renew for 24 hours
# 💡 After cooldown: New owner has full control
```

### 2.3 View Operations

#### View All Saving Plans

```bash
npx hardhat run scripts/manual/view/view-saving-plans.ts --network sepolia

# Expected output:
# 📊 AVAILABLE SAVING PLANS
#
# Plan #1 - Premium 90 Days
#   Status: ✅ Active
#   Min deposit: 1,000 USDC
#   Max deposit: 100,000 USDC
#   Term: 90-91 days
#   APY: 8% (800 basis points)
#   Penalty: 5% (for early withdrawal)
#   Penalty receiver: 0x...
#
# Plan #2 - Standard 180 Days
#   Status: ✅ Active
#   ...
#
# Total plans: 2
```

#### View Deposit Details

```bash
npx hardhat run scripts/manual/view/view-deposit-details.ts --network sepolia

# Interactive prompt:
# Enter deposit ID: 1

# Expected output:
# 📋 DEPOSIT DETAILS
#
# Deposit ID: 1
# Status: Active
# Original depositor: 0x...
# Current NFT owner: 0x... (has withdrawal rights)
# Plan: Premium 90 Days
# Principal: 5,000 USDC
# Term: 90 days
# Deposited: 2026-01-31 10:00 UTC
# Maturity: 2026-04-30 10:00 UTC
# Days remaining: 89 days
# Expected interest: 98.63 USDC
# Status: 🟢 Active (can withdraw at maturity)
```

#### View System Status

```bash
npx hardhat run scripts/manual/view/view-system-status.ts --network sepolia

# Expected output:
# 🏦 SAVING BANKING SYSTEM STATUS
#
# Network: Sepolia Testnet
#
# Contracts:
#   SavingBank: 0x2fcF8E2110dc3b1111DF0F222B4F572d06A9548f ✅
#   Vault: 0xA78f3F0D5de4C4B7789216Ee5e56f4BE0542e128 ✅
#   DepositCertificate: 0xDc112945182d21d10DEfEb1E179F96F5075BB6BF ✅
#   MockUSDC: 0x4806158ad022d93a27bB17eF6d423870BA23fac7 ✅
#
# Vault Status:
#   Balance: 15,000 USDC
#   Total deposits locked: 5,000 USDC
#   Available liquidity: 10,000 USDC
#
# Plans:
#   Active: 2
#   Inactive: 0
#   Total: 2
#
# Deposits:
#   Total created: 1
#   Active: 1
#   Withdrawn: 0
#   Renewed: 0
#
# Admin:
#   Controller: Gnosis Safe (multisig)
#   Status: 🟢 Operational
```

#### View Roles

```bash
npx hardhat run scripts/manual/view/view-roles.ts --network sepolia

# Expected output:
# 🔐 ROLE ASSIGNMENTS
#
# SavingBank:
#   DEFAULT_ADMIN_ROLE: Multisig (0x09E6F2590fF9245245735c59dFE1AE862AB1A082)
#   ADMIN_ROLE: Multisig
#   PAUSER_ROLE: Multisig
#
# Vault:
#   DEFAULT_ADMIN_ROLE: Multisig
#   LIQUIDITY_MANAGER_ROLE: SavingBank (0x2fcF8E2110dc3b1111DF0F222B4F572d06A9548f)
#   WITHDRAW_ROLE: SavingBank
#
# DepositCertificate:
#   DEFAULT_ADMIN_ROLE: Multisig
#   MINTER_ROLE: SavingBank
```

---

## 3. AUTOMATED TESTING

### 3.1 Run All Tests

```bash
npx hardhat test

# Expected output:
# Business Tests          : 60+ tests passing
# Unit Tests              : 76 tests passing
# Integration Tests       : 15 tests passing
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TOTAL                   : 155 tests PASSING (100%)
# Time: ~5 seconds
```

### 3.2 Run Specific Test Files

#### Unit Tests

```bash
# Test interest calculation
npx hardhat test test/unit/InterestCalculator.test.ts

# Test SavingBank core logic
npx hardhat test test/unit/SavingBank.test.ts

# Test deposit operations
npx hardhat test test/unit/DepositOperations.test.ts

# Test withdrawal logic
npx hardhat test test/unit/WithdrawOperations.test.ts

# Test renewal logic
npx hardhat test test/unit/RenewOperations.test.ts

# Test vault operations
npx hardhat test test/unit/VaultOperations.test.ts

# Test NFT functionality
npx hardhat test test/unit/SavingPlan.test.ts
```

#### Business Tests

```bash
# Full deployment and setup
npx hardhat test test/business/01-deployment-full.test.ts

# Role-based security
npx hardhat test test/business/02-role-security.test.ts

# User operations flow
npx hardhat test test/business/03-user-operations.test.ts

# Time-based scenarios
npx hardhat test test/business/04-time-simulation.test.ts

# Admin operations
npx hardhat test test/business/05-admin-operations.test.ts

# End-to-end scenarios
npx hardhat test test/business/06-complete-simulation.test.ts
```

#### Integration Tests

```bash
# Full system integration
npx hardhat test test/integration/SavingBank.integration.test.ts
```

### 3.3 Run Tests with Coverage

```bash
npx hardhat coverage

# Expected output:
# File                          | % Statements | % Branch | % Funcs | % Lines
# ─────────────────────────────────────────────────────────────────────
# InterestCalculator.sol        |      100%    |  100%    |  100%   |  100%
# SavingBank.sol                |      100%    |  100%    |  100%   |  100%
# Vault.sol                     |      100%    |  100%    |  100%   |  100%
# DepositCertificate.sol        |      100%    |  100%    |  100%   |  100%
# ─────────────────────────────────────────────────────────────────────
# All files                     |      100%    |  100%    |  100%   |  100%
```

### 3.4 Run Tests on Live Testnet

```bash
# Test against deployed Sepolia contracts
npx hardhat test --network sepolia

# Note: Uses actual deployed contracts
# Slower execution (~30-60 seconds per test)
# Good for verifying production behavior
```

---

## 4. LIVE TESTNET DEMONSTRATION

### 4.1 Scenario 1: Create and Withdraw at Maturity

**Time**: ~5 minutes demo (time accelerated in tests)

```bash
# Step 1: Prepare environment
npx hardhat run scripts/manual/check-balance.ts --network sepolia

# Step 2: Create saving plan
npx hardhat run scripts/manual/admin/manage-plans.ts --network sepolia
# Create: "Demo Plan" - 8% APY, 7-8 days, 100-50000 USDC

# Step 3: Check vault has liquidity
npx hardhat run scripts/manual/view/view-system-status.ts --network sepolia

# Step 4: Create deposit
npx hardhat run scripts/manual/user/create-deposit.ts --network sepolia
# Deposit: 1000 USDC for 7 days
# Expected interest: (1000 × 800 × 7) / (10000 × 365) = 1.53 USDC

# Step 5: View deposit details
npx hardhat run scripts/manual/view/view-deposit-details.ts --network sepolia
# Status: Active, awaiting maturity

# Step 6: Wait 7 days (in test: instant)
# npx hardhat run scripts/business/04-time-simulation.test.ts

# Step 7: Withdraw at maturity
npx hardhat run scripts/manual/user/withdraw-deposit.ts --network sepolia
# Received: 1001.53 USDC (principal + interest)
# Status: Withdrawn, NFT burned
```

### 4.2 Scenario 2: Early Withdrawal with Penalty

**Time**: ~3 minutes demo

```bash
# Step 1: Create another deposit
npx hardhat run scripts/manual/user/create-deposit.ts --network sepolia
# Deposit: 5000 USDC for 30 days (penalty: 5%)

# Step 2: Withdraw immediately (before maturity)
npx hardhat run scripts/manual/user/withdraw-deposit.ts --network sepolia

# Calculation:
# Penalty = (5000 × 500) / 10000 = 250 USDC
# Received = 5000 - 250 = 4750 USDC
# Lost = all interest + 250 penalty

# Status: Withdrawn, NFT burned
```

### 4.3 Scenario 3: Compound Interest with Renewal

**Time**: ~4 minutes demo

```bash
# Step 1: Create deposit
npx hardhat run scripts/manual/user/create-deposit.ts --network sepolia
# 2000 USDC for 30 days @ 8% APY

# Step 2: Wait for maturity (in test: time-travel)

# Step 3: Renew deposit
npx hardhat run scripts/manual/user/renew-deposit.ts --network sepolia

# Calculation:
# Old principal: 2000 USDC
# Old interest: 13.15 USDC
# New principal: 2013.15 USDC
# New interest (for next 30 days): 13.16 USDC

# Step 4: View new deposit
npx hardhat run scripts/manual/view/view-deposit-details.ts --network sepolia
# Shows compounded principal and new maturity

# Total earned: 13.15 + 13.16 = 26.31 USDC (from 2000 initial)
```

### 4.4 Scenario 4: NFT Transfer Cooldown

**Time**: ~2 minutes demo

```bash
# Step 1: Create deposit
npx hardhat run scripts/manual/user/create-deposit.ts --network sepolia
# 1000 USDC, receive NFT

# Step 2: Transfer NFT to another address
npx hardhat run scripts/manual/user/transfer-certificate.ts --network sepolia
# Enter recipient address

# Step 3: New owner tries to withdraw immediately
# ❌ FAILS: CertificateInCooldown error
# Message: "24 hours remaining"

# Step 4: Wait 24 hours (in test: instant via time-travel)

# Step 5: Try withdraw again
# ✅ SUCCESS: Now can withdraw
```

---

## 5. TROUBLESHOOTING

### 5.1 Common Issues

#### "Insufficient ETH for gas"

```bash
# Problem: Wallet doesn't have enough ETH for transaction fees

# Solution:
# 1. Request testnet ETH from faucet
#    - https://www.alchemy.com/faucets/ethereum-sepolia
#    - https://sepoliafaucet.com/
# 2. Check balance again
npx hardhat run scripts/manual/check-balance.ts --network sepolia
```

#### "Contract not verified on Etherscan"

```bash
# Problem: Can't view source code on Etherscan

# Solution:
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> [CONSTRUCTOR_ARGS]
```

#### "Insufficient vault liquidity"

```bash
# Problem: Not enough funds in vault to pay interest

# Solution:
npx hardhat run scripts/manual/admin/vault-operations.ts --network sepolia
# Deposit more liquidity to vault
```

#### "Deposit not found"

```bash
# Problem: Invalid deposit ID

# Solution:
# 1. View all your deposits
npx hardhat run scripts/manual/view/view-user-deposits.ts --network sepolia
# 2. Use correct deposit ID from list
```

#### "Certificate in cooldown"

```bash
# Problem: NFT was recently transferred

# Solution:
# Wait 24 hours, or check remaining cooldown:
npx hardhat run scripts/manual/view/view-deposit-details.ts --network sepolia
# Shows: "Cooldown: 23h 45m remaining"
```

### 5.2 Debug Commands

```bash
# Check all deployed addresses
cat deployments/sepolia/.chainId
ls -la deployments/sepolia/

# Check specific contract state
npx hardhat run scripts/manual/view/view-system-status.ts --network sepolia

# Check your roles on contracts
npx hardhat run scripts/manual/view/view-roles.ts --network sepolia

# Run single test with verbose output
npx hardhat test test/unit/SavingBank.test.ts --reporter tap
```

---

## 6. PERFORMANCE METRICS

### 6.1 Gas Usage

| Operation                      | Gas Used | Notes                     |
| ------------------------------ | -------- | ------------------------- |
| `createDeposit()`              | ~200,000 | Varies by plan validation |
| `withdrawDeposit()` (maturity) | ~180,000 | Includes NFT burn         |
| `withdrawDeposit()` (early)    | ~200,000 | With penalty routing      |
| `renewDeposit()`               | ~250,000 | Mints new NFT             |
| `createSavingPlan()`           | ~150,000 | One-time admin op         |
| `pause()` / `unpause()`        | ~50,000  | Emergency controls        |

### 6.2 Execution Times (Testnet)

| Operation        | Time        |
| ---------------- | ----------- |
| Deposit creation | ~15 seconds |
| Withdrawal       | ~15 seconds |
| Plan creation    | ~10 seconds |
| View operations  | < 1 second  |

### 6.3 Contract Sizes

| Contract           | Size      | Status        |
| ------------------ | --------- | ------------- |
| SavingBank         | 12.53 KiB | ✅ Under 24KB |
| DepositCertificate | 8.39 KiB  | ✅ Under 24KB |
| Vault              | 3.47 KiB  | ✅ Under 24KB |
| MockUSDC           | 4.72 KiB  | ✅ Under 24KB |

---

## 7. NEXT STEPS

### 7.1 After Testing Complete

1. ✅ Review test results and coverage
2. ✅ Verify all contracts on Etherscan
3. ✅ Confirm multisig security setup
4. ✅ Document deployment addresses
5. 🔜 Schedule external security audit
6. 🔜 Begin frontend development

### 7.2 Resources

- **Sepolia Faucet**: https://sepoliafaucet.com/
- **Etherscan**: https://sepolia.etherscan.io/
- **Gnosis Safe**: https://app.safe.global/
- **Hardhat Docs**: https://hardhat.org/docs

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Status**: PRODUCTION READY - TESTNET DEPLOYMENT COMPLETE
