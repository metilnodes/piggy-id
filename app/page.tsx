"use client"

import type React from "react"
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Upload, Zap, Wallet } from "lucide-react"
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useContractRead, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { canvasToBlob, createPiggyIDMetadata } from '@/utils/nft-utils'

// Type definitions
type MintingStep = 'idle' | 'uploading' | 'wallet_required' | 'approval_required' | 'minting' | 'complete'

interface MintStatus {
  success: boolean
  pending: boolean
  txHash?: string
  ipfsHash?: string
  tokenId?: string
  error?: string
  message?: string
}

// Contract addresses and ABIs
const PIGGY_TOKEN_ADDRESS = "0xe3CF8dBcBDC9B220ddeaD0bD6342E245DAFF934d";
const PIGGY_ID_CONTRACT = "0x7FA5212be2b53A0bF3cA6b06664232695625F108";
const MINT_PRICE = BigInt("1000000000000000000000000"); // 1,000,000 PIGGY tokens

// ABI for PiggyID contract
const PIGGY_ID_ABI = [
  {
    name: "mintPiggyID",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "ipfsHash", type: "string" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }]
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }]
  },
  {
    name: "hasPiggyID",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }]
  }
];

// PIGGY token ABI (ERC20)
const PIGGY_TOKEN_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  }
];

const PiggyIdGenerator = () => {
  // Get Pinata gateway URL from environment variable
  const pinataGatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://olive-familiar-gerbil-797.mypinata.cloud'

  // Header component with wallet connection
  const Header = () => (
    <header className="fixed top-0 right-0 p-4 z-50">
      <div className="cyber-button">
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            mounted,
          }) => {
            const ready = mounted;
            const connected = ready && account && chain;

            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  style: {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <button
                        onClick={openConnectModal}
                        className="bg-black border border-pink-500 text-pink-500 font-mono text-sm px-4 py-2 rounded hover:bg-pink-500 hover:text-black transition-colors"
                      >
                        CONNECT WALLET
                      </button>
                    );
                  }

                  if (chain.unsupported) {
                    return (
                      <button 
                        onClick={openChainModal}
                        className="bg-black border border-red-500 text-red-500 font-mono text-sm px-4 py-2 rounded hover:bg-red-500 hover:text-black transition-colors"
                      >
                        WRONG NETWORK
                      </button>
                    );
                  }

                  return (
                    <div className="flex gap-2">
                      <button
                        onClick={openChainModal}
                        className="bg-black border border-pink-500 text-pink-500 font-mono text-xs px-3 py-1 rounded"
                      >
                        {chain.name}
                      </button>

                      <button 
                        onClick={openAccountModal}
                        className="bg-black border border-pink-500 text-pink-500 font-mono text-xs px-3 py-1 rounded hover:bg-pink-500 hover:text-black transition-colors"
                      >
                        {account.displayName}
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  )

  // State for form inputs and UI
  const [firstName, setFirstName] = useState('')
  const [surname, setSurname] = useState('')
  const [avatarImage, setAvatarImage] = useState<string | null>(null)
  const [passportNumber, setPassportNumber] = useState("")
  const [isMinting, setIsMinting] = useState(false)
  const [mintingStep, setMintingStep] = useState<MintingStep>('idle')
  const [mintButtonText, setMintButtonText] = useState<string>('MINT AS NFT')
  const [mintStatus, setMintStatus] = useState<MintStatus | null>(null)
  const [uploadedMetadata, setUploadedMetadata] = useState<{
    metadataUrl: string;
    imageUrl: string;
    metadataGatewayUrl?: string;
    imageGatewayUrl?: string;
  } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { address, isConnected } = useAccount()

  // Read contract data for PIGGY token balance and allowance
  const { data: piggyBalance, isError: balanceError, error: balanceErrorData } = useContractRead({
    address: PIGGY_TOKEN_ADDRESS as `0x${string}`,
    abi: PIGGY_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address
    }
  })
  
  // Debug logging for PIGGY balance
  useEffect(() => {
    if (address) {
      console.log('Connected wallet address:', address)
      console.log('PIGGY_TOKEN_ADDRESS:', PIGGY_TOKEN_ADDRESS)
      console.log('PIGGY balance data:', piggyBalance)
      if (balanceError) {
        console.error('PIGGY balance error:', balanceErrorData)
      }
    }
  }, [address, piggyBalance, balanceError, balanceErrorData])

  const { data: piggyAllowance } = useContractRead({
    address: PIGGY_TOKEN_ADDRESS as `0x${string}`,
    abi: PIGGY_TOKEN_ABI,
    functionName: 'allowance',
    args: address ? [address as `0x${string}`, PIGGY_ID_CONTRACT as `0x${string}`] : undefined,
    query: {
      enabled: !!address
    }
  })

  // Check if user already has a Piggy ID
  const { data: hasPiggyID } = useContractRead({
    address: PIGGY_ID_CONTRACT as `0x${string}`,
    abi: PIGGY_ID_ABI,
    functionName: 'hasPiggyID',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address
    }
  })

  // Contract write hooks
  const { writeContractAsync: writeApproveTokens, isPending: isApproveLoading, data: approveData } = useWriteContract()

  // Wait for approve transaction
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveData,
    query: {
      enabled: !!approveData
    }
  })

  // Mint NFT hook
  const { writeContractAsync: writeMintNFT, isPending: isMintLoading, data: mintData } = useWriteContract()

  // Wait for mint transaction
  const { isLoading: isMintConfirming, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({
    hash: mintData,
    query: {
      enabled: !!mintData
    }
  })

  // Handle opening and initializing the mint modal
  const handleOpenMintModal = () => {
    setIsMinting(true);
    if (!passportNumber) {
      setPassportNumber(generatePassportNumber()); // Initialize with a random passport number if empty
    }
  }

  // Generate random passport number on first render
  useEffect(() => {
    if (!passportNumber) {
      setPassportNumber(generatePassportNumber());
    }
  }, []);

  // Add font loading
  useEffect(() => {
    const font = new FontFace("TT Rounds Neue Trl Cmd", "url(/fonts/tt-rounds-neue-trl-cmd.woff2)")
    font
      .load()
      .then(() => {
        document.fonts.add(font)
      })
      .catch(() => {
        console.log("Font failed to load, using fallback")
      })
  }, [])

  const generateIdCard = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Generate unique hash for this ID
    const uniqueHash = generateUniqueHash()

    // Get current date formatted
    const currentDate = new Date()
    const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getFullYear()}`

    const backgroundImg = new Image()
    backgroundImg.crossOrigin = "anonymous"
    backgroundImg.onload = () => {
      // Set canvas size to match background image
      canvas.width = backgroundImg.width
      canvas.height = backgroundImg.height

      // Draw background
      ctx.drawImage(backgroundImg, 0, 0)

      // Set text properties with custom font
      ctx.fillStyle = "#000000"
      ctx.font = "258px 'TT Rounds Neue Trl Cmd', Arial, sans-serif"
      ctx.textAlign = "left"

      // First location - Main card area (based on first image)
      if (surname) {
        ctx.fillText(surname.toUpperCase(), 2745, 1660) // Ser-name position
      }

      if (firstName) {
        ctx.fillText(firstName.toUpperCase(), 2745, 2040) // First Name position
      }

      // Add Passport Number (P<XXX...)
      ctx.font = "196px 'TT Rounds Neue Trl Cmd', Arial, sans-serif"
      ctx.fillText(`P<${passportNumber}`, 4545, 1300)

      // Add current date (replacing hardcoded Nov 24 2024)
      ctx.font = "258px 'TT Rounds Neue Trl Cmd', Arial, sans-serif"
      ctx.fillText(formattedDate, 2745, 3750)

      // Second location - Bottom section (based on second image)
      ctx.font = "231px 'TT Rounds Neue Trl Cmd', Arial, sans-serif"

      if (surname && firstName) {
        // Very strict position limits
        const startX = 750
        const maxX = canvas.width - 390 // Very strict boundary
        const maxWidth = maxX - startX // Maximum text width

        // Names are already limited to 12 characters during input
        const shortFirstName = firstName
        const shortSurname = surname

        // Initial number of "<" symbols
        const nameLength = shortFirstName.length + shortSurname.length
        const baseRepeats = 24 // Reduced to make room for hash
        let dynamicRepeats = Math.max(0, baseRepeats - nameLength) // Minimum 0 symbols

        // Create text and check its width
        let bottomText = `${shortFirstName.toUpperCase()} < ${shortSurname.toUpperCase()} < AGENT < ${uniqueHash} < OINK ${"<".repeat(dynamicRepeats)}`
        let textWidth = ctx.measureText(bottomText).width

        // Reduce number of "<" symbols until text fits
        while (textWidth > maxWidth && dynamicRepeats > 0) {
          dynamicRepeats--
          bottomText = `${shortFirstName.toUpperCase()} < ${shortSurname.toUpperCase()} < AGENT < ${uniqueHash} < OINK ${"<".repeat(dynamicRepeats)}`
          textWidth = ctx.measureText(bottomText).width
        }

        // If still doesn't fit, reduce hash size or remove decorations
        if (textWidth > maxWidth) {
          const shortHash = uniqueHash.substring(0, 6)
          bottomText = `${shortFirstName.toUpperCase()} < ${shortSurname.toUpperCase()} < AGENT < ${shortHash} < OINK`
        }

        ctx.fillText(bottomText, startX, 4590)
      }

      // Draw avatar if uploaded
      if (avatarImage) {
        const avatarImg = new Image()
        avatarImg.crossOrigin = "anonymous"
        avatarImg.onload = () => {
          // Avatar position and size (rectangular)
          const avatarX = 880
          const avatarY = 1538
          const avatarWidth = 1650
          const avatarHeight = 1650

          // Create rectangular clipping path
          ctx.save()
          ctx.beginPath()
          ctx.rect(avatarX, avatarY, avatarWidth, avatarHeight)
          ctx.clip()

          // Draw avatar image
          ctx.drawImage(avatarImg, avatarX, avatarY, avatarWidth, avatarHeight)
          ctx.restore()
        }
        avatarImg.src = avatarImage
      }
    }
    backgroundImg.src = "/background-id.png"
  }

  const downloadIdCard = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Создаем новый canvas для уменьшенной версии
    const smallCanvas = document.createElement("canvas")
    const smallCtx = smallCanvas.getContext("2d")
    if (!smallCtx) return

    // Устанавливаем размер в два раза меньше
    smallCanvas.width = canvas.width / 2
    smallCanvas.height = canvas.height / 2

    // Рисуем уменьшенную версию
    smallCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, smallCanvas.width, smallCanvas.height)

    const link = document.createElement("a")
    link.download = `piggy-id-${firstName}-${surname}-${passportNumber}.png`
    link.href = smallCanvas.toDataURL()
    link.click()
  }

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase()
    if (value.length <= 12) {
      setFirstName(value)
    }
  }

  const handleSurnameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase()
    if (value.length <= 12) {
      setSurname(value)
    }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Function to generate random passport number
  const generatePassportNumber = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 7; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  // Auto-generate passport number on component mount
  useEffect(() => {
    if (!passportNumber) {
      setPassportNumber(generatePassportNumber());
    }
  }, []);

  // Handle passport number change (user override)
  const handlePassportNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase()
    if (value.length <= 7) {
      setPassportNumber(value)
    }
  }

  // Generate a unique hash based on user data
  const generateUniqueHash = () => {
    const baseString = `${firstName}${surname}${passportNumber}${Date.now()}`

    // Simple hash algorithm
    let hash = 0
    for (let i = 0; i < baseString.length; i++) {
      const char = baseString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }

    return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase()
  }

  // Handle NFT minting with step-by-step workflow
  const mintAsNFT = async () => {
    if (!firstName || !surname || !canvasRef.current) {
      return;
    }

    try {
      // Start minting process
      setIsMinting(true);
      setMintStatus({ success: false, pending: true });
      
      // Check if wallet is connected first (needed to check balance)
      if (!address) {
        // If no wallet is connected, update step to prompt for connection
        setMintingStep('wallet_required');
        return; // Stop here until wallet is connected
      }
      
      // Check if user already has a PiggyID
      if (hasPiggyID) {
        setMintStatus({
          success: false,
          pending: false,
          error: 'You already have a PiggyID NFT minted to this address'
        });
        setMintingStep('idle');
        setIsMinting(false);
        return;
      }
      
      // Check if user has enough PIGGY tokens before uploading to Pinata
      const hasBalance = (piggyBalance as bigint || BigInt(0)) >= MINT_PRICE;
      if (!hasBalance) {
        setMintStatus({
          success: false,
          pending: false,
          error: 'Insufficient PIGGY token balance. You need 1,000,000 PIGGY tokens to mint.'
        });
        setMintingStep('idle');
        setIsMinting(false);
        return;
      }
      
      // Now proceed with uploading to Pinata
      setMintingStep('uploading');

      // Generate unique hash for metadata
      const uniqueHash = generateUniqueHash();

      // Get the current date formatted for metadata
      const currentDate = new Date();
      const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getFullYear()}`;

      // Step 1: Upload to Pinata
      // Convert canvas to blob
      const blob = await canvasToBlob(canvasRef.current);

      // Create a File object from the blob
      const file = new File([blob], `piggy-id-${passportNumber}.png`, { type: 'image/png' });

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);

      // Create metadata
      const metadata = {
        firstName,
        surname,
        passportNumber,
        mintDate: formattedDate,
        uniqueHash
      };
      formData.append('metadata', JSON.stringify(metadata));

      console.log('Uploading to Pinata...');

      // Upload to Pinata through our API route
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        console.error('Upload failed:', uploadResult);
        throw new Error(uploadResult.error || 'Failed to upload to IPFS');
      }

      console.log('Upload successful:', uploadResult);

      // Store upload result for later use, including gateway URLs
      const pinataGatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://olive-familiar-gerbil-797.mypinata.cloud'
      setUploadedMetadata({
        metadataUrl: uploadResult.metadataUrl,
        imageUrl: uploadResult.imageUrl,
        metadataGatewayUrl: `${pinataGatewayUrl}/ipfs/${uploadResult.metadataUrl.split('/ipfs/')[1]}`,
        imageGatewayUrl: `${pinataGatewayUrl}/ipfs/${uploadResult.imageUrl.split('/ipfs/')[1]}`
      });

      // Step 2: Check if wallet is connected
      if (!address) {
        // If no wallet is connected, update step to prompt for connection
        setMintingStep('wallet_required')
        return // Stop here until wallet is connected
      }

      // If wallet is already connected, proceed to minting
      await completeMinting(uploadResult.metadataUrl, uploadResult.imageUrl)

    } catch (error: any) {
      console.error('Minting error:', error)
      setMintStatus({
        success: false,
        pending: false,
        error: error.message || 'Unknown error occurred'
      })
      setMintingStep('idle')
      setIsMinting(false)
    }
  }

  // Effect to watch for approval success and trigger minting after approval
  useEffect(() => {
    const handleApprovalSuccess = async () => {
      if (isApproveSuccess && mintingStep === 'approval_required' && uploadedMetadata && address) {
        // After successful approval, proceed to mint
        setMintingStep('minting');

        // Extract IPFS hash from metadata URI
        let ipfsHash = uploadedMetadata.metadataUrl
        if (ipfsHash.startsWith('ipfs://')) {
          ipfsHash = ipfsHash.replace('ipfs://', '')
        } else if (ipfsHash.includes('/ipfs/')) {
          ipfsHash = ipfsHash.split('/ipfs/')[1]
        }

        // Call mint function with address and IPFS hash
        try {
          await writeMintNFT({
            address: PIGGY_ID_CONTRACT as `0x${string}`,
            abi: PIGGY_ID_ABI,
            functionName: 'mintPiggyID',
            args: [address as `0x${string}`, ipfsHash]
          })
        } catch (error: any) {
          console.error('Error minting NFT:', error)
          setMintStatus({
            success: false,
            pending: false,
            error: 'Failed to mint NFT. Please try again.'
          })
          setMintingStep('idle')
          setIsMinting(false)
        }
      }
    }

    handleApprovalSuccess()
  }, [isApproveSuccess, mintingStep, uploadedMetadata, address, writeMintNFT, setMintStatus, setMintingStep, setIsMinting])

  // Effect to handle mint success
  useEffect(() => {
    if (isMintSuccess && mintingStep === 'minting' && uploadedMetadata) {
      setMintStatus({
        success: true,
        pending: false,
        txHash: mintData,
        ipfsHash: uploadedMetadata.metadataUrl.split('/ipfs/')[1]
      })
      setMintingStep('complete')
      setIsMinting(false)
    }
  }, [isMintSuccess, mintingStep, uploadedMetadata, mintData, setMintStatus, setMintingStep, setIsMinting])

  // Effect to handle transaction loading states
  useEffect(() => {
    // Show loading state while transactions are pending
    if (isApproveLoading || isApproveConfirming) {
      setMintStatus({
        success: false,
        pending: true,
        message: 'Approving PIGGY tokens...'
      })
    } else if (isMintLoading || isMintConfirming) {
      setMintStatus({
        success: false,
        pending: true,
        message: 'Minting PiggyID NFT...'
      })
    }

    // Update button text based on loading state
    if (isApproveLoading || isApproveConfirming || isMintLoading || isMintConfirming) {
      setMintButtonText('Transaction in progress...')
    }
  }, [isApproveLoading, isApproveConfirming, isMintLoading, isMintConfirming, setMintStatus, setMintButtonText])

  // Complete the minting process
  const completeMinting = useCallback(async (metadataUri: string, imageUrl: string) => {
    try {
      // Validate connection and ownership
      if (!address) {
        throw new Error('Please connect your wallet first')
      }

      // Check if user already has a PiggyID
      if (hasPiggyID) {
        throw new Error('You already have a PiggyID')
      }

      // Check if user has enough PIGGY tokens
      const hasBalance = (piggyBalance as bigint || BigInt(0)) >= MINT_PRICE

      // If insufficient balance, show error
      if (!hasBalance) {
        setMintStatus({
          success: false,
          pending: false,
          error: 'Insufficient PIGGY token balance. You need 1,000,000 PIGGY tokens to mint.'
        })
        setMintingStep('idle')
        setIsMinting(false)
        return
      }

      // Check if tokens are approved
      const allowance = piggyAllowance as bigint || BigInt(0)
      const hasApproval = allowance >= MINT_PRICE

      // If not approved, request approval
      if (!hasApproval) {
        setMintingStep('approval_required')

        // Request token approval (this will trigger the effect above when successful)
        try {
          await writeApproveTokens({
            address: PIGGY_TOKEN_ADDRESS as `0x${string}`,
            abi: PIGGY_TOKEN_ABI,
            functionName: 'approve',
            args: [PIGGY_ID_CONTRACT as `0x${string}`, MINT_PRICE]
          })
        } catch (error: any) {
          console.error('Error approving tokens:', error)
          setMintStatus({
            success: false,
            pending: false,
            error: 'Failed to approve tokens: ' + (error.message || 'Unknown error')
          })
          setMintingStep('idle')
          setIsMinting(false)
          return
        }

        // Store metadata for later use in effects
        setUploadedMetadata({
          metadataUrl: metadataUri,
          imageUrl: imageUrl
        })
      } else {
        // If already approved, proceed to minting
        setMintingStep('minting')

        // Extract IPFS hash from metadata URI
        let ipfsHash = metadataUri
        if (ipfsHash.startsWith('ipfs://')) {
          ipfsHash = ipfsHash.replace('ipfs://', '')
        } else if (ipfsHash.includes('/ipfs/')) {
          ipfsHash = ipfsHash.split('/ipfs/')[1]
        }

        // Call mint function with address and IPFS hash
        await writeMintNFT({
          address: PIGGY_ID_CONTRACT as `0x${string}`,
          abi: PIGGY_ID_ABI,
          functionName: 'mintPiggyID',
          args: [address as `0x${string}`, ipfsHash]
        })

        // Store metadata for later use in effects
        setUploadedMetadata({
          metadataUrl: metadataUri,
          imageUrl: imageUrl
        })
      }

    } catch (error: any) {
      console.error('Minting completion error:', error)
      setMintStatus({
        success: false,
        pending: false,
        error: error.message || 'Unknown error occurred'
      })
      setMintingStep('idle')
      setIsMinting(false)
    }
  }, [address, hasPiggyID, piggyBalance, piggyAllowance, writeApproveTokens, writeMintNFT, setMintStatus, setMintingStep, setIsMinting, setUploadedMetadata]);

  // Effect to handle wallet connection
  useEffect(() => {
    const handleWalletConnection = async () => {
      // If we're in wallet_required step and now have an address and uploaded metadata
      if (mintingStep === 'wallet_required' && address && uploadedMetadata) {
        try {
          await completeMinting(uploadedMetadata.metadataUrl, uploadedMetadata.imageUrl)
        } catch (error) {
          console.error('Error after wallet connection:', error)
        }
      }
    }
    
    handleWalletConnection()
  }, [address, mintingStep, uploadedMetadata, completeMinting])

  // Effect to update ID card when inputs change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      generateIdCard()
    }, 100) // Small delay for better performance

    return () => clearTimeout(timeoutId)
  }, [firstName, surname, avatarImage, passportNumber, generateIdCard])

  // uploadedMetadata state moved to the top of the component

  return (
    <div className="min-h-screen grid place-items-center bg-black text-white overflow-hidden">
      <Header />
      <div className="grid-background"></div>
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-between items-center mb-6">
            <div className="w-20 h-20 border-2 border-pink-500 rounded-2xl flex items-center justify-center neon-glow">
              <img src="/piggy-logo.png" alt="Piggy Logo" className="w-12 h-12 object-contain" />
            </div>
          </div>
          <h1 className="text-6xl font-bold mb-4 glitch neon-text" data-text="PIGGY ID">
            PIGGY ID
          </h1>
          <p className="text-pink-400 text-lg font-mono uppercase tracking-wider">OINKGENERATOR</p>
          {address && (
            <p className="text-green-400 text-sm font-mono mt-2">
              <span className="text-pink-400">{">"}.</span> OINK DETECTED: {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Form Section */}
          <Card className="cyber-card">
            <CardHeader className="border-b border-pink-500">
              <CardTitle className="text-pink-500 font-mono uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-5 h-5" />
                AGENT REGISTRATION
              </CardTitle>
              <CardDescription className="text-pink-400 font-mono">{">"} INITIALIZE YOUR PIGGY ID</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-pink-500 font-mono uppercase tracking-wider">
                  {">"} FIRST NAME
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={handleFirstNameChange}
                  placeholder="OINKER NAME (MAX 12 CHARS)"
                  className="cyber-input"
                  maxLength={12}
                />
                <div className="text-xs text-pink-400 font-mono">{firstName.length}/12 CHARACTERS</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="surname" className="text-pink-500 font-mono uppercase tracking-wider">
                  {">"} SER-NAME
                </Label>
                <Input
                  id="surname"
                  value={surname}
                  onChange={handleSurnameChange}
                  placeholder="SNOUT NAME (MAX 12 CHARS)"
                  className="cyber-input"
                  maxLength={12}
                />
                <div className="text-xs text-pink-400 font-mono">{surname.length}/12 CHARACTERS</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passportNumber" className="text-pink-500 font-mono uppercase tracking-wider">
                  {">"} PASSPORT NUMBER
                </Label>
                <div>
                  <Input
                    id="passportNumber"
                    value={passportNumber}
                    onChange={handlePassportNumberChange}
                    placeholder="PASSPORT ID (7 CHARS)"
                    className="cyber-input"
                    maxLength={7}
                  />
                </div>
                <div className="text-xs text-pink-400 font-mono">{passportNumber.length}/7 CHARACTERS</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar" className="text-pink-500 font-mono uppercase tracking-wider">
                  {">"} AGENT PHOTO
                </Label>
                <div className="flex items-center">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 cyber-button"
                    variant="outline"
                  >
                    <Upload className="w-4 h-4" />
                    {avatarImage ? "CHANGE PHOTO" : "UPLOAD PHOTO"}
                  </Button>
                  <input
                    type="file"
                    id="avatar"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  onClick={downloadIdCard}
                  className="flex-1 flex items-center justify-center gap-2 cyber-button"
                  variant="outline"
                  disabled={!firstName || !surname}
                >
                  <Download className="w-4 h-4" />
                  DOWNLOAD ID
                </Button>
                <Button
                  onClick={mintAsNFT}
                  className="flex-1 flex items-center justify-center gap-2 cyber-button glow-button"
                  disabled={!firstName || !surname || isMinting}
                >
                  <Wallet className="w-4 h-4" />
                  {isMinting ? "PROCESSING..." : "MINT AS NFT"}
                </Button>
              </div>
              
              {/* Wallet connection prompt - only shown when needed */}
              {mintingStep === 'wallet_required' && (
                <div 
                  onClick={() => {
                    const button = document.querySelector('.cyber-wallet-prompt button') as HTMLElement;
                    if (button) button.click();
                  }}
                  className="mt-4 p-4 border border-pink-500 rounded-md bg-black/50 cursor-pointer hover:bg-pink-950/30 transition-colors"
                >
                  <p className="text-pink-400 font-mono mb-2">{">"} CONNECT WALLET TO CONTINUE MINTING</p>
                  <div className="cyber-button w-full cyber-wallet-prompt hidden">
                    <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
                  </div>
                </div>
              )}

              {/* Mint Status Display */}
              {mintStatus && (
                <div className={`mt-4 p-4 border ${mintStatus.success ? 'border-green-500' : 'border-red-500'} rounded-md bg-black/50`}>
                  <div className="mt-4">
                    <p className="text-lg font-bold font-mono text-center">
                    {">"} {mintStatus.pending ? 'MINTING IN PROGRESS...' : (mintStatus.success ? 'MINTING SUCCESSFUL' : 'MINTING FAILED')}
                    </p>
                    {mintStatus.txHash && (
                      <p className="text-sm text-center text-pink-400 font-mono mt-2">
                        TX: <a href={`https://basescan.org/tx/${mintStatus.txHash}`} target="_blank" rel="noopener noreferrer" className="text-pink-300 hover:text-pink-200 underline">{mintStatus.txHash.slice(0,10)}...{mintStatus.txHash.slice(-8)}</a>
                      </p>
                    )}
                    {mintStatus.ipfsHash && (
                      <p className="text-sm text-center text-pink-400 font-mono mt-2">
                        METADATA: <a href={`${pinataGatewayUrl}/ipfs/${mintStatus.ipfsHash}`} target="_blank" rel="noopener noreferrer" className="text-pink-300 hover:text-pink-200 underline">IPFS Link</a>
                      </p>
                    )}
                  {mintStatus.error && (
                    <p className="text-red-400 font-mono text-sm mt-1">
                      ERROR: {mintStatus.error}
                    </p>
                  )}
                </div>
              </div>
              )}
            </CardContent>
          </Card>

          {/* Preview Section */}
          <Card className="cyber-card">
            <CardHeader className="border-b border-pink-500">
              <CardTitle className="text-pink-500 font-mono uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-5 h-5" />
                LIVE PREVIEW
              </CardTitle>
              <CardDescription className="text-pink-400 font-mono">{">"} PIGGY ID LOADING... STANDBY</CardDescription>
            </CardHeader>
            <CardContent className="py-6">
              <div className="cyber-screen-container">
                <div className="cyber-screen">
                  <canvas 
                    ref={canvasRef} 
                    className="w-full h-auto" 
                    style={{ display: 'block', maxWidth: '100%', height: 'auto' }} 
                  />
                </div>
              </div>
              <p className="text-pink-400 font-mono text-sm text-center mt-2">
                {">"} ENTER YOUR NAME TO SPAWN OINKDENTITY
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default PiggyIdGenerator
