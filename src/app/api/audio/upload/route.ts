import type { NextApiResponse } from "next";
import { uploadBlob } from "@/features/audio/audio-services/audio-storage-service";
import { createTranscription } from "@/features/audio/audio-services/audio-speech-services";
import {
  UpdateTranscriptionId,
  UpdateStatusAndErrorBtId,
} from "@/features/audio/audio-services/audio-record-service";
import { TRANSLATE_STATUS } from "@/features/audio/audio-services/models";

const processAudioTranscript = async (
  id: string,
  fileName: string,
  locale: string,
  blobPath: string
) => {
  try {
    const transcriptionId = await createTranscription(
      fileName,
      locale,
      blobPath
    );
    await UpdateTranscriptionId(id, transcriptionId);
  } catch (error) {
    if (error instanceof Error) {
      await UpdateStatusAndErrorBtId(
        id,
        TRANSLATE_STATUS.FAILED,
        error.message
      );
    }
  }
};

export async function POST(req: Request, res: NextApiResponse) {
  try {
    const formData: any = await req.formData();

    const id: string = formData.get("id");
    const blobPath: string = formData.get("blobPath");
    const file: Blob = formData.get("file");
    const blockId: string = formData.get("blockId");
    const blockList: string = formData.get("blockList");
    const latestflag: boolean = Boolean(parseInt(formData.get("latestflag")));
    const fileNumber: string = formData.get("fileNumber");
    const locale: string = formData.get("locale");

    await uploadBlob(
      blobPath,
      Buffer.from(await file.arrayBuffer()),
      blockId,
      blockList.split(","),
      latestflag,
      fileNumber
    );

    if (latestflag) {
      await processAudioTranscript(id, file.name, locale, blobPath);
    }

    const options = { status: 200 };
    return new Response("", options);
  } catch (error) {
    console.error(error);
    const options = { status: 500 };
    return new Response("", options);
  }
}
