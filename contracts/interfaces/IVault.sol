// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVault {
    /// @notice Nạp token vào vault (chỉ admin có thể gọi)
    /// @param amount Số lượng token nạp vào
    function depositLiquidity(uint256 amount) external;
    
    /// @notice Rút token từ vault (chỉ authorized contracts)
    /// @param amount Số lượng token rút ra
    /// @param recipient Địa chỉ nhận token
    function withdrawLiquidity(uint256 amount, address recipient) external;
    
    /// @notice Rút token dành cho admin (emergency)
    /// @param amount Số lượng token admin rút
    function adminWithdraw(uint256 amount) external;
    
    /// @notice Kiểm tra số dư vault
    function getBalance() external view returns (uint256);
    
    /// @notice Kiểm tra một contract có quyền rút không
    function canWithdraw(address caller) external view returns (bool);
    
    /// @notice Lấy địa chỉ token được vault quản lý
    function getToken() external view returns (address);
}