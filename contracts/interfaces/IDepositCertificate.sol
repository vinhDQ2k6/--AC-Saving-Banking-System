// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IDepositCertificate is IERC721 {
    function mintCertificate(address to, uint256 depositId) external returns (uint256 tokenId);
    function burnCertificate(uint256 depositId) external;
    function exists(uint256 depositId) external view returns (bool);
    
    /// @notice Transfer cooldown period constant (24 hours)
    function TRANSFER_COOLDOWN() external view returns (uint256);
    
    /// @notice Get the last transfer timestamp for a token
    function getLastTransferTime(uint256 tokenId) external view returns (uint256);
    
    /// @notice Check if a token is in transfer cooldown period
    function isInCooldown(uint256 tokenId) external view returns (bool);
    
    /// @notice Get remaining cooldown time for a token
    function getRemainingCooldown(uint256 tokenId) external view returns (uint256);
}
