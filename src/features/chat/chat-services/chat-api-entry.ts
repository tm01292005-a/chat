import { ChatAPIData } from "./chat-api-data";
import { ChatAPISimple } from "./chat-api-simple";
import { PromptGPTProps } from "./models";
import { ChatAPIData2 } from "./chat-api-data2";
import { ChatAPIData3 } from "./chat-api-data3";

export const chatAPIEntry = async (props: PromptGPTProps) => {
  if (props.chatType === "simple") {
    return await ChatAPISimple(props);
  } else if (props.chatType === "data") {
    //    return await ChatAPIData(props);
    //return await ChatAPIData2(props);
    return await ChatAPIData3(props);
  } else if (props.chatType === "mssql") {
    return await ChatAPIData(props);
  } else {
    return await ChatAPISimple(props);
  }
};
