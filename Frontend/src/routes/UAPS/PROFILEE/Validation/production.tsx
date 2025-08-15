import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  PosteSelection,
  ProductionTable,
  ProblemFormModal,
} from '@/components/productionUI'

 

type OF = {
  id: string
  ordre: string
  n_ordre: string
  ressource: string
  duree: string
  statut_matiere: 'pending' | 'ready' | 'missing'
  statut_outil: 'pending' | 'ready' | 'missing'
  statut_of: 'pending' | 'ready' | 'missing'
  commentaires_planif: string
}

export function ValidationProduction() {
  const [poste, setPoste] = useState('')
  const [ofs, setOfs] = useState<OF[]>([])
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [showForm, setShowForm] = useState<string | null>(null)
  const [problemCause, setProblemCause] = useState('')
  const [details, setDetails] = useState('')
  const [selectedRessource, setSelectedRessource] = useState<string | null>(null)
  const POSTES = ["CHR01", "VCF-A", "CIN-A"];
  
  useEffect(() => {
    if (!poste) {
      setOfs([])
      return
    }
    fetch(`http://localhost:5000/api/profilee/production/${poste}`)
      .then(res => res.json())
      .then((data: any[]) => {
        setOfs(data.map(item => ({
          id: `${poste}-${item.n_ordre}`,
          ordre: item.ordre || '',
          n_ordre: String(item.n_ordre),
          ressource: item.ressource || '',
          duree: item.duree || '',
          statut_matiere: item.statut_matiere || 'pending',
          statut_outil: item.statut_outil || 'pending',
          statut_of: item.statut_of || 'pending',
          commentaires_planif: item.commentaires_planif || '',
        })))
      })
      .catch(err => {
        console.error('Erreur fetch OF:', err)
        setOfs([])
      })
  }, [poste, refreshKey])

  const validateOF = useCallback(async (id: string) => {
    const of = ofs.find(o => o.id === id)
    if (!of || !poste) return
    try {
      const res = await fetch(`http://localhost:5000/api/profilee/production/statut/${poste}/${of.n_ordre}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut_of: 'ready',
          duree: of.duree,
          ordre: of.ordre,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        alert(json.message)
        setRefreshKey(k => k + 1)
      } else {
        alert("Échec de la clôture de l'OF")
      }
    } catch (err) {
      console.error("Erreur de validation d'OF :", err)
      alert("Une erreur est survenue lors de la validation de l'OF")
    }
  }, [ofs, poste])

  const submitProblem = useCallback(async () => {
    if (!showForm || !poste) return
    const of = ofs.find(o => o.id === showForm)
    if (!of || !problemCause) return alert('Veuillez indiquer une cause')
    try {
      const res = await fetch(`http://localhost:5000/api/profilee/production/statut/${poste}/${of.n_ordre}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut_of: 'missing',
          duree: of.duree,
          ordre: of.ordre,
          notification: { cause: problemCause, details },
        }),
      })
      if (res.ok) {
        setShowForm(null)
        setProblemCause('')
        setDetails('')
        setRefreshKey(k => k + 1)
        alert('Problème signalé avec succès')
      } else {
        alert('Échec du signalement du problème')
      }
    } catch (err) {
      console.error('Erreur lors du signalement du problème :', err)
      alert('Une erreur est survenue lors du signalement du problème')
    }
  }, [showForm, ofs, poste, problemCause, details])

  const ressourcesUniques = useMemo(
    () => Array.from(new Set(ofs.map(o => o.ressource).filter(Boolean))).sort(),
    [ofs]
  )

  const ofsFiltered = useMemo(() => {
    const term = search.trim().toLowerCase()
    let list = ofs.filter(
      o =>
        o.n_ordre.toLowerCase().includes(term) ||
        o.ordre.toLowerCase().includes(term)
    )
    if (selectedRessource) {
      list = list.filter(o => o.ressource === selectedRessource)
    }
    return list
  }, [ofs, search, selectedRessource])

  return (
    <ProtectedRoute requiredRoute="/UAPS/PROFILEE/Validation/production">
      <div className="flex flex-col min-h-screen bg-gray-50">
        <header className="w-full bg-white shadow-md py-4 px-6 flex justify-between items-center">
          <div className="text-[25px] font-[Lobster] text-[#FF7F50] drop-shadow-[1px_1px_3px_rgba(0,0,0,0.3)]">
            Validation Production
          </div>
          <div className="text-[25px] font-[Lobster] text-[#FF7F50] drop-shadow-[1px_1px_3px_rgba(0,0,0,0.3)]">
            PROFILEE ET MÉTAUX DURS
          </div>
        </header>

        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-6">
            <PosteSelection poste={poste} setPoste={setPoste} postes={POSTES} />

            <div className="mb-4 flex flex-wrap gap-4 justify-between items-center">
              <input
                type="text"
                placeholder="Recherche par N° ordre ou Ordre..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border rounded px-3 py-2 w-64"
              />
            </div>

            {ressourcesUniques.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-3">
                {ressourcesUniques.map(r => (
                  <button
                    key={r}
                    onClick={() => setSelectedRessource(r)}
                    className={`px-4 py-1 rounded-full border text-sm ${
                      selectedRessource === r
                        ? 'bg-[#ef8f0e] text-white'
                        : 'bg-white text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {r}
                  </button>
                ))}
                {selectedRessource && (
                  <button
                    onClick={() => setSelectedRessource(null)}
                    className="px-4 py-1 rounded-full border text-sm bg-gray-200 text-gray-800 hover:bg-gray-300"
                  >
                    Tous
                  </button>
                )}
              </div>
            )}

            <ProductionTable
              ofs={ofsFiltered}
              validateOF={validateOF}
              reportProblem={(id) => setShowForm(id)}
            />

            <div className="mt-4 text-sm text-gray-600 text-right">
              Lignes affichées : {ofsFiltered.length}
            </div>

            {ofs.length === 0 && (
              <div className="text-center text-gray-400 mt-4">
                Aucune donnée trouvée pour ce poste.
              </div>
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
    </ProtectedRoute>
  )
}

export const Route = createFileRoute('/UAPS/PROFILEE/Validation/production')({
  component: ValidationProduction,
})
