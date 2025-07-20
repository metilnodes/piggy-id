// Pinata configuration utilities

export const PINATA_API_URL = "https://api.pinata.cloud"
export const PINATA_GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL || "https://olive-familiar-gerbil-797.mypinata.cloud"

export const pinataConfig = {
  headers: {
    Authorization: `Bearer ${process.env.PINATA_JWT}`,
    "Content-Type": "application/json",
  },
}

export const createPinataMetadata = (name: string, description?: string) => ({
  pinataMetadata: {
    name,
    ...(description && { description }),
  },
  pinataOptions: {
    cidVersion: 1,
  },
})
