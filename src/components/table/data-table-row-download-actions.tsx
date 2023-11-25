"user client";

import { Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

import { useAudioActionContext } from "@/features/audio/audio-ui/audio-context";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowDownloadActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const { handleOnDownload } = useAudioActionContext();

  return (
    <div className="flex space-x-2">
      <Button
        className="w-24"
        onClick={() => handleOnDownload(row.getValue("transcriptionId"))}
      >
        Download
      </Button>

      <span className="max-w-[500px] truncate font-medium">
        {row.getValue("download")}
      </span>
    </div>
  );
}
