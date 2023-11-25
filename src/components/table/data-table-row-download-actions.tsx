import { Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  getTranscriptionFiles,
  downloadTranscriptionData,
} from "@/features/azure-client/speech-services";
import {
  FindAudioRecordByTranscriptionID,
  UpdateDownloadLink,
} from "@/features/audio/audio-services/audio-record-service";
interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowDownloadActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const getDownloadLink = async (
    transcriptionId: string
  ): Promise<string | undefined> => {
    const records = await FindAudioRecordByTranscriptionID(transcriptionId);
    if (records.length === 0) {
      return;
    }
    const record = records[0];
    if (record.downloadLink == null || record.downloadLink.length === 0) {
      return await getTranscriptionFiles(transcriptionId);
    } else {
      return record.downloadLink;
    }
  };

  const downloadDataAsFile = async (
    downloadLink: string,
    recordName: string
  ): Promise<void> => {
    const data = await downloadTranscriptionData(downloadLink);
    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.download = recordName + ".txt";
    a.href = url;
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleOnClick = async (transcriptionId: string): Promise<void> => {
    const downloadLink = await getDownloadLink(transcriptionId);
    if (!downloadLink) {
      console.error("Download link could not be generated");
      return;
    }
    const records = await FindAudioRecordByTranscriptionID(transcriptionId);
    if (records.length === 0) {
      return;
    }
    const record = records[0];
    await downloadDataAsFile(downloadLink, record.name);
    try {
      await UpdateDownloadLink(transcriptionId, downloadLink);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex space-x-2">
      <Button
        className="w-24"
        onClick={() => handleOnClick(row.getValue("transcriptionId"))}
      >
        Download
      </Button>

      <span className="max-w-[500px] truncate font-medium">
        {row.getValue("download")}
      </span>
    </div>
  );
}
