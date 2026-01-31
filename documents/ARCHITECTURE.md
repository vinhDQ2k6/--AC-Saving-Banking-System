# 🏗️ ARCHITECTURE.md - System Design & Data Flows

**Status**: 🎉 **PRODUCTION READY (Sepolia Testnet Deployed)**  
**Last Updated**: January 31, 2026  
**Version**: 1.0

This document describes the complete system architecture, component interactions, data structures, and access control mechanisms for the AC Saving Banking smart contract platform.

---

## 1. HIGH-LEVEL ARCHITECTURE

### 1.1 System Overview

The AC Saving Banking system is built on a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     END USERS                               │
│  (Depositors, NFT holders, Renewal participants)            │
└────────────────────┬────────────────────────────────────────┘
                     │ User Transactions
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                   SavingBank.sol                             │
│  (Core Business Logic)                                       │
│  ├─ Saving Plan Management (create, update, deactivate)      │
│  ├─ Deposit Operations (create, withdraw, renew)             │
│  ├─ Interest Calculations                                    │
│  ├─ Emergency Pause/Unpause                                  │
│  └─ Admin Functions (role-protected)                         │
└────┬────────────────────┬──────────────────┬─────────────────┘
     │                    │                  │
     ▼                    ▼                  ▼
┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐
│ Vault.sol    │  │ DepositCert.sol │  │ MockUSDC.sol     │
│ (Liquidity)  │  │ (ERC721 NFTs)   │  │ (Test Token)     │
│              │  │                 │  │                  │
│ Stores USDC  │  │ Mints/Burns     │  │ ERC20 Token      │
│ Manages      │  │ Certificates    │  │ 6 decimals       │
│ Withdrawals  │  │ Transfer        │  │                  │
│              │  │ Cooldown (24h)  │  │                  │
└──────────────┘  └─────────────────┘  └──────────────────┘
        ▲                                      ▲
        └──────────────┬───────────────────────┘
                       │
            Dependency Injection Pattern
            (Via constructor)
```

### 1.2 Contract Responsibilities

| Contract               | Responsibility                      | Role       |
| ---------------------- | ----------------------------------- | ---------- |
| **SavingBank**         | Business logic orchestration        | Core       |
| **Vault**              | Liquidity management & fund storage | Supporting |
| **DepositCertificate** | NFT ownership & withdrawal rights   | Supporting |
| **MockUSDC**           | Token for deposits (testnet only)   | Supporting |
| **InterestCalculator** | Pure mathematical calculations      | Library    |

### 1.3 Architectural Patterns

#### **Separation of Concerns**

- Business logic isolated from liquidity management
- NFT management separated from financial operations
- Math functions isolated in pure library

#### **Dependency Injection**

- SavingBank receives Vault, DepositCertificate, and MockUSDC addresses via constructor
- Allows flexible configuration without code changes
- Supports contract upgrades by deploying new dependencies

#### **Role-Based Access Control**

- Multiple roles with granular permissions
- Roles assigned via OpenZeppelin AccessControl
- Multisig controls all admin operations

#### **Reentrancy Protection**

- All state-changing functions use `nonReentrant` modifier
- Prevents recursive attacks on vulnerable operations
- Applied to: createDeposit, withdrawDeposit, renewDeposit

---

## 2. COMPONENT DETAILS

### 2.1 SavingBank.sol - Core Business Logic

**Purpose**: Orchestrate all business operations while maintaining clean separation

**Key Responsibilities**:

1. Manage saving plans (CRUD operations)
2. Process user deposits with validation
3. Handle withdrawals (maturity & early)
4. Support deposit renewals with compound interest
5. Control system pause/unpause
6. Manage vault liquidity

**State Variables**:

```solidity
// Token references (immutable - injected via constructor)
IERC20 public immutable depositToken;           // MockUSDC
IDepositCertificate public immutable depositCertificate;  // NFT
IVault public immutable vault;                  // Liquidity manager

// Counters for unique IDs
uint256 private _nextPlanId;                    // Starts at 1
uint256 private _nextDepositId;                 // Starts at 1

// Storage mappings
mapping(uint256 => SavingPlan) private savingPlans;
mapping(uint256 => Deposit) private deposits;
mapping(address => uint256[]) private userDepositIds;
mapping(uint256 => address) private planPenaltyReceivers;
```

**Key Functions** (Detailed in Contracts section):

- Admin: `createSavingPlan()`, `updateSavingPlan()`, `depositToVault()`, `pause()`
- User: `createDeposit()`, `withdrawDeposit()`, `renewDeposit()`
- View: `getSavingPlan()`, `getDeposit()`, `calculateExpectedInterest()`

### 2.2 Vault.sol - Liquidity Management

**Purpose**: Safely store and manage token liquidity for interest payments

**Key Responsibilities**:

1. Store user deposits (USDC tokens)
2. Track available balance for interest payments
3. Allow only authorized contracts to withdraw funds
4. Provide emergency admin withdrawal
5. Manage role-based access to operations

**State Variables**:

```solidity
IERC20 public immutable token;                  // ERC20 token (USDC)
uint256 private _balance;                       // Internal balance tracking

// Roles for fine-grained access control
bytes32 public constant LIQUIDITY_MANAGER_ROLE = keccak256("LIQUIDITY_MANAGER_ROLE");
bytes32 public constant WITHDRAW_ROLE = keccak256("WITHDRAW_ROLE");
```

**Key Functions**:

- `depositLiquidity(amount)` - Add funds to vault (LIQUIDITY_MANAGER_ROLE)
- `withdrawLiquidity(amount, recipient)` - Withdraw for interest payments (WITHDRAW_ROLE)
- `adminWithdraw(amount)` - Emergency withdrawal (DEFAULT_ADMIN_ROLE)
- `getBalance()` - View current balance

**Security Features**:

- All transfers use SafeERC20
- Role-based access on all state-changing functions
- Balance tracking prevents overdrawing
- Reentrancy protection via OpenZeppelin

### 2.3 DepositCertificate.sol - NFT Certificates

**Purpose**: Issue ERC721 NFTs representing deposit ownership with security features

**Key Responsibilities**:

1. Mint unique NFT for each deposit
2. Track NFT ownership as withdrawal rights
3. Enforce 24-hour transfer cooldown for security
4. Burn NFTs when deposits are withdrawn
5. Support standard ERC721 operations

**State Variables**:

```solidity
// ERC721 token tracking (inherited from ERC721, ERC721Enumerable)
// Each tokenId = depositId

// Security: 24-hour transfer cooldown
uint256 public constant TRANSFER_COOLDOWN = 24 hours;
mapping(uint256 => uint256) private _lastTransferTime;

// Role for minting
bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
```

**Key Functions**:

- `mintCertificate(to, depositId)` → tokenId - Create NFT (MINTER_ROLE)
- `burnCertificate(depositId)` - Destroy NFT (MINTER_ROLE)
- `exists(depositId)` - Check if NFT exists
- `isInCooldown(tokenId)` - Check transfer cooldown status
- `getRemainingCooldown(tokenId)` - Get seconds until cooldown ends

**Security Features**:

- 24-hour transfer cooldown after NFT transfer
- Only MINTER_ROLE can mint/burn (SavingBank only)
- Transfer events tracked for security
- Enumerable support for user portfolio queries

### 2.4 InterestCalculator.sol - Pure Math

**Purpose**: Provide calculation functions with transparent formulas

**Key Functions** (all `internal pure`):

- `calculateSimpleInterest(principal, rate, termDays)` → interest
- `calculatePenalty(principal, penaltyRate)` → penalty
- `calculateMaturityAmount(principal, rate, termDays)` → total

**Formula Details**:

$$Interest = \left\lfloor\frac{Principal \times APR_{Bps} \times Term_{Days}}{10000 \times 365}\right\rfloor$$

**Constants**:

```solidity
uint256 public constant BASIS_POINTS = 10_000;      // 1% = 100 bps
uint256 public constant DAYS_PER_YEAR = 365;        // Non-leap year
```

**Example Calculation**:

```
Principal: 1,000,000,000 units (1,000 USDC at 6 decimals)
APY: 800 basis points (8%)
Term: 90 days

Interest = (1,000,000,000 × 800 × 90) / (10,000 × 365)
         = 72,000,000,000,000 / 3,650,000
         = 19,726,027 units (~19.73 USDC)

Result: User receives 1,019,726,027 units at maturity
```

---

## 3. DATA STRUCTURES & FLOWS

### 3.1 Complete Deposit Lifecycle

#### **State 1: Plan Creation**

```
Admin → createSavingPlan(SavingPlanInput)
  ├─ Validate: minTerm > 0, maxTerm > minTerm, APY > 0
  ├─ Validate: penalty ≤ 10000 (100%)
  ├─ Assign: planId = _nextPlanId++
  ├─ Store: savingPlans[planId] = SavingPlan {
  │    id, name, minDepositAmount, maxDepositAmount,
  │    minTermInDays, maxTermInDays,
  │    annualInterestRateInBasisPoints,
  │    penaltyRateInBasisPoints, isActive=true
  │ }
  ├─ Emit: SavingPlanCreated(planId, name)
  └─ Return: (void)
```

#### **State 2: User Creates Deposit**

```
User → createDeposit(planId, amount, termInDays)
  │
  ├─ [VALIDATION PHASE]
  │  ├─ Verify: Plan exists and is active
  │  ├─ Verify: amount ≥ minDeposit AND amount ≤ maxDeposit
  │  ├─ Verify: termInDays ≥ minTerm AND termInDays ≤ maxTerm
  │  └─ Revert if any validation fails
  │
  ├─ [CALCULATION PHASE]
  │  ├─ Calculate: maturityDate = block.timestamp + (termInDays × 1 day)
  │  ├─ Calculate: expectedInterest using InterestCalculator
  │  │   = floor((amount × APY × termInDays) / (10000 × 365))
  │  └─ Assign: depositId = _nextDepositId++
  │
  ├─ [STORAGE PHASE]
  │  ├─ Store: deposits[depositId] = Deposit {
  │  │    id: depositId,
  │  │    user: msg.sender,
  │  │    savingPlanId: planId,
  │  │    amount: amount,
  │  │    termInDays: termInDays,
  │  │    expectedInterest: expectedInterest,
  │  │    depositDate: block.timestamp,
  │  │    maturityDate: maturityDate,
  │  │    status: Active
  │  │ }
  │  ├─ Store: userDepositIds[msg.sender].push(depositId)
  │  └─ Vault now tracks: total deposits
  │
  ├─ [TOKEN TRANSFER PHASE]
  │  ├─ Transfer: amount USDC from User to SavingBank
  │  ├─ Approve: amount USDC to Vault
  │  └─ Vault.depositLiquidity(amount)
  │     └─ Vault._balance += amount
  │
  ├─ [NFT MINTING PHASE]
  │  ├─ DepositCertificate.mintCertificate(msg.sender, depositId)
  │  │  ├─ _safeMint(msg.sender, depositId)  // tokenId = depositId
  │  │  ├─ _lastTransferTime[depositId] = block.timestamp
  │  │  └─ Emit: Transfer(address(0), msg.sender, depositId)
  │  └─ Return: tokenId
  │
  ├─ [EMIT EVENT]
  │  └─ DepositCreated(depositId, msg.sender, planId, amount,
  │                     termInDays, maturityDate, certificateId)
  │
  └─ Return: depositId

KEY INVARIANT:
  - After creation: Vault._balance ≥ sum(all active deposits)
  - NFT owner = current withdrawal rights holder
  - Original depositor = msg.sender (but not withdrawal rights after NFT transfer)
```

#### **State 3a: Withdrawal at Maturity**

```
NFT Owner → withdrawDeposit(depositId)  [where: now ≥ maturityDate]
  │
  ├─ [PRE-FLIGHT CHECKS]
  │  ├─ Verify: Deposit exists (deposit.id ≠ 0)
  │  ├─ Verify: Caller owns NFT (depositCertificate.ownerOf(depositId) == msg.sender)
  │  ├─ Verify: Not in cooldown (isInCooldown check passes)
  │  ├─ Verify: Deposit is Active status
  │  └─ Revert if any check fails
  │
  ├─ [MATURITY DETECTION]
  │  ├─ isEarlyWithdrawal = block.timestamp < deposit.maturityDate
  │  └─ Result: FALSE (we're at maturity)
  │
  ├─ [CALCULATION PHASE]
  │  ├─ interestAmount = deposit.expectedInterest
  │  ├─ withdrawAmount = deposit.amount + interestAmount
  │  └─ penaltyAmount = 0
  │
  ├─ [STATE UPDATE]
  │  ├─ Update: deposits[depositId].status = Withdrawn
  │  └─ Emit: DepositWithdrawn(depositId, msg.sender,
  │                             withdrawAmount, interestAmount, 0, false)
  │
  ├─ [VAULT WITHDRAWALS]
  │  ├─ vault.withdrawLiquidity(deposit.amount, SavingBank)
  │  │  └─ Vault._balance -= deposit.amount
  │  ├─ vault.withdrawLiquidity(interestAmount, SavingBank)
  │  │  └─ Vault._balance -= interestAmount
  │  └─ Check: Vault has sufficient balance (reverts if not)
  │
  ├─ [TOKEN TRANSFER]
  │  └─ Transfer: (principal + interest) USDC to msg.sender
  │
  ├─ [NFT BURN]
  │  ├─ depositCertificate.burnCertificate(depositId)
  │  │  ├─ _burn(depositId)
  │  │  └─ Emit: Transfer(msg.sender, address(0), depositId)
  │  └─ Result: NFT destroyed, certificate no longer exists
  │
  └─ Return: (void)

RESULTS:
  - User has: principal + interest USDC
  - Vault balance decreased by: principal + interest
  - Deposit status: Withdrawn
  - NFT: Burned (destroyed)
  - New state: Can create new deposit or continue with other deposits
```

#### **State 3b: Withdrawal Before Maturity (Early Withdrawal)**

```
NFT Owner → withdrawDeposit(depositId)  [where: now < maturityDate]
  │
  ├─ [PRE-FLIGHT CHECKS] (same as maturity)
  │  └─ All checks pass
  │
  ├─ [MATURITY DETECTION]
  │  ├─ isEarlyWithdrawal = block.timestamp < deposit.maturityDate
  │  └─ Result: TRUE (we're before maturity)
  │
  ├─ [CALCULATION PHASE]
  │  ├─ penaltyAmount = floor((deposit.amount × penaltyRate) / 10000)
  │  ├─ withdrawAmount = deposit.amount - penaltyAmount
  │  ├─ interestAmount = 0 (lost due to early withdrawal)
  │  └─ Example: $1000 - $50 penalty = $950 to user
  │
  ├─ [STATE UPDATE]
  │  ├─ Update: deposits[depositId].status = Withdrawn
  │  └─ Emit: DepositWithdrawn(depositId, msg.sender,
  │                             withdrawAmount, 0, penaltyAmount, true)
  │
  ├─ [PENALTY ROUTING]
  │  └─ IF penaltyReceiver is set:
  │     │  ├─ vault.withdrawLiquidity(deposit.amount, SavingBank)
  │     │  ├─ Transfer: withdrawAmount to msg.sender
  │     │  └─ Transfer: penaltyAmount to penaltyReceiver
  │     ELSE (penaltyReceiver is zero):
  │        └─ vault.withdrawLiquidity(withdrawAmount, SavingBank)
  │           └─ Penalty stays in Vault
  │
  ├─ [TOKEN TRANSFER]
  │  └─ Transfer: withdrawAmount to msg.sender
  │     └─ If penaltyReceiver set: also transfer penalty separately
  │
  ├─ [NFT BURN]
  │  └─ DepositCertificate.burnCertificate(depositId)
  │
  └─ Return: (void)

RESULTS:
  - User has: principal - penalty USDC
  - Vault balance decreased by: principal (interest remains in vault)
  - Penalty: Either sent to penaltyReceiver or remains in vault
  - Deposit status: Withdrawn
  - NFT: Burned
  - Loss: All expected interest forfeited
```

#### **State 4: Renewal (Compound Interest)**

```
NFT Owner → renewDeposit(depositId, newPlanId, newTermInDays)
          [where: block.timestamp ≥ deposit.maturityDate]
  │
  ├─ [PRE-FLIGHT CHECKS]
  │  ├─ Verify: Old deposit exists
  │  ├─ Verify: Caller owns NFT (NFT ownership check)
  │  ├─ Verify: Not in cooldown (isInCooldown passes)
  │  ├─ Verify: Old deposit is Active status
  │  └─ Verify: Now ≥ maturityDate (MUST be mature to renew)
  │
  ├─ [COMPOUND INTEREST CALCULATION]
  │  ├─ interest = deposits[depositId].expectedInterest
  │  ├─ newPrincipal = deposits[depositId].amount + interest
  │  └─ Example: $1000 + $19.73 = $1,019.73 new principal
  │
  ├─ [UPDATE OLD DEPOSIT]
  │  ├─ Update: deposits[depositId].status = Renewed
  │  └─ Note: Funds NOT withdrawn, just marked as Renewed
  │
  ├─ [NEW DEPOSIT SETUP]
  │  ├─ Validate: New plan exists and is active
  │  ├─ Validate: newPrincipal ≥ newPlan.minDeposit
  │  ├─ Validate: newPrincipal ≤ newPlan.maxDeposit (if set)
  │  ├─ Validate: newTermInDays ≥ newPlan.minTerm
  │  ├─ Validate: newTermInDays ≤ newPlan.maxTerm
  │  └─ Revert if any validation fails
  │
  ├─ [CREATE NEW DEPOSIT]
  │  ├─ Calculate: newMaturityDate = now + (newTermInDays × 1 day)
  │  ├─ Calculate: newExpectedInterest using InterestCalculator
  │  │   = floor((newPrincipal × newAPY × newTermInDays) / (10000 × 365))
  │  ├─ Assign: newDepositId = _nextDepositId++
  │  ├─ Store: deposits[newDepositId] = Deposit {
  │  │    id: newDepositId,
  │  │    user: certificateOwner,  // Current NFT holder, not original
  │  │    savingPlanId: newPlanId,
  │  │    amount: newPrincipal,
  │  │    termInDays: newTermInDays,
  │  │    expectedInterest: newExpectedInterest,
  │  │    depositDate: now,
  │  │    maturityDate: newMaturityDate,
  │  │    status: Active
  │  │ }
  │  └─ Store: userDepositIds[certificateOwner].push(newDepositId)
  │
  ├─ [NFT OPERATIONS]
  │  ├─ DepositCertificate.mintCertificate(certificateOwner, newDepositId)
  │  │  ├─ Mint new NFT for new deposit
  │  │  ├─ _lastTransferTime[newDepositId] = now
  │  │  └─ No cooldown yet (fresh transfer)
  │  └─ Note: Old NFT automatically tracked via old deposit
  │
  ├─ [EMIT EVENTS]
  │  ├─ DepositRenewed(oldDepositId, newDepositId, certificateOwner,
  │  │                  newPrincipal, newPlanId)
  │  └─ DepositCreated(newDepositId, certificateOwner, newPlanId,
  │                     newPrincipal, newTermInDays, newMaturityDate,
  │                     certificateId)
  │
  └─ Return: newDepositId

KEY INSIGHT - NO TOKEN MOVEMENT:
  ⚠️  During renewal, NO tokens are transferred!
  ⚠️  Old deposit remains in vault as-is
  ⚠️  New deposit REUSES same vault balance
  ⚠️  Interest is NOT paid out; it's just recalculated
  ⚠️  Vault balance unchanged; only accounting updated

RESULTS:
  - Old deposit: Marked as Renewed (immutable)
  - New deposit: Active with compound principal
  - Interest: Becomes part of new principal for next term
  - NFT: New certificate issued for new deposit
  - Vault: No balance change (funds stay locked)
  - User: Continues earning with larger principal
```

---

## 4. ACCESS CONTROL & PERMISSIONS

### 4.1 Role Hierarchy

```
┌─────────────────────────────────────────┐
│   DEFAULT_ADMIN_ROLE (Gnosis Safe)      │
│   - Grant/revoke ANY role               │
│   - Emergency contract management       │
└────────────────────┬────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌──────────┐
   │ADMIN    │  │PAUSER   │  │MGMT ROLE │
   │ROLE     │  │ROLE     │  │(FUTURE)  │
   └────┬────┘  └────┬────┘  └──────────┘
        │            │
   Plan Mgmt    Pause/Unpause
   Vault Ops         │
                     │
              Emergency Control
```

### 4.2 SavingBank Permissions Matrix

| Function                   | Role Required | Who Can Call                      |
| -------------------------- | ------------- | --------------------------------- |
| `createSavingPlan()`       | ADMIN_ROLE    | ✅ Multisig via SavingBank        |
| `updateSavingPlan()`       | ADMIN_ROLE    | ✅ Multisig via SavingBank        |
| `updateSavingPlanStatus()` | ADMIN_ROLE    | ✅ Multisig via SavingBank        |
| `updatePenaltyReceiver()`  | ADMIN_ROLE    | ✅ Multisig via SavingBank        |
| `activateSavingPlan()`     | ADMIN_ROLE    | ✅ Multisig via SavingBank        |
| `deactivateSavingPlan()`   | ADMIN_ROLE    | ✅ Multisig via SavingBank        |
| `depositToVault()`         | ADMIN_ROLE    | ✅ Multisig via SavingBank        |
| `withdrawFromVault()`      | ADMIN_ROLE    | ✅ Multisig via SavingBank        |
| `pause()`                  | PAUSER_ROLE   | ✅ Multisig (via proposal)        |
| `unpause()`                | PAUSER_ROLE   | ✅ Multisig (via proposal)        |
| `createDeposit()`          | None (open)   | ✅ Any user                       |
| `withdrawDeposit()`        | NFT owner     | ✅ Current NFT certificate holder |
| `renewDeposit()`           | NFT owner     | ✅ Current NFT certificate holder |
| View functions             | None          | ✅ Anyone (public view)           |

### 4.3 Vault Permissions Matrix

| Function              | Role Required          | Who Can Call            |
| --------------------- | ---------------------- | ----------------------- |
| `depositLiquidity()`  | LIQUIDITY_MANAGER_ROLE | ✅ SavingBank only      |
| `withdrawLiquidity()` | WITHDRAW_ROLE          | ✅ SavingBank only      |
| `adminWithdraw()`     | DEFAULT_ADMIN_ROLE     | ✅ Multisig only        |
| `getBalance()`        | None                   | ✅ Anyone (public view) |

### 4.4 DepositCertificate Permissions Matrix

| Function              | Role Required | Who Can Call                      |
| --------------------- | ------------- | --------------------------------- |
| `mintCertificate()`   | MINTER_ROLE   | ✅ SavingBank only                |
| `burnCertificate()`   | MINTER_ROLE   | ✅ SavingBank only                |
| `exists()`            | None          | ✅ Anyone (public view)           |
| `transfer()` (ERC721) | NFT owner     | ✅ Any holder (with 24h cooldown) |
| `isInCooldown()`      | None          | ✅ Anyone (public view)           |

---

## 5. SECURITY ARCHITECTURE

### 5.1 Protection Layers

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Input Validation                           │
│ - Check all parameters before processing            │
│ - Revert on invalid amounts, addresses, terms       │
└─────────────────────────────────────────────────────┘
           ▼
┌─────────────────────────────────────────────────────┐
│ Layer 2: State Validation                           │
│ - Verify plan exists and is active                  │
│ - Check deposit status (Active/Withdrawn/Renewed)   │
│ - Verify NFT ownership                              │
└─────────────────────────────────────────────────────┘
           ▼
┌─────────────────────────────────────────────────────┐
│ Layer 3: Access Control                             │
│ - Role-based permission checks (OpenZeppelin)       │
│ - NFT ownership verification                        │
│ - Pause state checks                                │
└─────────────────────────────────────────────────────┘
           ▼
┌─────────────────────────────────────────────────────┐
│ Layer 4: Reentrancy Protection                      │
│ - nonReentrant modifier on token transfer functions │
│ - Prevents recursive attacks                        │
└─────────────────────────────────────────────────────┘
           ▼
┌─────────────────────────────────────────────────────┐
│ Layer 5: Safe Token Operations                      │
│ - SafeERC20 for all token transfers                 │
│ - Handles non-standard ERC20 implementations        │
└─────────────────────────────────────────────────────┘
           ▼
┌─────────────────────────────────────────────────────┐
│ Layer 6: Emission Safety                            │
│ - Events emitted AFTER state changes                │
│ - Accurate event data for indexing                  │
└─────────────────────────────────────────────────────┘
```

### 5.2 NFT Transfer Cooldown Security

**Problem Solved**: Instant NFT transfer → immediate withdrawal attack

**Solution**: 24-hour cooldown enforced

```
Timeline:
  Time T0: User A has NFT, wants to withdraw
  Time T0: User A transfers NFT to User B (attacker)
  Time T0: User B tries withdrawDeposit()

  Block 1: Transfer happens, _lastTransferTime[depositId] = T0
  Block 2: withdrawDeposit() called
           ├─ Check: isInCooldown(depositId)
           ├─ Calculate: remainingCooldown = T0 + 24h - now
           ├─ Result: Still in cooldown!
           └─ Revert: CertificateInCooldown

  Time T0 + 24h: Cooldown period expires
  Time T0 + 24h: User B can now withdraw normally
```

**Implementation**:

```solidity
function isInCooldown(uint256 tokenId) external view returns (bool) {
    return (block.timestamp < _lastTransferTime[tokenId] + TRANSFER_COOLDOWN);
}

function withdrawDeposit(uint256 depositId) external {
    if (depositCertificate.isInCooldown(depositId)) {
        uint256 remaining = depositCertificate.getRemainingCooldown(depositId);
        revert CertificateInCooldown(depositId, remaining);
    }
    // ... proceed with withdrawal
}
```

---

## 6. EVENT EMISSIONS

All state-changing operations emit events for indexing and UI updates:

### 6.1 Plan Events

```solidity
event SavingPlanCreated(uint256 indexed planId, string name);
event SavingPlanUpdated(uint256 indexed planId);
event SavingPlanActivated(uint256 indexed planId);
event SavingPlanDeactivated(uint256 indexed planId);
event SavingPlanStatusUpdated(uint256 indexed planId, bool isEnabled);
event PenaltyReceiverUpdated(uint256 indexed planId, address indexed oldReceiver, address indexed newReceiver);
```

### 6.2 Deposit Events

```solidity
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
```

### 6.3 Liquidity Events

```solidity
event LiquidityDeposited(address indexed admin, uint256 amount);
event LiquidityWithdrawn(address indexed admin, uint256 amount);
```

---

## 7. ERROR HANDLING

### 7.1 Custom Errors (Gas-Efficient)

All errors defined as custom error types:

```solidity
// Plan errors
error SavingPlanNotFound(uint256 planId);
error SavingPlanNotActive(uint256 planId);
error InvalidTermDays(uint32 termInDays);
error InvalidInterestRate(uint256 annualInterestRateInBasisPoints);
error InvalidPenaltyRate(uint256 penaltyRateInBasisPoints);

// Deposit errors
error DepositNotFound(uint256 depositId);
error DepositNotActive(uint256 depositId);
error DepositAlreadyClosed(uint256 depositId);
error DepositNotMature(uint256 depositId, uint256 maturityTimestamp, uint256 currentTimestamp);

// Amount errors
error InvalidAmount(uint256 amount);
error InsufficientDepositAmount(uint256 amount, uint256 minimumRequired);
error ExcessiveDepositAmount(uint256 amount, uint256 maximumAllowed);
error InsufficientVaultLiquidity(uint256 requested, uint256 available);

// Access errors
error UnauthorizedWithdrawal(address caller, uint256 depositId);
error InvalidAddress();

// NFT security errors
error CertificateInCooldown(uint256 depositId, uint256 remainingSeconds);
```

### 7.2 Error Handling Strategy

All functions use guard clauses for early validation:

```solidity
function withdrawDeposit(uint256 depositId) external {
    // Early validation - guard clauses
    if (deposit.id == 0) revert DepositNotFound(depositId);
    if (deposit.status != Active) revert DepositNotActive(depositId);
    if (certificateOwner != msg.sender) revert UnauthorizedWithdrawal(msg.sender, depositId);
    if (depositCertificate.isInCooldown(depositId))
        revert CertificateInCooldown(depositId, getRemainingCooldown());

    // Safe to proceed with withdrawal logic
    // ...
}
```

---

## 8. DEPLOYMENT ARCHITECTURE

### 8.1 Deployment Order

```
Stage 1: Deploy MockUSDC
         └─ Creates test token (6 decimals)

Stage 2: Deploy DepositCertificate
         └─ Creates NFT contract (no dependencies)

Stage 3: Deploy Vault
         ├─ Dependency: MockUSDC address
         └─ Stores USDC tokens

Stage 4: Deploy SavingBank
         ├─ Dependency: MockUSDC address
         ├─ Dependency: DepositCertificate address
         ├─ Dependency: Vault address
         ├─ Constructor: (mockUsdcAddr, certAddr, vaultAddr)
         └─ Grants ADMIN_ROLE to deployer

Stage 5: Setup Admin Security
         ├─ Grant LIQUIDITY_MANAGER_ROLE to SavingBank on Vault
         ├─ Grant WITHDRAW_ROLE to SavingBank on Vault
         ├─ Grant MINTER_ROLE to SavingBank on DepositCertificate
         ├─ Transfer DEFAULT_ADMIN_ROLE to Gnosis Safe multisig
         └─ Revoke DEFAULT_ADMIN_ROLE from deployer
```

### 8.2 Role Assignment Flow

```
After Deployment:
  Deployer holds: DEFAULT_ADMIN_ROLE + ADMIN_ROLE (on SavingBank)

Setup Process:
  1. SavingBank grants LIQUIDITY_MANAGER_ROLE to itself on Vault
  2. Vault grants WITHDRAW_ROLE to SavingBank
  3. DepositCertificate grants MINTER_ROLE to SavingBank
  4. SavingBank transfers DEFAULT_ADMIN_ROLE to Multisig Safe
  5. Deployer revokes DEFAULT_ADMIN_ROLE from self

Final State:
  Multisig Safe: DEFAULT_ADMIN_ROLE (all contracts)
  SavingBank: All MANAGER roles on dependencies
  Deployer: No admin roles (fully revoked)
```

---

## 9. SYSTEM CONSTRAINTS & LIMITS

| Constraint        | Value            | Rationale                            |
| ----------------- | ---------------- | ------------------------------------ |
| **Contract Size** | < 24 KB          | Ethereum deployment limit            |
| **Max Plans**     | Unlimited        | Handled by \_nextPlanId counter      |
| **Max Deposits**  | 2^256 - 1        | Handled by \_nextDepositId counter   |
| **Min Deposit**   | Per plan         | Configurable by admin                |
| **Max Deposit**   | Per plan         | Configurable by admin (0 = no limit) |
| **Min Term**      | 1 day            | Per plan minimum                     |
| **Max Term**      | 2^32 - 1 seconds | Max uint32 value                     |
| **APY Range**     | 0 - 10000 bps    | 0% - 100% (in basis points)          |
| **Penalty Range** | 0 - 10000 bps    | 0% - 100% (in basis points)          |
| **NFT Cooldown**  | 24 hours         | Fixed security parameter             |
| **Gas Limit**     | < 500k/function  | Per operational function             |

---

## 10. FUTURE EXTENSIBILITY

### 10.1 Current Limitations

- Single token support (USDC only)
- Simple interest (no compounding during term)
- No automated renewals
- No dynamic rate adjustments
- No yield farming integration

### 10.2 Extension Points

- **New Token Support**: Deploy new Vault for different tokens
- **Advanced Interest**: Create new InterestCalculator variant
- **Automation**: Implement Chainlink keepers for auto-renewal
- **Governance**: Add DAO voting for plan parameters
- **Derivatives**: Create yield tokens backed by deposits

---

**Document Version**: 1.0  
**Last Updated**: January 31, 2026  
**Status**: PRODUCTION READY (Testnet)
