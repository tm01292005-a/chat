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

/**
 * ファイルをchunkSize毎に分割する
 * @param file 分割したいファイル
 * @param chunkSize チャンクサイズ
 * @returns 分割したチャンク
 */
export const splitFile = (file: File, chunkSize: number) => {
  const chunks = [];
  const fileSize = file.size;

  for (let offset = 0; offset < fileSize; offset += chunkSize) {
    const chunk = file.slice(offset, offset + chunkSize);
    chunks.push(chunk);
  }

  return chunks;
};
