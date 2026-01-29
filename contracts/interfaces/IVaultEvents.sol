// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVaultEvents {
    /// @notice Khi admin nạp token vào vault
    event LiquidityDeposited(address indexed admin, uint256 amount, uint256 newBalance);
    
    /// @notice Khi authorized contract rút token từ vault
    event LiquidityWithdrawn(address indexed caller, uint256 amount, address indexed recipient, uint256 newBalance);
    
    /// @notice Khi admin rút token khẩn cấp
    event AdminWithdrawn(address indexed admin, uint256 amount, uint256 newBalance);
    
    /// @notice Khi grant/revoke quyền withdraw cho contract
    event WithdrawPermissionUpdated(address indexed contractAddress, bool canWithdraw);
}