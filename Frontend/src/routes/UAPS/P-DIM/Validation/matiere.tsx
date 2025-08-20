import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect, useMemo } from "react"
import ProtectedRoute from "@/components/ProtectedRoute"
import { PosteSelection, SearchBar, TableRowMatiere, ProblemFormModal } from "@/components/matiereUI";
import { ResourceButtons } from "@/components/ResourceButtons";
// [SCAN]
import BarcodeScannerModal from "@/components/BarcodeScannerModal";

type Matier = {
  id: string;
  ordre: string;
  n_ordre: string;
  statut: 'pending' | 'ready' | 'missing';
  besoin_machine: Date | null;
  article?: string | null;
  article_description?: string | null;
  commentaires_planif?: string | null;
  resource?: string | null;
  date_validation?: string | null;
}
const POSTES = ["MAM-A", "DA3-A", "A61NX", "NH4-A", "NM5-A"];

export function ValidationMatiere() {
  const [poste, setPoste] = useState("")
  const [matieres, setMatieres] = useState<Matier[]>([])
  const [search, setSearch] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [showForm, setShowForm] = useState<string | null>(null)
  const [problemCause, setProblemCause] = useState("")
  const [details, setDetails] = useState("")
  const [selectedResource, setSelectedResource] = useState<string | null>(null)

  // [SCAN] which matière are we validating (opens scanner)
  const [scannerForId, setScannerForId] = useState<string | null>(null)
  // [SCAN] keep last scanned code (optional UI/analytics)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)

  const uniqueResources = useMemo(() => {
    return Array.from(new Set(matieres.map(m => m.resource).filter(Boolean) as string[])).sort();
  }, [matieres]);

  useEffect(() => {
    if (!poste) {
      console.log('No poste selected, clearing matieres')
      setMatieres([])
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
        
        // Extract matiere data from planning
        const planningItems = Array.isArray(planningData.data) ? planningData.data : []
        console.log('Planning items count:', planningItems.length)
        
        if (planningItems.length === 0) {
          console.log('No planning items found, setting empty array')
          setMatieres([])
          return
        }
        
        const mapped = planningItems
          .filter((item: any) => {
            const hasNOrdre = item.n_ordre || item.N_ordre || item.n_Ordre || item['N° ordre'] || item['N° Ordre'] || item['n° ordre']
            console.log('Filtering item:', Object.keys(item), 'hasNOrdre:', hasNOrdre)
            return hasNOrdre
          })
          .map((item: any) => {
            const n_ordre = item.n_ordre || item.N_ordre || item.n_Ordre || item['N° ordre'] || item['N° Ordre'] || item['n° ordre'] || ""
            const ordre = item.ordre || item.Ordre || item.ORDER || item['Ordre '] || ""
            const article = item.article || item.Article || item.ARTICLE || ""
            const article_description = item.article_description || item['Article Description'] || item.designation || ""
            const resource = item.resource || item.Resource || item.RESOURCE || item.ressource || item.Ressource || ""
            const besoin_machine_raw = item.besoin_machine || item['Besoin machine '] || item['Besoin machine'] || item.date_besoin || ""
            const commentaires = item.commentaires_planif || item['Commentaires Planif'] || item.commentaires || item.Commentaires || ""
            
            const parseBesoinMachine = (value: any): Date | null => {
              if (!value) return null;
              if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
              const str = String(value).trim();
              if (!str) return null;
              if (/^\d+$/.test(str) && str.length < 6) return null;
              try {
                let date: Date | null = null;
                if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) {
                  const parts = str.split('/');
                  if (parts.length === 3) {
                    let day = parseInt(parts[0]);
                    let month = parseInt(parts[1]);
                    let year = parseInt(parts[2]);
                    if (year < 100) year += year < 50 ? 2000 : 1900;
                    date = new Date(year, month - 1, day);
                    if (isNaN(date.getTime()) || date.getDate() !== day || date.getMonth() !== month - 1) {
                      date = new Date(year, day - 1, month);
                      if (isNaN(date.getTime()) || date.getDate() !== month || date.getMonth() !== day - 1) {
                        date = null;
                      }
                    }
                  }
                } else {
                  date = new Date(str);
                  if (isNaN(date.getTime())) date = null;
                }
                return date;
              } catch {
                return null;
              }
            };
            
            return {
              id: `${poste}-${n_ordre}`,
              ordre: String(ordre),
              n_ordre: String(n_ordre),
              statut: "pending" as const,
              besoin_machine: parseBesoinMachine(besoin_machine_raw),
              article: article || null,
              article_description: article_description || null,
              resource: resource || null,
              commentaires_planif: commentaires || null,
              date_validation: null as string | null
            }
          })
        
        setMatieres(mapped)
        
        try {
          const statusResponse = await fetch(`http://localhost:5000/api/pdim/matiere/${poste}`)
          const statusData = await statusResponse.json()
          const statusMap = new Map()
          if (Array.isArray(statusData.matieres)) {
            statusData.matieres.forEach((m: any) => {
              statusMap.set(String(m.n_ordre), {
                statut: m.statut,
                date_validation: m.date_validation
              })
            })
          }
          
          if (statusMap.size > 0) {
            const finalMatieres = mapped.map((item: any) => {
              const statusInfo = statusMap.get(item.n_ordre)
              return {
                ...item,
                statut: statusInfo
                  ? (["pending", "ready", "missing"].includes(statusInfo.statut)
                     ? statusInfo.statut
                     : "pending")
                  : "pending",
                date_validation: statusInfo?.date_validation || null
              }
            })
            setMatieres(finalMatieres)
          }
        } catch (statusError) {
          console.log('Status fetch failed, keeping planning data only:', statusError)
        }
        
      } catch (err) {
        console.error("Erreur fetch planning :", err)
        setMatieres([])
      }
    }
    
    fetchData()
  }, [poste, refreshKey])
  
  useEffect(() => {
    console.log('Matieres state changed:', matieres.length, 'items')
  }, [matieres])

  // [SCAN] — called by table “Valider” action: open scanner instead of immediate PUT
  const openScannerFor = (id: string) => {
    setScannerForId(id);
  }

  // [SCAN] — once user confirms the scanned code, we proceed with validation
  const confirmScannedAndValidate = async (code: string) => {
    setLastScannedCode(code);
    if (!scannerForId) return;

    const matiere = matieres.find(m => m.id === scannerForId)
    if (!matiere || !poste) {
      setScannerForId(null);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/pdim/matiere/statut_matiere/${poste}/${matiere.n_ordre}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statut: "ready",
          besoin_machine: matiere.besoin_machine ? matiere.besoin_machine.toISOString().split('T')[0] : null,
          ordre: matiere.ordre
          // If you want to store the code scanned somewhere later, you could extend backend
          // scanned_code: code
        })
      })
      
      if (!response.ok) {
        console.error('Failed to validate matiere:', await response.text())
        alert('Erreur lors de la validation')
        setScannerForId(null);
        return
      }
      
      await response.json()
      setScannerForId(null);

      // Small delay to allow DB commit then refresh
      setTimeout(() => {
        setRefreshKey(k => k + 1)
      }, 400)
    } catch (error) {
      console.error('Error validating matiere:', error)
      alert('Erreur lors de la validation')
      setScannerForId(null);
    }
  }

  const submitProblem = async () => {
    if (!showForm || !poste) return
    const matiere = matieres.find(m => m.id === showForm)
    if (!matiere || !problemCause) return alert("Veuillez indiquer une cause")
    
    try {
      const response = await fetch(`http://localhost:5000/api/pdim/matiere/statut_matiere/${poste}/${matiere.n_ordre}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statut: "missing",
          besoin_machine: matiere.besoin_machine ? matiere.besoin_machine.toISOString().split('T')[0] : null,
          ordre: matiere.ordre,
          notification: {
            cause: problemCause,
            details
          }
        })
      })
      
      if (!response.ok) {
        console.error('Failed to submit problem:', await response.text())
        alert('Erreur lors du signalement')
        return
      }
      
      setShowForm(null)
      setProblemCause("")
      setDetails("")
      setRefreshKey(k => k + 1)
    } catch (error) {
      console.error('Error submitting problem:', error)
      alert('Erreur lors du signalement')
    }
  }

  const matieresFiltered = useMemo(() => {
    const term = search.trim().toLowerCase()
    let filtered = matieres.filter(m => {
      const matchNordre = m.n_ordre.toLowerCase().includes(term)
      const matchOrdre = m.ordre.toLowerCase().includes(term)
      const matchDate = m.besoin_machine
        ? m.besoin_machine.toLocaleDateString('fr-FR').includes(term)
        : false
      const matchArticle = (m.article ?? '').toLowerCase().includes(term)
      const matchDesignation = (m.article_description ?? '').toLowerCase().includes(term)
      const matchResource = (m.resource ?? '').toLowerCase().includes(term)
      return matchNordre || matchOrdre || matchDate || matchArticle || matchDesignation || matchResource
    })
    
    if (selectedResource) {
      filtered = filtered.filter(m => m.resource === selectedResource)
    }
    
    filtered.sort((a, b) => {
      const ordreA = a.ordre || ''
      const ordreB = b.ordre || ''
      return ordreA.localeCompare(ordreB, undefined, { numeric: true, sensitivity: 'base' })
    })
    
    return filtered
  }, [matieres, search, selectedResource])

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="w-full bg-gradient-to-r from-[#ef8f0e] to-[#d47e0d] text-white shadow-[0_2px_10px_rgba(0,0,0,0.1)] border-b border-white/20 py-4 px-6 flex items-center justify-between gap-6">
        <div className={`text-2xl font-['Raleway'] text-white [1px_1px_3px_rgba(0,0,0,0.3)] relative inline-block group rounded px-2 py-1 transition-colors duration-200 `}>
          Validation matiére
        </div>
        <div className={`text-2xl font-['Raleway'] text-white [1px_1px_3px_rgba(0,0,0,0.3)] `}>
          P-DIM
        </div>
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
          <SearchBar value={search} onChange={setSearch} />
          <div className="overflow-x-auto">
            <table className="w-full border-t text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="px-2 py-2 w-20">Ordre</th>
                  <th className="px-2 py-2 w-24">N° Ordre</th>
                  <th className="px-2 py-2 w-24">Article</th>
                  <th className="px-2 py-2 w-32">Article Description</th>
                  <th className="px-2 py-2 w-20">Resource</th>
                  <th className="px-2 py-2 w-28">Besoin machine</th>
                  <th className="px-2 py-2 w-32">Commentaires Planif</th>
                  <th className="px-2 py-2 w-44 min-w-44">Date de validation</th>
                  <th className="px-2 py-2 w-24">Actions</th>
                  <th className="px-2 py-2 w-20">Statut</th>
                </tr>
              </thead>
              <tbody>
                {matieresFiltered.map(m => (
                  <TableRowMatiere
                    key={m.id}
                    m={m}
                    // [SCAN] open barcode modal when clicking Valider
                    onValidate={openScannerFor}
                    onSignal={setShowForm}
                  />
                ))}
              </tbody>
            </table>
          </div>
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

      {/* [SCAN] Modal for barcode scan & confirmation */}
      <BarcodeScannerModal
        open={!!scannerForId}
        onClose={() => setScannerForId(null)}
        onConfirm={confirmScannedAndValidate}
        title="Scanner pour valider la matière"
      />
    </div>
  )
}

export const Route = createFileRoute('/UAPS/P-DIM/Validation/matiere')({
  component: ValidationMatiere,
});
