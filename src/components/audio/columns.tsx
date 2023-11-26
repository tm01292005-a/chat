//"use client";

import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckCircle2,
  XCircle,
  Ban,
  Clock3,
} from "lucide-react";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { TableSchema } from "@/components/audio/data/schema";
import { DataTableColumnHeader } from "@/components/audio/data-table-column-header";
import { DataTableRowActions } from "@/components/audio/data-table-row-actions";
import { DataTableRowDownloadActions } from "@/components/audio/data-table-row-download-actions";
import { Button } from "../ui/button";
import Link from "next/link";

/**
 * ステータス
 */
export const statuses = [
  {
    value: "failed",
    label: "Failed",
    icon: Ban,
    color: "#ff0000",
  },
  {
    value: "in progress",
    label: "In progress",
    icon: Clock3,
    color: "#004cff",
  },
  {
    value: "done",
    label: "Done",
    icon: CheckCircle2,
    color: "#008a02",
  },
  {
    value: "canceled",
    label: "Canceled",
    icon: XCircle,
  },
];
let path = "";
const getPath = () => {
  return path + "aaa";
};

export const columns: ColumnDef<TableSchema>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[100px] lg:max-w-[500px] md:max-w-[350px] sm:max-w-[250px] truncate font-medium">
            {row.getValue("title")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "transcriptionId",
    header: ({ column }) => <div className="h-0 w-0"></div>,
    cell: ({ row }) => <div className="h-0 w-0"></div>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = statuses.find(
        (status) => status.value === row.getValue("status")
      );

      if (!status) {
        return null;
      }

      return (
        <div className="flex w-[100px] items-center">
          {status.icon && (
            <status.icon
              color={status.color}
              className="mr-2 h-4 w-4 text-muted-foreground"
            />
          )}
          <span>{status.label}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },

  {
    accessorKey: "id",
    header: ({ column }) => <div className="h-0 w-0"></div>,
    cell: ({ row }) => <div className="h-0 w-0"></div>,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CreatedAt" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate font-medium">
            {row.getValue("createdAt")}
          </span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "download",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Download" />
    ),
    cell: ({ row }) => <DataTableRowDownloadActions row={row} />,
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
