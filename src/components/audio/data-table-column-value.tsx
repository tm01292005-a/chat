import useState from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { TableSchema } from "@/components/audio/data/schema";
import { Row } from "@tanstack/react-table";
import { useChatContext } from "@/features/chat/chat-ui/chat-context";

interface DataTableColumnValueProps {
  row: Row<TableSchema>;
}

export function DataTableColumnValue({ row }: DataTableColumnValueProps) {
  //const { onChatTypeChange } = useChatContext();
  //onChatTypeChange(row.original.id);
  return (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => {
        row.toggleSelected(!!value);
        console.log(row.original.title);
      }}
      aria-label="Select row"
      className="translate-y-[2px] hidden sm:block"
    />
  );
}
