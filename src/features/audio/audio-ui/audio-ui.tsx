"use client";

import React, { FC } from "react";

import { columns } from "@/components/table/columns";
import { DataTable } from "@/components/table/data-table";

interface Prop {}

export const AudioUI: FC<Prop> = (props) => {
  return (
    <div className="">
      <h2 className="text-2xl font-bold tracking-tight">音声変換</h2>
      <DataTable data={props.tableData} columns={columns} />
    </div>
  );
};
