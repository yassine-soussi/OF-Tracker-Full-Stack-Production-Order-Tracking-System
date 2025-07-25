// components/shared/matiereUI.tsx

export const PROBLEM_CAUSES = [
  "Rupture de stock",
  "Qualité non conforme",
  "En attente de réception",
  "Erreur d'article",
  "Autre"
]

export const StatutBadge = ({ statut }: { statut: 'pending' | 'ready' | 'missing' }) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800",
    ready: "bg-green-100 text-green-800",
    missing: "bg-red-100 text-red-800"
  }
  const labels = {
    pending: "En attente",
    ready: "Prêt",
    missing: "Manquant"
  }

  return (
    <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${colors[statut]}`}>
      {labels[statut]}
    </span>
  )
}

export const PosteSelection = ({
  poste,
  setPoste,
  postes
}: {
  poste: string
  setPoste: (p: string) => void
  postes: string[]
}) => (
  <div className="mb-4 flex gap-3">
    {postes.map(p => (
      <button
        key={p}
        onClick={() => setPoste(p)}
        className={`px-4 py-2 rounded border ${poste === p ? "bg-orange-500 text-white border-orange-700" : "bg-gray-200 border-gray-300"}`}
      >
        {p}
      </button>
    ))}
  </div>
)

export const SearchBar = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
  <div className="mb-4 flex justify-end">
    <input
      type="text"
      placeholder="Recherche par N° ordre date (JJ/MM/AAAA)..."
      value={value}
      onChange={e => onChange(e.target.value)}
      className="border rounded px-3 py-2 w-80"
    />
  </div>
)

export const TableRowMatiere = ({
  m,
  onValidate,
  onSignal
}: {
  m: {
    id: string;
    ordre: string;
    n_ordre: string;
    article?: string | null;
    article_description?: string | null;
    besoin_machine: Date | null;
    statut: 'pending' | 'ready' | 'missing';
    commentaires_planif?: string | null;
  },
  onValidate: (id: string) => void,
  onSignal: (id: string) => void
}) => (
  <tr key={m.id}>
    <td className="px-4 py-2">{m.ordre}</td>
    <td className="px-4 py-2">{m.n_ordre}</td>
    <td className="px-4 py-2">{m.article || "-"}</td>
    <td className="px-4 py-2">{m.article_description || "-"}</td>
    <td className="px-4 py-2">
      <input
        type="text"
        readOnly
        className="border px-2 py-1 rounded"
        value={m.besoin_machine ? m.besoin_machine.toLocaleDateString("fr-FR") : ""}
      />
    </td>
    <td className="px-4 py-2"><StatutBadge statut={m.statut} /></td>
    <td className="px-4 py-2">{m.commentaires_planif || "-"}</td>
    <td className="px-4 py-2">
      {["pending", "missing"].includes(m.statut) && (
        <div className="flex gap-3">
          <button onClick={() => onValidate(m.id)} className="text-green-600 hover:underline">Valider</button>
          <button onClick={() => onSignal(m.id)} className="text-red-600 hover:underline">Signaler</button>
        </div>
      )}
    </td>
  </tr>
)

export const ProblemFormModal = ({
  problemCause,
  setProblemCause,
  details,
  setDetails,
  onCancel,
  onSubmit
}: {
  problemCause: string
  setProblemCause: (v: string) => void
  details: string
  setDetails: (v: string) => void
  onCancel: () => void
  onSubmit: () => void
}) => (
  <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 bg-black/30">
    <div className="modal-content bg-white p-6 rounded-md w-full max-w-md">
      <h3 className="text-lg font-medium mb-4">Signaler un problème</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Cause</label>
          <select
            value={problemCause}
            onChange={e => setProblemCause(e.target.value)}
            className="w-full border border-gray-300 rounded p-2"
            required
          >
            <option value="">Choisissez une option</option>
            {PROBLEM_CAUSES.map(cause => (
              <option key={cause} value={cause}>{cause}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Détails</label>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded p-2"
            placeholder="Décrivez..."
            required
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Annuler</button>
          <button onClick={onSubmit} className="px-4 py-2 bg-orange-500 text-white rounded-md text-sm hover:bg-orange-600">Envoyer</button>
        </div>
      </div>
    </div>
  </div>
)
