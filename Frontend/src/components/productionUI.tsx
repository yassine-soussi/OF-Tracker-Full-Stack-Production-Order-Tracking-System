// components/shared/productionUI.tsx

import { memo } from 'react';

export const STATUTS = {
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'En attente' },
  ready: { color: 'bg-green-100 text-green-800', label: 'Validé' },
  started: { color: 'bg-blue-200 text-blue-900', label: 'Débuté' },
  missing: { color: 'bg-red-100 text-red-800', label: 'Signalé' },
  closed: { color: 'bg-blue-100 text-blue-800', label: 'Clôturé' },
};

export const StatutBadge = memo(function StatutBadge({ statut }: { statut: 'pending' | 'ready' | 'started' | 'missing' | 'closed' }) {
  const { color, label } = STATUTS[statut] ?? { color: 'bg-gray-200 text-gray-600', label: 'Inconnu' };
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${color}`}>{label}</span>
  );
});

export const PosteSelection = ({ poste, setPoste, postes }: {
  poste: string;
  setPoste: (p: string) => void;
  postes: string[];
}) => (
  <div className="mb-4 flex gap-3 flex-wrap">
    {postes.map((p) => (
      <button
        key={p}
        onClick={() => setPoste(p)}
        className={`px-4 py-2 rounded ${poste === p ? `bg-orange-500 text-white` : `bg-gray-200`}`}
        type="button"
      >
        {p}
      </button>
    ))}
  </div>
);

export const ProductionRow = memo(function ProductionRow({
  of,
  validateOF,
  reportProblem,
}: {
  of: any;
  validateOF: (id: string) => void;
  reportProblem: (id: string) => void;
}) {
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

  return (
    <tr>
      <td className="px-4 py-2">{of.ordre}</td>
      <td className="px-4 py-2">{of.n_ordre}</td>
      <td className="px-4 py-2">{of.ressource}</td>
      <td className="px-4 py-2">{of.duree}</td>
      <td className="px-4 py-2"><StatutBadge statut={of.statut_matiere} /></td>
      <td className="px-4 py-2"><StatutBadge statut={of.statut_outil} /></td>
      <td className="px-4 py-2"><StatutBadge statut={of.statut_of} /></td>
      <td className="px-4 py-2">{formatDate(of.date_validation)}</td>
      <td className="px-4 py-2">{of.commentaires_planif || "-"}</td>
      <td className="px-4 py-2">
        {of.statut_of !== 'ready' && of.statut_of !== 'closed' && (
          <div className="flex gap-3">
            <button onClick={() => validateOF(of.id)} className="text-green-600 hover:underline" type="button">
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
});

export const ProductionTable = memo(function ProductionTable({
  ofs,
  validateOF,
  reportProblem,
}: {
  ofs: any[];
  validateOF: (id: string) => void;
  reportProblem: (id: string) => void;
}) {
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
          <th className="px-4 py-2">Date Validation</th>
          <th className="px-4 py-2">Commentaires Planif</th>
          <th className="px-4 py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {ofs.map(of => (
          <ProductionRow key={of.id} of={of} validateOF={validateOF} reportProblem={reportProblem} />
        ))}
      </tbody>
    </table>
  );
});

export const ProblemFormModal = ({
  problemCause,
  setProblemCause,
  details,
  setDetails,
  onCancel,
  onSubmit,
}: {
  problemCause: string;
  setProblemCause: (v: string) => void;
  details: string;
  setDetails: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) => {
  const options = [
    '',
    'Problème de machine',
    'Manque d’opérateur',
    'Manque matière',
    'Manque outil',
    'Blocage qualité',
    'Problème de planification',
    'Autre',
  ];

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 bg-black/30">
      <div className="modal-content bg-white p-6 rounded-md w-full max-w-md">
        <h3 className="text-lg font-medium mb-4">Signaler un problème</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="cause-select" className="block text-sm font-medium mb-1">Cause</label>
            <select
              id="cause-select"
              value={problemCause}
              onChange={e => setProblemCause(e.target.value)}
              className="w-full border border-gray-300 rounded p-2"
              required
            >
              {options.map((value, i) => (
                <option key={i} value={value}>{value || 'Choisissez une option'}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="details-textarea" className="block text-sm font-medium mb-1">Détails</label>
            <textarea
              id="details-textarea"
              value={details}
              onChange={e => setDetails(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded p-2"
              placeholder="Décrivez..."
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Annuler</button>
            <button onClick={onSubmit} className="px-4 py-2 bg-orange-500 text-white rounded-md text-sm hover:bg-orange-600">Envoyer</button>
          </div>
        </div>
      </div>
    </div>
  );
};
