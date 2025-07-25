// components/shared/HistoriqueShared.tsx

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as XLSX from 'xlsx';
import { useEffect, useState } from 'react';

export interface Column {
  key: string;
  label: string;
  isstatut?: boolean;
  isDate?: boolean;
}

export const badgeStyle: Record<string, string> = {
  ready: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  missing: 'bg-red-100 text-red-800',
};

export const label: Record<string, string> = {
  ready: 'Validé',
  pending: 'En attente',
  missing: 'Signalé',
};

export const HISTORIQUE_COLUMNS: Column[] = [
  { key: "poste", label: "Poste" },
  { key: "n_ordre", label: "N° Ordre" },
  { key: "ordre", label: "Ordre" },
  { key: "statut_matiere", label: "Statut Matière", isstatut: true },
  { key: "statut_outil", label: "Statut Outil", isstatut: true },
  { key: "statut_of", label: "Statut OF", isstatut: true },
  { key: "duree", label: "Durée OF" },
  { key: "date_validation", label: "Date de validation OF", isDate: true },
  { key: "date_signalement", label: "Date de signalement OF", isDate: true },
  { key: "cause", label: "Cause" },
  { key: "detaille", label: "Détails" },
];

export const MATIERE_COLUMNS: Column[] = [
  { key: "poste", label: "Poste" },
  { key: "n_ordre", label: "N° Ordre" },
  { key: "ordre", label: "Ordre" },
  { key: "statut", label: "Statut", isstatut: true },
  { key: "besoin_machine", label: "Besoin machine" },
  { key: "date_validation", label: "Date de validation", isDate: true },
  { key: "date_signalement", label: "Date de signalement", isDate: true },
  { key: "cause", label: "Cause de signalement" },
  { key: "detaille", label: "Détails" },
];

export const OUTIL_COLUMNS: Column[] = [
  { key: "poste", label: "Poste" },
  { key: "n_ordre", label: "N° Ordre" },
  { key: "ordre", label: "Ordre" },
  { key: "statut", label: "Statut", isstatut: true },
  { key: "date_validation", label: "Date de validation", isDate: true },
  { key: "date_signalement", label: "Date de signalement", isDate: true },
  { key: "cause", label: "Cause de signalement" },
  { key: "detaille", label: "Détails" },
];

export function TableWithBadges({
  columns,
  data
}: {
  columns: Column[];
  data: Record<string, any>[];
}) {
  return (
    <Table className="min-w-full text-sm">
      <TableHeader className="bg-gray-100 sticky top-0 z-10">
        <TableRow>
          {columns.map(col => (
            <TableHead key={col.key}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, i) => (
          <TableRow key={i} className="even:bg-gray-50">
            {columns.map(col => {
              const value = row[col.key];

              if (col.isstatut) {
                return (
                  <TableCell key={col.key}>
                    <span className={`px-6 py-1 rounded ${badgeStyle[value] || ''}`}>
                      {label[value] || value || '-'}
                    </span>
                  </TableCell>
                );
              }

              if (col.isDate) {
                return (
                  <TableCell key={col.key}>
                    {value
                      ? new Date(value).toLocaleString('fr-FR', {
                          timeZone: 'Africa/Tunis',
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </TableCell>
                );
              }

              return <TableCell key={col.key}>{value ?? '-'}</TableCell>;
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function useFetchData<T = any>(url: string): [T[], boolean] {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(json => {
        if (Array.isArray(json)) setData(json);
      })
      .catch(err => console.error(`Erreur de chargement depuis ${url}`, err))
      .finally(() => setLoading(false));
  }, [url]);

  return [data, loading];
}

export function filterData(
  data: Record<string, any>[],
  search: string,
  posteFilter?: string
) {
  const s = search.trim().toLowerCase();
  return data.filter(row => {
    const matchPoste = !posteFilter || row.poste === posteFilter;
    const matchSearch =
      !s ||
      (row.n_ordre && row.n_ordre.toLowerCase().includes(s)) ||
      (row.ordre && row.ordre.toLowerCase().includes(s));
    return matchPoste && matchSearch;
  });
}

export function exportToExcel(data: any[], name: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, name);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  XLSX.writeFile(wb, `${name}-${timestamp}.xlsx`);
}
