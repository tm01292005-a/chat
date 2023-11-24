import { BlobServiceClient } from "@azure/storage-blob";

const ACCOUNT_NAME = process.env.NEXT_PUBLIC_AZURE_BLOB_ACCOUNT_NAME || "";
const SAS = process.env.NEXT_PUBLIC_AZURE_BLOB_SAS || "";
const CONTAINER_NAME = process.env.NEXT_PUBLIC_AZURE_BLOB_CONTAINER_NAME || "";
const BASE_URL = `https://${ACCOUNT_NAME}.blob.core.windows.net${SAS}`;

/**
 * Create Container
 */
export const createContainer = async () => {
  const blobServiceClient = new BlobServiceClient(BASE_URL);

  for await (const container of blobServiceClient.listContainers()) {
    if (container.name === CONTAINER_NAME) {
      return;
    }
  }

  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  await containerClient.create();
  console.log(`Created Azure blob container. container=${CONTAINER_NAME} .`);
};

/**
 * Upload Blob
 * @param blobPath blobPath
 * @param fileType fileType
 * @param arrayBuffer arrayBuffer
 */
export const uploadStream = async (
  blobPath: string,
  fileType: string,
  arrayBuffer: ArrayBuffer
) => {
  const blobServiceClient = new BlobServiceClient(BASE_URL);

  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  const blobClient = containerClient.getBlobClient(blobPath);
  const blockBlobClient = blobClient.getBlockBlobClient();

  // SAS有効期限を設定
  let expiresOn = new Date();
  expiresOn.setHours(expiresOn.getHours() + 12);

  const blobOptions = {
    blobHTTPHeaders: { blobContentType: `audio/${fileType}}` },
  };
  const view = new DataView(arrayBuffer);
  const res = await blockBlobClient.upload(view, view.byteLength, blobOptions);

  console.log(`Upload File Successfully: `, res);
};

/**
 * Download Blob
 * @param userId userId
 * @param fileName fileName
 */
export const downloadStream = async (userId: string, fileName: string) => {
  const blobServiceClient = new BlobServiceClient(BASE_URL);

  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  const blobClient = containerClient.getBlobClient(`${userId}/${fileName}`);
  const blockBlobClient = blobClient.getBlockBlobClient();

  const downloadResponse = await blockBlobClient.download(0);
  const downloadedContent = await streamToString(
    downloadResponse.readableStreamBody
  );
  console.log(`Download Successfully: `, downloadedContent);
};

/**
 * Delete Blob
 * @param userId userId
 * @param fileName fileName
 */

export const deleteBlob = async (userId: string, fileName: string) => {
  const blobServiceClient = new BlobServiceClient(BASE_URL);

  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  const blobClient = containerClient.getBlobClient(`${userId}/${fileName}`);
  const blockBlobClient = blobClient.getBlockBlobClient();

  await blockBlobClient.delete();
  console.log(`Delete Successfully: `);
};

async function streamToString(
  readableStream: NodeJS.ReadableStream | undefined
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Array<string> = [];
    readableStream?.on("data", (data) => {
      chunks.push(data.toString());
    });
    readableStream?.on("end", () => {
      resolve(chunks.join(""));
    });
    readableStream?.on("error", reject);
  });
}
