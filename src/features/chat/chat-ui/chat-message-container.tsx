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
