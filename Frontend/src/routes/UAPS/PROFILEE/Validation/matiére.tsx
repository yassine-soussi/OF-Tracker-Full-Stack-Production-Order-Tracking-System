import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect, useMemo } from "react"
import { PosteSelection, SearchBar, TableRowMatiere, ProblemFormModal } from "@/components/matiereUI";

type Matier = {
  id: string;
  ordre: string;
  n_ordre: string;
  statut: 'pending' | 'ready' | 'missing';
  besoin_machine: Date | null;
  article?: string | null;
  article_description?: string | null;
  commentaires_planif?: string | null;
}

const POSTES = ["CHR01", "VCF-A", "CIN-A"];


export function ValidationMatiere() {
  const [poste, setPoste] = useState("")
  const [matieres, setMatieres] = useState<Matier[]>([])
  const [search, setSearch] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [showForm, setShowForm] = useState<string | null>(null)
  const [problemCause, setProblemCause] = useState("")
  const [details, setDetails] = useState("")

 useEffect(() => {
  if (!poste) {
    return; }

  fetch(`http://localhost:5000/api/profilee/matiere/${poste}`)
    .then(res => res.json())
    .then(data => {
      const matieresData = Array.isArray(data.matieres) ? data.matieres : [];
      const mapped = matieresData.map((m: any) => ({
        id: `${poste}-${m.n_ordre}`,
        ordre: m.ordre || "",
        n_ordre: String(m.n_ordre),
        statut: ["pending", "ready", "missing"].includes(m.statut) ? m.statut : "pending",
        besoin_machine: m.besoin_machine ? new Date(m.besoin_machine) : null,
        article: m.article ?? null,
        article_description: m.article_description ?? null,
        commentaires_planif: m.commentaires_planif ?? null
      }));
      setMatieres(mapped);
    })
    .catch(err => {
      console.error("Erreur fetch matières :", err);
      setMatieres([]);
    });
}, [poste, refreshKey]);


  const validateMatier = async (id: string) => {
    const matiere = matieres.find(m => m.id === id)
    if (!matiere || !poste) return
    await fetch(`http://localhost:5000/api/profilee/matiere/statut_matiere/${poste}/${matiere.n_ordre}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statut: "ready",
        besoin_machine: matiere.besoin_machine ? matiere.besoin_machine.toLocaleDateString('fr-CA') : null,
        ordre: matiere.ordre 
      })
    })
    setRefreshKey(k => k + 1)
  }

  const submitProblem = async () => {
    if (!showForm || !poste) return
    const matiere = matieres.find(m => m.id === showForm)
    if (!matiere || !problemCause) return alert("Veuillez indiquer une cause")
    await fetch(`http://localhost:5000/api/profilee/matiere/statut_matiere/${poste}/${matiere.n_ordre}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statut: "missing",
        besoin_machine: matiere.besoin_machine ? matiere.besoin_machine.toLocaleDateString('fr-CA') : null,
        ordre: matiere.ordre,
        notification: {
          cause: problemCause,
          details
        }
      })
    })
    setShowForm(null)
    setProblemCause("")
    setDetails("")
    setRefreshKey(k => k + 1)
  }

  const matieresFiltered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return matieres.filter(m => {
      const matchNordre = m.n_ordre.toLowerCase().includes(term)
      const matchOrdre = m.ordre.toLowerCase().includes(term)
      const matchDate = m.besoin_machine
        ? m.besoin_machine.toLocaleDateString('fr-FR').includes(term)
        : false
      const matchArticle = (m.article ?? '').toLowerCase().includes(term)
      const matchDesignation = (m.article_description ?? '').toLowerCase().includes(term)
      return matchNordre || matchOrdre || matchDate || matchArticle || matchDesignation
    })
  }, [matieres, search])

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="w-full bg-white shadow-md py-4 px-6 flex justify-between items-center">
        <div className="text-[25px] font-[Lobster] text-[#FF7F50] drop-shadow-[1px_1px_3px_rgba(0,0,0,0.3)]">
          Validation matiére
        </div>
        <div className="text-[25px] font-[Lobster] text-[#FF7F50] drop-shadow-[1px_1px_3px_rgba(0,0,0,0.3)]">
          PROFILEE
        </div>
      </header>
      <main className="flex-1 p-8">
        <div className="max-w-8xl mx-auto bg-white rounded-lg shadow-md p-6">
          <PosteSelection poste={poste} setPoste={setPoste} postes={POSTES} />
          <SearchBar value={search} onChange={setSearch} />
          <table className="w-full table-auto border-t text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-2">Ordre</th>
                <th className="px-4 py-2">N° Ordre</th>
                <th className="px-4 py-2">Article</th>
                <th className="px-4 py-2">Article Description</th>
                <th className="px-4 py-2">Besoin machine</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Commentaires Planif</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {matieresFiltered.map(m => (
                <TableRowMatiere key={m.id} m={m} onValidate={validateMatier} onSignal={setShowForm} />
              ))}
            </tbody>
          </table>
          <div className="mt-4 text-sm text-gray-600 text-right">
            Lignes affichées : {matieresFiltered.length}
          </div>
          {matieres.length === 0 && (
            <div className="text-center text-gray-400 mt-4">Aucune matière trouvée pour ce poste.</div>
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
  )
}

export const Route = createFileRoute('/UAPS/PROFILEE/Validation/matiére')({
  component: ValidationMatiere,
});
