import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Column<T> {
  key: keyof T;
  label: string;
}

type EditableTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  onCellChange: (rowIdx: number, col: keyof T, value: string) => void;
};

export function EditableTable<T extends { [key: string]: string }>({
  data,
  columns,
  onCellChange,
}: EditableTableProps<T>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map(col => (
            <TableHead key={String(col.key)}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, rowIdx) => (
          <TableRow key={rowIdx}>
            {columns.map(col => (
              <TableCell key={String(col.key)}>
                <input
                  type="text"
                  value={row[col.key]}
                  onChange={e => onCellChange(rowIdx, col.key, e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-[#ef8f0e]"
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
