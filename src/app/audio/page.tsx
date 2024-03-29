import React from "react";

import { Card } from "@/components/ui/card";
import { AudioUI } from "@/features/audio/audio-ui/audio-ui";
import { AudioProvider } from "@/features/audio/audio-ui/audio-context";
import { userHashedId } from "@/features/auth/helpers";
import { FindAllAudioRecordForCurrentUser } from "@/features/audio/audio-services/audio-record-service";
import { transformCosmosDbDataToTableRecord } from "@/features/audio/audio-services/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await userHashedId();
  const records = await FindAllAudioRecordForCurrentUser();
  const tableData = transformCosmosDbDataToTableRecord(records);

  return (
    <AudioProvider id={userId} records={records}>
      <Card className="h-full items-center flex justify-center flex-1 overflow-x-auto overflow-y-auto">
        <AudioUI tableData={tableData} />
      </Card>
    </AudioProvider>
  );
}
