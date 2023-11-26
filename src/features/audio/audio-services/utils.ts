import { TableSchema } from "@/components/audio/data/schema";
import { AudioRecordModel } from "./models";

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

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

export const base64ToArrayBuffer = (base64: string): ArrayBufferLike => {
  const buffer = Buffer.from(base64, "base64");
  return Uint8Array.from(buffer).buffer;
};
