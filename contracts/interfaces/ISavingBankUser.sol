// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISavingBankUser {
    function openDeposit(uint256 planId, uint256 amount) external returns (uint256 depositId);
    function withdrawDeposit(uint256 depositId) external;
    function renewDeposit(uint256 depositId, uint256 newPlanId) external returns (uint256 newDepositId);
}
