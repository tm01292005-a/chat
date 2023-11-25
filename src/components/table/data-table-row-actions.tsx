"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  deleteTranscription,
  getTranscription,
} from "@/features/azure-client/speech-services";
import { deleteBlob } from "@/features/azure-client/storage-blob";

import {
  SoftDeleteAudioRecordByID,
  FindAudioRecordByTranscriptionID,
} from "@/features/audio/audio-services/audio-record-service";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const router = useRouter();

  const handleDelete = async (row: any) => {
    try {
      const transcriptionId: string = row.getValue("transcriptionId");
      const id: string = row.getValue("id");

      await deleteTranscriptionAndBlob(transcriptionId);
      await deleteAudioRecord(id);

      router.push("/audio");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteTranscriptionAndBlob = async (
    transcriptionId: string
  ): Promise<void> => {
    const { status, error } = await getTranscription(transcriptionId);
    if (status === "Succeeded" || status === "Failed") {
      await deleteTranscription(transcriptionId);
    }

    const records = await FindAudioRecordByTranscriptionID(transcriptionId);
    if (records.length === 0) {
      return;
    }
    const record = records[0];
    const blobPath = `input/${record.userId}/${record.fileName}`;
    await deleteBlob(blobPath);
  };

  const deleteAudioRecord = async (recordId: string) => {
    await SoftDeleteAudioRecordByID(recordId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem onClick={() => handleDelete(row)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
