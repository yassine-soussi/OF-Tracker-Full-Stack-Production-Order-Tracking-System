// components/shared/PlanningImporter.tsx
import { useState, useMemo, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileUploadExcel } from '@/components/FileUploadExcel';
import { ResourceButtons } from '@/components/ResourceButtons';
import { readExcelFile } from '@/lib/excel';

type Poste = string;

type Props = {
  apiBase: string;
  NavigationMenu: React.FC;
  PosteSelection: React.FC<{
    selectedPoste: string | null;
    onSelect: (poste: string) => void;
  }>;
};

export function PlanningImporter({ apiBase, NavigationMenu, PosteSelection }: Props) {
  const [poste, setPoste] = useState<Poste | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: string } | null>(null);
  const [resource, setResource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importDate, setImportDate] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [planningToSave, setPlanningToSave] = useState<{
    poste: string,
    fileName: string,
    data: any[]
  } | null>(null);
  const [search, setSearch] = useState('');

  const handlePosteChange = async (newPoste: Poste) => {
    setPoste(newPoste);
    setData([]); setHeaders([]); setFileName(null);
    setSortConfig(null); setResource(null); setError(null); setSuccess(null); setPlanningToSave(null);
    try {
      // IMPORTANT: This endpoint returns ONLY original imported data, never modifications
      // This ensures the import page always shows the original data
      const res = await fetch(`http://localhost:5000/api/${apiBase}/planning/${newPoste}`);
      if (!res.ok) return;
      const planning = await res.json();
      const headersFromData = planning.data.length ? Object.keys(planning.data[0]) : [];
      setData(planning.data);
      setHeaders(headersFromData);
      setFileName(planning.fileName);
      setPlanningToSave({ poste: newPoste, fileName: planning.fileName, data: planning.data });
      setSuccess("Planning chargé avec succès.");
    } catch {
      setError("Pas de planning pour ce poste");
    }
  };

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e?.target?.files?.[0];
  if (!poste || !file) return;

  setFileName(file.name);
  setImportDate(new Date().toLocaleString()); // Ajout date import

  try {
    const { data: parsed, headers } = await readExcelFile(file);
    setHeaders(headers);
    setData(parsed);
    setSortConfig(null);
    setResource(null);
    setPlanningToSave({ poste, fileName: file.name, data: parsed });
  } catch {
    setError("Erreur de lecture du fichier.");
  }
};



  const handleSavePlanning = async () => {
    if (!planningToSave) return;
    try {
      const res = await fetch(`http://localhost:5000/api/${apiBase}/planning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planningToSave),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess("Planning sauvegardé avec succès !");
    } catch (err) {
      setError("Erreur lors de la sauvegarde : " + (err instanceof Error ? err.message : err));
    }
  };

  const handleDeletePlanning = async () => {
    if (!poste) return;
    if (!window.confirm("Supprimer ce planning ?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/${apiBase}/planning/${poste}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      setSuccess("Planning supprimé avec succès.");
      reset();
    } catch (err) {
      setError("Erreur lors de la suppression : " + (err instanceof Error ? err.message : err));
    }
  };

  const reset = () => {
    setPoste(null); setData([]); setFileName(null); setHeaders([]);
    setSortConfig(null); setResource(null); setError(null); setSuccess(null);
    setPlanningToSave(null); setSearch('');
  };

  const rows = useMemo(() => {
    let out = [...data];
    if (search) {
      out = out.filter(row => headers.some(h => String(row[h] ?? '').toLowerCase().includes(search.toLowerCase())));
    }
    if (resource) {
      const col = headers.find(h => h.toLowerCase().includes('ressource'));
      out = out.filter(r => col ? String(r[col]) === resource : false);
    }
    if (sortConfig) {
      out.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return out;
  }, [data, sortConfig, resource, headers, search]);

  const uniqueResources = useMemo(() => {
    const col = headers.find(h => h.toLowerCase().includes('ressource'));
    return col ? [...new Set(data.map(r => r[col]).filter(Boolean))].sort() : [];
  }, [data, headers]);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <NavigationMenu />
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6 text-black">
          Importer le planning
          <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md font-normal">
            Données originales uniquement
          </span>
        </h1>
        <PosteSelection selectedPoste={poste} onSelect={handlePosteChange} />

        {poste && !headers.length && (
          <FileUploadExcel onUpload={handleFileUpload} selectedPoste={poste} inputRef={inputRef} />
        )}

        {headers.length > 0 && (
          <>
           {fileName && (
      <p className="mb-2 text-gray-700 font-semibold">
        Fichier importé : <strong>{fileName}</strong>
      </p>
    )}
    {importDate && (
      <p className="mb-4 text-gray-500 text-sm">
        Date d'import : {importDate}
      </p>
    )}

           {/* Error and Success Messages */}
           {error && (
             <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
               {error}
             </div>
           )}
           {success && (
             <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
               {success}
             </div>
           )}

           <div className="flex items-center mb-4 gap-4">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Recherche..."
                className="border border-gray-300 rounded px-3 py-1 min-w-[260px] focus:ring-2 focus:ring-[#ef8f0e] focus:border-[#ef8f0e] shadow-sm"
              />
            </div>
            <div className="border rounded-lg p-6 shadow-lg bg-white">
              <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-2">
                <div>
                  <h2 className="text-xl font-semibold">Planning pour <span className="text-[#ef8f0e]">{poste}</span></h2>
                 
                </div>
              </div>
              <ResourceButtons
                resources={uniqueResources}
                selected={resource}
                onSelect={setResource}
                onClear={() => setResource(null)}
              />
              <div className="border rounded-md overflow-auto max-h-[70vh]">
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 bg-white shadow-sm z-10">
                    <TableRow>
                      {headers.map((header, idx) => (
                        <TableHead key={idx}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {headers.map((h, j) => (
                          <TableCell key={j}>{row[h]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Button
                variant="default"
                className="bg-[#ef8f0e] hover:bg-[#e0810d] text-white"
                onClick={handleSavePlanning}
                disabled={!!success}
              >
                Sauvegarder le planning
              </Button>
              <Button
                variant="destructive"
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={handleDeletePlanning}
              >
                Supprimer le planning
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
