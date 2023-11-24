import React from "react";

import { Card } from "@/components/ui/card";
import { AudioUI } from "@/features/audio/audio-ui/audio-ui";
import { AudioProvider } from "@/features/audio/audio-ui/audio-context";
import {
  FindAllAudioRecordForCurrentUser,
  UpdateStatusAndError,
} from "@/features/audio/audio-services/audio-record-service";
import { userHashedId } from "@/features/auth/helpers";
import { AudioRecordModel } from "@/features/audio/audio-services/models";
import { getTranscription } from "@/features/azure-client/speech-services";

import { TableSchema } from "@/components/table/data/schema";

export const dynamic = "force-dynamic";

export default async function Home() {
  const records = await FindAllAudioRecordForCurrentUser();
  await updateRecords(records);
  const tableData = transformCosmosDbDataToTableRecord(records);

  return (
    <AudioProvider id={await userHashedId()}>
      <Card className="h-full items-center flex justify-center flex-1">
        <AudioUI tableData={tableData} />
      </Card>
    </AudioProvider>
  );
}

/**
 * CosmosDBのレコードをTableデータに変換する
 * @param records
 * @returns table data
 */
const transformCosmosDbDataToTableRecord = (
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

const updateRecords = async (records: AudioRecordModel[]) => {
  try {
    for (const record of records) {
      if (
        record.status === "in progress" &&
        record.transcriptionId.length > 0
      ) {
        const { status, error } = await getTranscription(
          record.transcriptionId
        );
        if (status) {
          if (status !== record.status || status === "failed") {
            record.status = status;
            record.error = error;
            await UpdateStatusAndError(
              record.transcriptionId,
              record.status,
              record.error
            );
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
};
