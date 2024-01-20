"use client";

import { X } from "lucide-react";
import { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { statuses } from "@/components/audio/columns";

import { DataTableFilter } from "./data-table-filter";
import { AudioFileUploadDialog } from "@/features/audio/audio-ui/audio-file-upload-dialog";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <>
      {/* スマホ表示 */}
      <div className="sm:hidden">
        <div className="px-2 py-4 mr-1">
          <AudioFileUploadDialog />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center space-x-2">
            <div className="flex flex-1 items-center space-x-2 pl-2">
              <Input
                placeholder="Filter Title..."
                value={
                  (table.getColumn("title")?.getFilterValue() as string) ?? ""
                }
                onChange={(event) =>
                  table.getColumn("title")?.setFilterValue(event.target.value)
                }
                className="h-8 w-[150px]"
              />
            </div>
            <div className="px-3">
              {table.getColumn("status") && (
                <DataTableFilter
                  column={table.getColumn("status")}
                  title="Status"
                  options={statuses}
                />
              )}
            </div>
            {isFiltered && (
              <Button
                variant="ghost"
                onClick={() => table.resetColumnFilters()}
                className="h-8 px-2 lg:px-3"
              >
                Reset
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      {/* PC表示 */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between h-10">
          <div className="flex flex-1 items-center space-x-2">
            <Input
              placeholder="Filter Title..."
              value={
                (table.getColumn("title")?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn("title")?.setFilterValue(event.target.value)
              }
              className="h-8 w-[150px] lg:w-[250px]"
            />
            {table.getColumn("status") && (
              <DataTableFilter
                column={table.getColumn("status")}
                title="Status"
                options={statuses}
              />
            )}
            {isFiltered && (
              <Button
                variant="ghost"
                onClick={() => table.resetColumnFilters()}
                className="h-8 px-2 lg:px-3"
              >
                Reset
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
          <AudioFileUploadDialog />
        </div>
      </div>
    </>
  );
}
