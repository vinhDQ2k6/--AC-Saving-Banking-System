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

    // Legacy errors for backward compatibility
    error PlanNotFound(uint256 planId);
    error PlanNotEnabled(uint256 planId);
    error InvalidTenorSeconds(uint64 tenorSeconds);
    error ZeroAmount();
    error AmountBelowMinimum(uint256 amount, uint256 minimumRequired);
    error AmountAboveMaximum(uint256 amount, uint256 maximumAllowed);
    error UnauthorizedCaller(address caller, address expectedOwner);
    error ZeroAddress();
    error ContractPaused();
}
