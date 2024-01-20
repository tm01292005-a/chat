"use server";
import "server-only";

import axios from "axios";
import { StatusType, TRANSLATE_STATUS } from "./models";

const SPEECH_REGION = process.env.AZURE_SPEECH_REGION || "";
const SPEECH_KEY = process.env.AZURE_SPEECH_KEY || "";
const BASE_URL = `https://${SPEECH_REGION}.api.cognitive.microsoft.com/speechtotext/v3.1/`;
const BLOB_ACCOUNT_NAME = process.env.AZURE_BLOB_ACCOUNT_NAME || "";
const BLOB_CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME || "";

const SPEECH_TO_TEXT_SERVICE_STATUS = {
  NOT_START: "NotStarted",
  RUNNING: "Running",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
};

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
    axios({
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
        punctuationMode: "Automatic", // 句読点を自動で付与
        // timeToLive: "", // 保存期間。最大31日。削除処理を実装したためコメントアウト
        // wordLevelTimestampsEnabled: true, // 単語レベルのタイムスタンプを付与
        diarization: {
          speakers: {
            minCount: 1,
            maxCount: 10,
          },
        }, // ダイアライゼーション分析を実施(3人以上の話者が予想される場合は必須)
        diarizationEnabled: true, // ダイアライゼーション分析を実施(2人以上の話者が予想される場合は必須)
        contentUrls: [
          `https://${BLOB_ACCOUNT_NAME}.blob.core.windows.net/${BLOB_CONTAINER_NAME}/${blobPath}`,
        ],
      },
    })
      .then((res) => {
        if (res.status === 201) {
          const transcriptionId = getTranscriptionId(res.data.self);
          console.log(
            `Create transcription Successfully. transcriptionId=${transcriptionId}`
          );
          resolve(transcriptionId);
        } else {
          console.error(
            `Create transcription Faild. displayName=${displayName} locale=${locale} blobPath=${blobPath} res=`,
            res
          );
          throw new Error(res.statusText);
        }
      })
      .catch(function (error) {
        console.error(
          `Create transcription Faild. displayName=${displayName} locale=${locale} blobPath=${blobPath} error=`,
          error
        );
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
    axios({
      baseURL: BASE_URL,
      url: `transcriptions/${transcriptionId}`,
      headers: { "Ocp-Apim-Subscription-Key": SPEECH_KEY },
    })
      .then((res) => {
        if (res.status === 200) {
          const status = getStatus(res.data.status);
          let error = "";
          if (status === ("failed" as StatusType)) {
            error = res.data.properties?.error;
          }
          console.log(
            `Get transcription Successfully. transcriptionId=${transcriptionId} status=${status} error=${error}`
          );
          resolve({ status, error });
        } else {
          console.error(
            `Get transcription Faild. transcriptionId=${transcriptionId} res=${res}`
          );
          throw new Error(res.statusText);
        }
      })
      .catch(function (error) {
        console.error(
          `Get transcription Faild. transcriptionId=${transcriptionId} error=${error}`
        );
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
    axios(req)
      .then((res) => {
        if (res.status === 200) {
          const transcription = res.data.values.find(
            ({ kind }: { kind: string }) => kind === "Transcription"
          );
          const downLoadLinks = transcription.links.contentUrl;
          console.log(
            `Get Transcription Files Successfully. transcriptionId=${transcriptionId} downLoadLinks=${downLoadLinks}`
          );
          resolve(downLoadLinks);
        } else {
          console.error(
            `Get Transcription Files Faild. transcriptionId=${transcriptionId} res=${res}`
          );
          throw new Error(res.statusText);
        }
      })
      .catch(function (error) {
        console.error(
          `Get Transcription Files Faild. transcriptionId=${transcriptionId} error=${error}`
        );
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
        if (res.status === 200 || res.status === 204) {
          console.log(
            `Delete Transcription Successfully. transcriptionId=${transcriptionId}`
          );
          resolve(res.data);
        } else {
          console.error(
            `Delete Transcription Faild. transcriptionId=${transcriptionId} res=${res}`
          );
          throw new Error(res.statusText);
        }
      })
      .catch(function (error) {
        console.error(
          `Delete Transcription Faild. transcriptionId=${transcriptionId} error=${error}`
        );
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
          let datas: Array<any> = res.data.combinedRecognizedPhrases;
          const text = datas[0].display; // channel0のデータを取得
          console.info(
            `Download transcription data Successfully. downLoadLink=${downLoadLink}`
          );
          resolve(text);
        } else {
          console.error(
            `Download transcription data Faild. downLoadLink=${downLoadLink} res=${res}`
          );
          throw new Error(res.statusText);
        }
      })
      .catch(function (error) {
        console.error(
          `Download transcription data Faild. downLoadLink=${downLoadLink} error=${error}`
        );
        throw new Error(error);
      });
  });
};

/**
 * Get transcription id
 * @param selfUrl selfUrl
 * @returns transcription id
 */
const getTranscriptionId = (selfUrl: string) => {
  const urlSegments = selfUrl.split("/");
  return urlSegments[urlSegments.length - 1];
};

/**
 * Get status
 * @param status azure speech to text status
 * @returns StatusType
 */
const getStatus = (status: string): StatusType => {
  switch (status) {
    case SPEECH_TO_TEXT_SERVICE_STATUS.NOT_START:
    case SPEECH_TO_TEXT_SERVICE_STATUS.RUNNING:
      return TRANSLATE_STATUS.IN_PROGRESS as StatusType;
    case SPEECH_TO_TEXT_SERVICE_STATUS.SUCCEEDED:
      return TRANSLATE_STATUS.DONE as StatusType;
    case SPEECH_TO_TEXT_SERVICE_STATUS.FAILED:
      return TRANSLATE_STATUS.FAILED as StatusType;
    default:
      console.warn(`unknown status. status=${status}`);
      return TRANSLATE_STATUS.FAILED as StatusType;
  }
};
