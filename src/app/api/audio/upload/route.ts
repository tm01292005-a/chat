import type { NextApiRequest, NextApiResponse } from "next";
import { uploadBlob } from "@/features/audio/audio-services/audio-storage-service";
import { createTranscription } from "@/features/audio/audio-services/audio-speech-services";
import {
  UpdateTranscriptionId,
  UpdateStatusAndErrorBtId,
} from "@/features/audio/audio-services/audio-record-service";
import { TRANSLATE_STATUS } from "@/features/audio/audio-services/models";
import { QueueContainer } from "@/features/common/queue";

const audioQueue = QueueContainer.getInstance().getQueue();
let isProcessing = false;
let timerId = null;

const enqueueAudio = (formData: any) => {
  audioQueue.enqueue({
    id: formData.get("id"),
    fileNumber: formData.get("fileNumber"),
    blobPath: formData.get("blobPath"),
    fileName: formData.get("file").name,
    fileType: formData.get("fileType"),
    locale: formData.get("locale"),
    latestflag: Boolean(parseInt(formData.get("latestflag"))),
    createdAt: new Date(),
  });
};

const processAudioTranscript = async (id: string) => {
  if (isProcessing) {
    console.log("処理中です");
    return;
  }
  isProcessing = true;

  try {
    const fileName = audioQueue.getFileNameById(id);
    const locale = audioQueue.getLocaleById(id);
    const blobPath = audioQueue.getBlobPathById(id);

    // 音声書き起こしをリクエスト
    const transcriptionId = await createTranscription(
      fileName,
      locale,
      blobPath
    );

    // DB更新
    await UpdateTranscriptionId(id, transcriptionId);
  } catch (error) {
    // DBステータス更新
    await UpdateStatusAndErrorBtId(id, TRANSLATE_STATUS.FAILED, error.message);
  } finally {
    // キューから削除
    audioQueue.deleteItemsById(id);
    isProcessing = false;
  }
};

export async function POST(req: NextApiRequest, res: NextApiResponse) {
  try {
    const formData = await req.formData();

    try {
      await uploadBlob(
        formData.get("blobPath"),
        Buffer.from(await formData.get("file").arrayBuffer()),
        formData.get("blockId"),
        formData.get("blockList").split(","),
        Boolean(parseInt(formData.get("latestflag"))),
        formData.get("fileNumber")
      );

      enqueueAudio(formData);
    } catch (error) {
      console.error(error);
      const options = { status: 500 };
      return new Response("", options);
    }

    const audioTranscript = async () => {
      const id = audioQueue.getEarliestItemId();
      if (id.length > 0) {
        if (audioQueue.isSendComplete(id)) {
          await processAudioTranscript(id);
        }
      } else {
        console.log("送信するデータがありません");
        clearInterval(timerId);
        timerId = null;
      }
    };
    if (!timerId) {
      timerId = setInterval(audioTranscript, 10000);
    }

    const options = { status: 200 };
    return new Response("", options);
  } catch (error) {
    console.error(error);
    const options = { status: 500 };
    return new Response("", options);
  }
}
