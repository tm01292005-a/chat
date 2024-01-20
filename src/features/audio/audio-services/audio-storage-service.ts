"use server";
import "server-only";
import { BlobStorageContainer } from "@/features/common/storage-blobs";

/**
 * Upload blob.
 * @param blobPath - blobPath
 * @param buf - buffer
 * @param blockId - blockId
 * @param blockList - blockList
 * @param latestflag - latestflag
 * @param chunkNumber - chunkNumber
 *
 */
export const uploadBlob = async (
  blobPath: string,
  buf: Buffer,
  blockId: string,
  blockList: Array<string>,
  latestflag: boolean,
  chunkNumber: string
) => {
  try {
    const container = await BlobStorageContainer.getInstance().getContainer();
    const blockBlobClient = container.getBlockBlobClient(blobPath);
    await blockBlobClient.stageBlock(blockId, buf, buf.byteLength);

    if (latestflag) {
      await blockBlobClient.commitBlockList(blockList);
      console.log(`Upload Blob Successfully. blobPath=${blobPath}`);
    } else {
      console.debug(
        `Upload Blob Chunk Successfully. blobPath=${blobPath} chunk=${chunkNumber}`
      );
    }
  } catch (error) {
    console.error(
      `Upload Blob Failed. blobPath=${blobPath} chunk=${chunkNumber} error=${error}`
    );
    throw error;
  }
};

/**
 * Upload blob.
 * @param blobPath - blobPath
 * @param fileType - fileType
 * @param buf - buffer
 */
export const uploadBlobForMp4 = async (blobPath: string, buf: Buffer) => {
  try {
    const container = await BlobStorageContainer.getInstance().getContainer();
    const blockBlobClient = container.getBlockBlobClient(blobPath);
    const chunkSize = 10 * 1024 * 1024; // 10MB
    let newBlockList = [];
    for (let i = 0; i < buf.length; i += chunkSize) {
      const newBlockId = Buffer.from(crypto.randomUUID()).toString("base64");
      const chunk = buf.slice(i, i + chunkSize);
      await blockBlobClient.stageBlock(newBlockId, chunk, chunk.byteLength);
      newBlockList.push(newBlockId);
    }
    await blockBlobClient.commitBlockList(newBlockList);
    console.log(`Upload Blob Successfully. blobPath=${blobPath}`);
  } catch (error) {
    console.error(`Upload Blob Failed. blobPath=${blobPath} error=${error}`);
    throw error;
  }
};

/**
 * Download Blob
 * @param blobPath - blobPath
 */
export const downloadBlob = async (blobPath: string): Promise<Buffer> => {
  try {
    const container = await BlobStorageContainer.getInstance().getContainer();
    const blockBlobClient = container.getBlockBlobClient(blobPath);

    const blob = await blockBlobClient.downloadToBuffer();

    console.debug(`Download Blob Successfully. blobPath=${blobPath}`);
    return blob;
  } catch (error) {
    console.error(`Download Blob Failed. blobPath=${blobPath} error=${error}`);
    throw error;
  }
};

/**
 * Delete Blob
 * @param blobPath - blobPath
 */
export const deleteBlob = async (blobPath: string) => {
  try {
    const container = await BlobStorageContainer.getInstance().getContainer();
    const blockBlobClient = container.getBlockBlobClient(blobPath);

    await blockBlobClient.deleteIfExists();

    console.log(`Deleted Blob Successfully. blobPath=${blobPath}`);
  } catch (error) {
    console.error(`Deleted Blob Failed. blobPath=${blobPath} error=${error}`);
    throw error;
  }
};
