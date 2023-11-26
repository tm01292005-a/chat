import {
  ContainerClient,
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

export class BlobStorageContainer {
  private static instance: BlobStorageContainer;
  private container: Promise<ContainerClient>;

  private constructor() {
    const ACCOUNT_NAME = process.env.AZURE_BLOB_ACCOUNT_NAME || "";
    const CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME || "audio";
    const ACCOUNT_KEY = process.env.AZURE_BLOB_ACCOUNT_KEY || "";
    const BASE_URL = `https://${ACCOUNT_NAME}.blob.core.windows.net`;

    const sharedKeyCredential = new StorageSharedKeyCredential(
      ACCOUNT_NAME,
      ACCOUNT_KEY
    );
    const blobServiceClient = new BlobServiceClient(
      BASE_URL,
      sharedKeyCredential
    );
    const containerClient =
      blobServiceClient.getContainerClient(CONTAINER_NAME);

    this.container = new Promise((resolve, reject) => {
      containerClient
        .createIfNotExists()
        .then((res) => {
          console.log(
            `Created Azure blob container if not exists. container=${CONTAINER_NAME} .`
          );
          resolve(containerClient);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  public static getInstance(): BlobStorageContainer {
    if (!BlobStorageContainer.instance) {
      BlobStorageContainer.instance = new BlobStorageContainer();
    }

    return BlobStorageContainer.instance;
  }

  public async getContainer(): Promise<ContainerClient> {
    return await this.container;
  }
}
