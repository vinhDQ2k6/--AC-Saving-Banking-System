// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for testing the saving bank system
 * @notice This is a test token with 6 decimals like real USDC
 * @dev Only for development and testing purposes
 */
contract MockUSDC is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    uint8 private _decimals;

    /**
     * @dev Constructor sets token name, symbol, and initial supply
     * @notice Creates a mock USDC with 6 decimals and initial supply for testing
     */
    constructor() ERC20("Mock USDC", "USDC") {
        _decimals = 6; // USDC has 6 decimals
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        
        // Mint initial supply of 1 million USDC for testing
        _mint(msg.sender, 1_000_000 * 10**_decimals);
    }

    /**
     * @dev Override decimals to return 6 (like real USDC)
     */
    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint new tokens - only for testing purposes
     * @param to Address to mint tokens to
     * @param amount Amount to mint (in wei - considering 6 decimals)
     * @notice Only addresses with MINTER_ROLE can call this function
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "Cannot mint to zero address");
        _mint(to, amount);
    }

    /**
     * @dev Mint tokens to multiple addresses - useful for testing
     * @param recipients Array of addresses to mint to
     * @param amounts Array of amounts to mint to each address
     * @notice Arrays must have the same length
     */
    function mintBatch(address[] calldata recipients, uint256[] calldata amounts) 
        external 
        onlyRole(MINTER_ROLE) 
    {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty arrays not allowed");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Cannot mint to zero address");
            _mint(recipients[i], amounts[i]);
        }
    }

    /**
     * @dev Burn tokens from caller's balance - useful for testing
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _burn(msg.sender, amount);
    }

    /**
     * @dev Burn tokens from specified address (with allowance) - useful for testing
     * @param from Address to burn tokens from
     * @param amount Amount to burn
     */
    function burnFrom(address from, uint256 amount) external {
        uint256 currentAllowance = allowance(from, msg.sender);
        require(currentAllowance >= amount, "Burn amount exceeds allowance");
        
        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
    }

    /**
     * @dev Utility function to get formatted amount string
     * @param amount Raw amount in wei
     * @return Formatted string with 2 decimal places
     */
    function formatAmount(uint256 amount) external view returns (string memory) {
        uint256 dollars = amount / 10**_decimals;
        uint256 cents = (amount % 10**_decimals) / 10**(_decimals - 2);
        
        return string(abi.encodePacked(
            _toString(dollars),
            ".",
            cents < 10 ? "0" : "",
            _toString(cents),
            " USDC"
        ));
    }

    /**
     * @dev Internal function to convert uint to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}