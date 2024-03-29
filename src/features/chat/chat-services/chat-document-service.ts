"use server";

import DocumentIntelligence, {
  getLongRunningPoller,
  AnalyzeResultOperationOutput,
  isUnexpected,
} from "@azure-rest/ai-document-intelligence";
import { AzureKeyCredential } from "@azure/ai-form-recognizer";
import { SqlQuerySpec } from "@azure/cosmos";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "@langchain/openai";
import { DocxLoader } from "langchain/document_loaders/fs/docx";
import { PPTXLoader } from "langchain/document_loaders/fs/pptx";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { exec } from "child_process";
import * as XLSX from "xlsx";
import { nanoid } from "nanoid";

import { userHashedId } from "@/features/auth/helpers";
import { CosmosDBContainer } from "@/features/common/cosmos";
import { AzureCogSearch } from "@/features/langchain/vector-stores/azure-cog-search/azure-cog-vector-store";
import {
  CHAT_DOCUMENT_ATTRIBUTE,
  ChatDocumentModel,
  FaqDocumentIndex,
  ServerActionResponse,
} from "./models";
import { isNotNullOrEmpty } from "./utils";

const MAX_DOCUMENT_SIZE = 20000000;

export const UploadDocument = async (
  formData: FormData
): Promise<ServerActionResponse<string[]>> => {
  try {
    await ensureSearchIsConfigured();

    const { docs } = await LoadFile(formData);
    const splitDocuments = await SplitDocuments(docs);
    const docPageContents = splitDocuments.map((item) => item.pageContent);

    return {
      success: true,
      error: "",
      response: docPageContents,
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message,
      response: [],
    };
  }
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const toUnicode = (str: string) => {
  let result = [];
  for (let i = 0; i < str.length; i++) {
    result.push("\\u" + ("000" + str[i].charCodeAt(0).toString(16)).substr(-4));
  }
  return result;
};

const isUnicode = (str: string): boolean => {
  const replacementCharacter = "\\ufffd"; // 文字化け
  const unicodeCharacters = toUnicode(str);
  for (let i = 0, len = unicodeCharacters.length; i < len; i++) {
    if (replacementCharacter === unicodeCharacters[i]) {
      return false;
    }
  }
  return true;
};

const LoadFile = async (formData: FormData) => {
  try {
    const file: File | null = formData.get("file") as unknown as File;

    const blob = new Blob([file], { type: file.type });

    if (file.name.endsWith(".txt") || file.name.endsWith(".csv")) {
      let text = await blob.text();
      if (!isUnicode(text)) {
        // Unicodeでない場合はShift_JISとしてデコードする
        const decoder = new TextDecoder("shift_jis");
        text = decoder.decode(new Uint8Array(await blob.arrayBuffer()));
      }

      const docs: Document[] = [];
      const doc: Document = {
        pageContent: text,
        metadata: {
          file: file.name,
        },
      };
      docs.push(doc);
      return { docs };
    }

    // EXCEL
    /*
    const buf = await file.arrayBuffer();
    const data = new Uint8Array(buf);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetNameList = workbook.SheetNames;
    const allSheetsData = sheetNameList.map((sheetName) => {
      return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    });
    const docs: Document[] = [];
    allSheetsData.map((sheetData) => {
      sheetData.map((row: any) => {
        const doc: Document = {
          pageContent: row,
          metadata: {
            file: file.name,
          },
        };
        docs.push(doc);
      });
    });
    console.log("xlsxDocs", docs);
    */

    // WORD
    /*
    const docxLoader: DocxLoader = new DocxLoader(blob);
    const docxDocs = await docxLoader.loadAndSplit(
      new RecursiveCharacterTextSplitter({
        chunkSize: 1024,
        chunkOverlap: 256,
      })
    );
    console.log("docxDocs", docxDocs);
    */

    // PPTX
    /*
    const pptxLoader: PPTXLoader = new PPTXLoader(blob);
    const pptxDocs = await pptxLoader.loadAndSplit(
      new RecursiveCharacterTextSplitter({
        chunkSize: 1024,
        chunkOverlap: 256,
      })
    );
    console.log("pptxDocs", pptxDocs);
    */

    // PDF
    /*
    const pdfLoader: PDFLoader = new PDFLoader(blob);
    const pdfDocs = await pdfLoader.loadAndSplit(
      new RecursiveCharacterTextSplitter({
        chunkSize: 1024,
        chunkOverlap: 256,
      })
    );
    console.log("pdfDocs", pdfDocs);
    */

    if (file && file.size < MAX_DOCUMENT_SIZE) {
      const client = initDocumentIntelligence();
      const buffer = await file.arrayBuffer();
      const base64Source = arrayBufferToBase64(buffer);
      const initialResponse = await client
        .path("/documentModels/{modelId}:analyze", "prebuilt-layout")
        .post({
          contentType: "application/json",
          body: {
            base64Source,
          },
          queryParameters: {
            locale: "ja-JP", //locale: "en-IN",
            split: "perPage",
          },
        });
      if (isUnexpected(initialResponse)) {
        throw initialResponse.body.error;
      }
      const poller = await getLongRunningPoller(client, initialResponse);
      const result = (await poller.pollUntilDone())
        .body as AnalyzeResultOperationOutput;

      const analyzeResult = (
        (await (await poller).pollUntilDone())
          .body as AnalyzeResultOperationOutput
      ).analyzeResult;

      const pages = analyzeResult?.pages;
      if (!pages || pages.length <= 0) {
        throw new Error("Expecting non-empty pages array");
      }
      for (const page of pages) {
        console.log("- Page", page.pageNumber, `(unit: ${page.unit})`);
        console.log(`  ${page.width}x${page.height}, angle: ${page.angle}`);
        console.log(
          `  ${page.lines && page.lines.length} lines, ${
            page.words && page.words.length
          } words`
        );

        if (page.lines && page.lines.length > 0) {
          console.log("  Lines:");

          for (const line of page.lines) {
            console.log(`  - "${line.content}"`);
          }
        }
      }

      const paragraphs = result.analyzeResult?.paragraphs;

      const docs: Document[] = [];
      if (paragraphs) {
        for (const paragraph of paragraphs) {
          const doc: Document = {
            pageContent: paragraph.content,
            metadata: {
              file: file.name,
            },
          };
          docs.push(doc);
        }
      }

      return { docs };
    }
  } catch (e) {
    const error = e as any;

    if (error.details) {
      if (error.details.length > 0) {
        throw new Error(error.details[0].message);
      } else {
        throw new Error(error.details.error.innererror.message);
      }
    }

    throw new Error(error.message);
  }

  throw new Error("Invalid file format or size. Only PDF files are supported.");
};

const SplitDocuments = async (docs: Array<Document>) => {
  const allContent = docs.map((doc) => doc.pageContent).join("\n");
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1024,
    chunkOverlap: 256,
  });
  const output = await splitter.createDocuments([allContent]);
  return output;
};

export const DeleteDocuments = async (chatThreadId: string) => {
  try {
    const vectorStore = initAzureSearchVectorStore();
    await vectorStore.deleteDocuments(chatThreadId);
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message,
      response: [],
    };
  }
};

export const IndexDocuments = async (
  fileName: string,
  docs: string[],
  chatThreadId: string
): Promise<ServerActionResponse<FaqDocumentIndex[]>> => {
  try {
    const vectorStore = initAzureSearchVectorStore();

    const documentsToIndex: FaqDocumentIndex[] = [];
    let index = 0;
    for (const doc of docs) {
      const docToAdd: FaqDocumentIndex = {
        id: nanoid(),
        chatThreadId,
        user: await userHashedId(),
        pageContent: doc,
        metadata: fileName,
        embedding: [],
        fileName: `${fileName}-${index}`,
      };

      documentsToIndex.push(docToAdd);
      index++;
    }

    await vectorStore.addDocuments(documentsToIndex);

    await UpsertChatDocument(fileName, chatThreadId);
    return {
      success: true,
      error: "",
      response: documentsToIndex,
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message,
      response: [],
    };
  }
};

export const initAzureSearchVectorStore = () => {
  const embedding = new OpenAIEmbeddings();
  const azureSearch = new AzureCogSearch<FaqDocumentIndex>(embedding, {
    name: process.env.AZURE_SEARCH_NAME,
    indexName: process.env.AZURE_SEARCH_INDEX_NAME,
    apiKey: process.env.AZURE_SEARCH_API_KEY,
    apiVersion: process.env.AZURE_SEARCH_API_VERSION,
    vectorFieldName: "embedding",
  });

  return azureSearch;
};

export const initDocumentIntelligence = () => {
  const client = DocumentIntelligence(
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
    new AzureKeyCredential(process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY),
    {
      apiVersion: "2023-10-31-preview",
    }
  );
  /*
  const client = new DocumentAnalysisClient(
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
    new AzureKeyCredential(process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY)
  );
*/
  return client;
};

export const FindAllChatDocuments = async (chatThreadID: string) => {
  const container = await CosmosDBContainer.getInstance().getContainer();

  const querySpec: SqlQuerySpec = {
    query:
      "SELECT * FROM root r WHERE r.type=@type AND r.chatThreadId = @threadId AND r.isDeleted=@isDeleted",
    parameters: [
      {
        name: "@type",
        value: CHAT_DOCUMENT_ATTRIBUTE,
      },
      {
        name: "@threadId",
        value: chatThreadID,
      },
      {
        name: "@isDeleted",
        value: false,
      },
    ],
  };

  const { resources } = await container.items
    .query<ChatDocumentModel>(querySpec)
    .fetchAll();

  return resources;
};

export const UpsertChatDocument = async (
  fileName: string,
  chatThreadID: string
) => {
  const modelToSave: ChatDocumentModel = {
    chatThreadId: chatThreadID,
    id: nanoid(),
    userId: await userHashedId(),
    createdAt: new Date(),
    type: CHAT_DOCUMENT_ATTRIBUTE,
    isDeleted: false,
    name: fileName,
  };

  const container = await CosmosDBContainer.getInstance().getContainer();
  await container.items.upsert(modelToSave);
};

export const ensureSearchIsConfigured = async () => {
  var isSearchConfigured =
    isNotNullOrEmpty(process.env.AZURE_SEARCH_NAME) &&
    isNotNullOrEmpty(process.env.AZURE_SEARCH_API_KEY) &&
    isNotNullOrEmpty(process.env.AZURE_SEARCH_INDEX_NAME) &&
    isNotNullOrEmpty(process.env.AZURE_SEARCH_API_VERSION);

  if (!isSearchConfigured) {
    throw new Error("Azure search environment variables are not configured.");
  }

  var isDocumentIntelligenceConfigured =
    isNotNullOrEmpty(process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT) &&
    isNotNullOrEmpty(process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY);

  if (!isDocumentIntelligenceConfigured) {
    throw new Error(
      "Azure document intelligence environment variables are not configured."
    );
  }

  var isEmbeddingsConfigured = isNotNullOrEmpty(
    process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME
  );

  //if (!isEmbeddingsConfigured) {
  //  throw new Error("Azure openai embedding variables are not configured.");
  //}

  const vectorStore = initAzureSearchVectorStore();
  await vectorStore.ensureIndexIsCreated();
};

export const findRelevantDocument = async (docId: string): Promise<any> => {
  const vectorStore = initAzureSearchVectorStore();

  const relevantDocuments = await vectorStore.similaritySearch("", 1, {
    vectorFields: vectorStore.config.vectorFieldName,
    filter: `id eq '${docId}'`,
  });
  let info = relevantDocuments.map((doc: any) => {
    return {
      fileName: doc.metadata,
      context: doc.pageContent,
    };
  });

  return info[0];
};
