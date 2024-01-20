"use server";
import "server-only";

import { userHashedId, userSession } from "@/features/auth/helpers";
import { SqlQuerySpec, Container } from "@azure/cosmos";
import { nanoid } from "nanoid";
import { CosmosDBContainer } from "../../common/cosmos";
import { AUDIO_RECORD_ATTRIBUTE, AudioRecordModel } from "./models";
import {
  StatusType,
  TRANSLATE_STATUS,
} from "@/features/audio/audio-services/models";

const getContainerAndUserId = async () => {
  const container =
    await CosmosDBContainer.getInstance().getSpeechToTeContainer();
  const userId = await userHashedId();
  return { container, userId };
};

const executeQuery = async (
  container: Container,
  querySpec: any,
  partitionKey: string | undefined
) => {
  const { resources } = await container.items
    .query<AudioRecordModel>(
      querySpec,
      partitionKey ? { partitionKey } : undefined
    )
    .fetchAll();
  return resources;
};

/**
 * Find all current user
 * @returns records
 */
export const FindAllAudioRecordForCurrentUser = async () => {
  const { container, userId } = await getContainerAndUserId();

  const querySpec: SqlQuerySpec = {
    query:
      "SELECT * FROM root r WHERE r.type=@type AND r.userId=@userId AND r.isDeleted=@isDeleted ORDER BY r.createdAt DESC",
    parameters: [
      { name: "@type", value: AUDIO_RECORD_ATTRIBUTE },
      { name: "@userId", value: userId },
      { name: "@isDeleted", value: false },
    ],
  };

  return executeQuery(container, querySpec, userId);
};

/**
 * Find by id
 * @param id
 * @returns records
 */
export const FindAudioRecordByID = async (id: string) => {
  const { container, userId } = await getContainerAndUserId();

  const querySpec: SqlQuerySpec = {
    query:
      "SELECT * FROM root r WHERE r.type=@type AND r.userId=@userId AND r.id=@id AND r.isDeleted=@isDeleted",
    parameters: [
      { name: "@type", value: AUDIO_RECORD_ATTRIBUTE },
      { name: "@userId", value: userId },
      { name: "@id", value: id },
      { name: "@isDeleted", value: false },
    ],
  };

  return executeQuery(container, querySpec, undefined);
};

/**
 * Find by transcription id
 * @param transcriptionId
 * @returns records
 */
export const FindAudioRecordByTranscriptionID = async (
  transcriptionId: string
) => {
  const { container, userId } = await getContainerAndUserId();

  const querySpec: SqlQuerySpec = {
    query:
      "SELECT * FROM root r WHERE r.type=@type AND r.userId=@userId AND r.transcriptionId=@transcriptionId AND r.isDeleted=@isDeleted",
    parameters: [
      { name: "@type", value: AUDIO_RECORD_ATTRIBUTE },
      { name: "@userId", value: userId },
      { name: "@transcriptionId", value: transcriptionId },
      { name: "@isDeleted", value: false },
    ],
  };

  return executeQuery(container, querySpec, undefined);
};

/**
 * Find by file Name
 * @param fileName fileName
 * @returns records
 */
export const FindAudioRecordByFileName = async (fileName: string) => {
  const { container, userId } = await getContainerAndUserId();

  const querySpec: SqlQuerySpec = {
    query:
      "SELECT * FROM root r WHERE r.type=@type AND r.userId=@userId AND r.fileName=@fileName AND r.isDeleted=@isDeleted",
    parameters: [
      { name: "@type", value: AUDIO_RECORD_ATTRIBUTE },
      { name: "@userId", value: userId },
      { name: "@fileName", value: fileName },
      { name: "@isDeleted", value: false },
    ],
  };

  return executeQuery(container, querySpec, undefined);
};

/**
 * Create record
 * @param title title
 * @param fileName fileName
 * @returns record
 */
export const CreateAudioRecord = async (title: string, fileName: string) => {
  const { container } = await getContainerAndUserId();
  const [userSessionData, userId] = await Promise.all([
    userSession(),
    userHashedId(),
  ]);

  return (
    await container.items.create({
      name: title,
      userName: userSessionData!.name,
      userId,
      id: nanoid(),
      createdAt: new Date(),
      isDeleted: false,
      transcriptionId: "",
      status: TRANSLATE_STATUS.IN_PROGRESS,
      fileName,
      downloadLink: "",
      error: "",
      type: AUDIO_RECORD_ATTRIBUTE,
    })
  ).resource;
};

/**
 * Upsert record
 * @param model AudioRecordModel
 * @returns record
 */
export const UpsertAudioRecord = async (model: AudioRecordModel) => {
  const { container } = await getContainerAndUserId();
  const [latestModel] = await FindAudioRecordByTranscriptionID(
    model.transcriptionId
  );

  if (!latestModel) {
    throw new Error("Audio record not found");
  }

  return await container.items.upsert(latestModel);
};

/**
 * Update transcriptionID
 * @param id id
 * @param transcriptionID transcriptionID
 * @returns record
 */
export const UpdateTranscriptionId = async (
  id: string,
  transcriptionId: string
) => {
  const { container } = await getContainerAndUserId();
  const [latestModel] = await FindAudioRecordByID(id);

  if (!latestModel) {
    throw new Error("Audio record not found");
  }

  return await container.items.upsert({ ...latestModel, transcriptionId });
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
  const { container } = await getContainerAndUserId();
  const [latestModel] = await FindAudioRecordByTranscriptionID(transcriptionID);

  if (!latestModel) {
    throw new Error("Audio record not found");
  }

  return await container.items.upsert({ ...latestModel, downloadLink });
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
  const { container } = await getContainerAndUserId();
  const [latestModel] = await FindAudioRecordByTranscriptionID(transcriptionID);

  if (!latestModel) {
    throw new Error("Audio record not found");
  }

  return await container.items.upsert({ ...latestModel, status, error });
};

/**
 * Update status and error
 * @param id id
 * @param status status
 * @param error error
 * @returns record
 */
export const UpdateStatusAndErrorBtId = async (
  id: string,
  status: StatusType,
  error: string
) => {
  const { container } = await getContainerAndUserId();
  const [latestModel] = await FindAudioRecordByID(id);

  if (!latestModel) {
    throw new Error("Audio record not found");
  }

  return await container.items.upsert({ ...latestModel, status, error });
};

/**
 * Soft delete record by id
 * @param id id
 */
export const SoftDeleteAudioRecordByID = async (id: string) => {
  const { container } = await getContainerAndUserId();
  const records = await FindAudioRecordByID(id);

  await Promise.all(
    records.map((record) =>
      container.items.upsert({ ...record, isDeleted: true })
    )
  );
};
