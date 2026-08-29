import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BaseFieldProps = {
  id: string;
  label: string;
  hint?: string;
};

export function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
  step = "any",
}: BaseFieldProps & { value: number; onChange: (value: number) => void; step?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))}
        className="h-9 tabular-nums"
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function TextField({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
}: BaseFieldProps & { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-9"
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export type RepeatColumn<T> = {
  key: keyof T & string;
  label: string;
  type?: "text" | "number";
  width?: string;
};

type RepeatTableProps<T extends Record<string, unknown>> = {
  label: string;
  description?: string;
  columns: RepeatColumn<T>[];
  rows: T[];
  emptyRow: T;
  onChange: (rows: T[]) => void;
  addLabel?: string;
};

export function RepeatTable<T extends Record<string, unknown>>({
  label,
  description,
  columns,
  rows,
  emptyRow,
  onChange,
  addLabel = "Satır ekle",
}: RepeatTableProps<T>) {
  const update = (index: number, key: string, raw: string, type: "text" | "number") => {
    const next = rows.map((row, i) =>
      i === index ? { ...row, [key]: type === "number" ? (raw === "" ? 0 : Number(raw)) : raw } : row,
    );
    onChange(next);
  };

  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>

      <div className="overflow-x-auto border border-border">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.label}
                </th>
              ))}
              <th scope="col" className="w-10 px-2 py-2">
                <span className="sr-only">Sil</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-3 py-6 text-center text-sm text-muted-foreground"
                >
                  Kayıt yok. "{addLabel}" ile veri girebilirsiniz.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index} className="border-b border-border/60 last:border-0">
                  {columns.map((column) => {
                    const type = column.type ?? "number";
                    return (
                      <td key={column.key} className="px-1 py-1">
                        <Input
                          aria-label={`${column.label} — satır ${index + 1}`}
                          type={type === "number" ? "number" : "text"}
                          inputMode={type === "number" ? "decimal" : undefined}
                          step={type === "number" ? "any" : undefined}
                          value={String(row[column.key] ?? "")}
                          onChange={(event) =>
                            update(index, column.key, event.target.value, type)
                          }
                          className={type === "number" ? "h-8 tabular-nums" : "h-8"}
                        />
                      </td>
                    );
                  })}
                  <td className="px-1 py-1 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onChange(rows.filter((_, i) => i !== index))}
                      aria-label={`Satır ${index + 1} sil`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rows, { ...emptyRow }])}
      >
        <Plus className="mr-1 h-4 w-4" aria-hidden />
        {addLabel}
      </Button>
    </section>
  );
}
