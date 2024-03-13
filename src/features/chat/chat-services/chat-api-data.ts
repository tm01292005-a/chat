import { userHashedId } from "@/features/auth/helpers";
import { CosmosDBChatMessageHistory } from "@/features/langchain/memory/cosmosdb/cosmosdb";
import { LangChainStream, StreamingTextResponse } from "ai";
import { loadQAMapReduceChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { BufferWindowMemory } from "langchain/memory";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { AzureCogSearch } from "../../langchain/vector-stores/azure-cog-search/azure-cog-vector-store";
import { insertPromptAndResponse } from "./chat-service";
import { initAndGuardChatSession } from "./chat-thread-service";
import { FaqDocumentIndex, PromptGPTProps } from "./models";

export const ChatAPIData = async (props: PromptGPTProps) => {
  const { lastHumanMessage, id, chatThread } = await initAndGuardChatSession(
    props
  );

  const chatModel = new ChatOpenAI({
    temperature: 0,
    streaming: false,
    verbose: false,
  });
  const combineLlm = new ChatOpenAI({
    temperature: 0,
    streaming: true,
    verbose: true,
  });

  const userId = await userHashedId();
  const memory = new BufferWindowMemory({
    k: 100,
    returnMessages: true,
    memoryKey: "history",
    chatHistory: new CosmosDBChatMessageHistory({
      sessionId: id,
      userId: userId,
    }),
  });

  const relevantDocuments = (
    await findRelevantDocuments(lastHumanMessage.content, id)
  ).map((doc, index) => ({ ...doc, quoteId: doc.id }));
  relevantDocuments.forEach((doc) => {
    doc.pageContent = `<${doc.quoteId}>${doc.pageContent}</${doc.quoteId}>`;
  });

  // AIが回答を生成する際に、どのドキュメントが使用されたかを追跡
  const chain = loadQAMapReduceChain(chatModel, {
    combineMapPrompt: defineCombineMapSystemPrompt(),
    combineLLM: combineLlm,
    combinePrompt: defineSystemPrompt(),
    returnIntermediateSteps: false,
  });

  const { stream, handlers } = LangChainStream({
    onCompletion: async (completion: string) => {
      await insertPromptAndResponse(id, lastHumanMessage.content, completion);
    },
  });

  //const ret = await
  chain.call(
    {
      input_documents: relevantDocuments,
      question: lastHumanMessage.content,
      memory: memory,
    },
    [handlers]
  );

  return new StreamingTextResponse(stream, {});
};

const findRelevantDocuments = async (query: string, chatThreadId: string) => {
  const vectorStore = initVectorStore();

  const relevantDocuments = await vectorStore.similaritySearch(query, 10, {
    vectorFields: vectorStore.config.vectorFieldName,
    filter: `user eq '${await userHashedId()}'`,
  });

  return relevantDocuments;
};

const defineSystemPrompt = () => {
  const system_combine_template = `You will be provided with a document delimited by triple quotes and a question. Your task is to answer the question using only the provided document and to cite the passage(s) of the document used to answer the question. If the document does not contain the information needed to answer this question then simply write: "Insufficient information." If an answer to the question is provided, it must be annotated with a citation. Use the following format for to cite relevant passages:

   Citation format: """
   If the document states: "----------------\nThe sky is blue. [qa3WOHjnPNY9dxHMhi4N]"
   Your answer with citation should look like this: "The sky is blue. [qa3WOHjnPNY9dxHMhi4N]" 
   
   If the document states: "The cat sat on the mat. [cGAMq3hrSA-tamX0AK9JV]"
   Your answer with citation should look like this: "The cat sat on the mat. [cGAMq3hrSA-tamX0AK9JV]" 
   """

   Summaries: """{summaries}"""
   `;

  const combine_messages = [
    SystemMessagePromptTemplate.fromTemplate(system_combine_template),
    HumanMessagePromptTemplate.fromTemplate("{question}"),
  ];
  const CHAT_COMBINE_PROMPT =
    ChatPromptTemplate.fromPromptMessages(combine_messages);

  return CHAT_COMBINE_PROMPT;
};

const defineCombineMapSystemPrompt = () => {
  const system_combine_map_template = `Use the following portion of a long document to see if any of the text is relevant to answer the question. 
  Return any relevant text verbatim.If an answer to the question is provided, it must be annotated with a citation. Use the following format for to cite relevant passages:

  Citation format: """
  If the document states: "<qa3WOHjnPNY9dxHMhi4N>The sky is blue.</qa3WOHjnPNY9dxHMhi4N>"
  Your answer with citation should look like this: "----------------\nThe sky is blue. [qa3WOHjnPNY9dxHMhi4N]"
  
  If the document states: "<cGAMq3hrSA-tamX0AK9JV>The cat sat on the mat.</cGAMq3hrSA-tamX0AK9JV>"
  Your answer with citation should look like this: "----------------\nThe cat sat on the mat. [cGAMq3hrSA-tamX0AK9JV]"
  """

  ----------------
  {context}`;
  const combine_messages = [
    SystemMessagePromptTemplate.fromTemplate(system_combine_map_template),
    HumanMessagePromptTemplate.fromTemplate("{question}"),
  ];
  const CHAT_COMBINE_PROMPT =
    ChatPromptTemplate.fromPromptMessages(combine_messages);

  return CHAT_COMBINE_PROMPT;
};

const initVectorStore = () => {
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
