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
  const handleDownload = async (transcriptionId: string): Promise<string> => {
    const record = await downloadFile(transcriptionId);
    return new Promise((resolve) => resolve(record.downloadLink));
  };

  /**
   * ファイルダウンロード
   * @param transcriptionId
   */
  const downloadFile = async (transcriptionId: string): Promise<any> => {
    let downloadLink = null;

    // ダウンロードリンク取得
    const records = await FindAudioRecordByTranscriptionID(transcriptionId);
    if (records.length === 0) {
      return;
    }
    const record = records[0];
    if (record.downloadLink == null || record.downloadLink.length === 0) {
      downloadLink = await getTranscriptionFiles(transcriptionId);
      record.downloadLink = downloadLink;
    } else {
      downloadLink = record.downloadLink;
    }

    // 文字起こしファイルダウンロード
    const data = await downloadTranscriptionData(downloadLink);

    // ダウンロード
    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.download = record.name + ".txt";
    a.href = url;
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    const newRecord = JSON.parse(JSON.stringify(record));
    return new Promise((resolve) => resolve(newRecord));
  };

  return (
    <div className="flex space-x-2">
      <Button
        className="w-24"
        onClick={async () => {
          (async () => {
            const downloadLink = await handleDownload(
              row.getValue("transcriptionId")
            );
            try {
              await UpdateDownloadLink(
                row.getValue("transcriptionId"),
                downloadLink
              );
            } catch (e) {
              console.error(e);
            }
          })();
        }}
      >
        Download
      </Button>

      <span className="max-w-[500px] truncate font-medium">
        {row.getValue("download")}
      </span>
    </div>
  );
}
