"use client";

import React, { FC } from "react";

import { columns } from "@/components/audio/columns";
import { DataTable } from "@/components/audio/data-table";
import { TableSchema } from "@/components/audio/data/schema";

interface Prop {
  tableData: TableSchema[];
}

export const AudioUI: FC<Prop> = (props) => {
  return (
    <div className="h-full w-full">
      <h2 className="text-2xl font-bold tracking-tight">音声変換</h2>
      <DataTable data={props.tableData} columns={columns} />
    </div>
  );
};
