"use server";
import "server-only";

import { userHashedId, userSession } from "@/features/auth/helpers";
import { SqlQuerySpec } from "@azure/cosmos";
import { nanoid } from "nanoid";
import { CosmosDBContainer } from "../../common/cosmos";
import { AUDIO_RECORD_ATTRIBUTE, AudioRecordModel } from "./models";
import { StatusType } from "@/features/audio/audio-services/models";

/**
 * Find all current user
 * @returns records
 */
export const FindAllAudioRecordForCurrentUser = async () => {
  const container =
    await CosmosDBContainer.getInstance().getSpeechToTeContainer();

  const querySpec: SqlQuerySpec = {
    query:
      "SELECT * FROM root r WHERE r.type=@type AND r.userId=@userId AND r.isDeleted=@isDeleted ORDER BY r.createdAt DESC",
    parameters: [
      {
        name: "@type",
        value: AUDIO_RECORD_ATTRIBUTE,
      },
      {
        name: "@userId",
        value: await userHashedId(),
      },
      {
        name: "@isDeleted",
        value: false,
      },
    ],
  };

  const { resources } = await container.items
    .query<AudioRecordModel>(querySpec, {
      partitionKey: await userHashedId(),
    })
    .fetchAll();
  return resources;
};

/**
 * Find by id
 * @param id
 * @returns records
 */
export const FindAudioRecordByID = async (id: string) => {
  const container =
    await CosmosDBContainer.getInstance().getSpeechToTeContainer();
  console.log("container", container);

  const querySpec: SqlQuerySpec = {
    query:
      "SELECT * FROM root r WHERE r.type=@type AND r.userId=@userId AND r.id=@id AND r.isDeleted=@isDeleted",
    parameters: [
      {
        name: "@type",
        value: AUDIO_RECORD_ATTRIBUTE,
      },
      {
        name: "@userId",
        value: await userHashedId(),
      },
      {
        name: "@id",
        value: id,
      },
      {
        name: "@isDeleted",
        value: false,
      },
    ],
  };

  const { resources } = await container.items
    .query<AudioRecordModel>(querySpec)
    .fetchAll();

  return resources;
};

/**
 * Find by transcription id
 * @param transcriptionId
 * @returns records
 */
export const FindAudioRecordByTranscriptionID = async (
  transcriptionId: string
) => {
  const container =
    await CosmosDBContainer.getInstance().getSpeechToTeContainer();

  const querySpec: SqlQuerySpec = {
    query:
      "SELECT * FROM root r WHERE r.type=@type AND r.userId=@userId AND r.transcriptionId=@transcriptionId AND r.isDeleted=@isDeleted",
    parameters: [
      {
        name: "@type",
        value: AUDIO_RECORD_ATTRIBUTE,
      },
      {
        name: "@userId",
        value: await userHashedId(),
      },
      {
        name: "@transcriptionId",
        value: transcriptionId,
      },
      {
        name: "@isDeleted",
        value: false,
      },
    ],
  };

  const { resources } = await container.items
    .query<AudioRecordModel>(querySpec)
    .fetchAll();

  return resources;
};

/**
 * Create record
 * @param title title
 * @param fileName fileName
 * @returns record
 */
export const CreateAudioRecord = async (
  title: string,
  fileName: string,
  transcriptionId: string
) => {
  const container =
    await CosmosDBContainer.getInstance().getSpeechToTeContainer();

  const modelToSave: AudioRecordModel = {
    name: title,
    userName: (await userSession())!.name,
    userId: await userHashedId(),
    id: nanoid(),
    createdAt: new Date(),
    isDeleted: false,
    transcriptionId: transcriptionId,
    status: "in progress",
    fileName: fileName,
    downloadLink: "",
    error: "",
    type: AUDIO_RECORD_ATTRIBUTE,
  };
  const response = await container.items.create<AudioRecordModel>(modelToSave);

  return response.resource;
};

/**
 * Upsert record
 * @param model AudioRecordModel
 * @returns record
 */
export const UpsertAudioRecord = async (model: AudioRecordModel) => {
  const container =
    await CosmosDBContainer.getInstance().getSpeechToTeContainer();
  const latestModels = await FindAudioRecordByTranscriptionID(
    model.transcriptionId
  );
  const latestModel = latestModels[0];

  const updatedAudioRecord = await container.items.upsert<AudioRecordModel>(
    latestModel
  );

  if (updatedAudioRecord === undefined) {
    throw new Error("Audio record not found");
  }

  return updatedAudioRecord;
};

/**
 * Update download link
 * @param transcriptionID transcriptionID
 * @param downloadLink downloadLink
 * @returns record
 */
export const UpdateDownloadLink = async (
  transcriptionID: string,
  downloadLink: string
) => {
  const container =
    await CosmosDBContainer.getInstance().getSpeechToTeContainer();
  const latestModels = await FindAudioRecordByTranscriptionID(transcriptionID);
  const latestModel = latestModels[0];

  latestModel.downloadLink = downloadLink;

  const updatedAudioRecord = await container.items.upsert<AudioRecordModel>(
    latestModel
  );

  if (updatedAudioRecord === undefined) {
    throw new Error("Audio record not found");
  }

  return updatedAudioRecord;
};

/**
 * Update status and error
 * @param transcriptionID transcriptionID
 * @param status status
 * @param error error
 * @returns record
 */
export const UpdateStatusAndError = async (
  transcriptionID: string,
  status: StatusType,
  error: string
) => {
  const container =
    await CosmosDBContainer.getInstance().getSpeechToTeContainer();
  const latestModels = await FindAudioRecordByTranscriptionID(transcriptionID);
  const latestModel = latestModels[0];

  latestModel.status = status;
  latestModel.error = error;

  const updatedAudioRecord = await container.items.upsert<AudioRecordModel>(
    latestModel
  );

  if (updatedAudioRecord === undefined) {
    throw new Error("Audio record not found");
  }

  return updatedAudioRecord;
};

/**
 * Soft delete record by id
 * @param id id
 */
export const SoftDeleteAudioRecordByID = async (id: string) => {
  const container =
    await CosmosDBContainer.getInstance().getSpeechToTeContainer();
  const records = await FindAudioRecordByID(id);

  if (records.length !== 0) {
    records.forEach(async (record) => {
      const itemToUpdate = {
        ...record,
      };
      itemToUpdate.isDeleted = true;
      await container.items.upsert(itemToUpdate);
    });
  }
};
