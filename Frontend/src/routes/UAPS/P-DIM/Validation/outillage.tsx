import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useMemo, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  PosteSelection,
  ToolTable,
  ProblemFormModal
} from '@/components/outillageUI';
import { ResourceButtons } from '@/components/ResourceButtons';
// [SCAN]
import BarcodeScannerModal from '@/components/BarcodeScannerModal';

export function ValidationOutils() {
  const [poste, setPoste] = useState<string>("");
  const [outils, setOutils] = useState<any[]>([]);
  const [showForm, setShowForm] = useState<string | null>(null);
  const [problemCause, setProblemCause] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const POSTES = ["MAM-A", "DA3-A", "A61NX", "NH4-A", "NM5-A"]

  // [SCAN] keep track of which tool is being validated
  const [scannerForId, setScannerForId] = useState<string | null>(null);

  const uniqueResources = useMemo(() => {
    return Array.from(new Set(outils.map(o => o.resource))).filter(Boolean).sort();
  }, [outils]);

  const outilsFiltered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let filtered = outils.filter(o =>
      o.n_ordre.toLowerCase().includes(term) ||
      (o.ordre ? o.ordre.toLowerCase().includes(term) : false)
    );
    if (selectedResource) {
      filtered = filtered.filter(o => o.resource === selectedResource);
    }
    filtered.sort((a, b) => {
      const ordreA = a.ordre || '';
      const ordreB = b.ordre || '';
      return ordreA.localeCompare(ordreB, undefined, {
        numeric: true,
        sensitivity: 'base'
      });
    });
    return filtered;
  }, [outils, search, selectedResource]);

  useEffect(() => {
    if (!poste) {
      console.log('No poste selected, clearing outils')
      setOutils([]);
      return;
    }
    const fetchData = async () => {
      try {
        const planningResponse = await fetch(`http://localhost:5000/api/pdim/planning/${poste}/edit`);
        if (!planningResponse.ok) throw new Error('No planning found');
        const planningData = await planningResponse.json();
        const planningItems = Array.isArray(planningData.data) ? planningData.data : [];
        if (planningItems.length === 0) {
          setOutils([]); return;
        }
        const mapped = planningItems
          .filter((item: any) => item.n_ordre || item.N_ordre || item['N° ordre'] || item['N° Ordre'])
          .map((item: any) => {
            const n_ordre = item.n_ordre || item.N_ordre || item['N° ordre'] || item['N° Ordre'] || "";
            const ordre = item.ordre || item.Ordre || item.ORDER || "";
            const article = item.article || item.Article || "";
            const article_description = item.article_description || item['Article Description'] || item.designation || "";
            const resource = item.resource || item.Resource || item.ressource || "";
            const infos_outillage = item['Infos mors profilé / outillage'] || item['Info outillage / ordo / moyen'] || "";
            const commentaires = item.commentaires_planif || item['Commentaires Planif'] || "";
            return {
              id: `${n_ordre}__${ordre}`,
              ordre: String(ordre),
              n_ordre: String(n_ordre),
              nom: infos_outillage || "",
              statut: "pending" as const,
              article: article || null,
              article_description: article_description || null,
              resource: resource || null,
              commentaires_planif: commentaires || null,
              date_validation: null as string | null
            };
          });
        setOutils(mapped);

        try {
          const statusResponse = await fetch(`http://localhost:5000/api/pdim/outils/${poste}`);
          const statusData = await statusResponse.json();
          const statusMap = new Map();
          if (Array.isArray(statusData.outils)) {
            statusData.outils.forEach((o: any) => {
              const key = `${String(o.n_ordre)}_${o.ordre || ''}`;
              statusMap.set(key, {
                statut: o.statut,
                date_validation: o.date_validation,
                ordre: o.ordre
              });
            });
          }
          if (statusMap.size > 0) {
            const finalOutils = mapped.map((item: any) => {
              const compositeKey = `${item.n_ordre}_${item.ordre}`;
              let statusInfo = statusMap.get(compositeKey);
              if (!statusInfo) {
                for (const [key, value] of statusMap.entries()) {
                  const [statusNOrdre, statusOrdre] = key.split('_');
                  if (statusNOrdre === item.n_ordre && (statusOrdre === item.ordre || (!statusOrdre && !item.ordre))) {
                    statusInfo = value; break;
                  }
                }
              }
              return {
                ...item,
                statut: statusInfo
                  ? (["pending", "ready", "missing"].includes(statusInfo.statut) ? statusInfo.statut : "pending")
                  : "pending",
                date_validation: statusInfo?.date_validation || item.date_validation || null
              };
            });
            setOutils(finalOutils);
          }
        } catch (statusError) {
          console.log('Status fetch failed:', statusError);
        }
      } catch (err) {
        console.error("Erreur fetch planning :", err);
        setOutils([]);
      }
    }
    fetchData();
  }, [poste, refreshKey]);

  // [SCAN] open scanner
  const openScannerFor = useCallback((id: string) => {
    setScannerForId(id);
  }, []);

  // [SCAN] confirm scanned code then validate
  const confirmScannedAndValidate = useCallback(async (code: string) => {
    if (!scannerForId) return;
    const [n_ordre, ordre] = scannerForId.split('__');
    const tool = outils.find(o => o.n_ordre === n_ordre && o.ordre === ordre);
    if (!tool || !poste) {
      setScannerForId(null);
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/pdim/outils/statut/${poste}/${tool.n_ordre}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statut: "ready",
          ordre: tool.ordre
          // scanned_code: code // (optional: extend backend if needed)
        })
      });
      if (response.ok) {
        setTimeout(() => setRefreshKey(k => k + 1), 400);
      }
    } catch (error) {
      console.error("Erreur validation:", error);
    } finally {
      setScannerForId(null);
    }
  }, [scannerForId, outils, poste]);

  const reportProblem = useCallback((id: string) => {
    setProblemCause("");
    setDetails("");
    setShowForm(id);
  }, []);

  const submitProblem = useCallback(async () => {
    if (!showForm || !problemCause) {
      return alert("Veuillez remplir tous les champs.");
    }
    const [n_ordre, ordre] = showForm.split('__');
    const tool = outils.find(o => o.n_ordre === n_ordre && o.ordre === ordre);
    if (!tool || !poste) return;
    try {
      await fetch(`http://localhost:5000/api/pdim/outils/statut/${poste}/${tool.n_ordre}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statut: "missing",
          ordre: tool.ordre,
          notification: {
            toolName: tool.nom,
            cause: problemCause,
            details: details
          }
        })
      });
      setShowForm(null);
      setProblemCause("");
      setDetails("");
      setRefreshKey(k => k + 1);
    } catch (error) {
      console.error("Erreur signalement:", error);
    }
  }, [showForm, outils, poste, problemCause, details]);

  return (
    <ProtectedRoute requiredRoute="/UAPS/P-DIM/Validation/outillage">
      <div className="flex flex-col min-h-screen bg-gray-50">
        <header className="w-full bg-gradient-to-r from-[#ef8f0e] to-[#d47e0d] text-white shadow-md border-b border-white/20 py-4 px-6 flex items-center justify-between gap-6">
          <div className="text-2xl font-['Raleway']">Validation outillage</div>
          <div className="text-2xl font-['Raleway']">P-DIM</div>
        </header>
        <main className="flex-1 p-8">
          <div className="max-w-8xl mx-auto bg-white rounded-lg shadow-md p-6">
            <PosteSelection poste={poste} setPoste={setPoste} postes={POSTES} />
            <ResourceButtons
              resources={uniqueResources}
              selected={selectedResource}
              onSelect={setSelectedResource}
              onClear={() => setSelectedResource(null)}
            />
            <div className="mb-4">
              <input
                type="text"
                placeholder="Rechercher par ordre ou N° ordre"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border rounded px-3 py-2 w-64"
              />
            </div>
            <ToolTable
              tools={outilsFiltered}
              // [SCAN] pass scanner function instead of direct validate
              validateTool={openScannerFor}
              reportProblem={reportProblem}
            />
            {outils.length > 0 && (
              <div className="mt-4 text-sm text-right text-gray-700">
                Nombre total de lignes : <span className="font-semibold">{outils.length}</span>
              </div>
            )}
            {outils.length === 0 && (
              <div className="text-center text-gray-400 mt-4">Aucun outil trouvé pour ce poste.</div>
            )}
          </div>
        </main>
        {showForm && (
          <ProblemFormModal
            problemCause={problemCause}
            setProblemCause={setProblemCause}
            details={details}
            setDetails={setDetails}
            onCancel={() => setShowForm(null)}
            onSubmit={submitProblem}
          />
        )}
        {/* [SCAN] barcode scanner modal */}
        <BarcodeScannerModal
          open={!!scannerForId}
          onClose={() => setScannerForId(null)}
          onConfirm={confirmScannedAndValidate}
          title="Scanner pour valider l'outillage"
        />
      </div>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute('/UAPS/P-DIM/Validation/outillage')({
  component: ValidationOutils,
});
