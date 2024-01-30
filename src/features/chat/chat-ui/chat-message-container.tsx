import ChatLoading from "@/components/chat/chat-loading";
import ChatRow from "@/components/chat/chat-row";
import { useChatScrollAnchor } from "@/components/hooks/use-chat-scroll-anchor";
import { AI_NAME } from "@/features/theme/customise";
import { useSession } from "next-auth/react";
import { useRef, useState } from "react";
import { useChatContext } from "./chat-context";
import { ChatHeader } from "./chat-header";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CheckIcon, Building2, User, Power, PowerOff } from "lucide-react";
const tags = Array.from({ length: 50 }).map(
  (_, i, a) => `file-${a.length - i}`
);

export const ChatMessageContainer = () => {
  const [isCheck, setIsCheck] = useState(Array(tags.length).fill(false));
  const { data: session } = useSession();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, getId, getFeedbackStar, getFeedbackMessage } =
    useChatContext();

  useChatScrollAnchor(messages, scrollRef);

  return (
    <div className="h-full rounded-md overflow-y-auto " ref={scrollRef}>
      <div className="flex justify-center p-4">
        <Menubar className="h-15">
          <MenubarMenu>
            <MenubarTrigger className="h-15">ナレッジ</MenubarTrigger>
            <MenubarContent className="min-w-[1rem]">
              <MenubarItem className="h-12">
                <PowerOff className="pr-1" />
                OFF
              </MenubarItem>
              <MenubarSeparator />
              <MenubarSub>
                <MenubarSubTrigger
                  onClick={() => {
                    console.log("clicked");
                  }}
                  className="h-12"
                >
                  <Power className="pr-1" />
                  ON
                </MenubarSubTrigger>
                <MenubarSubContent className="min-w-[1rem]">
                  <MenubarSub>
                    <MenubarSubTrigger
                      onClick={() => {
                        console.log("clicked");
                      }}
                      className="h-12"
                    >
                      <Building2 className="pr-1" />
                      共有
                    </MenubarSubTrigger>
                    <MenubarSubContent>
                      <MenubarSub>
                        <MenubarItem
                          onClick={() => {
                            console.log("clicked");
                          }}
                          className="h-12"
                        >
                          <CheckIcon />
                          日本語
                        </MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem
                          onClick={() => {
                            console.log("clicked");
                          }}
                          className="h-12"
                        >
                          <CheckIcon />
                          英語
                        </MenubarItem>
                      </MenubarSub>
                    </MenubarSubContent>
                  </MenubarSub>
                  <MenubarSeparator />
                  <MenubarSub>
                    <MenubarSubTrigger
                      onClick={() => {
                        console.log("clicked");
                      }}
                      className="h-12"
                    >
                      <User className="pr-1" />
                      個人
                    </MenubarSubTrigger>
                    <MenubarSubContent>
                      <MenubarSub>
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="item-1">
                            <AccordionTrigger>日本語</AccordionTrigger>
                            <AccordionContent>
                              <ScrollArea className="h-72 w-48 rounded-md border">
                                <div className="p-4">
                                  <h4 className="mb-4 text-sm font-medium leading-none">
                                    Files
                                  </h4>
                                  {tags.map((item, index) => (
                                    <>
                                      <div
                                        key={item}
                                        onClick={() => {
                                          const newIsCheck = [...isCheck];
                                          newIsCheck[index] =
                                            !newIsCheck[index];
                                          setIsCheck(newIsCheck);
                                        }}
                                        className="text-sm flex items-center"
                                      >
                                        {isCheck[index] ? (
                                          <CheckIcon className="w-7 h-7" />
                                        ) : (
                                          <div className="w-7 h-7" />
                                        )}
                                        <span className="mr-1"></span>
                                        {item}
                                      </div>
                                      <Separator className="my-2" />
                                    </>
                                  ))}
                                </div>
                              </ScrollArea>
                            </AccordionContent>
                          </AccordionItem>
                          <MenubarSeparator />
                          <AccordionItem value="item-2">
                            <AccordionTrigger>英語</AccordionTrigger>
                            <AccordionContent>
                              <ScrollArea className="h-72 w-48 rounded-md border">
                                <div className="p-4">
                                  <h4 className="mb-4 text-sm font-medium leading-none">
                                    Files
                                  </h4>
                                  {tags.map((item, index) => (
                                    <>
                                      <div
                                        key={item}
                                        onClick={() => {
                                          const newIsCheck = [...isCheck];
                                          newIsCheck[index] =
                                            !newIsCheck[index];
                                          setIsCheck(newIsCheck);
                                        }}
                                        className="text-sm flex items-center"
                                      >
                                        {isCheck[index] ? (
                                          <CheckIcon className="w-7 h-7" />
                                        ) : (
                                          <div className="w-7 h-7" />
                                        )}
                                        <span className="mr-1"></span>
                                        {item}
                                      </div>
                                      <Separator className="my-2" />
                                    </>
                                  ))}
                                </div>
                              </ScrollArea>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </MenubarSub>
                    </MenubarSubContent>
                  </MenubarSub>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <ChatHeader />
      </div>
      <div className=" pb-[80px] flex flex-col justify-end flex-1">
        {messages.map((message, index) => (
          <ChatRow
            name={message.role === "user" ? session?.user?.name! : AI_NAME}
            profilePicture={
              message.role === "user" ? session?.user?.image! : "/ai-icon.png"
            }
            message={message.content}
            type={message.role}
            key={index}
            isLoading={isLoading}
            id={getId()}
            index={index}
            chatId={message.id}
            feedbackStar={getFeedbackStar(message.id)}
            feedbackMessage={getFeedbackMessage(message.id)}
          />
        ))}
        {isLoading && <ChatLoading />}
      </div>
    </div>
  );
};
