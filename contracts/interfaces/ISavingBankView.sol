// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ISavingBankStructs.sol";

interface ISavingBankView is ISavingBankStructs {
    function getSavingPlan(uint256 planId) external view returns (SavingPlan memory);
    function getDeposit(uint256 depositId) external view returns (Deposit memory);
    function getUserDepositIds(address user) external view returns (uint256[] memory);
    function getActiveDepositCount() external view returns (uint256);
    function calculateExpectedInterest(uint256 amount, uint256 planId, uint32 termInDays) external view returns (uint256);
}
