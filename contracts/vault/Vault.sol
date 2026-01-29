// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IVaultEvents.sol";
import "../interfaces/ISavingBankErrors.sol";

contract Vault is IVault, IVaultEvents, ISavingBankErrors, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant LIQUIDITY_MANAGER_ROLE = keccak256("LIQUIDITY_MANAGER_ROLE");
    bytes32 public constant WITHDRAW_ROLE = keccak256("WITHDRAW_ROLE");
    
    IERC20 public immutable token;
    uint256 private _balance;
    
    constructor(address tokenAddress) {
        if (tokenAddress == address(0)) revert ZeroAddress();
        
        token = IERC20(tokenAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(LIQUIDITY_MANAGER_ROLE, msg.sender);
    }
    
    /// @inheritdoc IVault
    function depositLiquidity(uint256 amount) external onlyRole(LIQUIDITY_MANAGER_ROLE) nonReentrant {
        if (amount == 0) revert ZeroAmount();
        
        token.safeTransferFrom(msg.sender, address(this), amount);
        _balance += amount;
        
        emit LiquidityDeposited(msg.sender, amount, _balance);
    }
    
    /// @inheritdoc IVault
    function withdrawLiquidity(uint256 amount, address recipient) external onlyRole(WITHDRAW_ROLE) nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();
        if (_balance < amount) revert InsufficientVaultLiquidity(amount, _balance);
        
        _balance -= amount;
        token.safeTransfer(recipient, amount);
        
        emit LiquidityWithdrawn(msg.sender, amount, recipient, _balance);
    }
    
    /// @inheritdoc IVault
    function adminWithdraw(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (_balance < amount) revert InsufficientVaultLiquidity(amount, _balance);
        
        _balance -= amount;
        token.safeTransfer(msg.sender, amount);
        
        emit AdminWithdrawn(msg.sender, amount, _balance);
    }
    
    /// @inheritdoc IVault
    function getBalance() external view returns (uint256) {
        return _balance;
    }
    
    /// @inheritdoc IVault
    function canWithdraw(address caller) external view returns (bool) {
        return hasRole(WITHDRAW_ROLE, caller);
    }
    
    /// @inheritdoc IVault
    function getToken() external view returns (address) {
        return address(token);
    }
    
    /// @notice Grant quyền withdraw cho một contract
    /// @param contractAddress Địa chỉ contract được cấp quyền
    function grantWithdrawRole(address contractAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (contractAddress == address(0)) revert ZeroAddress();
        
        _grantRole(WITHDRAW_ROLE, contractAddress);
        emit WithdrawPermissionUpdated(contractAddress, true);
    }
    
    /// @notice Revoke quyền withdraw của một contract
    /// @param contractAddress Địa chỉ contract bị thu hồi quyền
    function revokeWithdrawRole(address contractAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(WITHDRAW_ROLE, contractAddress);
        emit WithdrawPermissionUpdated(contractAddress, false);
    }
}