"use server";
import "server-only";

import { BlobHTTPHeaders } from "@azure/storage-blob";

import { base64ToArrayBuffer } from "@/features/audio/audio-services/utils";
import { BlobStorageContainer } from "@/features/common/storage-blobs";

/**
 * Upload Base64 As Blob
 * @param blobPath blobPath
 * @param fileType fileType
 * @param base64 string
 * @throws An error if the blob fails to upload.
 */
export const uploadBase64AsBlob = async (
  blobPath: string,
  fileType: string,
  base64: string
) => {
  try {
    const container = await BlobStorageContainer.getInstance().getContainer();
    const blockBlobClient = container.getBlockBlobClient(blobPath);

    const view = new DataView(base64ToArrayBuffer(base64));
    const headers: BlobHTTPHeaders = {
      blobContentType: `audio/${fileType}`,
    };
    await blockBlobClient.upload(view, view.byteLength, {
      blobHTTPHeaders: headers,
    });

    console.log(`Upload Blob Successfully. blobPath=${blobPath}`);
  } catch (error) {
    console.log(`Upload Blob Failed. blobPath=${blobPath} error=${error}`);
    throw error;
  }
};

/**
 * Delete Blob
 * @param blobPath - blobPath
 * @throws If the deletion fails, an error is thrown.
 */
export const deleteBlob = async (blobPath: string) => {
  try {
    const container = await BlobStorageContainer.getInstance().getContainer();
    const blockBlobClient = container.getBlockBlobClient(blobPath);

    await blockBlobClient.deleteIfExists();

    console.log(`Deleted Blob Successfully. blobPath=${blobPath}`);
  } catch (error) {
    console.log(`Deleted Blob Failed. blobPath=${blobPath} error=${error}`);
    throw error;
  }
};
