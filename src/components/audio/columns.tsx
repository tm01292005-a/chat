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
import { DataTableColumnValue } from "./data-table-column-value";

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
      <>
        <DataTableColumnValue row={row} />
        {/*
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value);
            console.log(row.original.title);
          }}
          aria-label="Select row"
          className="translate-y-[2px] hidden sm:block"
        />
        */}
      </>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row, column }) => {
      return (
        <>
          <span className="sm:hidden max-w-[100px] lg:max-w-[500px] md:max-w-[350px] sm:max-w-[250px] truncate font-medium">
            {"Title:"}
          </span>

          <div className="flex space-x-2">
            <span className="max-w-[100px] lg:max-w-[500px] md:max-w-[350px] sm:max-w-[250px] truncate font-medium">
              {row.getValue("title")}
            </span>
          </div>
        </>
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
        <>
          <span className="sm:hidden w-[150px] truncate font-medium">
            {"Status:"}
          </span>
          <div className="flex w-[100px] items-center">
            {status.icon && (
              <status.icon
                color={status.color}
                className="mr-2 h-4 w-4 text-muted-foreground"
              />
            )}
            <span>{status.label}</span>
          </div>
        </>
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
        <>
          <span className="sm:hidden max-w-[100px] lg:max-w-[500px] md:max-w-[350px] sm:max-w-[250px] truncate font-medium">
            {"CreatedAt:"}
          </span>

          <div className="flex space-x-2">
            <span className="max-w-[500px] truncate font-medium">
              {row.getValue("createdAt")}
            </span>
          </div>
        </>
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
    cell: ({ row }) => {
      return (
        <div className="flex flex-row">
          <DataTableRowDownloadActions row={row} />
          <div className="sm:hidden">
            <DataTableRowActions row={row} />
          </div>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      <div className="hidden sm:block">
        <DataTableRowActions row={row} />
      </div>;
    },
  },
];
