import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/* TYPES */
export interface Column {
  key: string;
  label: string;
  isstatut?: boolean;
  isDate?: boolean;
}

/* BADGE STYLES */
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

/* COLONNES RÉUTILISABLES */
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

/* HOOK DE FETCH */
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

/* FILTRAGE */
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

/* EXPORT EXCEL */
export function exportToExcel(data: any[], name: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, name);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  XLSX.writeFile(wb, `${name}-${timestamp}.xlsx`);
}

/* TABLEAU AVEC BADGES */
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

/* SECTION GLOBALE */
export function HistoriqueSection({
  title,
  columns,
  data,
  search,
  setSearch,
  selectLabel,
  selectValue,
  setSelectValue,
  selectOptions,
  onExport
}: {
  title: string;
  columns: Column[];
  data: Record<string, any>[];
  search: string;
  setSearch: (v: string) => void;
  selectLabel?: string;
  selectValue?: string;
  setSelectValue?: (v: string) => void;
  selectOptions?: string[];
  onExport?: () => void;
}) {
  const hasSearched = search.trim() !== '' || (selectValue && selectValue.trim() !== '');

  return (
    <Card className="shadow-lg mb-8">
      <CardHeader>
        <CardTitle className="text-xl font-bold mb-2">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer par N° Ordre ou Ordre..."
            className="border px-4 py-2 rounded w-64"
          />
          {selectOptions && setSelectValue && (
            <select
              value={selectValue}
              onChange={e => setSelectValue(e.target.value)}
              className="border px-4 py-2 rounded w-56"
            >
              <option value="">{selectLabel}</option>
              {selectOptions.map(o => <option key={o}>{o}</option>)}
            </select>
          )}
          {onExport && (
            <Button
              className="bg-[#ef8f0e] text-white"
              onClick={onExport}
            >
              Exporter Excel
            </Button>
          )}
        </div>

        {hasSearched ? (
          <div className="overflow-auto border rounded">
            <TableWithBadges columns={columns} data={data} />
            <div className="p-2 text-sm text-gray-600">
              {data.length} lignes affichées
            </div>
          </div>
        ) : (
          <div className="text-sm text-orange-600 px-2"></div>
        )}
      </CardContent>
    </Card>
  );
}
