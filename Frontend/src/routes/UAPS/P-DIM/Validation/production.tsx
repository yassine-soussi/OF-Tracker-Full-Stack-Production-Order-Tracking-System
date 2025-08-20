import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  PosteSelection,
  ProblemFormModal,
  StatutBadge,
} from '@/components/productionUI'
import BarcodeScannerModal from '@/components/BarcodeScannerModal'

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
  auto_statut_of?: 'pending' | 'ready' | 'started' | 'missing' | 'closed'
  date_lancement?: string
}

// ===== Row with auto status + scan-triggered close =====
const ProductionRowWithAutoStatus = ({
  of,
  onCloturer,
  reportProblem,
}: {
  of: OF
  onCloturer: (id: string) => void
  reportProblem: (id: string) => void
}) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      return date.toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return '-'
    }
  }

  const displayStatus = of.auto_statut_of || of.statut_of
  const shouldBeStarted = of.statut_matiere === 'ready' && of.statut_outil === 'ready'
  const canValidate = (displayStatus === 'started' || shouldBeStarted) && of.statut_of !== 'closed'

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
      <td className="px-4 py-2">
        {(of.statut_of === 'closed' || of.auto_statut_of === 'closed')
          ? formatDate(of.date_validation || null)
          : '-'}
      </td>
      <td className="px-4 py-2">{of.commentaires_planif || '-'}</td>
      <td className="px-4 py-2">
        {displayStatus !== 'closed' && (
          <div className="flex gap-3">
            <button
              onClick={() => onCloturer(of.id)}
              className={`hover:underline ${canValidate ? 'text-green-600' : 'text-gray-400 cursor-not-allowed'}`}
              disabled={!canValidate}
              type="button"
            >
              Clôturer
            </button>
            <button
              onClick={() => reportProblem(of.id)}
              className="text-red-600 hover:underline"
              type="button"
            >
              Signaler
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

// ===== Table wrapper =====
const ProductionTableWithAutoStatus = ({
  ofs,
  onCloturer,
  reportProblem,
}: {
  ofs: OF[]
  onCloturer: (id: string) => void
  reportProblem: (id: string) => void
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
          <ProductionRowWithAutoStatus
            key={of.id}
            of={of}
            onCloturer={onCloturer}
            reportProblem={reportProblem}
          />
        ))}
      </tbody>
    </table>
  )
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
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const savingStatusRef = useRef<Set<string>>(new Set())
  const POSTES = ['MAM-A', 'DA3-A', 'A61NX', 'NH4-A', 'NM5-A']

  // [SCAN] which OF to close + last scanned (optional)
  const [scannerForId, setScannerForId] = useState<string | null>(null)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)

  // Save OF 'started' to backend (unchanged)
  const saveOFStatusToBackend = useCallback(
    async (of: OF, newStatus: 'started') => {
      if (!poste || savingStatusRef.current.has(of.id)) return

      savingStatusRef.current.add(of.id)
      try {
        const response = await fetch(
          `http://localhost:5000/api/pdim/production/statut/${poste}/${of.n_ordre}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              statut_of: newStatus,
              duree: of.duree,
              ordre: of.ordre,
            }),
          }
        )

        if (response.ok) {
          setRefreshKey(k => k + 1)
        } else {
          console.error('Failed to save OF status to backend:', response.statusText)
        }
      } catch (error) {
        console.error('Error saving OF status to backend:', error)
      } finally {
        savingStatusRef.current.delete(of.id)
      }
    },
    [poste]
  )

  // Auto status logic (unchanged)
  const calculateAutoOFStatus = useCallback(
    (ofsList: OF[], _selectedResource?: string | null) => {
      const updatedOFs = ofsList.map(of => {
        if (
          of.statut_matiere === 'ready' &&
          of.statut_outil === 'ready' &&
          of.statut_of === 'pending'
        ) {
          if (of.auto_statut_of !== 'started') {
            setTimeout(() => saveOFStatusToBackend(of, 'started'), 0)
          }
          return { ...of, auto_statut_of: 'started' as const }
        } else if (of.statut_matiere !== 'ready' || of.statut_outil !== 'ready') {
          return { ...of, auto_statut_of: 'pending' as const }
        }
        return of
      })
      return updatedOFs
    },
    [saveOFStatusToBackend]
  )

  // Cleanup
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    if (ofs.length > 0) {
      const updatedOfs = calculateAutoOFStatus(ofs, selectedRessource)
      setOfs(updatedOfs)
    }
  }, [selectedRessource, calculateAutoOFStatus])

  useEffect(() => {
    if (ofs.length > 0) {
      const updatedOfs = calculateAutoOFStatus(ofs)
      const hasChanges = updatedOfs.some(
        (updatedOF, index) => updatedOF.auto_statut_of !== ofs[index]?.auto_statut_of
      )
      if (hasChanges) setOfs(updatedOfs)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ofs.map(of => `${of.id}-${of.statut_matiere}-${of.statut_outil}-${of.statut_of}`).join(',')])

  // Fetch & overlay
  useEffect(() => {
    if (!poste) {
      setOfs([])
      return
    }
    const fetchData = async () => {
      try {
        const planningResponse = await fetch(
          `http://localhost:5000/api/pdim/planning/${poste}/edit`
        )
        if (!planningResponse.ok) throw new Error('No planning found')
        const planningData = await planningResponse.json()
        const planningItems = Array.isArray(planningData.data) ? planningData.data : []

        if (planningItems.length === 0) {
          setOfs([])
          return
        }
        const mapped = planningItems
          .filter(
            (item: any) =>
              item.n_ordre ||
              item.N_ordre ||
              item.n_Ordre ||
              item['N° ordre'] ||
              item['N° Ordre'] ||
              item['n° ordre']
          )
          .map((item: any) => {
            const n_ordre =
              item.n_ordre ||
              item.N_ordre ||
              item.n_Ordre ||
              item['N° ordre'] ||
              item['N° Ordre'] ||
              item['n° ordre'] ||
              ''
            const ordre = item.ordre || item.Ordre || item.ORDER || item['Ordre '] || ''
            const ressource = item.ressource || item.Ressource || item.RESSOURCE || ''
            const duree = item.duree || item['Heures '] || item['Heures'] || item.heures || ''
            const commentaires =
              item.commentaires_planif ||
              item['Commentaires Planif'] ||
              item.commentaires ||
              item.Commentaires ||
              ''
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

        const initialOfsWithAutoStatus = calculateAutoOFStatus(mapped, selectedRessource)
        setOfs(initialOfsWithAutoStatus)

        try {
          const statusResponse = await fetch(
            `http://localhost:5000/api/pdim/production/${poste}`
          )
          const statusData = await statusResponse.json()
          const statusMap = new Map()
          if (Array.isArray(statusData)) {
            statusData.forEach((item: any) => {
              statusMap.set(String(item.n_ordre), {
                statut_matiere: item.statut_matiere || 'pending',
                statut_outil: item.statut_outil || 'pending',
                statut_of: item.statut_of || 'pending',
                duree: item.duree,
                date_validation: item.date_validation,
                date_lancement: item.date_lancement,
              })
            })
          }
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
                date_lancement: statusInfo?.date_lancement || null,
              }
            })
            const ofsWithAutoStatus = calculateAutoOFStatus(finalOfs, selectedRessource)
            setOfs(ofsWithAutoStatus)
          }
        } catch (statusError) {
          console.log('Status fetch failed, keeping planning data only:', statusError)
        }
      } catch (err) {
        console.error('Erreur fetch planning :', err)
        setOfs([])
      }
    }
    fetchData()
  }, [poste, refreshKey, calculateAutoOFStatus, selectedRessource])

  // ===== Scan flow for “Clôturer” =====
  const openScannerFor = useCallback(
    (id: string) => {
      const of = ofs.find(o => o.id === id)
      if (!of) return
      const currentStatus = of.auto_statut_of || of.statut_of
      const shouldBeStarted = of.statut_matiere === 'ready' && of.statut_outil === 'ready'
      const canValidateOF =
        (currentStatus === 'started' || shouldBeStarted) && of.statut_of !== 'closed'
      if (!canValidateOF) return
      setScannerForId(id)
    },
    [ofs]
  )

  const confirmScannedAndClose = useCallback(
    async (code: string) => {
      setLastScannedCode(code)
      if (!scannerForId) return
      const of = ofs.find(o => o.id === scannerForId)
      if (!of || !poste) {
        setScannerForId(null)
        return
      }
      try {
        const res = await fetch(
          `http://localhost:5000/api/pdim/production/statut/${poste}/${of.n_ordre}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              statut_of: 'closed',
              duree: of.duree,
              ordre: of.ordre,
              // scanned_code: code // (optional: persist if backend supports it)
            }),
          }
        )
        if (res.ok) {
          setTimeout(() => setRefreshKey(k => k + 1), 400)
        } else {
          try {
            const errorData = await res.json()
            alert(`Échec de la clôture de l'OF: ${errorData.error || 'Erreur inconnue'}`)
          } catch {
            alert("Échec de la clôture de l'OF")
          }
        }
      } catch (err) {
        console.error("Erreur de clôture d'OF :", err)
        alert("Une erreur est survenue lors de la clôture de l'OF")
      } finally {
        setScannerForId(null)
      }
    },
    [scannerForId, ofs, poste]
  )

  const submitProblem = useCallback(async () => {
    if (!showForm || !poste) return
    const of = ofs.find(o => o.id === showForm)
    if (!of || !problemCause) return alert('Veuillez indiquer une cause')
    try {
      const res = await fetch(
        `http://localhost:5000/api/pdim/production/statut/${poste}/${of.n_ordre}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            statut_of: 'missing',
            duree: of.duree,
            ordre: of.ordre,
            notification: { cause: problemCause, details },
          }),
        }
      )
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

    // Natural sort by ordre
    list.sort((a, b) => {
      const ordreA = a.ordre || ''
      const ordreB = b.ordre || ''
      return ordreA.localeCompare(ordreB, undefined, {
        numeric: true,
        sensitivity: 'base',
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

            {/* Resource (machine) filter buttons — restored */}
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
              onCloturer={openScannerFor}   // opens the camera
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

        {/* Scanner modal for "Clôturer" */}
        <BarcodeScannerModal
          open={!!scannerForId}
          onClose={() => setScannerForId(null)}
          onConfirm={confirmScannedAndClose}
          title="Scanner pour clôturer l'OF"
        />
      </div>
    </ProtectedRoute>
  )
}

export const Route = createFileRoute('/UAPS/P-DIM/Validation/production')({
  component: ValidationProduction,
})
