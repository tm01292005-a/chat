import { FC, useEffect, useState } from "react";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { findRelevantDocument } from "@/features/chat/chat-services/chat-document-service";

interface ChatQuoteRowProps {
  index: string;
  docId: string;
}

export const ChatQuoteRow: FC<ChatQuoteRowProps> = ({ index, docId }) => {
  const [quoteFileName, setQuoteFileName] = useState("");
  const [quoteContext, setQuoteContext] = useState("");

  useEffect(() => {
    const findDoc = async (docId: string) => {
      if (docId !== "") {
        const result = await findRelevantDocument(docId);
        if (result) {
          setQuoteFileName(result.fileName);
          setQuoteContext(result.context);
        }
      }
    };
    findDoc(docId);
  }, []);

  return (
    <div key={docId}>
      <Sheet key={"bottom"}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" type="submit">
            [{index}]: {quoteFileName}
          </Button>
        </SheetTrigger>
        <SheetContent
          side={"bottom"}
          className="min-w-[480px] sm:w-[540px] flex flex-col"
        >
          <SheetHeader>
            <SheetDescription>引用</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 flex -mx-6">
            <div className="px-6 whitespace-pre-wrap">{quoteContext}</div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};
