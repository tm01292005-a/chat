import { userHashedId } from "@/features/auth/helpers";
import { CosmosDBChatMessageHistory } from "@/features/langchain/memory/cosmosdb/cosmosdb";
import { LangChainStream, StreamingTextResponse } from "ai";
import { loadQAMapReduceChain, loadQARefineChain } from "langchain/chains";
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
import { transformConversationStyleToTemperature } from "./utils";
import { ConversationChain } from "langchain/chains";

export const ChatAPIData3 = async (props: PromptGPTProps) => {
  const { lastHumanMessage, id, chatThread } = await initAndGuardChatSession(
    props
  );

  const chatModel = new ChatOpenAI({
    temperature: 0,
    streaming: false,
    verbose: true,
  });
  const chatModel2 = new ChatOpenAI({
    temperature: 0,
    streaming: true,
    verbose: true,
  });

  const relevantDocuments = (
    await findRelevantDocuments(lastHumanMessage.content, id)
  ).map((doc, index) => ({ ...doc, quoteId: index }));
  console.log("relevantDocuments", relevantDocuments);
  relevantDocuments.forEach((doc) => {
    doc.pageContent = `"""QUOTE_ID=${doc.quoteId}""" ${doc.pageContent}`;
  });

  // AIが回答を生成する際に、どのドキュメントが使用されたかを追跡
  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `Write a summary of the following in 1-2 sentences. Please leave QUOTE_ID.`
    ),
    //HumanMessagePromptTemplate.fromTemplate("{question}"),
    HumanMessagePromptTemplate.fromTemplate("{context}"),
  ]);

  const chain = loadQAMapReduceChain(chatModel, {
    combinePrompt: defineSystemPrompt(),
    combineMapPrompt: chatPrompt,
    combineLLM: chatModel2,
    returnIntermediateSteps: false,
  });

  const { stream, handlers } = LangChainStream({
    onToken: async (token: string) => {},
    onCompletion: async (completion: string) => {
      console.log("completion", completion);
      await insertPromptAndResponse(id, lastHumanMessage.content, completion);
    },
    onFinal: async (completion: string) => {
      console.log("final", completion);
    },
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

  //const ret = await
  chain.call(
    {
      input_documents: relevantDocuments,
      question: lastHumanMessage.content,
      memory: memory,
    },
    [handlers]
  );
  /*
  const content = ret.text;
  console.log("content", content);
  const outputChatModel = new ChatOpenAI({
    temperature: 0.5,
    streaming: true,
  });
  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(`Return text verbatim.`),
    HumanMessagePromptTemplate.fromTemplate("{input}"),
  ]);

  const outputChain = new ConversationChain({
    llm: outputChatModel,
    memory,
    prompt: chatPrompt,
  });
  outputChain.call({ input: content }, [handlers]);
  */

  return new StreamingTextResponse(stream);
};

const findRelevantDocuments = async (query: string, chatThreadId: string) => {
  const vectorStore = initVectorStore();

  const relevantDocuments = await vectorStore.similaritySearch(query, 5, {
    vectorFields: vectorStore.config.vectorFieldName,
    //filter: `user eq '${await userHashedId()}' and chatThreadId eq '${chatThreadId}'`,
    filter: `user eq '${await userHashedId()}'`,
  });

  return relevantDocuments;
};

const defineSystemPrompt = () => {
  const system_combine_template =
    /*
  `Given the following context and a question, create a final answer. 
  If the context is empty or If you don't know the answer, politely decline to answer the question. Don't try to make up an answer.
  ----------------
  context: {summaries}`;
*/
    /*
    `次のcontextとquestionを考慮して、最終的な回答を作成してください。contextが空の場合、または答えがわからない場合は、質問への回答を丁重にお断りします。 答えをでっち上げようとしないでください。回答に使用した参考文献を「引用元：[number of context]」というメッセージで追記してください。
   ----------------
   context: {summaries}`;
   */
    /*
    `You will be provided with a document delimited by triple quotes and a question. Your task is to answer the question using only the provided document and to cite the passage(s) of the document used to answer the question. If the document does not contain the information needed to answer this question then simply write: "Insufficient information." If an answer to the question is provided, it must be annotated with a citation. Use the following format for to cite relevant passages ("citation": …,"citation": …).
   """{summaries}"""`;*/

    `You will be provided with a document delimited by triple quotes and a question. Your task is to answer the question using only the provided document and to cite the passage(s) of the document used to answer the question. If the document does not contain the information needed to answer this question then simply write: "Insufficient information." If an answer to the question is provided, it must be annotated with a citation. Use the following format for to cite relevant passages:

   Citation format: """
   If the document states: "The sky is blue."
   Your answer with citation should look like this:
   "The sky is blue." (QUOTE_ID: 1)
   
   If the document states: "The cat sat on the mat."
   Your answer with citation should look like this:
   "The cat sat on the mat." (QUOTE_ID: 3)
   """

   summaries: """{summaries}"""
   `;

  const combine_messages = [
    SystemMessagePromptTemplate.fromTemplate(system_combine_template),
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
