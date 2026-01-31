# 📋 REQUIREMENTS.md - Business & Technical Specifications

**Status**: 🎉 **PRODUCTION READY (Sepolia Testnet Validated)**  
**Scope**: Testnet deployment with MockUSDC  
**Last Updated**: January 31, 2026

This document specifies the complete business requirements and technical standards for the AC Saving Banking system, ensuring all stakeholders understand the product scope, technical constraints, and quality standards.

---

## 1. BUSINESS REQUIREMENTS

### 1.1 Product Overview

**AC Saving Banking** is a decentralized fixed-term savings platform enabling users to:

- Deposit stablecoins (USDC equivalent) for fixed terms
- Earn transparent, predictable interest based on selected plans
- Withdraw deposits at maturity or with early withdrawal penalties
- Renew deposits with compound interest (principal + interest becomes new principal)
- Own withdrawal rights via NFT certificates (tradeable on secondary markets)

### 1.2 User Types

#### 👤 **End User (Depositor)**

- Browses available saving plans with different APY and terms
- Creates fixed-term deposits by locking capital
- Receives ERC721 NFT certificate as proof of ownership
- Can transfer NFT to another user (with 24-hour cooldown for security)
- Withdraws principal + interest at maturity
- May withdraw early with penalty (loses all interest)
- May renew matured deposits with compound interest
- **Important**: Only current NFT holder can withdraw, not original depositor

#### 🏛️ **Bank Admin (Multi-signature)**

- Creates and manages saving plans with configurable parameters
- Updates plan parameters (APY, min/max deposit, terms, penalties)
- Activates/deactivates plans to control product availability
- Manages vault liquidity (deposits funds to pay interest)
- Pauses/unpauses system in emergency
- **Critical**: All admin operations require multisig approval (3/3 signers on Sepolia)

### 1.3 Core Features (MVP - Testnet)

#### 📊 **Saving Plan Management**

- Admin creates plans with parameters:
  - Plan name and unique ID
  - Minimum and maximum deposit amounts (in USDC)
  - Minimum and maximum term duration (in days)
  - Annual percentage rate (APY) in basis points
  - Early withdrawal penalty rate
  - Active/inactive status
- Plans can be updated after creation (does not affect existing deposits)
- Plans can be deactivated to prevent new deposits
- Penalty receiver configurable per plan

#### 💰 **User Deposits**

- User selects plan, deposit amount, and term within plan limits
- Amount must be between plan's min and max limits
- Term must be between plan's min and max term limits
- User transfers USDC to vault during deposit creation
- Interest is pre-calculated at deposit time (not dynamic)
- NFT certificate minted to user (tokenId = depositId)
- Maturity date automatically calculated

#### 📈 **Interest Calculation**

- **Formula**: Simple interest with daily breakdown
  $$Interest = \left\lfloor\frac{Principal \times APY_{Bps} \times Term_{Days}}{BASIS\_POINTS \times 365}\right\rfloor$$
- Interest always rounded **DOWN** (floor) to protect vault
- 1% = 100 basis points (10,000 basis points = 100%)
- Example: $1000 @ 8% APY for 90 days = $19.73 interest

#### 🏧 **Withdrawal at Maturity**

- Only NFT certificate owner can initiate withdrawal
- User receives: **Principal + Interest**
- Interest paid from vault liquidity
- NFT certificate burned upon withdrawal
- Withdrawal blocked if in 24-hour cooldown period after NFT transfer

#### ⚠️ **Early Withdrawal (Before Maturity)**

- User receives: **Principal - Penalty** (no interest earned)
- Penalty calculated as: `floor(Principal × Penalty% / 10000)`
- Penalty routing:
  - If penaltyReceiver set: penalty sent to specified address
  - If penaltyReceiver is zero: penalty remains in vault
- NFT certificate burned upon withdrawal

#### 🔄 **Deposit Renewal (Compound Interest)**

- Available only after maturity date is reached
- New principal = old principal + old interest
- User selects new plan (can be same or different) and new term
- New interest calculated based on new principal and new plan APY
- Example: $1000 deposit → $1020 after 90 days → renew as $1020 principal
- New NFT certificate minted for the renewed deposit

#### 🔒 **Vault Liquidity Management**

- Admin deposits tokens to vault to fund interest payments
- Admin can withdraw excess liquidity
- System prevents withdrawing more than vault balance
- Vault balance tracks available funds for interest payments
- All deposits stored in vault (user USDC becomes vault's USDC)

#### 🛑 **Emergency Pause**

- Admin can pause system to block all user operations
- Pause blocks: deposits, withdrawals, renewals
- Pause does NOT block: admin operations, plan management
- Unpaused returns system to normal operation
- Used in security emergency

### 1.4 Data Structures

#### **SavingPlan**

```solidity
struct SavingPlan {
    uint256 id;                                    // Unique plan ID
    string name;                                   // "Premium 90-Day Plan"
    uint256 minDepositAmount;                      // Minimum deposit (in USDC units)
    uint256 maxDepositAmount;                      // Maximum deposit (0 = unlimited)
    uint32 minTermInDays;                          // Minimum term in days
    uint32 maxTermInDays;                          // Maximum term in days
    uint256 annualInterestRateInBasisPoints;       // APY (8% = 800 bps)
    uint256 penaltyRateInBasisPoints;              // Early withdrawal penalty %
    bool isActive;                                 // Can accept new deposits?
}
```

#### **Deposit**

```solidity
struct Deposit {
    uint256 id;                       // Unique deposit ID = NFT tokenId
    address user;                     // Original depositor
    uint256 savingPlanId;             // Reference to plan used
    uint256 amount;                   // Principal deposited (USDC)
    uint32 termInDays;                // Term selected (days)
    uint256 expectedInterest;         // Pre-calculated interest
    uint256 depositDate;              // Timestamp of creation
    uint256 maturityDate;             // Timestamp when mature
    DepositStatus status;             // Active, Withdrawn, or Renewed
}

enum DepositStatus {
    Active,                           // Can be withdrawn
    Withdrawn,                        // Already withdrawn
    Renewed                           // Converted to new deposit
}
```

### 1.5 Business Rules

1. **Deposit Amount Validation**: Amount must be ≥ minDeposit AND ≤ maxDeposit (if maxDeposit > 0)
2. **Term Validation**: Term must be ≥ minTerm AND ≤ maxTerm
3. **Plan Activation**: Only active plans accept new deposits
4. **Interest Locking**: Interest is fixed at deposit time, not recalculated
5. **Maturity Definition**: Deposit is mature when current timestamp ≥ maturity timestamp
6. **NFT Ownership**: Only current NFT holder has withdrawal/renewal rights
7. **Transfer Cooldown**: NFT transfer triggers 24-hour lockout before withdrawal allowed
8. **Penalty Receiver**: Must be valid address (not zero address) if set
9. **No Fractional Tokens**: All amounts in smallest unit (USDC = 6 decimals)
10. **Immutable History**: Deposit records cannot be edited after creation

### 1.6 Testnet Scope

| Aspect         | Testnet             | Mainnet Future              |
| -------------- | ------------------- | --------------------------- |
| **Network**    | Sepolia Testnet     | Ethereum Mainnet            |
| **Token**      | MockUSDC (test)     | Real USDC                   |
| **Admin**      | Multisig (3/3)      | Multisig (hardware wallets) |
| **Users**      | Test accounts       | Real users                  |
| **TVL**        | Up to Vault balance | Unlimited                   |
| **Monitoring** | Basic Etherscan     | Advanced (Tenderly)         |
| **Bug Bounty** | Internal testing    | Public bounty program       |

---

## 2. TECHNICAL REQUIREMENTS

### 2.1 SOLID Principles Compliance

#### **Single Responsibility**

- **SavingBank**: Business logic only (plans, deposits, withdrawals, renewals)
- **Vault**: Liquidity management only (token storage, role-based access)
- **DepositCertificate**: NFT management only (minting, burning, ownership)
- **InterestCalculator**: Mathematical calculations only (pure functions)

✅ **Implementation**: Each contract has one clear responsibility with no cross-cutting concerns.

#### **Open/Closed**

- Systems open for extension via interface implementation
- No need to modify existing contracts to add new functionality
- Future upgrades: Can create new saving types without modifying SavingBank

✅ **Implementation**: All functionality accessed through well-defined interfaces.

#### **Liskov Substitution**

- All OpenZeppelin contract inheritances follow their standards strictly
- Any implementation of ISavingBankUser can substitute for another
- Interface contracts maintain behavioral compatibility

✅ **Implementation**: No custom override behaviors that violate standard interfaces.

#### **Interface Segregation**

- Admin functions separated: `ISavingBankAdmin`
- User functions separated: `ISavingBankUser`
- View functions separated: `ISavingBankView`
- Clients depend only on needed functions, not entire contract

✅ **Implementation**: 7 focused interfaces instead of 1 monolithic interface.

#### **Dependency Inversion**

- SavingBank depends on `IVault` abstraction, not concrete Vault
- SavingBank depends on `IDepositCertificate` abstraction, not concrete DepositCertificate
- Dependencies injected via constructor, not hardcoded

✅ **Implementation**: All dependencies are interfaces passed to constructor.

### 2.2 Code Quality Standards

#### **Naming Conventions**

| Category      | Convention              | Examples                                          | ✅ Status  |
| ------------- | ----------------------- | ------------------------------------------------- | ---------- |
| **Contracts** | PascalCase              | SavingBank, Vault, DepositCertificate             | ✅ Applied |
| **Functions** | camelCase, verb + noun  | createDeposit, withdrawDeposit, calculateInterest | ✅ Applied |
| **Variables** | camelCase, descriptive  | depositAmount, maturityDate, penaltyRate          | ✅ Applied |
| **Constants** | SCREAMING_SNAKE_CASE    | BASIS_POINTS, ADMIN_ROLE, TRANSFER_COOLDOWN       | ✅ Applied |
| **Events**    | PascalCase, past tense  | DepositCreated, DepositWithdrawn, PlanUpdated     | ✅ Applied |
| **Errors**    | PascalCase, descriptive | SavingPlanNotFound, InsufficientDepositAmount     | ✅ Applied |
| **Mappings**  | Descriptive + direction | depositIdToRecord, userToDepositIds               | ✅ Applied |

**❌ PROHIBITED**: Abbreviations like `usr`, `amt`, `recv`, `mgr` - Always use full words

#### **Code Structure**

- ✅ **Guard Clauses**: All validation at function start, return early
- ✅ **No Nested Logic**: Maximum 2 levels of indentation
- ✅ **Single Responsibility**: Each function does one thing
- ✅ **Flat Logic**: Avoid deeply nested if/else; use helper functions
- ✅ **Clear Comments**: NatSpec for all public functions

```solidity
// ✅ GOOD - Guard clauses, flat logic
function withdrawDeposit(uint256 depositId) external {
    ISavingBankStructs.Deposit storage deposit = deposits[depositId];
    if (deposit.id == 0) revert DepositNotFound(depositId);
    if (deposit.status != Active) revert DepositNotActive(depositId);

    bool isEarlyWithdrawal = block.timestamp < deposit.maturityDate;
    if (isEarlyWithdrawal) {
        _processEarlyWithdrawal(deposit);
    } else {
        _processMaturityWithdrawal(deposit);
    }
}

// ❌ BAD - Nested logic, unclear flow
function withdrawDeposit(uint256 depositId) external {
    if (deposits[depositId].id != 0) {
        if (deposits[depositId].status == Active) {
            if (block.timestamp < deposits[depositId].maturityDate) {
                // complex early withdrawal logic...
            } else {
                // complex maturity logic...
            }
        }
    }
}
```

### 2.3 Security Requirements

#### **Access Control**

- ✅ `DEFAULT_ADMIN_ROLE`: Full system control (currently Gnosis Safe multisig)
- ✅ `ADMIN_ROLE`: Plan management + vault operations
- ✅ `PAUSER_ROLE`: Emergency pause/unpause
- ✅ `MINTER_ROLE`: NFT minting (only SavingBank)
- ✅ `LIQUIDITY_MANAGER_ROLE`: Vault deposits (SavingBank)
- ✅ `WITHDRAW_ROLE`: Vault withdrawals (SavingBank)

#### **Protection Mechanisms**

- ✅ **Reentrancy Guard**: `nonReentrant` on all state-changing functions
- ✅ **Pausable**: Emergency stop capability with PAUSER_ROLE
- ✅ **Input Validation**: All parameters validated before processing
- ✅ **Safe ERC20**: Use SafeERC20 for token transfers
- ✅ **Zero Address Checks**: Validate addresses not zero before use
- ✅ **Vault Balance Checks**: Ensure sufficient liquidity before withdrawals
- ✅ **NFT Ownership Validation**: Verify caller owns certificate before withdrawal
- ✅ **24-Hour Transfer Cooldown**: Prevent instant transfer→withdrawal attacks

#### **Reentrancy-Prone Operations**

All have `nonReentrant` modifier:

- `createDeposit()` - Transfers token to vault
- `withdrawDeposit()` - Transfers tokens from vault to user
- `renewDeposit()` - Creates new deposit and mints NFT

### 2.4 Contract Specifications

#### **SavingBank.sol**

- **Responsibility**: Core business logic
- **Size**: < 13 KiB
- **Dependencies**: Vault, DepositCertificate, MockUSDC (injected)
- **Roles**: DEFAULT_ADMIN_ROLE, ADMIN_ROLE, PAUSER_ROLE

**Admin Functions** (ADMIN_ROLE required):

- `createSavingPlan(input)` - Create new plan
- `updateSavingPlan(planId, input)` - Modify plan
- `updateSavingPlanStatus(planId, isEnabled)` - Activate/deactivate
- `updatePenaltyReceiver(planId, receiver)` - Set penalty address
- `activateSavingPlan(planId)` - Enable plan
- `deactivateSavingPlan(planId)` - Disable plan
- `depositToVault(amount)` - Add liquidity
- `withdrawFromVault(amount)` - Remove liquidity

**Pauser Functions** (PAUSER_ROLE required):

- `pause()` - Stop user operations
- `unpause()` - Resume operations

**User Functions** (No role required, when not paused):

- `createDeposit(planId, amount, termInDays)` → depositId
- `withdrawDeposit(depositId)` → transfers funds to user
- `renewDeposit(depositId, newPlanId, newTermInDays)` → newDepositId

**View Functions** (Public, no permissions):

- `getSavingPlan(planId)` → SavingPlan
- `getDeposit(depositId)` → Deposit
- `getUserDepositIds(user)` → uint256[]
- `getTotalPlans()` → uint256
- `getTotalDeposits()` → uint256
- `getVaultBalance()` → uint256
- `isDepositMature(depositId)` → bool
- `calculateEarlyWithdrawalPenalty(depositId)` → uint256
- `calculateExpectedInterest(amount, planId, termInDays)` → uint256

#### **Vault.sol**

- **Responsibility**: Liquidity & fund management
- **Size**: < 4 KiB
- **Token**: Stores ERC20 tokens (USDC)
- **Roles**: DEFAULT_ADMIN_ROLE, LIQUIDITY_MANAGER_ROLE, WITHDRAW_ROLE

**Functions**:

- `depositLiquidity(amount)` - Add funds (LIQUIDITY_MANAGER_ROLE)
- `withdrawLiquidity(amount, recipient)` - Withdraw funds (WITHDRAW_ROLE)
- `adminWithdraw(amount)` - Emergency withdrawal (DEFAULT_ADMIN_ROLE)
- `getBalance()` - Current vault balance (view)

#### **DepositCertificate.sol**

- **Responsibility**: ERC721 NFT management
- **Size**: < 9 KiB
- **Standard**: ERC721 + ERC721Enumerable
- **Security**: 24-hour transfer cooldown

**Functions**:

- `mintCertificate(to, depositId)` → tokenId (MINTER_ROLE)
- `burnCertificate(depositId)` - Destroy certificate (MINTER_ROLE)
- `exists(depositId)` → bool (view)
- `isInCooldown(tokenId)` → bool (view)
- `getRemainingCooldown(tokenId)` → uint256 (view)

#### **InterestCalculator.sol**

- **Responsibility**: Pure mathematical calculations
- **Type**: Library (not deployed as standalone)
- **Functions**: All `internal pure`

**Functions**:

- `calculateSimpleInterest(principal, rate, termDays)` → interest
- `calculatePenalty(principal, penaltyRate)` → penalty
- `calculateMaturityAmount(principal, rate, termDays)` → maturityAmount

### 2.5 Testing Requirements

#### **Test Coverage: 155 Total Tests**

| Category              | File Count | Test Count | Status          |
| --------------------- | ---------- | ---------- | --------------- |
| **Business Tests**    | 6 files    | 60+ tests  | ✅ PASSING      |
| **Unit Tests**        | 7 files    | 76 tests   | ✅ PASSING      |
| **Integration Tests** | 1 file     | 15 tests   | ✅ PASSING      |
| **TOTAL**             | 14 files   | 155 tests  | ✅ 100% PASSING |

#### **Test Scenarios Required**

- ✅ Plan creation with valid parameters
- ✅ Plan creation with invalid parameters (revert)
- ✅ Deposit creation within plan limits
- ✅ Deposit creation outside plan limits (revert)
- ✅ Interest calculation accuracy (formula verification)
- ✅ Withdrawal at maturity (principal + interest)
- ✅ Early withdrawal (principal - penalty)
- ✅ Early withdrawal penalty routing
- ✅ Deposit renewal with compound interest
- ✅ NFT certificate ownership validation
- ✅ NFT transfer cooldown enforcement
- ✅ Vault liquidity checks
- ✅ Role-based access control
- ✅ Emergency pause/unpause
- ✅ Token transfer safety (SafeERC20)

#### **Gas Performance Targets**

All functions must remain < 500,000 gas:

| Function             | Typical Gas | Limit      |
| -------------------- | ----------- | ---------- |
| `createDeposit()`    | ~200,000    | 500,000 ✅ |
| `withdrawDeposit()`  | ~180,000    | 500,000 ✅ |
| `renewDeposit()`     | ~250,000    | 500,000 ✅ |
| `createSavingPlan()` | ~150,000    | 500,000 ✅ |

### 2.6 Documentation Requirements

- ✅ **NatSpec Comments**: All public functions documented
- ✅ **Function Parameters**: Each parameter explained
- ✅ **Return Values**: All return types documented
- ✅ **Event Documentation**: All events explained
- ✅ **Error Documentation**: All custom errors explained
- ✅ **Requirement Comments**: Complex logic explained

### 2.7 Deployment Requirements

#### **Contracts to Deploy** (5 stages)

1. MockUSDC (test token)
2. DepositCertificate (NFT)
3. Vault (liquidity manager)
4. SavingBank (main contract)
5. Setup admin roles & multisig transfer

#### **Role Setup** (Required after deployment)

- Grant `LIQUIDITY_MANAGER_ROLE` to SavingBank on Vault
- Grant `WITHDRAW_ROLE` to SavingBank on Vault
- Grant `MINTER_ROLE` to SavingBank on DepositCertificate
- Transfer `DEFAULT_ADMIN_ROLE` to Gnosis Safe multisig
- Revoke `DEFAULT_ADMIN_ROLE` from deployer

#### **Verification** (Required before production)

- All contracts verified on Etherscan
- All tests passing (155/155)
- Contract sizes < 24 KB each
- Gas usage within limits
- All roles properly assigned
- Multisig setup verified

---

## 3. ACCEPTANCE CRITERIA

### 3.1 Functional Acceptance

| Feature                | Requirement                           | Status      |
| ---------------------- | ------------------------------------- | ----------- |
| Saving Plans           | Create, read, update, deactivate      | ✅ COMPLETE |
| User Deposits          | Create with validation, earn interest | ✅ COMPLETE |
| Withdrawal at Maturity | Principal + interest                  | ✅ COMPLETE |
| Early Withdrawal       | Principal - penalty                   | ✅ COMPLETE |
| Deposit Renewal        | Compound interest support             | ✅ COMPLETE |
| NFT Certificates       | ERC721 with ownership validation      | ✅ COMPLETE |
| 24-Hour Cooldown       | Transfer security mechanism           | ✅ COMPLETE |
| Vault Liquidity        | Admin deposit/withdraw management     | ✅ COMPLETE |
| Emergency Pause        | Stop user operations                  | ✅ COMPLETE |
| Role-Based Access      | Multisig admin control                | ✅ COMPLETE |

### 3.2 Technical Acceptance

| Criterion      | Requirement                         | Status      |
| -------------- | ----------------------------------- | ----------- |
| Test Coverage  | 155/155 tests passing               | ✅ COMPLETE |
| Internal Audit | Passed (30/01/2026)                 | ✅ COMPLETE |
| Code Quality   | SOLID principles + clean code       | ✅ COMPLETE |
| Security       | Reentrancy, pausable, role-based    | ✅ COMPLETE |
| Documentation  | All contracts fully documented      | ✅ COMPLETE |
| Deployment     | 5-stage scripts working             | ✅ COMPLETE |
| Verification   | All contracts verified on Etherscan | ✅ COMPLETE |
| Multisig Setup | Gnosis Safe with 3 signers          | ✅ COMPLETE |

### 3.3 Production Readiness

- ✅ All 4 contracts deployed to Sepolia testnet
- ✅ All contracts verified on Etherscan
- ✅ Manual scripts for all operations available
- ✅ Multisig admin configured and tested
- ✅ Emergency procedures documented
- ✅ Complete documentation (README, ARCHITECTURE, DEMO)
- 🔜 External security audit (Phase 1)
- 🔜 Frontend development (Phase 2)

---

## 4. DEFINITIONS & GLOSSARY

| Term                  | Definition                                          |
| --------------------- | --------------------------------------------------- |
| **APY**               | Annual Percentage Yield (basis points × 100)        |
| **Basis Points**      | 1/100th of a percent (10,000 bps = 100%)            |
| **Maturity**          | When deposit term expires and becomes withdrawable  |
| **Compound Interest** | Interest added to principal for next term           |
| **NFT Certificate**   | ERC721 token representing deposit ownership         |
| **Cooldown Period**   | 24-hour lockout after NFT transfer                  |
| **Penalty**           | Amount deducted from principal for early withdrawal |
| **Vault**             | Smart contract holding all user deposits            |
| **Multisig**          | Multi-signature wallet requiring multiple approvals |
| **Paused**            | System state where user operations are blocked      |

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Status**: PRODUCTION READY - TESTNET SCOPE
