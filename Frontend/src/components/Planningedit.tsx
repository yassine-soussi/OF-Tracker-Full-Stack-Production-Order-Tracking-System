import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Download, CalendarIcon } from 'lucide-react';
import { ResourceButtons } from '@/components/ResourceButtons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/* 📦 Fonctions utilitaires intégrées */

export async function fetchPlanning(poste: string, apiBase: string) {
  const response = await fetch(`http://localhost:5000/api/${apiBase}/planning/${poste}/edit`);
  if (!response.ok) throw new Error("Non trouvé");
  const planning = await response.json();

  const filteredHeaders = planning.data.length
    ? Object.keys(planning.data[0]).filter(h => h.toLowerCase() !== 'action')
    : [];

  return {
    data: planning.data || [],
    headers: filteredHeaders,
    fileName: planning.fileName || `manuel-${poste}.xlsx`,
    version: planning.version ?? 1,
    isModified: planning.isModified || false,
    originalVersion: planning.originalVersion || 1
  };
}

export function updateCell(data: any[], filteredIndexes: number[], filteredIdx: number, key: string, value: string) {
  const actualIdx = filteredIndexes[filteredIdx];
  if (actualIdx === -1) return data;
  const newData = [...data];
  newData[actualIdx][key] = value;
  return newData;
}

export function deleteRow(data: any[], filteredIndexes: number[], filteredIdx: number) {
  const actualIdx = filteredIndexes[filteredIdx];
  if (actualIdx === -1) return data;
  const newData = [...data];
  newData.splice(actualIdx, 1);
  return newData;
}

export function addEmptyRow(headers: string[], resourceCol: string | undefined, resource: string | null) {
  return Object.fromEntries(
    headers.map(h => [h, resourceCol && h === resourceCol && resource ? resource : ""])
  );
}

export function exportToExcel(data: any[], poste: string | null, resource?: string | null) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, poste || 'Planning');

  const safePoste = poste?.replace(/\s+/g, '_') || 'Planning';
  const safeResource = resource?.replace(/\s+/g, '_');
  const fileName = safeResource
    ? `planning-${safeResource}.xlsx`
    : `planning-${safePoste}.xlsx`;

  XLSX.writeFile(wb, fileName);
}


export async function savePlanning(poste: string, fileName: string, data: any[], apiBase: string) {
  const res = await fetch(`http://localhost:5000/api/${apiBase}/planning/${poste}/modify`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, data }),
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Erreur inconnue');
  return result;
}

export function detectResourceColumn(headers: string[]) {
  return headers.find(h => h.toLowerCase().includes("ressource") || h.toLowerCase().includes("resource"));
}

export function getUniqueResources(data: any[], resourceCol: string | undefined) {
  return resourceCol
    ? [...new Set(data.map(r => r[resourceCol]).filter(Boolean))].sort((a, b) =>
        String(a).localeCompare(String(b))
      )
    : [];
}

export function filterData(data: any[], resource: string | null, resourceCol: string | undefined, search: string) {
  let result = [...data];

  if (resource && resourceCol) {
    result = result.filter(row => String(row[resourceCol]) === resource);
  }

  if (search.trim()) {
    result = result.filter(row =>
      Object.values(row).some(val =>
        String(val).toLowerCase().includes(search.toLowerCase())
      )
    );
  }

  return result;
}

/* 🧩 Composant DatePickerCell */
function DatePickerCell({
  value,
  onChange,
  placeholder = "Sélectionner une date"
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Parse the current value to a Date object
  const parseDate = (dateStr: string): Date | undefined => {
    if (!dateStr) return undefined;
    
    const str = String(dateStr).trim();
    if (!str) return undefined;
    
    try {
      // Try manual parsing for DD/MM/YYYY format first (European/French format)
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) {
        const parts = str.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
          let year = parseInt(parts[2], 10);
          
          // Handle 2-digit years
          if (year < 100) {
            year += year < 50 ? 2000 : 1900;
          }
          
          // Validate the date components
          if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900) {
            const parsedDate = new Date(year, month, day);
            // Double-check that the date is valid and matches our input
            if (!isNaN(parsedDate.getTime()) &&
                parsedDate.getDate() === day &&
                parsedDate.getMonth() === month &&
                parsedDate.getFullYear() === year) {
              return parsedDate;
            }
          }
        }
      }
      
      // Fallback: try standard Date parsing
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (error) {
      console.warn('Error parsing date:', str, error);
    }
    
    return undefined;
  };

  const formatDate = (date: Date): string => {
    return format(date, 'dd/MM/yyyy', { locale: fr });
  };

  const currentDate = parseDate(value);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onChange(formatDate(selectedDate));
    } else {
      onChange('');
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal h-8 px-2"
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          {currentDate ? formatDate(currentDate) : <span className="text-muted-foreground">{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={currentDate}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

/* 🧩 Fonction pour détecter les colonnes de date */
function isDateColumn(columnName: string): boolean {
  const dateKeywords = ['date', 'besoin', 'machine', 'planning', 'délai', 'échéance'];
  const lowerName = columnName.toLowerCase();
  return dateKeywords.some(keyword => lowerName.includes(keyword));
}

/* 🧩 Composant PlanningEditor */

export function PlanningEditor({
  apiBase,
  NavigationMenu,
  PosteSelection,
}: {
  apiBase: string;
  NavigationMenu: React.ComponentType;
  PosteSelection: React.ComponentType<{
    selectedPoste: string | null;
    onSelect: (poste: string) => void;
  }>;
}) {
  const [poste, setPoste] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resource, setResource] = useState<string | null>(null);
  const [modifCount, setModifCount] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [isModified, setIsModified] = useState<boolean>(false);
  const [originalVersion, setOriginalVersion] = useState<number | null>(null);

  useEffect(() => {
    if (!poste) return;

    fetchPlanning(poste, apiBase)
      .then(({ data, headers, fileName, version, isModified, originalVersion }) => {
        setData(data);
        setHeaders(headers);
        setFileName(fileName);
        setModifCount(version);
        setIsModified(isModified || false);
        setOriginalVersion(originalVersion || version);
        setSuccess(isModified ? "Version modifiée chargée avec succès." : "Planning original chargé avec succès.");
        setError(null);
      })
      .catch(() => {
        setData([]);
        setHeaders([]);
        setFileName(`manuel-${poste}.xlsx`);
        setSuccess(null);
        setError("Aucun planning enregistré pour ce poste.");
      });
  }, [poste, apiBase]);

  const resourceCol = useMemo(() => detectResourceColumn(headers), [headers]);
  const uniqueResources = useMemo(() => getUniqueResources(data, resourceCol), [data, resourceCol]);
  const filteredData = useMemo(() => filterData(data, resource, resourceCol, search), [data, resource, resourceCol, search]);
  const filteredIndexes = useMemo(() => filteredData.map(fd => data.findIndex(d => d === fd)), [filteredData, data]);

  const handleUpdate = (filteredIdx: number, key: string, value: string) => {
    setData(updateCell(data, filteredIndexes, filteredIdx, key, value));
  };

  const handleDelete = (filteredIdx: number) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette ligne ?")) {
      setData(deleteRow(data, filteredIndexes, filteredIdx));
    }
  };

  const handleAddRow = () => {
    const row = addEmptyRow(headers, resourceCol, resource);
    setData([...data, row]);
  };

  const handleSave = async () => {
    if (!poste || !fileName || !data.length) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await savePlanning(poste, fileName, data, apiBase);
      setSuccess("Modifications enregistrées !");
      if (result.version !== undefined) setModifCount(result.version);
      if (result.isModified !== undefined) setIsModified(result.isModified);
    } catch (err: any) {
      setError("Erreur lors de l'enregistrement : " + (err?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <NavigationMenu />
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6 text-black">
          Modifier le planning
          {isModified && (
            <span className="ml-3 px-2 py-1 bg-orange-100 text-orange-800 text-sm rounded-md font-normal">
              Version modifiée
            </span>
          )}
        </h1>

        <PosteSelection selectedPoste={poste} onSelect={setPoste} />
        <ResourceButtons
          resources={uniqueResources}
          selected={resource}
          onSelect={setResource}
          onClear={() => setResource(null)}
        />

        {headers.length > 0 && (
          <>
            <div className="flex items-center mb-4 gap-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Recherche..."
                className="border border-gray-300 rounded px-3 py-1 min-w-[260px] focus:ring-2 focus:ring-[#ef8f0e] focus:border-[#ef8f0e] shadow-sm"
              />
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              <Button onClick={handleAddRow} className="gap-2"><Plus size={16} /> Ajouter une ligne</Button>
              <Button onClick={() => exportToExcel(filteredData, poste, resource )} variant="outline" className="gap-2">
<Download size={16} /> Exporter Excel</Button>
              <Button
                onClick={handleSave}
                disabled={saving || !poste || !fileName || !data.length}
                className={`gap-2 min-w-[220px] text-white transition-all
                  ${saving ? 'bg-gray-500' :
                    success ? 'bg-green-600 hover:bg-green-700' :
                    error ? 'bg-red-600 hover:bg-red-700' :
                    'bg-[#ef8f0e] hover:bg-[#e0810d]'}`}
              >
                {saving ? 'Enregistrement...' :
                  success ? 'Sauvegardé' :
                    error ? 'Échec' :
                      'Enregistrer'}
              </Button>

              {modifCount !== null && (
                <div className="mb-4 text-left mt-1">
                  <span className="text-[#000] font-bold text-lg">
                    Version : {modifCount}
                    {isModified && originalVersion && (
                      <span className="ml-2 text-sm text-gray-600 font-normal">
                        (basée sur l'original v{originalVersion})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        <div className="overflow-auto border rounded-lg max-h-[70vh]">
          <Table className="min-w-full text-sm">
            <TableHeader className="sticky top-0 bg-gray-100 z-10">
              <TableRow>
                {headers.map((h, i) => (
                  <TableHead key={i}>{h}</TableHead>
                ))}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row, idx) => (
                <TableRow key={idx} className="bg-white even:bg-gray-50">
                  {headers.map((key, colIdx) => (
                    <TableCell key={colIdx}>
                      {isDateColumn(key) ? (
                        <DatePickerCell
                          value={row[key] || ''}
                          onChange={(value) => handleUpdate(idx, key, value)}
                          placeholder="Sélectionner une date"
                        />
                      ) : (
                        <input
                          value={row[key] || ''}
                          onChange={(e) => handleUpdate(idx, key, e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(idx)}
                      className="px-2 py-1"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="p-2 text-sm text-gray-600">
            {filteredData.length} lignes affichées sur {data.length}
          </div>
        </div>
      </div>
    </div>
  );
}
