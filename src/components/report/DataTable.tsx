import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type Column<T> = {
  header: string;
  align?: "left" | "right";
  cell: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  caption?: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
};

export function DataTable<T>({ caption, columns, rows, rowKey }: DataTableProps<T>) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={cn(
                  "px-2 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground",
                  column.align === "right" ? "text-right" : "text-left",
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-border/60 last:border-0">
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={cn(
                    "px-2 py-2 tabular-nums text-foreground",
                    column.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
