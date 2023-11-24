import axios from "axios";
import { StatusType } from "../audio/audio-services/models";

const SPEECH_REGION = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || "";
const SPEECH_KEY = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || "";
const BASE_URL = `https://${SPEECH_REGION}.api.cognitive.microsoft.com/speechtotext/v3.1/`;

const BLOB_ACCOUNT_NAME = process.env.NEXT_PUBLIC_AZURE_BLOB_ACCOUNT_NAME || "";
const BLOB_CONTAINER_NAME =
  process.env.NEXT_PUBLIC_AZURE_BLOB_CONTAINER_NAME || "";

/**
 * Create transcription
 * https://eastus.dev.cognitive.microsoft.com/docs/services/speech-to-text-api-v3-1/operations/Transcriptions_Create
 * @param displayName displayName
 * @param locale locale
 * @param blobPath blobPath
 */
export const createTranscription = async (
  displayName: string,
  locale: string,
  blobPath: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const req = {
      baseURL: BASE_URL,
      url: `transcriptions`,
      method: "post",
      headers: {
        "Ocp-Apim-Subscription-Key": SPEECH_KEY,
        "Content-Type": "application/json",
      },
      data: {
        displayName: displayName,
        locale: locale,
        punctuationMode: "Dictated", // 句読点を自動で付与
        // timeToLive: "", // 保存期間。最大31日
        contentUrls: [
          `https://${BLOB_ACCOUNT_NAME}.blob.core.windows.net/${BLOB_CONTAINER_NAME}/${blobPath}`,
        ],
      },
    };

    console.info("Create transcription. req=", req);
    axios(req)
      .then((res) => {
        if (res.status === 201) {
          console.log(`Create transcription Successfully. res=`, res);
          const transcriptionId = getTranscriptionId(res.data.self);
          resolve(transcriptionId);
        } else {
          console.log(`Create transcription Faild. res=`, res);
          throw new Error(res.statusText);
        }
      })
      .catch(function (error) {
        console.log(`Create transcription Faild. error=`, error);
        throw new Error(error);
      });
  });
};

/**
 * Get transcription
 * https://eastus.dev.cognitive.microsoft.com/docs/services/speech-to-text-api-v3-1/operations/Transcriptions_Get
 * @param transcriptionId Transcription id
 */
export const getTranscription = async (
  transcriptionId: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const req = {
      baseURL: BASE_URL,
      url: `transcriptions/${transcriptionId}`,
      headers: { "Ocp-Apim-Subscription-Key": SPEECH_KEY },
    };
    console.info("Get transcription. req=", req);
    axios(req)
      .then((res) => {
        if (res.status === 200) {
          console.log(`Get transcription Successfully. res=`, res.data);
          const status = getStatus(res.data.status);
          let error = "";
          if (status === ("failed" as StatusType)) {
            error = res.data.properties?.error;
          }
          resolve({ status, error });
        } else {
          console.log(`Get transcription Faild. res=`, res);
          throw new Error(res.statusText);
        }
      })
      .catch(function (error) {
        console.log(`Get transcription Faild. error=`, error);
        reject({});
        throw new Error(error);
      });
  });
};

/**
 * Get transcription files
 * https://eastus.dev.cognitive.microsoft.com/docs/services/speech-to-text-api-v3-1/operations/Transcriptions_ListFiles
 * @param transcriptionId transcription id
 */
export const getTranscriptionFiles = async (
  transcriptionId: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const req = {
      baseURL: BASE_URL,
      url: `transcriptions/${transcriptionId}/files`,
      headers: { "Ocp-Apim-Subscription-Key": SPEECH_KEY },
    };
    console.info("Get Transcription Files. req=", req);
    axios(req)
      .then((res) => {
        if (res.status === 200) {
          console.log(`Get Transcription Files Successfully. res=`, res.data);
          const transcription = res.data.values.find(
            ({ kind }) => kind === "Transcription"
          );
          const downLoadLinks = transcription.links.contentUrl;
          resolve(downLoadLinks);
        } else {
          console.log(`Get Transcription Files Faild. res=`, res);
          throw new Error(res.statusText);
        }
      })
      .catch(function (error) {
        console.log(`Get Transcription Files Faild. error=`, error);
        throw new Error(error);
      });
  });
};

/**
 * Delete transcription
 * https://eastus.dev.cognitive.microsoft.com/docs/services/speech-to-text-api-v3-1/operations/Transcriptions_Delete
 * @param transcriptionId transcription id
 */
export const deleteTranscription = async (
  transcriptionId: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    axios({
      baseURL: BASE_URL,
      url: `transcriptions/${transcriptionId}`,
      method: "delete",
      headers: { "Ocp-Apim-Subscription-Key": SPEECH_KEY },
    })
      .then((res) => {
        if (res.status === 200) {
          resolve(res.data);
        } else {
          console.log(`Get Transcription Files Faild. res=`, res);
          throw new Error(res.statusText);
        }
      })
      .catch(function (error) {
        console.log(`Get Transcription Files Faild. error=`, error);
        throw new Error(error);
      });
  });
};

/**
 * Download transcription data
 * @param downLoadLink Transcription file URL link
 */
export const downloadTranscriptionData = async (
  downLoadLink: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    console.info("Download transcription data. url=", downLoadLink);
    axios
      .get(downLoadLink)
      .then((res) => {
        if (res.status === 200) {
          const textArray = [];
          let datas: Array<any> = res.data.combinedRecognizedPhrases;
          for (let i = 0; i < datas.length; i++) {
            textArray.push(datas[i].lexical);
          }
          const text = textArray.join("\n");
          console.log("text: ", text);
          resolve(text);
        } else {
          console.log(`Download transcription data. url=", downLoadLink`);
          throw new Error(res.statusText);
        }
      })
      .catch(function (error) {
        console.log(`Download transcription data. error=`, error);
        throw new Error(error);
      });
  });
};

/**
 * Get transcription id
 * @param selfUrl selfUrl
 * @returns transcription id
 */
const getTranscriptionId = async (selfUrl: string) => {
  const tmp = selfUrl.split("/");
  return tmp[tmp.length - 1];
};

/**
 * Get status
 * @param status azure speech to text status
 * @returns StatusType
 */
const getStatus = (status: string) => {
  switch (status) {
    case "NotStarted": // The long running operation has not yet started.
    case "Running": // The long running operation is currently processing.
      return "in progress" as StatusType;
    case "Succeeded": // The long running operation has successfully completed.
      return "done" as StatusType;
    case "Failed": // The long running operation has failed.
      return "failed" as StatusType;
    default:
      console.log(`unknown status. status=${status}`);
      return "failed" as StatusType;
  }
};
