export const AUDIO_RECORD_ATTRIBUTE = "AUDIO_RECORD";

export type StatusType = "in progress" | "done" | "failed";

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
