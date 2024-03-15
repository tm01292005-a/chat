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
  const [quote, setQuote] = useState({ fileName: "", context: "" });

  useEffect(() => {
    const findDoc = async () => {
      if (docId) {
        const result = await findRelevantDocument(docId);
        if (result && result.context) {
          setQuote({ fileName: result.fileName, context: result.context });
        } else {
          // Retry after a delay
          setTimeout(findDoc, 5000); // 5000 milliseconds = 5 seconds
        }
      }
    };
    findDoc();
  }, [docId]);

  return (
    <div key={docId}>
      <Sheet key={"bottom"}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" type="submit">
            [{index}]: {quote.fileName}
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
            <div className="px-6 whitespace-pre-wrap">{quote.context}</div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};
