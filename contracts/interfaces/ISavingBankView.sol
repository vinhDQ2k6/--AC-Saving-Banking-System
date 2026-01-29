// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ISavingBankStructs.sol";

interface ISavingBankView is ISavingBankStructs {
    function getSavingPlan(uint256 planId) external view returns (SavingPlan memory);
    function getDepositRecord(uint256 depositId) external view returns (DepositRecord memory);
    function isDepositMature(uint256 depositId) external view returns (bool);
    function calculateExpectedInterest(uint256 depositId) external view returns (uint256);
    function calculateEarlyWithdrawalPenalty(uint256 depositId) external view returns (uint256);
    function getVaultBalance() external view returns (uint256);
    function getTotalPlans() external view returns (uint256);
    function getTotalDeposits() external view returns (uint256);
    function getDepositToken() external view returns (address);
    function getDepositCertificate() external view returns (address);
}
