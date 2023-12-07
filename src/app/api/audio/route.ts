import type { NextApiRequest, NextApiResponse } from "next";
import { uploadBlob } from "@/features/audio/audio-services/audio-storage-service";

export async function POST(req: NextApiRequest, res: NextApiResponse) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const blobPath = formData.get("blobPath");
    const fileType = formData.get("fileType");

    const chunks = [];
    for await (const chunk of file.stream()) {
      chunks.push(chunk);
    }
    const buf = Buffer.concat(chunks);

    await uploadBlob(blobPath, fileType, buf);

    const options = { status: 200 };
    return new Response("", options);
  } catch (error) {
    console.error(error);
    const options = { status: 500 };
    return new Response("", options);
  }
}
