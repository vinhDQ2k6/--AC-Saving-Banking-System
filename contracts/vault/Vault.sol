// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IVaultEvents.sol";
import "../interfaces/ISavingBankErrors.sol";

/**
 * @title Vault
 * @author Saving Banking Team
 * @notice Manages liquidity for the SavingBank system's interest payments
 * @dev Implements role-based access control for secure liquidity management
 * 
 * Purpose:
 * - Holds deposited tokens from user savings
 * - Provides liquidity for interest payments at maturity
 * - Enables admin emergency withdrawals
 * 
 * Security:
 * - LIQUIDITY_MANAGER_ROLE: Can deposit liquidity (typically SavingBank contract)
 * - WITHDRAW_ROLE: Can withdraw liquidity for user payouts (typically SavingBank)
 * - DEFAULT_ADMIN_ROLE: Can perform admin withdrawals and manage roles
 * - All state-changing functions are protected by ReentrancyGuard
 */
contract Vault is IVault, IVaultEvents, ISavingBankErrors, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    /// @notice Role for depositing liquidity into the vault
    bytes32 public constant LIQUIDITY_MANAGER_ROLE = keccak256("LIQUIDITY_MANAGER_ROLE");
    
    /// @notice Role for withdrawing liquidity from the vault
    bytes32 public constant WITHDRAW_ROLE = keccak256("WITHDRAW_ROLE");
    
    /// @notice The ERC20 token managed by this vault
    IERC20 public immutable token;
    
    /// @dev Internal balance tracking (should match actual token balance)
    uint256 private _balance;
    
    /**
     * @notice Initializes the vault with the specified token
     * @dev Grants DEFAULT_ADMIN_ROLE and LIQUIDITY_MANAGER_ROLE to deployer
     * @param tokenAddress Address of the ERC20 token to manage
     */
    constructor(address tokenAddress) {
        if (tokenAddress == address(0)) revert ZeroAddress();
        
        token = IERC20(tokenAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(LIQUIDITY_MANAGER_ROLE, msg.sender);
    }
    
    /**
     * @notice Deposits tokens into the vault
     * @dev Only callable by addresses with LIQUIDITY_MANAGER_ROLE
     * @param amount The amount of tokens to deposit
     * 
     * Requirements:
     * - amount must be greater than 0
     * - Caller must have approved this contract to spend tokens
     * 
     * Emits a {LiquidityDeposited} event
     */
    /// @inheritdoc IVault
    function depositLiquidity(uint256 amount) external onlyRole(LIQUIDITY_MANAGER_ROLE) nonReentrant {
        if (amount == 0) revert ZeroAmount();
        
        token.safeTransferFrom(msg.sender, address(this), amount);
        _balance += amount;
        
        emit LiquidityDeposited(msg.sender, amount, _balance);
    }
    
    /**
     * @notice Withdraws tokens from the vault to a specified recipient
     * @dev Only callable by addresses with WITHDRAW_ROLE (typically SavingBank)
     * @param amount The amount of tokens to withdraw
     * @param recipient The address to receive the tokens
     * 
     * Requirements:
     * - amount must be greater than 0
     * - recipient must not be zero address
     * - Vault must have sufficient balance
     * 
     * Emits a {LiquidityWithdrawn} event
     */
    /// @inheritdoc IVault
    function withdrawLiquidity(uint256 amount, address recipient) external onlyRole(WITHDRAW_ROLE) nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();
        if (_balance < amount) revert InsufficientVaultLiquidity(amount, _balance);
        
        _balance -= amount;
        token.safeTransfer(recipient, amount);
        
        emit LiquidityWithdrawn(msg.sender, amount, recipient, _balance);
    }
    
    /**
     * @notice Emergency withdrawal function for admin
     * @dev Only callable by DEFAULT_ADMIN_ROLE for emergency situations
     * @param amount The amount of tokens to withdraw to admin
     * 
     * Requirements:
     * - amount must be greater than 0
     * - Vault must have sufficient balance
     * 
     * Emits an {AdminWithdrawn} event
     */
    /// @inheritdoc IVault
    function adminWithdraw(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (_balance < amount) revert InsufficientVaultLiquidity(amount, _balance);
        
        _balance -= amount;
        token.safeTransfer(msg.sender, amount);
        
        emit AdminWithdrawn(msg.sender, amount, _balance);
    }
    
    /**
     * @notice Returns the current token balance in the vault
     * @return The tracked balance amount
     */
    /// @inheritdoc IVault
    function getBalance() external view returns (uint256) {
        return _balance;
    }
    
    /**
     * @notice Checks if an address has withdrawal permission
     * @param caller The address to check
     * @return True if the address has WITHDRAW_ROLE
     */
    /// @inheritdoc IVault
    function canWithdraw(address caller) external view returns (bool) {
        return hasRole(WITHDRAW_ROLE, caller);
    }
    
    /**
     * @notice Returns the address of the token managed by this vault
     * @return The token contract address
     */
    /// @inheritdoc IVault
    function getToken() external view returns (address) {
        return address(token);
    }
    
    /**
     * @notice Grants withdrawal permission to a contract
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     * @param contractAddress The address to grant WITHDRAW_ROLE
     */
    function grantWithdrawRole(address contractAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (contractAddress == address(0)) revert ZeroAddress();
        
        _grantRole(WITHDRAW_ROLE, contractAddress);
        emit WithdrawPermissionUpdated(contractAddress, true);
    }
    
    /**
     * @notice Revokes withdrawal permission from a contract
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     * @param contractAddress The address to revoke WITHDRAW_ROLE from
     */
    function revokeWithdrawRole(address contractAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(WITHDRAW_ROLE, contractAddress);
        emit WithdrawPermissionUpdated(contractAddress, false);
    }
}