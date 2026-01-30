// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ISavingBankStructs.sol";
import "./interfaces/ISavingBankErrors.sol";
import "./interfaces/ISavingBankEvents.sol";
import "./interfaces/ISavingBankAdmin.sol";
import "./interfaces/ISavingBankUser.sol";
import "./interfaces/ISavingBankView.sol";
import "./interfaces/IDepositCertificate.sol";
import "./interfaces/IVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./libraries/InterestCalculator.sol";

/**
 * @title SavingBank
 * @author Saving Banking Team
 * @notice Core contract for on-chain savings bank operations with fixed-term deposits
 * @dev Implements role-based access control, pausability, and reentrancy protection
 * 
 * Features:
 * - Create and manage saving plans with configurable interest rates and terms
 * - Allow users to open fixed-term deposits and earn interest
 * - Support early withdrawal with configurable penalties
 * - Enable deposit renewal with compound interest (principal + interest)
 * - Mint NFT certificates for each deposit as proof of ownership
 * 
 * Security:
 * - Uses OpenZeppelin's AccessControl for role management
 * - Implements ReentrancyGuard on all state-changing functions
 * - Supports emergency pause functionality
 * - Separates liquidity management via external Vault contract
 */
contract SavingBank is AccessControl, Pausable, ReentrancyGuard, 
    ISavingBankAdmin, ISavingBankUser, ISavingBankView, ISavingBankErrors, ISavingBankEvents {
    using SafeERC20 for IERC20;
    using InterestCalculator for uint256;

    /// @notice Role identifier for administrative operations (plan management, vault operations)
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    /// @notice Role identifier for emergency pause/unpause operations
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice The ERC20 token used for deposits (e.g., USDC)
    IERC20 public immutable depositToken;
    
    /// @notice The ERC721 contract for minting deposit certificates
    IDepositCertificate public immutable depositCertificate;
    
    /// @notice The vault contract managing liquidity for interest payments
    IVault public immutable vault;

    /// @dev Counter for generating unique plan IDs (starts at 1)
    uint256 private _nextPlanId;
    
    /// @dev Counter for generating unique deposit IDs (starts at 1)
    uint256 private _nextDepositId;

    /// @dev Mapping from plan ID to SavingPlan struct
    mapping(uint256 => ISavingBankStructs.SavingPlan) private savingPlans;
    
    /// @dev Mapping from deposit ID to Deposit struct
    mapping(uint256 => ISavingBankStructs.Deposit) private deposits;
    
    /// @dev Mapping from user address to array of their deposit IDs
    mapping(address => uint256[]) private userDepositIds;
    
    /// @dev Mapping from plan ID to penalty receiver address
    mapping(uint256 => address) private planPenaltyReceivers;

    /**
     * @notice Initializes the SavingBank contract with required dependencies
     * @dev Grants DEFAULT_ADMIN_ROLE and ADMIN_ROLE to the deployer
     * @param tokenAddress Address of the ERC20 token for deposits (e.g., USDC)
     * @param certificateAddress Address of the DepositCertificate NFT contract
     * @param vaultAddress Address of the Vault contract for liquidity management
     */
    constructor(address tokenAddress, address certificateAddress, address vaultAddress) {
        if (tokenAddress == address(0) || certificateAddress == address(0) || vaultAddress == address(0)) {
            revert InvalidAddress();
        }
        
        depositToken = IERC20(tokenAddress);
        depositCertificate = IDepositCertificate(certificateAddress);
        vault = IVault(vaultAddress);
        _nextPlanId = 1;
        _nextDepositId = 1;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS - Plan Management
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Creates a new saving plan with specified parameters
     * @dev Only callable by ADMIN_ROLE. Emits SavingPlanCreated event on success.
     * @param input The saving plan configuration parameters
     * 
     * Requirements:
     * - minTermInDays must be greater than 0
     * - maxTermInDays must be greater than minTermInDays
     * - annualInterestRateInBasisPoints must be greater than 0
     * - penaltyRateInBasisPoints must not exceed 10000 (100%)
     */
    function createSavingPlan(ISavingBankStructs.SavingPlanInput calldata input) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenNotPaused 
    {
        if (input.minTermInDays == 0) revert InvalidTermDays(input.minTermInDays);
        if (input.maxTermInDays <= input.minTermInDays) revert InvalidTermDays(input.maxTermInDays);
        if (input.annualInterestRateInBasisPoints == 0) revert InvalidInterestRate(input.annualInterestRateInBasisPoints);
        if (input.penaltyRateInBasisPoints > 10000) revert InvalidPenaltyRate(input.penaltyRateInBasisPoints);

        uint256 planId = _nextPlanId++;
        
        savingPlans[planId] = ISavingBankStructs.SavingPlan({
            id: planId,
            name: input.name,
            minDepositAmount: input.minDepositAmount,
            maxDepositAmount: input.maxDepositAmount,
            minTermInDays: input.minTermInDays,
            maxTermInDays: input.maxTermInDays,
            annualInterestRateInBasisPoints: input.annualInterestRateInBasisPoints,
            penaltyRateInBasisPoints: input.penaltyRateInBasisPoints,
            isActive: true
        });

        emit SavingPlanCreated(planId, input.name);
    }

    /**
     * @notice Updates an existing saving plan's parameters
     * @dev Only callable by ADMIN_ROLE. Does not affect existing deposits.
     * @param planId The ID of the saving plan to update
     * @param input The new saving plan configuration parameters
     * 
     * Requirements:
     * - Plan must exist
     * - Same validation rules as createSavingPlan
     */
    function updateSavingPlan(uint256 planId, ISavingBankStructs.SavingPlanInput calldata input) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenNotPaused 
    {
        if (savingPlans[planId].id == 0) revert SavingPlanNotFound(planId);
        if (input.minTermInDays == 0) revert InvalidTermDays(input.minTermInDays);
        if (input.maxTermInDays <= input.minTermInDays) revert InvalidTermDays(input.maxTermInDays);
        if (input.annualInterestRateInBasisPoints == 0) revert InvalidInterestRate(input.annualInterestRateInBasisPoints);
        if (input.penaltyRateInBasisPoints > 10000) revert InvalidPenaltyRate(input.penaltyRateInBasisPoints);

        savingPlans[planId].name = input.name;
        savingPlans[planId].minDepositAmount = input.minDepositAmount;
        savingPlans[planId].maxDepositAmount = input.maxDepositAmount;
        savingPlans[planId].minTermInDays = input.minTermInDays;
        savingPlans[planId].maxTermInDays = input.maxTermInDays;
        savingPlans[planId].annualInterestRateInBasisPoints = input.annualInterestRateInBasisPoints;
        savingPlans[planId].penaltyRateInBasisPoints = input.penaltyRateInBasisPoints;

        emit SavingPlanUpdated(planId);
    }

    /**
     * @notice Updates the active status of a saving plan
     * @dev Only callable by ADMIN_ROLE. Inactive plans cannot accept new deposits.
     * @param planId The ID of the saving plan to update
     * @param isEnabled True to activate, false to deactivate the plan
     */
    function updateSavingPlanStatus(uint256 planId, bool isEnabled) external onlyRole(ADMIN_ROLE) {
        if (savingPlans[planId].id == 0) revert SavingPlanNotFound(planId);
        savingPlans[planId].isActive = isEnabled;
        
        emit SavingPlanStatusUpdated(planId, isEnabled);
        if (isEnabled) {
            emit SavingPlanActivated(planId);
        } else {
            emit SavingPlanDeactivated(planId);
        }
    }

    /**
     * @notice Sets the address that receives early withdrawal penalties for a plan
     * @dev If not set (zero address), penalties remain in the vault
     * @param planId The ID of the saving plan
     * @param newReceiver The address to receive penalty amounts
     */
    function updatePenaltyReceiver(uint256 planId, address newReceiver) external onlyRole(ADMIN_ROLE) {
        if (savingPlans[planId].id == 0) revert SavingPlanNotFound(planId);
        if (newReceiver == address(0)) revert InvalidAddress();
        
        address oldReceiver = planPenaltyReceivers[planId];
        planPenaltyReceivers[planId] = newReceiver;
        
        emit PenaltyReceiverUpdated(planId, oldReceiver, newReceiver);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS - Vault Liquidity Management
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Deposits tokens into the vault for interest payments
     * @dev Transfers tokens from admin to this contract, then to vault
     * @param amount The amount of tokens to deposit (must be pre-approved)
     * 
     * Requirements:
     * - amount must be greater than 0
     * - Caller must have approved this contract to spend tokens
     */
    function depositToVault(uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (amount == 0) revert InvalidAmount(amount);
        depositToken.safeTransferFrom(msg.sender, address(this), amount);
        depositToken.forceApprove(address(vault), amount);
        vault.depositLiquidity(amount);
        emit LiquidityDeposited(msg.sender, amount);
    }

    /**
     * @notice Withdraws tokens from the vault to admin
     * @dev Used for emergency or excess liquidity removal
     * @param amount The amount of tokens to withdraw
     * 
     * Requirements:
     * - amount must be greater than 0
     * - Vault must have sufficient liquidity
     */
    function withdrawFromVault(uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (amount == 0) revert InvalidAmount(amount);
        vault.withdrawLiquidity(amount, msg.sender);
        emit LiquidityWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Activates a saving plan to accept new deposits
     * @dev Convenience function equivalent to updateSavingPlanStatus(planId, true)
     * @param planId The ID of the saving plan to activate
     */
    function activateSavingPlan(uint256 planId) external onlyRole(ADMIN_ROLE) {
        if (savingPlans[planId].id == 0) revert SavingPlanNotFound(planId);
        savingPlans[planId].isActive = true;
        emit SavingPlanActivated(planId);
    }

    /**
     * @notice Deactivates a saving plan to prevent new deposits
     * @dev Existing deposits are not affected
     * @param planId The ID of the saving plan to deactivate
     */
    function deactivateSavingPlan(uint256 planId) external onlyRole(ADMIN_ROLE) {
        if (savingPlans[planId].id == 0) revert SavingPlanNotFound(planId);
        savingPlans[planId].isActive = false;
        emit SavingPlanDeactivated(planId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS - Emergency Controls
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Pauses all user operations (deposits, withdrawals, renewals)
     * @dev Only callable by PAUSER_ROLE. Admin functions remain available.
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Resumes all user operations after a pause
     * @dev Only callable by PAUSER_ROLE
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // USER FUNCTIONS - Deposit Operations
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Creates a new fixed-term deposit for the caller
     * @dev Mints an NFT certificate as proof of deposit ownership
     * @param savingPlanId The ID of the saving plan to use
     * @param amount The deposit amount (must be within plan's min/max limits)
     * @param termInDays The deposit term in days (must be within plan's term limits)
     * @return depositId The unique ID of the created deposit
     * 
     * Requirements:
     * - Contract must not be paused
     * - Saving plan must exist and be active
     * - Amount must be within plan's deposit limits
     * - Term must be within plan's term limits
     * - Caller must have approved this contract to spend tokens
     * 
     * Effects:
     * - Transfers tokens from caller to vault
     * - Mints NFT certificate to caller
     * - Records deposit details
     * - Emits DepositCreated event
     */
    function createDeposit(
        uint256 savingPlanId,
        uint256 amount,
        uint32 termInDays
    ) external nonReentrant whenNotPaused returns (uint256 depositId) {
        ISavingBankStructs.SavingPlan memory plan = savingPlans[savingPlanId];
        if (plan.id == 0) revert SavingPlanNotFound(savingPlanId);
        if (!plan.isActive) revert SavingPlanNotActive(savingPlanId);
        if (amount < plan.minDepositAmount) revert InsufficientDepositAmount(amount, plan.minDepositAmount);
        if (plan.maxDepositAmount > 0 && amount > plan.maxDepositAmount) {
            revert ExcessiveDepositAmount(amount, plan.maxDepositAmount);
        }
        if (termInDays < plan.minTermInDays) revert InvalidTermDays(termInDays);
        if (termInDays > plan.maxTermInDays) revert InvalidTermDays(termInDays);

        depositId = _nextDepositId++;
        uint256 maturityDate = block.timestamp + (termInDays * 1 days);
        uint256 expectedInterest = amount.calculateSimpleInterest(
            plan.annualInterestRateInBasisPoints,
            termInDays
        );

        deposits[depositId] = ISavingBankStructs.Deposit({
            id: depositId,
            user: msg.sender,
            savingPlanId: savingPlanId,
            amount: amount,
            termInDays: termInDays,
            expectedInterest: expectedInterest,
            depositDate: block.timestamp,
            maturityDate: maturityDate,
            status: ISavingBankStructs.DepositStatus.Active
        });

        userDepositIds[msg.sender].push(depositId);
        
        depositToken.safeTransferFrom(msg.sender, address(this), amount);
        depositToken.forceApprove(address(vault), amount);
        vault.depositLiquidity(amount);
        
        uint256 certificateId = depositCertificate.mintCertificate(msg.sender, depositId);

        emit DepositCreated(
            depositId,
            msg.sender,
            savingPlanId,
            amount,
            termInDays,
            maturityDate,
            certificateId
        );
    }

    /**
     * @notice Withdraws a deposit (at maturity or early with penalty)
     * @dev Only the current NFT certificate owner can withdraw the deposit
     * @param depositId The ID of the deposit to withdraw
     * 
     * Withdrawal Types:
     * - At Maturity: NFT owner receives principal + full interest
     * - Early Withdrawal: NFT owner receives principal - penalty (no interest)
     * 
     * Penalty Handling:
     * - If penaltyReceiver is set: penalty sent to receiver
     * - If penaltyReceiver is zero: penalty remains in vault
     * 
     * Requirements:
     * - Contract must not be paused
     * - Caller must be the current NFT certificate owner
     * - Deposit must be in Active status
     * - Vault must have sufficient liquidity
     * 
     * Effects:
     * - Updates deposit status to Withdrawn
     * - Transfers appropriate amount to user
     * - Emits DepositWithdrawn event
     */
    function withdrawDeposit(uint256 depositId) external nonReentrant whenNotPaused {
        ISavingBankStructs.Deposit storage deposit = deposits[depositId];
        
        // Check if deposit exists
        if (deposit.id == 0) revert DepositNotFound(depositId);
        
        // Check if caller is the current NFT certificate owner
        address certificateOwner = depositCertificate.ownerOf(depositId);
        if (certificateOwner != msg.sender) revert UnauthorizedWithdrawal(msg.sender, depositId);
        
        // Check if NFT is in transfer cooldown period (security measure)
        if (depositCertificate.isInCooldown(depositId)) {
            revert CertificateInCooldown(depositId, depositCertificate.getRemainingCooldown(depositId));
        }
        
        if (deposit.status != ISavingBankStructs.DepositStatus.Active) revert DepositNotActive(depositId);

        ISavingBankStructs.SavingPlan memory plan = savingPlans[deposit.savingPlanId];
        bool isEarlyWithdrawal = block.timestamp < deposit.maturityDate;
        uint256 withdrawAmount = deposit.amount;
        uint256 interestAmount = 0;
        uint256 penaltyAmount = 0;

        if (isEarlyWithdrawal) {
            penaltyAmount = deposit.amount.calculatePenalty(plan.penaltyRateInBasisPoints);
            withdrawAmount = deposit.amount - penaltyAmount;
            
            deposit.status = ISavingBankStructs.DepositStatus.Withdrawn;
            
            address penaltyReceiver = planPenaltyReceivers[deposit.savingPlanId];
            if (penaltyReceiver != address(0)) {
                // Withdraw full principal from vault
                vault.withdrawLiquidity(deposit.amount, address(this));
                // Send payout to user
                depositToken.safeTransfer(msg.sender, withdrawAmount);
                // Send penalty to receiver
                depositToken.safeTransfer(penaltyReceiver, penaltyAmount);
            } else {
                // Withdraw only payout amount; Penalty remains in Vault
                vault.withdrawLiquidity(withdrawAmount, address(this));
                depositToken.safeTransfer(msg.sender, withdrawAmount);
            }
        } else {
            interestAmount = deposit.expectedInterest;
            withdrawAmount = deposit.amount + interestAmount;
            
            deposit.status = ISavingBankStructs.DepositStatus.Withdrawn;

            vault.withdrawLiquidity(deposit.amount, address(this));
            
            if (interestAmount > 0) {
                vault.withdrawLiquidity(interestAmount, address(this));
            }

            depositToken.safeTransfer(msg.sender, withdrawAmount);
        }

        emit DepositWithdrawn(
            depositId,
            msg.sender,
            withdrawAmount,
            interestAmount,
            penaltyAmount,
            isEarlyWithdrawal
        );
    }

    /**
     * @notice Renews a matured deposit with compound interest
     * @dev Creates a new deposit with principal = old principal + earned interest
     * @param depositId The ID of the deposit to renew
     * @param newPlanId The saving plan ID for the new deposit (can be same or different)
     * @param newTermInDays The term for the new deposit
     * @return newDepositId The ID of the newly created deposit
     * 
     * Compound Interest:
     * - New principal = old principal + old expected interest
     * - New interest calculated based on new principal and new plan rate
     * 
     * Requirements:
     * - Contract must not be paused
     * - Caller must be the deposit owner
     * - Original deposit must be matured (current time >= maturity date)
     * - Original deposit must be in Active status
     * - New plan must exist and be active
     * - New principal must meet new plan's deposit limits
     * - New term must be within new plan's term limits
     * 
     * Effects:
     * - Updates old deposit status to Renewed
     * - Creates new deposit with compounded principal
     * - Mints new NFT certificate
     * - Emits DepositRenewed and DepositCreated events
     */
    function renewDeposit(
        uint256 depositId,
        uint256 newPlanId,
        uint32 newTermInDays
    ) external nonReentrant whenNotPaused returns (uint256 newDepositId) {
        ISavingBankStructs.Deposit storage oldDeposit = deposits[depositId];
        
        if (oldDeposit.id == 0) revert DepositNotFound(depositId);
        
        // Check if caller is the current NFT certificate owner
        address certificateOwner = depositCertificate.ownerOf(depositId);
        if (certificateOwner != msg.sender) revert UnauthorizedWithdrawal(msg.sender, depositId);
        
        // Check if NFT is in transfer cooldown period (security measure)
        if (depositCertificate.isInCooldown(depositId)) {
            revert CertificateInCooldown(depositId, depositCertificate.getRemainingCooldown(depositId));
        }
        
        if (oldDeposit.status != ISavingBankStructs.DepositStatus.Active) revert DepositNotActive(depositId);
        
        if (block.timestamp < oldDeposit.maturityDate) {
             revert DepositNotMature(depositId, oldDeposit.maturityDate, block.timestamp);
        }

        uint256 interest = oldDeposit.expectedInterest;
        uint256 newPrincipal = oldDeposit.amount + interest;

        oldDeposit.status = ISavingBankStructs.DepositStatus.Renewed;

        ISavingBankStructs.SavingPlan memory plan = savingPlans[newPlanId];
        if (plan.id == 0) revert SavingPlanNotFound(newPlanId);
        if (!plan.isActive) revert SavingPlanNotActive(newPlanId);
        
        if (newPrincipal < plan.minDepositAmount) revert InsufficientDepositAmount(newPrincipal, plan.minDepositAmount);
        if (plan.maxDepositAmount > 0 && newPrincipal > plan.maxDepositAmount) {
            revert ExcessiveDepositAmount(newPrincipal, plan.maxDepositAmount);
        }
        if (newTermInDays < plan.minTermInDays) revert InvalidTermDays(newTermInDays);
        if (newTermInDays > plan.maxTermInDays) revert InvalidTermDays(newTermInDays);

        newDepositId = _nextDepositId++;
        uint256 newMaturityDate = block.timestamp + (newTermInDays * 1 days);
        uint256 newExpectedInterest = newPrincipal.calculateSimpleInterest(
            plan.annualInterestRateInBasisPoints,
            newTermInDays
        );

        deposits[newDepositId] = ISavingBankStructs.Deposit({
            id: newDepositId,
            user: certificateOwner, // Use current certificate owner instead of msg.sender
            savingPlanId: newPlanId,
            amount: newPrincipal,
            termInDays: newTermInDays,
            expectedInterest: newExpectedInterest,
            depositDate: block.timestamp,
            maturityDate: newMaturityDate,
            status: ISavingBankStructs.DepositStatus.Active
        });

        userDepositIds[certificateOwner].push(newDepositId);
        
        uint256 certificateId = depositCertificate.mintCertificate(certificateOwner, newDepositId);

        emit DepositRenewed(depositId, newDepositId, certificateOwner, newPrincipal, newPlanId);
        emit DepositCreated(
            newDepositId,
            certificateOwner,
            newPlanId,
            newPrincipal,
            newTermInDays,
            newMaturityDate,
            certificateId
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS - Read-only Queries
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Retrieves the details of a saving plan
     * @param planId The ID of the saving plan
     * @return The SavingPlan struct containing all plan details
     */
    function getSavingPlan(uint256 planId) external view returns (ISavingBankStructs.SavingPlan memory) {
        if (savingPlans[planId].id == 0) revert SavingPlanNotFound(planId);
        return savingPlans[planId];
    }

    /**
     * @notice Returns the total number of saving plans created
     * @return The count of all saving plans (including inactive ones)
     */
    function getTotalPlans() external view returns (uint256) {
        return _nextPlanId - 1;
    }

    /**
     * @notice Returns the total number of deposits ever created
     * @return The count of all deposits (including closed/renewed ones)
     */
    function getTotalDeposits() external view returns (uint256) {
        return _nextDepositId - 1;
    }

    /**
     * @notice Returns the address of the deposit token (e.g., USDC)
     * @return The ERC20 token contract address
     */
    function getDepositToken() external view returns (address) {
        return address(depositToken);
    }

    /**
     * @notice Returns the address of the deposit certificate NFT contract
     * @return The DepositCertificate contract address
     */
    function getDepositCertificateAddress() external view returns (address) {
        return address(depositCertificate);
    }

    /**
     * @notice Returns the address of the vault contract
     * @return The Vault contract address
     */
    function getVaultAddress() external view returns (address) {
        return address(vault);
    }

    /**
     * @notice Returns the current balance of the vault
     * @return The vault's token balance
     */
    function getVaultBalance() external view returns (uint256) {
        return vault.getBalance();
    }

    /**
     * @notice Checks if a deposit has reached its maturity date
     * @param depositId The ID of the deposit to check
     * @return True if the deposit is mature (current time >= maturity date)
     */
    function isDepositMature(uint256 depositId) external view returns (bool) {
        ISavingBankStructs.Deposit memory deposit = deposits[depositId];
        if (deposit.id == 0) revert DepositNotFound(depositId);
        return block.timestamp >= deposit.maturityDate;
    }

    /**
     * @notice Calculates the penalty amount for early withdrawal of a specific deposit
     * @param depositId The ID of the deposit
     * @return penaltyAmount The penalty amount if withdrawn early (0 if already mature)
     */
    function calculateEarlyWithdrawalPenalty(uint256 depositId) external view returns (uint256 penaltyAmount) {
        ISavingBankStructs.Deposit memory deposit = deposits[depositId];
        if (deposit.id == 0) revert DepositNotFound(depositId);
        
        // If already mature, no penalty
        if (block.timestamp >= deposit.maturityDate) {
            return 0;
        }
        
        ISavingBankStructs.SavingPlan memory plan = savingPlans[deposit.savingPlanId];
        penaltyAmount = deposit.amount.calculatePenalty(plan.penaltyRateInBasisPoints);
    }

    /**
     * @notice Returns the penalty receiver address for a specific plan
     * @param planId The ID of the saving plan
     * @return The address that receives early withdrawal penalties (zero address if not set)
     */
    function getPenaltyReceiver(uint256 planId) external view returns (address) {
        if (savingPlans[planId].id == 0) revert SavingPlanNotFound(planId);
        return planPenaltyReceivers[planId];
    }

    /**
     * @notice Retrieves the details of a deposit
     * @param depositId The ID of the deposit
     * @return The Deposit struct containing all deposit details
     */
    function getDeposit(uint256 depositId) external view returns (ISavingBankStructs.Deposit memory) {
        if (deposits[depositId].id == 0) revert DepositNotFound(depositId);
        return deposits[depositId];
    }

    /**
     * @notice Retrieves all deposit IDs for a specific user
     * @param user The address of the user
     * @return Array of deposit IDs owned by the user
     */
    function getUserDepositIds(address user) external view returns (uint256[] memory) {
        return userDepositIds[user];
    }

    /**
     * @notice Counts the number of currently active deposits
     * @dev Iterates through all deposits - may be gas expensive for large datasets
     * @return count The number of deposits with Active status
     */
    function getActiveDepositCount() external view returns (uint256 count) {
        for (uint256 i = 1; i < _nextDepositId; i++) {
            if (deposits[i].status == ISavingBankStructs.DepositStatus.Active) {
                count++;
            }
        }
    }

    /**
     * @notice Calculates the expected interest for a hypothetical deposit
     * @dev Uses simple interest formula: (principal * rate * time) / (10000 * 365)
     * @param amount The deposit principal amount
     * @param planId The saving plan ID to use for interest rate
     * @param termInDays The deposit term in days
     * @return The calculated interest amount
     */
    function calculateExpectedInterest(uint256 amount, uint256 planId, uint32 termInDays) 
        external 
        view 
        returns (uint256) 
    {
        ISavingBankStructs.SavingPlan memory plan = savingPlans[planId];
        if (plan.id == 0) revert SavingPlanNotFound(planId);
        return amount.calculateSimpleInterest(plan.annualInterestRateInBasisPoints, termInDays);
    }
}
