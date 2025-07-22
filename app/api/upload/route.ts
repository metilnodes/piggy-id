import { NextRequest, NextResponse } from 'next/server';
import { pinata } from '@/utils/pinata-config';

// Pinata dedicated gateway
const PINATA_GATEWAY = 'https://olive-familiar-gerbil-797.mypinata.cloud/ipfs/';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting Pinata upload with SDK...');
    
    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadata = JSON.parse(formData.get('metadata') as string);
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    console.log('Uploading image to Pinata...');
    
    // Upload the image file using Pinata SDK using method chaining
    const fileUploadResult = await pinata.upload.public
      .file(file)
      .name(`piggy-id-${metadata.firstName}-${metadata.surname}-${metadata.passportNumber}`);
    
    console.log('Image upload successful:', fileUploadResult.cid);
    
    const imageCid = fileUploadResult.cid;
    const imageUrl = `ipfs://${imageCid}`;
    const imageGatewayUrl = `${PINATA_GATEWAY}${imageCid}`;
    
    // Create NFT metadata
    const nftMetadata = {
      name: `Piggy ID: ${metadata.firstName} ${metadata.surname}`,
      description: `Official Piggy ID for ${metadata.firstName} ${metadata.surname}. Passport: ${metadata.passportNumber}. Minted on ${metadata.mintDate}.`,
      image: imageUrl, // Use gateway URL instead of ipfs:// protocol
      attributes: [
        { trait_type: "First Name", value: metadata.firstName },
        { trait_type: "Surname", value: metadata.surname },
        { trait_type: "Passport Number", value: metadata.passportNumber },
        { trait_type: "Mint Date", value: metadata.mintDate },
        { trait_type: "Hash", value: metadata.uniqueHash }
      ]
    };
    
    console.log('Uploading metadata to Pinata...');
    
    // Upload the metadata JSON using Pinata SDK using method chaining
    const jsonUploadResult = await pinata.upload.public
      .json(nftMetadata)
      .name(`metadata-piggy-id-${metadata.passportNumber}`);
    
    console.log('Metadata upload successful:', jsonUploadResult.cid);
    
    const metadataCid = jsonUploadResult.cid;
    const metadataUrl = `ipfs://${metadataCid}`;
    const metadataGatewayUrl = `${PINATA_GATEWAY}${metadataCid}`;
    
    // Convert URLs using gateway if needed
    const gatewayImageUrl = await pinata.gateways.public.convert(imageCid);
    const gatewayMetadataUrl = await pinata.gateways.public.convert(metadataCid);
    
    return NextResponse.json({
      success: true,
      imageUrl,
      metadataUrl,
      imageGatewayUrl,
      metadataGatewayUrl,
      gatewayImageUrl,  // URL from Pinata SDK
      gatewayMetadataUrl,  // URL from Pinata SDK
      imageCid,
      metadataCid
    });
    
  } catch (error: any) {
    console.error('Error uploading to Pinata:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload to Pinata', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
