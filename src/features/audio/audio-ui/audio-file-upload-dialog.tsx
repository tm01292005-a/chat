"use client";

import React, { FC, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";

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

import {
  useAudioUIContext,
  useAudioActionContext,
} from "@/features/audio/audio-ui/audio-context";
import { UPLOAD_STATUS } from "@/features/audio/audio-services/models";

interface Prop {}

export const AudioFileUploadDialog: FC<Prop> = () => {
  const router = useRouter();
  const { isOpen, setIsOpen, locale, setLocale, uploadStatus, uploadFileName } =
    useAudioUIContext();
  const { updateStatus, handleOnUpload } = useAudioActionContext();

  // ファイルをドロップしたら、アップロードする
  const onDrop = useCallback(handleOnUpload, [handleOnUpload]);
  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  // ダイアログが閉じたら、ステータスと画面を更新する
  useEffect(() => {
    const updateAndRedirect = async () => {
      try {
        await updateStatus();
        router.push("/audio");
        router.refresh();
      } catch (e) {
        console.error(e);
      }
    };

    if (!isOpen) {
      updateAndRedirect();
    }
  }, [isOpen]);

  return (
    <div>
      <div className="h-full flex-1 flex-col space-y-3 flex">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Import</Button>
          </DialogTrigger>
          <DialogContent
            className={`max-w-[300px] sm:max-w-[425px] h-[500px] md:h-90 ${
              //              className={`sm:max-w-[425px] h-90 ${
              uploadStatus === UPLOAD_STATUS.IN_PROGRESS ? "opacity-50" : ""
            }`}
          >
            <DialogHeader>
              <DialogTitle className="h-1">Import</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="container w-full bottom-1">
                <Label className="text-right font-bold text-lg">出力言語</Label>
                <div className="w-36">
                  <Select
                    value={locale}
                    onValueChange={(value) => setLocale(value)}
                  >
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
                  {uploadStatus === UPLOAD_STATUS.IN_PROGRESS ? (
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
