import { TableSchema } from "@/components/table/data/schema";

export const AUDIO_RECORD_ATTRIBUTE = "AUDIO_RECORD";

/** 音声ファイルアップロードのステータス */
export const UPLOAD_STATUS = {
  IN_PROGRESS: "in progress",
  FAILED: "failed",
  DONE: "done",
};

/** 音声起こしバッチのステータス */
export const TRANSLATE_STATUS = {
  IN_PROGRESS: "in progress",
  FAILED: "failed",
  DONE: "done",
};

export type StatusType =
  | typeof TRANSLATE_STATUS.IN_PROGRESS
  | typeof TRANSLATE_STATUS.DONE
  | typeof TRANSLATE_STATUS.FAILED;

export interface AudioRecordModel {
  name: string; // title
  userName: string;
  userId: string;
  id: string;
  createdAt: Date;
  isDeleted: boolean;
  transcriptionId: string; // 文字起こしバッチID
  status: StatusType;
  fileName: string;
  downloadLink: string; // 文字起こしファイルURL
  error: string; // 文字起こし失敗理由
  type: "AUDIO_RECORD";
}

export const transformCosmosDbDataToTableRecord = (
  records: Array<AudioRecordModel>
): Array<TableSchema> => {
  return records.map((record) => {
    return {
      id: record.id,
      transcriptionId: record.transcriptionId,
      title: record.name,
      status: record.status,
      createdAt: new Date(record.createdAt).toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
      }),
    };
  });
};
