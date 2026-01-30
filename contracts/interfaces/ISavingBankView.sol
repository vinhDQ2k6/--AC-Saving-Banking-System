// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ISavingBankStructs.sol";

/**
 * @title ISavingBankView
 * @notice Interface for read-only query functions in SavingBank
 * @dev All functions are view functions with no state modification
 */
interface ISavingBankView is ISavingBankStructs {
    /// @notice Retrieves the details of a saving plan
    /// @param planId The ID of the saving plan
    /// @return plan The SavingPlan struct containing all plan details
    function getSavingPlan(uint256 planId) external view returns (SavingPlan memory plan);
    
    /// @notice Retrieves the details of a deposit
    /// @param depositId The ID of the deposit
    /// @return deposit The Deposit struct containing all deposit details
    function getDeposit(uint256 depositId) external view returns (Deposit memory deposit);
    
    /// @notice Retrieves all deposit IDs for a specific user
    /// @param user The address of the user
    /// @return depositIds Array of deposit IDs owned by the user
    function getUserDepositIds(address user) external view returns (uint256[] memory depositIds);
    
    /// @notice Counts the number of currently active deposits
    /// @return count The number of deposits with Active status
    function getActiveDepositCount() external view returns (uint256 count);
    
    /// @notice Calculates the expected interest for a hypothetical deposit
    /// @param amount The deposit principal amount
    /// @param planId The saving plan ID to use for interest rate
    /// @param termInDays The deposit term in days
    /// @return interest The calculated interest amount
    function calculateExpectedInterest(uint256 amount, uint256 planId, uint32 termInDays) external view returns (uint256 interest);
    
    /// @notice Returns the total number of saving plans created
    /// @return count The count of all saving plans (including inactive ones)
    function getTotalPlans() external view returns (uint256 count);
    
    /// @notice Returns the total number of deposits ever created
    /// @return count The count of all deposits (including closed/renewed ones)
    function getTotalDeposits() external view returns (uint256 count);
    
    /// @notice Returns the address of the deposit token (e.g., USDC)
    /// @return tokenAddress The ERC20 token contract address
    function getDepositToken() external view returns (address tokenAddress);
    
    /// @notice Returns the address of the deposit certificate NFT contract
    /// @return certificateAddress The DepositCertificate contract address
    function getDepositCertificateAddress() external view returns (address certificateAddress);
    
    /// @notice Returns the address of the vault contract
    /// @return vaultAddress The Vault contract address
    function getVaultAddress() external view returns (address vaultAddress);
    
    /// @notice Returns the current balance of the vault
    /// @return balance The vault's token balance
    function getVaultBalance() external view returns (uint256 balance);
    
    /// @notice Checks if a deposit has reached its maturity date
    /// @param depositId The ID of the deposit to check
    /// @return isMature True if the deposit is mature (current time >= maturity date)
    function isDepositMature(uint256 depositId) external view returns (bool isMature);
    
    /// @notice Calculates the penalty amount for early withdrawal of a specific deposit
    /// @param depositId The ID of the deposit
    /// @return penaltyAmount The penalty amount if withdrawn early (0 if already mature)
    function calculateEarlyWithdrawalPenalty(uint256 depositId) external view returns (uint256 penaltyAmount);
    
    /// @notice Returns the penalty receiver address for a specific plan
    /// @param planId The ID of the saving plan
    /// @return receiver The address that receives early withdrawal penalties (zero address if not set)
    function getPenaltyReceiver(uint256 planId) external view returns (address receiver);
}
