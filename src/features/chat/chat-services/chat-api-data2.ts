import { z } from "zod";
import { LLMResult } from "langchain/schema";

import { userHashedId } from "@/features/auth/helpers";
import { CosmosDBChatMessageHistory } from "@/features/langchain/memory/cosmosdb/cosmosdb";
import {
  LangChainStream,
  StreamingTextResponse,
  experimental_StreamData,
} from "ai";
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
import { StringOutputParser } from "@langchain/core/output_parsers";
import { Generation } from "@langchain/core/outputs";
import { RunnableSequence } from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";
import { Document } from "@langchain/core/documents";
import { RunnablePassthrough, RunnableMap } from "@langchain/core/runnables";
import { StructuredTool } from "@langchain/core/tools";
import { formatToOpenAITool } from "@langchain/openai";
import { JsonOutputKeyToolsParser } from "langchain/output_parsers";
import { CallbackManager } from "langchain/callbacks";

const outputParser = new JsonOutputKeyToolsParser({
  keyName: "cited_answer",
  returnSingle: true,
});

class CitedAnswer extends StructuredTool {
  name = "cited_answer";

  description =
    "Answer the user question based only on the given sources, and cite the sources used.";

  schema = z.object({
    answer: z
      .string()
      .describe(
        "The answer to the user question, which is based only on the given sources."
      ),
    citations: z
      .array(z.number())
      .describe("The IDs of the SPECIFIC sources which justify the answer."),
  });

  constructor() {
    super();
  }

  _call(input: z.infer<(typeof this)["schema"]>): Promise<string> {
    return Promise.resolve(JSON.stringify(input, null, 2));
  }
}

const llm = new ChatOpenAI({
  temperature: 0,
  streaming: true,
  verbose: true,
});

const asOpenAITool = formatToOpenAITool(new CitedAnswer());
const tools1 = [asOpenAITool];
const llmWithTool1 = llm.bind({
  tools: tools1,
  tool_choice: asOpenAITool,
});

const system_combine_template = `You will be provided with a document delimited by triple quotes and a question. Your task is to answer the question using only the provided document and to cite the passage(s) of the document used to answer the question. If the document does not contain the information needed to answer this question then simply write: "Insufficient information." If an answer to the question is provided, it must be annotated with a citation. Use the following format for to cite relevant passages:

   Citation format: """
   If the document states: "The sky is blue."
   Your answer with citation should look like this:
   "The sky is blue." (QUOTE_ID: 1)
   
   If the document states: "The cat sat on the mat."
   Your answer with citation should look like this:
   "The cat sat on the mat." (QUOTE_ID: 3)
   """
   context: """{context}"""
   `;

export const ChatAPIData2 = async (props: PromptGPTProps) => {
  const { lastHumanMessage, id, chatThread } = await initAndGuardChatSession(
    props
  );
  const data = new experimental_StreamData();
  data.append({
    text: "Some custom data",
  });

  const { stream, handlers } = LangChainStream({
    onToken: async (token: string) => {},
    onCompletion: async (completion: string) => {
      completion = completion + "TEST";
      console.log("completion", completion);
      await insertPromptAndResponse(id, lastHumanMessage.content, completion);
    },
    onFinal: async (completion: string) => {
      console.log("final", completion);
    },
    experimental_streamData: true,
  });
  data.append({
    text: "Hello, how are you?",
  });

  const chatModel = new ChatOpenAI({
    temperature: 0,
    streaming: true,
    verbose: true,
    callbackManager: CallbackManager.fromHandlers({
      handleLLMEnd: async (output: LLMResult, runId: string) => {
        output.generations.map(
          (value: Generation[], index: number, array: Generation[][]) => {
            console.log("value", value);
            console.log("array", array);
          }
        );
      },
      handleLLMError: async (err: any, runId: string) => {
        console.log("handleLLMError", err, runId);
      },
    }),
  });

  const vectorStore = initVectorStore();
  const vectorStoreRetriever = vectorStore.asRetriever(3, {
    vectorFields: vectorStore.config.vectorFieldName,
    //filter: `user eq '${await userHashedId()}' and chatThreadId eq '${id}'`,
    filter: `user eq '${await userHashedId()}'`,
  });

  const messages = [
    SystemMessagePromptTemplate.fromTemplate(system_combine_template),
    HumanMessagePromptTemplate.fromTemplate("{question}"),
  ];
  const prompt = ChatPromptTemplate.fromMessages(messages);

  const formatDocsWithId = (docs: Array<Document>): string => {
    return (
      "\n\n" +
      docs
        .map(
          (doc: Document, idx: number) =>
            `Source ID: ${idx}\nArticle title: ${doc.metadata.title}\nArticle Snippet: ${doc.pageContent}`
        )
        .join("\n\n")
    );
  };

  const answerChain1 = prompt.pipe(llmWithTool1).pipe(outputParser);
  const map1 = RunnableMap.from({
    question: new RunnablePassthrough(),
    docs: vectorStoreRetriever,
  });
  const chain1 = map1
    .assign({
      context: (input: { docs: Array<Document> }) =>
        formatDocsWithId(input.docs),
    })
    .assign({ cited_answer: answerChain1 })
    .pick(["cited_answer", "docs"]);
  //  const aaa = await chain1.invoke(lastHumanMessage.content);

  const chain = RunnableSequence.from([
    {
      sourceDocuments: RunnableSequence.from([
        (input) => input.question,
        vectorStoreRetriever,
      ]),
      question: (input) => input.question,
    },
    {
      sourceDocuments: (previousStepResult) =>
        previousStepResult.sourceDocuments,
      question: (previousStepResult) => previousStepResult.question,
      context: (previousStepResult) =>
        formatDocumentsAsString(previousStepResult.sourceDocuments),
    },
    {
      result: prompt.pipe(chatModel).pipe(new StringOutputParser()),
      sourceDocuments: (previousStepResult) =>
        previousStepResult.sourceDocuments,
    },
  ]);

  /*
  const relevantDocuments = (
    await findRelevantDocuments(lastHumanMessage.content, id)
  ).map((doc, index) => ({ ...doc, quoteId: index }));
  console.log("relevantDocuments", relevantDocuments);
  relevantDocuments.forEach((doc) => {
    doc.pageContent = `"""QUOTE_ID=${doc.quoteId}""" ${doc.pageContent}`;
  });

  // AIが回答を生成する際に、どのドキュメントが使用されたかを追跡
  const chain = loadQAMapReduceChain(chatModel, {
    combinePrompt: defineSystemPrompt(),
    returnIntermediateSteps: false,
  });
  */

  const aaa = await chain1.invoke(lastHumanMessage.content);
  console.log("aaa", aaa);

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

  const res = await chain.invoke({
    question: lastHumanMessage.content,
    memory: memory,
  });

  const quoteFileIds = res.sourceDocuments.map((doc: any) => {
    return doc.id;
  });
  console.log("quoteFiles:", quoteFileIds);
  //console.log(JSON.stringify(res, null, 2));

  /*
  //const ret = await
  chain.call(
    {
      input_documents: relevantDocuments,
      question: lastHumanMessage.content,
      memory: memory,
    },
    [handlers]
  );
  */
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

  return new StreamingTextResponse(stream, {}, data);
};

const findRelevantDocuments = async (query: string, chatThreadId: string) => {
  const vectorStore = initVectorStore();

  const relevantDocuments = await vectorStore.similaritySearch(query, 10, {
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
