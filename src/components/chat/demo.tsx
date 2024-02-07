"use client";

import React, { useEffect } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useChatContext } from "@/features/chat/chat-ui/chat-context";

const data: Info[] = [
  {
    id: "m5gr84i9",
    email: "ken99@yahoo.com",
  },
  {
    id: "au1reuv4",
    email: "Abe45@gmail.com",
  },
];

export type Info = {
  id: string;
  email: string;
};

export const columns: ColumnDef<Info>[] = [
  {
    id: "select",
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "email",
  },
];

export function DataTableDemo() {
  const { selectedFile, setSelectedFile } = useChatContext();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });
  useEffect(() => {
    table.getRowModel().rows.map((row) => {
      row.toggleSelected(selectedFile.includes(row.original.id));
    });
  }, []);

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter emails..."
          value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("email")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.index === 0 ? (
                        <Checkbox
                          checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() &&
                              "indeterminate")
                          }
                          onCheckedChange={(value) => {
                            table.toggleAllPageRowsSelected(!!value);
                            if (value) {
                              const allId = data.map((row) => {
                                return row.id;
                              });
                              setSelectedFile(allId);
                            } else {
                              setSelectedFile([]);
                            }
                          }}
                          aria-label="Select all"
                        />
                      ) : (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            header.column.toggleSorting(
                              header.column.getIsSorted() === "asc"
                            )
                          }
                        >
                          Email
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell, index) => (
                    <TableCell key={cell.id}>
                      {index === 0 ? (
                        <Checkbox
                          checked={row.getIsSelected()}
                          onCheckedChange={(value) => {
                            row.toggleSelected(!!value);
                            if (value) {
                              setSelectedFile([
                                ...selectedFile,
                                row.original.id,
                              ]);
                            } else {
                              setSelectedFile(
                                selectedFile.filter(
                                  (file) => file !== row.original.id
                                )
                              );
                            }
                          }}
                          aria-label="Select row"
                        />
                      ) : (
                        <div className="lowercase">
                          {row.getValue("email")}-{cell.row.original.id}
                        </div>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
