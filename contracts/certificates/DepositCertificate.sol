// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IDepositCertificate.sol";

/**
 * @title DepositCertificate
 * @dev NFT contract representing deposit certificates for saving plans
 * @notice Each deposit is represented by a unique NFT certificate
 */
contract DepositCertificate is ERC721, ERC721Enumerable, AccessControl, IDepositCertificate {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Mapping from deposit ID to token ID (they are the same in this implementation)
    mapping(uint256 => bool) private _depositExists;
    
    string private _baseTokenURI;

    /**
     * @dev Constructor sets the NFT name, symbol and grants roles
     * @param name The name of the NFT collection
     * @param symbol The symbol of the NFT collection
     */
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @dev Mint a certificate NFT to represent a deposit
     * @param to The address that will own the certificate
     * @param depositId The unique deposit ID
     * @notice Only addresses with MINTER_ROLE can call this function
     * @notice The deposit ID is used as the NFT token ID
     */
    function mintCertificate(address to, uint256 depositId) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(!_depositExists[depositId], "Certificate already exists for this deposit");
        require(to != address(0), "Cannot mint to zero address");
        
        _depositExists[depositId] = true;
        _safeMint(to, depositId);
        return depositId; // tokenId is the same as depositId
    }

    /**
     * @dev Burn a certificate NFT when deposit is closed
     * @param depositId The deposit ID whose certificate will be burned
     * @notice Only addresses with MINTER_ROLE can call this function
     */
    function burnCertificate(uint256 depositId) external onlyRole(MINTER_ROLE) {
        require(_depositExists[depositId], "Certificate does not exist");
        
        _depositExists[depositId] = false;
        _burn(depositId);
    }

    /**
     * @dev Check if a certificate exists for a given deposit ID
     * @param depositId The deposit ID to check
     * @return True if certificate exists, false otherwise
     */
    function exists(uint256 depositId) external view returns (bool) {
        return _depositExists[depositId];
    }

    /**
     * @dev Set the base URI for token metadata
     * @param baseTokenURI The base URI to set
     * @notice Only addresses with DEFAULT_ADMIN_ROLE can call this function
     */
    function setBaseURI(string memory baseTokenURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = baseTokenURI;
    }

    /**
     * @dev Returns the base URI for tokens
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Override to handle enumerable extension
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override to handle enumerable extension
     */
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    /**
     * @dev Override required by Solidity for interface support
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl, IERC165)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}