"use client";

import React, { FC, createContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGlobalMessageContext } from "@/features/global-message/global-message-context";
import { convertMp4ToMp3 } from "./mp4-to-mp3-convert";

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
  UpdateTranscriptionId,
} from "@/features/audio/audio-services/audio-record-service";
import {
  getTranscriptionFiles,
  downloadTranscriptionData,
  deleteTranscription,
  getTranscription,
  createTranscription,
} from "@/features/audio/audio-services/audio-speech-services";
import {
  convertAndReuploadBlob,
  deleteBlob,
} from "@/features/audio/audio-services/audio-storage-service";
import { splitFile } from "@/features/audio/audio-services/utils";

interface AudioUIContextProps {
  isOpen: boolean;
  locale: string;
  uploadStatus: string;
  uploadFileName: string;
  setIsOpen: (isOpen: boolean) => void;
  setLocale: (locale: string) => void;
}
const AudioUIContext = createContext<AudioUIContextProps | null>(null);

interface AudioActionContextProps {
  id: string;
  handleOnUpload: (files: File[]) => void;
  handleOnDownload: (transcriptionId: string) => Promise<void>;
  handleOnDelete: (row: any) => Promise<void>;
  updateStatus: () => Promise<void>;
}
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
  const [uploadFileName, setUploadFileName] = useState<string>("");
  // アップロード中のステータス
  const [uploadStatus, setUploadStatus] = useState<string>("");

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
        if (!["mp3", "wav", "mp4", "m4a"].includes(fileType)) {
          throw new Error("File extension must be either mp3, wav, mp4, m4a.");
        }

        // DBにレコードを作成
        const record = await CreateAudioRecord(title, fileName);
        if (!record?.id) {
          throw new Error("Failed to create record.");
        }

        // ファイルを10MB毎に分割してAzure Blobストレージにアップロード
        // 分割しないとブラウザがハングアップする
        if (["mp4"].includes(fileType)) {
          // mp4の場合はmp3に変換してからアップロード
          const mp3 = await convertMp4ToMp3(file);
          await uploadChunks(
            record.id,
            new File([mp3.blob], `${title}.mp3`, {
              type: "audio/mp3",
            }),
            blobPath,
            fileType,
            locale
          );
        } else {
          await uploadChunks(record.id, file, blobPath, fileType, locale);
        }

        setUploadStatus(UPLOAD_STATUS.DONE);
        showSuccess({
          title: "File upload",
          description: `${fileName} uploaded successfully.`,
        });
      } catch (error) {
        console.log(`Failed to upload file. error=${error}`);
        setUploadStatus(UPLOAD_STATUS.FAILED);
        if (
          error.message === "File extension must be either mp3, wav, mp4, m4a."
        ) {
          showError(error.message);
        } else {
          showError(`${fileName} uploaded failed.`);
        }
      }
    },
    [locale, props, showError, showSuccess]
  );

  /**
   * Azure音声サービスのステータスを取得してDBに反映する
   */
  const updateStatus = async () => {
    const updateRecord = async (record) => {
      const transcriptionId = record.transcriptionId;
      if (record.status === TRANSLATE_STATUS.IN_PROGRESS && transcriptionId) {
        // 音声書き起こし中の場合はステータスを取得してDBを更新する
        const { status, error } = await getTranscription(transcriptionId);
        if ([TRANSLATE_STATUS.DONE, TRANSLATE_STATUS.FAILED].includes(status)) {
          try {
            await UpdateStatusAndError(transcriptionId, status, error);
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

  /**
   * ダウンロード処理
   * @param data data
   * @param fileName fileName
   */
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
        downloadDataAsTextFile(transcriptionData, record.name);
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
 * 分割したファイルをサーバーサイドに送信する
 * @param id レコードID
 * @param file 分割するファイル
 * @param blobPath Azure Blobストレージのパス
 * @param fileType ファイル拡張子
 * @param locale 音声書き起こしの言語
 * @returns blobPaths アップロードしたファイルのパスリスト
 */
const uploadChunks = async (
  id: string,
  file: File,
  blobPath: string,
  fileType: string,
  locale: string
) => {
  const chunks = splitFile(file, 10240 * 1024);

  let blockList: Array<string> = [];
  for (let i = 0; i < chunks.length; i++) {
    const blockId = Buffer.from(crypto.randomUUID()).toString("base64");
    blockList.push(blockId);
    const chunk = chunks[i];
    const formData = new FormData();
    formData.append("id", id);
    formData.append("fileNumber", String(i).padStart(5, "0"));
    formData.append("file", chunk);
    formData.append("blobPath", blobPath);
    formData.append("fileType", fileType);
    formData.append("locale", locale);
    formData.append("latestflag", chunks.length - 1 === i ? "1" : "0");
    formData.append("blockList", blockList.toString());
    formData.append("blockId", blockId);

    const response = await fetch("/api/audio/upload", {
      method: "POST",
      body: formData,
    });
    if (response.status === 500) {
      throw new Error("Server error");
    }
  }
};

/**
 * 分割したファイルをサーバーサイドに送信する
 * @param id レコードID
 * @param file 分割するファイル
 * @param blobPath Azure Blobストレージのパス
 * @param fileType ファイル拡張子
 * @param locale 音声書き起こしの言語
 * @returns blobPaths アップロードしたファイルのパスリスト
 */
const uploadChunksForMp4 = async (
  id: string,
  file: File,
  blobPath: string,
  fileType: string,
  locale: string
) => {
  const chunks = splitFile(file, 10240 * 1024);

  const maxFileNumber = chunks.length;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const formData = new FormData();
    formData.append("id", id);
    formData.append("fileNumber", String(i).padStart(5, "0"));
    formData.append("file", chunk);
    formData.append("blobPath", blobPath);
    formData.append("fileType", fileType);
    formData.append("locale", locale);
    formData.append("latestflag", chunks.length - 1 === i ? "1" : "0");

    await fetch("/api/audio/upload/mp4", {
      method: "POST",
      body: formData,
    });
  }
};
