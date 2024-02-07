"use client";
import { ChatRole } from "@/features/chat/chat-services/models";
import { isNotNullOrEmpty } from "@/features/chat/chat-services/utils";
import { cn } from "@/lib/utils";
import { CheckIcon, ClipboardIcon, UserCircle, Star } from "lucide-react";
import { FC, useEffect, useState } from "react";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import Typography from "../typography";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { CodeBlock } from "./code-block";
import { MemoizedReactMarkdown } from "./memoized-react-markdown";
import {
  FindAllChats,
  UpdateChat,
  FindChatById,
} from "@/features/chat/chat-services/chat-service";
import { ChatMessageModel } from "@/features/chat/chat-services/models";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { DataTableDemo } from "@/components/chat/demo";
import { useChatContext } from "@/features/chat/chat-ui/chat-context";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { findRelevantDocument } from "@/features/chat/chat-services/chat-document-service";

interface ChatRowProps {
  name: string;
  profilePicture: string;
  message: string;
  type: ChatRole;
  isLoading: boolean;
  id: string;
  index: number;
  chatId: string;
  feedbackStar: number | undefined;
  feedbackMessage: string | undefined;
}

const ChatRow: FC<ChatRowProps> = (props) => {
  const { selectedFile } = useChatContext();

  const [rating, setRating] = useState(props.feedbackStar);
  const [hover, setHover] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState(props.feedbackMessage);
  const [openPopover, setOpenPopover] = useState<number | null>(null);
  const [canShowPopover, setCanShowPopover] = useState(true);
  const [hasStarClicked, setHasStarClicked] = useState(false);

  const [isIconChecked, setIsIconChecked] = useState(false);
  const toggleIcon = () => {
    setIsIconChecked((prevState) => !prevState);
  };

  const handleButtonClick = () => {
    toggleIcon();
    navigator.clipboard.writeText(props.message);
  };

  const loadAndUpsertChat = async () => {
    let chat;
    const chats = await FindChatById(props.chatId);
    if (chats.length === 0) {
      const allChats = await FindAllChats(props.id);
      chat = allChats[props.index];
    } else {
      chat = chats[0];
    }
    if (chat) {
      setFeedbackMessage(chat.feedbackMessage);
      setRating(chat.feedbackStar);
    }
  };

  if (rating === undefined && props.type === "assistant") {
    (async () => {
      await loadAndUpsertChat();
    })();
  }

  const handleStarClick = async (ratingValue: number) => {
    if (hasStarClicked) {
      return;
    }
    setHasStarClicked(true);
    const loadAndUpsertChat = async () => {
      let chat;
      const chats = await FindChatById(props.chatId);
      if (chats.length === 0) {
        const allChats = await FindAllChats(props.id);
        chat = allChats[props.index];
      } else {
        chat = chats[0];
      }
      chat.feedbackStar = ratingValue;
      await UpdateChat(chat);
      setRating(ratingValue);
    };
    await loadAndUpsertChat();
  };

  const handleClick = async () => {
    const loadAndUpsertChat = async () => {
      let chat;
      const chats = await FindChatById(props.chatId);
      if (chats.length === 0) {
        const allChats = await FindAllChats(props.id);
        chat = allChats[props.index];
      } else {
        chat = chats[0];
      }
      chat.feedbackMessage = feedbackMessage || "";
      await UpdateChat(chat);
      setFeedbackMessage(feedbackMessage);
    };
    await loadAndUpsertChat();
    setOpenPopover(null);
    setCanShowPopover(false);
  };

  //  console.log("selectedFile=", selectedFile);

  const PComponent = ({ children }) => {
    const docId = "MjtlxYnpOgQf96cIsohGM";
    const [quoteContext, setQuoteContext] = useState("");

    useEffect(() => {
      const fetchQuoteContext = async () => {
        const result = await findRelevantDocument(docId);
        setQuoteContext(result);
      };

      fetchQuoteContext();
    }, [docId]);

    return (
      <>
        <p className="mb-2 last:mb-0">{children}</p>
        <div className="grid grid-cols-2 gap-2">
          <Sheet key={"bottom"}>
            <SheetTrigger asChild>
              <Button variant="outline">{"bottom"}</Button>
            </SheetTrigger>
            <SheetContent side={"bottom"}>
              <SheetHeader>
                <SheetDescription>引用</SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                <ScrollArea className="h-72 w-48 rounded-md border">
                  <div className="p-4">
                    <div className="text-sm">{quoteContext}</div>
                  </div>
                </ScrollArea>
                <div className="grid grid-cols-4 items-center gap-4"></div>
                <div className="grid grid-cols-4 items-center gap-4"></div>
              </div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button type="submit">Save changes</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </>
    );
  };

  return (
    <div
      className={cn(
        "container mx-auto max-w-4xl py-6 flex flex-col ",
        props.type === "assistant" ? "items-start" : "items-end"
      )}
    >
      <div
        className={cn(
          "flex flex-col  max-w-[690px] border rounded-lg overflow-hidden  p-4 gap-8"
        )}
      >
        <div className="flex flex-1">
          <div className="flex gap-4 items-center flex-1">
            <div className="">
              {/*<DataTableDemo />*/}
              {isNotNullOrEmpty(props.profilePicture) ? (
                <Avatar>
                  <AvatarImage src={props.profilePicture} />
                </Avatar>
              ) : (
                <UserCircle
                  width={40}
                  height={40}
                  strokeWidth={1.2}
                  className="text-primary"
                />
              )}
            </div>
            <Typography variant="h5" className="capitalize text-sm">
              {props.name}
            </Typography>
          </div>
          <Button
            variant={"ghost"}
            size={"sm"}
            title="Copy text"
            className="justify-right flex"
            onClick={handleButtonClick}
          >
            {isIconChecked ? (
              <CheckIcon size={16} />
            ) : (
              <ClipboardIcon size={16} />
            )}
          </Button>
        </div>

        <div
          className={cn(
            "-m-4 p-4",
            props.type === "assistant"
              ? "bg-secondary"
              : "bg-primary text-white"
          )}
        >
          {/* https://github.com/vercel-labs/ai-chatbot/blob/main/components/markdown.tsx */}
          {props.type === "assistant" ? (
            <MemoizedReactMarkdown
              className="prose prose-slate dark:prose-invert break-words prose-p:leading-relaxed prose-pre:p-0 max-w-none"
              remarkPlugins={[remarkGfm, remarkMath]}
              components={{
                p: PComponent,
                code({ node, inline, className, children, ...props }) {
                  if (children.length) {
                    if (children[0] == "▍") {
                      return (
                        <span className="mt-1 animate-pulse cursor-default">
                          ▍
                        </span>
                      );
                    }

                    children[0] = (children[0] as string).replace("`▍`", "▍");
                  }

                  const match = /language-(\w+)/.exec(className || "");

                  if (inline) {
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }

                  return (
                    <CodeBlock
                      key={Math.random()}
                      language={(match && match[1]) || ""}
                      value={String(children).replace(/\n$/, "")}
                      {...props}
                    />
                  );
                },
              }}
            >
              {props.message}
            </MemoizedReactMarkdown>
          ) : (
            props.message
          )}
        </div>
        <div style={{ display: "flex" }}>
          {props.type === "assistant" &&
            [...Array(5)].map((star, i) => {
              const ratingValue = i + 1;

              return (
                <Popover
                  key={i}
                  open={openPopover === i && canShowPopover}
                  onOpenChange={() =>
                    setOpenPopover(openPopover === i ? null : i)
                  }
                  modal={false}
                >
                  {(feedbackMessage === undefined ||
                    feedbackMessage.length !== 0) && (
                    <label key={i}>
                      <input
                        disabled={rating !== 0}
                        type="radio"
                        name="rating"
                        onClick={async (event) => {
                          event.stopPropagation();
                          if (hasStarClicked) {
                            return;
                          }
                          await handleStarClick(ratingValue);
                          const newPopoverState = openPopover === i ? null : i;
                          setOpenPopover(newPopoverState);
                        }}
                        style={{ display: "none" }}
                      />
                      <Star
                        className="star"
                        color={
                          ratingValue <= (hover ?? rating ?? 0)
                            ? "#ffc107"
                            : "#e4e5e9"
                        }
                        size={20}
                      />
                    </label>
                  )}
                  {feedbackMessage?.length === 0 && (
                    <PopoverTrigger>
                      <label key={i}>
                        <input
                          disabled={rating !== 0}
                          type="radio"
                          name="rating"
                          onClick={async (event) => {
                            event.stopPropagation();
                            if (hasStarClicked) {
                              return;
                            }
                            await handleStarClick(ratingValue);
                            const newPopoverState =
                              openPopover === i ? null : i;
                            setOpenPopover(newPopoverState);
                          }}
                          style={{ display: "none" }}
                        />
                        <Star
                          className="star"
                          color={
                            ratingValue <= (hover ?? rating ?? 0)
                              ? "#ffc107"
                              : "#e4e5e9"
                          }
                          size={20}
                        />
                      </label>
                    </PopoverTrigger>
                  )}

                  <PopoverContent className="w-80">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">Dimensions</h4>
                        <p className="text-sm text-muted-foreground">
                          Set the dimensions for the layer.
                        </p>
                      </div>
                      <div className="grid gap-2">
                        <div className="grid grid-cols-3 items-center gap-4">
                          <Input
                            id="maxHeight"
                            value={feedbackMessage}
                            onChange={(e) => setFeedbackMessage(e.target.value)}
                            className="col-span-2 h-8"
                          />
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                          <Button
                            onClick={async () => {
                              await handleClick();
                            }}
                          >
                            Send
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default ChatRow;
