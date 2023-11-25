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
  FindAllAudioRecordForCurrentUser,
} from "@/features/audio/audio-services/audio-record-service";
import {
  getTranscriptionFiles,
  downloadTranscriptionData,
  deleteTranscription,
  getTranscription,
  createTranscription,
} from "@/features/azure-client/speech-services";
import {
  uploadBase64AsBlob,
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
  handleOnUpload: (files: File[]) => void;
  handleOnDownload: (transcriptionId: string) => Promise<void>;
  handleOnDelete: (row: any) => Promise<void>;
  updateStatus: () => Promise<void>;
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

  // ダイアログの表示状態
  const [isOpen, setIsOpen] = useState(false);
  // 音声書き起こしの言語
  const [locale, setLocale] = useState<string>("ja-JP");
  // アップロード中のファイル名
  const [uploadFileName, setUploadFileName] = React.useState<string>("");
  // アップロード中のステータス
  const [uploadStatus, setUploadStatus] = React.useState<string>("");

  /**
   * 音声ファイルをアップロードして、音声バッチを実行する
   * @param files - file
   */
  const handleOnUpload = useCallback(
    async (files: File[]) => {
      const { id: userId } = props;
      const [file] = files;
      const fileName = file.name;
      const title = fileName.replace(/\.[^/.]+$/, "");
      const fileType = (fileName.match(/\.(.+)$/i) || [""])[1]?.toLowerCase();
      const blobPath = `input/${userId}/${fileName}`;

      try {
        setUploadFileName(fileName);
        setUploadStatus(UPLOAD_STATUS.IN_PROGRESS);
        // ファイル形式チェック
        if (!["mp3", "wav"].includes(fileType)) {
          throw new Error("File extension must be either mp3 or wav.");
        }

        const fileReader = new FileReader();
        fileReader.onload = async () => {
          const arrayBuffer = fileReader.result;
          if (arrayBuffer && typeof arrayBuffer !== "string") {
            // Azure Blobストレージにファイルをアップロード
            await uploadBase64AsBlob(
              blobPath,
              fileType,
              arrayBufferToBase64(arrayBuffer)
            );
            // 音声書き起こしをリクエスト
            const transcriptionId = await createTranscription(
              fileName,
              locale,
              blobPath
            );
            // DBにレコードを作成
            await CreateAudioRecord(title, fileName, transcriptionId);

            setUploadStatus(UPLOAD_STATUS.DONE);
            showSuccess({
              title: "File upload",
              description: `${fileName} uploaded successfully.`,
            });
          }
        };
        fileReader.readAsArrayBuffer(file);
      } catch (error) {
        console.log(`Failed to upload file. error=${error}`);
        setUploadStatus(UPLOAD_STATUS.FAILED);
        showError(`${fileName} uploaded failed.`);
      }
    },
    [locale, props, showError, showSuccess]
  );

  /**
   * Azure音声サービスのステータスを取得してDBに反映する
   */
  const updateStatus = async () => {
    const updateRecord = async (record) => {
      const status = record.status;
      const transcriptionId = record.transcriptionId;
      if (status === TRANSLATE_STATUS.IN_PROGRESS && transcriptionId) {
        // 音声書き起こし中の場合はステータスを取得してDBを更新する
        const { status: latestStatus, error } = await getTranscription(
          transcriptionId
        );
        if (
          latestStatus &&
          (latestStatus !== status || latestStatus === TRANSLATE_STATUS.FAILED)
        ) {
          try {
            await UpdateStatusAndError(transcriptionId, latestStatus, error);
          } catch (e) {
            console.error(
              `Update Status Faild. transcriptionId=${transcriptionId}`
            );
          }
        }
      }
    };

    const records = await FindAllAudioRecordForCurrentUser();
    await Promise.all(records.map(updateRecord));
  };

  const downloadDataAsTextFile = (data: string, fileName: string) => {
    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    document.body.appendChild(a);
    a.href = url;
    a.download = fileName + ".txt";
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * [Download]ボタンの処理
   * @param transcriptionId transcription id
   */
  const handleOnDownload = async (transcriptionId: string): Promise<void> => {
    try {
      const [record] = await FindAudioRecordByTranscriptionID(transcriptionId);
      if (record) {
        let downloadLink = record.downloadLink;
        if (!downloadLink) {
          // DownloadLinkを取得
          downloadLink = await getTranscriptionFiles(transcriptionId);
          if (!downloadLink) {
            throw new Error("Download link could not be generated");
          }
          // DownloadLinkをDBに保存
          try {
            await UpdateDownloadLink(transcriptionId, downloadLink);
          } catch (e) {
            console.warn(`Failed to update download link. error=${e}`);
          }
        }
        // 書き起こしデータを取得してダウンロード
        const transcriptionData = await downloadTranscriptionData(downloadLink);
        await downloadDataAsTextFile(transcriptionData, record.name);
      }
    } catch (e) {
      showError("Download failed.");
    }
  };

  /**
   * 音声書き起こし結果ファイルとBlobを削除する
   * @param transcriptionId transcription id
   */
  const deleteTranscriptionAndBlob = async (transcriptionId: string) => {
    const { status } = await getTranscription(transcriptionId);
    if ([TRANSLATE_STATUS.DONE, TRANSLATE_STATUS.FAILED].includes(status)) {
      await deleteTranscription(transcriptionId);
    }

    const [record] = await FindAudioRecordByTranscriptionID(transcriptionId);
    const records = await FindAudioRecordByFileName(record.fileName);
    if (
      !record ||
      (records.length > 1 && record.status === TRANSLATE_STATUS.IN_PROGRESS)
    ) {
      // 削除済み or 同じファイル名で複数回アップロードし、まだ音声書き起こし中の場合はBlobを削除しない
      return;
    }
    const blobPath = `input/${record.userId}/${record.fileName}`;
    await deleteBlob(blobPath);
  };

  /**
   * [Delete]ボタンの処理
   * @param row - selected row
   */
  const handleOnDelete = async (row: any) => {
    try {
      await deleteTranscriptionAndBlob(row.getValue("transcriptionId"));
      await SoftDeleteAudioRecordByID(row.getValue("id"));

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
          handleOnUpload,
          handleOnDownload,
          handleOnDelete,
          updateStatus,
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
