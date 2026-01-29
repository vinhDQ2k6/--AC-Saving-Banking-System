// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISavingBankEvents {
    // Saving Plan events
    event SavingPlanCreated(uint256 indexed planId, string name);
    event SavingPlanUpdated(uint256 indexed planId);
    event SavingPlanActivated(uint256 indexed planId);
    event SavingPlanDeactivated(uint256 indexed planId);

    // Deposit events
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

    // Liquidity management events
    event LiquidityDeposited(address indexed admin, uint256 amount);
    event LiquidityWithdrawn(address indexed admin, uint256 amount);

    // Legacy events for backward compatibility
    event SavingPlanStatusUpdated(uint256 indexed planId, bool isEnabled);
    event PenaltyReceiverUpdated(uint256 indexed planId, address indexed oldReceiver, address indexed newReceiver);
    event DepositOpened(uint256 indexed depositId, address indexed depositor, uint256 indexed planId, uint256 principalAmount, uint64 depositTimestamp, uint64 maturityTimestamp);
    event DepositRenewed(uint256 indexed oldDepositId, uint256 indexed newDepositId, address indexed depositor, uint256 newPrincipalAmount, uint256 newPlanId);
    event VaultDeposited(address indexed admin, uint256 amount, uint256 newVaultBalance);
    event VaultWithdrawn(address indexed admin, uint256 amount, uint256 newVaultBalance);
}
