import { AzureCogDocument } from "@/features/langchain/vector-stores/azure-cog-search/azure-cog-vector-store";
import { Message } from "ai";

export const CHAT_DOCUMENT_ATTRIBUTE = "CHAT_DOCUMENT";
export const CHAT_THREAD_ATTRIBUTE = "CHAT_THREAD";
export const MESSAGE_ATTRIBUTE = "CHAT_MESSAGE";

export interface ChatMessageModel {
  id: string;
  createdAt: Date;
  isDeleted: boolean;
  threadId: string;
  userId: string;
  content: string;
  role: ChatRole;
  type: "CHAT_MESSAGE";
  feedbackStar: number;
  feedbackMessage: string;
}

export type ConversationStyle = "creative" | "balanced" | "precise";
export type ChatType = "simple" | "data" | "mssql";

export type ChatRole = "system" | "user" | "assistant" | "function";

export interface ChatThreadModel {
  id: string;
  name: string;
  createdAt: Date;
  userId: string;
  useName: string;
  isDeleted: boolean;
  chatType: ChatType;
  conversationStyle: ConversationStyle;
  chatOverFileName: string;
  type: "CHAT_THREAD";
}

export interface PromptGPTBody {
  id: string; // thread id
  chatType: ChatType;
  conversationStyle: ConversationStyle;
  chatOverFileName: string;
}

export interface PromptGPTProps extends PromptGPTBody {
  messages: Message[];
}

// document models
export interface FaqDocumentIndex extends AzureCogDocument {
  id: string;
  user: string;
  chatThreadId: string;
  embedding: number[];
  pageContent: string;
  metadata: any;
  fileName: string;
}

export interface ChatDocumentModel {
  id: string;
  name: string;
  chatThreadId: string;
  userId: string;
  isDeleted: boolean;
  createdAt: Date;
  type: "CHAT_DOCUMENT";
}

export interface ServerActionResponse<T> {
  success: boolean;
  error: string;
  response: T;
}
