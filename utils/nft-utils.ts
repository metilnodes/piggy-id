// NFT and IPFS utility functions

import { parseAbi, encodeFunctionData } from 'viem';
import { sepolia } from 'viem/chains';

// ABI for PiggyID contract
const PIGGY_ID_ABI = [
  "function mintPiggyID(address to, string memory ipfsHash) external returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function hasPiggyID(address account) external view returns (bool)"
];

// Contract address on Base network
const PIGGY_ID_CONTRACT = "0xfc5f472e7772caedc7d09277120b4dff24fb8ef9";

// PIGGY token contract address and ABI
const PIGGY_TOKEN_ADDRESS = "0xe3CF8dBcBDC9B220ddeaD0bD6342E245DAFF934d";
const PIGGY_TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

// Mint price: 1,000,000 PIGGY tokens
const MINT_PRICE = BigInt("1000000000000000000000000"); // 1,000,000 with 18 decimals

// IPFS Gateway URLs for retrieving files
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/"
];

// Interface for NFT metadata
export interface PiggyIDMetadata {
  name: string;
  description: string;
  image: string;
  attributes: {
    trait_type: string;
    value: string;
  }[];
}

/**
 * Converts a canvas to a Blob
 */
export async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob as Blob);
    }, 'image/png');
  });
}

/**
 * Creates metadata object for Piggy ID NFT
 */
export function createPiggyIDMetadata(
  firstName: string,
  surname: string,
  passportNumber: string,
  imageUrl: string,
  uniqueHash: string
): PiggyIDMetadata {
  const currentDate = new Date();
  const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getFullYear()}`;
  
  return {
    name: `Piggy ID: ${firstName} ${surname}`,
    description: `Official Piggy ID for ${firstName} ${surname}. Passport: ${passportNumber}. Minted on ${formattedDate}.`,
    image: imageUrl,
    attributes: [
      { trait_type: "First Name", value: firstName },
      { trait_type: "Surname", value: surname },
      { trait_type: "Passport Number", value: passportNumber },
      { trait_type: "Mint Date", value: formattedDate },
      { trait_type: "Hash", value: uniqueHash }
    ]
  };
}

/**
 * Upload image to IPFS (implementation dependent on service)
 * This is a placeholder function that would need to be implemented with your preferred IPFS provider
 */
export async function uploadToIPFS(blob: Blob): Promise<string> {
  // This would be implemented with your chosen IPFS provider (Pinata, web3.storage, etc.)
  // For now, this is a placeholder that would return the IPFS hash
  throw new Error("IPFS upload not implemented - requires API key and provider selection");
}

/**
 * Uploads metadata to IPFS
 * This is a placeholder function that would need to be implemented with your preferred IPFS provider
 */
export async function uploadMetadataToIPFS(metadata: PiggyIDMetadata): Promise<string> {
  // This would be implemented with your chosen IPFS provider
  // For now, this is a placeholder that would return the IPFS hash
  throw new Error("IPFS metadata upload not implemented - requires API key and provider selection");
}

/**
 * Result type for minting operation
 */
export interface MintResult {
  success: boolean;
  txHash?: string;
  error?: string;
  metadataUrl?: string;
  imageUrl?: string;
}

/**
 * Checks if the user has sufficient PIGGY token balance and approval
 */
export async function checkPiggyTokenApproval(walletAddress: string): Promise<{
  hasBalance: boolean;
  hasApproval: boolean;
  balance: bigint;
  allowance: bigint;
}> {
  // This function should be implemented with wagmi hooks in the React component
  // Here's the placeholder implementation
  try {
    // These functions would use wagmi's useContractRead hook in actual implementation
    // For a full implementation, you'd need to use readContract from wagmi
    // and implement proper balance and allowance checks
    return {
      hasBalance: false, // Will be set by actual balance check
      hasApproval: false, // Will be set by actual allowance check
      balance: BigInt(0),
      allowance: BigInt(0)
    };
  } catch (error) {
    console.error("Error checking token approval:", error);
    return {
      hasBalance: false,
      hasApproval: false,
      balance: BigInt(0),
      allowance: BigInt(0)
    };
  }
}

/**
 * Approves the PiggyID contract to spend PIGGY tokens
 */
export async function approvePiggyTokens(): Promise<{
  success: boolean;
  error?: string;
  txHash?: string;
}> {
  try {
    // This would use wagmi's useContractWrite hook in actual implementation
    // Return placeholder for now
    return {
      success: false,
      error: "This function needs to be implemented with wagmi hooks"
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Mints a Piggy ID NFT
 */
export async function mintPiggyIDNFT(
  metadataURI: string,
  walletAddress: string
): Promise<MintResult> {
  try {
    // Validate wallet address
    if (!walletAddress) {
      throw new Error("No wallet connected");
    }
    
    // Extract the IPFS hash from the metadata URI
    // If the URI is already just the hash, this will still work
    let ipfsHash = metadataURI;
    if (metadataURI.startsWith('ipfs://')) {
      ipfsHash = metadataURI.replace('ipfs://', '');
    } else if (metadataURI.includes('/ipfs/')) {
      ipfsHash = metadataURI.split('/ipfs/')[1];
    }
    
    // This function should be implemented with wagmi hooks in the React component
    // For a full implementation, you'd need to use:
    // 1. useContractWrite hook to approve PIGGY tokens
    // 2. useContractWrite hook to call mintPiggyID
    // 3. useWaitForTransaction to wait for transactions
    
    // For now, we'll return a placeholder
    return {
      success: false,
      error: "This function needs to be implemented with wagmi hooks. Call mintPiggyID on contract 0xfc5f472e7772caedc7d09277120b4dff24fb8ef9 with arguments: [walletAddress, ipfsHash]",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
