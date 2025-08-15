import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  PosteSelection,
  ProductionTable,
  ProblemFormModal,
  StatutBadge,
} from '@/components/productionUI'

 

type OF = {
  id: string
  ordre: string
  n_ordre: string
  ressource: string
  duree: string
  statut_matiere: 'pending' | 'ready' | 'missing'
  statut_outil: 'pending' | 'ready' | 'missing'
  statut_of: 'pending' | 'ready' | 'started' | 'missing' | 'closed'
  commentaires_planif: string
  date_validation?: string
  // Additional fields for automatic status management
  auto_statut_of?: 'pending' | 'ready' | 'started' | 'missing' | 'closed'
  date_lancement?: string
}

// Custom ProductionRow component that uses auto_statut_of when available
const ProductionRowWithAutoStatus = ({ of, validateOF, reportProblem }: {
  of: OF;
  validateOF: (id: string) => void;
  reportProblem: (id: string) => void;
}) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  // Use auto_statut_of if available, otherwise use statut_of
  const displayStatus = of.auto_statut_of || of.statut_of;
  // Can validate if should be started (matiere and outil ready) OR already started, even if reported. Only prevent if already closed.
  const shouldBeStarted = of.statut_matiere === 'ready' && of.statut_outil === 'ready';
  const canValidate = (displayStatus === 'started' || shouldBeStarted) && of.statut_of !== 'closed';

  return (
    <tr>
      <td className="px-4 py-2">{of.ordre}</td>
      <td className="px-4 py-2">{of.n_ordre}</td>
      <td className="px-4 py-2">{of.ressource}</td>
      <td className="px-4 py-2">{of.duree}</td>
      <td className="px-4 py-2"><StatutBadge statut={of.statut_matiere} /></td>
      <td className="px-4 py-2"><StatutBadge statut={of.statut_outil} /></td>
      <td className="px-4 py-2"><StatutBadge statut={displayStatus} /></td>
      <td className="px-4 py-2">{formatDate(of.date_lancement || null)}</td>
      <td className="px-4 py-2">{(of.statut_of === 'closed' || of.auto_statut_of === 'closed') ? formatDate(of.date_validation || null) : '-'}</td>
      <td className="px-4 py-2">{of.commentaires_planif || "-"}</td>
      <td className="px-4 py-2">
        {displayStatus !== 'closed' && (
          <div className="flex gap-3">
            <button
              onClick={() => validateOF(of.id)}
              className={`hover:underline ${canValidate ? 'text-green-600' : 'text-gray-400 cursor-not-allowed'}`}
              disabled={!canValidate}
              type="button"
            >
              Clôturer
            </button>
            <button onClick={() => reportProblem(of.id)} className="text-red-600 hover:underline" type="button">
              Signaler
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};

// Custom ProductionTable component that uses auto_statut_of
const ProductionTableWithAutoStatus = ({
  ofs,
  validateOF,
  reportProblem,
}: {
  ofs: OF[];
  validateOF: (id: string) => void;
  reportProblem: (id: string) => void;
}) => {
  return (
    <table className="w-full text-sm table-auto border-t">
      <thead className="bg-gray-100 text-left">
        <tr>
          <th className="px-4 py-2">Ordre</th>
          <th className="px-4 py-2">N° Ordre</th>
          <th className="px-4 py-2">Ressource</th>
          <th className="px-4 py-2">Durée</th>
          <th className="px-4 py-2">Matière</th>
          <th className="px-4 py-2">Outil</th>
          <th className="px-4 py-2">OF</th>
          <th className="px-4 py-2">Date Lancement</th>
          <th className="px-4 py-2">Date Validation</th>
          <th className="px-4 py-2">Commentaires Planif</th>
          <th className="px-4 py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {ofs.map(of => (
          <ProductionRowWithAutoStatus key={of.id} of={of} validateOF={validateOF} reportProblem={reportProblem} />
        ))}
      </tbody>
    </table>
  );
};

export function ValidationProduction() {
  const [poste, setPoste] = useState('')
  const [ofs, setOfs] = useState<OF[]>([])
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [showForm, setShowForm] = useState<string | null>(null)
  const [problemCause, setProblemCause] = useState('')
  const [details, setDetails] = useState('')
  const [selectedRessource, setSelectedRessource] = useState<string | null>(null)
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const savingStatusRef = useRef<Set<string>>(new Set()) // Track which OFs are being saved
  const POSTES = ["MAM-A", "DA3-A", "A61NX", "NH4-A", "NM5-A"]

  // Function to save OF status to backend with calculated date_lancement
  const saveOFStatusToBackend = useCallback(async (of: OF, newStatus: 'started') => {
    if (!poste || savingStatusRef.current.has(of.id)) return
    
    savingStatusRef.current.add(of.id)
    try {
      const response = await fetch(`http://localhost:5000/api/pdim/production/statut/${poste}/${of.n_ordre}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut_of: newStatus,
          duree: of.duree,
          ordre: of.ordre,
        }),
      })
      
      if (response.ok) {
        console.log(`OF ${of.n_ordre} status saved to backend: ${newStatus} with calculated date_lancement`)
        // Trigger a refresh to get the updated data with persisted date_lancement
        setRefreshKey(k => k + 1)
      } else {
        console.error('Failed to save OF status to backend:', response.statusText)
      }
    } catch (error) {
      console.error('Error saving OF status to backend:', error)
    } finally {
      savingStatusRef.current.delete(of.id)
    }
  }, [poste])

  // Function to calculate automatic OF status based on conditions
  const calculateAutoOFStatus = useCallback((ofsList: OF[], selectedResource?: string | null) => {
    const updatedOFs = ofsList.map(of => {
      // Apply logic to ALL OFs, not just selected resource
      // Simple logic for ALL OFs: if both matiere and outil are 'ready', set OF status to 'started' (Débuté)
      if (of.statut_matiere === 'ready' && of.statut_outil === 'ready' && of.statut_of === 'pending') {
        // Save to backend if not already started - backend will calculate date_lancement
        if (of.auto_statut_of !== 'started') {
          setTimeout(() => saveOFStatusToBackend(of, 'started'), 0)
        }
        return {
          ...of,
          auto_statut_of: 'started' as const,
        }
      }
      // If either matiere or outil is not ready, set to pending
      else if (of.statut_matiere !== 'ready' || of.statut_outil !== 'ready') {
        return { ...of, auto_statut_of: 'pending' as const }
      }

      return of
    })

    return updatedOFs
  }, [saveOFStatusToBackend])

  // Cleanup timers on component unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [])

  // Effect to recalculate automatic status when selectedRessource changes
  useEffect(() => {
    if (ofs.length > 0) {
      const updatedOfs = calculateAutoOFStatus(ofs, selectedRessource)
      setOfs(updatedOfs)
    }
  }, [selectedRessource, calculateAutoOFStatus])

  // Effect to recalculate automatic status when OF statuses change
  useEffect(() => {
    if (ofs.length > 0) {
      const updatedOfs = calculateAutoOFStatus(ofs)
      // Check if there are actual changes to avoid infinite loops
      const hasChanges = updatedOfs.some((updatedOF, index) =>
        updatedOF.auto_statut_of !== ofs[index]?.auto_statut_of
      )
      if (hasChanges) {
        setOfs(updatedOfs)
      }
    }
  }, [ofs.map(of => `${of.id}-${of.statut_matiere}-${of.statut_outil}-${of.statut_of}`).join(','), calculateAutoOFStatus])

  useEffect(() => {
    if (!poste) {
      console.log('No poste selected, clearing ofs')
      setOfs([])
      return
    }
    
    console.log('Fetching data for poste:', poste)
    
    // Fetch latest planning data (modifications if available, otherwise original)
    const fetchData = async () => {
      try {
        const planningResponse = await fetch(`http://localhost:5000/api/pdim/planning/${poste}/edit`)
        if (!planningResponse.ok) {
          throw new Error('No planning found')
        }
        
        const planningData = await planningResponse.json()
        console.log('Planning data received:', planningData)
        
        // Extract production data from planning
        const planningItems = Array.isArray(planningData.data) ? planningData.data : []
        console.log('Planning items count:', planningItems.length)
        
        if (planningItems.length === 0) {
          console.log('No planning items found, setting empty array')
          setOfs([])
          return
        }
        
        const mapped = planningItems
          .filter((item: any) => {
            const hasNOrdre = item.n_ordre || item.N_ordre || item.n_Ordre || item['N° ordre'] || item['N° Ordre'] || item['n° ordre']
            return hasNOrdre
          })
          .map((item: any) => {
            // Try different possible column names
            const n_ordre = item.n_ordre || item.N_ordre || item.n_Ordre || item['N° ordre'] || item['N° Ordre'] || item['n° ordre'] || ""
            const ordre = item.ordre || item.Ordre || item.ORDER || item['Ordre '] || ""
            const ressource = item.ressource || item.Ressource || item.RESSOURCE || ""
            const duree = item.duree || item['Heures '] || item['Heures'] || item.heures || ""
            const commentaires = item.commentaires_planif || item['Commentaires Planif'] || item.commentaires || item.Commentaires || ""
            
            return {
              id: `${poste}-${n_ordre}`,
              ordre: String(ordre),
              n_ordre: String(n_ordre),
              ressource: ressource || '',
              duree: duree || '',
              statut_matiere: 'pending' as const,
              statut_outil: 'pending' as const,
              statut_of: 'pending' as const,
              commentaires_planif: commentaires || '',
            }
          })
        
        console.log('Mapped OFs count:', mapped.length)
        console.log('First mapped item:', mapped[0])
        
        // Set the initial data first
        const initialOfsWithAutoStatus = calculateAutoOFStatus(mapped, selectedRessource)
        setOfs(initialOfsWithAutoStatus)
        console.log('State updated with mapped data and initial auto status')
        
        // Then try to overlay status data from production endpoint
        try {
          const statusResponse = await fetch(`http://localhost:5000/api/pdim/production/${poste}`)
          const statusData = await statusResponse.json()
          console.log('Status data received:', statusData)
          console.log('Date lancement values found:', statusData.filter((item: any) => item.date_lancement).map((item: any) => ({ n_ordre: item.n_ordre, date_lancement: item.date_lancement })))
          
          const statusMap = new Map()
          if (Array.isArray(statusData)) {
            statusData.forEach((item: any) => {
              statusMap.set(String(item.n_ordre), {
                statut_matiere: item.statut_matiere || 'pending',
                statut_outil: item.statut_outil || 'pending',
                statut_of: item.statut_of || 'pending',
                duree: item.duree,
                date_validation: item.date_validation,
                date_lancement: item.date_lancement
              })
            })
          }
          
          // Update with status overlay
          if (statusMap.size > 0) {
            const finalOfs = mapped.map((item: any) => {
              const statusInfo = statusMap.get(item.n_ordre)
              return {
                ...item,
                statut_matiere: statusInfo?.statut_matiere || 'pending',
                statut_outil: statusInfo?.statut_outil || 'pending',
                statut_of: statusInfo?.statut_of || 'pending',
                duree: statusInfo?.duree || item.duree,
                date_validation: statusInfo?.date_validation || null,
                date_lancement: statusInfo?.date_lancement || null
              }
            })
            
            console.log('Final OFs with status:', finalOfs)
            console.log('OFs with date_lancement:', finalOfs.filter((of: any) => of.date_lancement).map((of: any) => ({ n_ordre: of.n_ordre, date_lancement: of.date_lancement })))
            
            // Apply automatic status calculation
            const ofsWithAutoStatus = calculateAutoOFStatus(finalOfs, selectedRessource)
            setOfs(ofsWithAutoStatus)
            console.log('State updated with status overlay and auto status')
          }
        } catch (statusError) {
          console.log('Status fetch failed, keeping planning data only:', statusError)
        }
        
      } catch (err) {
        console.error("Erreur fetch planning :", err)
        setOfs([])
      }
    }
    
    fetchData()
  }, [poste, refreshKey])
  
  // Add debug logging for state changes
  useEffect(() => {
    console.log('OFs state changed:', ofs.length, 'items')
    console.log('Current ofs:', ofs)
  }, [ofs])

  const validateOF = useCallback(async (id: string) => {
    const of = ofs.find(o => o.id === id)
    if (!of || !poste) return
    
    // Check if OF can be validated: should be started (matiere and outil ready) OR already started, and not already closed
    const currentStatus = of.auto_statut_of || of.statut_of
    const shouldBeStarted = of.statut_matiere === 'ready' && of.statut_outil === 'ready'
    const canValidateOF = (currentStatus === 'started' || shouldBeStarted) && of.statut_of !== 'closed'
    
    if (!canValidateOF) {
      if (of.statut_of === 'closed') {
        alert("Cet OF est déjà cloturé")
      } else if (!shouldBeStarted) {
        alert("Les matières et outils doivent être validés avant de pouvoir clôturer l'OF")
      } else {
        alert("Vous ne pouvez valider que les OFs en état 'Débuté'")
      }
      return
    }
    
    try {
      const res = await fetch(`http://localhost:5000/api/pdim/production/statut/${poste}/${of.n_ordre}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut_of: 'closed',
          duree: of.duree,
          ordre: of.ordre,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        alert(json.message)
        setRefreshKey(k => k + 1)
      } else {
        // Get detailed error message from backend
        try {
          const errorData = await res.json()
          console.error('Backend error details:', errorData)
          alert(`Échec de la clôture de l'OF: ${errorData.error || 'Erreur inconnue'}`)
        } catch {
          alert("Échec de la clôture de l'OF")
        }
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
      const res = await fetch(`http://localhost:5000/api/pdim/production/statut/${poste}/${of.n_ordre}`, {
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
    
    // Sort by ordre column (e.g., S25-00, S25-01, S25-02...)
    list.sort((a, b) => {
      const ordreA = a.ordre || ''
      const ordreB = b.ordre || ''
      
      // Natural sorting for ordre values like S25-01, S25-02, etc.
      return ordreA.localeCompare(ordreB, undefined, {
        numeric: true,
        sensitivity: 'base'
      })
    })
    
    return list
  }, [ofs, search, selectedRessource])

  return (
    <ProtectedRoute requiredRoute="/UAPS/P-DIM/Validation/production">
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="w-full bg-gradient-to-r from-[#ef8f0e] to-[#d47e0d] text-white shadow-[0_2px_10px_rgba(0,0,0,0.1)] border-b border-white/20 py-4 px-6 flex items-center justify-between gap-6">
        <div className={`text-2xl font-['Raleway'] text-white [1px_1px_3px_rgba(0,0,0,0.3)] relative inline-block group rounded px-2 py-1 transition-colors duration-200 `}>
          Validation production
        </div>
        <div className={`text-2xl font-['Raleway'] text-white [1px_1px_3px_rgba(0,0,0,0.3)] `}>
          P-DIM
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

          <ProductionTableWithAutoStatus
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

export const Route = createFileRoute('/UAPS/P-DIM/Validation/production')({
  component: ValidationProduction,
})
