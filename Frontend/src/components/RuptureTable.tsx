import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { fr } from "date-fns/locale";

export function PriorityCircle({ value }: { value: string }) {
  return (
    <div
      className={`flex items-center justify-center w-6 h-6 rounded-full ${
        value === "1" ? "bg-red-500" : "bg-yellow-500"
      }`}
      aria-label={value === "1" ? "Priorité haute" : "Priorité moyenne"}
    ></div>
  );
}


export interface RuptureData {
  article: string;
  quantite: string;
  priorite: string;
  criticite: string;
  reception: string;
  commentaire: string;
}

type Props = {
  data: RuptureData[];
  onChange: (rowIdx: number, key: keyof RuptureData, value: string) => void;
  onDateChange: (rowIdx: number, date: Date | undefined) => void;
  onRemove: (rowIdx: number) => void;
};

export function RuptureTable({
  data,
  onChange,
  onDateChange,
  onRemove,
}: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Articles</TableHead>
          <TableHead>Quantité</TableHead>
          <TableHead>Priorité</TableHead>
          <TableHead>Criticité</TableHead>
          <TableHead>Date Réception</TableHead>
          <TableHead>Commentaire</TableHead>
          <TableHead aria-label="Actions"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-gray-500">
              Aucun article en rupture. Cliquez sur "Ajouter une ligne"
            </TableCell>
          </TableRow>
        )}
        {data.map((row, rowIndex) => (
          <TableRow key={rowIndex}>
            <TableCell>
              <input
                type="text"
                value={row.article}
                onChange={e => onChange(rowIndex, "article", e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-[#ef8f0e]"
                placeholder="Article"
              />
            </TableCell>
            <TableCell>
              <input
                type="text"
                value={row.quantite}
                onChange={e => onChange(rowIndex, "quantite", e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-[#ef8f0e]"
                placeholder="Quantité"
              />
            </TableCell>
            <TableCell>
              <div className="flex items-center space-x-2">
                <PriorityCircle value={row.priorite} />
                <select
                  value={row.priorite}
                  onChange={e => onChange(rowIndex, "priorite", e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#ef8f0e]"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                </select>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center space-x-2">
                <PriorityCircle value={row.criticite} />
                <select
                  value={row.criticite}
                  onChange={e => onChange(rowIndex, "criticite", e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#ef8f0e]"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                </select>
              </div>
            </TableCell>
            <TableCell>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {row.reception || <span>Choisir une date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={row.reception ? new Date(row.reception) : undefined}
                    onSelect={date => onDateChange(rowIndex, date)}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </TableCell>
            <TableCell>
              <input
                type="text"
                value={row.commentaire}
                onChange={e => onChange(rowIndex, "commentaire", e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-[#ef8f0e]"
                placeholder="Commentaire"
              />
            </TableCell>
            <TableCell>
              <Button
                onClick={() => onRemove(rowIndex)}
                variant="destructive"
                size="icon"
                className="p-1"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
