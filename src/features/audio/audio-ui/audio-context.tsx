"use client";

import React, { FC, createContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGlobalMessageContext } from "@/features/global-message/global-message-context";

import {
  AudioRecordModel,
  TRANSLATE_STATUS,
  UPLOAD_STATUS,
} from "@/features/audio/audio-services/models";
import {
  FindAudioRecordByTranscriptionID,
  UpdateDownloadLink,
  SoftDeleteAudioRecordByID,
  CreateAudioRecord,
  UpdateStatusAndError,
  FindAudioRecordByFileName,
} from "@/features/audio/audio-services/audio-record-service";
import {
  getTranscriptionFiles,
  downloadTranscriptionData,
  deleteTranscription,
  getTranscription,
  createTranscription,
} from "@/features/azure-client/speech-services";
import {
  createContainer,
  uploadStream,
  deleteBlob,
} from "@/features/azure-client/storage-blob";

interface AudioUIContextProps {
  isOpen: boolean;
  locale: string;
  uploadStatus: string;
  uploadFileName: string;
  setIsOpen: (isOpen: boolean) => void;
  setLocale: (locale: string) => void;
}

interface AudioActionContextProps {
  id: string;
  uploadFile: (files: File[]) => void;
  handleOnDownload: (transcriptionId: string) => Promise<void>;
  handleOnDelete: (row: any) => Promise<void>;
  updateRecords: () => Promise<void>;
}

const AudioUIContext = createContext<AudioUIContextProps | null>(null);
const AudioActionContext = createContext<AudioActionContextProps | null>(null);

interface Prop {
  children: React.ReactNode;
  id: string;
  records: Array<AudioRecordModel>;
}

export const AudioProvider: FC<Prop> = (props) => {
  const { showError, showSuccess } = useGlobalMessageContext();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [locale, setLocale] = useState<string>("ja-JP");
  const [uploadFileName, setUploadFileName] = React.useState<string>("");
  const [uploadStatus, setUploadStatus] = React.useState<string>("");

  /**
   * Azure Blobストレージにファイルをアップロードする
   * @param blobPath - blobPath
   * @param fileType - fileType
   * @param arrayBuffer - fileType
   */
  const uploadFileToAzure = async (
    blobPath: string,
    fileType: string,
    arrayBuffer: ArrayBuffer
  ) => {
    try {
      await uploadStream(blobPath, fileType, arrayBufferToBase64(arrayBuffer));
    } catch (error) {
      console.log(`Failed to upload stream. error=${error}`);
      setUploadStatus(UPLOAD_STATUS.FAILED);
      showError("File upload failed.");
      throw error;
    }
  };

  /**
   * Azure音声ファイルに対して音声書き起こしをリクエストする
   * @param fileName - fileName
   * @param locale - locale
   * @param blobPath - blobPath
   * @returns transcription Id
   */
  const createTranscriptionRequest = async (
    fileName: string,
    locale: string,
    blobPath: string
  ) => {
    let transcriptionId = "";
    try {
      transcriptionId = await createTranscription(fileName, locale, blobPath);
    } catch (error) {
      console.log(`Failed to create transcription. error=${error}`);
      setUploadStatus(UPLOAD_STATUS.FAILED);
      showError("File upload failed.");
      throw error;
    }
    return transcriptionId;
  };

  /**
   * レコードを作成する
   * @param title - 音声ファイルタイトル
   * @param fileName - 音声ファイル名
   * @param transcriptionId - transcription id
   * @returns Trecord.
   */
  const createAudioRecordInDB = async (
    title: string,
    fileName: string,
    transcriptionId: string
  ) => {
    let audioRecord;
    try {
      audioRecord = await CreateAudioRecord(title, fileName, transcriptionId);
    } catch (error) {
      console.log(`Failed to create audio record. error=${error}.`);
      setUploadStatus(UPLOAD_STATUS.FAILED);
      showError("File upload failed.");
      throw error;
    }
    return audioRecord;
  };

  /**
   * 音声ファイルをアップロードして、音声バッチを実行する
   * @param files - file
   */
  const uploadFile = useCallback(
    async (files: File[]) => {
      const { id: userId } = props;
      const [file] = files;
      const fileName = file.name;
      const title = fileName.replace(/\.[^/.]+$/, "");
      const fileType = (fileName.match(/\.(.+)$/i) || [""])[1]?.toLowerCase();
      const blobPath = `input/${userId}/${fileName}`;

      setUploadFileName(fileName);
      setUploadStatus(UPLOAD_STATUS.IN_PROGRESS);

      if (!["mp3", "wav"].includes(fileType)) {
        console.log("File extension is invalid.");
        setUploadStatus(UPLOAD_STATUS.FAILED);
        showError("File extension must be either mp3 or wav.");
        return null;
      }

      await createContainer();

      let fileReader = new FileReader();

      fileReader.onload = async () => {
        const arrayBuffer = fileReader.result;
        if (arrayBuffer && typeof arrayBuffer !== "string") {
          await uploadFileToAzure(blobPath, fileType, arrayBuffer);
          const transcriptionId = await createTranscriptionRequest(
            fileName,
            locale,
            blobPath
          );
          await createAudioRecordInDB(title, fileName, transcriptionId);

          setUploadStatus(UPLOAD_STATUS.DONE);
          showSuccess({
            title: "File upload",
            description: `${fileName} uploaded successfully.`,
          });
        }
      };
      fileReader.readAsArrayBuffer(file);
    },
    [locale]
  );

  const checkRecordExists = async (transcriptionId: string) => {
    const [record] = await FindAudioRecordByTranscriptionID(transcriptionId);
    return !!record;
  };

  /**
   * Azure音声サービスのステータスを取得してDBに反映する
   */
  const updateRecords = async () => {
    try {
      await Promise.all(
        props.records.map(async (record) => {
          if (
            record.status === TRANSLATE_STATUS.IN_PROGRESS &&
            record.transcriptionId.length > 0
          ) {
            const { status, error } = await getTranscription(
              record.transcriptionId
            );
            if (
              status &&
              (status !== record.status || status === TRANSLATE_STATUS.FAILED)
            ) {
              const recordExists = await checkRecordExists(
                record.transcriptionId
              );
              if (recordExists) {
                record.status = status;
                record.error = error;
                await UpdateStatusAndError(
                  record.transcriptionId,
                  record.status,
                  record.error
                );
              } else {
                console.error(
                  `Audio record not found: ${record.transcriptionId}`
                );
              }
            }
          }
        })
      );
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * ダウンロードリンクを取得する
   * @param transcriptionId transcription id
   * @returns download link
   */
  const getDownloadLink = async (
    transcriptionId: string
  ): Promise<string | undefined> => {
    const [record] = await FindAudioRecordByTranscriptionID(transcriptionId);
    if (!record) return;
    return record.downloadLink?.length
      ? record.downloadLink
      : await getTranscriptionFiles(transcriptionId);
  };

  /**
   * 音声書き起こし結果ファイルをダウンロードする
   *
   * @param downloadLink - download link
   * @param fileName - file Name
   */
  const downloadDataAsFile = async (
    downloadLink: string,
    fileName: string
  ): Promise<void> => {
    const data = await downloadTranscriptionData(downloadLink);
    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.download = fileName + ".txt";
    a.href = url;
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /**
   * [Download]ボタンの処理
   * @param transcriptionId transcription id
   */
  const handleOnDownload = async (transcriptionId: string): Promise<void> => {
    const downloadLink = await getDownloadLink(transcriptionId);
    if (!downloadLink) {
      console.error("Download link could not be generated");
      return;
    }

    const [record] = await FindAudioRecordByTranscriptionID(transcriptionId);
    if (!record) return;

    await downloadDataAsFile(downloadLink, record.name);

    try {
      await UpdateDownloadLink(transcriptionId, downloadLink);
    } catch (e) {
      console.error(`Failed to update download link. error=${e}`);
    }
  };

  /**
   * 音声書き起こし結果ファイルとBlobを削除する
   * @param transcriptionId transcription id
   */
  const deleteTranscriptionAndBlob = async (
    transcriptionId: string
  ): Promise<void> => {
    const { status } = await getTranscription(transcriptionId);
    if (
      status === TRANSLATE_STATUS.DONE ||
      status === TRANSLATE_STATUS.FAILED
    ) {
      await deleteTranscription(transcriptionId);
    }

    const [record] = await FindAudioRecordByTranscriptionID(transcriptionId);
    const records = await FindAudioRecordByFileName(record.fileName);
    if (
      !record ||
      (1 < records.length && record.status === TRANSLATE_STATUS.IN_PROGRESS)
    ) {
      // 削除済み or 同じファイル名で複数回アップロードし、まだ音声書き起こし中の場合はBlobを削除しない
      return;
    }

    const blobPath = `input/${record.userId}/${record.fileName}`;
    await deleteBlob(blobPath);
  };

  /**
   * レコードを論理削除する
   * @param recordId record id
   */
  const deleteAudioRecord = async (recordId: string) => {
    await SoftDeleteAudioRecordByID(recordId);
  };

  /**
   * [Delete]ボタンの処理
   * @param row - selected row
   */
  const handleOnDelete = async (row: any) => {
    try {
      const transcriptionId: string = row.getValue("transcriptionId");
      const id: string = row.getValue("id");

      await deleteTranscriptionAndBlob(transcriptionId);
      await deleteAudioRecord(id);

      router.push("/audio");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AudioUIContext.Provider
      value={{
        isOpen,
        setIsOpen,
        locale,
        setLocale,
        uploadStatus,
        uploadFileName,
      }}
    >
      <AudioActionContext.Provider
        value={{
          id: props.id,
          uploadFile,
          handleOnDownload,
          handleOnDelete,
          updateRecords,
        }}
      >
        {props.children}
      </AudioActionContext.Provider>
    </AudioUIContext.Provider>
  );
};

export const useAudioUIContext = () => {
  const context = React.useContext(AudioUIContext);
  if (!context) {
    throw new Error("AudioUIContext is null");
  }

  return context;
};

export const useAudioActionContext = () => {
  const context = React.useContext(AudioActionContext);
  if (!context) {
    throw new Error("AudioActionContext is null");
  }

  return context;
};

/**
 * ArrayBuffer to base64string
 * @param buf ArrayBuffer
 * @returns base64
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};
