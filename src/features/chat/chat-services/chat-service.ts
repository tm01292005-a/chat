"use server";
import "server-only";

import { SqlQuerySpec } from "@azure/cosmos";
import { nanoid } from "nanoid";
import { CosmosDBContainer } from "../../common/cosmos";
import { ChatMessageModel, MESSAGE_ATTRIBUTE } from "./models";

export const FindAllChats = async (chatThreadID: string) => {
  const container = await CosmosDBContainer.getInstance().getContainer();

  const querySpec: SqlQuerySpec = {
    query:
      "SELECT * FROM root r WHERE r.type=@type AND r.threadId = @threadId AND r.isDeleted=@isDeleted",
    parameters: [
      {
        name: "@type",
        value: MESSAGE_ATTRIBUTE,
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
    .query<ChatMessageModel>(querySpec)
    .fetchAll();

  return resources;
};

export const FindChatById = async (id: string) => {
  const container = await CosmosDBContainer.getInstance().getContainer();

  const querySpec: SqlQuerySpec = {
    query:
      "SELECT * FROM root r WHERE r.type=@type AND r.id = @id AND r.isDeleted=@isDeleted AND r.role=@role",
    parameters: [
      {
        name: "@type",
        value: MESSAGE_ATTRIBUTE,
      },
      {
        name: "@id",
        value: id,
      },
      {
        name: "@role",
        value: "assistant",
      },
      {
        name: "@isDeleted",
        value: false,
      },
    ],
  };

  const { resources } = await container.items
    .query<ChatMessageModel>(querySpec)
    .fetchAll();

  return resources;
};

export const UpsertChat = async (chatModel: ChatMessageModel) => {
  const modelToSave: ChatMessageModel = {
    ...chatModel,
    id: nanoid(),
    createdAt: new Date(),
    type: MESSAGE_ATTRIBUTE,
    isDeleted: false,
  };

  const container = await CosmosDBContainer.getInstance().getContainer();
  await container.items.upsert(modelToSave);
};

export const UpdateChat = async (chatModel: ChatMessageModel) => {
  const modelToSave: ChatMessageModel = {
    ...chatModel,
    id: chatModel.id,
    createdAt: new Date(),
    type: MESSAGE_ATTRIBUTE,
    isDeleted: false,
  };

  const container = await CosmosDBContainer.getInstance().getContainer();
  await container.items.upsert(modelToSave);
};

export const insertPromptAndResponse = async (
  threadID: string,
  userQuestion: string,
  assistantResponse: string
) => {
  await UpsertChat({
    ...newChatModel(),
    content: userQuestion,
    threadId: threadID,
    role: "user",
  });
  await UpsertChat({
    ...newChatModel(),
    content: assistantResponse,
    threadId: threadID,
    role: "assistant",
  });
};

export const newChatModel = (): ChatMessageModel => {
  return {
    content: "",
    threadId: "",
    role: "user",
    userId: "",
    id: nanoid(),
    createdAt: new Date(),
    type: MESSAGE_ATTRIBUTE,
    isDeleted: false,
    feedbackStar: 0,
    feedbackMessage: "",
  };
};
