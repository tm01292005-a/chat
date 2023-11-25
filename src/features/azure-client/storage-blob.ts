"use server";

import { BlobServiceClient, BlobHTTPHeaders } from "@azure/storage-blob";

const ACCOUNT_NAME = process.env.AZURE_BLOB_ACCOUNT_NAME || "";
const SAS = process.env.AZURE_BLOB_SAS || "";
const CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME || "";
const BASE_URL = `https://${ACCOUNT_NAME}.blob.core.windows.net${SAS}`;

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
    const blobServiceClient = new BlobServiceClient(BASE_URL);
    const containerClient =
      blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

    // コンテナが存在しない場合は作成
    await containerClient.createIfNotExists();
    console.log(
      `Created Azure blob container if not exists. container=${CONTAINER_NAME} .`
    );

    // SAS有効期限を設定
    let expiresOn = new Date();
    expiresOn.setHours(expiresOn.getHours() + 12);

    const buffer = Buffer.from(base64, "base64");
    const arrayBuffer = Uint8Array.from(buffer).buffer;
    const view = new DataView(arrayBuffer);

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
    const blobServiceClient = new BlobServiceClient(BASE_URL);
    const containerClient =
      blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

    await blockBlobClient.deleteIfExists();

    console.log(`Deleted Blob Successfully. blobPath=${blobPath}`);
  } catch (error) {
    console.log(`Deleted Blob Failed. blobPath=${blobPath} error=${error}`);
    throw error;
  }
};
