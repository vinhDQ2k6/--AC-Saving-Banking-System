// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ISavingBankStructs.sol";
import "./interfaces/ISavingBankErrors.sol";
import "./interfaces/ISavingBankEvents.sol";
import "./interfaces/IDepositCertificate.sol";
import "./interfaces/IVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./libraries/InterestCalculator.sol";

contract SavingBank is AccessControl, Pausable, ReentrancyGuard, ISavingBankErrors, ISavingBankEvents {
    using SafeERC20 for IERC20;
    using InterestCalculator for uint256;

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    IERC20 public immutable depositToken;
    IDepositCertificate public immutable depositCertificate;
    IVault public immutable vault;

    uint256 private _nextPlanId;
    uint256 private _nextDepositId;

    mapping(uint256 => ISavingBankStructs.SavingPlan) private savingPlans;
    mapping(uint256 => ISavingBankStructs.Deposit) private deposits;
    mapping(address => uint256[]) private userDepositIds;

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

    // Admin functions
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

    function updateSavingPlanStatus(uint256 planId, bool isEnabled) external {
        revert("Not implemented");
    }

    function updatePenaltyReceiver(uint256 planId, address newReceiver) external {
        revert("Not implemented");
    }

    function depositToVault(uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (amount == 0) revert InvalidAmount(amount);
        depositToken.safeTransferFrom(msg.sender, address(this), amount);
        depositToken.forceApprove(address(vault), amount);
        vault.depositLiquidity(amount);
        emit LiquidityDeposited(msg.sender, amount);
    }

    function withdrawFromVault(uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (amount == 0) revert InvalidAmount(amount);
        vault.withdrawLiquidity(amount, msg.sender);
        emit LiquidityWithdrawn(msg.sender, amount);
    }

    function activateSavingPlan(uint256 planId) external onlyRole(ADMIN_ROLE) {
        if (savingPlans[planId].id == 0) revert SavingPlanNotFound(planId);
        savingPlans[planId].isActive = true;
        emit SavingPlanActivated(planId);
    }

    function deactivateSavingPlan(uint256 planId) external onlyRole(ADMIN_ROLE) {
        if (savingPlans[planId].id == 0) revert SavingPlanNotFound(planId);
        savingPlans[planId].isActive = false;
        emit SavingPlanDeactivated(planId);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // User functions
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

    function withdrawDeposit(uint256 depositId) external nonReentrant whenNotPaused {
        ISavingBankStructs.Deposit storage deposit = deposits[depositId];
        if (deposit.user != msg.sender) revert UnauthorizedWithdrawal(msg.sender, depositId);
        if (deposit.status != ISavingBankStructs.DepositStatus.Active) revert DepositNotActive(depositId);

        ISavingBankStructs.SavingPlan memory plan = savingPlans[deposit.savingPlanId];
        bool isEarlyWithdrawal = block.timestamp < deposit.maturityDate;
        uint256 withdrawAmount = deposit.amount;
        uint256 interestAmount = 0;
        uint256 penaltyAmount = 0;

        if (isEarlyWithdrawal) {
            penaltyAmount = deposit.amount.calculatePenalty(plan.penaltyRateInBasisPoints);
            withdrawAmount = deposit.amount - penaltyAmount;
        } else {
            interestAmount = deposit.expectedInterest;
            withdrawAmount = deposit.amount + interestAmount;
        }

        deposit.status = ISavingBankStructs.DepositStatus.Withdrawn;

        vault.withdrawLiquidity(deposit.amount, address(this));
        
        if (interestAmount > 0) {
            vault.withdrawLiquidity(interestAmount, address(this));
        }

        depositToken.safeTransfer(msg.sender, withdrawAmount);

        emit DepositWithdrawn(
            depositId,
            msg.sender,
            withdrawAmount,
            interestAmount,
            penaltyAmount,
            isEarlyWithdrawal
        );
    }

    // View functions
    function getSavingPlan(uint256 planId) external view returns (ISavingBankStructs.SavingPlan memory) {
        if (savingPlans[planId].id == 0) revert SavingPlanNotFound(planId);
        return savingPlans[planId];
    }

    function getDeposit(uint256 depositId) external view returns (ISavingBankStructs.Deposit memory) {
        if (deposits[depositId].id == 0) revert DepositNotFound(depositId);
        return deposits[depositId];
    }

    function getUserDepositIds(address user) external view returns (uint256[] memory) {
        return userDepositIds[user];
    }

    function getActiveDepositCount() external view returns (uint256 count) {
        for (uint256 i = 1; i < _nextDepositId; i++) {
            if (deposits[i].status == ISavingBankStructs.DepositStatus.Active) {
                count++;
            }
        }
    }

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
