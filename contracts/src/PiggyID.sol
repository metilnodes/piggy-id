// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title Interface for PiggyDAO
/// @notice Minimal interface for interacting with PiggyDAO
interface IPiggyDAO {
    function contributePiggy(uint256 amount) external;
}

/// @title PiggyID
/// @notice NFT contract for Piggy ID digital identity cards
contract PiggyID is ERC721URIStorage, Ownable {
    // Type declarations

    // State variables
    uint256 private _nextTokenId;
    string private _baseTokenURI = "https://olive-familiar-gerbil-797.mypinata.cloud/ipfs/";
    mapping(address => bool) private _hasMinted;
    
    // Constants
    address public constant PIGGY_TOKEN = 0xe3CF8dBcBDC9B220ddeaD0bD6342E245DAFF934d;
    address public constant PIGGY_DAO = 0x3076a0c4F44F1Ec229c850380f3Dd970094ca873;
    uint256 public constant MINT_PRICE = 1000000 * 10**18; // 1,000,000 PIGGY tokens
    
    // Events
    event PiggyIDMinted(address indexed owner, uint256 indexed tokenId);

    // Constructor
    /// @notice Initializes the contract setting name, symbol and owner
    constructor() ERC721("Piggy ID", "PIGID") Ownable(msg.sender) {}
    
    // External functions

    /// @notice Mint a new Piggy ID NFT
    /// @param to The address that will own the NFT
    /// @param ipfsHash The IPFS hash for the NFT metadata (without baseURI)
    /// @return The new token ID
    function mintPiggyID(
        address to,
        string memory ipfsHash
    ) external returns (uint256) {
        // Check that the recipient doesn't already have a Piggy ID
        require(!_hasMinted[to], "PiggyID: Address already has a Piggy ID");
        
        // First approve the PiggyDAO to spend the tokens
        IERC20 piggyToken = IERC20(PIGGY_TOKEN);
        require(
            piggyToken.transferFrom(msg.sender, address(this), MINT_PRICE),
            "PiggyID: PIGGY token transfer failed"
        );
        
        // Approve PiggyDAO to take tokens from this contract
        piggyToken.approve(PIGGY_DAO, MINT_PRICE);
        
        // Contribute to the PiggyDAO
        IPiggyDAO(PIGGY_DAO).contributePiggy(MINT_PRICE);
        
        // Mark address as having minted
        _hasMinted[to] = true;
        
        // Mint the NFT
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, ipfsHash);
        
        emit PiggyIDMinted(to, tokenId);
        
        return tokenId;
    }
    
    /// @notice Check if an address already has a Piggy ID
    /// @param account The address to check
    /// @return True if the address already has a Piggy ID
    function hasPiggyID(address account) external view returns (bool) {
        return _hasMinted[account];
    }
    
    /// @notice Get the token URI for a Piggy ID
    /// @param tokenId The ID of the token
    /// @return The token URI
    function getPiggyURI(uint256 tokenId) external view returns (string memory) {
        require(_exists(tokenId), "PiggyID: Token does not exist");
        return tokenURI(tokenId);
    }
    
    /// @notice Set the base URI for all token IDs (owner only)
    /// @param baseURI_ The new base URI
    function setBaseURI(string memory baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
    }
    
    /// @notice Returns the base URI set for all tokens
    /// @return The base URI string
    function baseURI() external view returns (string memory) {
        return _baseTokenURI;
    }
    
    // Internal functions
    
    /// @notice Check if a token exists
    /// @param tokenId The ID of the token
    /// @return True if the token exists
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    
    /// @notice Override _baseURI function to use the custom base URI
    /// @return The base URI string
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
