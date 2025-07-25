import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileUploadExcel } from "@/components/FileUploadExcel";
import { readExcelFile, parseExcelDate } from "@/lib/excel";

type PlanningRow = {
  'N° ordre': string;
  'Qté restante': number;
  'Qté opération': number;
  'Poste de charge précédent': string;
  'Poste de charge suivant': string;
  'Ressource planifiée': string;
  'En retard': string | number;
  'Dt/hre début opération': string;
  'Dt/hre fin opération': string;
};

export function GanttChart({ ganttData }: { ganttData: any[] }) {
  return (
    <div className="gantt-container mt-8 bg-white shadow-md rounded-lg p-6">
      <h2 className="gantt-title text-2xl font-semibold text-center mb-6">
        Diagramme Demonstrative
      </h2>
      <div className="gantt-tasks space-y-2">
        {ganttData.map((task, index) => (
          <div key={index} className="gantt-task flex items-center justify-between gap-2">
            <div className="w-[200px] font-semibold text-left">
              {task.prevPost}
              <div className="text-xs text-gray-500">{task.startDate}</div>
            </div>
            <div className="relative flex-1 bg-gray-200 rounded-full h-4">
              <div
                className="absolute top-0 left-0 bg-green-500 h-4 rounded-full"
                style={{ width: `${task.barWidth}px` }}
              ></div>
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 text-black text-xs font-semibold flex items-center gap-2">
                {task.resource && (
                  <span className="text-blue-700 font-bold mr-2">
                    Ressource : {task.resource}
                  </span>
                )}
                <span>{task.taskName}</span>
                <span>| {task.quantity} restante / {task.total}</span>
                {task.isEnRetard && (
                  <span className="ml-2 text-red-600 font-bold">En retard</span>
                )}
              </div>
            </div>
            <div className="w-[200px] font-semibold text-right">
              {task.nextPost}
              <div className="text-xs text-gray-500">{task.endDate}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlanningGanttManager({
  poste,
  apiUrl,
}: {
  poste: string;
  apiUrl: string;
}) {
  const [rawData, setRawData] = useState<PlanningRow[]>([]);
  const [filename, setFilename] = useState("import.xlsx");
  const [prevPostFilter, setPrevPostFilter] = useState("");
  const [nextPostFilter, setNextPostFilter] = useState("");
  const [orderFilter, setOrderFilter] = useState("");
  const [ressourceFilter, setRessourceFilter] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!poste) return;
    fetch(`${apiUrl}/${poste}`)
      .then(res => res.json())
      .then(result => {
        let data = result.data || [];
        if (typeof data === "string") {
          try { data = JSON.parse(data); } catch { data = []; }
        }
        setRawData(data);
        setFilename(result.filename || "import.xlsx");
      });
  }, [poste]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !poste) return;
    const { data } = await readExcelFile(file);
    const parsed = data.map(row => ({
      ...row,
      'Dt/hre début opération': parseExcelDate(row['Dt/hre début opération']),
      'Dt/hre fin opération': parseExcelDate(row['Dt/hre fin opération']),
    }));
    setRawData(parsed);
    setFilename(file.name);
  };

  const allRessources = useMemo(() => {
    const set = new Set<string>();
    rawData.forEach(row => {
      const r = row['Ressource planifiée'];
      if (r && String(r).trim()) set.add(String(r));
    });
    return Array.from(set);
  }, [rawData]);

  const filteredData = useMemo(() => {
    const totalBarWidth = 900;
    return rawData
      .filter(row =>
        (!prevPostFilter || row['Poste de charge précédent']?.toLowerCase().includes(prevPostFilter.toLowerCase())) &&
        (!nextPostFilter || row['Poste de charge suivant']?.toLowerCase().includes(nextPostFilter.toLowerCase())) &&
        (!orderFilter || row['N° ordre']?.toLowerCase().includes(orderFilter.toLowerCase())) &&
        (!ressourceFilter || row['Ressource planifiée'] === ressourceFilter)
      )
      .map((row, index) => {
        const qteRestante = Number(row['Qté restante']) || 0;
        const qteOperation = Number(row['Qté opération']) || 0;
        const enRetardVal = String(row['En retard'] || '').trim().toLowerCase();
        const isEnRetard = enRetardVal === 'oui' || enRetardVal === '1' || (!['', 'non', '0'].includes(enRetardVal));
        const barWidth = qteOperation > 0 ? ((qteOperation - qteRestante) / qteOperation) * totalBarWidth : 0;

        return {
          taskName: row['N° ordre'] || `Tâche ${index + 1}`,
          prevPost: row['Poste de charge précédent'],
          nextPost: row['Poste de charge suivant'],
          resource: row['Ressource planifiée'],
          quantity: qteRestante,
          total: qteOperation,
          isEnRetard,
          barWidth,
          totalBarWidth,
          startDate: parseExcelDate(row['Dt/hre début opération']),
          endDate: parseExcelDate(row['Dt/hre fin opération']),
        };
      });
  }, [rawData, prevPostFilter, nextPostFilter, orderFilter, ressourceFilter]);

  const handleSave = async () => {
    if (!rawData.length || !poste) return;
    await fetch(`${apiUrl}/${poste}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, data: rawData, version: 1 }),
    });
    alert("Données sauvegardées.");
  };

  const handleDelete = async () => {
    if (!poste) return;
    const res = await fetch(`${apiUrl}/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poste }),
    });
    if (res.ok) {
      setRawData([]);
      alert("Données supprimées.");
    }
  };

  return (
    <>
      {rawData.length === 0 && (
        <FileUploadExcel onUpload={handleFileUpload} selectedPoste={poste} inputRef={inputRef} />
      )}
      {rawData.length > 0 && (
        <>
          <div className="flex gap-4 mb-6 items-center">
            <label className="font-semibold">Ressource :</label>
            <select className="border rounded px-3 py-1" value={ressourceFilter} onChange={e => setRessourceFilter(e.target.value)}>
              <option value="">Toutes</option>
              {allRessources.map(res => <option key={res} value={res}>{res}</option>)}
            </select>
          </div>
          <div className="flex gap-4 mb-6">
            <input type="text" value={prevPostFilter} onChange={e => setPrevPostFilter(e.target.value)} placeholder="Poste précédent" className="border px-3 py-1" />
            <input type="text" value={nextPostFilter} onChange={e => setNextPostFilter(e.target.value)} placeholder="Poste suivant" className="border px-3 py-1" />
            <input type="text" value={orderFilter} onChange={e => setOrderFilter(e.target.value)} placeholder="N° ordre" className="border px-3 py-1" />
          </div>
          <div className="flex gap-4 mb-6">
            <Button onClick={handleSave} className="bg-orange-500 text-white">Sauvegarder</Button>
            <Button onClick={handleDelete} className="bg-red-500 text-white">Supprimer</Button>
          </div>
          <GanttChart ganttData={filteredData} />
        </>
      )}
    </>
  );
}
