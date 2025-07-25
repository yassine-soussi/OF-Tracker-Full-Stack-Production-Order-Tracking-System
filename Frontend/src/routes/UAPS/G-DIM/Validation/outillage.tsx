import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PosteSelection,
  ToolTable,
  ProblemFormModal
} from '@/components/outillageUI';

export function ValidationOutils() {
  const [poste, setPoste] = useState<string>("");
  const [outils, setOutils] = useState<any[]>([]);
  const [showForm, setShowForm] = useState<string | null>(null);
  const [problemCause, setProblemCause] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
 const POSTES = ["MC401", "MC501", "NHD-A", "NM8-A", "V2P01" , "V2P02" , "MIN01" ,"MIN02" , "MIN03" ];

  const ressourcesUniques = useMemo(() => {
    return Array.from(new Set(outils.map(o => o.article))).filter(Boolean).sort();
  }, [outils]);

  const outilsFiltered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let filtered = outils.filter(o =>
      o.n_ordre.toLowerCase().includes(term) ||
      (o.ordre ? o.ordre.toLowerCase().includes(term) : false)
    );
    if (selectedResource) {
      filtered = filtered.filter(o => o.article === selectedResource);
    }
    return filtered;
  }, [outils, search, selectedResource]);

  useEffect(() => {
    if (!poste) {
      setOutils([]);
      return;
    }
    fetch(`http://localhost:5000/api/gdim/outils/${poste}`)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data.outils) ? data.outils : [];
        setOutils(
          list.map((o: any) => ({
            id: `${o.n_ordre}__${o.ordre}`,
            ordre: o.ordre,
            n_ordre: String(o.n_ordre),
            nom: o.besoin_planning || o.nom || "",
            statut: ['pending', 'ready', 'missing'].includes(o.statut) ? o.statut : 'pending',
            article: o.article,
            article_description: o.article_description,
            commentaire_planif: o.commentaire_planif || ""
          }))
        );
      })
      .catch(err => {
        console.error("Erreur fetch outils:", err);
        setOutils([]);
      });
  }, [poste, refreshKey]);

  const validateTool = useCallback(async (id: string) => {
    const [n_ordre, ordre] = id.split('__');
    const tool = outils.find(o => o.n_ordre === n_ordre && o.ordre === ordre);
    if (!tool || !poste) return;
    try {
      await fetch(`http://localhost:5000/api/gdim/outils/statut/${poste}/${tool.n_ordre}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "ready", ordre: tool.ordre })
      });
      setRefreshKey(k => k + 1);
    } catch (error) {
      console.error("Erreur validation:", error);
    }
  }, [outils, poste]);

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
      await fetch(`http://localhost:5000/api/gdim/outils/statut/${poste}/${tool.n_ordre}`, {
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
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="w-full bg-white shadow-md py-4 px-6 flex justify-between items-center">
        <div className="text-[25px] font-[Lobster] text-[#FF7F50]">Validation outillage</div>
        <div className="text-[25px] font-[Lobster] text-[#FF7F50]">G-DIM</div>
      </header>
      <main className="flex-1 p-8">
        <div className="max-w-8xl mx-auto bg-white rounded-lg shadow-md p-6">
          <PosteSelection poste={poste} setPoste={setPoste} postes={POSTES} />
          <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
            <input
              type="text"
              placeholder="Rechercher par ordre ou N° ordre"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border rounded px-3 py-2 w-64"
            />
            <div>
              <label htmlFor="resource-select" className="block text-sm font-medium text-gray-700 mb-1">Filtrer par article</label>
              <select
                id="resource-select"
                value={selectedResource ?? ""}
                onChange={e => setSelectedResource(e.target.value || null)}
                className="border border-gray-300 rounded px-3 py-2 w-64"
              >
                <option value="">-- Tous les articles --</option>
                {ressourcesUniques.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <ToolTable tools={outilsFiltered} validateTool={validateTool} reportProblem={reportProblem} />
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
    </div>
  );
}

export const Route = createFileRoute('/UAPS/G-DIM/Validation/outillage')({
  component: ValidationOutils,
});
