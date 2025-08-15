import { useState, useEffect, useRef } from "react";
import { readExcelFile } from "@/lib/excel";
import { FileUploadExcel } from "@/components/FileUploadExcel";

type PlanningRow = {
  'N° ordre': string;
  'Qté restante': number;
  'Qté opération': number;
  'Poste de charge suivant': string;
  'Ressource planifiée': string;
  'En retard': string | number;
  'Ordre de passage ATELIER': string;
};

export function SimpleGanttChart({
  poste,
  apiUrl,
}: {
  poste: string;
  apiUrl: string;
}) {
  const [rawData, setRawData] = useState<PlanningRow[]>([]);
  const [filename, setFilename] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
const [importDate, setImportDate] = useState<string | null>(null);

  const [hoveredRow, setHoveredRow] = useState<PlanningRow | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!poste) return;
    setLoading(true);
    fetch(`${apiUrl}/${poste}`)
      .then(res => res.json())
      .then(result => {
        let data = result.data || [];
        if (typeof data === "string") {
          try { data = JSON.parse(data); } catch { data = []; }
        }
        setRawData(data);
        setFilename(result.filename || null);
      })
      .catch(() => {
        setRawData([]);
        setFilename(null);
      })
      .finally(() => setLoading(false));
  }, [poste, apiUrl]);

  // Gestion du déplacement souris pour tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setTooltipPos({ x: e.clientX - 100, y: e.clientY - 300 });
  };

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !poste) return;
  setLoading(true);
  const { data } = await readExcelFile(file);
  setRawData(data);
  setFilename(file.name);
  setImportDate(new Date().toLocaleString()); 
  setLoading(false);
};

const handleSave = async () => {
  if (!rawData.length || !poste) return;
  setLoading(true);
  try {
    const res = await fetch(`${apiUrl}/${poste}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: filename || "import.xlsx", data: rawData, version: 1 }),
    });
    if (!res.ok) {
      const text = await res.text();
      alert(`Erreur lors de la sauvegarde: ${res.status} - ${text}`);
    } else {
      alert("Planning sauvegardé !");
    }
  } catch (err) {
    alert("Erreur réseau ou serveur" );
  }
  setLoading(false);
};



  const handleDelete = async () => {
    if (!poste) return;
    setLoading(true);
    const res = await fetch(`${apiUrl}/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poste }),
    });
    if (res.ok) {
      setRawData([]);
      setFilename(null);
      alert("Planning supprimé.");
    }
    setLoading(false);
  };

  if (loading) return <p>Chargement...</p>;
  if (rawData.length === 0) {
    return (
      <FileUploadExcel
        onUpload={handleFileUpload}
        selectedPoste={poste}
        inputRef={inputRef}
      />
    );
  }

  // Filtrer les lignes où Qté restante différente de Qté opération
  const filteredData = rawData;

  // Calcul max Qté opération pour largeur relative des barres
  const maxQteOperation = Math.max(...filteredData.map(row => Number(row['Qté opération']) || 0), 1);
  const maxBarWidthPx = 250;

  // Regroupement par ressource planifiée
  const dataByRessource = new Map<string, PlanningRow[]>();
  filteredData.forEach(row => {
    const res = row['Ressource planifiée'] || '-';
    if (!dataByRessource.has(res)) dataByRessource.set(res, []);
    dataByRessource.get(res)!.push(row);
  });

  type GroupedByRessource = {
    ressource: string;
    rows: PlanningRow[];
  };

  const groupedData: GroupedByRessource[] = [];
  const sortedRessources = Array.from(dataByRessource.keys()).sort((a, b) =>
    a.toString().localeCompare(b.toString())
  );

  sortedRessources.forEach(res => {
    const rows = dataByRessource.get(res)!;
    rows.sort((a, b) => {
      const ordreA = a['Ordre de passage ATELIER'] || '';
      const ordreB = b['Ordre de passage ATELIER'] || '';
      return ordreA.localeCompare(ordreB, undefined, { numeric: true, sensitivity: 'base' });
    });
    groupedData.push({ ressource: res, rows });
  });

  return (
    <>
      {/* Affichage du nom du fichier importé */}
     {filename && (
  <div className="mb-2 text-gray-700 font-semibold">
    Fichier importé : <strong>{filename}</strong>
  </div>
)}
{importDate && (
  <div className="mb-4 text-gray-600 text-sm">
    Date d'import : {importDate}
  </div>
)}


      <div className="flex gap-4 mb-6">
        <button
          onClick={handleSave}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-semibold transition"
        >
          Sauvegarder
        </button>
        <button
          onClick={handleDelete}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition"
        >
          Supprimer
        </button>
      </div>

      <div className="bg-white p-6 rounded shadow max-w-7xl font-mono mt-6 mx-auto relative text-base">
        {groupedData.map(({ ressource, rows }, i) => {
          const posteChargesuivant = rows[0]['Poste de charge suivant'] || '-';

          return (
            <div key={i} className="flex items-center mb-3">
              <div className="w-[100px] pr-4 font-mono select-none whitespace-nowrap text-orange-700">
                {ressource}
              </div>

              <div className="w-[30px] text-right select-none">|</div>

              <div className="flex gap-2 flex-1 cursor-pointer">
                {rows.map((row, idx) => {
                  const qteRestante = Number(row['Qté restante']) || 0;
                  const qteOperation = Number(row['Qté opération']) || 0;
                  const progressRatio = qteOperation > 0 ? Math.max(0, qteOperation) / maxQteOperation : 0;
                  const barPx = progressRatio * maxBarWidthPx;
                  const barColorClass = (qteRestante === qteOperation) ? "bg-red-500" : "bg-green-500";

                  return (
                    <div
                      key={idx}
                      className={`h-[12px] rounded ${barColorClass} transition-shadow hover:shadow-md`}
                      style={{ width: barPx }}
                      onMouseEnter={e => { setHoveredRow(row); handleMouseMove(e); }}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={() => setHoveredRow(null)}
                    />
                  );
                })}
              </div>

              <div className="w-[140px] pl-4 text-right font-bold text-black select-none whitespace-nowrap">
                {posteChargesuivant}
              </div>
            </div>
          );
        })}

        {hoveredRow && tooltipPos && (
          <div
            className="absolute z-50 bg-white border rounded shadow-lg p-2 text-xs text-gray-800"
            style={{
              top: tooltipPos.y,
              left: tooltipPos.x,
              whiteSpace: "pre-line",
              pointerEvents: "none",
              maxWidth: 220,
            }}
          >
            <strong>ordre :</strong> {hoveredRow['Ordre de passage ATELIER']}{"\n"}
            <strong>N° ordre:</strong> {hoveredRow['N° ordre']}{"\n"}
            <strong>Qté restante:</strong> {hoveredRow['Qté restante']} / {hoveredRow['Qté opération']}{"\n"}
            <strong>Ressource:</strong> {hoveredRow['Ressource planifiée'] || '-'}{"\n"}
            {hoveredRow['En retard'] &&
              hoveredRow['En retard'].toString().trim() !== '' &&
              hoveredRow['En retard'].toString().trim() !== '0' && (
                <>
                  <strong>Retard:</strong> {hoveredRow['En retard']}
                </>
              )}
          </div>
        )}

        <div className="mt-6 pl-[140px] text-gray-700 select-none flex justify-between max-w-[600px] font-mono text-sm">
          {[0, 5, 15, 20, 25, 30, 35 , 40, 45, 50, 55].map((val, idx) => (
            <span key={idx}>{val}</span>
          ))}
        </div>
      </div>
    </>
  );
}
