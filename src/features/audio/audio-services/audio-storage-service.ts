"use server";
import "server-only";

import { BlobHTTPHeaders } from "@azure/storage-blob";
import { Readable, PassThrough } from "stream";
import ffmpeg from "fluent-ffmpeg";

import { BlobStorageContainer } from "@/features/common/storage-blobs";

/**
 * Convert mp4 To mp3
 * @param buf mp4 buffer
 * @returns mp3 buffer
 */
const convertMp4ToMp3 = async (buf: Buffer) => {
  const bufferStream = new Readable();
  bufferStream.push(buf);
  bufferStream.push(null);

  let chunks = [];
  const passThrough = new PassThrough();

  return await new Promise<Buffer>((resolve, reject) => {
    ffmpeg()
      .input(bufferStream)
      .outputFormat("mp3")
      .on("end", () => {
        resolve(Buffer.concat(chunks));
      })
      .on("error", (err) => {
        console.error("Error: " + err.message);
        reject(err);
      })
      .on("data", (chunk) => {
        chunks.push(chunk);
      })
      .pipe(passThrough, { end: true });

    passThrough.on("data", (chunk) => {
      chunks.push(chunk);
    });
  });
};

/**
 * Converts and reuploads a blob by downloading divided files, combining them, and uploading the result to Azure Blob Storage.
 * @param blobPath - The path of the blob to upload.
 * @param dividedBlobPaths - An array of paths of the divided files to download and combine.
 * @param fileType - The type of the file to convert and upload.
 * @returns A Promise that resolves when the blob is successfully uploaded.
 * @throws If there is an error during the upload process.
 */
export const convertAndReuploadBlob = async (
  blobPath: string,
  dividedBlobPaths: string[],
  fileType: string
) => {
  let blobContentType = fileType;

  try {
    const container = await BlobStorageContainer.getInstance().getContainer();
    // 分割したファイルをダウンロードして結合
    const sortedBuf = [];
    for (let dividedBlobPath of dividedBlobPaths) {
      const blockBlobClient = container.getBlockBlobClient(dividedBlobPath);
      const blob = await blockBlobClient.downloadToBuffer();
      sortedBuf.push(blob);
      console.log(`Download Blob Successfully. blobPath=${dividedBlobPath}`);
    }
    /*
    const downloads = dividedBlobPaths.map(async (dividedBlobPath, index) => {
      console.log(
        `start Download Blob Successfully. blobPath=${dividedBlobPath}`
      );
      const blockBlobClient = container.getBlockBlobClient(dividedBlobPath);
      const blob = await blockBlobClient.downloadToBuffer();
      console.log(`Download Blob Successfully. blobPath=${dividedBlobPath}`);
      return { index, blob };
    });
    const chunks = await Promise.all(downloads);

    chunks.sort((a, b) => a.index - b.index);
    const sortedBuf = [];
    chunks.forEach((chunk) => {
      sortedBuf.push(chunk.blob);
    });
*/
    let buf = Buffer.concat(sortedBuf);
    // mp4の場合はmp3に変換
    if (blobContentType === "mp4") {
      blobContentType = "mp3";
      buf = await convertMp4ToMp3(buf);
    }

    // 結合したファイルを再アップロード
    await uploadBlob(blobPath, blobContentType, buf);
  } catch (error) {
    console.log(`Upload Blob Failed. blobPath=${blobPath} error=${error}`);
    throw error;
  } finally {
    // 分割ファイルを削除
    for (let dividedBlobPath of dividedBlobPaths) {
      await deleteBlob(dividedBlobPath);
    }
  }
};

/**
 * Upload blob.
 * @param blobPath - blobPath
 * @param fileType - fileType
 * @param buf - buffer
 */
export const uploadBlob = async (
  blobPath: string,
  fileType: string,
  buf: Buffer
) => {
  try {
    const container = await BlobStorageContainer.getInstance().getContainer();
    const blockBlobClient = container.getBlockBlobClient(blobPath);

    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const blobContentType =
      fileType === "m4a" ? "audio/x-m4a" : `audio/${fileType}`;
    const blobHTTPHeaders: BlobHTTPHeaders = { blobContentType };
    await blockBlobClient.upload(view, view.byteLength, { blobHTTPHeaders });

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
