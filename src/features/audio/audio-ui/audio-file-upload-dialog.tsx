import React, { FC, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useGlobalMessageContext } from "@/features/global-message/global-message-context";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { useAudioContext } from "@/features/audio/audio-ui/audio-context";
import {
  createTranscription,
  getTranscription,
} from "@/features/azure-client/speech-services";
import {
  CreateAudioRecord,
  FindAllAudioRecordForCurrentUser,
  UpdateStatusAndError,
} from "@/features/audio/audio-services/audio-record-service";
import {
  createContainer,
  uploadStream,
} from "@/features/azure-client/storage-blob";
interface Prop {}

export const AudioFileUploadDialog: FC<Prop> = (props) => {
  const { showError, showSuccess } = useGlobalMessageContext();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  // ロケール
  const [locale, setLocale] = React.useState<string>("ja-JP");
  // ファイル名
  const [uploadFileName, setUploadFileName] = React.useState<string>("");
  // アップロードステータス
  const [uploadStatus, setUploadStatus] = React.useState<string>("");
  // userId
  const { id } = useAudioContext();

  /**
   * 音声ファイルアップロード
   * @param files files
   */
  const uploadFile = async (files: File[]) => {
    const userId = id;
    const file = files[0];
    const fileName = file.name;
    const title = fileName.split(".").slice(0, -1).join(".") || "";
    const fileType = fileName.split(".").pop()?.toLocaleLowerCase() || "";
    const blobPath = `input/${userId}/${fileName}`;

    setUploadFileName(fileName);
    setUploadStatus("in progress");

    const fileTypeList = ["mp3", "wav"];
    if (!fileTypeList.includes(fileType)) {
      console.log("File extension is invalid.");
      setUploadStatus("faild");
      showError("File extension must be either mp3 or wav.");
      return null;
    }

    // Azure Blobにコンテナがなければ作成
    await createContainer();

    let fileReader = new FileReader();
    fileReader.onload = async () => {
      const arrayBuffer = fileReader.result;
      if (arrayBuffer && typeof arrayBuffer !== "string") {
        // Azure Blobに音声ファイルアップロード
        try {
          await uploadStream(blobPath, fileType, arrayBuffer);
        } catch (error) {
          console.log(`Failed to upload stream. error=${error}`);
          setUploadStatus("failed");
          showError("File upload failed.");
          return;
        }

        // 文字起こしバッチ依頼
        let transcriptionId = "";
        try {
          transcriptionId = await createTranscription(
            fileName,
            locale,
            blobPath
          );
        } catch (error) {
          console.log(`Failed to create transcription. error=${error}`);
          setUploadStatus("failed");
          showError("File upload failed.");
          return;
        }

        // CosmosDBにレコード作成
        let audioRecord;
        try {
          audioRecord = await CreateAudioRecord(
            title,
            fileName,
            transcriptionId
          );
        } catch (error) {
          console.log(`Failed to create audio record. error=${error}.`);
          setUploadStatus("failed");
          showError("File upload failed.");
          return;
        }

        setUploadStatus("done");
        showSuccess({
          title: "File upload",
          description: `${fileName} uploaded successfully.`,
        });
      }
    };
    fileReader.readAsArrayBuffer(file);
  };

  const finfRecords = async () => {
    try {
      const records = await FindAllAudioRecordForCurrentUser();
      await updateRecords(records);
    } catch (e) {
      console.error(e);
    }
  };
  const updateRecords = async (records) => {
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
  const onDrop = useCallback(async (files: File[]) => {
    await uploadFile(files);
  }, []);
  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  useEffect(() => {
    if (!isOpen) {
      (async () => {
        await finfRecords();
        router.push("/audio");
        router.refresh();
      })();
    }
  }, [isOpen]);
  return (
    <div>
      <div className="hidden h-full flex-1 flex-col space-y-3 md:flex">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Import</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] h-90">
            <DialogHeader>
              <DialogTitle className="h-1">Import</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="container w-full bottom-1">
                <Label className="text-right font-bold text-lg">出力言語</Label>
                <div className="w-36">
                  <Select value={locale} onValueChange={setLocale}>
                    <SelectTrigger>
                      <SelectValue placeholder="言語選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ja-JP">日本語</SelectItem>
                      <SelectItem value="en-US">英語</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="container w-full bottom-1">
                <Label className="text-right font-bold text-lg">
                  アップロード
                </Label>
                <div
                  {...getRootProps()}
                  className="py-8 border-8 border-dashed flex items-center justify-center"
                >
                  {uploadStatus === "in progress" ? (
                    <Loader2 className="animate-spin" size={40} />
                  ) : (
                    <>
                      <input {...getInputProps()} />
                      <p className="">Drag & Drop / Select file from dialog</p>
                    </>
                  )}
                </div>
              </div>
              <div className="container w-full bottom-1">
                <Label className="text-right font-bold text-lg">
                  ステータス
                </Label>
                <div className="flex flex-row">
                  <div className="flex flex-col">
                    <h4 className="">File</h4>
                    <h4 className="">{uploadFileName}</h4>
                  </div>
                  <div className="flex flex-col">
                    <h4 className="px-5">Status</h4>
                    <h4 className="px-5">{uploadStatus}</h4>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
