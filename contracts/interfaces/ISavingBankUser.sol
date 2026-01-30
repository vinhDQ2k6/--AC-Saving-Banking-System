// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISavingBankUser {
    function createDeposit(uint256 savingPlanId, uint256 amount, uint32 termInDays) external returns (uint256 depositId);
    function withdrawDeposit(uint256 depositId) external;
    function renewDeposit(uint256 depositId, uint256 newPlanId, uint32 newTermInDays) external returns (uint256 newDepositId);
}
