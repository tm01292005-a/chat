import { OpenAI } from "@langchain/openai";

export const handleLLMError = async (
  e: Error,
  runId: string,
  writer: WritableStreamDefaultWriter<any>
) => {
  const chat = new OpenAI({ temperature: 0 });
  const error = await chat.invoke(`翻訳してください: ${e.message}`);
  writer.write(`${runId}, ${error}`);
  writer.close();
};

export const handleChainError = async (
  e: Error,
  runId: string,
  writer: WritableStreamDefaultWriter<any>
) => {
  const chat = new OpenAI({ temperature: 0 });
  const error = await chat.invoke(`翻訳してください: ${e.message}`);
  writer.write(`${runId}, ${error}`);
  writer.close();
};
